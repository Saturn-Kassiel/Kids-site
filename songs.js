// =============================================
// SONGS — with favorites & tag-based collections
// =============================================
const Songs = {
    audio: new Audio(),
    _allSongs: [],
    _filtered: [],
    index: -1,
    isShuffle: false,
    isRepeat: false,
    _activeTag: 'all',
    _searchQ: '',
    _favorites: new Set(),

    // ── Tag definitions ──
    TAG_DEFS: [
        { id: 'all',      emoji: '🎵', label: 'Все' },
        { id: 'fav',      emoji: '❤️', label: 'Избранное' },
        { id: 'animals',  emoji: '🐾', label: 'Животные' },
        { id: 'months',   emoji: '📅', label: 'Месяцы' },
        { id: 'holiday',  emoji: '🎄', label: 'Праздники' },
        { id: 'family',   emoji: '👨‍👩‍👧', label: 'Семья' },
        { id: 'learning', emoji: '📚', label: 'Обучающие' },
        { id: 'sleep',    emoji: '🌙', label: 'Колыбельные' },
    ],

    // Tags by filename (works regardless of song ID)
    _TAGS_BY_FILE: {
        'kolybelnaya':           ['sleep'],
        'pesenka_dlya_mamy':     ['family'],
        'pesenka_pro_clona':     ['animals'],
        'pesenka_pro_deda_moroza': ['holiday'],
        'pesenka_pro_fevral':    ['months'],
        'pesenka_pro_lva':       ['animals'],
        'pesenka_pro_nedelyu':   ['learning'],
        'pesenka_pro_nosoroga':  ['animals'],
        'pesenka_pro_papu':      ['family'],
        'pesenka_pro_umyvanie':  ['learning'],
        'pesenka_pro_yanvar':    ['months'],
        'pesenka_pro_zebru':     ['animals'],
        'v_lesu_rodilas_yolochka': ['holiday'],
        'rodgestvo':             ['holiday'],
        '\u0440\u043e\u0436\u0434\u0435\u0441\u0442\u0432\u043e_': ['holiday'],
        'vesna':                 ['months'],
        '\u043f\u0435\u0441\u0435\u043d\u043a\u0430_\u043f\u0440\u043e_\u0432\u0435\u0441\u043d\u0443': ['months'],
        '\u0435\u043d\u043e\u0442':  ['animals'],
        'lenivetc':              ['animals'],
        '\u043b\u0435\u043d\u0438\u0432\u0435\u0446': ['animals'],
        'mart':                  ['months'],
        'shakal':                ['animals'],
        'volk':                  ['animals'],
    },

    // Fallback: find tags by keywords in song name
    _TAG_KEYWORDS: [
        [['слона','льва','носорога','зебру','енота','ленивца','шакала','волка'], 'animals'],
        [['январь','февраль','март','весну','весна'],                           'months'],
        [['мороза','рождество','ёлочка'],                                       'holiday'],
        [['мамы','папу'],                                                       'family'],
        [['неделю','умывание'],                                                 'learning'],
        [['колыбельная'],                                                       'sleep'],
    ],

    _getTagsForSong(song) {
        if (song.tags && song.tags.length) return song.tags;
        // Try by filename
        const fname = (song.src || '').split('/').pop().replace(/\.[^.]+$/, '');
        if (fname && this._TAGS_BY_FILE[fname]) return this._TAGS_BY_FILE[fname];
        // Fallback: match song name against keywords
        const nl = (song.name || '').toLowerCase();
        for (const [keywords, tag] of this._TAG_KEYWORDS) {
            if (keywords.some(k => nl.includes(k))) return [tag];
        }
        return [];
    },

    init() {
        App.navigate('songs', 'Песенки');
        AudioMgr.stop();

        this._loadFavorites();

        // Load from admin data or defaults
        const saved = this._loadData();
        const defaults = [
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
            { id:14, name:'Песенка про Рождество',    duration:'', src:'assets/audio/songs/rodgestvo.mp3',               video:null },
            { id:15, name:'Песенка про Весну',        duration:'', src:'assets/audio/songs/vesna.mp3',                   video:null },
            { id:16, name:'Песенка про Енота',        duration:'', src:'assets/audio/songs/енот.mp3',                    video:null },
            { id:17, name:'Песенка про Ленивца',      duration:'', src:'assets/audio/songs/lenivetc.mp3',                video:null },
            { id:18, name:'Песенка про Март',         duration:'', src:'assets/audio/songs/mart.mp3',                    video:null },
            { id:19, name:'Песенка про Шакала',       duration:'', src:'assets/audio/songs/shakal.mp3',                  video:null },
            { id:20, name:'Песенка про Волка',        duration:'', src:'assets/audio/songs/volk.mp3',                    video:null },
        ];

        if (saved.length) {
            // Migrate: fix old Cyrillic filenames → new Latin filenames
            const SRC_MIGRATION = {
                'рождество_.mp3':       'rodgestvo.mp3',
                'песенка_про_весну.mp3': 'vesna.mp3',
                'ленивец.mp3':          'lenivetc.mp3',
                'март.mp3':             'mart.mp3',
                'енот.mp3':             'енот.mp3',  // без изменений, но нормализуем поиск
            };
            const NAME_TO_SRC = {
                'Песнка про Март':      'assets/audio/songs/mart.mp3',
                'Песенка про Март':     'assets/audio/songs/mart.mp3',
            };
            saved.forEach(s => {
                // Fix renamed files
                const fname = (s.src || '').split('/').pop();
                if (SRC_MIGRATION[fname]) {
                    s.src = 'assets/audio/songs/' + SRC_MIGRATION[fname];
                }
                // Fix songs with empty src
                if (!s.src && NAME_TO_SRC[s.name]) {
                    s.src = NAME_TO_SRC[s.name];
                }
            });

            this._allSongs = saved;
            // Merge: add any default songs missing from localStorage (by src filename)
            const existingSrcs = new Set(saved.map(s => (s.src || '').split('/').pop()));
            defaults.forEach(def => {
                const defFile = def.src.split('/').pop();
                if (!existingSrcs.has(defFile)) {
                    this._allSongs.push(def);
                }
            });
        } else {
            this._allSongs = defaults;
        }

        // Ensure all songs have tags array
        this._allSongs.forEach(s => {
            if (!s.tags || !s.tags.length) s.tags = this._getTagsForSong(s);
        });

        this._applyFilter();
        this._renderChips();
        this.render();
        setupProgress(this.audio, 'song-progress-bar', 'song-time-cur', 'song-time-dur', 'song-prog-wrap');
        if (!this._timeTracked) { StatTracker.trackAudioTime(this.audio, 'songs'); this._timeTracked = true; }
        this.audio.onended = () => {
            if (!this._wasPaused) {
                StatTracker.inc('songs');
            }
            const song = this._allSongs[this.index];
            if (song) CardBadges.markTried('songs', song.id);
            if (this.isRepeat) { this.play(this.index); return; }
            document.getElementById('song-play-btn').textContent = '▶';
            setTimeout(() => this.nextSong(), 1000);
        };
        this._loadDurations();
    },

    // ── Favorites ──
    _loadFavorites() {
        try {
            const arr = JSON.parse(localStorage.getItem('song_favorites') || '[]');
            this._favorites = new Set(arr);
        } catch (_) {
            this._favorites = new Set();
        }
    },

    _saveFavorites() {
        try {
            localStorage.setItem('song_favorites', JSON.stringify([...this._favorites]));
        } catch (_) {}
    },

    toggleFav(songId) {
        if (this._favorites.has(songId)) {
            this._favorites.delete(songId);
        } else {
            this._favorites.add(songId);
        }
        this._saveFavorites();
        // Re-filter in case we're viewing favorites
        if (this._activeTag === 'fav') this._applyFilter();
        this.render();
        this._renderChips(); // update fav count
    },

    // ── Tag chips ──
    _renderChips() {
        let wrap = document.getElementById('song-chips');
        if (!wrap) {
            // Create chips container and insert before search bar
            wrap = document.createElement('div');
            wrap.id = 'song-chips';
            wrap.className = 'song-chips';
            const searchBar = document.querySelector('#songs .search-bar');
            if (searchBar) {
                searchBar.parentNode.insertBefore(wrap, searchBar);
            } else {
                const section = document.getElementById('songs');
                if (section) section.appendChild(wrap);
            }
        }

        const favCount = this._favorites.size;
        wrap.innerHTML = this.TAG_DEFS.map(t => {
            const active = this._activeTag === t.id ? ' active' : '';
            // Count songs for this tag
            let count = 0;
            if (t.id === 'all') count = this._allSongs.length;
            else if (t.id === 'fav') count = favCount;
            else count = this._allSongs.filter(s => (s.tags || []).includes(t.id)).length;
            if (count === 0 && t.id !== 'all' && t.id !== 'fav') return ''; // hide empty tags
            const badge = t.id === 'fav' && favCount > 0 ? ` <span class="chip-badge">${favCount}</span>` : '';
            return `<button class="song-chip${active}" onclick="Songs.setTag('${t.id}')">${t.emoji} ${t.label}${badge}</button>`;
        }).join('');
    },

    setTag(tagId) {
        this._activeTag = tagId;
        this._applyFilter();
        this._renderChips();
        this.render();
    },

    // ── Filtering (combines tag + search) ──
    _applyFilter() {
        let list = this._allSongs;

        // Tag filter
        if (this._activeTag === 'fav') {
            list = list.filter(s => this._favorites.has(s.id));
        } else if (this._activeTag !== 'all') {
            list = list.filter(s => (s.tags || []).includes(this._activeTag));
        }

        // Search filter
        if (this._searchQ) {
            const q = this._searchQ.toLowerCase();
            list = list.filter(s => s.name.toLowerCase().includes(q));
        }

        this._filtered = list;
    },

    filter(q) {
        this._searchQ = q;
        this._applyFilter();
        this.render();
    },

    // ── Rendering ──
    render() {
        const list = document.getElementById('songs-list');
        list.innerHTML = '';

        if (this._filtered.length === 0) {
            list.innerHTML = `<div class="song-empty">${
                this._activeTag === 'fav'
                    ? 'Нажми ❤️ рядом с песенкой,<br>чтобы добавить в избранное'
                    : 'Ничего не найдено'
            }</div>`;
            return;
        }

        this._filtered.forEach((song) => {
            const realIdx = this._allSongs.indexOf(song);
            const isPlaying = realIdx === this.index;
            const isFav = this._favorites.has(song.id);
            const div = document.createElement('div');
            div.className = 'song-item' + (isPlaying ? ' playing' : '');
            div.innerHTML = `
                <div class="song-num ${isPlaying ? 'pi-icon' : ''}">${isPlaying ? '▶' : realIdx + 1}</div>
                <div class="song-name">${song.name}</div>
                <div class="song-dur">${song.duration || ''}</div>
                <button class="song-fav-btn ${isFav ? 'fav-active' : ''}" title="${isFav ? 'Убрать из избранного' : 'В избранное'}" data-id="${song.id}">
                    ${isFav ? '❤️' : '🤍'}
                </button>
                <button class="deeplink-btn" title="Скопировать ссылку" data-type="song" data-id="${song.id}" data-name="${song.name.replace(/"/g,'&quot;')}">🔗</button>
            `;
            div.addEventListener('click', (e) => {
                if (e.target.closest('.deeplink-btn') || e.target.closest('.song-fav-btn')) return;
                this.play(realIdx);
            });
            div.querySelector('.song-fav-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFav(song.id);
            });
            div.querySelector('.deeplink-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                copyDeepLink('song', song.id, song.name);
            });
            list.appendChild(div);
        });
    },

    // ── Playback ──
    play(i) {
        this.index = i;
        const song = this._allSongs[i];
        this.audio.src = this._resolveAudioSrc(song.src) || '';
        AudioMgr.play(this.audio, 'songs');
        document.getElementById('song-play-btn').textContent = '⏸';
        document.getElementById('song-name').textContent = song.name;
        document.getElementById('song-sub').textContent  = song.duration || '';
        document.getElementById('song-progress-bar').style.width = '0%';
        // Show video if available
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
        this._wasPaused = false;
    },

    toggle() {
        if (this.index === -1) {
            // Play first from filtered list
            if (this._filtered.length > 0) {
                this.play(this._allSongs.indexOf(this._filtered[0]));
            }
            return;
        }
        if (this.audio.paused) {
            AudioMgr.play(this.audio, 'songs');
            document.getElementById('song-play-btn').textContent = '⏸';
        } else {
            this.audio.pause();
            this._wasPaused = true;
            document.getElementById('song-play-btn').textContent = '▶';
        }
    },

    // Navigate within _filtered list
    prev() {
        if (this._filtered.length === 0) return;
        const curSong = this._allSongs[this.index];
        const curFilteredIdx = this._filtered.indexOf(curSong);
        const prevFilteredIdx = (curFilteredIdx - 1 + this._filtered.length) % this._filtered.length;
        const prevSong = this._filtered[prevFilteredIdx];
        this.play(this._allSongs.indexOf(prevSong));
    },

    nextSong() {
        if (this._filtered.length === 0) return;
        const curSong = this._allSongs[this.index];
        const curFilteredIdx = this._filtered.indexOf(curSong);
        let nextFilteredIdx;
        if (this.isShuffle) {
            nextFilteredIdx = Math.floor(Math.random() * this._filtered.length);
        } else {
            nextFilteredIdx = (curFilteredIdx + 1) % this._filtered.length;
        }
        const nextSong = this._filtered[nextFilteredIdx];
        this.play(this._allSongs.indexOf(nextSong));
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

    // ── Utilities ──
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
        this._allSongs.forEach((song, i) => {
            if (song.duration) return;
            const resolvedSrc = this._resolveAudioSrc(song.src);
            if (!resolvedSrc) return;
            const a = new Audio();
            a.preload = 'metadata';
            a.src = resolvedSrc;
            a.addEventListener('loadedmetadata', () => {
                const d = a.duration;
                if (d && !isNaN(d)) {
                    this._allSongs[i].duration = fmtTime(d);
                    const fi = this._filtered.indexOf(this._allSongs[i]);
                    if (fi !== -1) this._filtered[fi].duration = this._allSongs[i].duration;
                    this.render();
                }
            });
        });
    },

    _loadData() {
        try { return JSON.parse(localStorage.getItem('admin_songs')) || []; } catch { return []; }
    }
};
