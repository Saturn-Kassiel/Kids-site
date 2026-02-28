// =============================================
// РАЗВИВАЙКА — app.js
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

        if (!isMain) this._history.push(id);
        else if (this._history.length > 1 && typeof Gosha !== 'undefined') Gosha.bounce();
        if (isMain) CardBadges.updateAll();
        window.scrollTo(0, 0);
        // Управляем кнопками топ-бара
        if (id === 'puzzles') {
            Puzzles._renderLevelDots();
        } else {
            ['puzzle-level-dots','puzzle-share-topbar'].forEach(eid => { const e = document.getElementById(eid); if (e) e.remove(); });
        }
        if (id === 'riddles') {
            Riddles._renderTopBar();
        } else {
            ['riddle-share-topbar','riddle-level-dots'].forEach(eid => { const e = document.getElementById(eid); if (e) e.remove(); });
        }
        // Рендерим динамические разделы
        if (id === 'info') Info.render();
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

    // Загружаем data.json из репозитория — ВСЕГДА при старте, ждём завершения
    async _loadRemoteData() {
        const KEYS = ['songs','podcasts','puzzles','riddles','info'];
        const REPO = 'Saturn-Kassiel/Kids-site';

        // Локально (file://) — пропускаем, используем localStorage/defaults
        if (location.protocol === 'file:') return;

        // ВСЕГДА загружаем свежий data.json из GitHub —
        // это единственный источник правды для GitHub Pages
        try {
            const url = 'https://raw.githubusercontent.com/' + REPO + '/main/data.json';
            // Таймаут 5 сек чтобы не висеть вечно
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            const resp = await fetch(url + '?_=' + Date.now(), {
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(timer);
            if (!resp.ok) {
                console.log('data.json не найден, используем localStorage');
                return;
            }
            const data = await resp.json();
            KEYS.forEach(k => {
                if (Array.isArray(data[k]) && data[k].length) {
                    localStorage.setItem('admin_' + k, JSON.stringify(data[k]));
                }
            });
            // Загружаем уведомления из data.json
            if (Array.isArray(data.notifications)) {
                localStorage.setItem('admin_notif_remote', JSON.stringify(data.notifications));
            }
            // Проверяем новый контент
            Notif.checkNewContent(data);
            localStorage.removeItem('gh_data_updated');
            console.log('✅ data.json загружен с GitHub');
        } catch(e) {
            // Нет сети или GitHub недоступен — берём что есть в localStorage
            console.log('data.json недоступен:', e.message);
        }
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
         'interstitials','snd-inter-correct'].forEach(k => {
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
        const checkHash = () => {
            if (window.location.hash === '#see') {
                history.replaceState(null, '', location.pathname);
                const pass = prompt('Введите пароль:');
                if (pass === '1239940') {
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
                return data.map(item => String(item.id));
            } else {
                // riddles / puzzles — use answer as identifier
                return data.map(item => (item.answer || item.name || '').toLowerCase().trim()).filter(Boolean);
            }
        } catch { return []; }
    },
    updateAll() {
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
                if (newCount > 0 && total > 0) {
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
// FUZZY ANSWER CHECKER
// =============================================
const AnswerChecker = {
    // Нормализация: е↔ё, и↔й, регистр, лишние пробелы
    _norm(s) {
        return s.trim().toLowerCase()
            .replace(/ё/g, 'е')
            .replace(/й/g, 'и')
            .replace(/\s+/g, ' ');
    },

    // Русский стеммер — обрезаем окончания/суффиксы
    // Возвращает основу слова (минимум 3 буквы)
    _stem(w) {
        if (w.length <= 3) return w;
        // Уменьшительно-ласкательные суффиксы (убираем перед окончаниями)
        const diminutive = [
            'еньк','оньк','ышк','ушк','юшк','ишк','чик','щик',
            'ёнок','онок','ёнк','инк','очк','ечк','ичк','ник','ок','ёк'
        ];
        let stem = w;
        for (const suf of diminutive) {
            if (stem.endsWith(suf) && stem.length - suf.length >= 3) {
                stem = stem.slice(0, -suf.length);
                break;
            }
        }
        // Падежные окончания (с учётом мягкого знака)
        const endings = [
            'ами','ями','ого','его','ому','ему','ой','ей',
            'ую','юю','ых','их','ах','ях','ев','ов',
            'ами','ями','ий','ый','ая','яя',
            'ом','ем','ые','ие','ью','ей','ой',
            'ам','ям','ах','ях',
            'ат','ят','ут','ют','ит','ет',
            'ся','сь',
            'ах','ях','ей','ой','ой',
            'ами','ями',
            'ов','ев','ей',
            'е','и','у','а','я','ю','ь','й'
        ];
        for (const end of endings) {
            if (stem.endsWith(end) && stem.length - end.length >= 3) {
                stem = stem.slice(0, -end.length);
                break;
            }
        }
        return stem;
    },

    // Основная проверка
    // Возвращает: 'exact' | 'fuzzy' | 'wrong'
    check(input, answer) {
        const a = this._norm(input);
        const b = this._norm(answer);

        // 1. Точное совпадение после нормализации
        if (a === b) return 'exact';

        // 2. Многословный ответ — проверяем каждое слово
        const wordsA = a.split(' ');
        const wordsB = b.split(' ');

        // Для каждого слова ответа проверяем нечёткое совпадение
        const allMatch = wordsB.every(wb => {
            return wordsA.some(wa => this._wordMatch(wa, wb));
        });
        if (allMatch) return 'fuzzy';

        // 3. Частичное — если ввёл одно слово из многословного ответа
        if (wordsB.length > 1 && wordsA.length === 1) {
            const anyMatch = wordsB.some(wb => this._wordMatch(wordsA[0], wb));
            if (anyMatch) return 'fuzzy';
        }

        return 'wrong';
    },

    _wordMatch(a, b) {
        if (a === b) return true;
        const sa = this._stem(a);
        const sb = this._stem(b);
        // Совпадение основ
        if (sa === sb) return true;
        // Одна основа начинается с другой (минимум 3 буквы)
        const minLen = Math.min(sa.length, sb.length);
        if (minLen >= 3 && (sa.startsWith(sb.slice(0,minLen)) || sb.startsWith(sa.slice(0,minLen)))) return true;
        // Расстояние Левенштейна ≤ 1 для коротких слов, ≤ 2 для длинных
        const dist = this._levenshtein(sa, sb);
        const threshold = sa.length <= 5 ? 1 : 2;
        return dist <= threshold;
    },

    _levenshtein(a, b) {
        if (Math.abs(a.length - b.length) > 3) return 99;
        const m = a.length, n = b.length;
        const dp = Array.from({length: m+1}, (_,i) => [i, ...Array(n).fill(0)]);
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++)
            for (let j = 1; j <= n; j++)
                dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
                    : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        return dp[m][n];
    }
};

function starsBurst() {
    showStars(window.innerWidth / 2, window.innerHeight * 0.55);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
}

// Тихий мягкий звук правильного ответа
function playCorrectSound(section) {
    const key = section === 'riddles' ? 'snd-riddle-correct'
              : section === 'words'   ? 'snd-words-correct'
              : section === 'math'    ? 'snd-math-correct'
              : section === 'interstitials' ? 'snd-inter-correct'
              : 'snd-puzzle-correct';
    if (!getSoundSetting(key)) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Два синусоидальных тона — мягкий восходящий интервал
        const notes = [
            { freq: 523.25, start: 0,    dur: 0.18 },  // C5
            { freq: 783.99, start: 0.10, dur: 0.22 },  // G5
        ];
        notes.forEach(({ freq, start, dur }) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            // Лёгкое вибрато для мягкости
            const vib  = ctx.createOscillator();
            const vibG = ctx.createGain();
            vib.frequency.value = 5.5;
            vibG.gain.value = 3;
            vib.connect(vibG);
            vibG.connect(osc.frequency);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

            // Огибающая: тихо нарастает, плавно затухает
            const t0 = ctx.currentTime + start;
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.09, t0 + 0.025);
            gain.gain.setValueAtTime(0.09, t0 + dur * 0.4);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

            vib.start(t0); vib.stop(t0 + dur);
            osc.start(t0); osc.stop(t0 + dur + 0.05);
        });
    } catch(e) {}
}

// Мягкий звук неправильного ответа (слова)
function playWrongSound(section) {
    const key = section === 'words' ? 'snd-words-correct'
              : section === 'math'  ? 'snd-math-correct'
              : section === 'interstitials' ? 'snd-inter-correct'
              : 'snd-puzzle-correct';
    if (!getSoundSetting(key)) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [
            { freq: 330, start: 0,    dur: 0.18 },  // E4
            { freq: 262, start: 0.12, dur: 0.22 },  // C4 — нисходящий
        ];
        notes.forEach(({ freq, start, dur }) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
            const t0 = ctx.currentTime + start;
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.07, t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.start(t0); osc.stop(t0 + dur + 0.05);
        });
    } catch(e) {}
}


