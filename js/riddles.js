// =============================================
// RIDDLES
// =============================================
const Riddles = {
    _hasUnsaved: false,
    _solved: false,
    _level: 'easy',
    _data: { easy: [], medium: [], hard: [] },
    _queue: { easy: [], medium: [], hard: [] },
    _qpos:  { easy: 0,  medium: 0,  hard: 0  },

    data: [
        { q:'Белым снегом всё одето, значит наступает ...', a:'Зима', pic:'assets/images/riddles_pictures_opt/zima.webp' },
        { q:'Охраняет часто дом, повиляет всем хвостом, зарычит, коль ты чужой, и оближет, если свой.', a:'Собака', pic:'assets/images/riddles_pictures_opt/sobaka.webp' },
        { q:'По реке плывёт бревно, ох и злющее оно,  тем, кто в речку угодил, нос откусит ...', a:'Крокодил', pic:'assets/images/riddles_pictures_opt/krokodil.webp' },
        { q:'Мимо улья проходил косолапый ...', a:'Медведь', pic:'assets/images/riddles_pictures_opt/medved.webp' },
        { q:'Ночью каждое оконце слабо освещает ...', a:'Луна', pic:'assets/images/riddles_pictures_opt/luna.webp' },
        { q:'Овощ это непростой,\nВызовет слезу порой,\nНо уж больно он полезный\nЗащищает от болезней!', a:'Лук', pic:'assets/images/riddles_pictures_opt/luk.webp' },
        { q:'Кто мычит там на лугу,\nСочную жует траву,\nУгощает молоком\nИ полезным творожком.', a:'Корова', pic:'assets/images/riddles_pictures_opt/korova.webp' },
        { q:'С ветки прыгает на ветку\nРыжая красавица.\nШишки, желуди, орехи\nЗапасает на зиму.', a:'белка', pic:'assets/images/riddles_pictures_opt/belka.webp' },
        { q:'Он хвостастый и зубастый,\nНа луну он воет часто,\nВсе в лесу его боятся,\nА в особенности, зайцы.', a:'волк', pic:'assets/images/riddles_pictures_opt/volk.webp' },
        { q:'В лесу живёт плутовка,\nХитры её глаза,\nА цветом, как морковка,\nПушистая...', a:'Лиса', pic:'assets/images/riddles_pictures_opt/lisa.webp' },
        { q:'Живет в берлоге он в лесу,\nПугает волка и лису,\nЛюбит ягоды и мед,\nКосолапо он идет.', a:'Медведь', pic:'assets/images/riddles_pictures_opt/medved.webp' },
        { q:'Он пятнистый, с длинной шеей,\nГде-то в Африке живет.\nИ с огромных он деревьев\nЛегко листья достает.', a:'Жираф', pic:'assets/images/riddles_pictures_opt/zhiraf.webp' },
        { q:'Траву жуёт. Носит матроску\nВ чёрно - белую полоску.', a:'Зебра', pic:'assets/images/riddles_pictures_opt/zebra.webp' },
        { q:'В цирке трюки выполняет,\nБрёвна хоботом таскает.\nСерый и громадный он,\nКто же это? Это ...', a:'Слон', pic:'assets/images/riddles_pictures_opt/slon.webp' },
        { q:'В зоопарке, в синей клетке\nЛовко прыгает по сетке,\nКорчит рожи, ест бананы.\nКто? Конечно', a:'Обезьяна', pic:'assets/images/riddles_pictures_opt/obezyana.webp' },
        { q:'Нет того, кто не боится\nЭтой грозной хищной птицы.\nКто куда бы не забрёл,\nСверху видит всё…', a:'Орёл', pic:'assets/images/riddles_pictures_opt/orel.webp' },
        { q:'Хвост веером, на голове корона, нет птицы краше чем ...', a:'Павлин', pic:'assets/images/riddles_pictures_opt/pavlin.webp' },
        { q:'Рано он всегда встаёт,\nПо утрам всегда поёт,\nНосит гребень и серёжки,\nВ перьях все его одёжки.', a:'Петух', pic:'assets/images/riddles_pictures_opt/petukh.webp' },
        { q:'Маленькая птичка\nЧирикает отлично,\nПрыгает по веткам,\nЖить не станет в клетке.\nНе таится от людей\nРазвесёлый...', a:'воробей', pic:'assets/images/riddles_pictures_opt/vorobey.webp' },
        { q:'Перья черные летят,\nВсюду каркают, кричат,\nЧто за важная персона?\nЭто черная...', a:'Ворона', pic:'assets/images/riddles_pictures_opt/vorona.webp' },
        { q:'Я по травке не спешу.\nЕсли станет страшно вдруг,\nСпрячусь в домик, милый друг.', a:'Улитка', pic:'assets/images/riddles_pictures_opt/ulitka.webp' },
        { q:'На пруду на живёт,\nГромко песенки поёт,\nПучеглазая зверюшка\nНазывается...', a:'Лягушка', pic:'assets/images/riddles_pictures_opt/lyagushka.webp' },
        { q:'В пустыне живёт,\nПодолгу не пьёт,\nС жарой легко справляется,\nКолючками питается.', a:'Верблюд', pic:'assets/images/riddles_pictures_opt/verblyud.webp' },
        { q:'Через море-океан\nПлывёт чудо-великан,\nПрячет ус во рту,\nРастянулся на версту.', a:'Кит', pic:'assets/images/riddles_pictures_opt/kit.webp' },
        { q:'Ем я уголь, пью я воду,\nКак напьюсь — прибавлю ходу.\nВезу обоз на сто колес\nИ называюсь...', a:'Паровоз', pic:'assets/images/riddles_pictures_opt/parovoz.webp' },
        { q:'Она идет и зиму прогоняет.\nКогда придет, вокруг всё расцветает.\nОт солнышка прекрасного ясна.\nЗовут ее, конечно же ...', a:'Весна', pic:'assets/images/riddles_pictures_opt/vesna.webp' },
        { q:'Если крылья распахнет —\nКрасотой с ума сведет.\nНа лугу она летает,\nВсех собою удивляет.', a:'Бабочка', pic:'assets/images/riddles_pictures_opt/babochka.webp' },
        { q:'Живёт в норке, грызёт корки, боится кошки.', a:'Мышь', pic:'assets/images/riddles_pictures_opt/mysh.webp' },
        { q:'Лечит маленьких детей,\nЛечит птичек и зверей,\nСквозь очки свои глядит\nДобрый доктор...', a:'Айболит', pic:'assets/images/riddles_pictures_opt/aybolit.webp' },
        { q:'Сначала пашут,\nПотом засевают,\nВремя придёт,\nУрожай собирают!', a:'Поле', pic:'assets/images/riddles_pictures_opt/pshenitsa.webp' },
    ],

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

    init() {
        App.navigate('riddles');
        this._level = 'easy';
        this._loadFromAdmin();
        this._renderTopBar();
        this.show();
        Achievements.init();
    },

    _loadFromAdmin() {
        const adm = this._loadAdmin();
        const src = adm.length ? adm : this.data.map((r, i) => ({
            id: i + 1, text: r.q, answer: r.a, pic: r.pic,
            level: i < 10 ? 'easy' : i < 20 ? 'medium' : 'hard'
        }));
        this._data = { easy: [], medium: [], hard: [] };
        src.forEach(r => {
            const lv = r.level || 'easy';
            if (this._data[lv]) this._data[lv].push({ q: r.text || r.q || '—', a: r.answer || r.a || '', pic: r.pic || '' });
        });
        // Если уровень пуст — берём easy
        if (!this._data.medium.length) this._data.medium = [...this._data.easy];
        if (!this._data.hard.length)   this._data.hard   = [...this._data.easy];
        this._rebuildQueues();
        const cnt = document.getElementById('riddle-counter');
        if (cnt) cnt.textContent = this._totalCount();
    },

    _current() {
        const list  = this._data[this._level];
        const queue = this._queue[this._level];
        const idx   = queue[this._qpos[this._level] % queue.length];
        return list[idx];
    },

    setLevel(lv) {
        if (this._hasUnsaved && !this._solved) { showToast('✋ Сначала нажми «Проверить ответ»'); return; }
        this._level = lv;
        const len = this._data[lv].length;
        this._queue[lv] = this._shuffle([...Array(len).keys()]);
        this._qpos[lv]  = 0;
        document.querySelectorAll('#riddle-level-dots .lvl-dot').forEach(d => d.classList.remove('active'));
        const active = document.querySelector(`#riddle-level-dots .lvl-dot.${lv}`);
        if (active) active.classList.add('active');
        this.show();
    },

    _renderTopBar() {
        const el = document.getElementById('riddle-level-dots'); if (el) el.remove();
        const topBar = document.getElementById('top-bar');
        const settingsBtn = document.getElementById('settings-icon-btn');
        if (!topBar || !settingsBtn) return;
        // Кружки уровней
        const dots = document.createElement('div');
        dots.id = 'riddle-level-dots';
        dots.innerHTML = `
            <span class="lvl-counter" id="riddle-counter">${this._totalCount()}</span>
            <button class="lvl-dot easy   ${this._level==='easy'   ?'active':''}" onclick="Riddles.setLevel('easy')"   title="Простой"></button>
            <button class="lvl-dot medium ${this._level==='medium' ?'active':''}" onclick="Riddles.setLevel('medium')" title="Средний"></button>
            <button class="lvl-dot hard   ${this._level==='hard'   ?'active':''}" onclick="Riddles.setLevel('hard')"   title="Сложный"></button>
        `;
        topBar.insertBefore(dots, settingsBtn);
    },

    _loadAdmin() {
        try { return JSON.parse(localStorage.getItem('admin_riddles')) || []; } catch { return []; }
    },

    show() {
        const item = this._current();
        document.getElementById('riddle-text').textContent = item.q;
        const inp = document.getElementById('riddle-input');
        const imgEl = document.getElementById('riddle-img');
        inp.value = '';
        inp.className = '';
        document.getElementById('riddle-msg').textContent = '';
        document.getElementById('riddle-msg').className = '';
        // Полностью сбрасываем блок с картинкой
        imgEl.innerHTML = '';
        imgEl.className = 'answer-img';
        imgEl.style.display = 'none';
        this._hasUnsaved = false;
        this._solved = false;
    },

    check() {
        const item = this._current();
        const val = document.getElementById('riddle-input').value.trim().toLowerCase();
        const msg = document.getElementById('riddle-msg');
        const inp = document.getElementById('riddle-input');
        if (!val) { msg.textContent = '✏️ Введи ответ!'; msg.className = 'warn'; return; }
        this._hasUnsaved = false;
        const result = AnswerChecker.check(val, item.a || item.answer || '');
        if (result === 'exact' || result === 'fuzzy') {
            inp.className = 'correct';
            const praise = getPersonalPraise();
            msg.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg> ${praise} Ответ: <b>${item.a || item.answer}</b>`;
            msg.className = 'ok';
            const imgEl2 = document.getElementById('riddle-img');
            imgEl2.innerHTML = '';
            imgEl2.style.display = 'none';
            if (item.pic) {
                const revImg = document.createElement('img');
                revImg.src = item.pic;
                revImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;border-radius:var(--radius);';
                revImg.onload = () => {
                    imgEl2.innerHTML = '';
                    imgEl2.appendChild(revImg);
                    imgEl2.className = 'answer-img riddle-pic-preview show';
                    imgEl2.style.display = '';
                };
                revImg.onerror = () => {
                    imgEl2.className = 'answer-img show';
                    imgEl2.style.display = '';
                };
                imgEl2.appendChild(revImg); // добавляем до onload на случай кеша
            }
            this._solved = true;
            starsBurst();
            playCorrectSound('riddles');
            Achievements.correct('riddles');
            CardBadges.markTried('riddles', item.a || item.answer);
            StatTracker.inc('riddles');
        } else {
            inp.className = 'wrong';
            msg.textContent = '❌ Не угадал, попробуй ещё!';
            msg.className = 'err';
            Achievements.wrong('riddles');
        }
    },

    next() {
        if (this._hasUnsaved && !this._solved) { showToast('✋ Сначала нажми «Проверить ответ»'); return; }
        const lv = this._level;
        this._qpos[lv]++;
        if (this._qpos[lv] >= this._queue[lv].length) {
            this._queue[lv] = this._shuffle([...Array(this._data[lv].length).keys()]);
            this._qpos[lv]  = 0;
            const order = ['easy','medium','hard'];
            const next = order[(order.indexOf(lv) + 1) % order.length];
            this._level = next;
            document.querySelectorAll('#riddle-level-dots .lvl-dot').forEach(d => d.classList.remove('active'));
            const act = document.querySelector(`#riddle-level-dots .lvl-dot.${next}`);
            if (act) act.classList.add('active');
            const names = {easy:'Простой', medium:'Средний', hard:'Сложный'};
            showToast('🎯 Уровень: ' + names[next]);
        }
        this.show();
    },

    share() {
        const item = this._current();
        const text = item.q;
        if (!text || text === '—') { showToast('⚠️ Нет текста загадки'); return; }
        const msg = `🤔 Отгадай загадку!\n\n${text}`;
        if (navigator.share) {
            navigator.share({ text: msg }).catch(() => {});
        } else {
            navigator.clipboard.writeText(msg).then(() => {
                showToast('📤 Загадка скопирована!');
            }).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = msg; ta.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(ta); ta.select();
                document.execCommand('copy'); document.body.removeChild(ta);
                showToast('📤 Загадка скопирована!');
            });
        }
    }
};

document.getElementById('riddle-input').addEventListener('input', e => {
    Riddles._hasUnsaved = !!e.target.value;
});
document.getElementById('riddle-input').addEventListener('keydown', e => { if (e.key === 'Enter') Riddles.check(); });
document.getElementById('puzzle-input').addEventListener('keydown', e => { if (e.key === 'Enter') Puzzles.check(); });
