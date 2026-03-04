// =============================================
// ГОША — core.js (App, утилиты, CardBadges)
// =============================================

// -------- THEME & SETTINGS --------
const App = {
    _history: ['main'],

    navigate(id, title) {
        document.querySelectorAll('#app > section').forEach(s => s.classList.add('hidden'));
        const sec = document.getElementById(id);
        if (!sec) return;
        sec.classList.remove('hidden');

        const isMain = id === 'main';
        document.getElementById('back-btn').classList.toggle('hidden', isMain);
        document.getElementById('settings-icon-btn').classList.toggle('hidden', id === 'settings' || id === 'admin' || id === 'notifications');
        document.getElementById('notif-bell-btn').classList.toggle('hidden', id === 'settings' || id === 'admin' || id === 'notifications');
        if (id !== 'notifications') Notif._open = false;

        // Для ребусов и загадок — скрываем текст «Назад» и заголовок
        const backText = document.getElementById('back-text');
        if (backText) backText.style.display = (id === 'puzzles' || id === 'riddles') ? 'none' : '';

        const titleBar = document.getElementById('page-title-bar');
        if (!isMain && title) {
            titleBar.textContent = title;
            titleBar.classList.remove('hidden');
        } else {
            titleBar.classList.add('hidden');
        }

        // Реестр хуков навигации: onEnter / onLeave.
        // Добавляя новый раздел — регистрируй хук здесь, не расширяй if-цепочку.
        const NAV_HOOKS = {
            songs:   { onLeave: () => { if (typeof Songs !== 'undefined' && Songs.index !== -1) Songs.destroy(); } },
            puzzles: {
                onEnter: () => Puzzles._renderLevelDots(),
                onLeave: () => document.getElementById('puzzle-level-dots')?.remove(),
            },
            riddles: {
                onEnter: () => Riddles._renderTopBar(),
                onLeave: () => document.getElementById('riddle-level-dots')?.remove(),
            },
            info:        { onEnter: () => Info.render() },
            'parent-dash': { onEnter: () => ParentDash._render() },
        };

        // Читаем предыдущий раздел ДО push — иначе при isMain (push не вызывается)
        // history может быть пустой и prev окажется undefined.
        const prev = this._history[this._history.length - 1];
        if (!isMain) this._history.push(id);
        else if (this._history.length > 1 && typeof Gosha !== 'undefined') Gosha.bounce();
        if (isMain) CardBadges.updateAll();
        window.scrollTo(0, 0);

        // Вызываем onLeave для предыдущего раздела
        if (prev && prev !== id && NAV_HOOKS[prev]?.onLeave) NAV_HOOKS[prev].onLeave();
        // Вызываем onEnter для нового раздела
        if (NAV_HOOKS[id]?.onEnter) NAV_HOOKS[id].onEnter();
    },

    // Обрабатываем deep link хэш (#song-5, #podcast-3)
    back() {
        this._history.pop();
        const prev = this._history[this._history.length - 1] || 'main';
        this._history.pop(); // will be re-pushed by navigate
        this.navigate(prev);
    },

    toggleTheme(el) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const next = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        if (el) el.classList.toggle('on', next === 'dark');
        App._updateThemeIcon(next);
        showToast(next === 'dark' ? '🌙 Тёмная тема' : '☀️ Светлая тема');
    },

    _updateThemeIcon(theme) {
        const icon  = document.getElementById('theme-icon');
        const label = document.getElementById('theme-label');
        if (!icon) return;
        if (theme === 'dark') {
            icon.innerHTML  = '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z\"/></svg>';
            if (label) label.textContent = 'Тёмная тема';
        } else {
            icon.innerHTML  = '<svg class=\"icon-svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"5\"/><line x1=\"12\" y1=\"1\" x2=\"12\" y2=\"3\"/><line x1=\"12\" y1=\"21\" x2=\"12\" y2=\"23\"/><line x1=\"4.22\" y1=\"4.22\" x2=\"5.64\" y2=\"5.64\"/><line x1=\"18.36\" y1=\"18.36\" x2=\"19.78\" y2=\"19.78\"/><line x1=\"1\" y1=\"12\" x2=\"3\" y2=\"12\"/><line x1=\"21\" y1=\"12\" x2=\"23\" y2=\"12\"/><line x1=\"4.22\" y1=\"19.78\" x2=\"5.64\" y2=\"18.36\"/><line x1=\"18.36\" y1=\"5.64\" x2=\"19.78\" y2=\"4.22\"/></svg>';
            if (label) label.textContent = 'Светлая тема';
        }
    },

    resetStats() {
        if (!confirm('Сбросить весь прогресс?')) return;
        StatTracker.resetAll();
        Badges.init();
        showToast('🗑️ Прогресс сброшен');
    },

    // Загружаем data.json — ВСЕГДА при старте, ждём завершения
    // ── Валидация data.json ──────────────────────────────────────────────────
    // Проверяет структуру до записи в localStorage.
    // Возвращает очищенный объект или null если данные непригодны.
    _validateDataJson(raw, url) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            console.warn('[Validation] data.json: ожидался объект, получено:', typeof raw);
            return null;
        }

        const SCHEMAS = {
            riddles:  { required: ['id'],   anyOf: ['answer','a'],   optional: ['text','q','hint','pic','level'] },
            puzzles:  { required: ['id'],   anyOf: ['answer','a'],   optional: ['name','img','hint','level','pic'] },
            songs:    { required: ['id','src'],      optional: ['name','title','artist','cover','desc','duration'] },
            podcasts: { required: ['id','src'],      optional: ['name','title','cover','desc','duration'] },
            info:     { required: ['id'],            optional: [] },
        };

        const result = {};
        let totalErrors = 0;

        for (const [key, schema] of Object.entries(SCHEMAS)) {
            if (!Array.isArray(raw[key])) continue; // секция отсутствует — ок

            const seen = new Set();
            const clean = [];

            for (const item of raw[key]) {
                if (!item || typeof item !== 'object') { totalErrors++; continue; }

                // Проверяем обязательные поля
                const missing = schema.required.filter(f => !item[f] && item[f] !== 0);
                if (missing.length) {
                    console.warn(`[Validation] ${key}[${item.id ?? '?'}]: отсутствуют поля:`, missing);
                    totalErrors++;
                    continue;
                }
                // Проверяем anyOf (хотя бы одно из полей должно быть)
                if (schema.anyOf && !schema.anyOf.some(f => item[f] || item[f] === 0)) {
                    console.warn(`[Validation] ${key}[${item.id ?? '?'}]: нужно одно из полей:`, schema.anyOf);
                    totalErrors++;
                    continue;
                }

                // Дедупликация по id
                const id = String(item.id);
                if (seen.has(id)) {
                    console.warn(`[Validation] ${key}: дубль id="${id}", пропускаем`);
                    totalErrors++;
                    continue;
                }
                seen.add(id);
                clean.push(item);
            }

            if (clean.length) result[key] = clean;
            else if (raw[key].length) {
                // Все записи оказались невалидны — секция пуста, не записываем
                console.warn(`[Validation] ${key}: все ${raw[key].length} записей невалидны`);
            }
        }

        // Notifications — просто проверяем что массив
        if (Array.isArray(raw.notifications)) result.notifications = raw.notifications;

        if (totalErrors > 0) {
            console.warn(`[Validation] data.json из ${url}: ${totalErrors} ошибок исправлено`);
        }

        // Если ни одной валидной секции — возвращаем null
        const hasContent = Object.keys(SCHEMAS).some(k => Array.isArray(result[k]) && result[k].length);
        if (!hasContent) {
            console.error('[Validation] data.json: нет ни одной валидной секции — игнорируем файл');
            return null;
        }

        return result;
    },

    async _loadRemoteData() {
        const KEYS = ['songs','podcasts','puzzles','riddles','info'];
        const REPO = 'Saturn-Kassiel/Kids-site';

        // Пытаемся загрузить data.json — сначала локальный, потом GitHub
        const cacheBust = '?v=' + Math.floor(Date.now() / 300000); // меняется каждые 5 минут
        const urls = location.protocol === 'file:'
            ? ['data.json']  // локально — только рядом лежащий файл
            : [
                'https://raw.githubusercontent.com/' + REPO + '/main/data.json' + cacheBust,
                'data.json' + cacheBust   // fallback на относительный путь
              ];

        let data = null;
        for (const url of urls) {
            try {
                const isRemote = url.startsWith('http');
                // Ранее: url + '?_=' + Date.now() создавало невалидный URL
                // вида «data.json?v=123?_=456» (два знака ?), т.к. cacheBust
                // уже добавлен в строке 182. cache:'no-store' достаточно для
                // браузера, ?v= достаточно для CDN — дополнительный параметр не нужен.
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 5000);
                const resp = await fetch(url, {
                    cache: isRemote ? 'no-store' : 'default',
                    signal: controller.signal
                });
                clearTimeout(timer);
                if (!resp.ok) continue;
                const raw = await resp.json();
                data = App._validateDataJson(raw, url);
                if (data) {
                    console.log('✅ data.json загружен из:', url);
                    break;
                } else {
                    console.warn('⚠️ data.json не прошёл валидацию:', url);
                }
            } catch(e) {
                console.log('data.json недоступен по:', url, e.message);
            }
        }

        if (!data) {
            // Нет ни сети, ни локального файла — берём что есть в localStorage
            console.log('data.json недоступен, используем localStorage/defaults');
            return;
        }

        KEYS.forEach(k => {
            if (Array.isArray(data[k]) && data[k].length) {
                // Мержим: базовые из data.json + добавленные через админку
                const extra = (() => { try { return JSON.parse(localStorage.getItem('admin_extra_' + k) || '[]'); } catch { return []; } })();
                const baseIds = new Set(data[k].map(r => r.id));
                const merged = [...data[k], ...extra.filter(r => !baseIds.has(r.id))];
                localStorage.setItem('admin_' + k, JSON.stringify(merged));
                // Запоминаем ID базовых элементов чтобы admin знал что добавлено им
                if (k === 'riddles') {
                    localStorage.setItem('admin_riddles_base_ids', JSON.stringify([...baseIds]));
                }
            }
        });

        // Уведомления
        if (Array.isArray(data.notifications)) {
            localStorage.setItem('admin_notif_remote', JSON.stringify(data.notifications));
        }
        Notif.checkNewContent(data);
        localStorage.removeItem('gh_data_updated');
    },

    async init() {
        // Сначала ЖДЁМ загрузки данных — только потом скрываем loader
        await this._loadRemoteData();

        // Restore theme
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        const tt = document.getElementById('tog-theme');
        if (tt && theme === 'dark') tt.classList.add('on');

        // Restore toggles
        ['auto','anim',
         'snd-riddle-correct','snd-riddle-achieve',
         'snd-puzzle-correct','snd-puzzle-achieve',
         'snd-words-correct',
         'snd-math-correct',
         'interstitials','snd-inter-correct',
         'hint-words','hint-math','hint-puzzles'].forEach(k => {
            const saved = localStorage.getItem(`set_${k}`);
            if (saved === 'false') {
                const el = document.getElementById(`tog-${k}`);
                if (el) el.classList.remove('on');
            }
        });
        // Иконка темы
        App._updateThemeIcon(theme);

        // Make sure modal is closed on start
        document.getElementById('modal').classList.add('hidden');

        // Admin via hash — check on load too
        // Пароль не хранится в коде — только его SHA-256.
        // crypto.subtle доступен без зависимостей в любом современном браузере.
        const ADMIN_HASH = '4cd5e4c0c0f4fa450cd8a8789033f06d55122edfa597047221025a33bb3f7e4a';
        const _checkAdminPass = async (pass) => {
            if (!pass) return false;
            const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
            const hex  = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
            return hex === ADMIN_HASH;
        };
        const checkHash = async () => {
            if (window.location.hash === '#see') {
                history.replaceState(null, '', location.pathname);
                const pass = prompt('Введите пароль:');
                if (await _checkAdminPass(pass)) {
                    Admin.init();
                    Admin._updatePendingBadge();
                    App.navigate('admin', 'Админка');
                } else if (pass !== null) {
                    showToast('❌ Неверный пароль');
                }
            }
        };
        window.addEventListener('hashchange', checkHash);
        if (window.location.hash === '#see') checkHash();

        // Динамическое приветствие
        this._updateGreeting();

        // Инициализируем значки
        Badges.init();
        Interstitials.init();
        StatTracker._migrateDailyLog();

        // Скрываем loader — данные уже загружены (await выше)
        document.getElementById('loader').style.display = 'none';
    },

    _updateGreeting() {
        const el = document.getElementById('home-greeting');
        if (!el) return;

        const hour = new Date().getHours();

        // Фразы по времени суток
        const timeGreetings =
            hour >= 5  && hour < 12  ? ['Доброе утро! ☀️', 'С добрым утром! 🌅', 'Утро — время открытий! 🌞']
          : hour >= 12 && hour < 17  ? ['Добрый день! 🌤️', 'Отличный день для учёбы! 📚', 'Продолжаем учиться! 🎯']
          : hour >= 17 && hour < 21  ? ['Добрый вечер! 🌇', 'Вечер знаний! 🌙', 'Хороший вечер для игры! ✨']
          :                            ['Не спится? Давай поиграем! 🌟', 'Ночные приключения! 🦉', 'Тихий час знаний 💤'];

        // Общие мотивационные фразы
        const funGreetings = [
            'Давай учиться играя! 🎮',
            'Время новых открытий! 🚀',
            'Сегодня узнаем что-то новое! 💡',
            'Готов к приключениям? 🗺️',
            'Вперёд к знаниям! 🏆',
            'Играем и учимся! 🎈',
            'Каждый день — новое чудо! 🌈',
            'Ты — молодец! Продолжай! 👏'
        ];

        // 50/50 — либо фраза по времени суток, либо мотивационная
        const pool = Math.random() < 0.5 ? timeGreetings : funGreetings;
        el.textContent = pool[Math.floor(Math.random() * pool.length)];
    }
};


