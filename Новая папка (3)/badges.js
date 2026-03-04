// =============================================
// BADGES — Коллекция достижений
// =============================================
const Badges = {
    _unlocked: {},  // { badgeId: timestamp }

    // Определения всех значков
    _defs: [
        // Алфавит
        { id:'first_letter',  key:'letters', thr:1,   emoji:'🔤', name:'Первая буква',     desc:'Прослушай первую букву' },
        { id:'half_alphabet', key:'letters', thr:16,  emoji:'📖', name:'Половина алфавита', desc:'Прослушай 16 букв' },
        { id:'full_alphabet', key:'letters', thr:33,  emoji:'🎓', name:'Весь алфавит',      desc:'Прослушай все 33 буквы' },
        // Цифры
        { id:'first_number',  key:'numbers', thr:1,   emoji:'🔢', name:'Первая цифра',     desc:'Прослушай первую цифру' },
        { id:'all_numbers',   key:'numbers', thr:10,  emoji:'🧮', name:'Все цифры',        desc:'Прослушай все 10 цифр' },
        // Цвета
        { id:'first_color',   key:'colors',  thr:1,   emoji:'🎨', name:'Первый цвет',      desc:'Прослушай первый цвет' },
        { id:'all_colors',    key:'colors',  thr:12,  emoji:'🌈', name:'Все цвета',        desc:'Прослушай все 12 цветов' },
        // Слова
        { id:'first_word',    key:'words',   thr:1,   emoji:'📝', name:'Первое слово',     desc:'Собери первое слово' },
        { id:'word_collector', key:'words',   thr:10,  emoji:'📚', name:'Словарик',         desc:'Собери 10 слов' },
        { id:'word_master',   key:'words',   thr:25,  emoji:'✍️',  name:'Книгочей',         desc:'Собери 25 слов' },
        // Арифметика
        { id:'first_math',    key:'math',    thr:1,   emoji:'➕', name:'Первый пример',    desc:'Реши первый пример' },
        { id:'math_fan',      key:'math',    thr:10,  emoji:'🔢', name:'Счетовод',         desc:'Реши 10 примеров' },
        { id:'math_master',   key:'math',    thr:30,  emoji:'🧮', name:'Математик',        desc:'Реши 30 примеров' },
        // Ребусы
        { id:'first_puzzle',  key:'puzzles', thr:1,   emoji:'🧩', name:'Первый ребус',     desc:'Реши первый ребус' },
        { id:'puzzle_pro',    key:'puzzles', thr:15,  emoji:'🧠', name:'Мастер ребусов',   desc:'Реши 15 ребусов' },
        { id:'puzzle_legend', key:'puzzles', thr:40,  emoji:'💎', name:'Легенда ребусов',  desc:'Реши 40 ребусов' },
        // Загадки
        { id:'first_riddle',  key:'riddles', thr:1,   emoji:'❓', name:'Первая загадка',   desc:'Отгадай первую загадку' },
        { id:'riddle_pro',    key:'riddles', thr:15,  emoji:'🦉', name:'Знаток загадок',   desc:'Отгадай 15 загадок' },
        { id:'riddle_legend', key:'riddles', thr:40,  emoji:'👑', name:'Мудрец',           desc:'Отгадай 40 загадок' },
        // Песенки
        { id:'first_song',    key:'songs',   thr:1,   emoji:'🎵', name:'Первая песенка',   desc:'Прослушай первую песенку' },
        { id:'meloman',       key:'songs',   thr:10,  emoji:'🎶', name:'Меломан',          desc:'Прослушай 10 песенок' },
        // Перебивки
        { id:'first_inter',   key:'interstitials', thr:1,   emoji:'⚡', name:'Первая перебивка', desc:'Ответь на первую перебивку' },
        { id:'inter_fan',     key:'interstitials', thr:10,  emoji:'🎯', name:'Меткий глаз',     desc:'Ответь на 10 перебивок' },
        { id:'inter_master',  key:'interstitials', thr:30,  emoji:'🧠', name:'Мастер перебивок', desc:'Ответь на 30 перебивок' },
        // Серия дней (key: 'streak' — проверяется через getDayStreak)
        { id:'streak_week',   key:'streak', thr:7,   emoji:'📅', name:'Неделя подряд',   desc:'Занимайся 7 дней подряд' },
        { id:'streak_month',  key:'streak', thr:30,  emoji:'📅', name:'Месяц подряд',    desc:'Занимайся 30 дней подряд' },
        { id:'streak_quarter',key:'streak', thr:90,  emoji:'📅', name:'3 месяца подряд', desc:'Занимайся 90 дней подряд' },
        { id:'streak_half',   key:'streak', thr:180, emoji:'📅', name:'Полгода подряд',  desc:'Занимайся 180 дней подряд' },
        { id:'streak_year',   key:'streak', thr:365, emoji:'📅', name:'Год подряд',      desc:'Занимайся 365 дней подряд' },
        // Мета (key: null — проверяются отдельно)
        { id:'explorer',      key:null, thr:5,  emoji:'🌟', name:'Исследователь', desc:'Получи 5 значков' },
        { id:'champion',      key:null, thr:14, emoji:'🏆', name:'Чемпион',       desc:'Получи 14 значков' },
        { id:'completionist', key:null, thr:24, emoji:'💫', name:'Суперзвезда',   desc:'Получи 24 значка' },
    ],

    // SVG-иконки для значков
    _svgIcons: {
        first_letter:  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 36L22 12h4l8 24"/><path d="M18 27h12"/></svg>',
        half_alphabet: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10h28a2 2 0 012 2v24a2 2 0 01-2 2H8"/><path d="M8 10v28"/><path d="M14 18h14"/><path d="M14 24h10"/><path d="M14 30h12"/></svg>',
        full_alphabet: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6l-2 8h-8l6.5 5-2.5 8L24 22l6 5-2.5-8L34 14h-8z"/><path d="M12 36h24"/><path d="M16 40h16"/></svg>',
        first_number:  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14l-4 2v0"/><path d="M20 14v20"/><path d="M16 34h8"/></svg>',
        all_numbers:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="32" height="32" rx="4"/><path d="M16 16v16"/><path d="M24 16v16"/><path d="M32 16v16"/><path d="M8 20h32"/><path d="M8 28h32"/></svg>',
        first_color:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="16" r="5"/><circle cx="30" cy="18" r="4"/><circle cx="16" cy="26" r="4"/><path d="M24 42c8 0 16-6 16-16S34 6 24 6 8 14 8 26c0 4 2 8 5 10 1 1 1 2 0 3-1 1 0 3 1 3h10z"/></svg>',
        all_colors:    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 34c4-6 10-12 18-12s14 6 18 12"/><path d="M9 30c3-4 8-8 15-8s12 4 15 8"/><path d="M12 26c3-3 7-6 12-6s9 3 12 6"/></svg>',
        first_word:    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M32 8l6 6-20 20H12v-6z"/><path d="M28 12l6 6"/></svg>',
        word_collector: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6h20a2 2 0 012 2v32a2 2 0 01-2 2H12a2 2 0 01-2-2V8a2 2 0 012-2z"/><path d="M16 6v36"/><path d="M22 16h8"/><path d="M22 22h6"/><path d="M22 28h7"/></svg>',
        word_master:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 40l4-12L30 10l6 6L18 34z"/><path d="M26 14l6 6"/><path d="M34 10l4-4"/><path d="M12 28l6 6"/></svg>',
        first_math:    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="24" y1="12" x2="24" y2="36"/><line x1="12" y1="24" x2="36" y2="24"/></svg>',
        math_fan:      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="32" height="32" rx="4"/><line x1="16" y1="18" x2="24" y2="18"/><line x1="20" y1="14" x2="20" y2="22"/><line x1="28" y1="17" x2="36" y2="17"/><line x1="16" y1="32" x2="24" y2="32"/><line x1="28" y1="28" x2="36" y2="36"/><line x1="36" y1="28" x2="28" y2="36"/></svg>',
        math_master:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="16"/><path d="M18 18l12 12"/><path d="M30 18l-12 12"/><path d="M24 8v4"/><path d="M24 36v4"/><path d="M8 24h4"/><path d="M36 24h4"/></svg>',
        first_puzzle:  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M34 20c2-1 4 0 4 2s-2 3-4 2"/><path d="M20 14c-1-2 0-4 2-4s3 2 2 4"/><path d="M10 10h12v8c-2 1-2 5 0 6v8H10V10z"/><path d="M22 10h12v22H22v-8c2-1 2-5 0-6z"/></svg>',
        puzzle_pro:    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6c-2 4-6 6-6 10a6 6 0 0012 0c0-4-4-6-6-10z"/><path d="M20 22c-3 2-8 6-8 12h24c0-6-5-10-8-12"/><path d="M18 38h12"/><path d="M20 42h8"/></svg>',
        puzzle_legend: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6l4 12h12l-10 7 4 13-10-8-10 8 4-13-10-7h12z"/></svg>',
        first_riddle:  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="16"/><path d="M19 18c0-3 2-5 5-5s5 2 5 5c0 3-3 4-5 6"/><circle cx="24" cy="34" r="1.5" fill="currentColor"/></svg>',
        riddle_pro:    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 40c0-4-6-6-6-14a12 12 0 0124 0c0 8-6 10-6 14"/><path d="M18 40h12"/><path d="M20 44h8"/><circle cx="18" cy="20" r="2"/><circle cx="30" cy="20" r="2"/></svg>',
        riddle_legend: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 38l4-10"/><path d="M36 38l-4-10"/><path d="M8 28h32"/><path d="M16 28l2-8 6-10 6 10 2 8"/></svg>',
        first_song:    '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 34V14l16-4v20"/><circle cx="14" cy="34" r="4"/><circle cx="30" cy="30" r="4"/></svg>',
        meloman:       '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 34V14l16-4v20"/><circle cx="14" cy="34" r="4"/><circle cx="30" cy="30" r="4"/><path d="M36 12c2-1 4 0 4 2"/><path d="M38 8c3-1 6 0 6 3"/></svg>',
        first_inter:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M28 6L18 24h10l-4 18 14-22H26z"/></svg>',
        inter_fan:     '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="4"/><circle cx="24" cy="24" r="1.5" fill="currentColor"/></svg>',
        inter_master:  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6c-2 4-6 6-6 10a6 6 0 0012 0c0-4-4-6-6-10z"/><path d="M20 22c-3 2-8 6-8 12h24c0-6-5-10-8-12"/><path d="M24 28l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z"/></svg>',
        explorer:      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6l3 9h9l-7 5 3 9-8-6-8 6 3-9-7-5h9z"/></svg>',
        champion:      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8h20v12a10 10 0 01-20 0V8z"/><path d="M14 14H8c0 6 3 8 6 8"/><path d="M34 14h6c0 6-3 8-6 8"/><path d="M20 30v4h8v-4"/><path d="M16 38h16"/><path d="M20 34h8v4h-8z"/></svg>',
        completionist: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4l4 8 8 1-6 6 2 8-8-4-8 4 2-8-6-6 8-1z"/><path d="M14 32l-4 4"/><path d="M34 32l4 4"/><path d="M24 34v6"/><circle cx="10" cy="38" r="2"/><circle cx="38" cy="38" r="2"/><circle cx="24" cy="42" r="2"/></svg>',
        streak_week:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="10" width="32" height="30" rx="4"/><path d="M8 18h32"/><path d="M16 6v8"/><path d="M32 6v8"/><path d="M16 26h4"/><path d="M28 26h4"/><path d="M16 32h4"/></svg>',
        streak_month:  '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="10" width="32" height="30" rx="4"/><path d="M8 18h32"/><path d="M16 6v8"/><path d="M32 6v8"/><path d="M16 26h16"/><path d="M16 32h12"/></svg>',
        streak_quarter:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="10" width="32" height="30" rx="4"/><path d="M8 18h32"/><path d="M16 6v8"/><path d="M32 6v8"/><path d="M20 28l4 4 6-8"/></svg>',
        streak_half:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="16"/><path d="M24 8v6"/><path d="M24 34v6"/><path d="M8 24h6"/><path d="M34 24h6"/><path d="M24 16a8 8 0 010 16" fill="none"/><path d="M24 16v16"/></svg>',
        streak_year:   '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="16"/><path d="M24 12v6l4 2"/><path d="M14 38l2-4"/><path d="M34 38l-2-4"/><path d="M24 8v2"/><path d="M24 38v2"/><path d="M8 24h2"/><path d="M38 24h2"/><path d="M12 14l1.5 1.5"/><path d="M34.5 32.5l1.5 1.5"/><path d="M12 34l1.5-1.5"/><path d="M34.5 15.5l1.5-1.5"/></svg>',
    },

    _getBadgeSVG(id) {
        return this._svgIcons[id] || '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="24" cy="24" r="16"/></svg>';
    },

    init() {
        this._unlocked = JSON.parse(localStorage.getItem('badges_unlocked') || '{}');
        this._updateHomeBadge();
    },

    _save() {
        localStorage.setItem('badges_unlocked', JSON.stringify(this._unlocked));
    },

    _unlockedCount() {
        return Object.keys(this._unlocked).length;
    },

    // Проверяем все значки — вызывается после каждого изменения стата
    checkAll() {
        const newBadges = [];
        this._defs.forEach(def => {
            if (this._unlocked[def.id]) return; // уже получен

            let val;
            if (def.key === null) {
                // Мета-бейдж: считаем сколько обычных (не мета) значков открыто
                val = this._defs.filter(d => d.key !== null && this._unlocked[d.id]).length;
            } else if (def.key === 'streak') {
                val = StatTracker.getDayStreak();
            } else {
                val = StatTracker.get(def.key);
            }

            if (val >= def.thr) {
                this._unlocked[def.id] = Date.now();
                newBadges.push(def);
            }
        });

        if (newBadges.length > 0) {
            this._save();
            this._updateHomeBadge();
            // Показываем уведомление для первого нового значка
            this._notify(newBadges[0]);
            // Анимируем Гошу
            Gosha.celebrate();
        }
    },

    _notify(def) {
        const childN = getChildName();
        const badgeMsg = childN ? `🏅 ${childN}, новый значок: ${def.name}!` : `🏅 Новый значок: ${def.name}!`;
        showToast(badgeMsg, 3200);
        // Мини-конфетти
        if (window.confetti) {
            confetti({ particleCount: 50, spread: 50, origin: { y: 0.8 }, colors: ['#fbbf24','#a78bfa','#34d399','#f472b6'] });
        }
        // Гоша празднует
    },

    _updateHomeBadge() {
        const el = document.getElementById('mc-badge-count');
        if (!el) return;
        const count = this._unlockedCount();
        if (count > 0) {
            el.textContent = count;
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    },

    // Рендер экрана достижений
    show() {
        App.navigate('badges', 'Достижения');
        this._render();
    },

    _render() {
        const grid = document.getElementById('badges-grid');
        const total = this._defs.length;
        const unlocked = this._unlockedCount();

        document.getElementById('badges-unlocked').textContent = unlocked;
        document.getElementById('badges-total').textContent = total;
        const barFill = document.getElementById('badges-bar-fill');
        setTimeout(() => { barFill.style.width = (unlocked / total * 100) + '%'; }, 100);

        // Анимируем маскот на странице достижений — СТАТИЧНЫЙ (зал славы)
        const mascotWrap = document.getElementById('badges-mascot-wrap');
        if (mascotWrap) {
            mascotWrap.className = 'badges-mascot-wrap';
        }

        grid.innerHTML = '';
        this._defs.forEach((def, i) => {
            const isUnlocked = !!this._unlocked[def.id];
            let progress = 0;
            if (def.key === null) {
                progress = this._defs.filter(d => d.key !== null && this._unlocked[d.id]).length;
            } else if (def.key === 'streak') {
                progress = StatTracker.getDayStreak();
            } else {
                progress = StatTracker.get(def.key);
            }
            const pct = Math.min(progress / def.thr * 100, 100);
            const date = isUnlocked ? new Date(this._unlocked[def.id]) : null;
            const dateStr = date ? `${date.getDate()}.${date.getMonth()+1}.${date.getFullYear()}` : '';

            const card = document.createElement('div');
            card.className = 'badge-card' + (isUnlocked ? ' unlocked' : '');
            card.style.animationDelay = (i * 0.04) + 's';
            card.innerHTML = `
                <div class="badge-icon-wrap">${this._getBadgeSVG(def.id)}</div>
                <div class="badge-name">${def.name}</div>
                <div class="badge-desc">${isUnlocked ? dateStr : def.desc}</div>
                <div class="badge-progress-bottom">
                    <div class="badge-progress-bar"><div class="badge-progress-fill" style="width:${pct}%"></div></div>
                    <div class="badge-progress-text">${Math.min(progress, def.thr)} / ${def.thr}</div>
                </div>
            `;
            grid.appendChild(card);
        });
    }
};