// =============================================
// ACHIEVEMENT SYSTEM
// =============================================
const Achievements = {
    // Счётчики подряд (сбрасываются при ошибке)
    _streak: { puzzles: 0, riddles: 0 },
    // Лучший результат (сохраняется между сессиями)
    _best:   { puzzles: 0, riddles: 0 },
    // Уже показанные рубежи в текущей серии
    _shown:  { puzzles: new Set(), riddles: new Set() },

    init() {
        const saved = JSON.parse(localStorage.getItem('achievements_best') || '{}');
        this._best.puzzles = saved.puzzles || 0;
        this._best.riddles = saved.riddles || 0;
    },

    correct(section) {
        this._streak[section]++;
        const s = this._streak[section];
        if (this._best[section] < s) {
            this._best[section] = s;
            localStorage.setItem('achievements_best', JSON.stringify(this._best));
        }
        if (s % 5 === 0 && !this._shown[section].has(s)) {
            this._shown[section].add(s);
            setTimeout(() => this._show(section, s), 600);
        }
    },

    wrong(section) {
        this._streak[section] = 0;
        this._shown[section]  = new Set();
    },

    _playFanfare(section) {
        const key = section === 'riddles' ? 'snd-riddle-achieve' : 'snd-puzzle-achieve';
        if (!getSoundSetting(key)) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = section === 'riddles'
                ? [523, 659, 784, 1047]   // C E G C — загадки (мягко)
                : [392, 523, 659, 784, 1047]; // G C E G C — ребусы (торжественно)
            let t = ctx.currentTime;
            notes.forEach((freq, i) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                osc.start(t); osc.stop(t + 0.4);
                t += i < notes.length - 1 ? 0.12 : 0;
            });
        } catch(e) {}
    },

    _milestoneTheme(section, count) {
        // Медальки по уровню
        const tier = count >= 20 ? 4 : count >= 15 ? 3 : count >= 10 ? 2 : 1;
        if (section === 'riddles') {
            // Совы / лампочки
            const items = [
                { icon: this._drawOwl,   color: '#A7EBF2', label: 'Умная сова' },
                { icon: this._drawBulb,  color: '#fde68a', label: 'Яркая идея' },
                { icon: this._drawOwl,   color: '#c4b5fd', label: 'Мудрая сова' },
                { icon: this._drawOwlGold, color: '#fcd34d', label: 'Великий знаток' },
            ];
            return items[tier - 1];
        } else {
            // Пазлы / мозг
            const items = [
                { icon: this._drawPuzzle, color: '#A7EBF2', label: 'Сообразительный' },
                { icon: this._drawBrain,  color: '#86efac', label: 'Острый ум' },
                { icon: this._drawPuzzle, color: '#c4b5fd', label: 'Мастер ребусов' },
                { icon: this._drawBrainGold, color: '#fcd34d', label: 'Гений загадок' },
            ];
            return items[tier - 1];
        }
    },

    _show(section, count) {
        this._playFanfare(section);
        StatTracker.recordAchievement(section, count);
        const theme = this._milestoneTheme(section, count);

        const overlay = document.createElement('div');
        overlay.id = 'achievement-overlay';
        overlay.innerHTML = `
            <div class="ach-card" id="ach-card">
                <div class="ach-canvas-wrap">
                    <canvas id="ach-canvas" width="220" height="220"></canvas>
                    <div class="ach-count-badge">${count}</div>
                </div>
                <div class="ach-label">${getChildName() ? getChildName() + ' — ' : ''}${count} правильных ответов подряд!</div>
                <div class="ach-sub">${theme.label}</div>
                <div class="ach-progress-bar"><div class="ach-progress-fill" id="ach-progress"></div></div>
                <div class="ach-btns">
                    <button class="ach-share-btn" onclick="Achievements._share(${count},'${section}')">
                        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        Поделиться
                    </button>
                    <button class="ach-close-btn" onclick="Achievements._close()">Закрыть</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Рисуем иконку на canvas
        const canvas = document.getElementById('ach-canvas');
        if (canvas) {
            const ctx2 = canvas.getContext('2d');
            theme.icon.call(this, ctx2, 220, theme.color);
        }

        // Анимация появления
        requestAnimationFrame(() => {
            overlay.classList.add('ach-visible');
            document.getElementById('ach-card')?.classList.add('ach-card-in');
            // Запускаем progress bar
            setTimeout(() => {
                const bar = document.getElementById('ach-progress');
                if (bar) bar.style.width = '0%';
            }, 50);
        });

        // Конфетти
        if (window.confetti) confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });

        // Автозакрытие через 10 сек
        this._autoClose = setTimeout(() => this._close(), 10000);
    },

    _close() {
        clearTimeout(this._autoClose);
        const overlay = document.getElementById('achievement-overlay');
        if (overlay) {
            overlay.classList.remove('ach-visible');
            setTimeout(() => overlay.remove(), 350);
        }
    },

    async _share(count, section) {
        const sectionName = section === 'riddles' ? 'загадках' : 'ребусах';
        const childN = getChildName();
        const text = childN
            ? `🎉 ${childN}: ${count} правильных ответов подряд в ${sectionName}! Попробуй сам: https://saturn-kassiel.github.io/Kids-site/`
            : `🎉 ${count} правильных ответов подряд в ${sectionName}! Попробуй сам: https://saturn-kassiel.github.io/Kids-site/`;

        // Пробуем поделиться вместе с картинкой
        const canvas = document.getElementById('ach-canvas');
        if (canvas && navigator.share) {
            try {
                // Создаём новый canvas с картинкой + текстом поверх
                const shareCanvas = document.createElement('canvas');
                shareCanvas.width = 600; shareCanvas.height = 600;
                const sc = shareCanvas.getContext('2d');

                // Белый/тёмный фон в зависимости от темы
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                sc.fillStyle = isDark ? '#0f1f36' : '#f0f9ff';
                sc.roundRect(0, 0, 600, 600, 40);
                sc.fill();

                // Рисуем иконку в центре (перерисовываем)
                const theme = this._milestoneTheme(section, count);
                theme.icon.call(this, sc, 600, theme.color);

                // Полупрозрачная подложка под текст
                sc.fillStyle = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.75)';
                sc.beginPath();
                sc.roundRect(40, 430, 520, 130, 20);
                sc.fill();

                // Имя ребёнка (если есть)
                if (childN) {
                    sc.font = '500 30px system-ui, sans-serif';
                    sc.textAlign = 'center';
                    sc.fillStyle = isDark ? '#fbbf24' : '#d97706';
                    sc.fillText(childN, 300, 470);
                }

                // Число
                sc.font = 'bold 72px system-ui, sans-serif';
                sc.textAlign = 'center';
                sc.fillStyle = isDark ? '#A7EBF2' : '#0369a1';
                sc.fillText(count, 300, childN ? 540 : 500);

                // Текст
                sc.font = '500 28px system-ui, sans-serif';
                sc.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
                sc.fillText(`правильных ответов подряд в ${sectionName}`, 300, childN ? 576 : 542);

                // Бренд
                sc.font = '400 20px system-ui, sans-serif';
                sc.fillStyle = isDark ? '#94a3b8' : '#64748b';
                sc.fillText('Гоша · saturn-kassiel.github.io/Kids-site', 300, childN ? 600 : 576);

                // Конвертируем в blob и шарим
                shareCanvas.toBlob(async (blob) => {
                    const file = new File([blob], 'achievement.png', { type: 'image/png' });
                    try {
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({ files: [file], text });
                        } else {
                            await navigator.share({ text });
                        }
                    } catch(e) {}
                }, 'image/png');
                return;
            } catch(e) {}
        }

        // Fallback — только текст или копирование
        if (navigator.share) {
            try { await navigator.share({ text }); } catch(e) {}
        } else {
            navigator.clipboard.writeText(text).catch(() => {});
            showToast('📋 Скопировано!');
        }
    },

    // ── Canvas рисовалки ──

    _drawOwl(ctx, size, color) {
        const cx = size/2, cy = size/2, r = size*0.36;
        // Фон — круг с градиентом
        const g = ctx.createRadialGradient(cx, cy-r*0.2, r*0.1, cx, cy, r*1.2);
        g.addColorStop(0, color); g.addColorStop(1, color + '44');
        ctx.beginPath(); ctx.arc(cx, cy, r*1.1, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
        // Тело
        ctx.beginPath();
        ctx.ellipse(cx, cy+r*0.15, r*0.55, r*0.7, 0, 0, Math.PI*2);
        ctx.fillStyle = '#5b4a2e'; ctx.fill();
        // Голова
        ctx.beginPath();
        ctx.arc(cx, cy-r*0.3, r*0.4, 0, Math.PI*2);
        ctx.fillStyle = '#7c6542'; ctx.fill();
        // Ушки
        ctx.beginPath();
        ctx.moveTo(cx-r*0.28, cy-r*0.55);
        ctx.lineTo(cx-r*0.42, cy-r*0.85);
        ctx.lineTo(cx-r*0.08, cy-r*0.62);
        ctx.fillStyle = '#7c6542'; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx+r*0.28, cy-r*0.55);
        ctx.lineTo(cx+r*0.42, cy-r*0.85);
        ctx.lineTo(cx+r*0.08, cy-r*0.62);
        ctx.fillStyle = '#7c6542'; ctx.fill();
        // Глаза
        [[cx-r*0.18, cy-r*0.32],[cx+r*0.18, cy-r*0.32]].forEach(([x,y]) => {
            ctx.beginPath(); ctx.arc(x, y, r*0.14, 0, Math.PI*2);
            ctx.fillStyle = '#fff'; ctx.fill();
            ctx.beginPath(); ctx.arc(x+r*0.02, y+r*0.02, r*0.08, 0, Math.PI*2);
            ctx.fillStyle = '#1a1a2e'; ctx.fill();
            ctx.beginPath(); ctx.arc(x+r*0.04, y-r*0.04, r*0.03, 0, Math.PI*2);
            ctx.fillStyle = '#fff'; ctx.fill();
        });
        // Клюв
        ctx.beginPath();
        ctx.moveTo(cx, cy-r*0.18); ctx.lineTo(cx-r*0.08, cy-r*0.1); ctx.lineTo(cx+r*0.08, cy-r*0.1);
        ctx.fillStyle = '#f59e0b'; ctx.fill();
        // Брови удивлённые
        ctx.strokeStyle = '#3d2b00'; ctx.lineWidth = r*0.05; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx-r*0.28, cy-r*0.48); ctx.lineTo(cx-r*0.08, cy-r*0.44); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.28, cy-r*0.48); ctx.lineTo(cx+r*0.08, cy-r*0.44); ctx.stroke();
        // Звёздочки
        Achievements._drawStars(ctx, cx, cy, r, color);
    },

    _drawOwlGold(ctx, size, color) {
        Achievements._drawOwl(ctx, size, color);
        // Корона
        const cx = size/2, cy = size/2, r = size*0.36;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.rect(cx-r*0.35, cy-r*0.85, r*0.7, r*0.22);
        ctx.fill();
        for(let i=0; i<5; i++){
            ctx.beginPath();
            ctx.moveTo(cx-r*0.35+i*r*0.175, cy-r*0.85);
            ctx.lineTo(cx-r*0.315+i*r*0.175, cy-r*1.05);
            ctx.lineTo(cx-r*0.28+i*r*0.175, cy-r*0.85);
            ctx.fillStyle = '#f59e0b'; ctx.fill();
        }
    },

    _drawBulb(ctx, size, color) {
        const cx = size/2, cy = size/2, r = size*0.36;
        const g = ctx.createRadialGradient(cx, cy-r*0.2, r*0.1, cx, cy, r*1.2);
        g.addColorStop(0, color); g.addColorStop(1, color + '44');
        ctx.beginPath(); ctx.arc(cx, cy, r*1.1, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
        // Лампочка
        ctx.beginPath();
        ctx.arc(cx, cy-r*0.15, r*0.5, Math.PI, 0);
        ctx.lineTo(cx+r*0.3, cy+r*0.2);
        ctx.bezierCurveTo(cx+r*0.3, cy+r*0.45, cx-r*0.3, cy+r*0.45, cx-r*0.3, cy+r*0.2);
        ctx.closePath();
        ctx.fillStyle = '#fef08a'; ctx.fill();
        ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = r*0.06; ctx.stroke();
        // Цоколь
        ctx.beginPath(); ctx.rect(cx-r*0.22, cy+r*0.42, r*0.44, r*0.12);
        ctx.fillStyle = '#9ca3af'; ctx.fill();
        ctx.beginPath(); ctx.rect(cx-r*0.18, cy+r*0.54, r*0.36, r*0.1);
        ctx.fillStyle = '#9ca3af'; ctx.fill();
        // Свечение
        ctx.beginPath(); ctx.arc(cx, cy-r*0.15, r*0.65, 0, Math.PI*2);
        ctx.strokeStyle = '#fde047' + '55'; ctx.lineWidth = r*0.12; ctx.stroke();
        // Лучи
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = r*0.05;
        for(let a=0; a<8; a++){
            const angle = (a/8)*Math.PI*2;
            const x1=cx+Math.cos(angle)*r*0.7, y1=cy-r*0.15+Math.sin(angle)*r*0.7;
            const x2=cx+Math.cos(angle)*r*0.9, y2=cy-r*0.15+Math.sin(angle)*r*0.9;
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        }
        Achievements._drawStars(ctx, cx, cy, r, color);
    },

    _drawPuzzle(ctx, size, color) {
        const cx = size/2, cy = size/2, r = size*0.36;
        const g = ctx.createRadialGradient(cx, cy-r*0.2, r*0.1, cx, cy, r*1.2);
        g.addColorStop(0, color); g.addColorStop(1, color + '44');
        ctx.beginPath(); ctx.arc(cx, cy, r*1.1, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
        // 4 кусочка пазла
        const ps = r * 0.38;
        const pieces = [
            {x: cx-ps*0.05, y: cy-ps*0.05, c:'#60a5fa'},
            {x: cx+ps*0.05, y: cy-ps*0.05, c:'#34d399'},
            {x: cx-ps*0.05, y: cy+ps*0.05, c:'#f472b6'},
            {x: cx+ps*0.05, y: cy+ps*0.05, c:'#fbbf24'},
        ];
        pieces.forEach(({x,y,c},i) => {
            const dx = i%2===0 ? -1 : 1, dy = i<2 ? -1 : 1;
            ctx.save(); ctx.translate(x + dx*ps*0.48, y + dy*ps*0.48);
            ctx.beginPath();
            ctx.rect(-ps*0.46, -ps*0.46, ps*0.9, ps*0.9);
            ctx.fillStyle = c; ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = r*0.05; ctx.stroke();
            // Выступ пазла
            ctx.beginPath();
            if(i===0) ctx.arc(0, ps*0.46, ps*0.15, Math.PI, 0);
            if(i===1) ctx.arc(-ps*0.46, 0, ps*0.15, Math.PI*0.5, -Math.PI*0.5);
            if(i===2) ctx.arc(ps*0.46, 0, ps*0.15, -Math.PI*0.5, Math.PI*0.5);
            if(i===3) ctx.arc(0, -ps*0.46, ps*0.15, 0, Math.PI);
            ctx.fillStyle = c; ctx.fill();
            ctx.restore();
        });
        Achievements._drawStars(ctx, cx, cy, r, color);
    },

    _drawBrain(ctx, size, color) {
        const cx = size/2, cy = size/2, r = size*0.36;
        const g = ctx.createRadialGradient(cx, cy, r*0.1, cx, cy, r*1.2);
        g.addColorStop(0, color); g.addColorStop(1, color + '44');
        ctx.beginPath(); ctx.arc(cx, cy, r*1.1, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
        // Мозг — два полушария
        ctx.strokeStyle = '#e879f9'; ctx.lineWidth = r*0.07; ctx.lineCap = 'round';
        ctx.fillStyle = '#f0abfc';
        // Левое полушарие
        ctx.beginPath();
        ctx.moveTo(cx, cy-r*0.1);
        ctx.bezierCurveTo(cx-r*0.1, cy-r*0.7, cx-r*0.85, cy-r*0.6, cx-r*0.8, cy-r*0.1);
        ctx.bezierCurveTo(cx-r*0.85, cy+r*0.4, cx-r*0.2, cy+r*0.55, cx, cy+r*0.4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Правое полушарие
        ctx.beginPath();
        ctx.moveTo(cx, cy-r*0.1);
        ctx.bezierCurveTo(cx+r*0.1, cy-r*0.7, cx+r*0.85, cy-r*0.6, cx+r*0.8, cy-r*0.1);
        ctx.bezierCurveTo(cx+r*0.85, cy+r*0.4, cx+r*0.2, cy+r*0.55, cx, cy+r*0.4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Борозды
        ctx.strokeStyle = '#d946ef'; ctx.lineWidth = r*0.045;
        const grooves = [
            [cx-r*0.55, cy-r*0.35, cx-r*0.3, cy-r*0.15],
            [cx-r*0.6, cy+r*0.05, cx-r*0.25, cy+r*0.2],
            [cx+r*0.55, cy-r*0.35, cx+r*0.3, cy-r*0.15],
            [cx+r*0.6, cy+r*0.05, cx+r*0.25, cy+r*0.2],
        ];
        grooves.forEach(([x1,y1,x2,y2]) => {
            ctx.beginPath();
            ctx.moveTo(x1,y1); ctx.quadraticCurveTo((x1+x2)/2, (y1+y2)/2-r*0.1, x2,y2);
            ctx.stroke();
        });
        // Разделитель
        ctx.strokeStyle = '#a21caf'; ctx.lineWidth = r*0.05;
        ctx.beginPath(); ctx.moveTo(cx, cy-r*0.1); ctx.lineTo(cx, cy+r*0.4); ctx.stroke();
        Achievements._drawStars(ctx, cx, cy, r, color);
    },

    _drawBrainGold(ctx, size, color) {
        Achievements._drawBrain(ctx, size, color);
        const cx = size/2, cy = size/2, r = size*0.36;
        // Корона поверх
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.rect(cx-r*0.4, cy-r*0.9, r*0.8, r*0.22);
        ctx.fill();
        for(let i=0;i<5;i++){
            ctx.beginPath();
            ctx.moveTo(cx-r*0.4+i*r*0.2, cy-r*0.9);
            ctx.lineTo(cx-r*0.36+i*r*0.2, cy-r*1.12);
            ctx.lineTo(cx-r*0.32+i*r*0.2, cy-r*0.9);
            ctx.fillStyle = '#f59e0b'; ctx.fill();
        }
    },

    _drawStars(ctx, cx, cy, r, color) {
        // Маленькие звёздочки вокруг
        const positions = [
            [cx-r*0.85, cy-r*0.8], [cx+r*0.85, cy-r*0.8],
            [cx-r*1.0,  cy+r*0.1], [cx+r*1.0,  cy+r*0.1],
            [cx,        cy-r*1.1],
        ];
        positions.forEach(([x,y], i) => {
            const sr = r * (i===4 ? 0.13 : 0.09);
            ctx.save(); ctx.translate(x, y);
            ctx.beginPath();
            for(let p=0; p<5; p++){
                const a = (p*4*Math.PI/5) - Math.PI/2;
                const b = (p*4*Math.PI/5 + 2*Math.PI/5) - Math.PI/2;
                p===0 ? ctx.moveTo(Math.cos(a)*sr, Math.sin(a)*sr)
                      : ctx.lineTo(Math.cos(a)*sr, Math.sin(a)*sr);
                ctx.lineTo(Math.cos(b)*sr*0.4, Math.sin(b)*sr*0.4);
            }
            ctx.closePath();
            ctx.fillStyle = '#fde047'; ctx.fill();
            ctx.restore();
        });
    },
};


// =============================================
// STAT TRACKER
// =============================================
const StatTracker = {
    // 15-секундные таймеры для каждого типа контента
    _timers: {},   // key → setInterval id
    _secs:   {},   // key → секунды в текущей сессии
    _timerPaused: {},  // key → boolean

    // ── Ежедневный лог активности ──
    _todayKey() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    },

    _getDailyLog() {
        try { return JSON.parse(localStorage.getItem('stat_daily_log') || '{}'); } catch { return {}; }
    },

    _saveDailyLog(log) {
        localStorage.setItem('stat_daily_log', JSON.stringify(log));
    },

    // Миграция: если дневной лог пуст, но накопительные статы есть —
    // засеиваем текущий день существующими значениями
    _migrateDailyLog() {
        if (localStorage.getItem('stat_daily_migrated')) return;
        const log = this._getDailyLog();
        if (Object.keys(log).length > 0) {
            localStorage.setItem('stat_daily_migrated', '1');
            return;
        }
        const totalAnswers = this.get('puzzles') + this.get('riddles')
            + this.get('words') + this.get('math')
            + this.get('interstitials') + this.get('songs')
            + this.get('letters') + this.get('numbers') + this.get('colors');
        const totalTime = Math.round(this.getTime('songs') + this.getTime('podcasts'));
        if (totalAnswers > 0 || totalTime > 0) {
            const key = this._todayKey();
            log[key] = { answers: totalAnswers, time: totalTime };
            this._saveDailyLog(log);
        }
        localStorage.setItem('stat_daily_migrated', '1');
    },

    // Логируем +1 ответ на сегодня
    _logDailyAnswer() {
        const log = this._getDailyLog();
        const key = this._todayKey();
        if (!log[key]) log[key] = { answers: 0, time: 0, hours: {} };
        log[key].answers++;
        // Почасовой лог
        const h = String(new Date().getHours());
        if (!log[key].hours) log[key].hours = {};
        if (!log[key].hours[h]) log[key].hours[h] = { a: 0, t: 0 };
        log[key].hours[h].a++;
        this._saveDailyLog(log);
    },

    // Логируем время (целые секунды) на сегодня
    _logDailyTime(seconds) {
        if (!seconds || seconds <= 0) return;
        seconds = Math.round(seconds);
        if (seconds <= 0) return;
        const log = this._getDailyLog();
        const key = this._todayKey();
        if (!log[key]) log[key] = { answers: 0, time: 0, hours: {} };
        log[key].time += seconds;
        // Почасовой лог
        const h = String(new Date().getHours());
        if (!log[key].hours) log[key].hours = {};
        if (!log[key].hours[h]) log[key].hours[h] = { a: 0, t: 0 };
        log[key].hours[h].t += seconds;
        this._saveDailyLog(log);
    },

    // Получить почасовые данные за сегодня
    getHourlyData() {
        const log = this._getDailyLog();
        const key = this._todayKey();
        const entry = log[key] || {};
        const hours = entry.hours || {};
        const result = [];
        for (let h = 0; h < 24; h++) {
            const d = hours[String(h)] || { a: 0, t: 0 };
            result.push({ hour: h, answers: d.a || 0, time: d.t || 0 });
        }
        return result;
    },

    // Получить данные за период
    getDailyData(period) {
        const log = this._getDailyLog();
        const today = new Date();
        today.setHours(0,0,0,0);
        let days = [];

        if (period === 'day') {
            // Показываем только сегодня — одна колонка
            days = [new Date(today)];
        } else if (period === 'week') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                days.push(d);
            }
        } else if (period === 'month') {
            for (let i = 29; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                days.push(d);
            }
        } else {
            // all — все дни из лога
            const allKeys = Object.keys(log).sort();
            if (allKeys.length === 0) {
                days = [new Date(today)];
            } else {
                const start = new Date(allKeys[0] + 'T00:00:00');
                const end = new Date(today);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
                    days.push(new Date(d));
                }
                // Если больше 60 дней — группируем по неделям
                if (days.length > 60) {
                    return this._groupByWeeks(days, log, today);
                }
            }
        }

        return days.map(d => {
            const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
            const entry = log[k] || { answers: 0, time: 0 };
            return {
                date: d,
                key: k,
                answers: entry.answers || 0,
                time: entry.time || 0,
                activity: (entry.answers || 0) + Math.floor((entry.time || 0) / 60),
                isToday: d.getTime() === today.getTime()
            };
        });
    },

    _groupByWeeks(days, log, today) {
        const weeks = [];
        for (let i = 0; i < days.length; i += 7) {
            const chunk = days.slice(i, i + 7);
            let answers = 0, time = 0;
            chunk.forEach(d => {
                const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                const entry = log[k] || {};
                answers += entry.answers || 0;
                time += entry.time || 0;
            });
            weeks.push({
                date: chunk[0],
                dateEnd: chunk[chunk.length - 1],
                key: 'week',
                answers, time,
                activity: answers + Math.floor(time / 60),
                isToday: chunk.some(d => d.getTime() === today.getTime())
            });
        }
        return weeks;
    },

    // Запустить таймер (привязан к audio через pauseTimer/resumeTimer)
    startTimer(key, onCredit, threshold = 15) {
        this.stopTimer(key);
        this._secs[key] = 0;
        this._timerPaused[key] = false;
        this._timers[key] = setInterval(() => {
            if (this._timerPaused[key]) return;
            this._secs[key]++;
            if (this._secs[key] >= threshold) {
                this.stopTimer(key);
                onCredit();
            }
        }, 1000);
    },

    pauseTimer(key) { this._timerPaused[key] = true; },
    resumeTimer(key) { if (this._timers[key]) this._timerPaused[key] = false; },

    stopTimer(key) {
        if (this._timers[key]) {
            clearInterval(this._timers[key]);
            delete this._timers[key];
        }
        delete this._secs[key];
        delete this._timerPaused[key];
    },

    // Добавить секунды к общему времени
    addTime(key, seconds) {
        if (!seconds || seconds <= 0) return;
        seconds = Math.round(seconds); // целые секунды
        if (seconds <= 0) return;
        const cur = parseInt(localStorage.getItem(`stat_time_${key}`) || 0);
        localStorage.setItem(`stat_time_${key}`, cur + seconds);
        this._logDailyTime(seconds);
    },

    // Трекинг времени через timeupdate события
    trackAudioTime(audioEl, timeKey) {
        let _lastTime = null;
        let _accumulator = 0; // накопитель дробных секунд
        audioEl.addEventListener('timeupdate', () => {
            if (!audioEl.paused && _lastTime !== null) {
                const delta = audioEl.currentTime - _lastTime;
                if (delta > 0 && delta < 2) {
                    _accumulator += delta;
                    if (_accumulator >= 1) {
                        const whole = Math.floor(_accumulator);
                        this.addTime(timeKey, whole);
                        _accumulator -= whole;
                    }
                }
            }
            _lastTime = audioEl.paused ? null : audioEl.currentTime;
        });
        audioEl.addEventListener('pause', () => { _lastTime = null; });
        audioEl.addEventListener('ended', () => {
            // Сбрасываем остаток при завершении
            if (_accumulator >= 0.5) this.addTime(timeKey, 1);
            _accumulator = 0;
            _lastTime = null;
        });
    },

    // Инкремент счётчика
    inc(key) {
        const cur = parseInt(localStorage.getItem(`stat_${key}`) || 0);
        localStorage.setItem(`stat_${key}`, cur + 1);
        this._logDailyAnswer();
        // Проверяем значки
        if (typeof Badges !== 'undefined') Badges.checkAll();
    },

    get(key) { return parseInt(localStorage.getItem(`stat_${key}`) || 0); },
    getTime(key) { return parseInt(localStorage.getItem(`stat_time_${key}`) || 0); },

    // Форматирование времени
    fmtDuration(secs) {
        secs = Math.floor(secs);
        if (secs < 60) return secs + ' сек';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h} ч ${m} мин`;
        return `${m} мин ${s > 0 ? s + ' сек' : ''}`.trim();
    },

    // Сохранить достижение
    recordAchievement(section, count) {
        const key = `stat_ach_${section}`;
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        const milestone = String(count);
        data[milestone] = (data[milestone] || 0) + 1;
        localStorage.setItem(key, JSON.stringify(data));
    },

    getAchievements(section) {
        return JSON.parse(localStorage.getItem(`stat_ach_${section}`) || '{}');
    },

    // Сброс всех статов
    resetAll() {
        const keys = [
            'stat_songs','stat_letters','stat_numbers','stat_colors',
            'stat_puzzles','stat_riddles','stat_words','stat_math',
            'stat_time_songs','stat_time_podcasts',
            'stat_ach_puzzles','stat_ach_riddles',
            'achievements_best',
            'badges_unlocked',
            'viewed_letters','viewed_numbers','viewed_colors',
            'stat_interstitials','inter_best_streak',
            'stat_daily_log','stat_daily_migrated',
            'tried_songs','tried_podcasts','tried_puzzles','tried_riddles'
        ];
        keys.forEach(k => localStorage.removeItem(k));
    },

    // Считаем текущую серию дней подряд (включая сегодня)
    getDayStreak() {
        const log = this._getDailyLog();
        const today = new Date();
        today.setHours(0,0,0,0);
        let streak = 0;
        for (let i = 0; i < 400; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
            const entry = log[k];
            if (entry && ((entry.answers || 0) > 0 || (entry.time || 0) > 0)) {
                streak++;
            } else {
                // Если сегодня ещё ничего — допускаем (день не кончился), считаем от вчера
                if (i === 0) continue;
                break;
            }
        }
        return streak;
    }
};

// =============================================
// BADGES — Коллекция достижений
// =============================================
const Badges = {
    _unlocked: {},  // { badgeId: timestamp }

    // Определения всех значков
    _defs: [
        // Алфавит
        { id:'first_letter',  key:'letters', thr:1,   emoji:'🔤', name:'Первая буква',     desc:'Прослушай первую букву' },
        { id:'half_alphabet', key:'letters', thr:16,  emoji:'📖', name:'Половина алфавита', desc:'Прослушай 16 букв' },
        { id:'full_alphabet', key:'letters', thr:33,  emoji:'🎓', name:'Весь алфавит',      desc:'Прослушай все 33 буквы' },
        // Цифры
        { id:'first_number',  key:'numbers', thr:1,   emoji:'🔢', name:'Первая цифра',     desc:'Прослушай первую цифру' },
        { id:'all_numbers',   key:'numbers', thr:10,  emoji:'🧮', name:'Все цифры',        desc:'Прослушай все 10 цифр' },
        // Цвета
        { id:'first_color',   key:'colors',  thr:1,   emoji:'🎨', name:'Первый цвет',      desc:'Прослушай первый цвет' },
        { id:'all_colors',    key:'colors',  thr:12,  emoji:'🌈', name:'Все цвета',        desc:'Прослушай все 12 цветов' },
        // Слова
        { id:'first_word',    key:'words',   thr:1,   emoji:'📝', name:'Первое слово',     desc:'Собери первое слово' },
        { id:'word_collector', key:'words',   thr:10,  emoji:'📚', name:'Словарик',         desc:'Собери 10 слов' },
        { id:'word_master',   key:'words',   thr:25,  emoji:'✍️',  name:'Книгочей',         desc:'Собери 25 слов' },
        // Арифметика
        { id:'first_math',    key:'math',    thr:1,   emoji:'➕', name:'Первый пример',    desc:'Реши первый пример' },
        { id:'math_fan',      key:'math',    thr:10,  emoji:'🔢', name:'Счетовод',         desc:'Реши 10 примеров' },
        { id:'math_master',   key:'math',    thr:30,  emoji:'🧮', name:'Математик',        desc:'Реши 30 примеров' },
        // Ребусы
        { id:'first_puzzle',  key:'puzzles', thr:1,   emoji:'🧩', name:'Первый ребус',     desc:'Реши первый ребус' },
        { id:'puzzle_pro',    key:'puzzles', thr:15,  emoji:'🧠', name:'Мастер ребусов',   desc:'Реши 15 ребусов' },
        { id:'puzzle_legend', key:'puzzles', thr:40,  emoji:'💎', name:'Легенда ребусов',  desc:'Реши 40 ребусов' },
        // Загадки
        { id:'first_riddle',  key:'riddles', thr:1,   emoji:'❓', name:'Первая загадка',   desc:'Отгадай первую загадку' },
        { id:'riddle_pro',    key:'riddles', thr:15,  emoji:'🦉', name:'Знаток загадок',   desc:'Отгадай 15 загадок' },
        { id:'riddle_legend', key:'riddles', thr:40,  emoji:'👑', name:'Мудрец',           desc:'Отгадай 40 загадок' },
        // Песенки
        { id:'first_song',    key:'songs',   thr:1,   emoji:'🎵', name:'Первая песенка',   desc:'Прослушай первую песенку' },
        { id:'meloman',       key:'songs',   thr:10,  emoji:'🎶', name:'Меломан',          desc:'Прослушай 10 песенок' },
        // Перебивки
        { id:'first_inter',   key:'interstitials', thr:1,   emoji:'⚡', name:'Первая перебивка', desc:'Ответь на первую перебивку' },
        { id:'inter_fan',     key:'interstitials', thr:10,  emoji:'🎯', name:'Меткий глаз',     desc:'Ответь на 10 перебивок' },
        { id:'inter_master',  key:'interstitials', thr:30,  emoji:'🧠', name:'Мастер перебивок', desc:'Ответь на 30 перебивок' },
        // Серия дней (key: 'streak' — проверяется через getDayStreak)
        { id:'streak_week',   key:'streak', thr:7,   emoji:'📅', name:'Неделя подряд',   desc:'Занимайся 7 дней подряд' },
        { id:'streak_month',  key:'streak', thr:30,  emoji:'📅', name:'Месяц подряд',    desc:'Занимайся 30 дней подряд' },
        { id:'streak_quarter',key:'streak', thr:90,  emoji:'📅', name:'3 месяца подряд', desc:'Занимайся 90 дней подряд' },
        { id:'streak_half',   key:'streak', thr:180, emoji:'📅', name:'Полгода подряд',  desc:'Занимайся 180 дней подряд' },
        { id:'streak_year',   key:'streak', thr:365, emoji:'📅', name:'Год подряд',      desc:'Занимайся 365 дней подряд' },
        // Мета (key: null — проверяются отдельно)
        { id:'explorer',      key:null, thr:5,  emoji:'🌟', name:'Исследователь', desc:'Получи 5 значков' },
        { id:'champion',      key:null, thr:14, emoji:'🏆', name:'Чемпион',       desc:'Получи 14 значков' },
        { id:'completionist', key:null, thr:24, emoji:'💫', name:'Суперзвезда',   desc:'Получи 24 значка' },
    ],

    // SVG-иконки для значков
    _svgIcons: {
        first_letter:  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 36L22 12h4l8 24"/><path d="M18 27h12"/></svg>',
        half_alphabet: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10h28a2 2 0 012 2v24a2 2 0 01-2 2H8"/><path d="M8 10v28"/><path d="M14 18h14"/><path d="M14 24h10"/><path d="M14 30h12"/></svg>',
        full_alphabet: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6l-2 8h-8l6.5 5-2.5 8L24 22l6 5-2.5-8L34 14h-8z"/><path d="M12 36h24"/><path d="M16 40h16"/></svg>',
        first_number:  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14l-4 2v0"/><path d="M20 14v20"/><path d="M16 34h8"/></svg>',
        all_numbers:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="32" height="32" rx="4"/><path d="M16 16v16"/><path d="M24 16v16"/><path d="M32 16v16"/><path d="M8 20h32"/><path d="M8 28h32"/></svg>',
        first_color:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="16" r="5"/><circle cx="30" cy="18" r="4"/><circle cx="16" cy="26" r="4"/><path d="M24 42c8 0 16-6 16-16S34 6 24 6 8 14 8 26c0 4 2 8 5 10 1 1 1 2 0 3-1 1 0 3 1 3h10z"/></svg>',
        all_colors:    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 34c4-6 10-12 18-12s14 6 18 12"/><path d="M9 30c3-4 8-8 15-8s12 4 15 8"/><path d="M12 26c3-3 7-6 12-6s9 3 12 6"/></svg>',
        first_word:    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M32 8l6 6-20 20H12v-6z"/><path d="M28 12l6 6"/></svg>',
        word_collector: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6h20a2 2 0 012 2v32a2 2 0 01-2 2H12a2 2 0 01-2-2V8a2 2 0 012-2z"/><path d="M16 6v36"/><path d="M22 16h8"/><path d="M22 22h6"/><path d="M22 28h7"/></svg>',
        word_master:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 40l4-12L30 10l6 6L18 34z"/><path d="M26 14l6 6"/><path d="M34 10l4-4"/><path d="M12 28l6 6"/></svg>',
        first_math:    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="24" y1="12" x2="24" y2="36"/><line x1="12" y1="24" x2="36" y2="24"/></svg>',
        math_fan:      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="32" height="32" rx="4"/><line x1="16" y1="18" x2="24" y2="18"/><line x1="20" y1="14" x2="20" y2="22"/><line x1="28" y1="17" x2="36" y2="17"/><line x1="16" y1="32" x2="24" y2="32"/><line x1="28" y1="28" x2="36" y2="36"/><line x1="36" y1="28" x2="28" y2="36"/></svg>',
        math_master:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="16"/><path d="M18 18l12 12"/><path d="M30 18l-12 12"/><path d="M24 8v4"/><path d="M24 36v4"/><path d="M8 24h4"/><path d="M36 24h4"/></svg>',
        first_puzzle:  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M34 20c2-1 4 0 4 2s-2 3-4 2"/><path d="M20 14c-1-2 0-4 2-4s3 2 2 4"/><path d="M10 10h12v8c-2 1-2 5 0 6v8H10V10z"/><path d="M22 10h12v22H22v-8c2-1 2-5 0-6z"/></svg>',
        puzzle_pro:    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6c-2 4-6 6-6 10a6 6 0 0012 0c0-4-4-6-6-10z"/><path d="M20 22c-3 2-8 6-8 12h24c0-6-5-10-8-12"/><path d="M18 38h12"/><path d="M20 42h8"/></svg>',
        puzzle_legend: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6l4 12h12l-10 7 4 13-10-8-10 8 4-13-10-7h12z"/></svg>',
        first_riddle:  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="16"/><path d="M19 18c0-3 2-5 5-5s5 2 5 5c0 3-3 4-5 6"/><circle cx="24" cy="34" r="1.5" fill="currentColor"/></svg>',
        riddle_pro:    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 40c0-4-6-6-6-14a12 12 0 0124 0c0 8-6 10-6 14"/><path d="M18 40h12"/><path d="M20 44h8"/><circle cx="18" cy="20" r="2"/><circle cx="30" cy="20" r="2"/></svg>',
        riddle_legend: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 38l4-10"/><path d="M36 38l-4-10"/><path d="M8 28h32"/><path d="M16 28l2-8 6-10 6 10 2 8"/></svg>',
        first_song:    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 34V14l16-4v20"/><circle cx="14" cy="34" r="4"/><circle cx="30" cy="30" r="4"/></svg>',
        meloman:       '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 34V14l16-4v20"/><circle cx="14" cy="34" r="4"/><circle cx="30" cy="30" r="4"/><path d="M36 12c2-1 4 0 4 2"/><path d="M38 8c3-1 6 0 6 3"/></svg>',
        first_inter:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M28 6L18 24h10l-4 18 14-22H26z"/></svg>',
        inter_fan:     '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="4"/><circle cx="24" cy="24" r="1.5" fill="currentColor"/></svg>',
        inter_master:  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6c-2 4-6 6-6 10a6 6 0 0012 0c0-4-4-6-6-10z"/><path d="M20 22c-3 2-8 6-8 12h24c0-6-5-10-8-12"/><path d="M24 28l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z"/></svg>',
        explorer:      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6l3 9h9l-7 5 3 9-8-6-8 6 3-9-7-5h9z"/></svg>',
        champion:      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8h20v12a10 10 0 01-20 0V8z"/><path d="M14 14H8c0 6 3 8 6 8"/><path d="M34 14h6c0 6-3 8-6 8"/><path d="M20 30v4h8v-4"/><path d="M16 38h16"/><path d="M20 34h8v4h-8z"/></svg>',
        completionist: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4l4 8 8 1-6 6 2 8-8-4-8 4 2-8-6-6 8-1z"/><path d="M14 32l-4 4"/><path d="M34 32l4 4"/><path d="M24 34v6"/><circle cx="10" cy="38" r="2"/><circle cx="38" cy="38" r="2"/><circle cx="24" cy="42" r="2"/></svg>',
        streak_week:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="10" width="32" height="30" rx="4"/><path d="M8 18h32"/><path d="M16 6v8"/><path d="M32 6v8"/><path d="M16 26h4"/><path d="M28 26h4"/><path d="M16 32h4"/></svg>',
        streak_month:  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="10" width="32" height="30" rx="4"/><path d="M8 18h32"/><path d="M16 6v8"/><path d="M32 6v8"/><path d="M16 26h16"/><path d="M16 32h12"/></svg>',
        streak_quarter:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="10" width="32" height="30" rx="4"/><path d="M8 18h32"/><path d="M16 6v8"/><path d="M32 6v8"/><path d="M20 28l4 4 6-8"/></svg>',
        streak_half:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="16"/><path d="M24 8v6"/><path d="M24 34v6"/><path d="M8 24h6"/><path d="M34 24h6"/><path d="M24 16a8 8 0 010 16" fill="none"/><path d="M24 16v16"/></svg>',
        streak_year:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="16"/><path d="M24 12v6l4 2"/><path d="M14 38l2-4"/><path d="M34 38l-2-4"/><path d="M24 8v2"/><path d="M24 38v2"/><path d="M8 24h2"/><path d="M38 24h2"/><path d="M12 14l1.5 1.5"/><path d="M34.5 32.5l1.5 1.5"/><path d="M12 34l1.5-1.5"/><path d="M34.5 15.5l1.5-1.5"/></svg>',
    },

    _getBadgeSVG(id) {
        return this._svgIcons[id] || '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="24" cy="24" r="16"/></svg>';
    },

    init() {
        this._unlocked = JSON.parse(localStorage.getItem('badges_unlocked') || '{}');
        this._updateHomeBadge();
    },

    _save() {
        localStorage.setItem('badges_unlocked', JSON.stringify(this._unlocked));
    },

    _unlockedCount() {
        return Object.keys(this._unlocked).length;
    },

    // Проверяем все значки — вызывается после каждого изменения стата
    checkAll() {
        const newBadges = [];
        this._defs.forEach(def => {
            if (this._unlocked[def.id]) return; // уже получен

            let val;
            if (def.key === null) {
                // Мета-бейдж: считаем сколько обычных (не мета) значков открыто
                val = this._defs.filter(d => d.key !== null && this._unlocked[d.id]).length;
            } else if (def.key === 'streak') {
                val = StatTracker.getDayStreak();
            } else {
                val = StatTracker.get(def.key);
            }

            if (val >= def.thr) {
                this._unlocked[def.id] = Date.now();
                newBadges.push(def);
            }
        });

        if (newBadges.length > 0) {
            this._save();
            this._updateHomeBadge();
            // Показываем уведомление для первого нового значка
            this._notify(newBadges[0]);
            // Анимируем Гошу
            Gosha.celebrate();
        }
    },

    _notify(def) {
        const childN = getChildName();
        const badgeMsg = childN ? `🏅 ${childN}, новый значок: ${def.name}!` : `🏅 Новый значок: ${def.name}!`;
        showToast(badgeMsg, 3200);
        // Мини-конфетти
        if (window.confetti) {
            confetti({ particleCount: 50, spread: 50, origin: { y: 0.8 }, colors: ['#fbbf24','#a78bfa','#34d399','#f472b6'] });
        }
        // Гоша празднует
    },

    _updateHomeBadge() {
        const el = document.getElementById('mc-badge-count');
        if (!el) return;
        const count = this._unlockedCount();
        if (count > 0) {
            el.textContent = count;
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    },

    // Рендер экрана достижений
    show() {
        App.navigate('badges', 'Достижения');
        this._render();
    },

    _render() {
        const grid = document.getElementById('badges-grid');
        const total = this._defs.length;
        const unlocked = this._unlockedCount();

        document.getElementById('badges-unlocked').textContent = unlocked;
        document.getElementById('badges-total').textContent = total;
        const barFill = document.getElementById('badges-bar-fill');
        setTimeout(() => { barFill.style.width = (unlocked / total * 100) + '%'; }, 100);

        // Анимируем маскот на странице достижений — СТАТИЧНЫЙ (зал славы)
        const mascotWrap = document.getElementById('badges-mascot-wrap');
        if (mascotWrap) {
            mascotWrap.className = 'badges-mascot-wrap';
        }

        grid.innerHTML = '';
        this._defs.forEach((def, i) => {
            const isUnlocked = !!this._unlocked[def.id];
            let progress = 0;
            if (def.key === null) {
                progress = this._defs.filter(d => d.key !== null && this._unlocked[d.id]).length;
            } else if (def.key === 'streak') {
                progress = StatTracker.getDayStreak();
            } else {
                progress = StatTracker.get(def.key);
            }
            const pct = Math.min(progress / def.thr * 100, 100);
            const date = isUnlocked ? new Date(this._unlocked[def.id]) : null;
            const dateStr = date ? `${date.getDate()}.${date.getMonth()+1}.${date.getFullYear()}` : '';

            const card = document.createElement('div');
            card.className = 'badge-card' + (isUnlocked ? ' unlocked' : '');
            card.style.animationDelay = (i * 0.04) + 's';
            card.innerHTML = `
                <div class="badge-icon-wrap">${this._getBadgeSVG(def.id)}</div>
                <div class="badge-name">${def.name}</div>
                <div class="badge-desc">${isUnlocked ? dateStr : def.desc}</div>
                <div class="badge-progress-bottom">
                    <div class="badge-progress-bar"><div class="badge-progress-fill" style="width:${pct}%"></div></div>
                    <div class="badge-progress-text">${Math.min(progress, def.thr)} / ${def.thr}</div>
                </div>
            `;
            grid.appendChild(card);
        });
    }
};

// =============================================
// GOSHA — Анимации маскота
// =============================================
const Gosha = {
    _lastCelebrate: 0,

    // Вызывается при получении нового значка
    celebrate() {
        const wrap = document.querySelector('.home-mascot-wrap');
        if (!wrap) return;
        // Не чаще раза в 3 сек
        if (Date.now() - this._lastCelebrate < 3000) return;
        this._lastCelebrate = Date.now();

        wrap.classList.remove('gosha-idle');
        wrap.classList.add('gosha-celebrate');
        wrap.addEventListener('animationend', () => {
            wrap.classList.remove('gosha-celebrate');
            wrap.classList.add('gosha-idle');
        }, { once: true });
    },

    // Подпрыгивание при возврате на главную после прогресса
    bounce() {
        const wrap = document.querySelector('.home-mascot-wrap');
        if (!wrap) return;
        wrap.classList.add('gosha-bounce');
        wrap.addEventListener('animationend', () => {
            wrap.classList.remove('gosha-bounce');
        }, { once: true });
    }
};
// -------- AUDIO MANAGER --------
// Keeps only one audio playing globally; persists across section changes
const AudioMgr = {
    _current: null,
    _section: null,

    play(audioEl, section) {
        if (this._current && this._current !== audioEl) {
            this._current.pause();
        }
        this._current = audioEl;
        this._section = section;
        audioEl.play().catch(() => {});
    },

    stop(section) {
        // Only stop if section matches (or no section passed = force stop)
        if (!section || this._section === section) {
            if (this._current) this._current.pause();
            this._current = null;
        }
    },

    isCurrent(audioEl) {
        return this._current === audioEl;
    }
};

// -------- HELPERS --------
function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
}

function setupProgress(audio, fillId, curId, durId, wrapId) {
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const pct = audio.currentTime / audio.duration * 100;
        document.getElementById(fillId).style.width = pct + '%';
        document.getElementById(curId).textContent = fmtTime(audio.currentTime);
        document.getElementById(durId).textContent = fmtTime(audio.duration);
    });
    const wrap = document.getElementById(wrapId);
    if (wrap) {
        wrap.addEventListener('click', e => {
            if (!audio.duration) return;
            const r = wrap.getBoundingClientRect();
            audio.currentTime = (e.clientX - r.left) / r.width * audio.duration;
        });
    }
}

// =============================================
// MEDIA — Alphabet / Numbers / Colors
// =============================================
const Media = {
    player: new Audio(),
    video:  null,
    currentList: [],
    index: 0,
    isShuffle: false,
    isRepeat:  false,
    _sectionType: '',

    initSection(type) {
        this._sectionType = type;
        AudioMgr.stop(); // Stop any other section audio

        let items = [];
        const TITLES = { alphabet: 'Алфавит', numbers: 'Цифры', colors: 'Цвета' };

        if (type === 'alphabet') {
            // Маппинг кириллических букв → имена файлов
            const LETTER_MAP = {
                'А':'a', 'Б':'b', 'В':'v', 'Г':'g', 'Д':'d',
                'Е':'e', 'Ё':'yo', 'Ж':'zh', 'З':'z', 'И':'i',
                'Й':'j', 'К':'k', 'Л':'l', 'М':'m', 'Н':'n',
                'О':'o', 'П':'p', 'Р':'r', 'С':'s', 'Т':'t',
                'У':'u', 'Ф':'f', 'Х':'kh', 'Ц':'ts', 'Ч':'ch',
                'Ш':'sh', 'Щ':'shch', 'Ъ':'_', 'Ы':'y', 'Ь':'_',
                'Э':'e', 'Ю':'yu', 'Я':'ya'
            };
            // Аудио-файлы: bukva_a.mp3 (для Ъ и Ь — буква_.mp3, для Э — bukva_e.mp3)
            const AUDIO_MAP = {
                'А':'bukva_a', 'Б':'bukva_b', 'В':'bukva_', 'Г':'bukva_g', 'Д':'bukva_d',
                'Е':'bukva_e', 'Ё':'bukva_yo', 'Ж':'bukva_zh', 'З':'bukva_z', 'И':'bukva_i',
                'Й':'bukva_', 'К':'bukva_k', 'Л':'bukva_l', 'М':'bukva_m', 'Н':'bukva_n',
                'О':'bukva_o', 'П':'bukva_p', 'Р':'bukva_r', 'С':'bukva_s', 'Т':'bukva_t',
                'У':'bukva_u', 'Ф':'bukva_f', 'Х':'bukva_kh', 'Ц':'bukva_ts', 'Ч':'bukva_ch',
                'Ш':'bukva_sh', 'Щ':'bukva_shch', 'Ъ':'bukva_', 'Ы':'bukva_y', 'Ь':'bukva_',
                'Э':'bukva_', 'Ю':'bukva_yu', 'Я':'bukva_ya'
            };
            // Видео: a.mp4 (для Ъ и Ь видео нет, для Й тоже нет)
            const VIDEO_EXT = { 'hf': 'MP4', 'sf': 'MP4', 'ee': 'MP4' };
            const VIDEO_MAP = {
                'А':'a', 'Б':'b', 'В':'v', 'Г':'g', 'Д':'d',
                'Е':'e', 'Ё':'yo', 'Ж':'zh', 'З':'z', 'И':'i',
                'Й':'y',  'К':'k', 'Л':'l', 'М':'m', 'Н':'n',
                'О':'o', 'П':'p', 'Р':'r', 'С':'s', 'Т':'t',
                'У':'u', 'Ф':'f', 'Х':'kh', 'Ц':'ts', 'Ч':'ch',
                'Ш':'sh', 'Щ':'shch', 'Ъ':'hf', 'Ы':'ee',  'Ь':'sf',
                'Э':'Э', 'Ю':'yu', 'Я':'ya'
            };
            // Специальные кириллические имена (Буква Б.mp3 и т.д.)
            const AUDIO_CYR = { 'Б':'Буква Б', 'Ы':'Буква Ы', 'Ь':'Буква Ь', 'Э':'Буква Э' };
            const letters = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
            items = letters.map(l => {
                const audioFile = AUDIO_CYR[l]
                    ? `assets/audio/letters_songs/${AUDIO_CYR[l]}.mp3`
                    : `assets/audio/letters_songs/${AUDIO_MAP[l]}.mp3`;
                const vf = VIDEO_MAP[l];
                const videoFile = vf ? `assets/video/letters_video/${vf}.${VIDEO_EXT[vf] || 'mp4'}` : null;
                return { name: l, label: `Буква ${l}`, icon: '🔤', audio: audioFile, video: videoFile };
            });
        } else if (type === 'numbers') {
            const nums = ['0','1','2','3','4','5','6','7','8','9'];
            items = nums.map(n => ({
                name: n, label: `Цифра ${n}`, icon: '🔢',
                audio: `assets/audio/numbers_songs/${n}.mp3`,
                video: `assets/video/numbers_video/${n}.MP4`
            }));
        } else if (type === 'colors') {
            const COLORS = [
                { name:'Красный',    hex:'#ef4444', emoji:'🔴', file:'krasnyj',     videoFile:'krasnyj' },
                { name:'Оранжевый',  hex:'#f97316', emoji:'🟠', file:'oranzhevyj',  videoFile:null },
                { name:'Жёлтый',     hex:'#fbbf24', emoji:'🟡', file:'zhyoltyj',    videoFile:null },
                { name:'Зелёный',    hex:'#22c55e', emoji:'🟢', file:'zelyonyj',    videoFile:null },
                { name:'Синий',      hex:'#3b82f6', emoji:'🔵', file:'sinij',       videoFile:null },
                { name:'Фиолетовый', hex:'#a855f7', emoji:'🟣', file:'fioletovyj',  videoFile:null },
                { name:'Розовый',    hex:'#ec4899', emoji:'🌸', file:'rozovyj',     videoFile:null },
                { name:'Голубой',    hex:'#06b6d4', emoji:'🩵', file:'goluboj',     videoFile:null },
                { name:'Белый',      hex:'#f1f5f9', emoji:'⬜', file:'belyj',       videoFile:'belyj' },
                { name:'Чёрный',     hex:'#1e293b', emoji:'⬛', file:'chyornyj',    videoFile:null },
                { name:'Серый',      hex:'#94a3b8', emoji:'🩶', file:'seryj',       videoFile:'seryj' },
                { name:'Коричневый', hex:'#92400e', emoji:'🟫', file:'korichnevyj', videoFile:'korichnevyj' },
            ];
            items = COLORS.map(c => ({
                name: c.name, label: c.name, icon: c.emoji, hex: c.hex,
                audio: `assets/audio/colors_songs/${c.file}.mp3`,
                video: c.videoFile ? `assets/video/colors_video/${c.videoFile}.mp4` : null
            }));
        }

        this.currentList = items;
        const startIndex = Math.floor(Math.random() * items.length);
        this.index = startIndex;
        App.navigate('media-page', TITLES[type] || type);

        this._renderGrid(type);
        setupProgress(this.player, 'progress-bar', 'time-cur', 'time-dur', 'prog-wrap');
        this.player.onended = () => {
            // Засчитываем прослушивание
            const _sk = this._sectionType === 'alphabet' ? 'letters'
                      : this._sectionType === 'numbers'  ? 'numbers' : 'colors';
            const _item = this.currentList[this.index];
            StatTracker.inc(_sk);
            const viewed = JSON.parse(localStorage.getItem(`viewed_${_sk}`) || '[]');
            if (_item && !viewed.includes(_item.name)) {
                viewed.push(_item.name);
                localStorage.setItem(`viewed_${_sk}`, JSON.stringify(viewed));
            }

            if (this.isRepeat) { this.play(this.index); return; }
            document.getElementById('play-btn').innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><polygon points="5,3 19,12 5,21"/></svg>';
            // Перебивка после N элементов (если показалась — пауза перед следующим)
            const interTriggered = Interstitials.bump('media');
            if (!interTriggered) {
                setTimeout(() => this.next(), 1000);
            } else {
                // Ждём закрытия перебивки, потом переключаем
                const waitClose = setInterval(() => {
                    if (!Interstitials._active) { clearInterval(waitClose); this.next(); }
                }, 300);
            }
        };
        this.play(startIndex);
    },

    _renderGrid(type) {
        const grid = document.getElementById('media-grid');
        grid.className = type === 'colors' ? 'menu-grid' : 'chips-grid';
        grid.innerHTML = '';

        this.currentList.forEach((item, i) => {
            const btn = document.createElement('button');
            if (type === 'colors') {
                btn.className = 'color-chip';
                btn.textContent = item.name;
                btn.style.background = item.hex;
                if (item.name === 'Белый') btn.style.color = '#333';
            } else {
                btn.className = 'chip';
                btn.textContent = item.name;
            }
            btn.dataset.idx = i;
            btn.addEventListener('click', () => this.play(i));
            grid.appendChild(btn);
        });
    },

    play(i) {
        this.index = i;
        const item = this.currentList[i];

        // Video
        const vid = document.getElementById('global-video');
        const placeholder = document.getElementById('video-placeholder');
        document.getElementById('video-label').textContent = item.label;

        // Полный сброс видео — скрываем элемент, показываем placeholder
        vid.pause();
        vid.removeAttribute('src');
        vid.load();
        vid.style.display = 'none';
        placeholder.style.display = 'flex';

        if (item.video) {
            vid.onloadeddata = () => {
                vid.style.display = 'block';
                placeholder.style.display = 'none';
                vid.play().catch(() => {});
            };
            vid.onerror = () => {
                vid.style.display = 'none';
                placeholder.style.display = 'flex';
            };
            vid.src = item.video;
            vid.load();
        }

        // Audio
        this.player.src = item.audio;
        AudioMgr.play(this.player, 'media');
        document.getElementById('play-btn').innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        document.getElementById('track-name').textContent = item.label;
        document.getElementById('track-icon').textContent = item.icon;
        document.getElementById('track-sub').textContent  = this._sectionType === 'alphabet' ? 'Кириллический алфавит' : this._sectionType === 'colors' ? 'Учим цвета' : 'Учим цифры';
        document.getElementById('progress-bar').style.width = '0%';

        // Highlight chip
        document.querySelectorAll('#media-grid button').forEach((b, idx) => {
            b.classList.toggle('active', idx === i);
        });
    },

    toggle() {
        if (this.player.paused) {
            AudioMgr.play(this.player, 'media');
            document.getElementById('play-btn').innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        } else {
            this.player.pause();
            document.getElementById('play-btn').innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><polygon points="5,3 19,12 5,21"/></svg>';
        }
    },

    prev() {
        const prev = (this.index - 1 + this.currentList.length) % this.currentList.length;
        this.play(prev);
    },

    next() {
        const next = this.isShuffle
            ? Math.floor(Math.random() * this.currentList.length)
            : (this.index + 1) % this.currentList.length;
        this.play(next);
    },

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        document.getElementById('shuffle-btn').classList.toggle('active', this.isShuffle);
        showToast(this.isShuffle ? '🔀 Перемешать вкл.' : '🔀 Перемешать выкл.');
    },

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        document.getElementById('repeat-btn').classList.toggle('active', this.isRepeat);
        showToast(this.isRepeat ? '🔁 Повтор вкл.' : '🔁 Повтор выкл.');
    }
};

// =============================================
// WORDS — Собери слово из букв
// =============================================
const Words = {
    _level: 'easy',
    _solved: false,
    _current: null,
    _slots: [],        // массив: null или буква
    _sessionScore: 0,
    _queue: [],
    _qpos: 0,

    _data: {
        easy: [
            { word:'КОТ', emoji:'🐱' }, { word:'ДОМ', emoji:'🏠' }, { word:'ШАР', emoji:'🎈' },
            { word:'ЛУК', emoji:'🧅' }, { word:'СОН', emoji:'😴' }, { word:'МАК', emoji:'🌺' },
            { word:'СОК', emoji:'🧃' }, { word:'ЛЕС', emoji:'🌲' }, { word:'НОС', emoji:'👃' },
            { word:'МЯЧ', emoji:'⚽' }, { word:'ЛЕВ', emoji:'🦁' }, { word:'КИТ', emoji:'🐳' },
            { word:'ЖУК', emoji:'🪲' }, { word:'ДЫМ', emoji:'💨' }, { word:'ЛУЧ', emoji:'☀️' },
            { word:'МЁД', emoji:'🍯' }, { word:'СЫР', emoji:'🧀' }, { word:'ПЁС', emoji:'🐕' },
        ],
        medium: [
            { word:'РЫБА', emoji:'🐟' }, { word:'ЛУНА', emoji:'🌙' }, { word:'ЗИМА', emoji:'❄️' },
            { word:'ЛИСА', emoji:'🦊' }, { word:'РОЗА', emoji:'🌹' }, { word:'КАША', emoji:'🥣' },
            { word:'УТКА', emoji:'🦆' }, { word:'ТОРТ', emoji:'🎂' }, { word:'ГРИБ', emoji:'🍄' },
            { word:'МОСТ', emoji:'🌉' }, { word:'АРБУЗ', emoji:'🍉' }, { word:'ЛИСТ', emoji:'🍃' },
            { word:'ПАУК', emoji:'🕷️' }, { word:'ВОЛК', emoji:'🐺' }, { word:'СЛОН', emoji:'🐘' },
        ],
        hard: [
            { word:'КНИГА', emoji:'📖' }, { word:'ШКОЛА', emoji:'🏫' }, { word:'КОШКА', emoji:'🐈' },
            { word:'МЫШКА', emoji:'🐭' }, { word:'ОБЛАКО', emoji:'☁️' }, { word:'ДЕРЕВО', emoji:'🌳' },
            { word:'СОЛНЦЕ', emoji:'☀️' }, { word:'РАКЕТА', emoji:'🚀' }, { word:'ЯБЛОКО', emoji:'🍎' },
            { word:'ЗВЕЗДА', emoji:'⭐' }, { word:'БАБОЧКА', emoji:'🦋' }, { word:'РАДУГА', emoji:'🌈' },
        ],
    },

    // Русский алфавит для букв-обманок
    _alphabet: 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ',

    init() {
        AudioMgr.stop();
        this._sessionScore = 0;
        this._rebuildQueue();
        App.navigate('words', 'Слова');
        this._updateScore();
        this._renderLevelBtns();
        this.show();
    },

    _shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    _rebuildQueue() {
        const list = this._data[this._level];
        this._queue = this._shuffle([...Array(list.length).keys()]);
        this._qpos = 0;
    },

    _getCurrent() {
        const list = this._data[this._level];
        const idx = this._queue[this._qpos % this._queue.length];
        return list[idx];
    },

    setLevel(lv, btn) {
        this._level = lv;
        this._rebuildQueue();
        this._renderLevelBtns();
        this.show();
    },

    _renderLevelBtns() {
        document.querySelectorAll('.words-lvl-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.lvl === this._level);
        });
    },

    _getDecoyLetters(word, count) {
        const wordLetters = new Set(word.split(''));
        const available = this._alphabet.split('').filter(l => !wordLetters.has(l));
        return this._shuffle(available).slice(0, count);
    },

    show() {
        this._solved = false;
        this._current = this._getCurrent();
        document.activeElement?.blur();

        // Сброс старых состояний (iOS tap/focus fix)
        document.querySelectorAll('.words-slot, .words-tile').forEach(el => {
            el.classList.remove('filled', 'correct', 'used');
            el.blur();
        });

        const word = this._current.word;
        const letters = word.split('');

        // Слоты
        this._slots = new Array(letters.length).fill(null);

        // Буквы-обманки
        const decoyCount = this._level === 'easy' ? 0 : this._level === 'medium' ? 2 : 4;
        const decoys = this._getDecoyLetters(word, decoyCount);
        const allTiles = this._shuffle([...letters, ...decoys]);

        // Рендер
        document.getElementById('words-emoji').textContent = this._current.emoji;
        document.getElementById('words-msg').textContent = '';
        document.getElementById('words-msg').className = 'words-msg';

        // Чистый рендер без анимаций
        const slotsEl = document.getElementById('words-slots');
        const tilesEl = document.getElementById('words-tiles');
        slotsEl.innerHTML = '';
        tilesEl.innerHTML = '';
        slotsEl.classList.add('no-anim');
        tilesEl.classList.add('no-anim');

        this._renderSlots();
        this._renderTiles(allTiles);

        // Включаем анимации после первого кадра
        requestAnimationFrame(() => {
            slotsEl.classList.remove('no-anim');
            tilesEl.classList.remove('no-anim');
        });
    },

    _renderSlots() {
        const container = document.getElementById('words-slots');
        container.innerHTML = '';
        this._slots.forEach((letter, i) => {
            const slot = document.createElement('div');
            slot.className = 'words-slot' + (letter ? ' filled' : '');
            slot.textContent = letter || '';
            slot.dataset.idx = i;
            if (letter) {
                slot.addEventListener('click', () => this._removeFromSlot(i));
            }
            container.appendChild(slot);
        });
    },

    _renderTiles(tiles) {
        const container = document.getElementById('words-tiles');
        container.innerHTML = '';
        // Сохраняем tiles для переиспользования
        this._tiles = tiles;
        this._tileUsed = new Array(tiles.length).fill(false);

        tiles.forEach((letter, i) => {
            const tile = document.createElement('button');
            tile.className = 'words-tile';
            tile.textContent = letter;
            tile.dataset.tidx = i;
            tile.addEventListener('click', () => this._placeTile(i));
            container.appendChild(tile);
        });
    },

    _placeTile(tileIdx) {
        if (this._solved || this._tileUsed[tileIdx]) return;

        // Найти первый свободный слот
        const slotIdx = this._slots.indexOf(null);
        if (slotIdx === -1) return;

        this._playTick();
        this._slots[slotIdx] = this._tiles[tileIdx];
        this._tileUsed[tileIdx] = true;
        document.activeElement?.blur();

        // Обновляем UI
        this._renderSlots();
        const tileEl = document.querySelector(`.words-tile[data-tidx="${tileIdx}"]`);
        if (tileEl) { tileEl.classList.add('used'); tileEl.blur(); }

        // Проверяем заполненность
        if (!this._slots.includes(null)) {
            this._checkWord();
        }
    },

    _removeFromSlot(slotIdx) {
        if (this._solved) return;
        const letter = this._slots[slotIdx];
        if (!letter) return;

        this._slots[slotIdx] = null;

        // Вернуть плитку — находим первую использованную плитку с этой буквой
        for (let i = 0; i < this._tiles.length; i++) {
            if (this._tileUsed[i] && this._tiles[i] === letter) {
                this._tileUsed[i] = false;
                const tileEl = document.querySelector(`.words-tile[data-tidx="${i}"]`);
                if (tileEl) tileEl.classList.remove('used');
                break;
            }
        }

        this._renderSlots();
        document.getElementById('words-msg').textContent = '';
        document.getElementById('words-msg').className = 'words-msg';
    },

    _checkWord() {
        const assembled = this._slots.join('');
        const correct = this._current.word;
        const msgEl = document.getElementById('words-msg');

        if (assembled === correct) {
            this._solved = true;
            this._sessionScore++;
            this._updateScore();
            StatTracker.inc('words');

            playCorrectSound('words');

            msgEl.textContent = this._getSuccessPhrase();
            msgEl.className = 'words-msg words-msg-ok';

            // Подсветить слоты зелёным
            document.querySelectorAll('.words-slot').forEach(s => s.classList.add('correct'));

            // Конфетти
            if (window.confetti) {
                confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
            }

            // Гоша радуется

            // Перебивка после N слов
            const _interW = Interstitials.bump('words');

            // Авто-переход (задерживаем если перебивка)
            if (!_interW) {
                setTimeout(() => { if (this._solved) this.next(); }, 2200);
            } else {
                const _wc = setInterval(() => {
                    if (!Interstitials._active) { clearInterval(_wc); this.next(); }
                }, 300);
            }
        } else {
            playWrongSound('words');
            msgEl.textContent = 'Попробуй ещё раз!';
            msgEl.className = 'words-msg words-msg-err';

            // Тряска слотов
            const slotsEl = document.getElementById('words-slots');
            slotsEl.classList.add('words-shake');
            setTimeout(() => slotsEl.classList.remove('words-shake'), 500);
        }
    },

    _getSuccessPhrase() {
        return getPersonalPraise();
    },

    hint() {
        if (this._solved) return;
        // Подставить первую незаполненную или неправильную букву
        const word = this._current.word;

        // Найти первый пустой слот
        const emptyIdx = this._slots.indexOf(null);
        if (emptyIdx === -1) return;

        const correctLetter = word[emptyIdx];

        // Найти плитку с этой буквой среди неиспользованных
        for (let i = 0; i < this._tiles.length; i++) {
            if (!this._tileUsed[i] && this._tiles[i] === correctLetter) {
                this._placeTile(i);
                showToast('💡 Подсказка: ' + correctLetter);
                return;
            }
        }
        showToast('🤔 Попробуй убрать неправильные буквы');
    },

    next() {
        this._qpos++;
        if (this._qpos >= this._queue.length) {
            this._rebuildQueue();
        }
        this.show();
    },

    _updateScore() {
        const el = document.getElementById('words-score');
        if (el) el.textContent = this._sessionScore;
    },

    // Тихий клик при размещении буквы
    _playTick() {
        if (!getSoundSetting('snd-words-correct')) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch(e) {}
    }
};

// =============================================
// ARITHMETIC — Арифметика
// =============================================
const Arithmetic = {
    _level: 'easy',
    _solved: false,
    _current: null,  // { expr, answer, answerStr }
    _slots: [],
    _tiles: [],
    _tileUsed: [],
    _sessionScore: 0,

    init() {
        AudioMgr.stop();
        this._sessionScore = 0;
        App.navigate('arithmetic', 'Арифметика');
        this._updateScore();
        this._renderLevelBtns();
        this.show();
    },

    _shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    _rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Генерация примера в зависимости от уровня
    _generate() {
        let a, b, op, answer, expr;

        if (this._level === 'easy') {
            // Сложение/вычитание до 10, результат 0–10
            op = Math.random() < 0.5 ? '+' : '−';
            if (op === '+') {
                a = this._rand(1, 9);
                b = this._rand(0, 10 - a);
                answer = a + b;
            } else {
                a = this._rand(1, 10);
                b = this._rand(0, a);
                answer = a - b;
            }
            expr = `${a} ${op} ${b}`;
        } else if (this._level === 'medium') {
            // Сложение/вычитание до 20, результат 0–20
            const type = this._rand(0, 2);
            if (type === 0) {
                op = '+'; a = this._rand(2, 15); b = this._rand(1, 20 - a);
                answer = a + b;
            } else if (type === 1) {
                op = '−'; a = this._rand(5, 20); b = this._rand(1, a);
                answer = a - b;
            } else {
                op = '×'; a = this._rand(1, 5); b = this._rand(1, 5);
                answer = a * b;
            }
            expr = `${a} ${op} ${b}`;
        } else {
            // Сложение до 50, вычитание до 30, умножение до 9×9
            const type = this._rand(0, 3);
            if (type === 0) {
                op = '+'; a = this._rand(10, 40); b = this._rand(5, 50 - a);
                answer = a + b;
            } else if (type === 1) {
                op = '−'; a = this._rand(10, 50); b = this._rand(5, a);
                answer = a - b;
            } else if (type === 2) {
                op = '×'; a = this._rand(2, 9); b = this._rand(2, 9);
                answer = a * b;
            } else {
                // Деление без остатка
                b = this._rand(2, 9);
                answer = this._rand(1, 9);
                a = b * answer;
                op = '÷';
            }
            expr = `${a} ${op} ${b}`;
        }

        return { expr, answer, answerStr: String(answer) };
    },

    setLevel(lv) {
        this._level = lv;
        this._renderLevelBtns();
        this.show();
    },

    _renderLevelBtns() {
        document.querySelectorAll('#arithmetic .words-lvl-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.lvl === this._level);
        });
    },

    show() {
        this._solved = false;
        this._current = this._generate();
        // Снимаем фокус и старые состояния (iOS tap/focus fix)
        document.activeElement?.blur();
        document.querySelectorAll('#math-slots .words-slot, #math-tiles .words-tile').forEach(el => {
            el.classList.remove('filled', 'correct', 'used');
            el.blur();
        });

        const ansDigits = this._current.answerStr.split('');

        this._slots = new Array(ansDigits.length).fill(null);

        // Цифры-обманки
        const decoyCount = this._level === 'easy' ? 2 : this._level === 'medium' ? 3 : 4;
        const ansSet = new Set(ansDigits);
        let decoys = [];
        const pool = '0123456789'.split('').filter(d => !ansSet.has(d));
        decoys = this._shuffle(pool).slice(0, decoyCount);
        const allTiles = this._shuffle([...ansDigits, ...decoys]);

        // Рендер
        document.getElementById('math-problem').textContent = this._current.expr + ' = ?';
        document.getElementById('math-msg').textContent = '';
        document.getElementById('math-msg').className = 'words-msg';

        // Чистый рендер без анимаций
        const slotsEl = document.getElementById('math-slots');
        const tilesEl = document.getElementById('math-tiles');
        slotsEl.innerHTML = '';
        tilesEl.innerHTML = '';
        slotsEl.classList.add('no-anim');
        tilesEl.classList.add('no-anim');

        this._renderSlots();
        this._renderTiles(allTiles);

        // Включаем анимации после первого кадра
        requestAnimationFrame(() => {
            slotsEl.classList.remove('no-anim');
            tilesEl.classList.remove('no-anim');
        });
    },

    _renderSlots() {
        const container = document.getElementById('math-slots');
        container.innerHTML = '';
        this._slots.forEach((digit, i) => {
            const slot = document.createElement('div');
            slot.className = 'words-slot' + (digit !== null ? ' filled' : '');
            slot.textContent = digit !== null ? digit : '';
            slot.dataset.idx = i;
            if (digit !== null) {
                slot.addEventListener('click', () => this._removeFromSlot(i));
            }
            container.appendChild(slot);
        });
    },

    _renderTiles(tiles) {
        const container = document.getElementById('math-tiles');
        container.innerHTML = '';
        this._tiles = tiles;
        this._tileUsed = new Array(tiles.length).fill(false);

        tiles.forEach((digit, i) => {
            const tile = document.createElement('button');
            tile.className = 'words-tile';
            tile.textContent = digit;
            tile.dataset.tidx = i;
            tile.addEventListener('click', () => this._placeTile(i));
            container.appendChild(tile);
        });
    },

    _placeTile(tileIdx) {
        if (this._solved || this._tileUsed[tileIdx]) return;
        const slotIdx = this._slots.indexOf(null);
        if (slotIdx === -1) return;

        this._playTick();
        this._slots[slotIdx] = this._tiles[tileIdx];
        this._tileUsed[tileIdx] = true;
        document.activeElement?.blur();

        this._renderSlots();
        const tileEl = document.querySelector(`#math-tiles .words-tile[data-tidx="${tileIdx}"]`);
        if (tileEl) { tileEl.classList.add('used'); tileEl.blur(); }

        if (!this._slots.includes(null)) {
            this._checkAnswer();
        }
    },

    _removeFromSlot(slotIdx) {
        if (this._solved) return;
        const digit = this._slots[slotIdx];
        if (digit === null) return;

        this._slots[slotIdx] = null;

        for (let i = 0; i < this._tiles.length; i++) {
            if (this._tileUsed[i] && this._tiles[i] === digit) {
                this._tileUsed[i] = false;
                const tileEl = document.querySelector(`#math-tiles .words-tile[data-tidx="${i}"]`);
                if (tileEl) tileEl.classList.remove('used');
                break;
            }
        }

        this._renderSlots();
        document.getElementById('math-msg').textContent = '';
        document.getElementById('math-msg').className = 'words-msg';
    },

    _checkAnswer() {
        const assembled = this._slots.join('');
        const correct = this._current.answerStr;
        const msgEl = document.getElementById('math-msg');

        if (assembled === correct) {
            this._solved = true;
            this._sessionScore++;
            this._updateScore();
            StatTracker.inc('math');

            playCorrectSound('math');

            const mathPraise = getPersonalPraise();
            msgEl.textContent = mathPraise;
            msgEl.className = 'words-msg words-msg-ok';

            document.querySelectorAll('#math-slots .words-slot').forEach(s => s.classList.add('correct'));

            if (window.confetti) {
                confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
            }

            // Гоша радуется

            // Перебивка после N примеров
            const _interM = Interstitials.bump('math');

            if (!_interM) {
                setTimeout(() => { if (this._solved) this.next(); }, 2200);
            } else {
                const _mc = setInterval(() => {
                    if (!Interstitials._active) { clearInterval(_mc); this.next(); }
                }, 300);
            }
        } else {
            playWrongSound('math');
            msgEl.textContent = 'Попробуй ещё раз!';
            msgEl.className = 'words-msg words-msg-err';

            const slotsEl = document.getElementById('math-slots');
            slotsEl.classList.add('words-shake');
            setTimeout(() => slotsEl.classList.remove('words-shake'), 500);
        }
    },

    hint() {
        if (this._solved) return;
        const answer = this._current.answerStr;
        const emptyIdx = this._slots.indexOf(null);
        if (emptyIdx === -1) return;

        const correctDigit = answer[emptyIdx];

        for (let i = 0; i < this._tiles.length; i++) {
            if (!this._tileUsed[i] && this._tiles[i] === correctDigit) {
                this._placeTile(i);
                showToast('💡 Подсказка: ' + correctDigit);
                return;
            }
        }
        showToast('🤔 Попробуй убрать неправильные цифры');
    },

    next() {
        this.show();
    },

    _updateScore() {
        const el = document.getElementById('math-score');
        if (el) el.textContent = this._sessionScore;
    },

    _playTick() {
        if (!getSoundSetting('snd-math-correct')) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch(e) {}
    }
};

