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
        const hb = document.getElementById('words-hint-btn');
        if (hb) hb.style.display = isHintEnabled('words') ? '' : 'none';
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
        if (!isHintEnabled('words')) { showToast('💡 Подсказки отключены в настройках'); return; }
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
