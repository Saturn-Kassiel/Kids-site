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
        const hb = document.getElementById('math-hint-btn');
        if (hb) hb.style.display = isHintEnabled('math') ? '' : 'none';
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
        if (!isHintEnabled('math')) { showToast('💡 Подсказки отключены в настройках'); return; }
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