// =============================================
// SONGS
// =============================================
const Songs = {
    audio: new Audio(),
    _allSongs: [],
    _filtered: [],
    index: -1,
    isShuffle: false,
    isRepeat: false,

    init() {
        App.navigate('songs', 'Песенки');
        AudioMgr.stop();

        // Load from admin data or defaults
        const saved = this._loadData();
        this._allSongs = saved.length ? saved : [
            { id:1,  name:'Колыбельная',             duration:'', src:'assets/audio/songs/kolybelnaya.mp3',             video:'assets/video/songs_video/kolybelnaya.mp4' },
            { id:2,  name:'Песенка для мамы',         duration:'', src:'assets/audio/songs/pesenka_dlya_mamy.mp3',         video:null },
            { id:3,  name:'Песенка про слона',        duration:'', src:'assets/audio/songs/pesenka_pro_clona.mp3',        video:'assets/video/songs_video/pesenka_pro_slona.mp4' },
            { id:4,  name:'Песенка про Деда Мороза',  duration:'', src:'assets/audio/songs/pesenka_pro_deda_moroza.mp3',  video:null },
            { id:5,  name:'Песенка про февраль',      duration:'', src:'assets/audio/songs/pesenka_pro_fevral.mp3',      video:null },
            { id:6,  name:'Песенка про льва',         duration:'', src:'assets/audio/songs/pesenka_pro_lva.mp3',         video:'assets/video/songs_video/pesenka_pro_lva.mp4' },
            { id:7,  name:'Песенка про неделю',       duration:'', src:'assets/audio/songs/pesenka_pro_nedelyu.mp3',     video:null },
            { id:8,  name:'Песенка про носорога',     duration:'', src:'assets/audio/songs/pesenka_pro_nosoroga.mp3',    video:'assets/video/songs_video/pesenka_pro_nosoroga.mp4' },
            { id:9,  name:'Песенка про папу',         duration:'', src:'assets/audio/songs/pesenka_pro_papu.mp3',         video:null },
            { id:10, name:'Песенка про умывание',     duration:'', src:'assets/audio/songs/pesenka_pro_umyvanie.mp3',     video:null },
            { id:11, name:'Песенка про январь',       duration:'', src:'assets/audio/songs/pesenka_pro_yanvar.mp3',       video:null },
            { id:12, name:'Песенка про зебру',        duration:'', src:'assets/audio/songs/pesenka_pro_zebru.mp3',        video:'assets/video/songs_video/pesenka_pro_zebru.mp4' },
            { id:13, name:'В лесу родилась ёлочка',   duration:'', src:'assets/audio/songs/v_lesu_rodilas_yolochka.mp3', video:null },
        ];
        this._filtered = [...this._allSongs];
        this.render();
        setupProgress(this.audio, 'song-progress-bar', 'song-time-cur', 'song-time-dur', 'song-prog-wrap');
        if (!this._timeTracked) { StatTracker.trackAudioTime(this.audio, 'songs'); this._timeTracked = true; }
        this.audio.onended = () => {
            // Засчитываем только полное прослушивание без пауз
            if (!this._wasPaused) {
                StatTracker.inc('songs');
            }
            // Отмечаем как прослушанную
            const song = this._allSongs[this.index];
            if (song) CardBadges.markTried('songs', song.id);
            if (this.isRepeat) { this.play(this.index); return; }
            document.getElementById('song-play-btn').textContent = '▶';
            setTimeout(() => this.nextSong(), 1000);
        };
        // Auto-load durations for all songs
        this._loadDurations();
    },

    _resolveAudioSrc(src) {
        if (!src) return '';
        // Если base64 data URL — используем как есть
        if (src.startsWith('data:')) return src;
        // Проверяем pending аудио (ещё не опубликовано)
        try {
            const pending = JSON.parse(localStorage.getItem('admin_pending_audio') || '{}');
            if (pending[src]) return pending[src]; // возвращаем base64 data URL
        } catch (_) {}
        return src;
    },

    _loadDurations() {
        this._allSongs.forEach((song, i) => {
            if (song.duration) return; // already set
            const resolvedSrc = this._resolveAudioSrc(song.src);
            if (!resolvedSrc) return;
            const a = new Audio();
            a.preload = 'metadata';
            a.src = resolvedSrc;
            a.addEventListener('loadedmetadata', () => {
                const d = a.duration;
                if (d && !isNaN(d)) {
                    this._allSongs[i].duration = fmtTime(d);
                    if (this._filtered[i]) this._filtered[i].duration = this._allSongs[i].duration;
                    this.render(); // refresh list to show duration
                }
            });
        });
    },

    _loadData() {
        try { return JSON.parse(localStorage.getItem('admin_songs')) || []; } catch { return []; }
    },

    render() {
        const list = document.getElementById('songs-list');
        list.innerHTML = '';
        this._filtered.forEach((song) => {
            const realIdx = this._allSongs.indexOf(song);
            const isPlaying = realIdx === this.index;
            const div = document.createElement('div');
            div.className = 'song-item' + (isPlaying ? ' playing' : '');
            div.innerHTML = `
                <div class="song-num ${isPlaying ? 'pi-icon' : ''}">${isPlaying ? '▶' : realIdx + 1}</div>
                <div class="song-name">${song.name}</div>
                <div class="song-dur">${song.duration || ''}</div>
                <button class="deeplink-btn" title="Скопировать ссылку" data-type="song" data-id="${song.id}" data-name="${song.name.replace(/"/g,'&quot;')}">🔗</button>
            `;
            div.addEventListener('click', (e) => {
                if (e.target.closest('.deeplink-btn')) return;
                this.play(realIdx);
            });
            div.querySelector('.deeplink-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                copyDeepLink('song', song.id, song.name);
            });
            list.appendChild(div);
        });
    },

    play(i) {
        this.index = i;
        const song = this._allSongs[i];
        this.audio.src = this._resolveAudioSrc(song.src) || '';
        AudioMgr.play(this.audio, 'songs');
        document.getElementById('song-play-btn').textContent = '⏸';
        document.getElementById('song-name').textContent = song.name;
        document.getElementById('song-sub').textContent  = song.duration || '';
        document.getElementById('song-progress-bar').style.width = '0%';
        // Show video if available for this song
        const songVidWrap = document.getElementById('song-video-wrap');
        const songVid = document.getElementById('song-video');
        if (songVidWrap && songVid) {
            songVid.pause();
            songVid.removeAttribute('src');
            songVid.load();
            songVidWrap.style.display = 'none';
            if (song.video) {
                songVid.onloadeddata = () => {
                    songVidWrap.style.display = 'block';
                    songVid.play().catch(() => {});
                };
                songVid.onerror = () => { songVidWrap.style.display = 'none'; };
                songVid.src = song.video;
                songVid.load();
            }
        }
        this.render();
        this._wasPaused = false; // полное прослушивание без пауз
    },

    toggle() {
        if (this.index === -1) { this.play(0); return; }
        if (this.audio.paused) {
            AudioMgr.play(this.audio, 'songs');
            document.getElementById('song-play-btn').textContent = '⏸';
        } else {
            this.audio.pause();
            this._wasPaused = true;
            document.getElementById('song-play-btn').textContent = '▶';
        }
    },

    prev() { this.play((this.index - 1 + this._allSongs.length) % this._allSongs.length); },

    nextSong() {
        const next = this.isShuffle
            ? Math.floor(Math.random() * this._allSongs.length)
            : (this.index + 1) % this._allSongs.length;
        this.play(next);
    },

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        document.getElementById('song-shuffle-btn').classList.toggle('active', this.isShuffle);
        showToast(this.isShuffle ? '🔀 Перемешать вкл.' : '🔀 Выкл.');
    },

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        document.getElementById('song-repeat-btn').classList.toggle('active', this.isRepeat);
        showToast(this.isRepeat ? '🔁 Повтор вкл.' : '🔁 Выкл.');
    },

    filter(q) {
        this._filtered = this._allSongs.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));
        this.render();
    }
};