function getSoundSetting(key) {
    const saved = localStorage.getItem(`set_${key}`);
    return saved !== 'false'; // по умолчанию включено
}
function saveSetting(key, val) {
    localStorage.setItem(`set_${key}`, val);
}
function isHintEnabled(section) {
    return localStorage.getItem(`set_hint-${section}`) !== 'false';
}

// -------- DEEP LINK COPY --------
function copyDeepLink(type, id, name) {
    const BASE = 'https://saturn-kassiel.github.io/Kids-site/';
    const url  = BASE + '#' + type + '-' + id;
    navigator.clipboard.writeText(url).then(() => {
        showToast('🔗 Ссылка скопирована');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('🔗 Ссылка скопирована');
    });
}

// -------- CONFIRM DIALOG --------
function showConfirm(message, onConfirm) {
    // Удаляем старый если есть
    const old = document.getElementById('confirm-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-box">
            <div class="confirm-msg">${message}</div>
            <div class="confirm-btns">
                <button class="confirm-cancel">Отмена</button>
                <button class="confirm-ok">Удалить</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    const close = () => { overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200); };
    overlay.querySelector('.confirm-cancel').addEventListener('click', close);
    overlay.querySelector('.confirm-ok').addEventListener('click', () => { close(); onConfirm(); });
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

// -------- TOAST --------
let _toastT;
function showToast(msg, dur = 2400) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(_toastT);
    _toastT = setTimeout(() => t.classList.remove('show'), dur);
}

