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
