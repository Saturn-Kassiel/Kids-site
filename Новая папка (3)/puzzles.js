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
        const el = document.getElementById('puzzle-level-dots'); if (el) el.remove();
        const topBar = document.getElementById('top-bar');
        const settingsBtn = document.getElementById('settings-icon-btn');
        if (!topBar || !settingsBtn) return;
        // Кружки уровней
        const wrap = document.createElement('div');
        wrap.id = 'puzzle-level-dots';
        wrap.innerHTML = `
            <span class="lvl-counter" id="puzzle-counter">${this._totalCount()}</span>
            <button class="lvl-dot easy   ${this._level==='easy'   ? 'active':''}" onclick="Puzzles.setLevel('easy')"   title="Простой"></button>
            <button class="lvl-dot medium ${this._level==='medium' ? 'active':''}" onclick="Puzzles.setLevel('medium')" title="Средний"></button>
            <button class="lvl-dot hard   ${this._level==='hard'   ? 'active':''}" onclick="Puzzles.setLevel('hard')"   title="Сложный"></button>
        `;
        topBar.insertBefore(wrap, settingsBtn);
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
        const hintEl = document.getElementById('puzzle-hint');
        if (isHintEnabled('puzzles')) {
            hintEl.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/></svg> <b>Подсказка:</b> ${p.hint}`;
            hintEl.style.display = '';
        } else {
            hintEl.innerHTML = '';
            hintEl.style.display = 'none';
        }
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
            CardBadges.markTried('puzzles', this._current().id);
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