// -------- CHILD NAME --------
function saveChildName(val) {
    const name = (val || '').trim().slice(0, 20);
    if (name) {
        localStorage.setItem('child_name', name);
    } else {
        localStorage.removeItem('child_name');
    }
}
function getChildName() {
    return localStorage.getItem('child_name') || '';
}
function updateHomeGreeting() {
    const el = document.getElementById('home-greeting');
    if (!el) return;
    const name = getChildName();
    if (name) {
        const hour = new Date().getHours();
        const timeGreet = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
        el.textContent = `${timeGreet}, ${name}!`;
    } else {
        el.textContent = 'Давай учиться играя!';
    }
}
function getPersonalPraise() {
    const name = getChildName();
    const base = ['Молодец', 'Правильно', 'Отлично', 'Супер', 'Ура', 'Верно', 'Браво', 'Здорово'];
    const emojis = ['🎉', '⭐', '🏆', '🌟', '🎈', '👏', '✨', '💫'];
    const i = Math.floor(Math.random() * base.length);
    if (name) {
        return `${base[i]}, ${name}! ${emojis[i]}`;
    }
    return `${base[i]}! ${emojis[i]}`;
}

// ──── Registration card ────
function regUpdateCard() {
    const name = getChildName();
    const card = document.getElementById('reg-card');
    const avatar = document.getElementById('reg-avatar');
    const nameDisplay = document.getElementById('reg-name-display');
    const inputWrap = document.getElementById('reg-input-wrap');
    const hint = document.getElementById('reg-hint');
    const editBtn = document.getElementById('reg-edit-btn');
    const inp = document.getElementById('child-name-input');
    if (!card) return;

    if (name) {
        card.classList.add('has-name');
        // Показываем первую букву в аватаре
        avatar.innerHTML = name.charAt(0).toUpperCase();
        nameDisplay.textContent = name;
        nameDisplay.style.display = '';
        inputWrap.style.display = 'none';
        hint.style.display = 'none';
        editBtn.style.display = '';
    } else {
        card.classList.remove('has-name');
        avatar.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="32" height="32"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        nameDisplay.style.display = 'none';
        inputWrap.style.display = '';
        hint.style.display = '';
        editBtn.style.display = 'none';
        if (inp) inp.value = '';
    }
}
function regSaveName() {
    const inp = document.getElementById('child-name-input');
    const val = (inp?.value || '').trim();
    if (!val) { showToast('✏️ Введи имя'); inp?.focus(); return; }
    saveChildName(val);
    updateHomeGreeting();
    regUpdateCard();
    showToast(`👋 Привет, ${val}!`);
}
function regEditName() {
    const name = getChildName();
    const inputWrap = document.getElementById('reg-input-wrap');
    const nameDisplay = document.getElementById('reg-name-display');
    const hint = document.getElementById('reg-hint');
    const editBtn = document.getElementById('reg-edit-btn');
    const inp = document.getElementById('child-name-input');
    if (inputWrap) inputWrap.style.display = '';
    if (nameDisplay) nameDisplay.style.display = 'none';
    if (hint) hint.style.display = '';
    if (editBtn) editBtn.style.display = 'none';
    if (inp) { inp.value = name; inp.focus(); inp.select(); }
}

