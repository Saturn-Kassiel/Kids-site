// =============================================
// INTERSTITIALS — Перебивки с мини-заданиями
// =============================================
const Interstitials = {
    // Счётчики действий с последней перебивки (по разделам)
    _counters: { media: 0, words: 0, math: 0 },
    // Порог для показа перебивки
    _thresholds: { media: 5, words: 3, math: 3 },
    // Текущее задание
    _active: false,
    _resolve: null,  // callback после закрытия
    // Итоговый счёт в текущей сессии (показываем в оверлее)
    _sessionScore: 0,
    // Стрик для достижений
    _streak: 0,
    _bestStreak: 0,
    _shownMilestones: new Set(),
    // Тип 5: данные для «запомни»
    _memoryData: null,

    // ── Проверка настройки ──
    isEnabled() {
        return getSoundSetting('interstitials'); // по умолчанию true
    },

    // ── Инкремент + проверка. Возвращает true если перебивка будет показана ──
    bump(section) {
        if (!this.isEnabled()) return false;
        this._counters[section] = (this._counters[section] || 0) + 1;
        if (this._counters[section] >= this._thresholds[section]) {
            this._counters[section] = 0;
            // Небольшая задержка, чтобы не перебивать текущую анимацию
            setTimeout(() => this._show(), 600);
            return true;
        }
        return false;
    },

    resetCounter(section) {
        this._counters[section] = 0;
    },

    // ── Выбор случайного типа и показ ──
    _show() {
        if (this._active) return;
        this._active = true;

        // Выбираем случайный тип задания
        const types = ['countObjects', 'whatColor', 'missingLetter', 'quickCount', 'oddOneOut'];
        const type = types[Math.floor(Math.random() * types.length)];

        // Генерируем задание
        const task = this['_gen_' + type]();
        this._render(task, type);
    },

    // ═══════════════════════════════════════
    //  ГЕНЕРАТОРЫ ЗАДАНИЙ
    // ═══════════════════════════════════════

    _rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
    _shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    // ── Тип 2: Сосчитай предметы ──
    _gen_countObjects() {
        const emojis = ['🍎','🐱','🎈','🌟','🐟','🦋','🍄','🌸','🐶','🍉','🍊','🐸','🚀','⚽','🎂'];
        const emoji = emojis[this._rand(0, emojis.length - 1)];
        const correct = this._rand(2, 8);
        const display = Array(correct).fill(emoji).join(' ');

        // Варианты ответа
        let options = [correct];
        while (options.length < 4) {
            const opt = this._rand(Math.max(1, correct - 3), correct + 3);
            if (!options.includes(opt)) options.push(opt);
        }
        options = this._shuffle(options);

        return {
            title: 'Сосчитай! 🔢',
            question: display,
            questionClass: 'inter-emoji-display',
            options: options.map(o => ({ text: String(o), correct: o === correct })),
        };
    },

    // ── Тип 3: Какой это цвет? ──
    _gen_whatColor() {
        const COLORS = [
            { name:'Красный',    hex:'#ef4444' },
            { name:'Оранжевый',  hex:'#f97316' },
            { name:'Жёлтый',     hex:'#fbbf24' },
            { name:'Зелёный',    hex:'#22c55e' },
            { name:'Синий',      hex:'#3b82f6' },
            { name:'Фиолетовый', hex:'#a855f7' },
            { name:'Розовый',    hex:'#ec4899' },
            { name:'Голубой',    hex:'#06b6d4' },
        ];

        const target = COLORS[this._rand(0, COLORS.length - 1)];
        let options = [target];
        while (options.length < 4) {
            const c = COLORS[this._rand(0, COLORS.length - 1)];
            if (!options.find(o => o.name === c.name)) options.push(c);
        }
        options = this._shuffle(options);

        return {
            title: 'Какой это цвет? 🎨',
            question: `<div class="inter-color-circle" style="background:${target.hex}"></div>`,
            questionClass: 'inter-color-display',
            questionIsHTML: true,
            options: options.map(o => ({ text: o.name, correct: o.name === target.name })),
        };
    },

    // ── Тип 4: Какая буква пропала? ──
    _gen_missingLetter() {
        const words = [
            { word:'КОТ', emoji:'🐱' }, { word:'ДОМ', emoji:'🏠' }, { word:'ШАР', emoji:'🎈' },
            { word:'СОК', emoji:'🧃' }, { word:'ЛЕС', emoji:'🌲' }, { word:'МЯЧ', emoji:'⚽' },
            { word:'ЛЕВ', emoji:'🦁' }, { word:'КИТ', emoji:'🐳' }, { word:'МЁД', emoji:'🍯' },
            { word:'СЫР', emoji:'🧀' }, { word:'РЫБА', emoji:'🐟' }, { word:'ЛУНА', emoji:'🌙' },
            { word:'ЛИСА', emoji:'🦊' }, { word:'РОЗА', emoji:'🌹' }, { word:'УТКА', emoji:'🦆' },
        ];
        const item = words[this._rand(0, words.length - 1)];
        const letters = item.word.split('');
        const gapIdx = this._rand(0, letters.length - 1);
        const correct = letters[gapIdx];

        // Показываем слово с пропуском
        const display = letters.map((l, i) => i === gapIdx ? '_' : l).join('');

        // Варианты ответа
        const alphabet = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ';
        let options = [correct];
        while (options.length < 4) {
            const l = alphabet[this._rand(0, alphabet.length - 1)];
            if (!options.includes(l)) options.push(l);
        }
        options = this._shuffle(options);

        return {
            title: `Какая буква пропала? ${item.emoji}`,
            question: `<span class="inter-word-gap">${display}</span>`,
            questionClass: 'inter-word-display',
            questionIsHTML: true,
            options: options.map(o => ({ text: o, correct: o === correct })),
        };
    },

    // ── Тип 5: Быстрый счёт (запомни) ──
    _gen_quickCount() {
        const emojis = ['🍎','🐱','🎈','🌟','🐟','🦋','🍄','🌸','🐶','🍉'];
        const emoji = emojis[this._rand(0, emojis.length - 1)];
        const correct = this._rand(3, 7);

        let options = [correct];
        while (options.length < 4) {
            const opt = this._rand(Math.max(1, correct - 2), correct + 2);
            if (!options.includes(opt)) options.push(opt);
        }
        options = this._shuffle(options);

        // Сохраняем данные для двухфазного показа
        this._memoryData = {
            emoji,
            correct,
            options: options.map(o => ({ text: String(o), correct: o === correct })),
        };

        return {
            title: 'Запомни! 👀',
            question: Array(correct).fill(emoji).join(' '),
            questionClass: 'inter-emoji-display inter-memory-flash',
            isMemory: true,
            options: [], // будут показаны после фазы запоминания
        };
    },

    // ── Тип 6: Что лишнее? ──
    _gen_oddOneOut() {
        const groups = [
            { items: ['🐱','🐶','🐟','🌹'], odd: 3, category: 'Животные' },
            { items: ['🍎','🍊','🍉','⚽'], odd: 3, category: 'Фрукты' },
            { items: ['🔴','🟢','🔵','⭐'], odd: 3, category: 'Цвета' },
            { items: ['🚗','🚌','🚂','🐱'], odd: 3, category: 'Транспорт' },
            { items: ['☀️','🌙','⭐','🍎'],  odd: 3, category: 'В небе' },
            { items: ['🎈','🎂','🎁','📖'], odd: 3, category: 'Праздник' },
            { items: ['🍊','🥕','🎃','🐸'], odd: 3, category: 'Оранжевые' },
            { items: ['🌲','🌳','🌿','🍎'], odd: 3, category: 'Растения' },
            { items: ['✏️','📖','🎒','🐶'], odd: 3, category: 'Школа' },
            { items: ['🧀','🍞','🥛','🚀'], odd: 3, category: 'Еда' },
        ];

        const group = groups[this._rand(0, groups.length - 1)];
        // Перемешиваем позиции, запоминая где лишний
        const indices = [0, 1, 2, 3];
        const shuffled = this._shuffle(indices);
        const oddNewIdx = shuffled.indexOf(group.odd);
        const items = shuffled.map(i => group.items[i]);

        return {
            title: 'Что лишнее? 🤔',
            question: '',
            questionClass: '',
            isGrid: true,
            gridItems: items,
            oddIndex: oddNewIdx,
            options: [], // будут кнопки-эмодзи
        };
    },

    // ═══════════════════════════════════════
    //  РЕНДЕР ОВЕРЛЕЯ
    // ═══════════════════════════════════════

    _render(task, type) {
        // Удаляем старый если есть
        const old = document.getElementById('inter-overlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'inter-overlay';

        let bodyHTML = '';

        if (type === 'quickCount') {
            // Фаза 1: показ предметов
            bodyHTML = `
                <div class="inter-card">
                    <div class="inter-title">${task.title}</div>
                    <div class="${task.questionClass}">${task.question}</div>
                    <div class="inter-timer-bar"><div class="inter-timer-fill" id="inter-timer-fill"></div></div>
                    <div class="inter-hint">Запоминай!</div>
                </div>
            `;
        } else if (type === 'oddOneOut') {
            // Сетка из 4 больших эмодзи-кнопок
            const gridBtns = task.gridItems.map((emoji, i) =>
                `<button class="inter-grid-btn" data-idx="${i}" onclick="Interstitials._answerOdd(${i},${task.oddIndex})">${emoji}</button>`
            ).join('');
            bodyHTML = `
                <div class="inter-card">
                    <div class="inter-title">${task.title}</div>
                    <div class="inter-grid">${gridBtns}</div>
                    <div class="inter-score">Счёт перебивок: <b>${StatTracker.get('interstitials')}</b></div>
                </div>
            `;
        } else {
            // Стандартный формат: вопрос + 4 кнопки
            const questionHTML = task.questionIsHTML ? task.question : `<div>${task.question}</div>`;
            const optBtns = task.options.map((o, i) =>
                `<button class="inter-opt-btn" data-idx="${i}" onclick="Interstitials._answer(${i},${o.correct})">${o.text}</button>`
            ).join('');
            bodyHTML = `
                <div class="inter-card">
                    <div class="inter-title">${task.title}</div>
                    <div class="${task.questionClass}">${questionHTML}</div>
                    <div class="inter-options">${optBtns}</div>
                    <div class="inter-score">Счёт перебивок: <b>${StatTracker.get('interstitials')}</b></div>
                </div>
            `;
        }

        overlay.innerHTML = bodyHTML;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('inter-visible'));

        // Тип 5: через 3 секунды скрываем предметы, показываем вопрос
        if (type === 'quickCount') {
            const fill = document.getElementById('inter-timer-fill');
            if (fill) fill.style.width = '100%';
            setTimeout(() => this._memoryPhase2(), 3000);
        }
    },

    // ── Фаза 2 для «Быстрый счёт» ──
    _memoryPhase2() {
        const data = this._memoryData;
        if (!data) return;
        const card = document.querySelector('.inter-card');
        if (!card) return;

        const optBtns = data.options.map((o, i) =>
            `<button class="inter-opt-btn" data-idx="${i}" onclick="Interstitials._answer(${i},${o.correct})">${o.text}</button>`
        ).join('');

        card.innerHTML = `
            <div class="inter-title">Сколько было ${data.emoji}?</div>
            <div class="inter-memory-question">🤔</div>
            <div class="inter-options">${optBtns}</div>
            <div class="inter-score">Счёт перебивок: <b>${StatTracker.get('interstitials')}</b></div>
        `;
        // Анимация появления
        card.classList.add('inter-card-pop');
    },

    // ═══════════════════════════════════════
    //  ОБРАБОТКА ОТВЕТОВ
    // ═══════════════════════════════════════

    _answer(idx, isCorrect) {
        // Блокируем повторные нажатия
        document.querySelectorAll('.inter-opt-btn').forEach(b => b.disabled = true);
        const btn = document.querySelector(`.inter-opt-btn[data-idx="${idx}"]`);

        if (isCorrect) {
            this._onCorrect(btn);
        } else {
            this._onWrong(btn);
        }
    },

    _answerOdd(idx, correctIdx) {
        document.querySelectorAll('.inter-grid-btn').forEach(b => b.disabled = true);
        const btn = document.querySelector(`.inter-grid-btn[data-idx="${idx}"]`);

        if (idx === correctIdx) {
            this._onCorrect(btn);
        } else {
            this._onWrong(btn);
            // Подсветим правильный
            const correctBtn = document.querySelector(`.inter-grid-btn[data-idx="${correctIdx}"]`);
            if (correctBtn) correctBtn.classList.add('inter-correct');
        }
    },

    _onCorrect(btn) {
        if (btn) btn.classList.add('inter-correct');
        playCorrectSound('interstitials');
        StatTracker.inc('interstitials');
        this._streak++;
        if (this._streak > this._bestStreak) {
            this._bestStreak = this._streak;
            localStorage.setItem('inter_best_streak', this._bestStreak);
        }

        // Обновляем отображение счёта
        const scoreEl = document.querySelector('.inter-score b');
        if (scoreEl) scoreEl.textContent = StatTracker.get('interstitials');

        // Конфетти + звёздочки
        if (window.confetti) {
            confetti({ particleCount: 50, spread: 50, origin: { y: 0.5 }, zIndex: 100001 });
        }

        // Танцующий Гоша

        // Достижения (каждые 5 подряд)
        if (this._streak % 5 === 0 && !this._shownMilestones.has(this._streak)) {
            this._shownMilestones.add(this._streak);
            const cn = getChildName();
            showToast(cn ? `🏆 ${cn}, ${this._streak} перебивок подряд!` : `🏆 ${this._streak} перебивок подряд!`, 3000);
        }

        setTimeout(() => this._close(), 1200);
    },

    _onWrong(btn) {
        if (btn) btn.classList.add('inter-wrong');
        playWrongSound('interstitials');
        this._streak = 0;
        this._shownMilestones = new Set();

        // Подсвечиваем правильный ответ
        document.querySelectorAll('.inter-opt-btn').forEach(b => {
            if (b.getAttribute('onclick')?.includes('true')) b.classList.add('inter-correct');
        });

        setTimeout(() => this._close(), 1800);
    },

    _close() {
        const overlay = document.getElementById('inter-overlay');
        if (overlay) {
            overlay.classList.remove('inter-visible');
            setTimeout(() => overlay.remove(), 300);
        }
        this._active = false;
        this._memoryData = null;
    },

    // ── Звук перебивки (используем существующий) ──
    _playSound(correct) {
        if (correct) playCorrectSound('interstitials');
        else playWrongSound('interstitials');
    },

    // ── Инициализация (восстанавливаем стрик) ──
    init() {
        this._bestStreak = parseInt(localStorage.getItem('inter_best_streak') || '0');
    }
};