// =============================================
// PODCASTS
// =============================================
const Podcasts = {
    audio: new Audio(),
    _allPodcasts: [],
    _filtered: [],
    index: -1,
    isShuffle: false,
    isRepeat: false,

    init() {
        App.navigate('podcasts', 'Подкасты');
        AudioMgr.stop();
        const saved = this._loadData();
        this._allPodcasts = saved.length ? saved : [
            { id:1, name:'Благодарность',    duration:'', src:'assets/audio/podcasts/blagodarnost.mp3' },
            { id:2, name:'Доверие ребёнка',   duration:'', src:'assets/audio/podcasts/doverie_rebyonka.mp3' },
            { id:3, name:'Мозг дошкольника',  duration:'', src:'assets/audio/podcasts/mozg_doshkolnika.mp3' },
            { id:4, name:'Поколение Альфа',    duration:'', src:'assets/audio/podcasts/pokolenie_alfa.mp3' },
            { id:5, name:'Слушать сердцем',    duration:'', src:'assets/audio/podcasts/slushat_serdtsem.mp3' },
            { id:6, name:'Сравнение',          duration:'', src:'assets/audio/podcasts/sravnenie.mp3' },
        ];
        this._filtered = [...this._allPodcasts];
        this.render();
        setupProgress(this.audio, 'podcast-progress-bar', 'podcast-time-cur', 'podcast-time-dur', 'podcast-prog-wrap');
        if (!this._timeTracked) { StatTracker.trackAudioTime(this.audio, 'podcasts'); this._timeTracked = true; }
        this.audio.onended = () => {
            // Отмечаем как прослушанный
            const pod = this._allPodcasts[this.index];
            if (pod) CardBadges.markTried('podcasts', pod.id);
            if (this.isRepeat) { this.play(this.index); return; }
            document.getElementById('podcast-play-btn').textContent = '▶';
            setTimeout(() => this.nextPodcast(), 1000);
        };
        this._loadDurations();
    },

    _loadData() {
        try { return JSON.parse(localStorage.getItem('admin_podcasts')) || []; } catch { return []; }
    },

    _resolveAudioSrc(src) {
        if (!src) return '';
        if (src.startsWith('data:')) return src;
        try {
            const pending = JSON.parse(localStorage.getItem('admin_pending_audio') || '{}');
            if (pending[src]) return pending[src];
        } catch (_) {}
        return src;
    },

    _loadDurations() {
        this._allPodcasts.forEach((p, i) => {
            if (p.duration) return;
            const resolvedSrc = this._resolveAudioSrc(p.src);
            if (!resolvedSrc) return;
            const a = new Audio();
            a.preload = 'metadata';
            a.src = resolvedSrc;
            a.addEventListener('loadedmetadata', () => {
                const d = a.duration;
                if (d && !isNaN(d)) {
                    this._allPodcasts[i].duration = fmtTime(d);
                    if (this._filtered[i]) this._filtered[i].duration = this._allPodcasts[i].duration;
                    this.render();
                }
            });
        });
    },

    render() {
        const list = document.getElementById('podcasts-list');
        list.innerHTML = '';
        this._filtered.forEach((pod) => {
            const realIdx = this._allPodcasts.indexOf(pod);
            const isPlaying = realIdx === this.index;
            const div = document.createElement('div');
            div.className = 'song-item' + (isPlaying ? ' playing' : '');
            div.innerHTML = `
                <div class="song-num ${isPlaying ? 'pi-icon' : ''}">${isPlaying ? '▶' : realIdx + 1}</div>
                <div class="song-name">${pod.name}</div>
                <div class="song-dur">${pod.duration || ''}</div>
                <button class="deeplink-btn" title="Скопировать ссылку" data-type="podcast" data-id="${pod.id}" data-name="${pod.name.replace(/"/g,'&quot;')}">🔗</button>
            `;
            div.addEventListener('click', (e) => {
                if (e.target.closest('.deeplink-btn')) return;
                this.play(realIdx);
            });
            div.querySelector('.deeplink-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                copyDeepLink('podcast', pod.id, pod.name);
            });
            list.appendChild(div);
        });
    },

    play(i) {
        this.index = i;
        const pod = this._allPodcasts[i];
        this.audio.src = this._resolveAudioSrc(pod.src) || '';
        AudioMgr.play(this.audio, 'podcasts');
        document.getElementById('podcast-play-btn').textContent = '⏸';
        document.getElementById('podcast-name').textContent = pod.name;
        document.getElementById('podcast-sub').textContent = pod.duration || '';
        const descEl = document.getElementById('podcast-desc');
        if (descEl) descEl.textContent = pod.desc || '';
        document.getElementById('podcast-progress-bar').style.width = '0%';
        this.render();
    },

    toggle() {
        if (this.index === -1) { this.play(0); return; }
        if (this.audio.paused) {
            AudioMgr.play(this.audio, 'podcasts');
            document.getElementById('podcast-play-btn').textContent = '⏸';
        } else {
            this.audio.pause();
            document.getElementById('podcast-play-btn').textContent = '▶';
        }
    },

    prev() { this.play((this.index - 1 + this._allPodcasts.length) % this._allPodcasts.length); },

    nextPodcast() {
        const next = this.isShuffle
            ? Math.floor(Math.random() * this._allPodcasts.length)
            : (this.index + 1) % this._allPodcasts.length;
        this.play(next);
    },

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        document.getElementById('podcast-shuffle-btn').classList.toggle('active', this.isShuffle);
        showToast(this.isShuffle ? '🔀 Перемешать вкл.' : '🔀 Выкл.');
    },

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        document.getElementById('podcast-repeat-btn').classList.toggle('active', this.isRepeat);
        showToast(this.isRepeat ? '🔁 Повтор вкл.' : '🔁 Выкл.');
    },

    filter(q) {
        this._filtered = this._allPodcasts.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
        this.render();
    }
};

// =============================================
// PUZZLES
// =============================================
const Puzzles = {
    _level: 'easy',
    _hasUnsaved: false,
    _solved: false,
    _queue: { easy: [], medium: [], hard: [] },
    _qpos:  { easy: 0,  medium: 0,  hard: 0  },

    _data: {
        easy: [
            { pic:'assets/images/rebuses_pictures_opt/ryba.webp',      hint:'Присмотрись к картинке', answer:'рыба' },
            { pic:'assets/images/rebuses_pictures_opt/lozhka.webp',    hint:'Присмотрись к картинке', answer:'ложка' },
            { pic:'assets/images/rebuses_pictures_opt/vilka.webp',     hint:'Присмотрись к картинке', answer:'вилка' },
            { pic:'assets/images/rebuses_pictures_opt/more.webp',      hint:'Присмотрись к картинке', answer:'море' },
            { pic:'assets/images/rebuses_pictures_opt/raduga.webp',    hint:'Присмотрись к картинке', answer:'радуга' },
            { pic:'assets/images/rebuses_pictures_opt/slon.webp',      hint:'Присмотрись к картинке', answer:'слон' },
        ],
        medium: [
            { pic:'assets/images/rebuses_pictures_opt/babochka.webp',  hint:'Присмотрись к картинке', answer:'бабочка' },
            { pic:'assets/images/rebuses_pictures_opt/konki.webp',     hint:'Присмотрись к картинке', answer:'коньки' },
            { pic:'assets/images/rebuses_pictures_opt/traktor.webp',   hint:'Присмотрись к картинке', answer:'трактор' },
            { pic:'assets/images/rebuses_pictures_opt/tucha.webp',     hint:'Присмотрись к картинке', answer:'туча' },
            { pic:'assets/images/rebuses_pictures_opt/tuman.webp',     hint:'Присмотрись к картинке', answer:'туман' },
            { pic:'assets/images/rebuses_pictures_opt/zelen.webp',     hint:'Присмотрись к картинке', answer:'зелень' },
        ],
        hard: [
            { pic:'assets/images/rebuses_pictures_opt/krevetka.webp',  hint:'Присмотрись к картинке', answer:'креветка' },
            { pic:'assets/images/rebuses_pictures_opt/zabor.webp',     hint:'Присмотрись к картинке', answer:'забор' },
            { pic:'assets/images/rebuses_pictures_opt/tokar.webp',     hint:'Присмотрись к картинке', answer:'токарь' },
        ],
    },

    init() {
        App.navigate('puzzles');
        this._loadFromAdmin();
        this._level = 'easy';
        this._rebuildQueues();
        this._renderLevelDots();
        this.show();
        Achievements.init();
    },

    _shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },
    _rebuildQueues() {
        ['easy','medium','hard'].forEach(lv => {
            const len = this._data[lv].length;
            this._queue[lv] = this._shuffle([...Array(len).keys()]);
            this._qpos[lv]  = 0;
        });
    },
    _totalCount() {
        return this._data.easy.length + this._data.medium.length + this._data.hard.length;
    },
    _renderLevelDots() {
        ['puzzle-level-dots','puzzle-share-topbar'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
        const topBar = document.getElementById('top-bar');
        const settingsBtn = document.getElementById('settings-icon-btn');
        if (!topBar || !settingsBtn) return;
        // Кнопка шаринга картинки
        const shareBtn = document.createElement('button');
        shareBtn.id = 'puzzle-share-topbar';
        shareBtn.title = 'Поделиться ребусом';
        shareBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="17" height="17"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
        shareBtn.addEventListener('click', () => Puzzles.share());
        topBar.insertBefore(shareBtn, settingsBtn);
        // Кружки уровней
        const wrap = document.createElement('div');
        wrap.id = 'puzzle-level-dots';
        wrap.innerHTML = `
            <span class="lvl-counter" id="puzzle-counter">${this._totalCount()}</span>
            <button class="lvl-dot easy   ${this._level==='easy'   ? 'active':''}" onclick="Puzzles.setLevel('easy')"   title="Простой"></button>
            <button class="lvl-dot medium ${this._level==='medium' ? 'active':''}" onclick="Puzzles.setLevel('medium')" title="Средний"></button>
            <button class="lvl-dot hard   ${this._level==='hard'   ? 'active':''}" onclick="Puzzles.setLevel('hard')"   title="Сложный"></button>
        `;
        topBar.insertBefore(wrap, shareBtn);
    },

    async share() {
        // Берём картинку из puzzle-img
        const imgEl = document.getElementById('puzzle-img');
        const img = imgEl ? imgEl.querySelector('img') : null;
        if (!img || !img.src) { showToast('⚠️ Нет картинки для шаринга'); return; }
        try {
            const resp = await fetch(img.src);
            const blob = await resp.blob();
            const file = new File([blob], 'rebus.jpg', { type: blob.type });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], text: '🧩 Отгадай ребус!' });
            } else if (navigator.share) {
                await navigator.share({ text: '🧩 Отгадай ребус! ' + img.src });
            } else {
                navigator.clipboard.writeText(img.src);
                showToast('🔗 Ссылка на картинку скопирована');
            }
        } catch(e) {
            if (e.name !== 'AbortError') showToast('⚠️ Не удалось поделиться');
        }
    },

    // Загружаем актуальные данные из Admin localStorage
    _loadFromAdmin() {
        const adminPuzzles = (() => {
            try { return JSON.parse(localStorage.getItem('admin_puzzles')) || []; } catch { return []; }
        })();
        if (!adminPuzzles.length) return; // используем статичные данные
        // Перестраиваем _data по уровням из Admin
        this._data = { easy: [], medium: [], hard: [] };
        adminPuzzles.forEach(p => {
            const lv = p.level || 'easy';
            if (this._data[lv]) {
                this._data[lv].push({
                    pic:    p.pic    || '',
                    hint:   p.hint   || 'Присмотрись к картинке',
                    answer: p.answer || '',
                    img:    p.img    || ''
                });
            }
        });
        // Если какой-то уровень пуст — не оставляем пустым
        if (!this._data.easy.length)   this._data.easy   = [{ pic:'', hint:'', answer:'?' }];
        if (!this._data.medium.length) this._data.medium = [...this._data.easy];
        if (!this._data.hard.length)   this._data.hard   = [...this._data.easy];
        this._rebuildQueues();
        const cnt = document.getElementById('puzzle-counter');
        if (cnt) cnt.textContent = this._totalCount();
    },

    _current() {
        const list  = this._data[this._level];
        const queue = this._queue[this._level];
        const idx   = queue[this._qpos[this._level] % queue.length];
        return list[idx];
    },

    show() {
        const p = this._current();
        const puzImgEl = document.getElementById('puzzle-img');
        puzImgEl.innerHTML = '';
        if (p.pic) {
            const im = document.createElement('img');
            im.src = p.pic;
            im.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
            im.onerror = () => { puzImgEl.textContent = '🧩'; };
            puzImgEl.appendChild(im);
        } else {
            puzImgEl.textContent = p.img || '🧩';
        }
        document.getElementById('puzzle-hint').innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/></svg> <b>Подсказка:</b> ${p.hint}`;
        const inp = document.getElementById('puzzle-input');
        inp.value = '';
        inp.className = '';
        const msg = document.getElementById('puzzle-msg');
        msg.textContent = '';
        msg.className = '';
        this._hasUnsaved = false;
        this._solved = false;
    },

    setLevel(lv) {
        if (this._hasUnsaved && !this._solved) { showToast('✋ Сначала нажми «Проверить»'); return; }
        this._level = lv;
        const len = this._data[lv].length;
        this._queue[lv] = this._shuffle([...Array(len).keys()]);
        this._qpos[lv]  = 0;
        document.querySelectorAll('#puzzle-level-dots .lvl-dot').forEach(d => d.classList.remove('active'));
        const active = document.querySelector(`#puzzle-level-dots .lvl-dot.${lv}`);
        if (active) active.classList.add('active');
        this.show();
    },

    check() {
        const val = document.getElementById('puzzle-input').value.trim().toLowerCase();
        const msg = document.getElementById('puzzle-msg');
        const inp = document.getElementById('puzzle-input');
        if (!val) { msg.textContent = '✏️ Введи ответ!'; msg.className = 'warn'; return; }
        this._hasUnsaved = false;
        const result = AnswerChecker.check(val, this._current().answer);
        if (result === 'exact' || result === 'fuzzy') {
            inp.className = 'correct';
            const praise = getPersonalPraise();
            msg.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg> ${praise} Ответ: <b>${this._current().answer}</b>`;
            msg.className = 'ok';
            this._solved = true;
            starsBurst();
            playCorrectSound('puzzles');
            Achievements.correct('puzzles');
            CardBadges.markTried('puzzles', this._current().answer);
            StatTracker.inc('puzzles');
        } else {
            inp.className = 'wrong';
            msg.textContent = '❌ Не угадал, попробуй ещё!';
            msg.className = 'err';
            Achievements.wrong('puzzles');
        }
    },

    next() {
        if (this._hasUnsaved && !this._solved) { showToast('✋ Сначала нажми «Проверить»'); return; }
        const lv = this._level;
        this._qpos[lv]++;
        if (this._qpos[lv] >= this._queue[lv].length) {
            this._queue[lv] = this._shuffle([...Array(this._data[lv].length).keys()]);
            this._qpos[lv]  = 0;
            const order = ['easy','medium','hard'];
            const next = order[(order.indexOf(lv) + 1) % order.length];
            this._level = next;
            document.querySelectorAll('#puzzle-level-dots .lvl-dot').forEach(d => d.classList.remove('active'));
            const act = document.querySelector(`#puzzle-level-dots .lvl-dot.${next}`);
            if (act) act.classList.add('active');
            const names = {easy:'Простой', medium:'Средний', hard:'Сложный'};
            showToast('🎯 Уровень: ' + names[next]);
        }
        this.show();
    }
};