// ──── Card Badges — total & new counts on home cards ────
const CardBadges = {
    _getTriedSet(key) {
        try { return new Set(JSON.parse(localStorage.getItem('tried_' + key) || '[]')); }
        catch { return new Set(); }
    },
    _saveTriedSet(key, set) {
        localStorage.setItem('tried_' + key, JSON.stringify([...set]));
    },
    markTried(key, identifier) {
        if (!identifier) return;
        const set = this._getTriedSet(key);
        const id = String(identifier).toLowerCase().trim();
        if (set.has(id)) return;
        set.add(id);
        this._saveTriedSet(key, set);
        this.updateAll();
    },
    _getAllIds(key) {
        try {
            const data = JSON.parse(localStorage.getItem('admin_' + key) || '[]');
            if (key === 'songs' || key === 'podcasts') {
                // Songs: actual file count in assets/audio/songs/
                if (key === 'songs' && typeof Songs !== 'undefined') { if (!Songs._listBuilt) try { Songs._buildList(); } catch(e) {} if (Songs._allSongs.length) return Songs._allSongs.map(s => String(s.id)); }
                return data.map(item => String(item.id));
            } else {
                // riddles / puzzles — используем id как стабильный идентификатор.
                // Ранее использовался answer, из-за чего два задания с одинаковым
                // ответом («Медведь» id 7 и id 14) засчитывались оба при решении одного.
                return data.map(item => String(item.id)).filter(Boolean);
            }
        } catch { return []; }
    },
    // Однократная миграция tried_* из answer-ключей в id-ключи.
    // Запускается при первом updateAll() после обновления кода.
    _migrateTried() {
        if (localStorage.getItem('tried_migrated_v2')) return;
        ['puzzles', 'riddles'].forEach(key => {
            const data = (() => { try { return JSON.parse(localStorage.getItem('admin_' + key) || '[]'); } catch { return []; } })();
            if (!data.length) return;
            // Строим карту answer→id для конвертации
            const answerToId = {};
            data.forEach(item => {
                const ans = (item.answer || item.name || '').toLowerCase().trim();
                if (ans) answerToId[ans] = String(item.id);
            });
            const oldSet = this._getTriedSet(key);
            if (!oldSet.size) return;
            const newSet = new Set();
            oldSet.forEach(val => {
                // Если значение уже выглядит как id (число) — оставляем
                newSet.add(answerToId[val] || val);
            });
            this._saveTriedSet(key, newSet);
        });
        localStorage.setItem('tried_migrated_v2', '1');
    },
    updateAll() {
        this._migrateTried();
        ['songs', 'podcasts', 'puzzles', 'riddles'].forEach(key => {
            const allIds = this._getAllIds(key);
            const tried = this._getTriedSet(key);
            const total = allIds.length;
            const newCount = allIds.filter(id => !tried.has(id)).length;

            const totalEl = document.getElementById('mc-' + key + '-total');
            const newEl = document.getElementById('mc-' + key + '-new');

            if (totalEl) {
                if (total > 0) {
                    totalEl.textContent = total;
                    totalEl.style.display = 'flex';
                } else {
                    totalEl.style.display = 'none';
                }
            }
            if (newEl) {
                if (newCount > 0) {
                    newEl.textContent = newCount;
                    newEl.style.display = 'flex';
                } else {
                    newEl.style.display = 'none';
                }
            }
        });
    }
};

