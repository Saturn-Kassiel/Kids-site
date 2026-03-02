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