document.getElementById('puzzle-input').addEventListener('input', e => {
    Puzzles._hasUnsaved = !!e.target.value;
});

// =============================================
// RIDDLES
// =============================================
const Riddles = {
    _hasUnsaved: false,
    _solved: false,
    _level: 'easy',
    _data: { easy: [], medium: [], hard: [] },
    _queue: { easy: [], medium: [], hard: [] },
    _qpos:  { easy: 0,  medium: 0,  hard: 0  },

    data: [
        { q:'Белым снегом всё одето, значит наступает ...', a:'Зима', pic:'assets/images/riddles_pictures_opt/zima.webp' },
        { q:'Охраняет часто дом, повиляет всем хвостом, зарычит, коль ты чужой, и оближет, если свой.', a:'Собака', pic:'assets/images/riddles_pictures_opt/sobaka.webp' },
        { q:'По реке плывёт бревно, ох и злющее оно,  тем, кто в речку угодил, нос откусит ...', a:'Крокодил', pic:'assets/images/riddles_pictures_opt/krokodil.webp' },
        { q:'Мимо улья проходил косолапый ...', a:'Медведь', pic:'assets/images/riddles_pictures_opt/medved.webp' },
        { q:'Ночью каждое оконце слабо освещает ...', a:'Луна', pic:'assets/images/riddles_pictures_opt/luna.webp' },
        { q:'Овощ это непростой,\nВызовет слезу порой,\nНо уж больно он полезный\nЗащищает от болезней!', a:'Лук', pic:'assets/images/riddles_pictures_opt/luk.webp' },
        { q:'Кто мычит там на лугу,\nСочную жует траву,\nУгощает молоком\nИ полезным творожком.', a:'Корова', pic:'assets/images/riddles_pictures_opt/korova.webp' },
        { q:'С ветки прыгает на ветку\nРыжая красавица.\nШишки, желуди, орехи\nЗапасает на зиму.', a:'белка', pic:'assets/images/riddles_pictures_opt/belka.webp' },
        { q:'Он хвостастый и зубастый,\nНа луну он воет часто,\nВсе в лесу его боятся,\nА в особенности, зайцы.', a:'волк', pic:'assets/images/riddles_pictures_opt/volk.webp' },
        { q:'В лесу живёт плутовка,\nХитры её глаза,\nА цветом, как морковка,\nПушистая...', a:'Лиса', pic:'assets/images/riddles_pictures_opt/lisa.webp' },
        { q:'Живет в берлоге он в лесу,\nПугает волка и лису,\nЛюбит ягоды и мед,\nКосолапо он идет.', a:'Медведь', pic:'assets/images/riddles_pictures_opt/medved.webp' },
        { q:'Он пятнистый, с длинной шеей,\nГде-то в Африке живет.\nИ с огромных он деревьев\nЛегко листья достает.', a:'Жираф', pic:'assets/images/riddles_pictures_opt/zhiraf.webp' },
        { q:'Траву жуёт. Носит матроску\nВ чёрно - белую полоску.', a:'Зебра', pic:'assets/images/riddles_pictures_opt/zebra.webp' },
        { q:'В цирке трюки выполняет,\nБрёвна хоботом таскает.\nСерый и громадный он,\nКто же это? Это ...', a:'Слон', pic:'assets/images/riddles_pictures_opt/slon.webp' },
        { q:'В зоопарке, в синей клетке\nЛовко прыгает по сетке,\nКорчит рожи, ест бананы.\nКто? Конечно', a:'Обезьяна', pic:'assets/images/riddles_pictures_opt/obezyana.webp' },
        { q:'Нет того, кто не боится\nЭтой грозной хищной птицы.\nКто куда бы не забрёл,\nСверху видит всё…', a:'Орёл', pic:'assets/images/riddles_pictures_opt/orel.webp' },
        { q:'Хвост веером, на голове корона, нет птицы краше чем ...', a:'Павлин', pic:'assets/images/riddles_pictures_opt/pavlin.webp' },
        { q:'Рано он всегда встаёт,\nПо утрам всегда поёт,\nНосит гребень и серёжки,\nВ перьях все его одёжки.', a:'Петух', pic:'assets/images/riddles_pictures_opt/petukh.webp' },
        { q:'Маленькая птичка\nЧирикает отлично,\nПрыгает по веткам,\nЖить не станет в клетке.\nНе таится от людей\nРазвесёлый...', a:'воробей', pic:'assets/images/riddles_pictures_opt/vorobey.webp' },
        { q:'Перья черные летят,\nВсюду каркают, кричат,\nЧто за важная персона?\nЭто черная...', a:'Ворона', pic:'assets/images/riddles_pictures_opt/vorona.webp' },
        { q:'Я по травке не спешу.\nЕсли станет страшно вдруг,\nСпрячусь в домик, милый друг.', a:'Улитка', pic:'assets/images/riddles_pictures_opt/ulitka.webp' },
        { q:'На пруду на живёт,\nГромко песенки поёт,\nПучеглазая зверюшка\nНазывается...', a:'Лягушка', pic:'assets/images/riddles_pictures_opt/lyagushka.webp' },
        { q:'В пустыне живёт,\nПодолгу не пьёт,\nС жарой легко справляется,\nКолючками питается.', a:'Верблюд', pic:'assets/images/riddles_pictures_opt/verblyud.webp' },
        { q:'Через море-океан\nПлывёт чудо-великан,\nПрячет ус во рту,\nРастянулся на версту.', a:'Кит', pic:'assets/images/riddles_pictures_opt/kit.webp' },
        { q:'Ем я уголь, пью я воду,\nКак напьюсь — прибавлю ходу.\nВезу обоз на сто колес\nИ называюсь...', a:'Паровоз', pic:'assets/images/riddles_pictures_opt/parovoz.webp' },
        { q:'Она идет и зиму прогоняет.\nКогда придет, вокруг всё расцветает.\nОт солнышка прекрасного ясна.\nЗовут ее, конечно же ...', a:'Весна', pic:'assets/images/riddles_pictures_opt/vesna.webp' },
        { q:'Если крылья распахнет —\nКрасотой с ума сведет.\nНа лугу она летает,\nВсех собою удивляет.', a:'Бабочка', pic:'assets/images/riddles_pictures_opt/babochka.webp' },
        { q:'Живёт в норке, грызёт корки, боится кошки.', a:'Мышь', pic:'assets/images/riddles_pictures_opt/mysh.webp' },
        { q:'Лечит маленьких детей,\nЛечит птичек и зверей,\nСквозь очки свои глядит\nДобрый доктор...', a:'Айболит', pic:'assets/images/riddles_pictures_opt/aybolit.webp' },
        { q:'Сначала пашут,\nПотом засевают,\nВремя придёт,\nУрожай собирают!', a:'Поле', pic:'assets/images/riddles_pictures_opt/pshenitsa.webp' },
    ],

    _shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },
    _rebuildQueues() {
        ['easy','medium','hard'].forEach(lv => {
            const len = this._data[lv].length;
            this._queue[lv] = this._shuffle([...Array(len).keys()]);
            this._qpos[lv]  = 0;
        });
    },
    _totalCount() {
        return this._data.easy.length + this._data.medium.length + this._data.hard.length;
    },

    init() {
        App.navigate('riddles');
        this._level = 'easy';
        this._loadFromAdmin();
        this._renderTopBar();
        this.show();
        Achievements.init();
    },

    _loadFromAdmin() {
        const adm = this._loadAdmin();
        const src = adm.length ? adm : this.data.map((r, i) => ({
            id: i + 1, text: r.q, answer: r.a, pic: r.pic,
            level: i < 10 ? 'easy' : i < 20 ? 'medium' : 'hard'
        }));
        this._data = { easy: [], medium: [], hard: [] };
        src.forEach(r => {
            const lv = r.level || 'easy';
            if (this._data[lv]) this._data[lv].push({ q: r.text || r.q || '—', a: r.answer || r.a || '', pic: r.pic || '' });
        });
        // Если уровень пуст — берём easy
        if (!this._data.medium.length) this._data.medium = [...this._data.easy];
        if (!this._data.hard.length)   this._data.hard   = [...this._data.easy];
        this._rebuildQueues();
        const cnt = document.getElementById('riddle-counter');
        if (cnt) cnt.textContent = this._totalCount();
    },

    _current() {
        const list  = this._data[this._level];
        const queue = this._queue[this._level];
        const idx   = queue[this._qpos[this._level] % queue.length];
        return list[idx];
    },

    setLevel(lv) {
        if (this._hasUnsaved && !this._solved) { showToast('✋ Сначала нажми «Проверить ответ»'); return; }
        this._level = lv;
        const len = this._data[lv].length;
        this._queue[lv] = this._shuffle([...Array(len).keys()]);
        this._qpos[lv]  = 0;
        document.querySelectorAll('#riddle-level-dots .lvl-dot').forEach(d => d.classList.remove('active'));
        const active = document.querySelector(`#riddle-level-dots .lvl-dot.${lv}`);
        if (active) active.classList.add('active');
        this.show();
    },

    _renderTopBar() {
        ['riddle-level-dots','riddle-share-topbar'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
        const topBar = document.getElementById('top-bar');
        const settingsBtn = document.getElementById('settings-icon-btn');
        if (!topBar || !settingsBtn) return;
        // Кнопка шаринга
        const shareBtn = document.createElement('button');
        shareBtn.id = 'riddle-share-topbar';
        shareBtn.title = 'Поделиться загадкой';
        shareBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="17" height="17"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
        shareBtn.addEventListener('click', () => Riddles.share());
        topBar.insertBefore(shareBtn, settingsBtn);
        // Кружки уровней
        const dots = document.createElement('div');
        dots.id = 'riddle-level-dots';
        dots.innerHTML = `
            <span class="lvl-counter" id="riddle-counter">${this._totalCount()}</span>
            <button class="lvl-dot easy   ${this._level==='easy'   ?'active':''}" onclick="Riddles.setLevel('easy')"   title="Простой"></button>
            <button class="lvl-dot medium ${this._level==='medium' ?'active':''}" onclick="Riddles.setLevel('medium')" title="Средний"></button>
            <button class="lvl-dot hard   ${this._level==='hard'   ?'active':''}" onclick="Riddles.setLevel('hard')"   title="Сложный"></button>
        `;
        topBar.insertBefore(dots, shareBtn);
    },

    _loadAdmin() {
        try { return JSON.parse(localStorage.getItem('admin_riddles')) || []; } catch { return []; }
    },

    show() {
        const item = this._current();
        document.getElementById('riddle-text').textContent = item.q;
        const inp = document.getElementById('riddle-input');
        const imgEl = document.getElementById('riddle-img');
        inp.value = '';
        inp.className = '';
        document.getElementById('riddle-msg').textContent = '';
        document.getElementById('riddle-msg').className = '';
        // Полностью сбрасываем блок с картинкой
        imgEl.innerHTML = '';
        imgEl.className = 'answer-img';
        imgEl.style.display = 'none';
        this._hasUnsaved = false;
        this._solved = false;
    },

    check() {
        const item = this._current();
        const val = document.getElementById('riddle-input').value.trim().toLowerCase();
        const msg = document.getElementById('riddle-msg');
        const inp = document.getElementById('riddle-input');
        if (!val) { msg.textContent = '✏️ Введи ответ!'; msg.className = 'warn'; return; }
        this._hasUnsaved = false;
        const result = AnswerChecker.check(val, item.a || item.answer || '');
        if (result === 'exact' || result === 'fuzzy') {
            inp.className = 'correct';
            const praise = getPersonalPraise();
            msg.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg> ${praise} Ответ: <b>${item.a || item.answer}</b>`;
            msg.className = 'ok';
            const imgEl2 = document.getElementById('riddle-img');
            imgEl2.innerHTML = '';
            imgEl2.style.display = 'none';
            if (item.pic) {
                const revImg = document.createElement('img');
                revImg.src = item.pic;
                revImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:var(--radius);';
                revImg.onload = () => {
                    imgEl2.innerHTML = '';
                    imgEl2.appendChild(revImg);
                    imgEl2.className = 'answer-img riddle-pic-preview show';
                    imgEl2.style.display = '';
                };
                revImg.onerror = () => {
                    imgEl2.className = 'answer-img show';
                    imgEl2.style.display = '';
                };
                imgEl2.appendChild(revImg); // добавляем до onload на случай кеша
            }
            this._solved = true;
            starsBurst();
            playCorrectSound('riddles');
            Achievements.correct('riddles');
            CardBadges.markTried('riddles', item.a || item.answer);
            StatTracker.inc('riddles');
        } else {
            inp.className = 'wrong';
            msg.textContent = '❌ Не угадал, попробуй ещё!';
            msg.className = 'err';
            Achievements.wrong('riddles');
        }
    },

    next() {
        if (this._hasUnsaved && !this._solved) { showToast('✋ Сначала нажми «Проверить ответ»'); return; }
        const lv = this._level;
        this._qpos[lv]++;
        if (this._qpos[lv] >= this._queue[lv].length) {
            this._queue[lv] = this._shuffle([...Array(this._data[lv].length).keys()]);
            this._qpos[lv]  = 0;
            const order = ['easy','medium','hard'];
            const next = order[(order.indexOf(lv) + 1) % order.length];
            this._level = next;
            document.querySelectorAll('#riddle-level-dots .lvl-dot').forEach(d => d.classList.remove('active'));
            const act = document.querySelector(`#riddle-level-dots .lvl-dot.${next}`);
            if (act) act.classList.add('active');
            const names = {easy:'Простой', medium:'Средний', hard:'Сложный'};
            showToast('🎯 Уровень: ' + names[next]);
        }
        this.show();
    },

    share() {
        const item = this._current();
        const text = item.q;
        if (!text || text === '—') { showToast('⚠️ Нет текста загадки'); return; }
        const msg = `🤔 Отгадай загадку!\n\n${text}`;
        if (navigator.share) {
            navigator.share({ text: msg }).catch(() => {});
        } else {
            navigator.clipboard.writeText(msg).then(() => {
                showToast('📤 Загадка скопирована!');
            }).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = msg; ta.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(ta); ta.select();
                document.execCommand('copy'); document.body.removeChild(ta);
                showToast('📤 Загадка скопирована!');
            });
        }
    }
};

document.getElementById('riddle-input').addEventListener('input', e => {
    Riddles._hasUnsaved = !!e.target.value;
});
document.getElementById('riddle-input').addEventListener('keydown', e => { if (e.key === 'Enter') Riddles.check(); });
document.getElementById('puzzle-input').addEventListener('keydown', e => { if (e.key === 'Enter') Puzzles.check(); });

// =============================================
// STATS
// =============================================
const Info = {
    render() {
        const container = document.getElementById('info-blocks-container');
        if (!container) return;
        const blocks = (() => {
            try { return JSON.parse(localStorage.getItem('admin_info')) || []; } catch { return []; }
        })();
        container.innerHTML = '';
        if (!blocks.length) {
            container.innerHTML = '<div style="text-align:center;color:var(--text2);padding:40px 20px;font-size:15px;">Нет информационных блоков</div>';
            return;
        }
        blocks.forEach(b => {
            const div = document.createElement('div');
            div.className = 'info-accordion';
            const parseBody = (text) => {
                return (text || '')
                    .replace(/\n/g, '<br>')
                    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
                        '<a href="$2" target="_blank" rel="noopener" class="info-link">$1</a>')
                    .replace(/(?<!\()(https?:\/\/[^\s<]+)/g,
                        '<a href="$1" target="_blank" rel="noopener" class="info-link">$1</a>');
            };
            div.innerHTML = `
                <div class="info-acc-header-row">
                    <button class="info-acc-header">
                        <span class="info-acc-title">${b.name || ''}</span>
                        <span class="info-acc-arrow">›</span>
                    </button>
                    <button class="info-deeplink-btn" title="Скопировать ссылку">🔗</button>
                </div>
                <div class="info-acc-body">
                    <p>${parseBody(b.body)}</p>
                </div>
            `;
            div.querySelector('.info-acc-header').addEventListener('click', () => {
                const isOpen = div.classList.contains('open');
                container.querySelectorAll('.info-accordion.open').forEach(a => a.classList.remove('open'));
                if (!isOpen) div.classList.add('open');
            });
            div.querySelector('.info-deeplink-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                copyDeepLink('info', b.id, b.name);
            });
            container.appendChild(div);
        });
    }
};