// -------- STARS --------
function showStars(cx, cy) {
    const host = document.getElementById('stars-host');
    const colors = ['#a78bfa','#60a5fa','#34d399','#f9a8d4','#fde68a','#f97316','#ec4899'];
    for (let i = 0; i < 26; i++) {
        const s = document.createElement('div');
        s.className = 'star';
        const angle = (360 / 26) * i;
        const dist  = 70 + Math.random() * 130;
        const rad   = angle * Math.PI / 180;
        s.style.cssText = `
            left:${cx - 6}px; top:${cy - 6}px;
            width:${8 + Math.random()*10}px; height:${8 + Math.random()*10}px;
            background:${colors[i % colors.length]};
            --tx:${Math.cos(rad)*dist}px; --ty:${Math.sin(rad)*dist}px;
            --dur:${0.8 + Math.random()*0.6}s;
        `;
        host.appendChild(s);
    }
    setTimeout(() => host.innerHTML = '', 1800);
}


// =============================================
// TileEngine — общая логика плашек (Слова + Арифметика)
// Использование:
//   const e = new TileEngine({ slotsId, tilesId, msgId, onComplete, onWrong })
// =============================================
class TileEngine {
    constructor({ slotsId, tilesId, msgId, nextBtnId, streakId, onComplete, onWrong }) {
        this.slotsId   = slotsId;
        this.tilesId   = tilesId;
        this.msgId     = msgId;
        this.nextBtnId = nextBtnId;
        this.streakId  = streakId;
        this.onComplete = onComplete; // fn(assembledStr)
        this.onWrong    = onWrong;    // fn(assembledStr)

        this._slots       = [];
        this._slotTileIdx = [];
        this._tiles       = [];
        this._tileUsed    = [];
        this._solved      = false;
        this._autoReset   = null;
        this._streak      = 0;
        this._hintUsed    = false;
    }

