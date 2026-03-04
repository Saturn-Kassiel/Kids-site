// =============================================
// ГОША — Модуль тестирования (testing.js)
// v2: данные загружаются из testing-data.json
// =============================================

// Данные заданий — загружаются асинхронно при первом init()
let TESTING_TASKS = null;
let TESTING_ALL_COLORS = [];

async function _loadTestingData() {
    if (TESTING_TASKS) return;
    // fetch() падает с CORS-ошибкой при открытии через file://.
    // В этом случае тихо выходим — тестирование будет недоступно.
    if (location.protocol === 'file:') {
        console.warn('[Testing] file:// протокол — testing-data.json недоступен');
        return;
    }
    try {
        const resp = await fetch('testing-data.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        TESTING_ALL_COLORS = data.allColors || [];
        TESTING_TASKS = {
            cognitive: data.cognitive,
            speech: data.speech,
            social: data.social,
            motor: data.motor
        };
        // Резолвим цвета: count → items (slice из единого массива)
        for (const [age, cfg] of Object.entries(TESTING_TASKS.cognitive.colors)) {
            if (cfg && cfg.count != null) {
                cfg.items = TESTING_ALL_COLORS.slice(0, cfg.count);
            }
        }
    } catch (e) {
        console.error('[Testing] Failed to load testing-data.json:', e);
    }
}
// === SHAPE DRAWING HELPERS ===
const SHAPE_SVG = {
    'круг':          '<circle cx="50" cy="50" r="40" fill="currentColor"/>',
    'квадрат':       '<rect x="12" y="12" width="76" height="76" fill="currentColor"/>',
    'треугольник':   '<polygon points="50,8 92,88 8,88" fill="currentColor"/>',
    'прямоугольник': '<rect x="6" y="20" width="88" height="56" fill="currentColor"/>',
    'овал':          '<ellipse cx="50" cy="50" rx="44" ry="30" fill="currentColor"/>',
    'ромб':          '<polygon points="50,6 94,50 50,94 6,50" fill="currentColor"/>',
    'звезда':        '<polygon points="50,5 61,38 95,38 68,60 78,93 50,73 22,93 32,60 5,38 39,38" fill="currentColor"/>',
    'трапеция':      '<polygon points="25,18 75,18 95,82 5,82" fill="currentColor"/>'
};

const SHAPE_COLORS = ['#ef4444','#3b82f6','#22c55e','#f59e0b','#a855f7','#ec4899','#f97316','#0d9488'];

// =============================================
// VOICE RECORDER — MediaRecorder + IndexedDB
// =============================================
const VoiceRecorder = {
    _db: null,
    _recorder: null,
    _stream: null,
    _chunks: [],
    _analyser: null,
    _animFrame: null,
    DB_NAME: 'gosha_audio',
    STORE: 'recordings',

    // ── IndexedDB ──
    async openDB() {
        if (this._db) return this._db;
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.DB_NAME, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(this.STORE)) {
                    db.createObjectStore(this.STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = () => { this._db = req.result; resolve(this._db); };
            req.onerror = () => reject(req.error);
        });
    },

    async save(id, blob, meta) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, 'readwrite');
            tx.objectStore(this.STORE).put({ id, blob, meta, date: new Date().toISOString() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async get(id) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, 'readonly');
            const req = tx.objectStore(this.STORE).get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    },

    async getAllForTest(testPrefix) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, 'readonly');
            const store = tx.objectStore(this.STORE);
            const results = [];
            const req = store.openCursor();
            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    if (cursor.value.id.startsWith(testPrefix)) results.push(cursor.value);
                    cursor.continue();
                } else resolve(results);
            };
            req.onerror = () => reject(req.error);
        });
    },

    async deleteForTest(testPrefix) {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.STORE, 'readwrite');
            const store = tx.objectStore(this.STORE);
            const req = store.openCursor();
            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    if (cursor.value.id.startsWith(testPrefix)) cursor.delete();
                    cursor.continue();
                } else resolve();
            };
            tx.onerror = () => reject(tx.error);
        });
    },

    // ── Format detection ──
    getMimeType() {
        if (typeof MediaRecorder === 'undefined') return null;
        const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
        return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
    },

    isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined' && this.getMimeType());
    },

    // ── Recording ──
    async requestMic() {
        try {
            this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            return true;
        } catch(e) {
            return false;
        }
    },

    startRecording(onLevel) {
        if (!this._stream) return false;
        this._chunks = [];
        const mime = this.getMimeType();
        const options = mime ? { mimeType: mime } : {};

        this._recorder = new MediaRecorder(this._stream, options);
        this._recorder.ondataavailable = (e) => { if (e.data.size > 0) this._chunks.push(e.data); };
        this._recorder.start(100);

        // Analyser for audio level visualization
        if (onLevel) {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const src = ctx.createMediaStreamSource(this._stream);
                this._analyser = ctx.createAnalyser();
                this._analyser.fftSize = 256;
                src.connect(this._analyser);
                const data = new Uint8Array(this._analyser.frequencyBinCount);
                const tick = () => {
                    if (!this._analyser) return;
                    this._analyser.getByteFrequencyData(data);
                    const avg = data.reduce((s, v) => s + v, 0) / data.length;
                    onLevel(avg / 128); // 0..1 normalized
                    this._animFrame = requestAnimationFrame(tick);
                };
                tick();
            } catch(e) {}
        }
        return true;
    },

    stopRecording() {
        return new Promise((resolve) => {
            if (!this._recorder || this._recorder.state === 'inactive') {
                resolve(null); return;
            }
            this._recorder.onstop = () => {
                const blob = new Blob(this._chunks, { type: this._recorder.mimeType || 'audio/webm' });
                resolve(blob);
            };
            this._recorder.stop();
            if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
            this._analyser = null;
        });
    },

    releaseMic() {
        if (this._stream) {
            this._stream.getTracks().forEach(t => t.stop());
            this._stream = null;
        }
        if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
        this._analyser = null;
        this._recorder = null;
    },

    createURL(blob) {
        return URL.createObjectURL(blob);
    }
};
// =============================================
// TESTING MODULE
// =============================================
const Testing = {
    _profile: null,
    _results: [],
    _session: null,    // текущая сессия тестирования
    _taskQueue: [],
    _taskIdx: 0,
    _taskResults: {},  // { cognitive: [], speech: [], motor: [], social: [] }
    _startTime: 0,

    // ── Init ──
    async init() {
        AudioMgr.stop();
        await _loadTestingData();
        if (!TESTING_TASKS) {
            const el = document.getElementById('testing-content');
            if (el) el.innerHTML = '<div class="tst-setup"><div class="tst-setup-title">❌ Не удалось загрузить данные тестирования</div></div>';
            App.navigate('testing', 'Тестирование');
            return;
        }
        this._loadProfile();
        this._loadResults();
        if (!this._profile) {
            this._showSetup();
        } else {
            this._showDashboard();
        }
        App.navigate('testing', 'Тестирование');
    },

    // ── LocalStorage (с обработкой ошибок переполнения) ──
    _loadProfile() {
        try { this._profile = JSON.parse(localStorage.getItem('testing_profile')); } catch(e) { this._profile = null; }
    },
    _saveProfile() {
        try {
            localStorage.setItem('testing_profile', JSON.stringify(this._profile));
        } catch(e) {
            console.warn('[Testing] localStorage full, cannot save profile:', e);
        }
    },
    _loadResults() {
        try { this._results = JSON.parse(localStorage.getItem('testing_results')) || []; } catch(e) { this._results = []; }
    },
    _saveResults() {
        try {
            localStorage.setItem('testing_results', JSON.stringify(this._results));
        } catch(e) {
            // При переполнении — удаляем старые результаты
            console.warn('[Testing] localStorage full, trimming old results');
            try {
                if (this._results.length > 15) {
                    this._results = this._results.slice(-15);
                    localStorage.setItem('testing_results', JSON.stringify(this._results));
                }
            } catch(e2) { console.error('[Testing] Cannot save results:', e2); }
        }
    },

    // ── Helpers ──
    _shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },
    _rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },

    // Unified: record answer → highlight correct → next
    _checkAndNext(ok, selector, matchAttr, correctVal) {
        const highlightFn = (!ok && selector) ? () => {
            document.querySelectorAll(selector).forEach(b => {
                const val = matchAttr === 'textContent' ? b.textContent.trim()
                          : matchAttr === 'idx' ? parseInt(b.dataset.idx)
                          : b.dataset[matchAttr] || b.getAttribute('data-' + matchAttr);
                if (val == correctVal) b.classList.add('tst-highlight-correct');
            });
        } : null;
        this._showFeedback(ok, () => this._next(), highlightFn);
    },

    // =============================================
    // SETUP SCREEN (первый запуск)
    // =============================================
    _showSetup() {
        this._hideProgress();
        const el = document.getElementById('testing-content');
        el.innerHTML = `
            <div class="tst-setup">
                <div class="tst-mascot">🦉</div>
                <div class="tst-setup-title">Привет! Давай узнаем, что ты уже умеешь!</div>
                <div class="tst-setup-sub">Сначала выбери возраст ребёнка:</div>
                <div class="tst-age-grid">
                    <button class="tst-age-btn" onclick="Testing._selectAge('3-4')">
                        <span class="tst-age-num">3–4</span><span class="tst-age-label">года</span>
                    </button>
                    <button class="tst-age-btn" onclick="Testing._selectAge('4-5')">
                        <span class="tst-age-num">4–5</span><span class="tst-age-label">лет</span>
                    </button>
                    <button class="tst-age-btn" onclick="Testing._selectAge('5-6')">
                        <span class="tst-age-num">5–6</span><span class="tst-age-label">лет</span>
                    </button>
                    <button class="tst-age-btn" onclick="Testing._selectAge('6-7')">
                        <span class="tst-age-num">6–7</span><span class="tst-age-label">лет</span>
                    </button>
                </div>
            </div>`;
    },

    _selectAge(age) {
        const name = (typeof childName !== 'undefined' && childName) ? childName :
                     localStorage.getItem('child_name') || '';
        this._profile = { age_group: age, name: name };
        this._saveProfile();
        this._showDashboard();
    },

    // =============================================
    // DASHBOARD
    // =============================================
    _showDashboard() {
        this._hideProgress();
        // Remove lingering progress bar from test
        const oldProg = document.getElementById('tst-progress-wrap');
        if (oldProg) oldProg.remove();

        const el = document.getElementById('testing-content');
        const lastResult = this._results.length ? this._results[this._results.length - 1] : null;
        const prevResult = this._results.length > 1 ? this._results[this._results.length - 2] : null;
        const age = this._profile.age_group;

        // Age norms reference (approximate)
        const AGE_NORMS = {
            '3-4': { low: 0.45, mid: 0.65, high: 0.85 },
            '4-5': { low: 0.50, mid: 0.70, high: 0.85 },
            '5-6': { low: 0.55, mid: 0.72, high: 0.88 },
            '6-7': { low: 0.55, mid: 0.75, high: 0.90 }
        };
        const norms = AGE_NORMS[age] || AGE_NORMS['4-5'];

        let chartHtml = '';
        if (lastResult) {
            chartHtml = `
                <div class="tst-chart-wrap">
                    <canvas id="tst-spider" width="320" height="320"></canvas>
                </div>
                <div class="tst-norm-hint">Ориентир для ${age} лет: ${Math.round(norms.low*100)}–${Math.round(norms.high*100)}%</div>
                <div class="tst-scores-row">
                    ${this._scoreBadgeWithDelta('Когниция', lastResult.blocks.cognitive?.score, prevResult?.blocks?.cognitive?.score, '#a855f7')}
                    ${this._scoreBadgeWithDelta('Речь', lastResult.blocks.speech?.score, prevResult?.blocks?.speech?.score, '#3b82f6')}
                    ${this._scoreBadgeWithDelta('Моторика', lastResult.blocks.motor?.score, prevResult?.blocks?.motor?.score, '#22c55e')}
                    ${this._scoreBadgeWithDelta('Социум', lastResult.blocks.social?.score, prevResult?.blocks?.social?.score, '#f59e0b')}
                </div>`;

            // Progress chart + trend summary if we have more than 1 result
            if (this._results.length > 1) {
                const trendText = this._calcTrend();
                chartHtml += `
                    <div class="tst-progress-section">
                        <div class="tst-progress-title">Динамика</div>
                        ${trendText ? `<div class="tst-trend-text">${trendText}</div>` : ''}
                        <canvas id="tst-progress-chart" width="320" height="160"
                            data-history="${encodeURIComponent(JSON.stringify(this._results.slice(-12).map(r => ({
                                date: r.date,
                                avg:  this._avgScore(r),
                                cog:  r.blocks.cognitive?.score ?? null,
                                spe:  r.blocks.speech?.score ?? null,
                                mot:  r.blocks.motor?.score ?? null,
                                soc:  r.blocks.social?.score ?? null
                            }))))}"></canvas>
                        <div class="tst-progress-legend">
                            <span style="color:#a855f7">🧠</span>
                            <span style="color:#3b82f6">💬</span>
                            <span style="color:#22c55e">✋</span>
                            <span style="color:#f59e0b">❤️</span>
                            <span style="color:#fff;opacity:0.6;font-size:11px">— Общий</span>
                        </div>
                    </div>`;
            }
        } else {
            chartHtml = `<div class="tst-no-results">
                <div style="font-size:48px;margin-bottom:12px;">📋</div>
                <div>Пройдите первый тест, чтобы увидеть результаты</div>
            </div>`;
        }

        let historyHtml = '';
        if (this._results.length) {
            const blockNames = { cognitive: '🧠 Когниция', speech: '💬 Речь', motor: '✋ Моторика', social: '❤️ Социум' };
            historyHtml = '<div class="tst-history-title">История</div><div class="tst-history-list">';
            const shown = this._results.slice(-10).reverse();
            for (let ri = 0; ri < shown.length; ri++) {
                const r = shown[ri];
                const d = new Date(r.date);
                const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
                const avg = this._avgScore(r);
                const pct = Math.round(avg * 100);

                // Тип и метка
                let typeLabel;
                if (r.type === 'full') {
                    typeLabel = '<span class="tst-hist-type">Полный</span>';
                } else {
                    const blockKey = r.miniBlock || Object.keys(r.blocks)[0] || '';
                    const label = blockKey ? (blockNames[blockKey] || blockKey) : 'Мини';
                    typeLabel = `<span class="tst-hist-type tst-hist-mini-label">${label}</span>`;
                }

                // Детализация по блокам
                let detailsHtml = '';
                for (const [b, data] of Object.entries(r.blocks)) {
                    if (data.voiceOnly || data.score == null || data.score < 0) {
                        detailsHtml += `<div class="tst-hist-block">
                            <div class="tst-hist-block-head">
                                <span class="tst-hist-detail-name">${blockNames[b] || b}</span>
                                <span class="tst-hist-detail-pct" style="color:var(--text2)">🎙</span>
                            </div>
                            <div class="tst-hist-block-label" style="color:var(--text2)">Голосовые записи</div>
                        </div>`;
                        continue;
                    }
                    const bPct = Math.round(data.score * 100);
                    const bColor = this._scoreColor(data.score);
                    const bLabel = this._scoreLabel(data.score);
                    const bTip = this._blockTip(b, data.score);
                    const timeInfo = data.avgTime ? `<div class="tst-hist-block-time">~${data.avgTime}с/задание</div>` : '';
                    detailsHtml += `<div class="tst-hist-block">
                        <div class="tst-hist-block-head">
                            <span class="tst-hist-detail-name">${blockNames[b] || b}</span>
                            <span class="tst-hist-detail-pct" style="color:${bColor}">${bPct}%</span>
                        </div>
                        <div class="tst-hist-detail-bar"><span style="width:${bPct}%;background:${bColor}"></span></div>
                        <div class="tst-hist-block-label" style="color:${bColor}">${bLabel}</div>
                        ${timeInfo}
                        ${bTip ? `<div class="tst-hist-block-tip">${bTip}</div>` : ''}
                    </div>`;
                }

                // Кнопка «Записи» если есть audioPrefix
                if (r.audioPrefix) {
                    detailsHtml += `<div class="tst-hist-audio-wrap" id="tst-hist-audio-${ri}">
                        <button class="tst-hist-audio-btn" onclick="Testing._loadHistAudio('${r.audioPrefix}', ${ri})">🎙 Показать записи</button>
                    </div>`;
                }

                historyHtml += `<div class="tst-hist-accordion" id="tst-ha-${ri}">
                    <div class="tst-history-item" onclick="document.getElementById('tst-ha-${ri}').classList.toggle('open')">
                        <span class="tst-hist-date">${dateStr}</span>
                        ${typeLabel}
                        <span class="tst-hist-score" style="color:${this._scoreColor(avg)}">${pct}%</span>
                        <span class="tst-hist-arrow">›</span>
                    </div>
                    <div class="tst-hist-details">${detailsHtml}</div>
                </div>`;
            }
            historyHtml += '</div>';
        }

        el.innerHTML = `
            <div class="tst-dash">
                <div class="tst-dash-header">
                    <div class="tst-dash-age">Возраст: <strong>${age} лет</strong></div>
                    <button class="tst-change-age" onclick="Testing._showSetup()">Изменить</button>
                </div>
                ${chartHtml}
                <div class="tst-actions">
                    <button class="tst-start-btn tst-btn-full" onclick="Testing.startFull()">
                        <span>🧪</span> Полный тест
                    </button>
                    <div class="tst-mini-row">
                        <button class="tst-mini-btn" onclick="Testing.startMini('cognitive')">🧠 Когниция</button>
                        <button class="tst-mini-btn" onclick="Testing.startMini('speech')">💬 Речь</button>
                        <button class="tst-mini-btn" onclick="Testing.startMini('motor')">✋ Моторика</button>
                        <button class="tst-mini-btn" onclick="Testing.startMini('social')">❤️ Социум</button>
                    </div>
                </div>
                ${historyHtml}
            </div>`;

        if (lastResult) {
            requestAnimationFrame(() => {
                this._drawSpider(lastResult);
                this._drawProgressChart();
            });
        }
    },

    // ── Score badge with delta arrow ──
    _scoreBadgeWithDelta(label, score, prevScore, color) {
        const pct = score != null && score >= 0 ? Math.round(score * 100) : '—';
        let deltaHtml = '';
        if (prevScore != null && prevScore >= 0 && score != null && score >= 0) {
            const diff = Math.round((score - prevScore) * 100);
            if (diff > 0) deltaHtml = `<span class="tst-delta tst-delta-up">↑${diff}</span>`;
            else if (diff < 0) deltaHtml = `<span class="tst-delta tst-delta-down">↓${Math.abs(diff)}</span>`;
        }
        return `<div class="tst-score-badge">
            <div class="tst-sb-val" style="color:${color}">${pct}%</div>
            ${deltaHtml}
            <div class="tst-sb-label">${label}</div>
        </div>`;
    },

    // ── Sparkline drawing ──
    _drawSparklines() {
        document.querySelectorAll('.tst-sparkline-canvas').forEach(canvas => {
            const points = canvas.dataset.points.split(',').map(Number);
            if (points.length < 2) return;
            const ctx = canvas.getContext('2d');
            const W = 120, H = 32;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            ctx.scale(dpr, dpr);

            const min = Math.max(0, Math.min(...points) - 0.1);
            const max = Math.min(1, Math.max(...points) + 0.1);
            const range = max - min || 1;
            const xStep = (W - 8) / (points.length - 1);

            // Fill gradient
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const lineColor = isDark ? '#54ACBF' : '#3b82f6';

            ctx.beginPath();
            points.forEach((v, i) => {
                const x = 4 + i * xStep;
                const y = H - 4 - ((v - min) / range) * (H - 8);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // End dot
            const lastX = 4 + (points.length - 1) * xStep;
            const lastY = H - 4 - ((points[points.length - 1] - min) / range) * (H - 8);
            ctx.fillStyle = lineColor;
            ctx.beginPath();
            ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    _calcTrend() {
        if (this._results.length < 2) return '';
        const recent = this._results.slice(-3);
        const older  = this._results.slice(-6, -3);
        const avgRecent = recent.reduce((s, r) => s + this._avgScore(r), 0) / recent.length;
        if (!older.length) {
            // Compare just last 2
            const prev = this._avgScore(this._results[this._results.length - 2]);
            const last = this._avgScore(this._results[this._results.length - 1]);
            const diff = Math.round((last - prev) * 100);
            if (diff > 0)  return `📈 Улучшение на ${diff}% с прошлого теста`;
            if (diff < 0)  return `📉 Снижение на ${Math.abs(diff)}% с прошлого теста`;
            return '➡️ Результат стабилен';
        }
        const avgOlder = older.reduce((s, r) => s + this._avgScore(r), 0) / older.length;
        const diff = Math.round((avgRecent - avgOlder) * 100);
        if (diff > 3)   return `📈 Прогресс +${diff}% за последние тесты`;
        if (diff < -3)  return `📉 Снижение на ${Math.abs(diff)}% — стоит позаниматься`;
        return '➡️ Результаты стабильны';
    },

    _drawProgressChart() {
        const canvas = document.getElementById('tst-progress-chart');
        if (!canvas) return;
        let history;
        try { history = JSON.parse(decodeURIComponent(canvas.dataset.history || '[]')); } catch { return; }
        if (history.length < 2) return;

        const ctx = canvas.getContext('2d');
        const W = 320, H = 160, PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 28;
        const dpr = window.devicePixelRatio || 1;
        canvas.width  = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width  = W + 'px';
        canvas.style.height = H + 'px';
        ctx.scale(dpr, dpr);

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
        const labelColor = isDark ? '#94a3b8' : '#64748b';
        const n = history.length;
        const xStep = (W - PAD_L - PAD_R) / (n - 1);

        const toX = i => PAD_L + i * xStep;
        const toY = v => PAD_T + (1 - v) * (H - PAD_T - PAD_B);

        // Grid lines at 25%, 50%, 75%, 100%
        ctx.lineWidth = 1;
        [0.25, 0.5, 0.75, 1].forEach(v => {
            const y = toY(v);
            ctx.strokeStyle = gridColor;
            ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
            ctx.fillStyle = labelColor;
            ctx.font = `${10 * dpr / dpr}px sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(v * 100) + '%', PAD_L - 4, y + 4);
        });

        // Draw date labels on X axis (max 4 labels to avoid crowding)
        const labelStep = Math.max(1, Math.floor(n / 4));
        ctx.fillStyle = labelColor;
        ctx.textAlign = 'center';
        ctx.font = '9px sans-serif';
        history.forEach((pt, i) => {
            if (i % labelStep === 0 || i === n - 1) {
                const d = new Date(pt.date);
                const label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                ctx.fillText(label, toX(i), H - 4);
            }
        });

        // Draw block lines (thin, semi-transparent)
        const blockLines = [
            { key: 'cog', color: '#a855f7', alpha: 0.5 },
            { key: 'spe', color: '#3b82f6', alpha: 0.5 },
            { key: 'mot', color: '#22c55e', alpha: 0.5 },
            { key: 'soc', color: '#f59e0b', alpha: 0.5 },
        ];
        blockLines.forEach(({ key, color, alpha }) => {
            const pts = history.map((pt, i) => pt[key] != null ? { i, v: pt[key] } : null).filter(Boolean);
            if (pts.length < 2) return;
            ctx.strokeStyle = color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            pts.forEach(({ i, v }, pi) => {
                pi === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v));
            });
            ctx.stroke();
            ctx.setLineDash([]);
        });
        ctx.globalAlpha = 1;

        // Draw overall avg line (thick, white/light)
        const avgPts = history.map((pt, i) => ({ i, v: pt.avg }));
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(30,41,59,0.85)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        avgPts.forEach(({ i, v }, pi) => {
            pi === 0 ? ctx.moveTo(toX(i), toY(v)) : ctx.lineTo(toX(i), toY(v));
        });
        ctx.stroke();

        // Dots on avg line
        avgPts.forEach(({ i, v }) => {
            ctx.fillStyle = this._scoreColor(v);
            ctx.beginPath();
            ctx.arc(toX(i), toY(v), 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // Last value label
        const last = avgPts[avgPts.length - 1];
        ctx.fillStyle = this._scoreColor(last.v);
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(Math.round(last.v * 100) + '%', toX(last.i) + 7, toY(last.v) + 4);
    },

    _avgScore(r) {
        const blocks = ['cognitive','speech','motor','social'];
        let sum = 0, cnt = 0;
        blocks.forEach(b => {
            if (r.blocks[b] && r.blocks[b].score != null && r.blocks[b].score >= 0) {
                sum += r.blocks[b].score; cnt++;
            }
        });
        return cnt ? sum / cnt : 0;
    },

    _scoreColor(score) {
        if (score >= 0.8) return '#22c55e';
        if (score >= 0.6) return '#f59e0b';
        if (score >= 0.4) return '#f97316';
        return '#ef4444';
    },

    // ── Spider Chart (canvas) ──
    _drawSpider(result) {
        const canvas = document.getElementById('tst-spider');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = 320, H = 320;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        const cx = W / 2, cy = H / 2, R = 95;

        // Высокая плотность пикселей
        const dpr = window.devicePixelRatio || 1;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        const labels = ['Когниция', 'Речь', 'Моторика', 'Социум'];
        const colors = ['#a855f7', '#3b82f6', '#22c55e', '#f59e0b'];
        const scores = [
            (result.blocks.cognitive?.score != null && result.blocks.cognitive?.score >= 0) ? result.blocks.cognitive.score : 0,
            (result.blocks.speech?.score != null && result.blocks.speech?.score >= 0) ? result.blocks.speech.score : 0,
            (result.blocks.motor?.score != null && result.blocks.motor?.score >= 0) ? result.blocks.motor.score : 0,
            (result.blocks.social?.score != null && result.blocks.social?.score >= 0) ? result.blocks.social.score : 0
        ];
        const n = 4;

        // Сетка
        ctx.strokeStyle = 'rgba(128,128,128,0.15)';
        ctx.lineWidth = 1;
        for (let level = 0.25; level <= 1; level += 0.25) {
            ctx.beginPath();
            for (let i = 0; i <= n; i++) {
                const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
                const x = cx + Math.cos(angle) * R * level;
                const y = cy + Math.sin(angle) * R * level;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Оси
        ctx.strokeStyle = 'rgba(128,128,128,0.2)';
        for (let i = 0; i < n; i++) {
            const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
            ctx.stroke();
        }

        // Область данных
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        ctx.fillStyle = isDark ? 'rgba(84,172,191,0.15)' : 'rgba(96,165,250,0.15)';
        ctx.strokeStyle = isDark ? '#54ACBF' : '#3b82f6';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
            const val = Math.max(scores[i], 0.05);
            const x = cx + Math.cos(angle) * R * val;
            const y = cy + Math.sin(angle) * R * val;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Точки
        for (let i = 0; i < n; i++) {
            const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
            const val = Math.max(scores[i], 0.05);
            const x = cx + Math.cos(angle) * R * val;
            const y = cy + Math.sin(angle) * R * val;
            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Подписи — умное выравнивание, чтобы не обрезалось
        ctx.fillStyle = isDark ? '#d4f0f5' : '#1a1f3c';
        ctx.font = '13px "Plus Jakarta Sans", sans-serif';
        const labelDist = R + 24;
        for (let i = 0; i < n; i++) {
            const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
            let x = cx + Math.cos(angle) * labelDist;
            let y = cy + Math.sin(angle) * labelDist;
            // i=0 top, i=1 right, i=2 bottom, i=3 left
            if (i === 0) { ctx.textAlign = 'center'; y -= 6; }
            else if (i === 1) { ctx.textAlign = 'left'; x += 4; y += 5; }
            else if (i === 2) { ctx.textAlign = 'center'; y += 14; }
            else if (i === 3) { ctx.textAlign = 'right'; x -= 4; y += 5; }
            ctx.fillText(labels[i], x, y);
        }
    },

    // =============================================
    // START TEST
    // =============================================
    startFull() {
        this._session = {
            type: 'full',
            age_group: this._profile.age_group,
            date: new Date().toISOString()
        };
        this._taskResults = { cognitive: [], speech: [], motor: [], social: [] };
        this._starsCollected = 0;
        this._paused = false;
        this._buildFullQueue();
        this._taskIdx = 0;
        this._startTime = Date.now();
        this._showIntro();
    },

    startMini(block) {
        this._session = {
            type: 'mini',
            age_group: this._profile.age_group,
            date: new Date().toISOString(),
            miniBlock: block
        };
        this._taskResults = { cognitive: [], speech: [], motor: [], social: [] };
        this._starsCollected = 0;
        this._paused = false;
        this._buildMiniQueue(block);
        this._taskIdx = 0;
        this._startTime = Date.now();
        this._showIntro();
    },

    _buildFullQueue() {
        const age = this._profile.age_group;
        this._taskQueue = [];

        // Когнитивный блок
        this._taskQueue.push({ type: 'block-title', block: 'cognitive', title: '🧠 Проверим смекалку!' });
        this._taskQueue.push(...this._getCountingTasks(age));
        if (TESTING_TASKS.cognitive.colors[age]) this._taskQueue.push(...this._getColorTasks(age));
        this._taskQueue.push(...this._getShapeTasks(age));
        this._taskQueue.push(...this._getOddTasks(age));
        this._taskQueue.push(...this._getSequenceTasks(age));
        this._taskQueue.push({ type: 'pause', emoji: '⭐' });

        // Речевой блок
        this._taskQueue.push({ type: 'block-title', block: 'speech', title: '💬 Проверим словарный запас!' });
        this._taskQueue.push(...this._getVocabTasks(age));
        if (TESTING_TASKS.speech.grammar[age]) this._taskQueue.push(...this._getGrammarTasks(age));
        this._taskQueue.push(...this._getRecordWordTasks(age));
        this._taskQueue.push(...this._getRecordDescribeTasks(age));
        this._taskQueue.push({ type: 'pause', emoji: '🌟' });

        // Моторный блок
        this._taskQueue.push({ type: 'block-title', block: 'motor', title: '✋ Проверим ловкость!' });
        this._taskQueue.push(...this._getCoinTasks(age));
        this._taskQueue.push(...this._getDotTasks(age));
        this._taskQueue.push({ type: 'pause', emoji: '💫' });

        // Социально-эмоциональный блок
        this._taskQueue.push({ type: 'block-title', block: 'social', title: '❤️ Проверим понимание чувств!' });
        this._taskQueue.push(...this._getEmotionTasks(age));
        this._taskQueue.push(...this._getSituationTasks(age));
        this._taskQueue.push(...this._getSelfCareTasks(age));

        // Финал
        this._taskQueue.push({ type: 'finish' });
    },

    _buildMiniQueue(block) {
        const age = this._profile.age_group;
        this._taskQueue = [];
        this._taskQueue.push({ type: 'block-title', block, title: { cognitive: '🧠 Когниция', speech: '💬 Речь', motor: '✋ Моторика', social: '❤️ Социум' }[block] });

        if (block === 'cognitive') {
            this._taskQueue.push(...this._getCountingTasks(age));
            if (TESTING_TASKS.cognitive.colors[age]) this._taskQueue.push(...this._getColorTasks(age));
            this._taskQueue.push(...this._getShapeTasks(age));
            this._taskQueue.push(...this._getOddTasks(age));
            this._taskQueue.push(...this._getSequenceTasks(age));
        } else if (block === 'speech') {
            this._taskQueue.push(...this._getVocabTasks(age));
            if (TESTING_TASKS.speech.grammar[age]) this._taskQueue.push(...this._getGrammarTasks(age));
            this._taskQueue.push(...this._getRecordWordTasks(age));
            this._taskQueue.push(...this._getRecordDescribeTasks(age));
        } else if (block === 'motor') {
            this._taskQueue.push(...this._getCoinTasks(age));
            this._taskQueue.push(...this._getDotTasks(age));
            this._taskQueue.push(...this._getTraceTasks(age));
            this._taskQueue.push(...this._getRhythmTasks(age));
            this._taskQueue.push(...this._getMazeTasks(age));
            this._taskQueue.push(...this._getSortTasks(age));
        } else if (block === 'social') {
            this._taskQueue.push(...this._getEmotionTasks(age));
            this._taskQueue.push(...this._getSituationTasks(age));
            this._taskQueue.push(...this._getSelfCareTasks(age));
        }
        this._taskQueue.push({ type: 'finish' });
    },

    // ── Task generators ──
    _getCountingTasks(age) {
        const cfg = TESTING_TASKS.cognitive.counting[age];
        const tasks = [];
        const emojis = ['🍎','🏀','⭐','🎈','🐟','🍕','🦋','🌸'];
        for (let i = 0; i < cfg.rounds; i++) {
            if (cfg.arithmetic) {
                tasks.push({ type: 'arithmetic', block: 'cognitive', id: `counting_${i}` });
            } else {
                const count = this._rand(1, cfg.max);
                const emoji = emojis[this._rand(0, emojis.length - 1)];
                tasks.push({ type: 'counting', block: 'cognitive', id: `counting_${i}`, count, emoji, max: cfg.max });
            }
        }
        return tasks;
    },

    _getColorTasks(age) {
        const cfg = TESTING_TASKS.cognitive.colors[age];
        if (!cfg) return [];
        const shuffled = this._shuffle([...cfg.items]);
        return shuffled.slice(0, cfg.rounds).map((c, i) => ({
            type: 'colors', block: 'cognitive', id: `colors_${i}`,
            target: c, allColors: cfg.items
        }));
    },

    _getShapeTasks(age) {
        const cfg = TESTING_TASKS.cognitive.shapes[age];
        const shuffled = this._shuffle([...cfg.shapes]);
        return shuffled.slice(0, cfg.rounds).map((s, i) => ({
            type: 'shapes', block: 'cognitive', id: `shapes_${i}`,
            target: s, allShapes: cfg.shapes
        }));
    },

    _getOddTasks(age) {
        const cfg = TESTING_TASKS.cognitive.oddOneOut[age];
        const shuffled = this._shuffle([...cfg.sets]);
        return shuffled.slice(0, Math.min(3, shuffled.length)).map((s, i) => ({
            type: 'oddOneOut', block: 'cognitive', id: `odd_${i}`, set: s
        }));
    },

    _getSequenceTasks(age) {
        const cfg = TESTING_TASKS.cognitive.sequence[age];
        const shuffled = this._shuffle([...cfg.sets]);
        return shuffled.slice(0, Math.min(2, shuffled.length)).map((s, i) => ({
            type: 'sequence', block: 'cognitive', id: `seq_${i}`, set: s
        }));
    },

    _getVocabTasks(age) {
        const cfg = TESTING_TASKS.speech.vocabulary[age];
        const shuffled = this._shuffle([...cfg.sets]);
        return shuffled.slice(0, Math.min(4, shuffled.length)).map((s, i) => ({
            type: 'vocabulary', block: 'speech', id: `vocab_${i}`, set: s
        }));
    },

    _getGrammarTasks(age) {
        const cfg = TESTING_TASKS.speech.grammar[age];
        if (!cfg) return [];
        const shuffled = this._shuffle([...cfg.sets]);
        return shuffled.slice(0, Math.min(3, shuffled.length)).map((s, i) => ({
            type: 'grammar', block: 'speech', id: `grammar_${i}`, set: s
        }));
    },

    _getCoinTasks(age) {
        return [{ type: 'coins', block: 'motor', id: 'coins_0', age }];
    },

    _getDotTasks(age) {
        return [{ type: 'dots', block: 'motor', id: 'dots_0', age }];
    },

    _getTraceTasks(age) {
        return [{ type: 'trace', block: 'motor', id: 'trace_0', age }];
    },

    _getRhythmTasks(age) {
        return [{ type: 'rhythm', block: 'motor', id: 'rhythm_0', age }];
    },

    _getMazeTasks(age) {
        return [{ type: 'maze', block: 'motor', id: 'maze_0', age }];
    },

    _getSortTasks(age) {
        return [{ type: 'sort', block: 'motor', id: 'sort_0', age }];
    },

    _getEmotionTasks(age) {
        const cfg = TESTING_TASKS.social.emotions[age];
        const shuffled = this._shuffle([...cfg.sets]);
        return shuffled.slice(0, Math.min(3, shuffled.length)).map((s, i) => ({
            type: 'emotions', block: 'social', id: `emo_${i}`, set: s
        }));
    },

    _getSituationTasks(age) {
        const cfg = TESTING_TASKS.social.situations[age];
        const shuffled = this._shuffle([...cfg.sets]);
        return shuffled.slice(0, Math.min(3, shuffled.length)).map((s, i) => ({
            type: 'situations', block: 'social', id: `sit_${i}`, set: s
        }));
    },

    _getSelfCareTasks(age) {
        return [{ type: 'selfCare', block: 'social', id: 'selfcare_0', age }];
    },

    _getRecordWordTasks(age) {
        const cfg = TESTING_TASKS.speech.recordWords[age];
        if (!cfg) return [];
        const shuffled = this._shuffle([...cfg.words]);
        return shuffled.slice(0, Math.min(5, shuffled.length)).map((w, i) => ({
            type: 'recordWord', block: 'speech', id: `recword_${i}`,
            word: w.word, emoji: w.emoji, sounds: w.sounds, maxSec: cfg.maxSec
        }));
    },

    _getRecordDescribeTasks(age) {
        const cfg = TESTING_TASKS.speech.recordDescribe[age];
        if (!cfg) return [];
        const scene = cfg.scenes[this._rand(0, cfg.scenes.length - 1)];
        return [{
            type: 'recordDescribe', block: 'speech', id: 'recdesc_0',
            emoji: scene.emoji, prompt: scene.prompt, maxSec: cfg.maxSec
        }];
    },

    // =============================================
    // TEST ENGINE — навигация
    // =============================================
    _showIntro() {
        const el = document.getElementById('testing-content');
        el.innerHTML = `
            <div class="tst-intro">
                <div class="tst-mascot tst-mascot-bounce">🦉</div>
                <div class="tst-intro-text">Давай поиграем!<br>Я буду давать тебе задания.</div>
                <button class="tst-start-btn" onclick="Testing._next()">Начинаем! →</button>
            </div>`;
        // Inject progress bar with exit button
        const section = document.getElementById('testing');
        if (!document.getElementById('tst-progress-wrap')) {
            const progWrap = document.createElement('div');
            progWrap.id = 'tst-progress-wrap';
            progWrap.className = 'tst-progress-header';
            progWrap.style.display = 'none';
            progWrap.innerHTML = `
                <button class="tst-exit-btn" onclick="Testing._exitTest()" title="Выйти">✕</button>
                <div class="tst-progress"><div class="tst-progress-bar" id="tst-progress-bar"></div></div>
                <span class="tst-stars-counter" id="tst-stars-counter">⭐ 0</span>`;
            section.insertBefore(progWrap, section.firstChild);
        }
    },

    _exitTest() {
        if (this._paused) return;
        this._paused = true;
        // Snapshot result count so _resumeTest can tell if the current task was already answered
        this._resultsCountSnapshot = Object.values(this._taskResults).flat().length;
        const el = document.getElementById('testing-content');
        const done = Object.values(this._taskResults).flat().length;
        el.innerHTML = `
            <div class="tst-pause-modal">
                <div class="tst-pause-modal-icon">⏸</div>
                <div class="tst-pause-modal-title">Пауза</div>
                <div class="tst-pause-modal-text">Пройдено заданий: ${done}</div>
                <div class="tst-pause-modal-btns">
                    <button class="tst-start-btn tst-btn-full" onclick="Testing._resumeTest()">Продолжить →</button>
                    <button class="tst-start-btn tst-btn-exit" onclick="Testing._exitTestConfirm()">Сохранить и выйти</button>
                </div>
            </div>`;
    },

    _resumeTest() {
        this._paused = false;
        // Only replay the current task if it hasn't been answered yet.
        // _taskIdx is already pointing at the NEXT task (incremented in _next() before render).
        // If the current task was answered, _taskResults will have grown since _taskIdx was set —
        // in that case we proceed forward rather than replaying and double-counting results.
        const resultsBefore = this._resultsCountSnapshot || 0;
        const resultsNow = Object.values(this._taskResults).flat().length;
        if (resultsNow === resultsBefore) {
            // No new result recorded → task was not yet answered → replay it
            this._taskIdx = Math.max(0, this._taskIdx - 1);
        }
        // else: result already recorded → continue from current _taskIdx (show next task)
        this._next();
    },

    _exitTestConfirm() {
        // Save partial results and go to dashboard
        const done = Object.values(this._taskResults).flat().length;
        if (done > 0) {
            // Trigger finish with what we have
            this._showFinish();
        } else {
            this._hideProgress();
            this._showDashboard();
        }
    },

    _next() {
        if (this._taskIdx >= this._taskQueue.length) return;
        const task = this._taskQueue[this._taskIdx];
        this._taskIdx++;
        this._updateProgress();

        switch (task.type) {
            case 'block-title': this._showBlockTitle(task); break;
            case 'pause':       this._showPause(task); break;
            case 'finish':      this._showFinish(); break;
            case 'counting':    this._taskCounting(task); break;
            case 'arithmetic':  this._taskArithmetic(task); break;
            case 'colors':      this._taskColors(task); break;
            case 'shapes':      this._taskShapes(task); break;
            case 'oddOneOut':   this._taskOddOneOut(task); break;
            case 'sequence':    this._taskSequence(task); break;
            case 'vocabulary':  this._taskVocabulary(task); break;
            case 'grammar':     this._taskGrammar(task); break;
            case 'recordWord':  this._taskRecordWord(task); break;
            case 'recordDescribe': this._taskRecordDescribe(task); break;
            case 'coins':       this._taskCoins(task); break;
            case 'dots':        this._taskDots(task); break;
            case 'trace':       this._taskTrace(task); break;
            case 'rhythm':      this._taskRhythm(task); break;
            case 'maze':        this._taskMaze(task); break;
            case 'sort':        this._taskSort(task); break;
            case 'emotions':    this._taskEmotions(task); break;
            case 'situations':  this._taskSituations(task); break;
            case 'selfCare':    this._taskSelfCare(task); break;
            default: this._next();
        }
    },

    _showBlockTitle(task) {
        const el = document.getElementById('testing-content');
        el.innerHTML = `
            <div class="tst-block-title-screen">
                <div class="tst-block-emoji">${task.title.split(' ')[0]}</div>
                <div class="tst-block-text">${task.title.substring(task.title.indexOf(' ') + 1)}</div>
            </div>`;
        setTimeout(() => this._next(), 1800);
    },

    _showPause(task) {
        const el = document.getElementById('testing-content');
        const done = Object.values(this._taskResults).flat().length;
        const total = this._taskQueue.filter(t => !['block-title','pause','finish'].includes(t.type)).length;
        const correct = this._starsCollected || 0;
        const starsDisplay = '⭐'.repeat(Math.min(correct, 10));
        el.innerHTML = `
            <div class="tst-pause-screen">
                <div style="font-size:64px">${task.emoji}</div>
                <div class="tst-pause-text">Отлично! ${correct > 0 ? `Ты собрал ${correct} ${correct === 1 ? 'звёздочку' : correct < 5 ? 'звёздочки' : 'звёздочек'}!` : 'Продолжаем!'}</div>
                <div class="tst-pause-stars">${starsDisplay}</div>
                <div class="tst-pause-progress-text">${done} из ${total} заданий</div>
            </div>`;
        setTimeout(() => this._next(), 2200);
    },

    // ── Progress bar (fixed at top of section) ──
    _updateProgress() {
        const total = this._taskQueue.filter(t => !['block-title','pause','finish'].includes(t.type)).length;
        const done = Object.values(this._taskResults).flat().length;
        const pct = total ? Math.round(done / total * 100) : 0;
        const wrap = document.getElementById('tst-progress-wrap');
        const bar = document.getElementById('tst-progress-bar');
        const starsEl = document.getElementById('tst-stars-counter');
        if (wrap) wrap.style.display = '';
        if (bar) bar.style.width = pct + '%';
        if (starsEl) starsEl.textContent = `⭐ ${this._starsCollected || 0}`;
    },

    _hideProgress() {
        const wrap = document.getElementById('tst-progress-wrap');
        if (wrap) wrap.style.display = 'none';
    },

    // ── Record result ──
    _record(block, id, correct, timeSec, details) {
        this._taskResults[block].push({
            id,
            result: correct ? 'correct' : 'incorrect',
            score: correct ? 1 : 0,
            time_sec: Math.round(timeSec * 10) / 10,
            details: details || {}
        });
    },

    // ── Feedback with sound + correct answer reveal ──
    _showFeedback(correct, cb, highlightCorrectFn) {
        // Play sound (uses global functions from app.js)
        try {
            if (correct) {
                if (typeof playCorrectSound === 'function') playCorrectSound('testing');
            } else {
                if (typeof playWrongSound === 'function') playWrongSound('testing');
            }
        } catch(e) {}

        // Disable all interactive buttons to prevent double-tap
        document.querySelectorAll('.tst-opt-btn, .tst-odd-btn, .tst-color-ball, .tst-shape-btn, .tst-emo-btn').forEach(b => {
            b.style.pointerEvents = 'none';
        });

        const overlay = document.createElement('div');
        overlay.className = 'tst-feedback ' + (correct ? 'tst-fb-correct' : 'tst-fb-wrong');
        overlay.innerHTML = correct ? '✅' : '❌';
        document.getElementById('testing-content').appendChild(overlay);

        if (!correct && highlightCorrectFn) {
            // After the error indicator fades, highlight correct answer
            setTimeout(() => {
                try { highlightCorrectFn(); } catch(e) {}
            }, 500);
        }

        // Update stars
        if (correct) this._starsCollected++;

        const delay = correct ? 800 : 1800; // longer on error to show correct answer
        setTimeout(() => {
            overlay.remove();
            if (cb) cb();
        }, delay);
    },

    // ── Play tick sound (for interactions like placing items) ──
    _audioCtx: null,
    _getAudioCtx() {
        if (!this._audioCtx || this._audioCtx.state === 'closed') {
            this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this._audioCtx.state === 'suspended') this._audioCtx.resume();
        return this._audioCtx;
    },
    _playTick() {
        try {
            const ctx = this._getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch(e) {}
    },

    // ── Play finish fanfare ──
    _playFinishFanfare() {
        try {
            const ctx = this._getAudioCtx();
            const notes = [523, 659, 784, 1047, 1319]; // C E G C E
            let t = ctx.currentTime;
            notes.forEach((freq) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                osc.start(t); osc.stop(t + 0.45);
                t += 0.12;
            });
        } catch(e) {}
    },

    // =============================================
    // TASKS — COGNITIVE
    // =============================================

    // ── Counting ──
    _taskCounting(task) {
        const el = document.getElementById('testing-content');
        const t0 = Date.now();
        const items = Array(task.count).fill(task.emoji);
        // Генерируем варианты ответов
        const options = new Set([task.count]);
        // Fallback to 0..cfg.max if local neighbourhood is too narrow (< 4 unique values)
        const lo = Math.max(1, task.count - 3);
        const hi = Math.min(task.max, task.count + 3);
        const useWideRange = (hi - lo + 1) < 4;
        while (options.size < 4) {
            const n = useWideRange
                ? this._rand(Math.max(0, task.count - 5), Math.min(task.max + 2, task.count + 5))
                : this._rand(lo, hi);
            if (n !== task.count || options.size >= 3) options.add(n);
        }
        const sorted = [...options].sort((a, b) => a - b);

        el.innerHTML = `
            
            <div class="tst-task">
                <div class="tst-instruction">Посчитай, сколько предметов!</div>
                <div class="tst-items-grid">${items.map(e => `<span class="tst-item">${e}</span>`).join('')}</div>
                <div class="tst-options">
                    ${sorted.map(n => `<button class="tst-opt-btn" onclick="Testing._onCountAnswer(${n},${task.count},${t0},'${task.block}','${task.id}')">${n}</button>`).join('')}
                </div>
            </div>`;
    },

    _onCountAnswer(selected, correct, t0, block, id) {
        const time = (Date.now() - t0) / 1000;
        const ok = selected === correct;
        this._record(block, id, ok, time, { expected: correct, answered: selected });
        this._checkAndNext(ok, '.tst-opt-btn', 'textContent', correct);
    },

    // ── Arithmetic (6-7) ──
    _taskArithmetic(task) {
        const el = document.getElementById('testing-content');
        const t0 = Date.now();
        const a = this._rand(1, 9);
        const isAdd = Math.random() < 0.5;
        const op = isAdd ? '+' : '−';
        const b = isAdd ? this._rand(0, 9 - a) : this._rand(0, a);
        const realAnswer = isAdd ? a + b : a - b;

        const options = new Set([realAnswer]);
        while (options.size < 4) options.add(this._rand(0, 18));
        const sorted = [...options].sort((a, b) => a - b);

        el.innerHTML = `
            
            <div class="tst-task">
                <div class="tst-instruction">Сколько будет?</div>
                <div class="tst-math-expr">${a} ${op} ${b} = ?</div>
                <div class="tst-options">
                    ${sorted.map(n => `<button class="tst-opt-btn" onclick="Testing._onCountAnswer(${n},${realAnswer},${t0},'${task.block}','${task.id}')">${n}</button>`).join('')}
                </div>
            </div>`;
    },

    // ── Colors ──
    _taskColors(task) {
        const el = document.getElementById('testing-content');
        const t0 = Date.now();
        const shuffled = this._shuffle([...task.allColors]);
        const shown = shuffled.slice(0, Math.min(6, shuffled.length));
        if (!shown.find(c => c.name === task.target.name)) shown[0] = task.target;
        const display = this._shuffle(shown);

        el.innerHTML = `
            
            <div class="tst-task">
                <div class="tst-instruction">Найди <strong>${task.target.name}</strong> шарик!</div>
                <div class="tst-color-grid">
                    ${display.map(c => `<button class="tst-color-ball" data-val="${c.name}" style="background:${c.css}" onclick="Testing._onColorAnswer('${c.name}','${task.target.name}',${t0},'${task.block}','${task.id}')"></button>`).join('')}
                </div>
            </div>`;
    },

    _onColorAnswer(selected, correct, t0, block, id) {
        const time = (Date.now() - t0) / 1000;
        const ok = selected === correct;
        this._record(block, id, ok, time);
        this._checkAndNext(ok, '.tst-color-ball', 'val', correct);
    },

    // ── Shapes ──
    _taskShapes(task) {
        const el = document.getElementById('testing-content');
        const t0 = Date.now();
        const shown = this._shuffle([...task.allShapes]).slice(0, Math.min(6, task.allShapes.length));
        if (!shown.includes(task.target)) shown[0] = task.target;
        const display = this._shuffle(shown);

        el.innerHTML = `
            
            <div class="tst-task">
                <div class="tst-instruction">Найди <strong>${task.target}</strong>!</div>
                <div class="tst-shape-grid">
                    ${display.map((s, i) => {
                        const color = SHAPE_COLORS[i % SHAPE_COLORS.length];
                        return `<button class="tst-shape-btn" data-val="${s}" style="color:${color}" onclick="Testing._onShapeAnswer('${s}','${task.target}',${t0},'${task.block}','${task.id}')">
                            <svg viewBox="0 0 100 100" width="60" height="60">${SHAPE_SVG[s] || ''}</svg>
                        </button>`;
                    }).join('')}
                </div>
            </div>`;
    },

    _onShapeAnswer(selected, correct, t0, block, id) {
        const time = (Date.now() - t0) / 1000;
        const ok = selected === correct;
        this._record(block, id, ok, time);
        this._checkAndNext(ok, '.tst-shape-btn', 'val', correct);
    },

    // ── 4th Odd One Out ──
    _taskOddOneOut(task) {
        const el = document.getElementById('testing-content');
        const t0 = Date.now();
        const s = task.set;

        el.innerHTML = `
            
            <div class="tst-task">
                <div class="tst-instruction">Три картинки дружат, а одна — нет. Найди лишнюю!</div>
                <div class="tst-odd-grid">
                    ${s.items.map((item, i) => `<button class="tst-odd-btn" data-idx="${i}" onclick="Testing._onOddAnswer(${i},${s.odd},${t0},'${task.block}','${task.id}')">${item}</button>`).join('')}
                </div>
            </div>`;
    },

    _onOddAnswer(selected, correct, t0, block, id) {
        const time = (Date.now() - t0) / 1000;
        const ok = selected === correct;
        this._record(block, id, ok, time);
        this._checkAndNext(ok, '.tst-odd-btn', 'idx', correct);
    },

    // ── Sequence ──
    _taskSequence(task) {
        const el = document.getElementById('testing-content');
        const t0 = Date.now();
        const s = task.set;
        const shuffledIdx = this._shuffle([...s.correct]);
        const hintText = s.hint || 'Расставь по порядку';
        const count = s.correct.length;

        // Пронумерованные пустые слоты
        const emptySlots = s.correct.map((_, i) =>
            `<span class="tst-seq-slot-empty" id="tst-seq-slot-${i}"><span class="tst-seq-slot-num">${i + 1}</span></span>`
        ).join('');

        el.innerHTML = `
            <div class="tst-task">
                <div class="tst-instruction">${hintText}</div>
                <div class="tst-seq-subtitle">Нажимай картинки в правильном порядке</div>
                <div class="tst-seq-slots" id="tst-seq-slots">${emptySlots}</div>
                <div class="tst-seq-pool" id="tst-seq-pool">
                    ${shuffledIdx.map(idx => `<button class="tst-seq-item" data-idx="${idx}" onclick="Testing._onSeqPick(this)">${s.items[idx]}</button>`).join('')}
                </div>
                <div class="tst-seq-actions">
                    <button class="tst-hint-btn" id="tst-seq-hint" onclick="Testing._onSeqHint()">💡 Подсказка</button>
                    <button class="tst-check-btn hidden" id="tst-seq-check" onclick="Testing._onSeqCheck(${t0},'${task.block}','${task.id}')">Проверить ✓</button>
                </div>
            </div>`;
        this._seqOrder = [];
        this._seqCorrect = s.correct;
        this._seqItems = s.items;
        this._seqHintUsed = false;
    },

    _seqOrder: [],
    _seqCorrect: [],
    _seqItems: [],
    _seqHintUsed: false,

    _onSeqHint() {
        if (this._seqHintUsed) return;
        this._seqHintUsed = true;
        // Автоматически ставим первый элемент на место
        const firstIdx = this._seqCorrect[0];
        const btn = document.querySelector(`.tst-seq-item[data-idx="${firstIdx}"]`);
        if (btn && !btn.disabled) {
            this._onSeqPick(btn);
        }
        // Прячем кнопку подсказки
        const hintBtn = document.getElementById('tst-seq-hint');
        if (hintBtn) {
            hintBtn.disabled = true;
            hintBtn.textContent = '💡 Использована';
            hintBtn.classList.add('tst-hint-used');
        }
    },

    _onSeqPick(btn) {
        const idx = parseInt(btn.dataset.idx);
        const pos = this._seqOrder.length; // текущая позиция
        this._seqOrder.push(idx);
        btn.classList.add('used');
        btn.disabled = true;
        this._playTick();

        // Заполняем пронумерованный слот
        const slotEl = document.getElementById(`tst-seq-slot-${pos}`);
        if (slotEl) {
            slotEl.innerHTML = this._seqItems[idx];
            slotEl.classList.add('filled');
            slotEl.dataset.idx = idx;
            slotEl.onclick = () => {
                // Удалить этот и все последующие
                const removeFrom = this._seqOrder.indexOf(idx);
                if (removeFrom === -1) return;
                const removed = this._seqOrder.splice(removeFrom);
                removed.forEach(rIdx => {
                    const rBtn = document.querySelector(`.tst-seq-item[data-idx="${rIdx}"]`);
                    if (rBtn) { rBtn.classList.remove('used'); rBtn.disabled = false; }
                });
                // Очищаем слоты начиная с removeFrom
                for (let i = removeFrom; i < this._seqCorrect.length; i++) {
                    const s = document.getElementById(`tst-seq-slot-${i}`);
                    if (s) {
                        s.innerHTML = `<span class="tst-seq-slot-num">${i + 1}</span>`;
                        s.classList.remove('filled');
                        s.onclick = null;
                    }
                }
                document.getElementById('tst-seq-check').classList.toggle('hidden', this._seqOrder.length < this._seqCorrect.length);
            };
        }

        document.getElementById('tst-seq-check').classList.toggle('hidden', this._seqOrder.length < this._seqCorrect.length);
    },

    _onSeqCheck(t0, block, id) {
        const time = (Date.now() - t0) / 1000;
        let correctCount = 0;
        for (let i = 0; i < this._seqCorrect.length; i++) {
            if (this._seqOrder[i] === this._seqCorrect[i]) correctCount++;
        }
        const ok = correctCount === this._seqCorrect.length;
        let score = correctCount / this._seqCorrect.length;
        // Штраф за подсказку: −25% от итогового балла
        if (this._seqHintUsed) score = Math.max(0, score * 0.75);
        this._taskResults[block].push({
            id, result: ok ? 'correct' : (score >= 0.5 ? 'partial' : 'incorrect'),
            score: Math.round(score * 100) / 100, time_sec: Math.round(time * 10) / 10,
            hint_used: this._seqHintUsed
        });
        // При неправильном ответе — показываем правильный порядок
        if (!ok) {
            const slots = document.getElementById('tst-seq-slots');
            if (slots) {
                for (let i = 0; i < this._seqCorrect.length; i++) {
                    const s = document.getElementById(`tst-seq-slot-${i}`);
                    if (s) {
                        const isRight = this._seqOrder[i] === this._seqCorrect[i];
                        s.classList.add(isRight ? 'tst-seq-slot-ok' : 'tst-seq-slot-wrong');
                    }
                }
            }
        }
        this._showFeedback(ok, () => this._next(), ok ? null : () => {
            // Показываем правильный порядок под слотами
            const slots = document.getElementById('tst-seq-slots');
            if (slots) {
                const answer = document.createElement('div');
                answer.className = 'tst-seq-answer';
                answer.innerHTML = '<span class="tst-seq-answer-label">Правильно: </span>' +
                    this._seqCorrect.map(idx => this._seqItems[idx]).join(' → ');
                slots.parentNode.insertBefore(answer, slots.nextSibling);
            }
        });
    },

    // =============================================
    // TASKS — SPEECH
    // =============================================

    _taskVocabulary(task) {
        const el = document.getElementById('testing-content');
        const t0 = Date.now();
        const s = task.set;
        const shuffledOpts = this._shuffle([...s.options]);
        const typeLabel = s.type === 'antonym' ? '' : s.type === 'define' ? 'Что это значит?' : 'Что это?';

        el.innerHTML = `
            
            <div class="tst-task">
                <div class="tst-instruction">${typeLabel || 'Как назвать одним словом?'}</div>
                <div class="tst-vocab-img">${s.img}</div>
                <div class="tst-options tst-options-vertical">
                    ${shuffledOpts.map(o => `<button class="tst-opt-btn tst-opt-wide" data-val="${o}" onclick="Testing._onVocabAnswer('${o.replace(/'/g,"\\'")}','${s.correct.replace(/'/g,"\\'")}',${t0},'${task.block}','${task.id}')">${o}</button>`).join('')}
                </div>
            </div>`;
    },

    _onVocabAnswer(selected, correct, t0, block, id) {
        const time = (Date.now() - t0) / 1000;
        const ok = selected === correct;
        this._record(block, id, ok, time);
        this._checkAndNext(ok, '.tst-opt-btn', 'val', correct);
    },

    _taskGrammar(task) {
        const el = document.getElementById('testing-content');
        const t0 = Date.now();
        const s = task.set;
        const shuffledOpts = this._shuffle([...s.options]);

        el.innerHTML = `
            
            <div class="tst-task">
                <div class="tst-instruction">Как правильно?</div>
                <div class="tst-grammar-q">${s.q}</div>
                <div class="tst-options tst-options-vertical">
                    ${shuffledOpts.map(o => `<button class="tst-opt-btn tst-opt-wide" data-val="${o}" onclick="Testing._onVocabAnswer('${o.replace(/'/g,"\\'")}','${s.correct.replace(/'/g,"\\'")}',${t0},'${task.block}','${task.id}')">${o}</button>`).join('')}
                </div>
            </div>`;
    },

    // =============================================
    // TASKS — VOICE RECORDING
    // =============================================

    // ── Unique test prefix for audio storage ──
    _audioPrefix() {
        return `audio_${this._session.date.slice(0,19).replace(/[^0-9]/g,'')}`;
    },

    // ── Record Word ──
    _taskRecordWord(task) {
        if (!VoiceRecorder.isSupported()) {
            // Пропускаем если нет поддержки — не влияет на скоринг
            this._taskResults.speech.push({
                id: task.id, result: 'voice_skipped', score: -1,
                time_sec: 0, details: { skipped: 'no_mic_support', type: 'voice' }
            });
            this._next();
            return;
        }
        const el = document.getElementById('testing-content');
        const t0 = Date.now();

        el.innerHTML = `
            <div class="tst-task tst-rec-task">
                <div class="tst-instruction">🎤 Скажи вслух:</div>
                <div class="tst-rec-emoji">${task.emoji}</div>
                <div class="tst-rec-word">${task.word}</div>
                <div class="tst-rec-area" id="tst-rec-area">
                    <div class="tst-rec-status" id="tst-rec-status">Нажми для записи</div>
                    <button class="tst-rec-btn" id="tst-rec-start" onclick="Testing._toggleRecording('${task.id}', ${task.maxSec})">
                        <span class="tst-rec-circle"></span>
                    </button>
                    <div class="tst-rec-level" id="tst-rec-level"><div id="tst-rec-level-bar"></div></div>
                    <div class="tst-rec-timer" id="tst-rec-timer"></div>
                </div>
                <div class="tst-rec-controls hidden" id="tst-rec-controls">
                    <button class="tst-rec-play-btn" id="tst-rec-play" onclick="Testing._playRecording()">▶ Послушать</button>
                    <button class="tst-rec-redo-btn" onclick="Testing._toggleRecording('${task.id}', ${task.maxSec})">🔄 Заново</button>
                    <button class="tst-rec-next-btn" onclick="Testing._submitRecording('${task.id}', '${task.word}', ${t0})">Дальше →</button>
                </div>
                <button class="tst-rec-skip" onclick="Testing._skipRecording('${task.id}', ${t0})">Пропустить запись</button>
            </div>`;
    },

    // ── Record Describe (опиши картинку) ──
    _taskRecordDescribe(task) {
        if (!VoiceRecorder.isSupported()) {
            this._taskResults.speech.push({
                id: task.id, result: 'voice_skipped', score: -1,
                time_sec: 0, details: { skipped: 'no_mic_support', type: 'voice' }
            });
            this._next();
            return;
        }
        const el = document.getElementById('testing-content');
        const t0 = Date.now();

        el.innerHTML = `
            <div class="tst-task tst-rec-task">
                <div class="tst-instruction">🎤 Расскажи, что видишь:</div>
                <div class="tst-rec-scene">${task.emoji}</div>
                <div class="tst-rec-prompt">${task.prompt}</div>
                <div class="tst-rec-area" id="tst-rec-area">
                    <div class="tst-rec-status" id="tst-rec-status">Нажми и расскажи</div>
                    <button class="tst-rec-btn" id="tst-rec-start" onclick="Testing._toggleRecording('${task.id}', ${task.maxSec})">
                        <span class="tst-rec-circle"></span>
                    </button>
                    <div class="tst-rec-level" id="tst-rec-level"><div id="tst-rec-level-bar"></div></div>
                    <div class="tst-rec-timer" id="tst-rec-timer"></div>
                </div>
                <div class="tst-rec-controls hidden" id="tst-rec-controls">
                    <button class="tst-rec-play-btn" id="tst-rec-play" onclick="Testing._playRecording()">▶ Послушать</button>
                    <button class="tst-rec-redo-btn" onclick="Testing._toggleRecording('${task.id}', ${task.maxSec})">🔄 Заново</button>
                    <button class="tst-rec-next-btn" onclick="Testing._submitRecording('${task.id}', 'describe', ${t0})">Дальше →</button>
                </div>
                <button class="tst-rec-skip" onclick="Testing._skipRecording('${task.id}', ${t0})">Пропустить запись</button>
            </div>`;
    },

    // ── Recording controls ──
    _recBlob: null,
    _recAudio: null,
    _recTimer: null,
    _isRecording: false,

    _toggleRecording(taskId, maxSec) {
        if (this._isRecording) {
            this._stopRecording();
        } else {
            this._startRecording(taskId, maxSec);
        }
    },

    async _startRecording(taskId, maxSec) {
        const statusEl = document.getElementById('tst-rec-status');
        const timerEl = document.getElementById('tst-rec-timer');
        const controlsEl = document.getElementById('tst-rec-controls');
        const btnEl = document.getElementById('tst-rec-start');
        const levelEl = document.getElementById('tst-rec-level');

        // Останавливаем предыдущее
        if (this._recTimer) { clearInterval(this._recTimer); this._recTimer = null; }
        if (this._recAudio) { this._recAudio.pause(); this._recAudio = null; }
        VoiceRecorder.stopRecording();

        // Запрашиваем микрофон
        statusEl.textContent = 'Доступ к микрофону...';
        const ok = await VoiceRecorder.requestMic();
        if (!ok) {
            statusEl.textContent = '❌ Нет доступа к микрофону';
            setTimeout(() => {
                this._record('speech', taskId, true, 0, { skipped: 'mic_denied' });
                this._next();
            }, 1500);
            return;
        }

        // Стартуем запись
        controlsEl.classList.add('hidden');
        btnEl.classList.add('tst-rec-recording');
        levelEl.style.display = '';
        statusEl.textContent = '● Запись...';

        VoiceRecorder.startRecording((level) => {
            const bar = document.getElementById('tst-rec-level-bar');
            if (bar) bar.style.width = Math.min(level * 100, 100) + '%';
        });
        this._isRecording = true;

        // Таймер
        let sec = 0;
        timerEl.textContent = `0:00 / 0:${String(maxSec).padStart(2,'0')}`;
        this._recTimer = setInterval(async () => {
            sec++;
            timerEl.textContent = `0:${String(sec).padStart(2,'0')} / 0:${String(maxSec).padStart(2,'0')}`;
            if (sec >= maxSec) {
                await this._stopRecording();
            }
        }, 1000);
    },

    async _stopRecording() {
        if (this._recTimer) { clearInterval(this._recTimer); this._recTimer = null; }
        this._isRecording = false;
        const blob = await VoiceRecorder.stopRecording();
        VoiceRecorder.releaseMic();

        this._recBlob = blob;

        const btnEl = document.getElementById('tst-rec-start');
        const statusEl = document.getElementById('tst-rec-status');
        const controlsEl = document.getElementById('tst-rec-controls');
        const levelEl = document.getElementById('tst-rec-level');

        if (btnEl) btnEl.classList.remove('tst-rec-recording');
        if (levelEl) levelEl.style.display = 'none';
        if (statusEl) statusEl.textContent = '✅ Записано!';
        if (controlsEl) controlsEl.classList.remove('hidden');
    },

    _playRecording() {
        if (!this._recBlob) return;
        if (this._recAudio) { this._recAudio.pause(); }
        this._recAudio = new Audio(VoiceRecorder.createURL(this._recBlob));
        this._recAudio.play().catch(() => {});
    },

    async _submitRecording(taskId, label, t0) {
        if (this._recAudio) { this._recAudio.pause(); this._recAudio = null; }
        // Сохраняем в IndexedDB
        if (this._recBlob) {
            const audioId = `${this._audioPrefix()}_${taskId}`;
            try {
                await VoiceRecorder.save(audioId, this._recBlob, { word: label, taskId });
            } catch(e) { console.warn('Audio save failed:', e); }
        }
        // Записываем как voice_task — НЕ влияет на автоматический скоринг
        this._taskResults.speech.push({
            id: taskId,
            result: 'voice',
            score: -1, // sentinel: исключить из подсчёта
            time_sec: Math.round((Date.now() - t0) / 1000 * 10) / 10,
            details: { recorded: !!this._recBlob, word: label, type: 'voice' }
        });
        this._recBlob = null;
        this._isRecording = false;
        VoiceRecorder.releaseMic();
        this._next();
    },

    _skipRecording(taskId, t0) {
        if (this._recTimer) { clearInterval(this._recTimer); this._recTimer = null; }
        if (this._recAudio) { this._recAudio.pause(); this._recAudio = null; }
        this._isRecording = false;
        VoiceRecorder.stopRecording();
        VoiceRecorder.releaseMic();
        this._taskResults.speech.push({
            id: taskId,
            result: 'voice_skipped',
            score: -1,
            time_sec: Math.round((Date.now() - t0) / 1000 * 10) / 10,
            details: { skipped: 'user', type: 'voice' }
        });
        this._recBlob = null;
        this._next();
    },

    // ── Coins (drag speed + accuracy) ──
    _taskCoins(task) {
        const el = document.getElementById('testing-content');
        const t0 = Date.now();
        const cfg = (TESTING_TASKS.motor && TESTING_TASKS.motor.coinSizes && TESTING_TASKS.motor.coinSizes[task.age]) || { coin: 50, target: 90 };
        const coinCount = 6;

        el.innerHTML = `
            
            <div class="tst-task">
                <div class="tst-instruction">Перетащи все монетки в копилку!</div>
                <div class="tst-coins-area" id="tst-coins-area">
                    <div class="tst-piggy" id="tst-piggy" style="width:${cfg.target}px;height:${cfg.target}px;">🐷</div>
                </div>
            </div>`;

        const area = document.getElementById('tst-coins-area');
        this._coinsLeft = coinCount;
        this._coinsT0 = Date.now();
        this._coinsMisses = 0;
        this._coinsTask = task;

        // Размещаем монеты случайно
        setTimeout(() => {
            const aRect = area.getBoundingClientRect();
            for (let i = 0; i < coinCount; i++) {
                const coin = document.createElement('div');
                coin.className = 'tst-coin';
                coin.textContent = '🪙';
                coin.style.width = cfg.coin + 'px';
                coin.style.height = cfg.coin + 'px';
                coin.style.fontSize = (cfg.coin * 0.6) + 'px';
                // Random position avoiding piggy center
                let x, y;
                do {
                    x = Math.random() * (aRect.width - cfg.coin);
                    y = Math.random() * (aRect.height - cfg.coin);
                } while (Math.abs(x - aRect.width / 2) < cfg.target && Math.abs(y - aRect.height / 2) < cfg.target);
                coin.style.left = x + 'px';
                coin.style.top = y + 'px';
                this._makeDraggable(coin, cfg);
                area.appendChild(coin);
            }
        }, 100);
    },

    _makeDraggable(coin, cfg) {
        let startX, startY, origLeft, origTop;
        const onStart = (e) => {
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX;
            startY = touch.clientY;
            origLeft = parseFloat(coin.style.left);
            origTop = parseFloat(coin.style.top);
            coin.style.zIndex = 10;
            coin.style.transform = 'scale(1.15)';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        };
        const onMove = (e) => {
            e.preventDefault();
            const touch = e.touches ? e.touches[0] : e;
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            // Constrain to area bounds
            const area = document.getElementById('tst-coins-area');
            if (area) {
                const aRect = area.getBoundingClientRect();
                const cw = parseFloat(coin.style.width) || 50;
                const ch = parseFloat(coin.style.height) || 50;
                const newLeft = Math.max(0, Math.min(aRect.width - cw, origLeft + dx));
                const newTop = Math.max(0, Math.min(aRect.height - ch, origTop + dy));
                coin.style.left = newLeft + 'px';
                coin.style.top = newTop + 'px';
            } else {
                coin.style.left = (origLeft + dx) + 'px';
                coin.style.top = (origTop + dy) + 'px';
            }
        };
        const onEnd = (e) => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            coin.style.zIndex = '';
            coin.style.transform = '';

            // Проверяем попадание в копилку
            const piggy = document.getElementById('tst-piggy');
            if (piggy) {
                const pRect = piggy.getBoundingClientRect();
                const cRect = coin.getBoundingClientRect();
                const cx = cRect.left + cRect.width / 2;
                const cy = cRect.top + cRect.height / 2;
                if (cx >= pRect.left && cx <= pRect.right && cy >= pRect.top && cy <= pRect.bottom) {
                    Testing._playTick();
                    coin.style.transition = 'transform 0.2s, opacity 0.2s';
                    coin.style.transform = 'scale(0)';
                    coin.style.opacity = '0';
                    setTimeout(() => coin.remove(), 200);
                    Testing._coinsLeft--;
                    if (Testing._coinsLeft <= 0) {
                        const time = (Date.now() - Testing._coinsT0) / 1000;
                        const timeLimits = { '3-4': 20, '4-5': 15, '5-6': 12, '6-7': 10 };
                        const limit = timeLimits[Testing._coinsTask.age] || 15;
                        const ok = time <= limit * 1.5; // даём полтора норматива
                        const score = Math.max(0, Math.min(1, 1 - (time - limit) / (limit * 2)));
                        Testing._taskResults.motor.push({
                            id: Testing._coinsTask.id,
                            result: ok ? 'correct' : 'partial',
                            score: Math.round(score * 100) / 100,
                            time_sec: Math.round(time * 10) / 10,
                            details: { misses: Testing._coinsMisses }
                        });
                        Testing._showFeedback(ok, () => Testing._next());
                    }
                    return;
                }
            }
            Testing._coinsMisses++;
        };
        coin.addEventListener('mousedown', onStart);
        coin.addEventListener('touchstart', onStart, { passive: false });
    },

    // ── Dots (copy pattern) ──
    _taskDots(task) {
        const el = document.getElementById('testing-content');
        const t0 = Date.now();
        const pool = (TESTING_TASKS.motor && TESTING_TASKS.motor.dots && TESTING_TASKS.motor.dots[task.age]) || TESTING_TASKS.motor.dots['4-5'];
        const cfg = pool[this._rand(0, pool.length - 1)];
        this._dotsTarget = new Set(cfg.dots.map(d => d[0]+','+d[1]));
        this._dotsPlaced = new Set();
        this._dotsSize = cfg.size;
        this._dotsT0 = t0;
        this._dotsTask = task;

        const cellSize = Math.min(56, Math.floor(240 / cfg.size));

        el.innerHTML = `
            
            <div class="tst-task">
                <div class="tst-instruction">Поставь точки как на образце!</div>
                <div class="tst-dots-wrap">
                    <div class="tst-dots-panel">
                        <div class="tst-dots-label">Образец</div>
                        <div class="tst-dots-grid" style="grid-template-columns:repeat(${cfg.size},${cellSize}px)">
                            ${this._renderDotsGrid(cfg.size, cfg.dots, cellSize, false)}
                        </div>
                    </div>
                    <div class="tst-dots-panel">
                        <div class="tst-dots-label">Твой ответ</div>
                        <div class="tst-dots-grid" style="grid-template-columns:repeat(${cfg.size},${cellSize}px)" id="tst-dots-answer">
                            ${this._renderDotsGrid(cfg.size, [], cellSize, true)}
                        </div>
                    </div>
                </div>
                <button class="tst-check-btn" id="tst-dots-check" onclick="Testing._onDotsCheck()">Проверить ✓</button>
            </div>`;
    },

    _renderDotsGrid(size, dots, cellSize, interactive) {
        const dotSet = new Set(dots.map(d => d[0]+','+d[1]));
        let html = '';
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const hasDot = dotSet.has(x+','+y);
                if (interactive) {
                    html += `<div class="tst-dot-cell" style="width:${cellSize}px;height:${cellSize}px" data-x="${x}" data-y="${y}" onclick="Testing._toggleDot(this)">
                        <span class="tst-dot-mark"></span></div>`;
                } else {
                    html += `<div class="tst-dot-cell tst-dot-sample" style="width:${cellSize}px;height:${cellSize}px">
                        ${hasDot ? '<span class="tst-dot-mark active"></span>' : '<span class="tst-dot-mark"></span>'}</div>`;
                }
            }
        }
        return html;
    },

    _toggleDot(cell) {
        this._playTick();
        const x = cell.dataset.x, y = cell.dataset.y;
        const key = x+','+y;
        const mark = cell.querySelector('.tst-dot-mark');
        if (this._dotsPlaced.has(key)) {
            this._dotsPlaced.delete(key);
            mark.classList.remove('active');
        } else {
            this._dotsPlaced.add(key);
            mark.classList.add('active');
        }
    },

    _onDotsCheck() {
        const time = (Date.now() - this._dotsT0) / 1000;
        let correct = 0;
        for (const key of this._dotsTarget) {
            if (this._dotsPlaced.has(key)) correct++;
        }
        // Штраф за лишние точки
        let extra = 0;
        for (const key of this._dotsPlaced) {
            if (!this._dotsTarget.has(key)) extra++;
        }
        const score = Math.max(0, (correct - extra * 0.5) / this._dotsTarget.size);
        const ok = score >= 0.7;
        this._taskResults.motor.push({
            id: this._dotsTask.id,
            result: ok ? 'correct' : (score >= 0.4 ? 'partial' : 'incorrect'),
            score: Math.round(score * 100) / 100,
            time_sec: Math.round(time * 10) / 10,
            details: { correct, extra, total: this._dotsTarget.size }
        });
        this._showFeedback(ok, () => this._next());
    },


    // =============================================
    // MOTOR — TRACE (обведи фигуру)
    // =============================================
    _taskTrace(task) {
        const el = document.getElementById('testing-content');
        const shapes = {
            '3-4': [{ name: 'круг',      path: 'M 150,50 A 100,100 0 1,1 149.9,50 Z' }],
            '4-5': [{ name: 'треугольник', path: 'M 150,30 L 270,230 L 30,230 Z' }],
            '5-6': [{ name: 'звезду',    path: 'M 150,20 L 180,100 L 270,100 L 200,155 L 225,240 L 150,190 L 75,240 L 100,155 L 30,100 L 120,100 Z' }],
            '6-7': [{ name: 'звезду',    path: 'M 150,20 L 180,100 L 270,100 L 200,155 L 225,240 L 150,190 L 75,240 L 100,155 L 30,100 L 120,100 Z' }],
        };
        const shapeList = shapes[task.age] || shapes['4-5'];
        const shape = shapeList[0];

        el.innerHTML = `
            <div class="tst-task">
                <div class="tst-instruction">Обведи ${shape.name} пальцем точно по линии!</div>
                <div style="position:relative;display:flex;justify-content:center;">
                    <svg id="tst-trace-svg" width="300" height="300" viewBox="0 0 300 300" style="touch-action:none;cursor:crosshair;">
                        <!-- Guide path -->
                        <path d="${shape.path}" fill="none" stroke="#a78bfa44" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
                        <!-- Shape outline -->
                        <path d="${shape.path}" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6,4"/>
                        <!-- User drawing -->
                        <path id="tst-trace-user" fill="none" stroke="#22c55e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div id="tst-trace-msg" style="text-align:center;min-height:28px;font-size:15px;color:#94a3b8;margin-top:4px;">Веди пальцем по пунктиру</div>
                <button class="tst-check-btn" id="tst-trace-check" onclick="Testing._onTraceCheck()" style="display:none">Готово ✓</button>
            </div>`;

        const svg = document.getElementById('tst-trace-svg');
        const userPath = document.getElementById('tst-trace-user');
        let drawing = false;
        let points = [];
        this._tracePoints = [];
        this._traceShapePath = shape.path;
        this._traceTask = task;
        this._traceT0 = Date.now();

        const getXY = (e) => {
            const rect = svg.getBoundingClientRect();
            const src = e.touches ? e.touches[0] : e;
            return {
                x: (src.clientX - rect.left) / rect.width * 300,
                y: (src.clientY - rect.top) / rect.height * 300
            };
        };

        svg.addEventListener('mousedown', (e) => { drawing = true; points = [getXY(e)]; });
        svg.addEventListener('touchstart', (e) => { e.preventDefault(); drawing = true; points = [getXY(e)]; }, { passive: false });
        svg.addEventListener('mousemove', (e) => {
            if (!drawing) return;
            points.push(getXY(e));
            userPath.setAttribute('d', 'M' + points.map(p => p.x+','+p.y).join(' L'));
        });
        svg.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!drawing) return;
            points.push(getXY(e));
            userPath.setAttribute('d', 'M' + points.map(p => p.x+','+p.y).join(' L'));
        }, { passive: false });
        const endDraw = () => {
            if (!drawing) return;
            drawing = false;
            Testing._tracePoints = points;
            if (points.length > 10) {
                document.getElementById('tst-trace-check').style.display = '';
                document.getElementById('tst-trace-msg').textContent = 'Нажми «Готово» когда закончишь';
            }
        };
        svg.addEventListener('mouseup', endDraw);
        svg.addEventListener('touchend', endDraw);
    },

    // Sample N evenly-spaced points along a polyline path string
    _samplePathPoints(pathStr, n) {
        // Parse M x,y L x,y ... or M x,y A ... Z (circle) into segments
        const pts = [];
        // For circle: M cx,cy A rx,ry → sample around circle
        const circleMatch = pathStr.match(/M\s*([\d.]+),([\d.]+)\s*A\s*([\d.]+),([\d.]+)/);
        if (circleMatch) {
            const cx = 150, cy = 150, r = 100;
            for (let i = 0; i < n; i++) {
                const angle = (2 * Math.PI * i) / n;
                pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
            }
            return pts;
        }
        // For polyline: extract all coordinates
        const coords = [];
        const re = /[ML]\s*([\d.]+),([\d.]+)/g;
        let m;
        while ((m = re.exec(pathStr)) !== null) coords.push({ x: +m[1], y: +m[2] });
        if (coords.length < 2) return coords;
        // Compute total length
        let totalLen = 0;
        const segs = [];
        for (let i = 1; i < coords.length; i++) {
            const dx = coords[i].x - coords[i-1].x, dy = coords[i].y - coords[i-1].y;
            const len = Math.sqrt(dx*dx + dy*dy);
            segs.push({ from: coords[i-1], to: coords[i], len });
            totalLen += len;
        }
        // Sample evenly
        const step = totalLen / (n - 1);
        let dist = 0, si = 0;
        pts.push(coords[0]);
        for (let i = 1; i < n - 1; i++) {
            let target = step * i;
            while (si < segs.length - 1 && dist + segs[si].len < target) { dist += segs[si].len; si++; }
            const seg = segs[si];
            const t = seg.len > 0 ? (target - dist) / seg.len : 0;
            pts.push({ x: seg.from.x + t * (seg.to.x - seg.from.x), y: seg.from.y + t * (seg.to.y - seg.from.y) });
        }
        pts.push(coords[coords.length - 1]);
        return pts;
    },

    _onTraceCheck() {
        const points = this._tracePoints || [];
        const time = (Date.now() - this._traceT0) / 1000;

        if (points.length < 8) {
            this._taskResults.motor.push({ id: this._traceTask.id, result: 'incorrect', score: 0, time_sec: time });
            this._showFeedback(false, () => this._next());
            return;
        }

        // Sample guide path into 60 reference points
        const guidePts = this._samplePathPoints(this._traceShapePath, 60);
        const THRESHOLD = 28; // px — max allowed distance from path

        // 1) Accuracy: what fraction of user strokes are within threshold of the guide
        let nearCount = 0;
        for (const p of points) {
            const nearest = guidePts.reduce((best, gp) => {
                const d = Math.sqrt((p.x - gp.x)**2 + (p.y - gp.y)**2);
                return d < best ? d : best;
            }, Infinity);
            if (nearest <= THRESHOLD) nearCount++;
        }
        const accuracy = nearCount / points.length;

        // 2) Coverage: what fraction of guide points have at least one user point nearby
        let coveredCount = 0;
        for (const gp of guidePts) {
            const covered = points.some(p => Math.sqrt((p.x - gp.x)**2 + (p.y - gp.y)**2) <= THRESHOLD * 1.5);
            if (covered) coveredCount++;
        }
        const coverage = coveredCount / guidePts.length;

        // Combined score: accuracy weighted 40%, coverage 60%
        const score = Math.min(1, accuracy * 0.4 + coverage * 0.6);
        const ok = score >= 0.55;

        this._taskResults.motor.push({
            id: this._traceTask.id,
            result: ok ? 'correct' : (score >= 0.35 ? 'partial' : 'incorrect'),
            score: Math.round(score * 100) / 100,
            time_sec: Math.round(time * 10) / 10,
            details: { accuracy: Math.round(accuracy * 100), coverage: Math.round(coverage * 100) }
        });
        this._showFeedback(ok, () => this._next());
    },

    // =============================================
    // MOTOR — RHYTHM (повтори ритм)
    // =============================================
    // Rhythm patterns: arrays of beat counts separated by pauses
    // Each sub-array = group of beats, pause between groups
    _rhythmPatterns: {
        '3-4': [ [[1],[1]],           [[1,1],[1]]          ],  // два удара — пауза — один
        '4-5': [ [[1,1],[1,1]],       [[1],[1,1],[1]]      ],  // два-два  /  один-два-один
        '5-6': [ [[1,1,1],[1,1]],     [[1],[1],[1,1,1]]    ],  // три-два  /  один-один-три
        '6-7': [ [[1,1],[1],[1,1,1]], [[1,1,1],[1],[1,1]]  ],  // два-один-три  /  три-один-два
    },

    _taskRhythm(task) {
        const el = document.getElementById('testing-content');
        const pool = this._rhythmPatterns[task.age] || this._rhythmPatterns['4-5'];
        const groups = pool[this._rand(0, pool.length - 1)]; // [[1,1],[1]] = 2 удара, пауза, 1 удар
        const totalBeats = groups.reduce((s, g) => s + g.length, 0);

        this._rhythmGroups  = groups;
        this._rhythmTotal   = totalBeats;
        this._rhythmInput   = [];   // записываем {time, groupIdx}
        this._rhythmTask    = task;
        this._rhythmT0      = 0;
        this._rhythmPhase   = 'watch';
        this._rhythmGapTimer = null;
        this._rhythmCurGroup = 0;
        this._rhythmGroupCount = 0;

        // Build slot display with stable data-group attributes
        const slotsHTML = groups.map((g, gi) =>
            `<div class="rhy-group" data-group="${gi}">
                ${g.map((_, si) => `<div class="rhy-slot" data-group="${gi}" data-slot="${si}"></div>`).join('')}
            </div>`
        ).join('<div class="rhy-pause-gap"></div>');

        el.innerHTML = `
            <div class="tst-task">
                <div class="tst-instruction">Послушай и повтори хлопки!</div>

                <div id="rhy-drum-wrap">
                    <div id="rhy-drum">🥁</div>
                    <div id="rhy-drum-label">Слушай...</div>
                </div>

                <div class="rhy-slots-row" id="rhy-slots">${slotsHTML}</div>

                <button class="tst-rhythm-btn" id="rhy-tap-btn"
                    onclick="Testing._onRhythmTap()"
                    style="display:none">
                    👏 Хлоп!
                </button>
                <div id="rhy-hint" style="text-align:center;font-size:13px;color:#94a3b8;min-height:18px;margin-top:4px;"></div>
            </div>`;

        // ── Фаза 1: воспроизводим ритм ──
        this._rhythmPlay(groups, () => {
            // После воспроизведения — переключаем в режим повтора
            Testing._rhythmPhase = 'repeat';
            Testing._rhythmT0 = Date.now();
            Testing._rhythmCurGroup = 0;
            Testing._rhythmGroupCount = 0;

            const drum = document.getElementById('rhy-drum');
            const label = document.getElementById('rhy-drum-label');
            const btn = document.getElementById('rhy-tap-btn');
            if (drum)  drum.style.opacity = '0.4';
            if (label) label.textContent = 'Теперь хлопай!';
            if (btn)   btn.style.display = 'block';
            document.getElementById('rhy-hint').textContent =
                'Хлопай столько же раз, делай паузу между группами';
        });
    },

    _rhythmPlay(groups, onDone) {
        const drum = document.getElementById('rhy-drum');
        const label = document.getElementById('rhy-drum-label');
        const beatMs = 450;
        const pauseMs = 800;
        let queue = []; // [{type:'beat'},{type:'pause'}...]
        groups.forEach((g, gi) => {
            g.forEach(() => queue.push({ type: 'beat' }));
            if (gi < groups.length - 1) queue.push({ type: 'pause' });
        });

        let qi = 0;
        const next = () => {
            if (qi >= queue.length) { setTimeout(onDone, 400); return; }
            const item = queue[qi++];
            if (item.type === 'beat') {
                Testing._playTick();
                if (drum) {
                    drum.style.transform = 'scale(1.4)';
                    drum.style.filter = 'drop-shadow(0 0 12px #f97316)';
                    setTimeout(() => {
                        if (drum) { drum.style.transform = ''; drum.style.filter = ''; }
                    }, 180);
                }
                setTimeout(next, beatMs);
            } else {
                if (label) label.textContent = '...пауза...';
                setTimeout(() => {
                    if (label) label.textContent = 'Слушай...';
                    setTimeout(next, 100);
                }, pauseMs - 100);
            }
        };
        setTimeout(next, 300);
    },

    _onRhythmTap() {
        if (this._rhythmPhase !== 'repeat') return;

        const gi = this._rhythmCurGroup;
        if (gi >= this._rhythmGroups.length) return; // guard

        const groupSize = this._rhythmGroups[gi].length;

        // Ignore extra taps beyond group size (don't overflow into next group)
        if (this._rhythmGroupCount >= groupSize) return;

        this._playTick();
        const si = this._rhythmGroupCount;
        this._rhythmGroupCount++;
        this._rhythmInput.push({ time: Date.now() - this._rhythmT0, group: gi });

        // Fill slot using data attributes — no nth-child fragility
        const slot = document.querySelector(`.rhy-slot[data-group="${gi}"][data-slot="${si}"]`);
        if (slot) { slot.classList.add('filled'); slot.textContent = '👏'; }

        if (this._rhythmGroupCount >= groupSize) {
            // Group complete — lock this group and wait for pause before next
            this._rhythmGroupCount = 0;
            const nextGi = gi + 1;

            if (nextGi >= this._rhythmGroups.length) {
                // All groups done
                this._rhythmPhase = 'done';
                document.getElementById('rhy-tap-btn').style.display = 'none';
                const hint = document.getElementById('rhy-hint');
                if (hint) hint.textContent = '✅ Готово!';
                setTimeout(() => Testing._onRhythmCheck(), 500);
            } else {
                // Pause between groups — button disabled briefly, then re-enable for next group
                const btn = document.getElementById('rhy-tap-btn');
                const hint = document.getElementById('rhy-hint');
                if (btn) btn.disabled = true;
                if (hint) hint.textContent = '⏸ Пауза...';
                setTimeout(() => {
                    if (Testing._rhythmPhase !== 'repeat') return;
                    Testing._rhythmCurGroup = nextGi;
                    Testing._rhythmGroupCount = 0;
                    if (btn) btn.disabled = false;
                    if (hint) hint.textContent = nextGi < Testing._rhythmGroups.length - 1
                        ? 'Следующая группа!'
                        : 'Последняя группа!';
                }, 700);
            }
        }
    },

    _onRhythmCheck() {
        const time = (Date.now() - this._rhythmT0) / 1000;
        const input = this._rhythmInput;
        const groups = this._rhythmGroups;

        // Score: compare beats per group
        let correct = 0, total = 0;
        groups.forEach((g, gi) => {
            const got = input.filter(x => x.group === gi).length;
            const expected = g.length;
            total++;
            if (got === expected) correct++;
        });

        const score = correct / total;
        const ok = score >= 0.6;
        this._taskResults.motor.push({
            id: this._rhythmTask.id,
            result: ok ? 'correct' : (score >= 0.4 ? 'partial' : 'incorrect'),
            score: Math.round(score * 100) / 100,
            time_sec: Math.round(time * 10) / 10,
            details: { groups_correct: correct, groups_total: total }
        });
        this._rhythmPhase = 'done';
        this._showFeedback(ok, () => this._next());
    },

    // =============================================
    // MOTOR — MAZE (проведи по лабиринту)
    // =============================================
    _taskMaze(task) {
        const el = document.getElementById('testing-content');
        // Simple SVG maze paths for different ages
        const mazes = {
            '3-4': { path: 'M 20,150 L 280,150', wall1: 'M 20,130 L 280,130', wall2: 'M 20,170 L 280,170', label: 'широкий' },
            '4-5': { path: 'M 20,150 Q 150,80 280,150', wall1: 'M 20,130 Q 150,60 280,130', wall2: 'M 20,170 Q 150,100 280,170', label: 'волнистый' },
            '5-6': { path: 'M 20,150 L 100,80 L 200,150 L 280,80', wall1: 'M 20,130 L 100,60 L 200,130 L 280,60', wall2: 'M 20,170 L 100,100 L 200,170 L 280,100', label: 'зигзаг' },
            '6-7': { path: 'M 20,200 L 80,150 L 80,80 L 220,80 L 220,150 L 280,100', wall1: 'M 20,220 L 60,175 L 60,60 L 240,60 L 240,170 L 300,120', wall2: 'M 20,180 L 100,125 L 100,100 L 200,100 L 200,130 L 260,80', label: 'сложный' },
        };
        const maze = mazes[task.age] || mazes['4-5'];
        this._mazeTask = task;
        this._mazeT0 = Date.now();
        this._mazePassed = false;
        this._mazeHits = 0;

        const finishCY = task.age === '6-7' ? 100 : 150;

        const renderMaze = () => {
            el.innerHTML = `
            <div class="tst-task">
                <div class="tst-instruction">Проведи шарик через лабиринт!</div>
                <div style="position:relative;display:flex;justify-content:center;">
                    <svg id="tst-maze-svg" width="300" height="300" viewBox="0 0 300 300" style="touch-action:none;background:var(--card);border-radius:16px;">
                        <path d="${maze.wall1}" fill="none" stroke="#ef4444" stroke-width="2" opacity="0.4"/>
                        <path d="${maze.wall2}" fill="none" stroke="#ef4444" stroke-width="2" opacity="0.4"/>
                        <path d="${maze.path}" fill="none" stroke="#a78bfa22" stroke-width="24"/>
                        <path id="tst-maze-guide" d="${maze.path}" fill="none" stroke="#a78bfa" stroke-width="2" stroke-dasharray="6,4"/>
                        <circle cx="20" cy="150" r="10" fill="#22c55e"/>
                        <text x="20" y="185" text-anchor="middle" font-size="11" fill="#22c55e">СТАРТ</text>
                        <circle cx="280" cy="${finishCY}" r="10" fill="#f97316"/>
                        <text x="280" y="${finishCY + 18}" text-anchor="middle" font-size="11" fill="#f97316">ФИНИШ</text>
                        <circle id="tst-maze-ball" cx="20" cy="150" r="12" fill="#60a5fa" style="filter:drop-shadow(0 2px 4px #0004)"/>
                    </svg>
                </div>
                <div id="tst-maze-msg" style="text-align:center;color:#94a3b8;font-size:13px;margin-top:6px;">Тяни шарик к финишу!</div>
                <div style="display:flex;gap:10px;justify-content:center;margin-top:8px;">
                    <button id="tst-maze-hint" class="tst-check-btn" style="display:none;background:var(--card);color:var(--text2);border:1.5px solid var(--border);"
                        onclick="Testing._onMazeHint()">💡 Подсказка</button>
                    <button id="tst-maze-retry" class="tst-check-btn" style="display:none;"
                        onclick="Testing._onMazeRetry()">🔄 Попробовать снова</button>
                </div>
            </div>`;
            Testing._attachMazeListeners(finishCY);
        };
        renderMaze();
        Testing._renderMaze = renderMaze;

    },

    _attachMazeListeners(finishCY) {
        const svg = document.getElementById('tst-maze-svg');
        const ball = document.getElementById('tst-maze-ball');
        if (!svg || !ball) return;
        let dragging = false;
        const finishX = 280;

        const getXY = (e) => {
            const rect = svg.getBoundingClientRect();
            const s = e.touches ? e.touches[0] : e;
            return {
                x: Math.max(10, Math.min(290, (s.clientX - rect.left) / rect.width * 300)),
                y: Math.max(10, Math.min(290, (s.clientY - rect.top) / rect.height * 300))
            };
        };

        const move = (e) => {
            if (!dragging) return;
            e.preventDefault();
            const {x, y} = getXY(e);
            ball.setAttribute('cx', x);
            ball.setAttribute('cy', y);
            const dx = x - finishX, dy = y - finishCY;
            if (Math.sqrt(dx*dx + dy*dy) < 22 && !Testing._mazePassed) {
                Testing._mazePassed = true;
                clearTimeout(Testing._mazeTimeout);
                clearTimeout(Testing._mazeHintTimer);
                Testing._playTick();
                ball.setAttribute('fill', '#22c55e');
                document.getElementById('tst-maze-msg').textContent = '🎉 Добрался!';
                dragging = false;
                svg.style.pointerEvents = 'none';
                const time = (Date.now() - Testing._mazeT0) / 1000;
                const timeLimits = { '3-4': 30, '4-5': 25, '5-6': 20, '6-7': 18 };
                const limit = timeLimits[Testing._mazeTask.age] || 25;
                const hintPenalty = Testing._mazeHintUsed ? 0.2 : 0;
                const score = Math.max(0.3, Math.min(1, 1 - (time - limit*0.5) / (limit*2)) - hintPenalty);
                Testing._taskResults.motor.push({
                    id: Testing._mazeTask.id, result: 'correct',
                    score: Math.round(score*100)/100,
                    time_sec: Math.round(time*10)/10,
                    details: { wall_hits: Testing._mazeHits, hint_used: Testing._mazeHintUsed }
                });
                setTimeout(() => Testing._showFeedback(true, () => Testing._next()), 600);
            }
        };

        ball.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
        ball.addEventListener('touchstart', (e) => { dragging = true; e.preventDefault(); }, { passive: false });
        svg.addEventListener('mousemove', move);
        svg.addEventListener('touchmove', move, { passive: false });
        svg.addEventListener('mouseup', () => { dragging = false; });
        svg.addEventListener('touchend', () => { dragging = false; });

        // Show hint button after 8 seconds
        this._mazeHintUsed = false;
        this._mazeHintTimer = setTimeout(() => {
            const hintBtn = document.getElementById('tst-maze-hint');
            if (hintBtn && !Testing._mazePassed) hintBtn.style.display = '';
        }, 8000);

        // Timeout after 25s — show retry instead of auto-advancing
        this._mazeTimeout = setTimeout(() => {
            if (!Testing._mazePassed) {
                const msg = document.getElementById('tst-maze-msg');
                const retryBtn = document.getElementById('tst-maze-retry');
                const hintBtn = document.getElementById('tst-maze-hint');
                if (msg) msg.textContent = 'Время вышло! Попробуй ещё раз или пропусти.';
                if (retryBtn) retryBtn.style.display = '';
                if (hintBtn) hintBtn.style.display = 'none';
                svg.style.pointerEvents = 'none';
            }
        }, 25000);
    },

    _onMazeHint() {
        this._mazeHintUsed = true;
        // Flash the guide path bright for 2 seconds
        const guide = document.getElementById('tst-maze-guide');
        if (guide) {
            guide.setAttribute('stroke', '#f97316');
            guide.setAttribute('stroke-width', '5');
            guide.removeAttribute('stroke-dasharray');
            setTimeout(() => {
                if (guide) {
                    guide.setAttribute('stroke', '#a78bfa');
                    guide.setAttribute('stroke-width', '2');
                    guide.setAttribute('stroke-dasharray', '6,4');
                }
            }, 2000);
        }
        const hintBtn = document.getElementById('tst-maze-hint');
        if (hintBtn) hintBtn.style.display = 'none';
    },

    _onMazeRetry() {
        // Clear timers and reset state
        clearTimeout(this._mazeTimeout);
        clearTimeout(this._mazeHintTimer);
        this._mazePassed = false;
        this._mazeHits = 0;
        this._mazeHintUsed = false;
        this._mazeT0 = Date.now();
        // Re-render maze
        if (this._renderMaze) this._renderMaze();
    },

    // =============================================
    // MOTOR — SORT (сортировка фигур)
    // =============================================

    // Цвета для корзиночек
    _sortColors: {
        '🔴': { fill: '#ef4444', stroke: '#b91c1c', light: '#fecaca' },
        '🔵': { fill: '#60a5fa', stroke: '#2563eb', light: '#dbeafe' },
        '🟡': { fill: '#fbbf24', stroke: '#d97706', light: '#fef3c7' },
        '🟢': { fill: '#4ade80', stroke: '#16a34a', light: '#dcfce7' },
        '🟣': { fill: '#a78bfa', stroke: '#7c3aed', light: '#ede9fe' },
        '🟠': { fill: '#fb923c', stroke: '#ea580c', light: '#ffedd5' },
    },

    _sortBasketSVG(emoji) {
        const c = this._sortColors[emoji] || { fill: '#94a3b8', stroke: '#64748b', light: '#f1f5f9' };
        return `<svg viewBox="0 0 64 56" width="64" height="56" xmlns="http://www.w3.org/2000/svg">
            <!-- Handle left -->
            <path d="M14,18 Q10,8 20,6" fill="none" stroke="${c.stroke}" stroke-width="3" stroke-linecap="round"/>
            <!-- Handle right -->
            <path d="M50,18 Q54,8 44,6" fill="none" stroke="${c.stroke}" stroke-width="3" stroke-linecap="round"/>
            <!-- Basket body -->
            <path d="M8,20 L12,50 Q12,53 16,53 L48,53 Q52,53 52,50 L56,20 Z" fill="${c.fill}" opacity="0.9"/>
            <!-- Basket weave lines horizontal -->
            <line x1="9" y1="30" x2="55" y2="30" stroke="${c.stroke}" stroke-width="1.2" opacity="0.4"/>
            <line x1="10" y1="40" x2="54" y2="40" stroke="${c.stroke}" stroke-width="1.2" opacity="0.4"/>
            <!-- Basket weave lines vertical -->
            <line x1="20" y1="20" x2="17" y2="53" stroke="${c.stroke}" stroke-width="1.2" opacity="0.4"/>
            <line x1="32" y1="20" x2="32" y2="53" stroke="${c.stroke}" stroke-width="1.2" opacity="0.4"/>
            <line x1="44" y1="20" x2="47" y2="53" stroke="${c.stroke}" stroke-width="1.2" opacity="0.4"/>
            <!-- Rim -->
            <rect x="6" y="18" width="52" height="6" rx="3" fill="${c.stroke}" opacity="0.85"/>
        </svg>`;
    },

    _sortBallSVG(emoji) {
        const c = this._sortColors[emoji] || { fill: '#94a3b8', stroke: '#64748b', light: '#f1f5f9' };
        return `<svg viewBox="0 0 48 48" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="ball-${emoji.codePointAt(0)}" cx="38%" cy="32%" r="60%">
                    <stop offset="0%" stop-color="${c.light}"/>
                    <stop offset="100%" stop-color="${c.fill}"/>
                </radialGradient>
            </defs>
            <circle cx="24" cy="24" r="20" fill="url(#ball-${emoji.codePointAt(0)})" stroke="${c.stroke}" stroke-width="1.5"/>
            <circle cx="18" cy="18" r="5" fill="white" opacity="0.3"/>
        </svg>`;
    },

    _taskSort(task) {
        const el = document.getElementById('testing-content');
        const configs = {
            '3-4': { shapes: ['🔴','🔵','🟡'], perShape: 2 },
            '4-5': { shapes: ['🔴','🔵','🟡','🟢'], perShape: 2 },
            '5-6': { shapes: ['🔴','🔵','🟡','🟢','🟣'], perShape: 2 },
            '6-7': { shapes: ['🔴','🔵','🟡','🟢','🟣','🟠'], perShape: 2 },
        };
        const cfg = configs[task.age] || configs['4-5'];
        this._sortTask = task;
        this._sortT0 = Date.now();
        this._sortCorrect = 0;
        this._sortTotal = cfg.shapes.length * cfg.perShape;
        this._sortDone = 0;

        const items = this._shuffle(cfg.shapes.flatMap(s => Array(cfg.perShape).fill(s)));

        el.innerHTML = `
            <div class="tst-task">
                <div class="tst-instruction">Разложи шарики по корзинкам!</div>
                <div class="tst-sort-items" id="tst-sort-items">
                    ${items.map((s,i) => `
                        <div class="tst-sort-item" data-shape="${s}" data-idx="${i}">
                            ${this._sortBallSVG(s)}
                        </div>`).join('')}
                </div>
                <div class="tst-sort-baskets" id="tst-sort-baskets">
                    ${cfg.shapes.map(s => `
                        <div class="tst-sort-basket" data-target="${s}">
                            <div class="tst-sort-basket-body">${this._sortBasketSVG(s)}</div>
                            <div class="tst-sort-placed" id="placed-${s.codePointAt(0)}"></div>
                        </div>`).join('')}
                </div>
            </div>`;

        // Tap-to-select then tap-basket
        let selected = null;
        document.querySelectorAll('.tst-sort-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.tst-sort-item').forEach(i => i.classList.remove('selected'));
                selected = item;
                item.classList.add('selected');
            });
        });

        document.querySelectorAll('.tst-sort-basket').forEach(basket => {
            basket.addEventListener('click', () => {
                if (!selected) return;
                const shape = selected.dataset.shape;
                const target = basket.dataset.target;
                const isCorrect = shape === target;
                if (isCorrect) Testing._sortCorrect++;
                Testing._sortDone++;
                Testing._playTick();
                // Animate item into basket
                selected.style.transition = 'transform 0.25s, opacity 0.25s';
                selected.style.transform = 'scale(0)';
                selected.style.opacity = '0';
                // Add mini ball to basket
                const placed = document.getElementById('placed-' + target.codePointAt(0));
                if (placed) {
                    const mini = document.createElement('div');
                    mini.innerHTML = Testing._sortBallSVG(shape);
                    mini.style.cssText = `width:22px;height:22px;opacity:${isCorrect?'1':'0.45'};transform:scale(0);transition:transform 0.2s;flex-shrink:0;`;
                    placed.appendChild(mini);
                    requestAnimationFrame(() => { mini.style.transform = 'scale(1)'; });
                }
                setTimeout(() => selected.remove(), 250);
                selected = null;
                if (Testing._sortDone >= Testing._sortTotal) {
                    setTimeout(() => {
                        const time = (Date.now() - Testing._sortT0) / 1000;
                        const score = Testing._sortCorrect / Testing._sortTotal;
                        const ok = score >= 0.75;
                        Testing._taskResults.motor.push({
                            id: Testing._sortTask.id,
                            result: ok ? 'correct' : (score >= 0.5 ? 'partial' : 'incorrect'),
                            score: Math.round(score * 100) / 100,
                            time_sec: Math.round(time * 10) / 10,
                            details: { correct: Testing._sortCorrect, total: Testing._sortTotal }
                        });
                        Testing._showFeedback(ok, () => Testing._next());
                    }, 400);
                }
            });
        });
    },

    // =============================================
    // TASKS — SOCIAL
    // =============================================

    _taskEmotions(task) {
        const el = document.getElementById('testing-content');
        const t0 = Date.now();
        const s = task.set;
        const emojiMap = { 'Радость': '😊', 'Грусть': '😢', 'Злость': '😠', 'Страх': '😨', 'Стыд': '😳', 'Удивление': '😲' };

        el.innerHTML = `
            
            <div class="tst-task">
                <div class="tst-instruction">Что чувствует ребёнок?</div>
                <div class="tst-scene">${s.scene}</div>
                <div class="tst-scene-desc">${s.desc}</div>
                <div class="tst-emo-options">
                    ${s.options.map(o => `<button class="tst-emo-btn" data-val="${o}" onclick="Testing._onEmoAnswer('${o}','${s.correct}',${t0},'${task.block}','${task.id}')">
                        <span class="tst-emo-icon">${emojiMap[o] || '❓'}</span>
                        <span class="tst-emo-label">${o}</span>
                    </button>`).join('')}
                </div>
            </div>`;
    },

    _onEmoAnswer(selected, correct, t0, block, id) {
        const time = (Date.now() - t0) / 1000;
        const ok = selected === correct;
        this._record(block, id, ok, time);
        this._checkAndNext(ok, '.tst-emo-btn', 'val', correct);
    },

    _taskSituations(task) {
        const el = document.getElementById('testing-content');
        const t0 = Date.now();
        const s = task.set;

        el.innerHTML = `
            
            <div class="tst-task">
                <div class="tst-instruction">Как ты думаешь, что нужно сделать?</div>
                <div class="tst-situation-desc">${s.desc}</div>
                <div class="tst-options tst-options-vertical">
                    ${s.options.map((o, i) => `<button class="tst-opt-btn tst-opt-wide" data-idx="${i}" onclick="Testing._onSitAnswer(${i},${s.prosocial},${t0},'${task.block}','${task.id}')">${o}</button>`).join('')}
                </div>
            </div>`;
    },

    _onSitAnswer(selected, prosocial, t0, block, id) {
        const time = (Date.now() - t0) / 1000;
        const ok = selected === prosocial;
        this._record(block, id, ok, time);
        this._checkAndNext(ok, '.tst-opt-btn', 'idx', prosocial);
    },

    // ── Self-Care Checklist ──
    _taskSelfCare(task) {
        const el = document.getElementById('testing-content');
        const items = TESTING_TASKS.social.selfCare[task.age] || TESTING_TASKS.social.selfCare['4-5'];
        this._selfCareItems = items;
        this._selfCareChecked = new Set();
        this._selfCareTask = task;

        el.innerHTML = `
            
            <div class="tst-task">
                <div class="tst-instruction">Что ты уже умеешь делать сам? Нажми!</div>
                <div class="tst-parent-hint">👨‍👩‍👧 Родитель: помогите отметить навыки ребёнка</div>
                <div class="tst-selfcare-grid" id="tst-selfcare-grid">
                    ${items.map((item, i) => `<button class="tst-selfcare-btn" data-idx="${i}" onclick="Testing._toggleSelfCare(this,${i})">${item}</button>`).join('')}
                </div>
                <button class="tst-check-btn" onclick="Testing._onSelfCareCheck()">Готово ✓</button>
            </div>`;
    },

    _toggleSelfCare(btn, idx) {
        this._playTick();
        if (this._selfCareChecked.has(idx)) {
            this._selfCareChecked.delete(idx);
            btn.classList.remove('checked');
        } else {
            this._selfCareChecked.add(idx);
            btn.classList.add('checked');
        }
    },

    _onSelfCareCheck() {
        const total = this._selfCareItems.length;
        const checked = this._selfCareChecked.size;
        const score = total ? checked / total : 0;
        this._taskResults.social.push({
            id: this._selfCareTask.id,
            result: 'self-report',
            score: Math.round(score * 100) / 100,
            time_sec: 0,
            details: { checked, total, items: [...this._selfCareChecked].map(i => this._selfCareItems[i]) }
        });
        this._next();
    },

    // =============================================
    // FINISH — результаты
    // =============================================
    _showFinish() {
        this._hideProgress();
        const duration = Math.round((Date.now() - this._startTime) / 1000);

        // Подсчёт по блокам (voice tasks с score=-1 исключены из автоскоринга)
        const blocks = {};
        for (const [block, tasks] of Object.entries(this._taskResults)) {
            if (tasks.length === 0) continue;
            const autoTasks = tasks.filter(t => t.score >= 0);
            const voiceTasks = tasks.filter(t => t.score < 0);
            if (autoTasks.length === 0 && voiceTasks.length > 0) {
                // Только голосовые задания — не даём автоматический балл
                blocks[block] = { score: null, tasks, voiceOnly: true };
                continue;
            }
            if (autoTasks.length === 0) continue;
            const sum = autoTasks.reduce((s, t) => s + t.score, 0);
            blocks[block] = {
                score: Math.round(sum / autoTasks.length * 100) / 100,
                tasks,
                autoCount: autoTasks.length,
                voiceCount: voiceTasks.length,
                avgTime: Math.round(autoTasks.reduce((s, t) => s + t.time_sec, 0) / autoTasks.length * 10) / 10
            };
        }

        // Определяем сильные/слабые стороны
        const blockEntries = Object.entries(blocks);
        let strongest = '', weakest = '';
        // Exclude voiceOnly/null-score blocks — they have no numeric score to compare
        const scoredEntries = blockEntries.filter(([, d]) => d.score != null && d.score >= 0);
        if (scoredEntries.length) {
            scoredEntries.sort((a, b) => b[1].score - a[1].score);
            strongest = scoredEntries[0][0];
            weakest = scoredEntries[scoredEntries.length - 1][0];
        }

        // Сохраняем результат
        const result = {
            id: `${this._session.type}_${new Date().toISOString().slice(0,10)}`,
            type: this._session.type,
            date: this._session.date,
            age_group: this._session.age_group,
            duration_sec: duration,
            blocks,
            miniBlock: this._session.miniBlock || null,
            audioPrefix: this._audioPrefix(),
            summary: { strongest, weakest }
        };
        this._results.push(result);
        this._saveResults();

        // Confetti + fanfare!
        this._playFinishFanfare();
        if (typeof confetti === 'function') {
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }

        // Отображаем результат
        const el = document.getElementById('testing-content');
        const avg = this._avgScore(result);
        const blockNames = { cognitive: '🧠 Когниция', speech: '💬 Речь', motor: '✋ Моторика', social: '❤️ Социум' };

        let blocksHtml = '';
        for (const [b, data] of Object.entries(blocks)) {
            if (data.voiceOnly) {
                blocksHtml += `
                    <div class="tst-result-block">
                        <div class="tst-rb-header">
                            <span>${blockNames[b] || b}</span>
                            <span style="color:var(--text2);font-size:12px">🎙 Только голос</span>
                        </div>
                        <div class="tst-rb-label" style="color:var(--text2)">Прослушайте записи в «Речевом портрете»</div>
                    </div>`;
                continue;
            }
            const pct = Math.round(data.score * 100);
            const color = this._scoreColor(data.score);
            const label = this._scoreLabel(data.score);
            const timeInfo = data.avgTime ? ` · ~${data.avgTime}с на задание` : '';
            blocksHtml += `
                <div class="tst-result-block">
                    <div class="tst-rb-header">
                        <span>${blockNames[b] || b}</span>
                        <span style="color:${color};font-weight:600">${pct}%</span>
                    </div>
                    <div class="tst-rb-bar"><div class="tst-rb-fill" style="width:${pct}%;background:${color}"></div></div>
                    <div class="tst-rb-label" style="color:${color}">${label}${timeInfo}</div>
                </div>`;
        }

        // Рекомендации — всегда показываем, с конкретными упражнениями
        let recsHtml = '<div class="tst-recs-title">Чем заняться</div><div class="tst-recs">';
        let hasRecs = false;

        if (blocks.cognitive && blocks.cognitive.score != null) {
            if (blocks.cognitive.score < 0.4) {
                recsHtml += '<div class="tst-rec">🧩 <strong>Счёт и логика:</strong> Считайте ступеньки, ложки за столом, машины на прогулке. Играйте в «что лишнее?» с реальными предметами. Собирайте пазлы из 6–12 частей.</div>';
                hasRecs = true;
            } else if (blocks.cognitive.score < 0.6) {
                recsHtml += '<div class="tst-rec">🧩 <strong>Счёт и логика:</strong> Сортируйте предметы по цвету и форме. Играйте в настольные игры с кубиком (считать ходы). Стройте из кубиков по образцу.</div>';
                hasRecs = true;
            }
        }
        if (blocks.speech && blocks.speech.score != null) {
            if (blocks.speech.score < 0.4) {
                recsHtml += '<div class="tst-rec">📖 <strong>Речь и слова:</strong> Читайте вслух каждый день 10–15 минут. Задавайте вопросы по картинкам: «Что делает мальчик? Почему?». Играйте в «назови одним словом» (яблоко, груша, банан → фрукты).</div>';
                hasRecs = true;
            } else if (blocks.speech.score < 0.6) {
                recsHtml += '<div class="tst-rec">📖 <strong>Речь и слова:</strong> Просите ребёнка пересказывать сказки. Играйте в рифмы и антонимы (большой — маленький). Описывайте вместе картинки в книгах.</div>';
                hasRecs = true;
            }
        }
        if (blocks.motor && blocks.motor.score != null) {
            if (blocks.motor.score < 0.4) {
                recsHtml += '<div class="tst-rec">✂️ <strong>Мелкая моторика:</strong> Лепите из пластилина фигурки. Нанизывайте бусины на шнурок. Рвите бумагу на мелкие кусочки и делайте аппликации. Рисуйте пальчиковыми красками.</div>';
                hasRecs = true;
            } else if (blocks.motor.score < 0.6) {
                recsHtml += '<div class="tst-rec">✂️ <strong>Мелкая моторика:</strong> Вырезайте ножницами простые фигуры. Обводите трафареты. Застёгивайте пуговицы и молнии. Собирайте мозаику.</div>';
                hasRecs = true;
            }
        }
        if (blocks.social && blocks.social.score != null) {
            if (blocks.social.score < 0.4) {
                recsHtml += '<div class="tst-rec">🎭 <strong>Эмоции и общение:</strong> Называйте эмоции: «Ты сейчас злишься, потому что...». Играйте в ролевые игры (магазин, больница, школа). Обсуждайте чувства героев мультфильмов и сказок.</div>';
                hasRecs = true;
            } else if (blocks.social.score < 0.6) {
                recsHtml += '<div class="tst-rec">🎭 <strong>Эмоции и общение:</strong> Играйте в «покажи эмоцию» перед зеркалом. Разбирайте ситуации: «А как бы ты поступил?». Хвалите за проявление заботы о других.</div>';
                hasRecs = true;
            }
        }

        // Если всё хорошо — похвала
        if (!hasRecs) {
            recsHtml += '<div class="tst-rec">🎉 Отличные результаты! Продолжайте в том же духе — играйте, читайте и познавайте мир вместе.</div>';
        }
        recsHtml += '</div>';

        // Речевой портрет — если были записи
        let voiceHtml = '';
        const audioPrefix = this._audioPrefix();
        VoiceRecorder.getAllForTest(audioPrefix).then(recordings => {
            if (!recordings.length) return;
            const container = document.getElementById('tst-voice-portrait');
            if (!container) return;
            let html = '<div class="tst-voice-title">🎙 Речевой портрет</div><div class="tst-voice-list">';
            recordings.forEach((rec, i) => {
                const label = rec.meta?.word || 'Запись';
                html += `<div class="tst-voice-item">
                    <button class="tst-voice-play" onclick="Testing._playVoiceItem(this, '${rec.id}')">▶</button>
                    <span class="tst-voice-item-label">${label === 'describe' ? '📝 Описание картинки' : '🗣 «' + label + '»'}</span>
                </div>`;
            });
            html += '</div>';

            // Чеклист произношения — для родителя
            const sounds = ['Р','Ш','Ж','Щ','Ч','Ц','Л','С','З'];
            html += `<div class="tst-pron-section">
                <div class="tst-pron-header" onclick="this.parentElement.classList.toggle('open')">
                    <span class="tst-pron-header-text">👨‍👩‍👧 Оценка произношения</span>
                    <span class="tst-pron-header-tag">необязательно</span>
                    <span class="tst-pron-header-arrow">›</span>
                </div>
                <div class="tst-pron-body">
                    <div class="tst-pron-explain">Прослушайте записи выше и отметьте звуки:<br>как ребёнок их произносит.</div>
                    <div class="tst-pron-table">`;
            sounds.forEach(s => {
                const savedState = this._getPronState(audioPrefix, s);
                html += `<div class="tst-pron-row-item">
                    <span class="tst-pron-sound">${s}</span>
                    <button class="tst-pron-opt ${savedState === 'ok' ? 'active' : ''}" data-state="ok" onclick="Testing._setPron(this, '${audioPrefix}', '${s}', 'ok')">✅ чисто</button>
                    <button class="tst-pron-opt ${savedState === 'issue' ? 'active' : ''}" data-state="issue" onclick="Testing._setPron(this, '${audioPrefix}', '${s}', 'issue')">⚠️ замена</button>
                </div>`;
            });
            html += `</div>
                </div>
            </div>`;

            container.innerHTML = html;
        }).catch(() => {});

        el.innerHTML = `
            <div class="tst-finish">
                <div class="tst-finish-emoji">🏆</div>
                <div class="tst-finish-title">Тест пройден!</div>
                <div class="tst-finish-stars">${'⭐'.repeat(Math.min(this._starsCollected || 0, 15))}</div>
                <div class="tst-finish-time">Время: ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}</div>
                <div class="tst-finish-avg" style="color:${this._scoreColor(avg)}">Общий результат: ${Math.round(avg * 100)}%</div>
                <div class="tst-result-blocks">${blocksHtml}</div>
                <div id="tst-voice-portrait"></div>
                ${recsHtml}
                <button class="tst-start-btn" onclick="Testing._showDashboard()">На главную ←</button>
            </div>`;
    },

    // ── Voice playback helpers ──
    _voiceAudio: null,
    async _playVoiceItem(btn, id) {
        if (this._voiceAudio) { this._voiceAudio.pause(); this._voiceAudio = null; }
        // Reset all play buttons
        document.querySelectorAll('.tst-voice-play').forEach(b => { b.textContent = '▶'; });
        try {
            const rec = await VoiceRecorder.get(id);
            if (!rec || !rec.blob) return;
            this._voiceAudio = new Audio(VoiceRecorder.createURL(rec.blob));
            btn.textContent = '⏸';
            this._voiceAudio.onended = () => { btn.textContent = '▶'; };
            this._voiceAudio.play().catch(() => {});
        } catch(e) {}
    },

    // ── Load audio for history accordion ──
    async _loadHistAudio(prefix, ri) {
        const wrap = document.getElementById(`tst-hist-audio-${ri}`);
        if (!wrap) return;
        try {
            const recordings = await VoiceRecorder.getAllForTest(prefix);
            if (!recordings.length) {
                wrap.innerHTML = '<div class="tst-hist-audio-empty">Записи не найдены</div>';
                return;
            }

            let html = '<div class="tst-hist-audio-list">';
            recordings.forEach(rec => {
                const label = rec.meta?.word || 'Запись';
                const display = label === 'describe' ? '📝 Описание' : `🗣 ${label}`;
                html += `<div class="tst-hist-audio-item">
                    <button class="tst-voice-play" onclick="Testing._playVoiceItem(this, '${rec.id}')">▶</button>
                    <span>${display}</span>
                </div>`;
            });

            // Чеклист произношения — для родителя
            const sounds = ['Р','Ш','Ж','Щ','Ч','Ц','Л','С','З'];
            html += `<div class="tst-pron-section tst-pron-compact">
                <div class="tst-pron-header" onclick="this.parentElement.classList.toggle('open')">
                    <span class="tst-pron-header-text">👨‍👩‍👧 Произношение</span>
                    <span class="tst-pron-header-tag">необязательно</span>
                    <span class="tst-pron-header-arrow">›</span>
                </div>
                <div class="tst-pron-body">
                    <div class="tst-pron-explain">Прослушайте записи и отметьте звуки.</div>
                    <div class="tst-pron-table">`;
            sounds.forEach(s => {
                const state = this._getPronState(prefix, s);
                html += `<div class="tst-pron-row-item">
                    <span class="tst-pron-sound">${s}</span>
                    <button class="tst-pron-opt ${state === 'ok' ? 'active' : ''}" data-state="ok" onclick="Testing._setPron(this, '${prefix}', '${s}', 'ok')">✅</button>
                    <button class="tst-pron-opt ${state === 'issue' ? 'active' : ''}" data-state="issue" onclick="Testing._setPron(this, '${prefix}', '${s}', 'issue')">⚠️</button>
                </div>`;
            });
            html += `</div>
                </div>
            </div>`;
            html += '</div>';

            wrap.innerHTML = html;
        } catch(e) {
            wrap.innerHTML = '<div class="tst-hist-audio-empty">Ошибка загрузки</div>';
        }
    },

    // ── Pronunciation checklist ──
    _getPronState(prefix, sound) {
        try {
            const data = JSON.parse(localStorage.getItem('testing_pron') || '{}');
            return (data[prefix] && data[prefix][sound]) || '';
        } catch(e) { return ''; }
    },

    _setPron(btn, prefix, sound, state) {
        let data;
        try { data = JSON.parse(localStorage.getItem('testing_pron') || '{}'); } catch(e) { data = {}; }
        if (!data[prefix]) data[prefix] = {};

        const current = data[prefix][sound] || '';
        // Toggle off if same state clicked again
        const next = current === state ? '' : state;
        data[prefix][sound] = next;
        try { localStorage.setItem('testing_pron', JSON.stringify(data)); } catch(e) {}

        // Update UI: deactivate sibling, activate this one (or deactivate if toggled off)
        const row = btn.closest('.tst-pron-row-item');
        if (row) {
            row.querySelectorAll('.tst-pron-opt').forEach(b => b.classList.remove('active'));
            if (next) btn.classList.add('active');
        }
        this._playTick();
    },

    _scoreLabel(score) {
        if (score >= 0.8) return 'Уверенное владение';
        if (score >= 0.6) return 'Формируется';
        if (score >= 0.4) return 'Требует внимания';
        return 'Нужна практика';
    },

    _blockTip(block, score) {
        if (score >= 0.8) {
            const praise = {
                cognitive: '💡 Отлично считает, различает формы и находит закономерности',
                speech:    '💡 Хороший словарный запас, уверенно подбирает слова',
                motor:     '💡 Ловкие пальчики, хорошая координация',
                social:    '💡 Хорошо понимает эмоции и знает правила поведения'
            };
            return praise[block] || '';
        }
        if (score >= 0.6) {
            const tips = {
                cognitive: '→ Считайте предметы на прогулке, играйте в «найди отличия»',
                speech:    '→ Читайте вместе и просите назвать предметы на картинках',
                motor:     '→ Рисуйте, лепите из пластилина, собирайте мозаику',
                social:    '→ Обсуждайте чувства героев в мультфильмах и книгах'
            };
            return tips[block] || '';
        }
        if (score >= 0.4) {
            const tips = {
                cognitive: '→ Сортируйте предметы по цвету и форме, собирайте пазлы из 6–12 частей',
                speech:    '→ Играйте в «назови одним словом», подбирайте антонимы (большой — маленький)',
                motor:     '→ Нанизывайте бусины, вырезайте ножницами, обводите трафареты',
                social:    '→ Играйте в ролевые игры (магазин, больница), называйте эмоции вслух'
            };
            return tips[block] || '';
        }
        const tips = {
            cognitive: '→ Считайте ступеньки и ложки, стройте башни из кубиков по образцу',
            speech:    '→ Читайте вслух 15 мин/день, задавайте вопросы «что делает? почему?»',
            motor:     '→ Лепите фигурки, рвите бумагу на кусочки, рисуйте пальчиковыми красками',
            social:    '→ Называйте эмоции: «ты злишься, потому что...», проигрывайте ситуации'
        };
        return tips[block] || '';
    },

    // ── Reset ──
    reset() {
        if (!confirm('Сбросить все результаты тестирования?')) return;
        localStorage.removeItem('testing_profile');
        localStorage.removeItem('testing_results');
        localStorage.removeItem('testing_pron');
        // Очистка аудиозаписей
        try { indexedDB.deleteDatabase('gosha_audio'); } catch(e) {}
        this._profile = null;
        this._results = [];
        showToast('🗑️ Результаты тестирования сброшены');
        this.init();
    }
};
