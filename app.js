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
        document.getElementById('settings-icon-btn').classList.toggle('hidden', id === 'settings' || id === 'admin');

        const titleBar = document.getElementById('page-title-bar');
        if (!isMain && title) {
            titleBar.textContent = title;
            titleBar.classList.remove('hidden');
        } else {
            titleBar.classList.add('hidden');
        }

        if (!isMain) this._history.push(id);
        window.scrollTo(0, 0);
    },

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
        showToast(next === 'dark' ? '🌙 Тёмная тема' : '☀️ Светлая тема');
    },

    resetStats() {
        if (!confirm('Сбросить весь прогресс?')) return;
        ['stat_puzzles','stat_riddles','stat_songs','stat_letters'].forEach(k => localStorage.removeItem(k));
        showToast('🗑️ Прогресс сброшен');
    },

    init() {
        // Restore theme
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        const tt = document.getElementById('tog-theme');
        if (tt && theme === 'dark') tt.classList.add('on');

        // Restore toggles
        ['sound','auto','anim'].forEach(k => {
            const saved = localStorage.getItem(`set_${k}`);
            if (saved === 'false') {
                const el = document.getElementById(`tog-${k}`);
                if (el) el.classList.remove('on');
            }
        });

        // Make sure modal is closed on start
        document.getElementById('modal').classList.add('hidden');

        // Admin via hash — check on load too
        const checkHash = () => {
            if (window.location.hash === '#see') {
                history.replaceState(null, '', location.pathname);
                const pass = prompt('Введите пароль:');
                if (pass === '1239940') {
                    Admin.init();
                    App.navigate('admin', '⚙️ Админка');
                } else if (pass !== null) {
                    showToast('❌ Неверный пароль');
                }
            }
        };
        window.addEventListener('hashchange', checkHash);
        // Check hash on initial load
        if (window.location.hash === '#see') checkHash();

        // Hide loader
        setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
        }, 400);
    }
};