    // Инициализировать новое задание
    // correctValues: массив правильных значений ['К','О','Т'] или ['1','1']
    // allTiles: перемешанный массив значений для плашек
    setup(correctValues, allTiles) {
        this._solved      = false;
        this._hintUsed    = false;
        this._correctVals = correctValues;
        this._slots       = new Array(correctValues.length).fill(null);
        this._slotTileIdx = new Array(correctValues.length).fill(null);
        this._tiles       = allTiles;
        this._tileUsed    = new Array(allTiles.length).fill(false);
        if (this._autoReset) { clearTimeout(this._autoReset); this._autoReset = null; }
        this._hideNextBtn();
        this._renderSlots();
        this._renderTiles();
        this._clearMsg();
    }

    markCorrect() {
        this._solved = true;
        if (!this._hintUsed) {
            this._streak++;
        }
        // if hint was used: streak stays the same (no grow, no reset)
        this._updateStreak();
        document.querySelectorAll(`#${this.slotsId} .words-slot`).forEach(s => s.classList.add('correct'));
        this._showNextBtn();
    }

    markWrong() {
        this._streak = 0;
        this._updateStreak();
        document.querySelectorAll(`#${this.slotsId} .words-slot.filled`).forEach(s => {
            s.classList.add('wrong-flash');
            setTimeout(() => s.classList.remove('wrong-flash'), 600);
        });
        const slotsEl = document.getElementById(this.slotsId);
        slotsEl.classList.add('words-shake');
        setTimeout(() => slotsEl.classList.remove('words-shake'), 500);
        this._autoReset = setTimeout(() => {
            if (!this._solved) this._clearSlots();
        }, 1200);
    }