const Stats = {
    _showAnswers: true,
    _showTime: true,
    _showHourlyA: true,
    _showHourlyT: true,
    _chartPeriod: 'week',

    show() {
        App.navigate('stats', 'Статистика');
        this._render();
        this._syncMetricTabs();
        this._syncHourlyMetricTabs();
        this._renderChart();
        this._renderHourlyChart();
    },

    toggleMetric(metric) {
        if (metric === 'answers') this._showAnswers = !this._showAnswers;
        if (metric === 'time') this._showTime = !this._showTime;
        // Хотя бы одна метрика должна быть включена
        if (!this._showAnswers && !this._showTime) {
            if (metric === 'answers') this._showTime = true;
            else this._showAnswers = true;
        }
        this._syncMetricTabs();
        this._renderChart();
    },

    _syncMetricTabs() {
        const tabs = document.getElementById('chart-metric-tabs');
        if (!tabs) return;
        tabs.querySelector('[data-metric="answers"]')?.classList.toggle('active', this._showAnswers);
        tabs.querySelector('[data-metric="time"]')?.classList.toggle('active', this._showTime);
    },

    setChartPeriod(period) {
        this._chartPeriod = period;
        document.querySelectorAll('#chart-period-tabs .chart-period').forEach(b => {
            b.classList.toggle('active', b.dataset.period === period);
        });
        const metricTabs = document.getElementById('chart-metric-tabs');
        if (metricTabs) metricTabs.style.display = '';
        this._renderChart();
    },

    toggleHourlyMetric(metric) {
        if (metric === 'answers') this._showHourlyA = !this._showHourlyA;
        if (metric === 'time') this._showHourlyT = !this._showHourlyT;
        if (!this._showHourlyA && !this._showHourlyT) {
            if (metric === 'answers') this._showHourlyT = true;
            else this._showHourlyA = true;
        }
        this._syncHourlyMetricTabs();
        this._renderHourlyChart();
    },

    _syncHourlyMetricTabs() {
        const tabs = document.getElementById('hourly-metric-tabs');
        if (!tabs) return;
        tabs.querySelector('[data-metric="answers"]')?.classList.toggle('active', this._showHourlyA);
        tabs.querySelector('[data-metric="time"]')?.classList.toggle('active', this._showHourlyT);
    },

    toggleInfo() {
        const box = document.getElementById('chart-info-box');
        if (box) box.classList.toggle('hidden');
    },

    // Время без единиц для графика (Day view value)
    _fmtTimeShort(sec) {
        sec = Math.round(sec);
        if (sec >= 3600) {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            return m > 0 ? h + ':' + String(m).padStart(2,'0') : h + ':00';
        }
        if (sec >= 60) {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return m + ':' + String(s).padStart(2,'0');
        }
        return '0:' + String(sec).padStart(2,'0');
    },

    // Подсказка над столбиком — компактная, без единиц
    _fmtTimeTip(sec) {
        sec = Math.round(sec);
        if (sec >= 3600) return Math.floor(sec / 3600) + ':' + String(Math.floor((sec%3600)/60)).padStart(2,'0');
        if (sec >= 60) return Math.floor(sec / 60) + ':' + String(sec%60).padStart(2,'0');
        return '0:' + String(sec).padStart(2,'0');
    },

    // Полный формат с единицами (для карточек статистики)
    _fmtTimeLabel(sec) {
        sec = Math.round(sec);
        if (sec >= 3600) {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            return m > 0 ? h + ' ч ' + m + ' мин' : h + ' ч';
        }
        if (sec >= 60) {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return s > 0 ? m + ' мин ' + s + ' сек' : m + ' мин';
        }
        return sec + ' сек';
    },

    // Форматирование подписи периода
    _getPeriodLabel(period, data) {
        const MONTH_FULL = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
        const MONTH_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
        const pad = n => String(n).padStart(2, '0');

        if (period === 'day') {
            const d = (data[0] && data[0].date) || new Date();
            return pad(d.getDate()) + ' ' + MONTH_FULL[d.getMonth()] + ' ' + d.getFullYear();
        }
        if (period === 'week') {
            const first = data[0]?.date || new Date();
            const last = data[data.length - 1]?.date || new Date();
            if (first.getMonth() === last.getMonth()) {
                return pad(first.getDate()) + '–' + pad(last.getDate()) + ' ' + MONTH_FULL[first.getMonth()] + ' ' + first.getFullYear();
            }
            return pad(first.getDate()) + ' ' + MONTH_FULL[first.getMonth()] + ' – ' + pad(last.getDate()) + ' ' + MONTH_FULL[last.getMonth()] + ' ' + last.getFullYear();
        }
        if (period === 'month') {
            const d = new Date();
            return MONTH_NOM[d.getMonth()] + ' ' + d.getFullYear();
        }
        // all
        const first = data[0]?.date || new Date();
        const last = data[data.length - 1]?.date || data[data.length - 1]?.dateEnd || new Date();
        return pad(first.getDate()) + ' ' + MONTH_FULL[first.getMonth()] + ' ' + first.getFullYear() + ' – ' + pad(last.getDate()) + ' ' + MONTH_FULL[last.getMonth()] + ' ' + last.getFullYear();
    },

    _renderChart() {
        const barsEl = document.getElementById('chart-bars');
        const labelsEl = document.getElementById('chart-labels');
        if (!barsEl || !labelsEl) return;

        const data = StatTracker.getDailyData(this._chartPeriod);
        const DAY_NAMES = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
        const MONTH_NAMES = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
        const areaEl = barsEl.parentElement;

        // Убираем старый day footer если был
        const dayFooter2 = areaEl.querySelector('.chart-day-footer');
        if (dayFooter2) dayFooter2.remove();

        labelsEl.style.display = '';

        const answersVals = data.map(d => d.answers || 0);
        const timeVals = data.map(d => Math.round(d.time || 0));

        const maxAnswers = Math.max(...answersVals, 1);
        const maxTime = Math.max(...timeVals, 1);

        const isDay = this._chartPeriod === 'day';
        const isMonth = this._chartPeriod === 'month';
        const showA = this._showAnswers;
        const showT = this._showTime;

        // Если время включено, но данных нет — показываем только ответы
        const hasAnyTime = timeVals.some(v => v > 0);
        const hasAnyAnswers = answersVals.some(v => v > 0);
        // Всегда уважаем выбор пользователя — если таб включён, показываем столбик
        let effectiveShowT = showT;
        let effectiveShowA = showA;
        // Если оба выключены — показываем ответы
        if (!effectiveShowA && !effectiveShowT) effectiveShowA = true;
        const dualMode = effectiveShowA && effectiveShowT;

        const labelStep = isMonth ? Math.ceil(data.length / 7) : 1;
        const isDense = isMonth;
        const isWide = (data.length <= 10 && this._chartPeriod === 'all') || isDay;

        let barsHTML = '';
        let labelsHTML = '';

        const chartHeight = 84; // px — matches .chart-bars height

        data.forEach((d, i) => {
            const isToday = d.isToday;
            const a = answersVals[i];
            const t = timeVals[i];

            // В месяце скрываем подписи данных
            const hideTips = isMonth;

            if (dualMode) {
                const hA = maxAnswers > 0 ? Math.max(Math.round((a / maxAnswers) * chartHeight), a > 0 ? 5 : 0) : 0;
                const hT = maxTime > 0 ? Math.max(Math.round((t / maxTime) * chartHeight), t > 0 ? 5 : 0) : 0;
                // Минимальная видимая высота placeholder когда данных нет
                const hAvis = hA > 0 ? hA : (a > 0 ? 5 : (hasAnyAnswers ? 0 : 2));
                const hTvis = hT > 0 ? hT : (t > 0 ? 5 : (hasAnyTime ? 0 : 2));
                const tipA = !hideTips && (!isDense || isToday) && a > 0 ? a : '';
                const tipT = !hideTips && (!isDense || isToday) && t > 0 ? this._fmtTimeTip(t) : '';

                barsHTML += `<div class="chart-bar-wrap ${isToday ? 'today' : ''}">
                    <div class="chart-dual-slot">
                        <div class="chart-dual-col">
                            <div class="chart-bar-tip">${tipA}</div>
                            <div class="chart-bar chart-bar-a" style="height:${hAvis}px"></div>
                        </div>
                        <div class="chart-dual-col">
                            <div class="chart-bar-tip">${tipT}</div>
                            <div class="chart-bar chart-bar-t" style="height:${hTvis}px"></div>
                        </div>
                    </div>
                </div>`;
            } else if (effectiveShowA) {
                const h = maxAnswers > 0 ? Math.max(Math.round((a / maxAnswers) * chartHeight), a > 0 ? 5 : 0) : 0;
                const tip = !hideTips && (!isDense || isToday) && a > 0 ? a : '';
                barsHTML += `<div class="chart-bar-wrap ${isToday ? 'today' : ''}">
                    <div class="chart-bar-tip">${tip}</div>
                    <div class="chart-bar chart-bar-a" style="height:${h}px"></div>
                </div>`;
            } else {
                const h = maxTime > 0 ? Math.max(Math.round((t / maxTime) * chartHeight), t > 0 ? 5 : 0) : 0;
                const hVis = h === 0 && !hasAnyTime && isToday ? 2 : h;
                const tip = !hideTips && (!isDense || isToday) && t > 0 ? this._fmtTimeTip(t) : '';
                barsHTML += `<div class="chart-bar-wrap ${isToday ? 'today' : ''}">
                    <div class="chart-bar-tip">${tip}</div>
                    <div class="chart-bar chart-bar-t" style="height:${hVis}px"></div>
                </div>`;
            }

            // Метки оси X
            let label = '';
            if (isDay) {
                label = DAY_NAMES[d.date.getDay()];
            } else if (this._chartPeriod === 'week') {
                label = DAY_NAMES[d.date.getDay()];
            } else if (isMonth) {
                if (i % labelStep === 0 || i === data.length - 1) label = d.date.getDate();
            } else {
                if (d.dateEnd) {
                    const s = d.date.getDate() + ' ' + MONTH_NAMES[d.date.getMonth()];
                    label = data.length <= 12 ? s : (i % 2 === 0 ? s : '');
                } else {
                    if (i === 0 || i === data.length - 1 || i % 7 === 0) {
                        label = d.date.getDate() + '.' + String(d.date.getMonth() + 1).padStart(2, '0');
                    }
                }
            }
            labelsHTML += `<div class="chart-label ${isToday ? 'today' : ''}">${label}</div>`;
        });

        barsEl.innerHTML = barsHTML;
        labelsEl.innerHTML = labelsHTML;

        // Широкие столбики
        barsEl.classList.toggle('chart-bars-wide', isWide);
        labelsEl.classList.toggle('chart-bars-wide', isWide);

        // ═══ Единый footer: легенда (лево) + период (право) ═══
        let footer = areaEl.querySelector('.chart-footer');
        if (!footer) {
            footer = document.createElement('div');
            footer.className = 'chart-footer';
            areaEl.appendChild(footer);
        }

        const periodLabel = this._getPeriodLabel(this._chartPeriod, data);
        let legendHTML = '';
        if (dualMode) {
            const timeDim = !hasAnyTime ? ' style="opacity:0.4"' : '';
            const dotDim = !hasAnyTime ? ';opacity:0.4' : '';
            legendHTML = `<span class="chart-legend-dot chart-legend-a"></span>ответы<span class="chart-legend-dot chart-legend-t" style="margin-left:8px${dotDim}"></span><span${timeDim}>время</span>`;
        } else if (effectiveShowA) {
            legendHTML = '<span class="chart-legend-dot chart-legend-a"></span>ответы';
        } else if (effectiveShowT) {
            const timeDim = !hasAnyTime ? ' style="opacity:0.4"' : '';
            const dotDim = !hasAnyTime ? ';opacity:0.4' : '';
            legendHTML = `<span class="chart-legend-dot chart-legend-t" style="margin-left:0${dotDim}"></span><span${timeDim}>время</span>`;
        }
        footer.innerHTML = `<div class="chart-footer-legend">${legendHTML}</div><div class="chart-footer-period">${periodLabel}</div>`;
        footer.style.display = '';

        // Убираем старую легенду если была
        const existingLegend = areaEl.querySelector('.chart-legend');
        if (existingLegend) existingLegend.remove();

        requestAnimationFrame(() => {
            barsEl.querySelectorAll('.chart-bar').forEach(bar => {
                const h = bar.style.height;
                bar.style.height = '0px';
                requestAnimationFrame(() => { bar.style.height = h; });
            });
        });
    },

    _renderHourlyChart() {
        const barsEl = document.getElementById('hourly-bars');
        const labelsEl = document.getElementById('hourly-labels');
        const card = document.getElementById('hourly-chart-card');
        if (!barsEl || !labelsEl) return;

        const data = StatTracker.getHourlyData();
        const nowHour = new Date().getHours();

        // Подсвечиваем текущее время суток
        const timeRange = nowHour < 6 ? 'night' : nowHour < 12 ? 'morning' : nowHour < 18 ? 'day' : 'evening';
        document.querySelectorAll('#hourly-period-tabs .hourly-period').forEach(el => {
            el.classList.toggle('active', el.dataset.range === timeRange);
        });

        const answersVals = data.map(d => d.answers);
        const timeVals = data.map(d => d.time);
        const hasAnyAnswers = answersVals.some(v => v > 0);
        const hasAnyTime = timeVals.some(v => v > 0);
        const hasAny = hasAnyAnswers || hasAnyTime;

        // Скрываем карточку если нет данных за сегодня
        if (card) card.style.display = hasAny ? '' : 'none';
        if (!hasAny) return;

        const showA = this._showHourlyA;
        const showT = this._showHourlyT;
        const dualMode = showA && showT;
        const maxA = Math.max(...answersVals, 1);
        const maxT = Math.max(...timeVals, 1);
        const chartH = 84;

        // Определяем активный диапазон (первый час с данными ... последний + 1)
        let firstActive = 24, lastActive = 0;
        data.forEach((d, i) => {
            if (d.answers > 0 || d.time > 0) {
                if (i < firstActive) firstActive = i;
                if (i > lastActive) lastActive = i;
            }
        });
        // Показываем ± 1 час от активного диапазона, минимум до текущего часа
        const rangeStart = Math.max(0, firstActive - 1);
        const rangeEnd = Math.min(23, Math.max(lastActive + 1, nowHour));
        const sliced = data.slice(rangeStart, rangeEnd + 1);

        let barsHTML = '';
        let labelsHTML = '';

        const labelStep = sliced.length > 12 ? 3 : sliced.length > 8 ? 2 : 1;

        sliced.forEach((d, i) => {
            const isCurrent = d.hour === nowHour;
            const a = d.answers;
            const t = d.time;

            if (dualMode) {
                const hA = maxA > 0 ? Math.max(Math.round((a / maxA) * chartH), a > 0 ? 4 : 0) : 0;
                const hT = maxT > 0 ? Math.max(Math.round((t / maxT) * chartH), t > 0 ? 4 : 0) : 0;
                const tipA = a > 0 ? a : '';
                const tipT = t > 0 ? this._fmtTimeTip(t) : '';
                barsHTML += `<div class="chart-bar-wrap today">
                    <div class="chart-dual-slot">
                        <div class="chart-dual-col">
                            <div class="chart-bar-tip">${tipA}</div>
                            <div class="chart-bar chart-bar-a" style="height:${hA}px"></div>
                        </div>
                        <div class="chart-dual-col">
                            <div class="chart-bar-tip">${tipT}</div>
                            <div class="chart-bar chart-bar-t" style="height:${hT}px"></div>
                        </div>
                    </div>
                </div>`;
            } else if (showA) {
                const h = maxA > 0 ? Math.max(Math.round((a / maxA) * chartH), a > 0 ? 4 : 0) : 0;
                barsHTML += `<div class="chart-bar-wrap today">
                    <div class="chart-bar-tip">${a > 0 ? a : ''}</div>
                    <div class="chart-bar chart-bar-a" style="height:${h}px"></div>
                </div>`;
            } else {
                const h = maxT > 0 ? Math.max(Math.round((t / maxT) * chartH), t > 0 ? 4 : 0) : 0;
                barsHTML += `<div class="chart-bar-wrap today">
                    <div class="chart-bar-tip">${t > 0 ? this._fmtTimeTip(t) : ''}</div>
                    <div class="chart-bar chart-bar-t" style="height:${h}px"></div>
                </div>`;
            }

            labelsHTML += `<div class="chart-label ${isCurrent ? 'today' : ''}">${(i % labelStep === 0 || isCurrent) ? d.hour + ':00' : ''}</div>`;
        });

        barsEl.innerHTML = barsHTML;
        labelsEl.innerHTML = labelsHTML;

        // Footer
        const areaEl = barsEl.parentElement;
        let footer = areaEl.querySelector('.chart-footer');
        if (!footer) {
            footer = document.createElement('div');
            footer.className = 'chart-footer';
            areaEl.appendChild(footer);
        }
        let legendHTML = '';
        if (dualMode) {
            const timeDim = !hasAnyTime ? ';opacity:0.4' : '';
            legendHTML = `<span class="chart-legend-dot chart-legend-a"></span>ответы<span class="chart-legend-dot chart-legend-t" style="margin-left:8px${timeDim}"></span>время`;
        } else if (showA) {
            legendHTML = '<span class="chart-legend-dot chart-legend-a"></span>ответы';
        } else {
            legendHTML = '<span class="chart-legend-dot chart-legend-t"></span>время';
        }
        const d = new Date();
        const dayNames = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
        const monthNames = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
        const dateLabel = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
        footer.innerHTML = `<div class="chart-footer-legend">${legendHTML}</div><div class="chart-footer-period">${dateLabel}</div>`;

        // Animate
        requestAnimationFrame(() => {
            barsEl.querySelectorAll('.chart-bar').forEach(bar => {
                const h = bar.style.height;
                bar.style.height = '0px';
                requestAnimationFrame(() => { bar.style.height = h; });
            });
            // Sync height with top chart card
            const topCard = document.querySelector('.stats-fixed .chart-card');
            if (topCard && card) {
                card.style.minHeight = topCard.offsetHeight + 'px';
            }
        });
    },

    shareMonth() {
        const name = getChildName();
        const now = new Date();
        const monthNames = ['января','февраля','марта','апреля','мая','июня',
                            'июля','августа','сентября','октября','ноября','декабря'];
        const monthTitle = monthNames[now.getMonth()] + ' ' + now.getFullYear();

        // Собираем статистику
        const puzzles = StatTracker.get('puzzles');
        const riddles = StatTracker.get('riddles');
        const words = StatTracker.get('words');
        const math = StatTracker.get('math');
        const songs = StatTracker.get('songs');
        const songsTime = StatTracker.getTime('songs');
        const podTime = StatTracker.getTime('podcasts');
        const interstitials = StatTracker.get('interstitials');
        const letters = StatTracker.get('letters');
        const numbers = StatTracker.get('numbers');
        const colors = StatTracker.get('colors');

        // Ежедневные данные за текущий месяц
        const log = StatTracker._getDailyLog();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        let activeDays = 0, monthAnswers = 0, monthTime = 0;
        for (let d = new Date(firstOfMonth); d <= now; d.setDate(d.getDate()+1)) {
            const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
            const entry = log[k];
            if (entry && (entry.answers > 0 || entry.time > 0)) {
                activeDays++;
                monthAnswers += entry.answers || 0;
                monthTime += entry.time || 0;
            }
        }

        const totalAnswers = puzzles + riddles + words + math + interstitials;
        const totalLearn = letters + numbers + colors;

        // Создаём canvas для картинки
        const W = 720, H = 1080;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Фон — градиент
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#011C40');
        grad.addColorStop(0.5, '#023859');
        grad.addColorStop(1, '#011C40');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Декоративные круги
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#A7EBF2';
        ctx.beginPath(); ctx.arc(600, 100, 200, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(100, 900, 180, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;

        // Заголовок
        ctx.textAlign = 'center';
        ctx.fillStyle = '#A7EBF2';
        ctx.font = 'bold 36px system-ui, sans-serif';
        ctx.fillText('Итоги ' + monthTitle, W/2, 70);

        if (name) {
            ctx.fillStyle = '#d4f0f5';
            ctx.font = '24px system-ui, sans-serif';
            ctx.fillText(name, W/2, 110);
        }

        // Линия-разделитель
        ctx.strokeStyle = 'rgba(167,235,242,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(60, 140); ctx.lineTo(W-60, 140); ctx.stroke();

        // Статы — строки
        const rows = [];
        if (activeDays > 0) rows.push({ icon: '📅', label: 'Активных дней', value: activeDays });
        if (totalAnswers > 0) rows.push({ icon: '✅', label: 'Правильных ответов', value: totalAnswers });
        if (puzzles > 0) rows.push({ icon: '🧩', label: 'Ребусов решено', value: puzzles });
        if (riddles > 0) rows.push({ icon: '❓', label: 'Загадок угадано', value: riddles });
        if (words > 0) rows.push({ icon: '🔤', label: 'Слов собрано', value: words });
        if (math > 0) rows.push({ icon: '➕', label: 'Примеров решено', value: math });
        if (interstitials > 0) rows.push({ icon: '⚡', label: 'Перебивок пройдено', value: interstitials });
        if (songs > 0) rows.push({ icon: '🎵', label: 'Песенок прослушано', value: songs });
        if (songsTime > 0) rows.push({ icon: '🎧', label: 'Время песенок', value: StatTracker.fmtDuration(songsTime) });
        if (podTime > 0) rows.push({ icon: '🎙️', label: 'Время подкастов', value: StatTracker.fmtDuration(podTime) });
        if (totalLearn > 0) rows.push({ icon: '📚', label: 'Просмотров обучения', value: totalLearn });

        if (rows.length === 0) {
            rows.push({ icon: '🌟', label: 'Начни заниматься', value: 'и тут появится статистика!' });
        }

        let y = 180;
        const rowH = 64;
        rows.forEach(r => {
            // Карточка-строка
            ctx.fillStyle = 'rgba(10,45,84,0.6)';
            this._roundRect(ctx, 50, y - 8, W - 100, rowH - 6, 16);
            ctx.fill();

            ctx.font = '28px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#fff';
            ctx.fillText(r.icon, 72, y + 30);

            ctx.fillStyle = '#d4f0f5';
            ctx.font = '18px system-ui, sans-serif';
            ctx.fillText(r.label, 120, y + 28);

            ctx.textAlign = 'right';
            ctx.fillStyle = '#A7EBF2';
            ctx.font = 'bold 22px system-ui, sans-serif';
            ctx.fillText(String(r.value), W - 72, y + 30);

            y += rowH;
        });

        // Подпись внизу
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(167,235,242,0.3)';
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillText('Гоша — обучение и развитие', W/2, H - 30);

        // Показываем превью
        const dataURL = canvas.toDataURL('image/png');
        this._showMonthOverlay(dataURL);
    },

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    _showMonthOverlay(dataURL) {
        let overlay = document.getElementById('month-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'month-overlay';
        overlay.innerHTML = `
            <div class="month-card" id="month-card">
                <div class="month-card-header">
                    <span class="month-card-title">Итоги месяца</span>
                    <button class="month-close-btn" onclick="Stats._closeMonth()">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="month-preview-wrap">
                    <img class="month-preview-img" src="${dataURL}" alt="Итоги месяца">
                </div>
                <div class="month-card-btns">
                    <button class="month-share-btn" onclick="Stats._doShareMonth()">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        Поделиться
                    </button>
                    <button class="month-download-btn" onclick="Stats._downloadMonth()">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Скачать
                    </button>
                </div>
            </div>
        `;
        overlay.addEventListener('click', e => { if (e.target === overlay) Stats._closeMonth(); });
        document.body.appendChild(overlay);
        this._monthDataURL = dataURL;
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
            document.getElementById('month-card').classList.add('in');
        });
    },

    _closeMonth() {
        const overlay = document.getElementById('month-overlay');
        if (!overlay) return;
        const card = document.getElementById('month-card');
        if (card) card.classList.remove('in');
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 350);
    },

    _doShareMonth() {
        if (!this._monthDataURL) return;
        // Конвертируем в blob
        fetch(this._monthDataURL).then(r => r.blob()).then(blob => {
            const file = new File([blob], 'gosha-itogi.png', { type: 'image/png' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'Итоги месяца — Гоша' }).catch(() => {});
            } else {
                // Fallback — скачиваем
                this._downloadMonth();
            }
        });
    },

    _downloadMonth() {
        if (!this._monthDataURL) return;
        const a = document.createElement('a');
        a.href = this._monthDataURL;
        a.download = 'gosha-itogi.png';
        a.click();
    },

    _render() {
        const el = id => document.getElementById(id);
        const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };
        const bar = (id, pct) => setTimeout(() => {
            const e = el(id);
            if (e) e.style.width = Math.min(pct, 100) + '%';
        }, 150);

        // ── Правильные ответы ──
        const puzzles = StatTracker.get('puzzles');
        const riddles = StatTracker.get('riddles');
        set('st-puzzles', puzzles);
        set('st-riddles', riddles);
        bar('sf-puzzles', puzzles / 50 * 100);
        bar('sf-riddles', riddles / 50 * 100);

        // ── Слова ──
        const words = StatTracker.get('words');
        set('st-words', words);
        bar('sf-words', words / 45 * 100);

        // ── Арифметика ──
        const math = StatTracker.get('math');
        set('st-math', math);
        bar('sf-math', math / 50 * 100);

        // ── Перебивки ──
        const interstitials = StatTracker.get('interstitials');
        set('st-interstitials', interstitials);
        bar('sf-interstitials', interstitials / 50 * 100);

        // ── Песенки ──
        const songs = StatTracker.get('songs');
        const songsTime = StatTracker.getTime('songs');
        set('st-songs', songs);
        set('st-songs-time', songsTime > 0 ? StatTracker.fmtDuration(songsTime) : '—');
        set('st-songs-time-card', songsTime > 0 ? StatTracker.fmtDuration(songsTime) : '—');
        bar('sf-songs', songs / 30 * 100);

        // ── Буквы / цифры / цвета ──
        const letters = StatTracker.get('letters');
        const numbers = StatTracker.get('numbers');
        const colors  = StatTracker.get('colors');
        set('st-letters', letters);
        set('st-numbers', numbers);
        set('st-colors',  colors);
        bar('sf-letters', letters / 33 * 100);
        bar('sf-numbers', numbers / 10 * 100);
        bar('sf-colors',  colors  / 10 * 100);

        // ── Подкасты ──
        const podTime = StatTracker.getTime('podcasts');
        set('st-podcasts-time', podTime > 0 ? StatTracker.fmtDuration(podTime) : '—');

        // ── Достижения Загадки ──
        this._renderAchievements('riddles', 'ach-riddles');
        // ── Достижения Ребусы ──
        this._renderAchievements('puzzles', 'ach-puzzles');
    },

    _renderAchievements(section, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const data = StatTracker.getAchievements(section);
        const milestones = [5, 10, 15, 20, 25, 30];
        let html = '';
        let hasAny = false;
        milestones.forEach(m => {
            const count = data[String(m)] || 0;
            if (count > 0) hasAny = true;
            html += `<div class="ach-stat-row ${count > 0 ? '' : 'ach-stat-empty'}">
                <span class="ach-stat-label">${m} подряд</span>
                <span class="ach-stat-val">${count > 0 ? '×' + count : '—'}</span>
            </div>`;
        });
        container.innerHTML = hasAny ? html : '<div class="ach-stat-none">Пока нет достижений</div>';
    },

    toggleLearn(type) {
        const acc = document.getElementById('acc-' + type);
        if (!acc) return;
        const isOpen = acc.classList.contains('open');

        // Закрываем все
        document.querySelectorAll('.learn-accordion.open').forEach(el => el.classList.remove('open'));
        document.querySelectorAll('.stat-learn-card.open').forEach(el => el.classList.remove('open'));

        if (!isOpen) {
            this._renderLearnDetails(type, acc);
            acc.classList.add('open');
            // Находим карточку-триггер
            acc.previousElementSibling?.classList.add('open');
        }
    },

    _renderLearnDetails(type, container) {
        const viewed = JSON.parse(localStorage.getItem(`viewed_${type}`) || '[]');

        const allItems = type === 'letters'
            ? 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('')
            : type === 'numbers'
            ? ['0','1','2','3','4','5','6','7','8','9']
            : ['Красный','Оранжевый','Жёлтый','Зелёный','Синий','Фиолетовый','Розовый','Голубой','Белый','Чёрный','Серый','Коричневый'];

        let html = '<div class="learn-detail-grid">';
        allItems.forEach(item => {
            const done = viewed.includes(item);
            html += `<span class="learn-item ${done ? 'done' : ''}">${item}</span>`;
        });
        html += '</div>';
        html += `<div class="learn-detail-summary">${viewed.length} из ${allItems.length} изучено</div>`;
        container.innerHTML = html;
    }
};