function saveSetting(key, val) {
    localStorage.setItem(`set_${key}`, val);
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
function starsBurst() {
    showStars(window.innerWidth / 2, window.innerHeight * 0.55);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
}

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
            const letters = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
            items = letters.map(l => ({
                name: l, label: `Буква ${l}`, icon: '🔤',
                audio: `assets/audio/alphabet/track_${l}.mp3`,
                video: `assets/video/alphabet/clip_${l}.mp4`
            }));
        } else if (type === 'numbers') {
            const nums = ['0','1','2','3','4','5','6','7','8','9'];
            items = nums.map(n => ({
                name: n, label: `Цифра ${n}`, icon: '🔢',
                audio: `assets/audio/numbers/track_${n}.mp3`,
                video: `assets/video/numbers/clip_${n}.mp4`
            }));
        } else if (type === 'colors') {
            const COLORS = [
                { name:'Красный',    hex:'#ef4444', emoji:'🔴' },
                { name:'Оранжевый',  hex:'#f97316', emoji:'🟠' },
                { name:'Жёлтый',     hex:'#fbbf24', emoji:'🟡' },
                { name:'Зелёный',    hex:'#22c55e', emoji:'🟢' },
                { name:'Синий',      hex:'#3b82f6', emoji:'🔵' },
                { name:'Фиолетовый', hex:'#a855f7', emoji:'🟣' },
                { name:'Розовый',    hex:'#ec4899', emoji:'🌸' },
                { name:'Голубой',    hex:'#06b6d4', emoji:'🩵' },
                { name:'Белый',      hex:'#f1f5f9', emoji:'⬜' },
                { name:'Чёрный',     hex:'#1e293b', emoji:'⬛' },
                { name:'Серый',      hex:'#94a3b8', emoji:'🩶' },
                { name:'Коричневый', hex:'#92400e', emoji:'🟫' },
            ];
            items = COLORS.map(c => ({
                name: c.name, label: c.name, icon: c.emoji, hex: c.hex,
                audio: `assets/audio/colors/track_${c.name}.mp3`,
                video: `assets/video/colors/clip_${c.name}.mp4`
            }));
        }

        this.currentList = items;
        this.index = 0;
        App.navigate('media-page', TITLES[type] || type);

        this._renderGrid(type);
        setupProgress(this.player, 'progress-bar', 'time-cur', 'time-dur', 'prog-wrap');
        this.player.onended = () => this.isRepeat ? this.play(this.index) : this.next();
        this.play(0);
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
        vid.src = item.video;
        vid.load();
        vid.play().catch(() => {});
        document.getElementById('video-label').textContent = item.label;

        // Show/hide placeholder
        vid.onloadeddata = () => placeholder.style.display = 'none';
        vid.onerror = () => { placeholder.style.display = 'flex'; };

        // Audio
        this.player.src = item.audio;
        AudioMgr.play(this.player, 'media');
        document.getElementById('play-btn').textContent = '⏸';
        document.getElementById('track-name').textContent = item.label;
        document.getElementById('track-icon').textContent = item.icon;
        document.getElementById('track-sub').textContent  = this._sectionType === 'alphabet' ? 'Кириллический алфавит' : this._sectionType === 'colors' ? 'Учим цвета' : 'Учим цифры';
        document.getElementById('progress-bar').style.width = '0%';

        // Highlight chip
        document.querySelectorAll('#media-grid button').forEach((b, idx) => {
            b.classList.toggle('active', idx === i);
        });

        // Track stats for letters
        if (this._sectionType === 'alphabet') {
            const cur = parseInt(localStorage.getItem('stat_letters') || 0);
            localStorage.setItem('stat_letters', cur + 1);
        }
    },

    toggle() {
        if (this.player.paused) {
            AudioMgr.play(this.player, 'media');
            document.getElementById('play-btn').textContent = '⏸';
        } else {
            this.player.pause();
            document.getElementById('play-btn').textContent = '▶';
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
        App.navigate('songs', '🎵 Песенки');
        AudioMgr.stop();

        // Load from admin data or defaults
        const saved = this._loadData();
        this._allSongs = saved.length ? saved : [
            { id:1, name:'Песенка про Алфавит',       duration:'2:14', src:'' },
            { id:2, name:'Раз, два, три — Цифры!',    duration:'1:48', src:'' },
            { id:3, name:'Радуга цветов',              duration:'2:30', src:'' },
            { id:4, name:'Весёлая зарядка',            duration:'3:05', src:'' },
            { id:5, name:'Мишка косолапый',            duration:'1:22', src:'' },
            { id:6, name:'Антошка',                    duration:'2:02', src:'' },
            { id:7, name:'Голубой вагон',              duration:'2:45', src:'' },
            { id:8, name:'Крокодил Гена',              duration:'2:18', src:'' },
            { id:9, name:'Чунга-Чанга',               duration:'1:55', src:'' },
            { id:10,name:'Кабы не было зимы',         duration:'2:38', src:'' },
            { id:11,name:'Пусть всегда будет солнце', duration:'2:10', src:'' },
            { id:12,name:'Улыбка',                    duration:'2:22', src:'' },
        ];
        this._filtered = [...this._allSongs];
        this.render();
        setupProgress(this.audio, 'song-progress-bar', 'song-time-cur', 'song-time-dur', 'song-prog-wrap');
        this.audio.onended = () => this.isRepeat ? this.play(this.index) : this.nextSong();
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
            `;
            div.addEventListener('click', () => this.play(realIdx));
            list.appendChild(div);
        });
    },

    play(i) {
        this.index = i;
        const song = this._allSongs[i];
        this.audio.src = song.src || '';
        AudioMgr.play(this.audio, 'songs');
        document.getElementById('song-play-btn').textContent = '⏸';
        document.getElementById('song-name').textContent = song.name;
        document.getElementById('song-sub').textContent  = song.duration || '';
        document.getElementById('song-progress-bar').style.width = '0%';
        this.render();
        // Track stat
        const cur = parseInt(localStorage.getItem('stat_songs') || 0);
        localStorage.setItem('stat_songs', cur + 1);
    },

    toggle() {
        if (this.index === -1) { this.play(0); return; }
        if (this.audio.paused) {
            AudioMgr.play(this.audio, 'songs');
            document.getElementById('song-play-btn').textContent = '⏸';
        } else {
            this.audio.pause();
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
// PUZZLES
// =============================================
const Puzzles = {
    _level: 'easy',
    _pos: { easy: 0, medium: 0, hard: 0 },
    _hasUnsaved: false,
    _solved: false,

    _data: {
        easy: [
            { img:'🏠➕🔑', hint:'Дом + то, чем открывают замок', answer:'ключ от дома' },
            { img:'☀️➕💧', hint:'Небесное тело + капли воды',    answer:'дождь' },
            { img:'🐱➕🐟', hint:'Животное + его любимая еда',   answer:'рыба' },
            { img:'🌺➕🌿', hint:'Цветок + листья',               answer:'цветок' },
        ],
        medium: [
            { img:'🌙➕⭐', hint:'Ночные светила',                  answer:'ночь' },
            { img:'🚗➕💨', hint:'Транспорт + скорость',             answer:'гонка' },
            { img:'🐻➕🎵', hint:'Большое животное + музыка',       answer:'медведь' },
            { img:'🌊➕🏄', hint:'Море + спорт на воде',            answer:'серфинг' },
        ],
        hard: [
            { img:'📚➕✏️➕🎒', hint:'Учёба и школьные принадлежности', answer:'школа' },
            { img:'🌊➕⛵➕⚓',  hint:'Морское путешествие',              answer:'корабль' },
            { img:'🌡️➕❄️➕🌨️', hint:'Холодная погода',                  answer:'мороз' },
            { img:'🔭➕⭐➕🌌',  hint:'Изучение космоса',                 answer:'астроном' },
        ],
    },

    init() {
        App.navigate('puzzles', '🧩 Ребусы');
        this.show();
    },

    _current() {
        const list = this._data[this._level];
        return list[this._pos[this._level] % list.length];
    },

    show() {
        const p = this._current();
        document.getElementById('puzzle-img').textContent = p.img;
        document.getElementById('puzzle-hint').innerHTML = `💡 <b>Подсказка:</b> ${p.hint}`;
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
        document.querySelectorAll('.level-tab').forEach(t => t.className = 'level-tab');
        const tabs = document.querySelectorAll('.level-tab');
        if (lv === 'easy')   tabs[0].className = 'level-tab easy';
        if (lv === 'medium') tabs[1].className = 'level-tab medium';
        if (lv === 'hard')   tabs[2].className = 'level-tab hard';
        this.show();
    },

    check() {
        const val = document.getElementById('puzzle-input').value.trim().toLowerCase();
        const msg = document.getElementById('puzzle-msg');
        const inp = document.getElementById('puzzle-input');
        if (!val) { msg.textContent = '✏️ Введи ответ!'; msg.className = 'warn'; return; }
        this._hasUnsaved = false;
        if (val === this._current().answer.toLowerCase()) {
            inp.className = 'correct';
            msg.textContent = `🎉 Верно! Ответ: ${this._current().answer}`;
            msg.className = 'ok';
            this._solved = true;
            starsBurst();
            const cur = parseInt(localStorage.getItem('stat_puzzles') || 0);
            localStorage.setItem('stat_puzzles', cur + 1);
        } else {
            inp.className = 'wrong';
            msg.textContent = '❌ Не угадал, попробуй ещё!';
            msg.className = 'err';
        }
    },

    next() {
        if (this._hasUnsaved && !this._solved) { showToast('✋ Сначала нажми «Проверить»'); return; }
        this._pos[this._level]++;
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
    _pos: 0,
    _hasUnsaved: false,
    _solved: false,

    data: [
        { q:'Зимой и летом\nодним цветом.',          a:'ёлка',   img:'🌲' },
        { q:'Не лает, не кусает,\nа в дом не пускает.', a:'замок',  img:'🔒' },
        { q:'Два кольца, два конца,\nпосередине гвоздик.', a:'ножницы', img:'✂️' },
        { q:'Без рук, без ног,\nа рисовать умеет.',   a:'мороз',  img:'❄️' },
        { q:'Всегда во рту,\nа не проглотишь.',        a:'язык',   img:'👅' },
        { q:'В воде купался,\nа сухим остался.',        a:'гусь',   img:'🦢' },
        { q:'Маленький, кругленький,\nза хвост не поймаешь.', a:'клубок', img:'🧶' },
        { q:'Сам не видит,\nи другим не даёт.',        a:'туман',  img:'🌫️' },
        { q:'Сидит дед,\nв сто шуб одет.',              a:'лук',    img:'🧅' },
        { q:'Красная девица\nсидит в темнице.',         a:'морковь',img:'🥕' },
    ],

    init() {
        App.navigate('riddles', '🤔 Загадки');
        // Load extra riddles from admin
        const adm = this._loadAdmin();
        if (adm.length) {
            adm.forEach(r => {
                if (!this.data.find(d => d.q === r.text)) {
                    this.data.push({ q: r.text, a: r.answer, img: '❓' });
                }
            });
        }
        this.show();
    },

    _loadAdmin() {
        try { return JSON.parse(localStorage.getItem('admin_riddles')) || []; } catch { return []; }
    },

    show() {
        const idx = this._pos % this.data.length;
        document.getElementById('riddle-text').textContent = this.data[idx].q;
        const inp = document.getElementById('riddle-input');
        const img = document.getElementById('riddle-img');
        inp.value = '';
        inp.className = '';
        document.getElementById('riddle-msg').textContent = '';
        document.getElementById('riddle-msg').className = '';
        img.textContent = '';
        img.className = 'answer-img';
        this._hasUnsaved = false;
        this._solved = false;
    },

    check() {
        const idx = this._pos % this.data.length;
        const val = document.getElementById('riddle-input').value.trim().toLowerCase();
        const msg = document.getElementById('riddle-msg');
        const inp = document.getElementById('riddle-input');
        if (!val) { msg.textContent = '✏️ Введи ответ!'; msg.className = 'warn'; return; }
        this._hasUnsaved = false;
        if (val === this.data[idx].a.toLowerCase()) {
            inp.className = 'correct';
            msg.textContent = `🎉 Правильно! Ответ: ${this.data[idx].a}`;
            msg.className = 'ok';
            const img = document.getElementById('riddle-img');
            img.textContent = this.data[idx].img;
            img.className = 'answer-img show';
            this._solved = true;
            starsBurst();
            const cur = parseInt(localStorage.getItem('stat_riddles') || 0);
            localStorage.setItem('stat_riddles', cur + 1);
        } else {
            inp.className = 'wrong';
            msg.textContent = '❌ Не угадал, попробуй ещё!';
            msg.className = 'err';
        }
    },

    next() {
        if (this._hasUnsaved && !this._solved) { showToast('✋ Сначала нажми «Проверить ответ»'); return; }
        this._pos++;
        this.show();
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
const Stats = {
    show() {
        App.navigate('stats', '📊 Статистика');
        const keys = ['puzzles','riddles','songs','letters'];
        const maxes = [20, 20, 50, 33];
        keys.forEach((k, i) => {
            const val = parseInt(localStorage.getItem(`stat_${k}`) || 0);
            document.getElementById(`st-${k}`).textContent = val;
            setTimeout(() => {
                document.getElementById(`sf-${k}`).style.width = Math.min(val / maxes[i] * 100, 100) + '%';
            }, 150);
        });
    }
};

// =============================================
// ADMIN
// =============================================
const Admin = {
    _tab: 'songs',
    _editId: null,

    init() {
        // Seed defaults
        const defaults = {
            songs:    [{ id:1, name:'Песенка про Алфавит', duration:'2:14', src:'' }],
            podcasts: [],
            puzzles:  [{ id:1, name:'Ребус 1', img:'🏠➕🔑', hint:'Дом + ключ', answer:'ключ от дома', level:'easy' }],
            riddles:  [{ id:1, text:'Зимой и летом одним цветом.', answer:'ёлка', emoji:'🌲' }],
        };
        ['songs','podcasts','puzzles','riddles'].forEach(k => {
            if (!localStorage.getItem('admin_' + k)) {
                localStorage.setItem('admin_' + k, JSON.stringify(defaults[k]));
            }
        });
        this.render();
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
            const sub = this._tab === 'songs' || this._tab === 'podcasts' ? (item.duration || '') :
                        this._tab === 'riddles' ? 'Ответ: ' + item.answer :
                        `${item.level || ''} | Ответ: ${item.answer || ''}`;
            div.innerHTML = `
                <div class="admin-item-info">
                    <div class="admin-item-title">${item.name || item.text || '—'}</div>
                    <div class="admin-item-sub">${sub}</div>
                </div>
                <button class="admin-edit" data-id="${item.id}">✏️</button>
                <button class="admin-del"  data-id="${item.id}">🗑️</button>
            `;
            list.appendChild(div);
        });

        list.querySelectorAll('.admin-del').forEach(btn => btn.addEventListener('click', () => {
            if (!confirm('Удалить?')) return;
            this._setData(this._tab, this._getData(this._tab).filter(i => i.id !== parseInt(btn.dataset.id)));
            this.render();
            showToast('🗑️ Удалено');
        }));
        list.querySelectorAll('.admin-edit').forEach(btn => btn.addEventListener('click', () => {
            const item = this._getData(this._tab).find(i => i.id === parseInt(btn.dataset.id));
            if (item) this.openModal(item);
        }));
    },

    openModal(item) {
        this._editId = item ? item.id : null;
        document.getElementById('modal-title').textContent = item ? 'Редактировать' : 'Добавить';
        document.getElementById('m-name').value   = item ? (item.name || item.text || '') : '';
        document.getElementById('m-answer').value = item ? (item.answer || '') : '';
        document.getElementById('m-hint').value   = item ? (item.hint || item.img || '') : '';
        document.getElementById('m-level').value  = item ? (item.level || '') : '';
        document.getElementById('m-file-name').textContent = 'Файл не выбран';

        const isQA = this._tab === 'riddles' || this._tab === 'puzzles';
        document.getElementById('m-answer').style.display = isQA ? 'block' : 'none';
        document.getElementById('m-hint').style.display   = isQA ? 'block' : 'none';
        document.getElementById('m-level').style.display  = this._tab === 'puzzles' ? 'block' : 'none';

        document.getElementById('modal').classList.remove('hidden');
    },

    closeModal(e) {
        if (!e || e.target === document.getElementById('modal')) {
            document.getElementById('modal').classList.add('hidden');
        }
    },

    save() {
        const name = document.getElementById('m-name').value.trim();
        if (!name) { showToast('⚠️ Введите название'); return; }

        const items = this._getData(this._tab);
        const id = this._editId || Date.now();

        let newItem;
        if (this._tab === 'songs' || this._tab === 'podcasts') {
            newItem = { id, name, duration: '0:00', src: '' };
        } else if (this._tab === 'riddles') {
            newItem = { id, text: name, answer: document.getElementById('m-answer').value.trim(), emoji: '❓' };
        } else {
            newItem = {
                id, name,
                img: document.getElementById('m-hint').value.trim(),
                hint: document.getElementById('m-hint').value.trim(),
                answer: document.getElementById('m-answer').value.trim(),
                level: document.getElementById('m-level').value || 'easy',
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
        showToast(this._editId ? '✅ Изменения сохранены' : '✅ Добавлено');
    },

    publish() {
        showToast('📤 Для публикации настройте GitHub Token в коде');
        // Real implementation: use GitHub API
        // fetch('https://api.github.com/repos/Saturn-Kassiel/Kids-site/contents/data.json', {
        //     method: 'PUT', headers: { Authorization: 'token YOUR_TOKEN', ... }, body: JSON.stringify({...})
        // });
    }
};

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    // Start on main
    App.navigate('main');
});