    resetStreak() { this._streak = 0; this._updateStreak(); }

    _placeTile(tileIdx) {
        if (this._solved || this._tileUsed[tileIdx]) return;
        const slotIdx = this._slots.indexOf(null);
        if (slotIdx === -1) return;

        this._slots[slotIdx]       = this._tiles[tileIdx];
        this._slotTileIdx[slotIdx] = tileIdx;
        this._tileUsed[tileIdx]    = true;
        document.activeElement?.blur();

        this._renderSlots();
        const tileEl = document.querySelector(`#${this.tilesId} .words-tile[data-tidx="${tileIdx}"]`);
        if (tileEl) { tileEl.classList.add('used'); tileEl.blur(); }

        if (!this._slots.includes(null)) {
            const assembled = this._slots.join('');
            if (this.onComplete) this.onComplete(assembled);
        }
    }

    _removeFromSlot(slotIdx) {
        if (this._solved) return;
        if (this._slots[slotIdx] === null) return;

        const tileIdx = this._slotTileIdx[slotIdx];
        this._slots[slotIdx]       = null;
        this._slotTileIdx[slotIdx] = null;

        if (tileIdx !== null) {
            this._tileUsed[tileIdx] = false;
            const tileEl = document.querySelector(`#${this.tilesId} .words-tile[data-tidx="${tileIdx}"]`);
            if (tileEl) tileEl.classList.remove('used');
        }

        this._renderSlots();
        this._clearMsg();
    }

    _renderSlots() {
        const container = document.getElementById(this.slotsId);
        container.innerHTML = '';
        this._slots.forEach((val, i) => {
            const slot = document.createElement('div');
            slot.className = 'words-slot' + (val !== null ? ' filled' : '');
            slot.textContent = val !== null ? val : '';
            slot.dataset.idx = i;
            if (val !== null) slot.addEventListener('click', () => this._removeFromSlot(i));
            container.appendChild(slot);
        });
    }

    _renderTiles() {
        const container = document.getElementById(this.tilesId);
        container.innerHTML = '';
        this._tiles.forEach((val, i) => {
            const tile = document.createElement('button');
            tile.className = 'words-tile';
            tile.textContent = val;
            tile.dataset.tidx = i;
            tile.addEventListener('click', () => this._placeTile(i));
            container.appendChild(tile);
        });
    }

    _clearSlots() {
        this._slots       = new Array(this._slots.length).fill(null);
        this._slotTileIdx = new Array(this._slotTileIdx.length).fill(null);
        this._tileUsed    = new Array(this._tileUsed.length).fill(false);
        document.querySelectorAll(`#${this.tilesId} .words-tile`).forEach(t => t.classList.remove('used'));
        this._renderSlots();
        this._clearMsg();
    }

    _clearMsg() {
        const el = document.getElementById(this.msgId);
        if (el) { el.textContent = ''; el.className = 'words-msg'; }
    }

    _showNextBtn() {
        if (!this.nextBtnId) return;
        const btn = document.getElementById(this.nextBtnId);
        if (btn) { btn.style.display = ''; requestAnimationFrame(() => btn.classList.add('words-next-btn-in')); }
    }

    _hideNextBtn() {
        if (!this.nextBtnId) return;
        const btn = document.getElementById(this.nextBtnId);
        if (btn) { btn.style.display = 'none'; btn.classList.remove('words-next-btn-in'); }
    }

    _updateStreak() {
        if (!this.streakId) return;
        const el = document.getElementById(this.streakId);
        if (!el) return;
        if (this._streak >= 2) {
            el.textContent = this._streak + ' подряд 🔥';
            el.classList.add('visible');
        } else {
            el.classList.remove('visible');
        }
    }

    // Подсказка: подставить правильное значение в первый пустой слот
    hint() {
        this._hintUsed = true;
        if (this._solved) return;
        const emptyIdx = this._slots.indexOf(null);
        if (emptyIdx === -1) return;
        const correct = this._correctVals[emptyIdx];
        for (let i = 0; i < this._tiles.length; i++) {
            if (!this._tileUsed[i] && this._tiles[i] === correct) {
                this._placeTile(i);
                return correct;
            }
        }
        return null; // нет нужной плашки (все использованы)
    }
}
