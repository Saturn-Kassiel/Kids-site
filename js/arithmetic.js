// =============================================
// ARITHMETIC — Арифметика
// =============================================
const Arithmetic = {
    _level: 'easy',
    _solved: false,
    _current: null,
    _sessionScore: 0,
    _streak: 0,
    _sessionHints: 0,
    _engine: null,

    init() {
        AudioMgr.stop();
        this._sessionScore = 0;
        this._streak = 0;
        this._sessionHints = 0;
        App.navigate('arithmetic', 'Арифметика');
        this._updateScore();
        this._renderLevelBtns();
        const hb = document.getElementById('math-hint-btn');
        if (hb) hb.style.display = isHintEnabled('math') ? '' : 'none';
        if (!this._engine) {
            this._engine = new TileEngine({
                slotsId:   'math-slots',
                tilesId:   'math-tiles',
                msgId:     'math-msg',
                nextBtnId: 'math-next-btn',
                streakId:  'math-streak',
                onComplete: (assembled) => this._checkAnswer(assembled),
            });
        } else {
            this._engine.resetStreak();
        }
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

    _generate() {
        let a, b, op, answer, expr;

        if (this._level === 'easy') {
            op = Math.random() < 0.5 ? '+' : '−';
            if (op === '+') {
                a = this._rand(1, 9); b = this._rand(0, 10 - a); answer = a + b;
            } else {
                a = this._rand(1, 10); b = this._rand(0, a); answer = a - b;
            }
            expr = `${a} ${op} ${b}`;
        } else if (this._level === 'medium') {
            const type = this._rand(0, 2);
            if (type === 0) {
                op = '+'; a = this._rand(2, 15); b = this._rand(1, 20 - a); answer = a + b;
            } else if (type === 1) {
                op = '−'; a = this._rand(5, 20); b = this._rand(1, a); answer = a - b;
            } else {
                op = '×'; a = this._rand(1, 5); b = this._rand(1, 5); answer = a * b;
            }
            expr = `${a} ${op} ${b}`;
        } else {
            const type = this._rand(0, 3);
            if (type === 0) {
                op = '+'; a = this._rand(10, 40); b = this._rand(5, 50 - a); answer = a + b;
            } else if (type === 1) {
                op = '−'; a = this._rand(10, 50); b = this._rand(5, a); answer = a - b;
            } else if (type === 2) {
                op = '×'; a = this._rand(2, 9); b = this._rand(2, 9); answer = a * b;
            } else {
                b = this._rand(2, 9); answer = this._rand(1, 9); a = b * answer; op = '÷';
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
        document.activeElement?.blur();

        const ansDigits  = this._current.answerStr.split('');
        const decoyCount = this._level === 'easy' ? 2 : this._level === 'medium' ? 3 : 4;
        const ansSet     = new Set(ansDigits);
        const pool       = '0123456789'.split('').filter(d => !ansSet.has(d));
        const decoys     = this._shuffle(pool).slice(0, decoyCount);
        const allTiles   = this._shuffle([...ansDigits, ...decoys]);

        document.getElementById('math-problem').textContent = this._current.expr + ' = ?';

        const slotsEl = document.getElementById('math-slots');
        const tilesEl = document.getElementById('math-tiles');
        slotsEl.classList.add('no-anim');
        tilesEl.classList.add('no-anim');

        this._engine.setup(ansDigits, allTiles);

        requestAnimationFrame(() => {
            slotsEl.classList.remove('no-anim');
            tilesEl.classList.remove('no-anim');
        });
    },

    _checkAnswer(assembled) {
        const correct = this._current.answerStr;
        const msgEl   = document.getElementById('math-msg');

        if (assembled === correct) {
            this._solved = true;
            this._sessionScore++;
            this._updateScore();
            StatTracker.inc('math');

            playCorrectSound('math');
            this._engine.markCorrect();

            msgEl.textContent = getPersonalPraise();
            msgEl.className   = 'words-msg words-msg-ok';

            if (window.confetti) confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });

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
            msgEl.className   = 'words-msg words-msg-err';
            this._engine.markWrong();
        }
    },

    hint() {
        if (this._solved) return;
        if (!isHintEnabled('math')) { showToast('💡 Подсказки отключены в настройках'); return; }
        this._sessionHints++;
        this._updateHintBtn();
        const result = this._engine.hint();
        if (result) showToast('💡 Подсказка: ' + result);
        else showToast('🤔 Попробуй убрать неправильные цифры');
    },

    next() {
        this.show();
    },

    _updateScore() {
        const el = document.getElementById('math-score');
        if (el) el.textContent = this._sessionScore;
    },


    _updateHintBtn() {
        const btn = document.getElementById('math-hint-btn');
        if (!btn) return;
        const svg = btn.querySelector('svg');
        const svgHtml = svg ? svg.outerHTML : '💡';
        btn.innerHTML = svgHtml + (this._sessionHints > 0
            ? ` Подсказка <span style="opacity:0.7">($${this._sessionHints})</span>`
            : ' Подсказка');
    },

        _playTick() {
        if (!getSoundSetting('snd-math-correct')) return;
        try {
            const ctx  = new (window.AudioContext || window.webkitAudioContext)();
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
