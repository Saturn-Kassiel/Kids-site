// ═══════════════════════════════════════════════════════
//  Гоша — Service Worker
//  Стратегии: App Shell (Cache First), Media (Cache First
//  runtime), Data (Network First), Range Request support
// ═══════════════════════════════════════════════════════

const CACHE_VERSION = 4;
const CACHE_SHELL = `gosha-shell-v${CACHE_VERSION}`;
const CACHE_MEDIA = `gosha-media-v${CACHE_VERSION}`;
const CACHE_DATA  = `gosha-data-v${CACHE_VERSION}`;

// ── App Shell: предкэшируем при установке ──
const SHELL_URLS = [
    '/Kids-site/',
    '/Kids-site/index.html',
    '/Kids-site/app.js',
    '/Kids-site/testing.js',
    '/Kids-site/testing.css',
    '/Kids-site/share.js',
    '/Kids-site/style.css',
    '/Kids-site/manifest.json',
    '/Kids-site/data.json',
    '/Kids-site/assets/favicon/favicon.webp',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

// ── Паттерны для маршрутизации ──
const isMedia = (url) =>
    url.pathname.match(/\.(mp3|mp4|ogg|wav|webm|m4a)(\?|$)/i);

const isImage = (url) =>
    url.pathname.match(/\.(webp|png|jpg|jpeg|gif|svg)(\?|$)/i);

const isDataJSON = (url) =>
    url.pathname.endsWith('/data.json') ||
    url.href.includes('raw.githubusercontent.com') && url.pathname.endsWith('.json');

const isShell = (url) =>
    url.pathname.match(/\.(html|css|js)(\?|$)/i) ||
    url.pathname.endsWith('/Kids-site/') ||
    url.href.includes('cdn.jsdelivr.net');


// ═══════════════════════════════════════════════════════
//  INSTALL — предкэшируем App Shell
// ═══════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_SHELL)
            .then(cache => cache.addAll(SHELL_URLS))
            .then(() => self.skipWaiting())
            .catch(err => {
                console.warn('[SW] Shell precache partial fail:', err);
                return self.skipWaiting();
            })
    );
});


// ═══════════════════════════════════════════════════════
//  ACTIVATE — удаляем старые кэши
// ═══════════════════════════════════════════════════════
self.addEventListener('activate', (event) => {
    const currentCaches = [CACHE_SHELL, CACHE_MEDIA, CACHE_DATA];
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => !currentCaches.includes(k))
                    .map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});


// ═══════════════════════════════════════════════════════
//  FETCH — маршрутизация запросов
// ═══════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Пропускаем не-GET запросы и chrome-extension, github API calls
    if (event.request.method !== 'GET') return;
    if (url.protocol === 'chrome-extension:') return;
    if (url.hostname === 'api.github.com') return;

    // ── Range Request (audio/video) — спецобработка ──
    if (event.request.headers.get('range') && isMedia(url)) {
        event.respondWith(handleRangeRequest(event.request));
        return;
    }

    // ── data.json — Network First ──
    if (isDataJSON(url)) {
        event.respondWith(networkFirst(event.request, CACHE_DATA));
        return;
    }

    // ── Медиа (audio/video) — Cache First, runtime ──
    if (isMedia(url)) {
        event.respondWith(cacheFirstRuntime(event.request, CACHE_MEDIA));
        return;
    }

    // ── Картинки — Cache First, runtime ──
    if (isImage(url)) {
        event.respondWith(cacheFirstRuntime(event.request, CACHE_MEDIA));
        return;
    }

    // ── App Shell — Cache First (предкэшировано) ──
    if (isShell(url)) {
        event.respondWith(cacheFirstRuntime(event.request, CACHE_SHELL));
        return;
    }

    // ── Всё остальное — Network с fallback ──
    event.respondWith(networkWithFallback(event.request));
});


// ═══════════════════════════════════════════════════════
//  СТРАТЕГИИ КЭШИРОВАНИЯ
// ═══════════════════════════════════════════════════════

/**
 * Cache First (runtime) — берём из кэша, при промахе идём в сеть и кэшируем
 */
async function cacheFirstRuntime(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        // Офлайн и нет в кэше — пустой ответ
        return new Response('', { status: 503, statusText: 'Offline' });
    }
}

/**
 * Network First — сначала сеть, при ошибке — кэш
 */
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('{}', {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Network с fallback — пробуем сеть, иначе кэш
 */
async function networkWithFallback(request) {
    try {
        return await fetch(request);
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('', { status: 503, statusText: 'Offline' });
    }
}

/**
 * Range Request handler для audio/video
 * Браузеры запрашивают Range: bytes=X-Y для <audio>/<video>.
 * Стандартный cache.match() не поддерживает Range.
 * Решение: кэшируем полный ответ, при Range — создаём partial response.
 */
async function handleRangeRequest(request) {
    const url = request.url;
    const rangeHeader = request.headers.get('range');

    // Пробуем найти полный ответ в кэше
    // Делаем запрос БЕЗ заголовка Range для поиска в кэше
    const cacheRequest = new Request(url, { headers: {} });
    let fullResponse = await caches.match(cacheRequest);

    if (!fullResponse) {
        // Нет в кэше — грузим из сети (полный файл)
        try {
            fullResponse = await fetch(new Request(url));
            if (fullResponse.ok) {
                const cache = await caches.open(CACHE_MEDIA);
                cache.put(cacheRequest, fullResponse.clone());
            }
        } catch (err) {
            return new Response('', { status: 503, statusText: 'Offline' });
        }
    }

    // Если нет Range заголовка — возвращаем как есть
    if (!rangeHeader) return fullResponse;

    // Парсим Range: bytes=START-END
    const bytes = rangeHeader.replace(/bytes=/, '').split('-');
    const arrayBuffer = await fullResponse.clone().arrayBuffer();
    const totalSize = arrayBuffer.byteLength;

    const start = parseInt(bytes[0], 10) || 0;
    const end = bytes[1] ? parseInt(bytes[1], 10) : totalSize - 1;
    const chunk = arrayBuffer.slice(start, end + 1);

    return new Response(chunk, {
        status: 206,
        statusText: 'Partial Content',
        headers: {
            'Content-Type': fullResponse.headers.get('Content-Type') || 'application/octet-stream',
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Content-Length': chunk.byteLength,
            'Accept-Ranges': 'bytes'
        }
    });
}


// ═══════════════════════════════════════════════════════
//  ОБСЛУЖИВАНИЕ КЭША — лимит для медиа
// ═══════════════════════════════════════════════════════

/**
 * Ограничиваем медиа-кэш (максимум 80 записей).
 * Вызывается периодически.
 */
async function trimMediaCache(maxEntries = 80) {
    const cache = await caches.open(CACHE_MEDIA);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
        // Удаляем самые старые (первые добавленные)
        const toDelete = keys.slice(0, keys.length - maxEntries);
        await Promise.all(toDelete.map(k => cache.delete(k)));
    }
}

// Периодическая очистка при activate
self.addEventListener('activate', () => {
    trimMediaCache();
});


// ═══════════════════════════════════════════════════════
//  MESSAGE — для ручного управления из app.js
// ═══════════════════════════════════════════════════════
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    if (event.data === 'trimCache') {
        trimMediaCache();
    }
});
