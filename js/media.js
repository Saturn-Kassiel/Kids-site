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
    _videoLoadId: 0,

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
                'Й':'bukva_y', 'К':'bukva_k', 'Л':'bukva_l', 'М':'bukva_m', 'Н':'bukva_n',
                'О':'bukva_o', 'П':'bukva_p', 'Р':'bukva_r', 'С':'bukva_s', 'Т':'bukva_t',
                'У':'bukva_u', 'Ф':'bukva_f', 'Х':'bukva_kh', 'Ц':'bukva_ts', 'Ч':'bukva_ch',
                'Ш':'bukva_sh', 'Щ':'bukva_shch', 'Ъ':'bukva_hf', 'Ы':'bukva_IIIIeeee', 'Ь':'bukva_',
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
            const AUDIO_CYR = { 'Б':'Буква Б', 'Ь':'Буква Ь', 'Э':'Буква Э' };
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
                { name:'Оранжевый',  hex:'#f97316', emoji:'🟠', file:'oranzhevyj',  videoFile:'oranzhevyj' },
                { name:'Жёлтый',     hex:'#fbbf24', emoji:'🟡', file:'zhyoltyj',    videoFile:'zhyoltyj' },
                { name:'Зелёный',    hex:'#22c55e', emoji:'🟢', file:'zelyonyj',    videoFile:'zelyonyj' },
                { name:'Синий',      hex:'#3b82f6', emoji:'🔵', file:'sinij',       videoFile:'sinij' },
                { name:'Фиолетовый', hex:'#a855f7', emoji:'🟣', file:'fioletovyj',  videoFile:'fioletovyj' },
                { name:'Розовый',    hex:'#ec4899', emoji:'🌸', file:'rozovyj',     videoFile:'rozovyj' },
                { name:'Голубой',    hex:'#06b6d4', emoji:'🩵', file:'goluboj',     videoFile:'goluboj' },
                { name:'Белый',      hex:'#f1f5f9', emoji:'⬜', file:'belyj',       videoFile:'belyj' },
                { name:'Чёрный',     hex:'#1e293b', emoji:'⬛', file:'chyornyj',    videoFile:'chyornyj' },
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

        // Race condition guard
        const loadId = ++this._videoLoadId;

        // Reset video
        vid.pause();
        vid.removeAttribute('src');
        vid.load();
        vid.style.display = 'none';
        placeholder.style.display = 'flex';

        // Colored placeholder for colors section
        if (this._sectionType === 'colors' && item.hex) {
            placeholder.style.background = item.hex;
            placeholder.style.borderRadius = '18px';
        } else {
            placeholder.style.background = '';
        }

        if (item.video) {
            vid.onloadeddata = () => {
                if (this._videoLoadId !== loadId) return;
                vid.style.display = 'block';
                placeholder.style.display = 'none';
                vid.play().catch(() => {});
            };
            vid.onerror = () => {
                if (this._videoLoadId !== loadId) return;
                vid.style.display = 'none';
                placeholder.style.display = 'flex';
            };
            vid.src = item.video;
            if (vid.readyState >= 2) {
                vid.style.display = 'block';
                placeholder.style.display = 'none';
                vid.play().catch(() => {});
            }
        }

        // Audio
        this.player.src = item.audio;
        AudioMgr.play(this.player, 'media');
        document.getElementById('play-btn').innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        document.getElementById('track-name').textContent = item.label;
        const trackIcon = document.getElementById('track-icon');
        if (trackIcon) {
            if (this._sectionType === 'colors' && item.hex) {
                trackIcon.innerHTML = '<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:' + item.hex + ';border:1.5px solid rgba(0,0,0,0.1);vertical-align:middle"></span>';
            } else {
                trackIcon.textContent = item.icon;
            }
        }
        document.getElementById('track-sub').textContent  = this._sectionType === 'alphabet' ? 'Кириллический алфавит' : this._sectionType === 'colors' ? 'Учим цвета' : 'Учим цифры';
        document.getElementById('progress-bar').style.width = '0%';

        // Highlight chip
        document.querySelectorAll('#media-grid button').forEach((b, idx) => {
            b.classList.toggle('active', idx === i);
        });
    },

    toggle() {
        const vid = document.getElementById('global-video');
        if (this.player.paused) {
            AudioMgr.play(this.player, 'media');
            if (vid && vid.src) vid.play().catch(() => {});
            document.getElementById('play-btn').innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        } else {
            this.player.pause();
            if (vid && vid.src) vid.pause();
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