// =============================================
// ADMIN
// =============================================
const Admin = {
    _tab: 'songs',
    _editId: null,

    init() {
        // Seed defaults with full data
        const defaults = {
            songs: [
                { id:1,  name:'Колыбельная',             duration:'', src:'assets/audio/songs/kolybelnaya.mp3' },
                { id:2,  name:'Песенка для мамы',         duration:'', src:'assets/audio/songs/pesenka_dlya_mamy.mp3' },
                { id:3,  name:'Песенка про слона',        duration:'', src:'assets/audio/songs/pesenka_pro_clona.mp3' },
                { id:4,  name:'Песенка про Деда Мороза',  duration:'', src:'assets/audio/songs/pesenka_pro_deda_moroza.mp3' },
                { id:5,  name:'Песенка про февраль',      duration:'', src:'assets/audio/songs/pesenka_pro_fevral.mp3' },
                { id:6,  name:'Песенка про льва',         duration:'', src:'assets/audio/songs/pesenka_pro_lva.mp3' },
                { id:7,  name:'Песенка про неделю',       duration:'', src:'assets/audio/songs/pesenka_pro_nedelyu.mp3' },
                { id:8,  name:'Песенка про носорога',     duration:'', src:'assets/audio/songs/pesenka_pro_nosoroga.mp3' },
                { id:9,  name:'Песенка про папу',         duration:'', src:'assets/audio/songs/pesenka_pro_papu.mp3' },
                { id:10, name:'Песенка про умывание',     duration:'', src:'assets/audio/songs/pesenka_pro_umyvanie.mp3' },
                { id:11, name:'Песенка про январь',       duration:'', src:'assets/audio/songs/pesenka_pro_yanvar.mp3' },
                { id:12, name:'Песенка про зебру',        duration:'', src:'assets/audio/songs/pesenka_pro_zebru.mp3' },
                { id:13, name:'В лесу родилась ёлочка',   duration:'', src:'assets/audio/songs/v_lesu_rodilas_yolochka.mp3' },
            ],
            podcasts: [
                { id:1, name:'Благодарность',    desc:'', duration:'', src:'assets/audio/podcasts/blagodarnost.mp3' },
                { id:2, name:'Доверие ребёнка',  desc:'', duration:'', src:'assets/audio/podcasts/doverie_rebyonka.mp3' },
                { id:3, name:'Мозг дошкольника', desc:'', duration:'', src:'assets/audio/podcasts/mozg_doshkolnika.mp3' },
                { id:4, name:'Поколение Альфа',  desc:'', duration:'', src:'assets/audio/podcasts/pokolenie_alfa.mp3' },
                { id:5, name:'Слушать сердцем',  desc:'', duration:'', src:'assets/audio/podcasts/slushat_serdtsem.mp3' },
                { id:6, name:'Сравнение',         desc:'', duration:'', src:'assets/audio/podcasts/sravnenie.mp3' },
            ],
            puzzles: [
                { id:1,  name:'Рыба',      pic:'assets/images/rebuses_pictures_opt/ryba.webp',     hint:'Присмотрись к картинке', answer:'рыба',     level:'easy' },
                { id:2,  name:'Ложка',     pic:'assets/images/rebuses_pictures_opt/lozhka.webp',   hint:'Присмотрись к картинке', answer:'ложка',    level:'easy' },
                { id:3,  name:'Вилка',     pic:'assets/images/rebuses_pictures_opt/vilka.webp',    hint:'Присмотрись к картинке', answer:'вилка',    level:'easy' },
                { id:4,  name:'Море',      pic:'assets/images/rebuses_pictures_opt/more.webp',     hint:'Присмотрись к картинке', answer:'море',     level:'easy' },
                { id:5,  name:'Радуга',    pic:'assets/images/rebuses_pictures_opt/raduga.webp',   hint:'Присмотрись к картинке', answer:'радуга',   level:'easy' },
                { id:6,  name:'Слон',      pic:'assets/images/rebuses_pictures_opt/slon.webp',     hint:'Присмотрись к картинке', answer:'слон',     level:'easy' },
                { id:7,  name:'Бабочка',   pic:'assets/images/rebuses_pictures_opt/babochka.webp', hint:'Присмотрись к картинке', answer:'бабочка',  level:'medium' },
                { id:8,  name:'Коньки',    pic:'assets/images/rebuses_pictures_opt/konki.webp',    hint:'Присмотрись к картинке', answer:'коньки',   level:'medium' },
                { id:9,  name:'Трактор',   pic:'assets/images/rebuses_pictures_opt/traktor.webp',  hint:'Присмотрись к картинке', answer:'трактор',  level:'medium' },
                { id:10, name:'Туча',      pic:'assets/images/rebuses_pictures_opt/tucha.webp',    hint:'Присмотрись к картинке', answer:'туча',     level:'medium' },
                { id:11, name:'Туман',     pic:'assets/images/rebuses_pictures_opt/tuman.webp',    hint:'Присмотрись к картинке', answer:'туман',    level:'medium' },
                { id:12, name:'Зелень',    pic:'assets/images/rebuses_pictures_opt/zelen.webp',    hint:'Присмотрись к картинке', answer:'зелень',   level:'medium' },
                { id:13, name:'Креветка',  pic:'assets/images/rebuses_pictures_opt/krevetka.webp', hint:'Присмотрись к картинке', answer:'креветка', level:'hard' },
                { id:14, name:'Забор',     pic:'assets/images/rebuses_pictures_opt/zabor.webp',    hint:'Присмотрись к картинке', answer:'забор',    level:'hard' },
                { id:15, name:'Токарь',    pic:'assets/images/rebuses_pictures_opt/tokar.webp',    hint:'Присмотрись к картинке', answer:'токарь',   level:'hard' },
            ],
            info: [
                { id:1, name:'🌟 О приложении', body:'Говоруша — детское образовательное приложение для изучения букв, цифр, цветов и развития речи через игру и песенки.' },
                { id:2, name:'📚 Разделы', body:'Алфавит — учим буквы с видео и аудио. Цифры — считаем от 0 до 9. Цвета — изучаем цвета. Песенки — любимые детские треки. Ребусы и Загадки — развиваем мышление. Гимнастика — пальчиковые и артик. упражнения.' },
                { id:3, name:'💡 Советы', body:'Занимайтесь каждый день по 15–20 минут. Хвалите ребёнка за каждый правильный ответ!' },
                { id:4, name:'🔗 Пример ссылки', body:'Наш сайт: [Говоруша](https://govorusha.ru)\nНаписать нам: [Telegram](https://t.me/govorusha)' },
            ],
            riddles: [
                { id:1, text:'Белым снегом всё одето, значит наступает ...', answer:'Зима', pic:'assets/images/riddles_pictures_opt/zima.webp' , level:'easy' },
                { id:2, text:'Охраняет часто дом, повиляет всем хвостом, зарычит, коль ты чужой, и оближет, если свой.', answer:'Собака', pic:'assets/images/riddles_pictures_opt/sobaka.webp' , level:'easy' },
                { id:3, text:'По реке плывёт бревно, ох и злющее оно,  тем, кто в речку угодил, нос откусит ...', answer:'Крокодил', pic:'assets/images/riddles_pictures_opt/krokodil.webp' , level:'easy' },
                { id:7, text:'Мимо улья проходил косолапый ...', answer:'Медведь', pic:'assets/images/riddles_pictures_opt/medved.webp' , level:'easy' },
                { id:8, text:'Ночью каждое оконце слабо освещает ...', answer:'Луна', pic:'assets/images/riddles_pictures_opt/luna.webp' , level:'easy' },
                { id:9, text:'Овощ это непростой,\nВызовет слезу порой,\nНо уж больно он полезный\nЗащищает от болезней!', answer:'Лук', pic:'assets/images/riddles_pictures_opt/luk.webp' , level:'easy' },
                { id:10, text:'Кто мычит там на лугу,\nСочную жует траву,\nУгощает молоком\nИ полезным творожком.', answer:'Корова', pic:'assets/images/riddles_pictures_opt/korova.webp' , level:'easy' },
                { id:11, text:'С ветки прыгает на ветку\nРыжая красавица.\nШишки, желуди, орехи\nЗапасает на зиму.', answer:'белка', pic:'assets/images/riddles_pictures_opt/belka.webp' , level:'easy' },
                { id:12, text:'Он хвостастый и зубастый,\nНа луну он воет часто,\nВсе в лесу его боятся,\nА в особенности, зайцы.', answer:'волк', pic:'assets/images/riddles_pictures_opt/volk.webp' , level:'easy' },
                { id:13, text:'В лесу живёт плутовка,\nХитры её глаза,\nА цветом, как морковка,\nПушистая...', answer:'Лиса', pic:'assets/images/riddles_pictures_opt/lisa.webp' , level:'easy' },
                { id:14, text:'Живет в берлоге он в лесу,\nПугает волка и лису,\nЛюбит ягоды и мед,\nКосолапо он идет.', answer:'Медведь', pic:'assets/images/riddles_pictures_opt/medved.webp' , level:'medium' },
                { id:16, text:'Он пятнистый, с длинной шеей,\nГде-то в Африке живет.\nИ с огромных он деревьев\nЛегко листья достает.', answer:'Жираф', pic:'assets/images/riddles_pictures_opt/zhiraf.webp' , level:'medium' },
                { id:17, text:'Траву жуёт. Носит матроску\nВ чёрно - белую полоску.', answer:'Зебра', pic:'assets/images/riddles_pictures_opt/zebra.webp' , level:'medium' },
                { id:18, text:'В цирке трюки выполняет,\nБрёвна хоботом таскает.\nСерый и громадный он,\nКто же это? Это ...', answer:'Слон', pic:'assets/images/riddles_pictures_opt/slon.webp' , level:'medium' },
                { id:19, text:'В зоопарке, в синей клетке\nЛовко прыгает по сетке,\nКорчит рожи, ест бананы.\nКто? Конечно', answer:'Обезьяна', pic:'assets/images/riddles_pictures_opt/obezyana.webp' , level:'medium' },
                { id:20, text:'Нет того, кто не боится\nЭтой грозной хищной птицы.\nКто куда бы не забрёл,\nСверху видит всё…', answer:'Орёл', pic:'assets/images/riddles_pictures_opt/orel.webp' , level:'medium' },
                { id:21, text:'Хвост веером, на голове корона, нет птицы краше чем ...', answer:'Павлин', pic:'assets/images/riddles_pictures_opt/pavlin.webp' , level:'medium' },
                { id:22, text:'Рано он всегда встаёт,\nПо утрам всегда поёт,\nНосит гребень и серёжки,\nВ перьях все его одёжки.', answer:'Петух', pic:'assets/images/riddles_pictures_opt/petukh.webp' , level:'medium' },
                { id:23, text:'Маленькая птичка\nЧирикает отлично,\nПрыгает по веткам,\nЖить не станет в клетке.\nНе таится от людей\nРазвесёлый...', answer:'воробей', pic:'assets/images/riddles_pictures_opt/vorobey.webp' , level:'medium' },
                { id:24, text:'Перья черные летят,\nВсюду каркают, кричат,\nЧто за важная персона?\nЭто черная...', answer:'Ворона', pic:'assets/images/riddles_pictures_opt/vorona.webp' , level:'medium' },
                { id:25, text:'Я по травке не спешу.\nЕсли станет страшно вдруг,\nСпрячусь в домик, милый друг.', answer:'Улитка', pic:'assets/images/riddles_pictures_opt/ulitka.webp' , level:'hard' },
                { id:26, text:'На пруду на живёт,\nГромко песенки поёт,\nПучеглазая зверюшка\nНазывается...', answer:'Лягушка', pic:'assets/images/riddles_pictures_opt/lyagushka.webp' , level:'hard' },
                { id:27, text:'В пустыне живёт,\nПодолгу не пьёт,\nС жарой легко справляется,\nКолючками питается.', answer:'Верблюд', pic:'assets/images/riddles_pictures_opt/verblyud.webp' , level:'hard' },
                { id:29, text:'Через море-океан\nПлывёт чудо-великан,\nПрячет ус во рту,\nРастянулся на версту.', answer:'Кит', pic:'assets/images/riddles_pictures_opt/kit.webp' , level:'hard' },
                { id:30, text:'Ем я уголь, пью я воду,\nКак напьюсь — прибавлю ходу.\nВезу обоз на сто колес\nИ называюсь...', answer:'Паровоз', pic:'assets/images/riddles_pictures_opt/parovoz.webp' , level:'hard' },
                { id:31, text:'Она идет и зиму прогоняет.\nКогда придет, вокруг всё расцветает.\nОт солнышка прекрасного ясна.\nЗовут ее, конечно же ...', answer:'Весна', pic:'assets/images/riddles_pictures_opt/vesna.webp' , level:'hard' },
                { id:32, text:'Если крылья распахнет —\nКрасотой с ума сведет.\nНа лугу она летает,\nВсех собою удивляет.', answer:'Бабочка', pic:'assets/images/riddles_pictures_opt/babochka.webp' , level:'hard' },
                { id:34, text:'Живёт в норке, грызёт корки, боится кошки.', answer:'Мышь', pic:'assets/images/riddles_pictures_opt/mysh.webp' , level:'hard' },
                { id:36, text:'Лечит маленьких детей,\nЛечит птичек и зверей,\nСквозь очки свои глядит\nДобрый доктор...', answer:'Айболит', pic:'assets/images/riddles_pictures_opt/aybolit.webp' , level:'hard' },
                { id:37, text:'Сначала пашут,\nПотом засевают,\nВремя придёт,\nУрожай собирают!', answer:'Поле', pic:'assets/images/riddles_pictures_opt/pshenitsa.webp' , level:'hard' },
            ],
        };
        // Always refresh — force re-seed for all sections
        ['songs','podcasts','puzzles','riddles'].forEach(k => {
            const stored = localStorage.getItem('admin_' + k);
            let needsReseed = !stored;
            if (!needsReseed) {
                try {
                    const parsed = JSON.parse(stored);
                    // Reseed if empty, or podcasts is old placeholder, or riddles use old emoji format
                    if (parsed.length === 0) needsReseed = true;
                    if (k === 'podcasts' && parsed.length < 3) needsReseed = true;
                    if (k === 'riddles' && parsed[0] && (parsed[0].emoji !== undefined || parsed[0].text === '—')) needsReseed = true;
                    if (k === 'info' && parsed[0] && (!parsed[0].body || parsed.length < 4)) needsReseed = true;
                    // Убираем старые ребусы без pic или с неверными файлами
                    if (k === 'puzzles' && parsed.some(p => !p.pic || p.pic.includes('5+2'))) needsReseed = true;
                    // Убираем если есть ребусы с пустым answer (битые)
                    if (k === 'puzzles' && parsed.some(p => !p.answer)) needsReseed = true;
                    if (k === 'puzzles' && parsed[0] && parsed[0].img && !parsed[0].pic) needsReseed = true;
                } catch { needsReseed = true; }
            }
            if (needsReseed) {
                localStorage.setItem('admin_' + k, JSON.stringify(defaults[k]));
            }
        });
        this.render();
        // Восстанавливаем токен из localStorage
        setTimeout(() => this._loadToken(), 30);
    },

    _getData(k) { try { return JSON.parse(localStorage.getItem('admin_' + k)) || []; } catch { return []; } },
    _setData(k, v) { localStorage.setItem('admin_' + k, JSON.stringify(v)); },

    setTab(tab, el) {
        this._tab = tab;
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        if (el) el.classList.add('active');
        this.render();
    },

    render() {
        const isNotif = this._tab === 'notif';
        // Toggle add/batch buttons visibility
        const addBtn = document.querySelector('.admin-add-btn');
        const batchBtn = document.getElementById('admin-batch-btn');
        if (addBtn) addBtn.style.display = isNotif ? 'none' : '';
        if (batchBtn && !isNotif) batchBtn.classList.toggle('hidden', this._tab !== 'puzzles');

        if (isNotif) {
            this._renderNotifTab();
            return;
        }

        const items = this._getData(this._tab);
        const list = document.getElementById('admin-list');
        list.innerHTML = '';
        if (!items.length) {
            list.innerHTML = '<div style="text-align:center;color:var(--text2);padding:30px;font-weight:700;">Список пуст</div>';
            return;
        }
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'admin-item';
            const sub = this._tab === 'songs'    ? (item.duration || '') :
                        this._tab === 'podcasts' ? ((item.desc ? item.desc.slice(0,40) + (item.desc.length>40?'…':'') : '') || item.duration || '') :
                        this._tab === 'riddles'  ? (item.level === 'medium' ? '🟡 ' : item.level === 'hard' ? '🔴 ' : '🟢 ') + 'Ответ: ' + item.answer :
                        this._tab === 'info'     ? (item.body ? item.body.slice(0,50) + (item.body.length>50?'…':'') : '') :
                        `${item.level || ''} | Ответ: ${item.answer || ''}`;
            div.innerHTML = `
                <div class="admin-item-info">
                    <div class="admin-item-title">${item.name || item.text || item.title || '—'}</div>
                    <div class="admin-item-sub">${sub}</div>
                </div>
                <button class="admin-edit" data-id="${item.id}"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="admin-del"  data-id="${item.id}"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
            `;
            list.appendChild(div);
        });

        list.querySelectorAll('.admin-del').forEach(btn => btn.addEventListener('click', () => {
            const item = this._getData(this._tab).find(i => i.id === parseInt(btn.dataset.id));
            const name = item ? (item.name || item.text || 'элемент') : 'элемент';
            showConfirm(`Удалить «${name}»?`, () => {
                this._setData(this._tab, this._getData(this._tab).filter(i => i.id !== parseInt(btn.dataset.id)));
                this.render();
                showToast('🗑️ Удалено');
            });
        }));
        list.querySelectorAll('.admin-edit').forEach(btn => btn.addEventListener('click', () => {
            const item = this._getData(this._tab).find(i => i.id === parseInt(btn.dataset.id));
            if (item) this.openModal(item);
        }));
    },

    // Stores current src/pic while editing
    _editSrc: '',
    _editPic: '',

    _renderNotifTab() {
        const list = document.getElementById('admin-list');
        const notifs = this._getData('notif').sort((a, b) => b.id - a.id);

        let html = `
            <div class="notif-compose">
                <div style="font-weight:600;font-size:15px;margin-bottom:8px;font-family:var(--font-display);">Новое сообщение</div>
                <input type="text" id="notif-compose-title" placeholder="Заголовок" style="width:100%;padding:10px 14px;background:var(--card2);border:1.5px solid var(--border);border-radius:12px;font-size:14px;color:var(--text);outline:none;margin-bottom:6px;">
                <textarea id="notif-compose-body" rows="3" placeholder="Текст сообщения..." style="width:100%;padding:10px 14px;background:var(--card2);border:1.5px solid var(--border);border-radius:12px;font-size:14px;color:var(--text);outline:none;resize:none;line-height:1.5;margin-bottom:8px;"></textarea>
                <button class="admin-add-btn" style="width:100%" onclick="Admin._sendNotif()">
                    <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
                    Отправить
                </button>
            </div>`;

        if (notifs.length) {
            html += '<div style="margin-top:14px;font-size:12px;color:var(--text2);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:0 4px;">История</div>';
            notifs.forEach(n => {
                const date = n.date ? Notif._fmtDate(n.date) : '';
                const typeTag = n.auto ? '<span style="font-size:11px;color:#10b981;font-weight:500;">авто</span>' : '<span style="font-size:11px;color:#60a5fa;font-weight:500;">вручную</span>';
                html += `<div class="admin-item" style="margin-top:6px;">
                    <div class="admin-item-info">
                        <div class="admin-item-title">${n.title || '—'} ${typeTag}</div>
                        <div class="admin-item-sub">${n.body || ''} · ${date}</div>
                    </div>
                    <button class="admin-del" data-id="${n.id}"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
                </div>`;
            });
        }

        list.innerHTML = html;

        list.querySelectorAll('.admin-del').forEach(btn => btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            showConfirm('Удалить уведомление?', () => {
                this._setData('notif', this._getData('notif').filter(n => n.id !== id));
                this._renderNotifTab();
                showToast('🗑️ Удалено');
            });
        }));
    },

    _sendNotif() {
        const title = document.getElementById('notif-compose-title')?.value.trim();
        const body = document.getElementById('notif-compose-body')?.value.trim();
        if (!title && !body) { showToast('✏️ Введите заголовок или текст'); return; }
        const notifs = this._getData('notif');
        notifs.push({
            id: Date.now(),
            type: 'message',
            title: title || 'Сообщение',
            body: body || '',
            date: new Date().toISOString(),
            auto: false
        });
        this._setData('notif', notifs);
        this._renderNotifTab();
        Notif.updateBadge();
        showToast('✅ Уведомление добавлено');
    },

    _onFileChange(input) {
        const file = input.files[0];
        if (!file) return;
        document.getElementById('m-file-name').textContent = file.name;
        // Показываем превью картинки сразу
        const isQA = this._tab === 'riddles' || this._tab === 'puzzles';
        if (isQA && file.type.startsWith('image/')) {
            const preview = document.getElementById('m-pic-preview');
            if (preview) {
                const url = URL.createObjectURL(file);
                preview.src = url;
                preview.style.display = 'block';
                preview.onload = () => URL.revokeObjectURL(url);
            }
        }
    },

    openModal(item) {
        this._editId  = item ? item.id  : null;
        this._editSrc = item ? (item.src || '') : '';
        this._editPic = item ? (item.pic || '') : '';

        document.getElementById('modal-title').textContent = item ? 'Редактировать' : 'Добавить';
        // Управляем полями в зависимости от вкладки
        const nameInput = document.getElementById('m-name-input');
        const nameArea  = document.getElementById('m-name-area');
        const descArea  = document.getElementById('m-desc');
        const isRiddle  = this._tab === 'riddles';
        const isPodcast = this._tab === 'podcasts';
        const isPuzzle  = this._tab === 'puzzles';
        const isInfo    = this._tab === 'info';
        // Показываем нужное поле для названия
        nameInput.style.display = (isRiddle || isPuzzle) ? 'none' : 'block';
        nameArea.style.display  = isRiddle ? 'block' : 'none';
        nameArea.placeholder    = 'Текст загадки...';
        descArea.style.display  = isPodcast ? 'block' : 'none';
        const bodyArea = document.getElementById('m-body');
        if (bodyArea) {
            bodyArea.style.display = isInfo ? 'block' : 'none';
            if (isInfo) bodyArea.value = item ? (item.body || '') : '';
        }
        const bodyHint = document.getElementById('m-body-hint');
        if (bodyHint) bodyHint.style.display = isInfo ? 'block' : 'none';
        // Заполняем значения
        const nameVal = item ? (item.name || item.text || '') : '';
        nameInput.value = nameVal;
        nameArea.value  = nameVal;
        if (descArea) descArea.value = item ? (item.desc || '') : '';
        document.getElementById('m-answer').value = item ? (item.answer || '') : '';
        document.getElementById('m-hint').value   = item ? (item.hint  || item.img || '') : '';
        document.getElementById('m-level').value  = item ? (item.level || '') : '';

        // Reset file input
        const fileInput = document.getElementById('m-file');
        if (fileInput) fileInput.value = '';

        const isAudio = this._tab === 'songs' || this._tab === 'podcasts';
        const isQA    = this._tab === 'riddles' || this._tab === 'puzzles';

        // Show current file name
        const currentPath = isAudio ? this._editSrc : this._editPic;
        const currentFileName = currentPath ? currentPath.split('/').pop() : '';
        const curFileEl = document.getElementById('m-current-file');
        if (curFileEl) {
            if (currentFileName) {
                curFileEl.innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Текущий файл: ' + currentFileName;
                curFileEl.classList.add('visible');
            } else {
                curFileEl.textContent = '';
                curFileEl.classList.remove('visible');
            }
        }
        document.getElementById('m-file-name').textContent = 'Файл не выбран';

        // Show image preview for riddles/puzzles
        const preview = document.getElementById('m-pic-preview');
        if (preview) {
            if (this._editPic && isQA) {
                preview.src = this._editPic;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
                preview.src = '';
            }
        }

        // Для ребусов название = ответу, скрываем дублирующее поле
        // m-name-input/area уже управляются выше
        document.getElementById('m-answer').style.display = isQA  ? 'block' : 'none';
        // Подсказка только для ребусов
        document.getElementById('m-hint').style.display   = this._tab === 'puzzles' ? 'block' : 'none';
        // Уровень — для ребусов И загадок
        document.getElementById('m-level').style.display  = isQA ? 'block' : 'none';
        if (this._tab === 'riddles') {
            const lvSel = document.getElementById('m-level');
            if (lvSel) {
                lvSel.querySelector('option[value=""]').textContent = 'Уровень сложности';
                lvSel.querySelector('option[value="easy"]').textContent   = '● Простой';
                lvSel.querySelector('option[value="medium"]').textContent = '● Средний';
                lvSel.querySelector('option[value="hard"]').textContent   = '● Сложный';
            }
        }
        // Для info — скрываем файл/ответ/картинку
        const fileLabel = document.querySelector('.file-label');
        if (fileLabel) fileLabel.style.display = isInfo ? 'none' : '';
        const fileNameEl = document.getElementById('m-file-name');
        if (fileNameEl) fileNameEl.style.display = isInfo ? 'none' : '';

        document.getElementById('modal').classList.remove('hidden');
    },

    closeModal(e) {
        if (!e || e.target === document.getElementById('modal')) {
            document.getElementById('modal').classList.add('hidden');
            this._editSrc = '';
            this._editPic = '';
            const preview = document.getElementById('m-pic-preview');
            if (preview) { preview.style.display = 'none'; preview.src = ''; }
            const curFileEl = document.getElementById('m-current-file');
            if (curFileEl) { curFileEl.textContent = ''; curFileEl.classList.remove('visible'); }
            const ni = document.getElementById('m-name-input'); if (ni) ni.value = '';
            const na = document.getElementById('m-name-area');  if (na) na.value = '';
            const nd = document.getElementById('m-desc');       if (nd) nd.value = '';
            const nb = document.getElementById('m-body');       if (nb) nb.value = '';
        }
    },

    async save() {
        // Читаем из правильного поля (input или textarea)
        const nameInput = document.getElementById('m-name-input');
        const nameArea  = document.getElementById('m-name-area');
        const isRiddle  = this._tab === 'riddles';
        const isPodcast = this._tab === 'podcasts';
        const name = (isRiddle ? nameArea : nameInput).value.trim();
        if (!name) { showToast('⚠️ Введите название'); return; }

        const items = this._getData(this._tab);
        const id = this._editId || Date.now();
        const existing = this._editId ? items.find(i => i.id === this._editId) : null;

        // ── Сохраняем картинку локально как base64 (загрузка на GitHub — при публикации) ──
        const isQA = this._tab === 'riddles' || this._tab === 'puzzles';
        const isAudio = this._tab === 'songs' || this._tab === 'podcasts';

        // Обработка файлов для аудио (песенки/подкасты)
        if (isAudio) {
            const fileInput = document.getElementById('m-file');
            const file = fileInput?.files[0];
            if (file) {
                const folder = this._tab === 'songs'
                    ? 'assets/audio/songs'
                    : 'assets/audio/podcasts';
                const ext  = file.name.split('.').pop().toLowerCase();
                const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-zа-яё0-9_-]/gi, '_');
                const fileName = base + '.' + ext;
                const filePath = folder + '/' + fileName;
                // Читаем как base64
                const base64 = await new Promise((res, rej) => {
                    const fr = new FileReader();
                    fr.onload  = () => res(fr.result);
                    fr.onerror = rej;
                    fr.readAsDataURL(file);
                });
                // Сохраняем base64 в очередь на загрузку
                const pending = JSON.parse(localStorage.getItem('admin_pending_audio') || '{}');
                pending[filePath] = base64;
                localStorage.setItem('admin_pending_audio', JSON.stringify(pending));
                this._editSrc = filePath;
            }
        }

        if (isQA) {
            const fileInput = document.getElementById('m-file');
            const file = fileInput?.files[0];
            if (file) {
                const folder = this._tab === 'riddles'
                    ? 'assets/images/riddles_pictures_opt'
                    : 'assets/images/rebuses_pictures_opt';
                const ext  = file.name.split('.').pop().toLowerCase();
                const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-zа-яё0-9_-]/gi, '_');
                const fileName = base + '.' + ext;
                const filePath = folder + '/' + fileName;
                // Читаем как base64
                const base64 = await new Promise((res, rej) => {
                    const fr = new FileReader();
                    fr.onload  = () => res(fr.result); // data:image/...;base64,...
                    fr.onerror = rej;
                    fr.readAsDataURL(file);
                });
                // Сохраняем base64 в очередь на загрузку
                const pending = JSON.parse(localStorage.getItem('admin_pending_pics') || '{}');
                pending[filePath] = base64;
                localStorage.setItem('admin_pending_pics', JSON.stringify(pending));
                this._editPic = filePath; // путь уже финальный
            }
        }

        let newItem;
        if (this._tab === 'songs' || this._tab === 'podcasts') {
            const descVal = document.getElementById('m-desc')?.value.trim() || '';
            newItem = {
                id, name,
                desc:     isPodcast ? descVal : '',
                duration: existing ? (existing.duration || '') : '',
                src:      this._editSrc || (existing ? (existing.src || '') : '')
            };
        } else if (this._tab === 'riddles') {
            newItem = {
                id,
                text:   name,
                answer: document.getElementById('m-answer').value.trim(),
                pic:    this._editPic || (existing ? (existing.pic || '') : ''),
                level:  document.getElementById('m-level').value || 'easy',
            };
        } else if (this._tab === 'info') {
            const bodyVal = (document.getElementById('m-body')?.value || '').trim();
            if (!bodyVal) { showToast('⚠️ Введите текст блока'); return; }
            newItem = { id, name, body: bodyVal };
        } else {
            // puzzles — name = answer
            const puzzleAnswer = document.getElementById('m-answer').value.trim();
            newItem = {
                id,
                name:   puzzleAnswer,
                pic:    this._editPic || (existing ? (existing.pic || '') : ''),
                hint:   document.getElementById('m-hint').value.trim(),
                answer: puzzleAnswer,
                level:  document.getElementById('m-level').value || 'easy',
            };
        }

        if (this._editId) {
            const idx = items.findIndex(i => i.id === this._editId);
            if (idx !== -1) items[idx] = newItem;
        } else {
            items.push(newItem);
        }

        this._setData(this._tab, items);
        this.closeModal();
        this.render();
        if (this._tab === 'songs') Songs._allSongs = this._getData('songs').map(s => ({...s}));
        if (this._tab === 'podcasts') Podcasts._allPodcasts = this._getData('podcasts').map(p => ({...p}));
        if (this._tab === 'puzzles') {
            const saved = this._getData('puzzles');
            if (saved.length) {
                Puzzles._data = { easy: [], medium: [], hard: [] };
                saved.forEach(p => {
                    const lv = p.level || 'easy';
                    if (Puzzles._data[lv]) Puzzles._data[lv].push({ pic: p.pic||'', hint: p.hint||'', answer: p.answer||'' });
                });
            }
        }
        if (this._tab === 'riddles') Riddles._loadFromAdmin();
        if (this._tab === 'info') Info.render();
        this._updatePendingBadge();
        showToast(this._editId ? '✅ Изменения сохранены' : '✅ Добавлено');
    },


    // ── Обновить счётчик pending картинок на кнопке публикации ──
    _updatePendingBadge() {
        const pendingPics = JSON.parse(localStorage.getItem('admin_pending_pics') || '{}');
        const pendingAudio = JSON.parse(localStorage.getItem('admin_pending_audio') || '{}');
        const count = Object.keys(pendingPics).length + Object.keys(pendingAudio).length;
        const btn = document.getElementById('publish-btn');
        if (!btn) return;
        btn.innerHTML = count > 0
            ? `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Опубликовать (${count})`
            : '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Опубликовать на GitHub';
    },

    // ── GitHub Token helpers ──
    saveToken(val) {
        if (val) localStorage.setItem('gh_token', val.trim());
        else localStorage.removeItem('gh_token');
    },

    toggleTokenEye(btn) {
        const inp = document.getElementById('github-token-input');
        if (!inp) return;
        const isHidden = inp.type === 'password';
        inp.type = isHidden ? 'text' : 'password';
        btn.innerHTML = isHidden ? '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' : '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    },

    // Вызывается при открытии Админки — восстанавливает токен из localStorage
    _loadToken() {
        const saved = localStorage.getItem('gh_token');
        const inp = document.getElementById('github-token-input');
        if (inp && saved) inp.value = saved;
    },

    // ── Публикация в GitHub ──
    async publish() {
        const REPO  = 'Saturn-Kassiel/Kids-site';   // ← ваш репозиторий
        const FILE  = 'data.json';                   // ← файл в корне репо
        const BRANCH = 'main';                       // ← ветка

        const token = (document.getElementById('github-token-input')?.value || '').trim()
                   || localStorage.getItem('gh_token') || '';

        if (!token) {
            showToast('⚠️ Введите GitHub Token');
            document.getElementById('github-token-input')?.focus();
            return;
        }

        const headers = {
            'Authorization': `token ${token}`,
            'Content-Type':  'application/json',
            'Accept':        'application/vnd.github.v3+json'
        };

        // ── Сначала загружаем все pending картинки ──
        const pending = JSON.parse(localStorage.getItem('admin_pending_pics') || '{}');
        const pendingPaths = Object.keys(pending);
        if (pendingPaths.length > 0) {
            const btn2 = document.getElementById('publish-btn');
            if (btn2) btn2.textContent = `⏳ Картинки: 0/${pendingPaths.length}...`;
            let uploaded = 0;
            for (const filePath of pendingPaths) {
                const dataUrl = pending[filePath];
                const base64  = dataUrl.split(',')[1]; // убираем data:...;base64,
                const apiUrl  = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
                // Проверяем SHA если файл уже есть
                let sha = null;
                try {
                    const gr = await fetch(apiUrl + `?ref=${BRANCH}`, { headers });
                    if (gr.ok) { const gj = await gr.json(); sha = gj.sha; }
                } catch (_) {}
                const pb = { message: `🖼️ ${filePath.split('/').pop()}`, content: base64, branch: BRANCH, ...(sha ? { sha } : {}) };
                const pr = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(pb) });
                if (pr.ok) {
                    uploaded++;
                    delete pending[filePath];
                    localStorage.setItem('admin_pending_pics', JSON.stringify(pending));
                    if (btn2) btn2.textContent = `⏳ Картинки: ${uploaded}/${pendingPaths.length}...`;
                } else {
                    const pe = await pr.json();
                    showToast('❌ Ошибка картинки: ' + (pe.message || pr.status));
                }
            }
        }

        // ── Загружаем pending аудио файлы ──
        const pendingAudio = JSON.parse(localStorage.getItem('admin_pending_audio') || '{}');
        const audioPaths = Object.keys(pendingAudio);
        if (audioPaths.length > 0) {
            const btn2 = document.getElementById('publish-btn');
            if (btn2) btn2.textContent = `⏳ Аудио: 0/${audioPaths.length}...`;
            let uploaded = 0;
            for (const filePath of audioPaths) {
                const dataUrl = pendingAudio[filePath];
                const base64  = dataUrl.split(',')[1];
                const apiUrl  = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
                let sha = null;
                try {
                    const gr = await fetch(apiUrl + `?ref=${BRANCH}`, { headers });
                    if (gr.ok) { const gj = await gr.json(); sha = gj.sha; }
                } catch (_) {}
                const pb = { message: `🎵 ${filePath.split('/').pop()}`, content: base64, branch: BRANCH, ...(sha ? { sha } : {}) };
                const pr = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(pb) });
                if (pr.ok) {
                    uploaded++;
                    delete pendingAudio[filePath];
                    localStorage.setItem('admin_pending_audio', JSON.stringify(pendingAudio));
                    if (btn2) btn2.textContent = `⏳ Аудио: ${uploaded}/${audioPaths.length}...`;
                } else {
                    const pe = await pr.json();
                    showToast('❌ Ошибка аудио: ' + (pe.message || pr.status));
                }
            }
        }

        // Собираем все данные Админки
        const data = {
            songs:    this._getData('songs'),
            podcasts: this._getData('podcasts'),
            puzzles:  this._getData('puzzles'),
            riddles:  this._getData('riddles'),
            info:     this._getData('info'),
            notifications: this._getData('notif').filter(n => !n.auto),
            exportedAt: new Date().toISOString()
        };
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

        const btn = document.getElementById('publish-btn');
        const origText = btn ? btn.innerHTML : '';
        if (btn) { btn.innerHTML = '⏳ Публикация...'; btn.disabled = true; }

        try {
            const apiUrl = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

            // Получаем текущий SHA файла (нужен для обновления)
            let sha = null;
            try {
                const getResp = await fetch(apiUrl + `?ref=${BRANCH}`, { headers });
                if (getResp.ok) {
                    const existing = await getResp.json();
                    sha = existing.sha;
                }
            } catch (_) { /* файл ещё не существует */ }

            // Загружаем файл
            const body = {
                message: `📱 Обновление данных приложения ${new Date().toLocaleString('ru')}`,
                content,
                branch: BRANCH,
                ...(sha ? { sha } : {})
            };

            const putResp = await fetch(apiUrl, {
                method:  'PUT',
                headers,
                body: JSON.stringify(body)
            });

            if (putResp.ok) {
                const result = await putResp.json();
                localStorage.setItem('gh_token', token); // сохраняем токен
                localStorage.removeItem('admin_pending_pics');
                localStorage.removeItem('admin_pending_audio');
                const stillPending = Object.keys(JSON.parse(localStorage.getItem('admin_pending_pics') || '{}')).length;
                showToast('✅ Данные опубликованы на GitHub!');
                console.log('Published:', result.content?.html_url);
                // Флаг: при следующем открытии сайта загрузить свежие данные
                localStorage.setItem('gh_data_updated', 'true');
            } else {
                const err = await putResp.json();
                const msg = err.message || 'Ошибка';
                if (putResp.status === 401) showToast('❌ Токен недействителен');
                else if (putResp.status === 404) showToast('❌ Репозиторий не найден');
                else if (putResp.status === 403) showToast('❌ Нет прав на запись');
                else showToast('❌ Ошибка: ' + msg);
            }
        } catch (e) {
            showToast('❌ Нет соединения с GitHub');
            console.error('Publish error:', e);
        } finally {
            if (btn) { btn.innerHTML = origText; btn.disabled = false; }
        }
    }
};

