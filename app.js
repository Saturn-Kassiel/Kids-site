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
        // Убираем кнопки ребусов при уходе
        if (id !== 'puzzles') {
            ['puzzle-level-dots','puzzle-share-topbar'].forEach(eid => { const e = document.getElementById(eid); if (e) e.remove(); });
        }
        // Убираем кнопки загадок при уходе
        if (id !== 'riddles') {
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
        showToast(next === 'dark' ? '🌙 Тёмная тема' : '☀️ Светлая тема');
    },

    resetStats() {
        if (!confirm('Сбросить весь прогресс?')) return;
        ['stat_puzzles','stat_riddles','stat_songs','stat_letters'].forEach(k => localStorage.removeItem(k));
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
                    App.navigate('admin', 'Админка');
                } else if (pass !== null) {
                    showToast('❌ Неверный пароль');
                }
            }
        };
        window.addEventListener('hashchange', checkHash);
        if (window.location.hash === '#see') checkHash();

        // Скрываем loader — данные уже загружены (await выше)
        document.getElementById('loader').style.display = 'none';
    }
};

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
        this.index = 0;
        App.navigate('media-page', TITLES[type] || type);

        this._renderGrid(type);
        setupProgress(this.player, 'progress-bar', 'time-cur', 'time-dur', 'prog-wrap');
        this.player.onended = () => {
            if (this.isRepeat) { this.play(this.index); return; }
            document.getElementById('play-btn').textContent = '▶';
            setTimeout(() => this.next(), 1000);
        };
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
        this.audio.onended = () => {
            if (this.isRepeat) { this.play(this.index); return; }
            document.getElementById('song-play-btn').textContent = '▶';
            setTimeout(() => this.nextSong(), 1000);
        };
        // Auto-load durations for all songs
        this._loadDurations();
    },

    _loadDurations() {
        this._allSongs.forEach((song, i) => {
            if (song.duration) return; // already set
            const a = new Audio();
            a.preload = 'metadata';
            a.src = song.src;
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
        this.audio.src = song.src || '';
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
        this.audio.onended = () => {
            if (this.isRepeat) { this.play(this.index); return; }
            document.getElementById('podcast-play-btn').textContent = '▶';
            setTimeout(() => this.nextPodcast(), 1000);
        };
        this._loadDurations();
    },

    _loadData() {
        try { return JSON.parse(localStorage.getItem('admin_podcasts')) || []; } catch { return []; }
    },

    _loadDurations() {
        this._allPodcasts.forEach((p, i) => {
            if (p.duration) return;
            const a = new Audio();
            a.preload = 'metadata';
            a.src = p.src;
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
        this.audio.src = pod.src || '';
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
    _pos: { easy: 0, medium: 0, hard: 0 },
    _hasUnsaved: false,
    _solved: false,

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
        App.navigate('puzzles', 'Ребусы');
        this._loadFromAdmin();
        this._pos = { easy: 0, medium: 0, hard: 0 };
        this._level = 'easy';
        // Вставляем кружки уровней в топ-бар
        this._renderLevelDots();
        this.show();
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
        shareBtn.innerHTML = '📤';
        shareBtn.addEventListener('click', () => Puzzles.share());
        topBar.insertBefore(shareBtn, settingsBtn);
        // Кружки уровней
        const wrap = document.createElement('div');
        wrap.id = 'puzzle-level-dots';
        wrap.innerHTML = `
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
        if (!this._data.medium.length) this._data.medium = [{ pic:'', hint:'', answer:'?' }];
        if (!this._data.hard.length)   this._data.hard   = [{ pic:'', hint:'', answer:'?' }];
    },

    _current() {
        const list = this._data[this._level];
        return list[this._pos[this._level] % list.length];
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
        // Обновляем активный кружок
        document.querySelectorAll('.lvl-dot').forEach(d => d.classList.remove('active'));
        const active = document.querySelector(`.lvl-dot.${lv}`);
        if (active) active.classList.add('active');
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
    _level: 'easy',
    _data: { easy: [], medium: [], hard: [] },

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

    init() {
        App.navigate('riddles', 'Загадки');
        this._level = 'easy';
        this._loadFromAdmin();
        this._pos = 0;
        this._renderTopBar();
        this.show();
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
    },

    _current() {
        const list = this._data[this._level];
        return list[this._pos % list.length];
    },

    setLevel(lv) {
        if (this._hasUnsaved && !this._solved) { showToast('✋ Сначала нажми «Проверить ответ»'); return; }
        this._level = lv;
        this._pos = 0;
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
        shareBtn.innerHTML = '📤';
        shareBtn.addEventListener('click', () => Riddles.share());
        topBar.insertBefore(shareBtn, settingsBtn);
        // Кружки уровней
        const dots = document.createElement('div');
        dots.id = 'riddle-level-dots';
        dots.innerHTML = `
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
        if (val === item.a.toLowerCase()) {
            inp.className = 'correct';
            msg.textContent = `🎉 Правильно! Ответ: ${item.a}`;
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
    show() {
        App.navigate('stats', 'Статистика');
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
                <button class="admin-edit" data-id="${item.id}">✏️</button>
                <button class="admin-del"  data-id="${item.id}">🗑️</button>
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

    _onFileChange(input) {
        const name = input.files[0]?.name || 'Файл не выбран';
        document.getElementById('m-file-name').textContent = name;
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
                curFileEl.textContent = '📁 Текущий файл: ' + currentFileName;
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
                lvSel.querySelector('option[value="easy"]').textContent   = '🟢 Простой';
                lvSel.querySelector('option[value="medium"]').textContent = '🟡 Средний';
                lvSel.querySelector('option[value="hard"]').textContent   = '🔴 Сложный';
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

    save() {
        // Читаем из правильного поля (input или textarea)
        const nameInput = document.getElementById('m-name-input');
        const nameArea  = document.getElementById('m-name-area');
        const isRiddle  = this._tab === 'riddles';
        const isPodcast = this._tab === 'podcasts';
        const name = (isRiddle ? nameArea : nameInput).value.trim();
        if (!name) { showToast('⚠️ Введите название'); return; }

        const items = this._getData(this._tab);
        const id = this._editId || Date.now();
        // Find existing item to preserve src/pic/duration
        const existing = this._editId ? items.find(i => i.id === this._editId) : null;

        let newItem;
        if (this._tab === 'songs' || this._tab === 'podcasts') {
            const descVal = document.getElementById('m-desc')?.value.trim() || '';
            newItem = {
                id, name,
                desc:     isPodcast ? descVal : '',
                duration: existing ? (existing.duration || '') : '',
                src:      existing ? (existing.src      || '') : ''
            };
        } else if (this._tab === 'riddles') {
            newItem = {
                id,
                text:   name,
                answer: document.getElementById('m-answer').value.trim(),
                pic:    existing ? (existing.pic || '') : '',
                level:  document.getElementById('m-level').value || 'easy',
            };
        } else if (this._tab === 'info') {
            const bodyVal = (document.getElementById('m-body')?.value || '').trim();
            if (!bodyVal) { showToast('⚠️ Введите текст блока'); return; }
            newItem = { id, name, body: bodyVal };
        } else {
            // puzzles — name = answer (m-name скрыт для ребусов)
            const puzzleAnswer = document.getElementById('m-answer').value.trim();
            newItem = {
                id,
                name:   puzzleAnswer, // название = ответу
                pic:    existing ? (existing.pic || '') : '',
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
        // Немедленно обновляем живые секции
        if (this._tab === 'songs') Songs._allSongs = this._getData('songs').map(s => ({...s}));
        if (this._tab === 'podcasts') Podcasts._allPodcasts = this._getData('podcasts').map(p => ({...p}));
        if (this._tab === 'puzzles') {
            // Перезагружаем данные ребусов без reinit (не меняем позицию)
            const saved = this._getData('puzzles');
            if (saved.length) {
                Puzzles._data = { easy: [], medium: [], hard: [] };
                saved.forEach(p => {
                    const lv = p.level || 'easy';
                    if (Puzzles._data[lv]) Puzzles._data[lv].push({ pic: p.pic||'', hint: p.hint||'', answer: p.answer||'' });
                });
            }
        }
        if (this._tab === 'riddles') {
            Riddles._loadFromAdmin();
        }
        if (this._tab === 'info') Info.render();
        showToast(this._editId ? '✅ Изменения сохранены' : '✅ Добавлено');
    },

    // ── Вставка шаблона ссылки в поле m-body ──
    _insertLinkTemplate() {
        const ta = document.getElementById('m-body');
        if (!ta) return;
        const template = '[текст ссылки](https://url.com)';
        const start = ta.selectionStart;
        const end   = ta.selectionEnd;
        const val   = ta.value;
        ta.value = val.slice(0, start) + template + val.slice(end);
        // Выделяем "текст ссылки" для удобства замены
        ta.focus();
        ta.setSelectionRange(start + 1, start + 13);
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
        btn.textContent = isHidden ? '🙈' : '👁';
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

        // Собираем все данные Админки
        const data = {
            songs:    this._getData('songs'),
            podcasts: this._getData('podcasts'),
            puzzles:  this._getData('puzzles'),
            riddles:  this._getData('riddles'),
            info:     this._getData('info'),
            exportedAt: new Date().toISOString()
        };
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

        const btn = document.getElementById('publish-btn');
        const origText = btn ? btn.textContent : '';
        if (btn) { btn.textContent = '⏳ Публикация...'; btn.disabled = true; }

        try {
            const apiUrl = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
            const headers = {
                'Authorization': `token ${token}`,
                'Content-Type':  'application/json',
                'Accept':        'application/vnd.github.v3+json'
            };

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
            if (btn) { btn.textContent = origText; btn.disabled = false; }
        }
    }
};

// =============================================
// INIT
// =============================================
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
    }
});