// =============================================
// INTERSTITIALS — Перебивки с мини-заданиями
// =============================================
const Interstitials = {
    // Счётчики действий с последней перебивки (по разделам)
    _counters: { media: 0, words: 0, math: 0 },
    // Порог для показа перебивки
    _thresholds: { media: 5, words: 3, math: 3 },
    // Текущее задание
    _active: false,
    _resolve: null,  // callback после закрытия
    // Итоговый счёт в текущей сессии (показываем в оверлее)
    _sessionScore: 0,
    // Стрик для достижений
    _streak: 0,
    _bestStreak: 0,
    _shownMilestones: new Set(),
    // Тип 5: данные для «запомни»
    _memoryData: null,

    // ── Проверка настройки ──
    isEnabled() {
        return getSoundSetting('interstitials'); // по умолчанию true
    },

    // ── Инкремент + проверка. Возвращает true если перебивка будет показана ──
    bump(section) {
        if (!this.isEnabled()) return false;
        this._counters[section] = (this._counters[section] || 0) + 1;
        if (this._counters[section] >= this._thresholds[section]) {
            this._counters[section] = 0;
            // Небольшая задержка, чтобы не перебивать текущую анимацию
            setTimeout(() => this._show(), 600);
            return true;
        }
        return false;
    },

    resetCounter(section) {
        this._counters[section] = 0;
    },

    // ── Выбор случайного типа и показ ──
    _show() {
        if (this._active) return;
        this._active = true;

        // Выбираем случайный тип задания
        const types = ['countObjects', 'whatColor', 'missingLetter', 'quickCount', 'oddOneOut'];
        const type = types[Math.floor(Math.random() * types.length)];

        // Генерируем задание
        const task = this['_gen_' + type]();
        this._render(task, type);
    },

    // ═══════════════════════════════════════
    //  ГЕНЕРАТОРЫ ЗАДАНИЙ
    // ═══════════════════════════════════════

    _rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
    _shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    // ── Тип 2: Сосчитай предметы ──
    _gen_countObjects() {
        const emojis = ['🍎','🐱','🎈','🌟','🐟','🦋','🍄','🌸','🐶','🍉','🍊','🐸','🚀','⚽','🎂'];
        const emoji = emojis[this._rand(0, emojis.length - 1)];
        const correct = this._rand(2, 8);
        const display = Array(correct).fill(emoji).join(' ');

        // Варианты ответа
        let options = [correct];
        while (options.length < 4) {
            const opt = this._rand(Math.max(1, correct - 3), correct + 3);
            if (!options.includes(opt)) options.push(opt);
        }
        options = this._shuffle(options);

        return {
            title: 'Сосчитай! 🔢',
            question: display,
            questionClass: 'inter-emoji-display',
            options: options.map(o => ({ text: String(o), correct: o === correct })),
        };
    },

    // ── Тип 3: Какой это цвет? ──
    _gen_whatColor() {
        const COLORS = [
            { name:'Красный',    hex:'#ef4444' },
            { name:'Оранжевый',  hex:'#f97316' },
            { name:'Жёлтый',     hex:'#fbbf24' },
            { name:'Зелёный',    hex:'#22c55e' },
            { name:'Синий',      hex:'#3b82f6' },
            { name:'Фиолетовый', hex:'#a855f7' },
            { name:'Розовый',    hex:'#ec4899' },
            { name:'Голубой',    hex:'#06b6d4' },
        ];

        const target = COLORS[this._rand(0, COLORS.length - 1)];
        let options = [target];
        while (options.length < 4) {
            const c = COLORS[this._rand(0, COLORS.length - 1)];
            if (!options.find(o => o.name === c.name)) options.push(c);
        }
        options = this._shuffle(options);

        return {
            title: 'Какой это цвет? 🎨',
            question: `<div class="inter-color-circle" style="background:${target.hex}"></div>`,
            questionClass: 'inter-color-display',
            questionIsHTML: true,
            options: options.map(o => ({ text: o.name, correct: o.name === target.name })),
        };
    },

    // ── Тип 4: Какая буква пропала? ──
    _gen_missingLetter() {
        const words = [
            { word:'КОТ', emoji:'🐱' }, { word:'ДОМ', emoji:'🏠' }, { word:'ШАР', emoji:'🎈' },
            { word:'СОК', emoji:'🧃' }, { word:'ЛЕС', emoji:'🌲' }, { word:'МЯЧ', emoji:'⚽' },
            { word:'ЛЕВ', emoji:'🦁' }, { word:'КИТ', emoji:'🐳' }, { word:'МЁД', emoji:'🍯' },
            { word:'СЫР', emoji:'🧀' }, { word:'РЫБА', emoji:'🐟' }, { word:'ЛУНА', emoji:'🌙' },
            { word:'ЛИСА', emoji:'🦊' }, { word:'РОЗА', emoji:'🌹' }, { word:'УТКА', emoji:'🦆' },
        ];
        const item = words[this._rand(0, words.length - 1)];
        const letters = item.word.split('');
        const gapIdx = this._rand(0, letters.length - 1);
        const correct = letters[gapIdx];

        // Показываем слово с пропуском
        const display = letters.map((l, i) => i === gapIdx ? '_' : l).join('');

        // Варианты ответа
        const alphabet = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ';
        let options = [correct];
        while (options.length < 4) {
            const l = alphabet[this._rand(0, alphabet.length - 1)];
            if (!options.includes(l)) options.push(l);
        }
        options = this._shuffle(options);

        return {
            title: `Какая буква пропала? ${item.emoji}`,
            question: `<span class="inter-word-gap">${display}</span>`,
            questionClass: 'inter-word-display',
            questionIsHTML: true,
            options: options.map(o => ({ text: o, correct: o === correct })),
        };
    },

    // ── Тип 5: Быстрый счёт (запомни) ──
    _gen_quickCount() {
        const emojis = ['🍎','🐱','🎈','🌟','🐟','🦋','🍄','🌸','🐶','🍉'];
        const emoji = emojis[this._rand(0, emojis.length - 1)];
        const correct = this._rand(3, 7);

        let options = [correct];
        while (options.length < 4) {
            const opt = this._rand(Math.max(1, correct - 2), correct + 2);
            if (!options.includes(opt)) options.push(opt);
        }
        options = this._shuffle(options);

        // Сохраняем данные для двухфазного показа
        this._memoryData = {
            emoji,
            correct,
            options: options.map(o => ({ text: String(o), correct: o === correct })),
        };

        return {
            title: 'Запомни! 👀',
            question: Array(correct).fill(emoji).join(' '),
            questionClass: 'inter-emoji-display inter-memory-flash',
            isMemory: true,
            options: [], // будут показаны после фазы запоминания
        };
    },

    // ── Тип 6: Что лишнее? ──
    _gen_oddOneOut() {
        const groups = [
            { items: ['🐱','🐶','🐟','🌹'], odd: 3, category: 'Животные' },
            { items: ['🍎','🍊','🍉','⚽'], odd: 3, category: 'Фрукты' },
            { items: ['🔴','🟢','🔵','⭐'], odd: 3, category: 'Цвета' },
            { items: ['🚗','🚌','🚂','🐱'], odd: 3, category: 'Транспорт' },
            { items: ['☀️','🌙','⭐','🍎'],  odd: 3, category: 'В небе' },
            { items: ['🎈','🎂','🎁','📖'], odd: 3, category: 'Праздник' },
            { items: ['🍊','🥕','🎃','🐸'], odd: 3, category: 'Оранжевые' },
            { items: ['🌲','🌳','🌿','🍎'], odd: 3, category: 'Растения' },
            { items: ['✏️','📖','🎒','🐶'], odd: 3, category: 'Школа' },
            { items: ['🧀','🍞','🥛','🚀'], odd: 3, category: 'Еда' },
        ];

        const group = groups[this._rand(0, groups.length - 1)];
        // Перемешиваем позиции, запоминая где лишний
        const indices = [0, 1, 2, 3];
        const shuffled = this._shuffle(indices);
        const oddNewIdx = shuffled.indexOf(group.odd);
        const items = shuffled.map(i => group.items[i]);

        return {
            title: 'Что лишнее? 🤔',
            question: '',
            questionClass: '',
            isGrid: true,
            gridItems: items,
            oddIndex: oddNewIdx,
            options: [], // будут кнопки-эмодзи
        };
    },

    // ═══════════════════════════════════════
    //  РЕНДЕР ОВЕРЛЕЯ
    // ═══════════════════════════════════════

    _render(task, type) {
        // Удаляем старый если есть
        const old = document.getElementById('inter-overlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'inter-overlay';

        let bodyHTML = '';

        if (type === 'quickCount') {
            // Фаза 1: показ предметов
            bodyHTML = `
                <div class="inter-card">
                    <div class="inter-title">${task.title}</div>
                    <div class="${task.questionClass}">${task.question}</div>
                    <div class="inter-timer-bar"><div class="inter-timer-fill" id="inter-timer-fill"></div></div>
                    <div class="inter-hint">Запоминай!</div>
                </div>
            `;
        } else if (type === 'oddOneOut') {
            // Сетка из 4 больших эмодзи-кнопок
            const gridBtns = task.gridItems.map((emoji, i) =>
                `<button class="inter-grid-btn" data-idx="${i}" onclick="Interstitials._answerOdd(${i},${task.oddIndex})">${emoji}</button>`
            ).join('');
            bodyHTML = `
                <div class="inter-card">
                    <div class="inter-title">${task.title}</div>
                    <div class="inter-grid">${gridBtns}</div>
                    <div class="inter-score">Счёт перебивок: <b>${StatTracker.get('interstitials')}</b></div>
                </div>
            `;
        } else {
            // Стандартный формат: вопрос + 4 кнопки
            const questionHTML = task.questionIsHTML ? task.question : `<div>${task.question}</div>`;
            const optBtns = task.options.map((o, i) =>
                `<button class="inter-opt-btn" data-idx="${i}" onclick="Interstitials._answer(${i},${o.correct})">${o.text}</button>`
            ).join('');
            bodyHTML = `
                <div class="inter-card">
                    <div class="inter-title">${task.title}</div>
                    <div class="${task.questionClass}">${questionHTML}</div>
                    <div class="inter-options">${optBtns}</div>
                    <div class="inter-score">Счёт перебивок: <b>${StatTracker.get('interstitials')}</b></div>
                </div>
            `;
        }

        overlay.innerHTML = bodyHTML;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('inter-visible'));

        // Тип 5: через 3 секунды скрываем предметы, показываем вопрос
        if (type === 'quickCount') {
            const fill = document.getElementById('inter-timer-fill');
            if (fill) fill.style.width = '100%';
            setTimeout(() => this._memoryPhase2(), 3000);
        }
    },

    // ── Фаза 2 для «Быстрый счёт» ──
    _memoryPhase2() {
        const data = this._memoryData;
        if (!data) return;
        const card = document.querySelector('.inter-card');
        if (!card) return;

        const optBtns = data.options.map((o, i) =>
            `<button class="inter-opt-btn" data-idx="${i}" onclick="Interstitials._answer(${i},${o.correct})">${o.text}</button>`
        ).join('');

        card.innerHTML = `
            <div class="inter-title">Сколько было ${data.emoji}?</div>
            <div class="inter-memory-question">🤔</div>
            <div class="inter-options">${optBtns}</div>
            <div class="inter-score">Счёт перебивок: <b>${StatTracker.get('interstitials')}</b></div>
        `;
        // Анимация появления
        card.classList.add('inter-card-pop');
    },

    // ═══════════════════════════════════════
    //  ОБРАБОТКА ОТВЕТОВ
    // ═══════════════════════════════════════

    _answer(idx, isCorrect) {
        // Блокируем повторные нажатия
        document.querySelectorAll('.inter-opt-btn').forEach(b => b.disabled = true);
        const btn = document.querySelector(`.inter-opt-btn[data-idx="${idx}"]`);

        if (isCorrect) {
            this._onCorrect(btn);
        } else {
            this._onWrong(btn);
        }
    },

    _answerOdd(idx, correctIdx) {
        document.querySelectorAll('.inter-grid-btn').forEach(b => b.disabled = true);
        const btn = document.querySelector(`.inter-grid-btn[data-idx="${idx}"]`);

        if (idx === correctIdx) {
            this._onCorrect(btn);
        } else {
            this._onWrong(btn);
            // Подсветим правильный
            const correctBtn = document.querySelector(`.inter-grid-btn[data-idx="${correctIdx}"]`);
            if (correctBtn) correctBtn.classList.add('inter-correct');
        }
    },

    _onCorrect(btn) {
        if (btn) btn.classList.add('inter-correct');
        playCorrectSound('interstitials');
        StatTracker.inc('interstitials');
        this._streak++;
        if (this._streak > this._bestStreak) {
            this._bestStreak = this._streak;
            localStorage.setItem('inter_best_streak', this._bestStreak);
        }

        // Обновляем отображение счёта
        const scoreEl = document.querySelector('.inter-score b');
        if (scoreEl) scoreEl.textContent = StatTracker.get('interstitials');

        // Конфетти + звёздочки
        if (window.confetti) {
            confetti({ particleCount: 50, spread: 50, origin: { y: 0.5 }, zIndex: 100001 });
        }

        // Танцующий Гоша

        // Достижения (каждые 5 подряд)
        if (this._streak % 5 === 0 && !this._shownMilestones.has(this._streak)) {
            this._shownMilestones.add(this._streak);
            const cn = getChildName();
            showToast(cn ? `🏆 ${cn}, ${this._streak} перебивок подряд!` : `🏆 ${this._streak} перебивок подряд!`, 3000);
        }

        setTimeout(() => this._close(), 1200);
    },

    _onWrong(btn) {
        if (btn) btn.classList.add('inter-wrong');
        playWrongSound('interstitials');
        this._streak = 0;
        this._shownMilestones = new Set();

        // Подсвечиваем правильный ответ
        document.querySelectorAll('.inter-opt-btn').forEach(b => {
            if (b.getAttribute('onclick')?.includes('true')) b.classList.add('inter-correct');
        });

        setTimeout(() => this._close(), 1800);
    },

    _close() {
        const overlay = document.getElementById('inter-overlay');
        if (overlay) {
            overlay.classList.remove('inter-visible');
            setTimeout(() => overlay.remove(), 300);
        }
        this._active = false;
        this._memoryData = null;
    },

    // ── Звук перебивки (используем существующий) ──
    _playSound(correct) {
        if (correct) playCorrectSound('interstitials');
        else playWrongSound('interstitials');
    },

    // ── Инициализация (восстанавливаем стрик) ──
    init() {
        this._bestStreak = parseInt(localStorage.getItem('inter_best_streak') || '0');
    }
};

// =============================================
// INIT
// =============================================
// =============================================
// NOTIFICATIONS — Уведомления
// =============================================
const Notif = {
    _open: false,

    _getAll() {
        try { return JSON.parse(localStorage.getItem('admin_notif') || '[]'); } catch { return []; }
    },
    _getReadIds() {
        try { return JSON.parse(localStorage.getItem('notif_read_ids') || '[]'); } catch { return []; }
    },
    _saveReadIds(ids) { localStorage.setItem('notif_read_ids', JSON.stringify(ids)); },

    getUnreadCount() {
        const all = this._getAll();
        const read = new Set(this._getReadIds());
        return all.filter(n => !read.has(n.id)).length;
    },

    updateBadge() {
        const count = this.getUnreadCount();
        const badge = document.getElementById('notif-badge');
        const bell = document.getElementById('notif-bell-btn');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? '' : 'none';
        }
        if (bell) bell.style.display = '';
    },

    toggle() {
        if (this._open) {
            App.back();
            this._open = false;
        } else {
            App.navigate('notifications', 'Уведомления');
            this._open = true;
            this._markAllRead();
            this._render();
        }
    },

    _markAllRead() {
        const all = this._getAll();
        const ids = all.map(n => n.id);
        this._saveReadIds(ids);
        this.updateBadge();
    },

    _render() {
        const list = document.getElementById('notif-list');
        const empty = document.getElementById('notif-empty');
        const all = this._getAll().sort((a, b) => b.id - a.id);

        if (!all.length) {
            if (list) list.innerHTML = '';
            if (empty) empty.style.display = '';
            return;
        }
        if (empty) empty.style.display = 'none';

        const icons = {
            songs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
            podcasts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
            riddles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            puzzles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.5 2.5 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877L1.998 12"/></svg>',
            message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
        };
        const typeLabels = { songs:'Новая песенка', podcasts:'Новый подкаст', riddles:'Новая загадка', puzzles:'Новый ребус', message:'Сообщение' };

        list.innerHTML = all.map(n => {
            const icon = icons[n.type] || icons.message;
            const date = n.date ? this._fmtDate(n.date) : '';
            const label = typeLabels[n.type] || 'Уведомление';
            return `<div class="notif-item">
                <div class="notif-icon notif-icon-${n.type || 'message'}">${icon}</div>
                <div class="notif-body">
                    <div class="notif-title">${n.title || label}</div>
                    ${n.body ? `<div class="notif-text">${n.body}</div>` : ''}
                    <div class="notif-date">${date}</div>
                </div>
            </div>`;
        }).join('');
    },

    _fmtDate(iso) {
        try {
            const d = new Date(iso);
            const now = new Date();
            const diff = now - d;
            if (diff < 60000) return 'Только что';
            if (diff < 3600000) return Math.floor(diff / 60000) + ' мин назад';
            if (diff < 86400000) return Math.floor(diff / 3600000) + ' ч назад';
            const day = d.getDate();
            const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
            return day + ' ' + months[d.getMonth()];
        } catch { return ''; }
    },

    // ── Auto-detect new content ──
    checkNewContent(data) {
        if (!data) return;
        const prevCounts = JSON.parse(localStorage.getItem('notif_content_counts') || '{}');
        const currentCounts = {};
        const newNotifs = [];
        const existing = this._getAll();
        const existingIds = new Set(existing.map(n => n.id));

        const sections = {
            songs: { label: 'песенка', key: 'songs' },
            podcasts: { label: 'подкаст', key: 'podcasts' },
            riddles: { label: 'загадка', key: 'riddles' },
            puzzles: { label: 'ребус', key: 'puzzles' }
        };

        Object.entries(sections).forEach(([key, cfg]) => {
            const items = data[key] || [];
            currentCounts[key] = items.length;
            const prev = prevCounts[key] || 0;
            if (prev > 0 && items.length > prev) {
                // New items added
                const diff = items.length - prev;
                const newest = items.slice(-diff);
                newest.forEach(item => {
                    const name = item.name || item.text || '—';
                    const nid = Date.now() + Math.floor(Math.random() * 1000);
                    if (!existingIds.has(nid)) {
                        newNotifs.push({
                            id: nid,
                            type: key,
                            title: cfg.label === 'песенка' ? 'Новая ' + cfg.label : cfg.label === 'подкаст' ? 'Новый ' + cfg.label : cfg.label === 'загадка' ? 'Новая ' + cfg.label : 'Новый ' + cfg.label,
                            body: name,
                            date: new Date().toISOString(),
                            auto: true
                        });
                    }
                });
            }
        });

        // Handle admin_notif from data.json (manual messages)
        if (Array.isArray(data.notifications)) {
            data.notifications.forEach(n => {
                if (!existingIds.has(n.id)) {
                    newNotifs.push(n);
                }
            });
        }

        if (newNotifs.length) {
            const all = [...existing, ...newNotifs];
            localStorage.setItem('admin_notif', JSON.stringify(all));
            this.updateBadge();
        }

        localStorage.setItem('notif_content_counts', JSON.stringify(currentCounts));
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // Читаем хэш ДО любых операций
    const deepLinkHash = window.location.hash;
    const deepLinkMatch = deepLinkHash.match(/^#(song|podcast|info)-(\d+)$/);

    // Сразу убираем хэш из URL
    if (deepLinkMatch) history.replaceState(null, '', location.pathname);

    if (deepLinkMatch) {
        // Deep link: инициализируем UI немедленно, данные грузим фоном
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        document.getElementById('modal').classList.add('hidden');
        document.getElementById('loader').style.display = 'none';

        const [, type, idStr] = deepLinkMatch;
        const id = parseInt(idStr);

        if (type === 'song') {
            Songs.init();
            const idx = Songs._allSongs.findIndex(s => s.id === id);
            if (idx !== -1) Songs.play(idx);
        } else if (type === 'podcast') {
            Podcasts.init();
            const idx = Podcasts._allPodcasts.findIndex(p => p.id === id);
            if (idx !== -1) Podcasts.play(idx);
        } else if (type === 'info') {
            App.navigate('info', 'Информация');
            Info.render();
            // Открываем нужный аккордеон после рендера
            setTimeout(() => {
                const container = document.getElementById('info-blocks-container');
                if (!container) return;
                const blocks = (() => { try { return JSON.parse(localStorage.getItem('admin_info')) || []; } catch { return []; } })();
                const blockIdx = blocks.findIndex(b => b.id === id);
                if (blockIdx !== -1) {
                    const items = container.querySelectorAll('.info-accordion');
                    if (items[blockIdx]) {
                        items[blockIdx].classList.add('open');
                        items[blockIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }, 100);
        }

        // Данные обновляем фоном — не блокируем запуск трека
        App._loadRemoteData();
    } else {
        // Обычный запуск — ждём данных
        await App.init();
        App.navigate('main');
        // Загружаем имя ребёнка
        regUpdateCard();
        updateHomeGreeting();
        Notif.updateBadge();
        CardBadges.updateAll();
        // Enter в поле имени = сохранить
        document.getElementById('child-name-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') regSaveName(); });
        // Гоша приветствует при запуске
    }
});
