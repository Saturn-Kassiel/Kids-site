// =============================================
// WORDS — Собери слово из букв
// =============================================
const Words = {
    _level: 'easy',
    _solved: false,
    _current: null,
    _sessionScore: 0,
    _streak: 0,
    _queue: [],
    _qpos: 0,
    _engine: null,
    _autoResetTimeout: null,

    _data: {
        easy: [
            { word:'КОТ',  emoji:'🐱' }, { word:'ДОМ',  emoji:'🏠' }, { word:'ШАР',  emoji:'🎈' },
            { word:'ЛУК',  emoji:'🧅' }, { word:'СОН',  emoji:'😴' }, { word:'МАК',  emoji:'🌺' },
            { word:'СОК',  emoji:'🧃' }, { word:'ЛЕС',  emoji:'🌲' }, { word:'НОС',  emoji:'👃' },
            { word:'МЯЧ',  emoji:'⚽' }, { word:'ЛЕВ',  emoji:'🦁' }, { word:'КИТ',  emoji:'🐳' },
            { word:'ЖУК',  emoji:'🪲' }, { word:'ДЫМ',  emoji:'💨' }, { word:'МЁД',  emoji:'🍯' },
            { word:'СЫР',  emoji:'🧀' }, { word:'ПЁС',  emoji:'🐕' }, { word:'РАК',  emoji:'🦞' },
            { word:'БЫК',  emoji:'🐃' }, { word:'ЁЖ',   emoji:'🦔' }, { word:'ЁРШ',  emoji:'🐠' },
            { word:'ГУСЬ', emoji:'🪿' }, { word:'ДУБ',  emoji:'🌳' }, { word:'ЛЁД',  emoji:'🧊' },
            { word:'РОТ',  emoji:'👄' }, { word:'ЗУБ',  emoji:'🦷' }, { word:'ЧАЙ',  emoji:'🍵' },
            { word:'ЛИС',  emoji:'🦊' }, { word:'НОЖ',  emoji:'🔪' }, { word:'САД',  emoji:'🌿' },
            { word:'ДОЧЬ', emoji:'👧' }, { word:'МУЖ',  emoji:'👨' }, { word:'МЕЛ',  emoji:'✏️' },
            { word:'МИР',  emoji:'🌍' }, { word:'ШУМ',  emoji:'🔊' }, { word:'ДАР',  emoji:'🎁' },
            { word:'ЖАР',  emoji:'🔥' }, { word:'СОМ',  emoji:'🐠' }, { word:'ЧАС',  emoji:'⏰' },
            { word:'ЗАЛ',  emoji:'🏛️' }, { word:'ШАГ',  emoji:'👣' }, { word:'МОХ',  emoji:'🌿' },
            { word:'ЛЮК',  emoji:'🚪' }, { word:'ОСА',  emoji:'🐝' }, { word:'ЕЛЬ',  emoji:'🌲' },
            { word:'СЫН',  emoji:'👦' }, { word:'БОР',  emoji:'🌲' }, { word:'КУБ',  emoji:'🧊' },
            { word:'ДУШ',  emoji:'🚿' }, { word:'ЧИЖ',  emoji:'🐦' }, { word:'БАЛ',  emoji:'💃' },
            { word:'ТОК',  emoji:'⚡' }, { word:'ЮЛА',  emoji:'🎡' }, { word:'БОК',  emoji:'👋' },
            { word:'ТАЗ',  emoji:'🫧' }, { word:'ВАЗ',  emoji:'🏺' }, { word:'РОГ',  emoji:'🦌' },
            { word:'ЛУГ',  emoji:'🌾' }, { word:'МЕЧ',  emoji:'⚔️' }, { word:'КЛЮЧ', emoji:'🔑' },
            { word:'ПАС',  emoji:'⚽' }, { word:'ЛАЙ',  emoji:'🐶' }, { word:'МАЙ',  emoji:'🌸' },
            { word:'КОЛ',  emoji:'🔧' }, { word:'ЛОБ',  emoji:'🧠' }, { word:'ДУГ',  emoji:'🌈' },
            { word:'ВОЛ',  emoji:'🐂' }, { word:'ГАЗ',  emoji:'💨' }, { word:'КОМ',  emoji:'⚽' },
            { word:'ВАЛ',  emoji:'🌊' }, { word:'ЛАК',  emoji:'💅' }, { word:'ВЕС',  emoji:'⚖️' },
            { word:'КАН',  emoji:'🪣' }, { word:'ЛОВ',  emoji:'🎣' }, { word:'ПАР',  emoji:'♨️' },
            { word:'НИТ',  emoji:'🧵' }, { word:'ТОН',  emoji:'🎵' }, { word:'ЧАН',  emoji:'🪣' },
            { word:'РАЙ',  emoji:'☁️' }, { word:'МОЛ',  emoji:'🌊' }, { word:'ТОЛ',  emoji:'💥' },
            { word:'ГАЛ',  emoji:'🐦' }, { word:'ДОЛ',  emoji:'🏞️' }, { word:'МАЛ',  emoji:'👶' },
            { word:'ЛАЗ',  emoji:'🕳️' }, { word:'КАЧ',  emoji:'🎠' }, { word:'КВАС', emoji:'🍺' },
            { word:'ПИЛ',  emoji:'🪚' }, { word:'ВИЛ',  emoji:'🍴' }, { word:'КОС',  emoji:'🌾' },
            { word:'ВОС',  emoji:'🕯️' }, { word:'ГОД',  emoji:'📅' }, { word:'БОРЩ', emoji:'🥣' },
            { word:'ВОР',  emoji:'🦝' }, { word:'ЗОВ',  emoji:'📣' }, { word:'ВЕК',  emoji:'⏳' },
            { word:'ЛУЧ',  emoji:'☀️' }, { word:'КАЛ',  emoji:'📅' }, { word:'МИГ',  emoji:'⚡' },
            { word:'ЧУМ',  emoji:'🏕️' },
        ],
        medium: [
            { word:'РЫБА', emoji:'🐟' }, { word:'ЛУНА', emoji:'🌙' }, { word:'ЗИМА', emoji:'❄️' },
            { word:'ЛИСА', emoji:'🦊' }, { word:'РОЗА', emoji:'🌹' }, { word:'КАША', emoji:'🥣' },
            { word:'УТКА', emoji:'🦆' }, { word:'ТОРТ', emoji:'🎂' }, { word:'ГРИБ', emoji:'🍄' },
            { word:'МОСТ', emoji:'🌉' }, { word:'ЛИСТ', emoji:'🍃' }, { word:'ПАУК', emoji:'🕷️' },
            { word:'ВОЛК', emoji:'🐺' }, { word:'СЛОН', emoji:'🐘' }, { word:'КОНЬ', emoji:'🐴' },
            { word:'КРАБ', emoji:'🦀' }, { word:'ТИГР', emoji:'🐯' }, { word:'КОЗА', emoji:'🐐' },
            { word:'СОВА', emoji:'🦉' }, { word:'ПЧЕЛА', emoji:'🐝' }, { word:'ХЛЕБ', emoji:'🍞' },
            { word:'ЛОДКА', emoji:'⛵' }, { word:'КУКЛА', emoji:'🪆' }, { word:'ДОЖДЬ', emoji:'🌧️' },
            { word:'СНЕГ', emoji:'❄️' }, { word:'ГРОЗА', emoji:'⛈️' }, { word:'ПОЕЗД', emoji:'🚂' },
            { word:'МЕДВЕДЬ', emoji:'🐻' }, { word:'ЗАЯЦ', emoji:'🐰' }, { word:'ЛЯГУШКА', emoji:'🐸' },
            { word:'ЦВЕТОК', emoji:'🌸' }, { word:'ЯГОДА', emoji:'🍓' }, { word:'ГРУША', emoji:'🍐' },
            { word:'СЛИВА', emoji:'🫐' }, { word:'РЕПА', emoji:'🫚' }, { word:'МОРКОВЬ', emoji:'🥕' },
            { word:'КАПУСТА', emoji:'🥬' }, { word:'ТЫКВА', emoji:'🎃' }, { word:'ОГУРЕЦ', emoji:'🥒' },
            { word:'ПОМИДОР', emoji:'🍅' }, { word:'КАРТОШКА', emoji:'🥔' }, { word:'СВЁКЛА', emoji:'🫀' },
            { word:'ЧАШКА', emoji:'☕' }, { word:'ЛОЖКА', emoji:'🥄' }, { word:'ВИЛКА', emoji:'🍴' },
            { word:'ТАРЕЛКА', emoji:'🍽️' }, { word:'КАСТРЮЛЯ', emoji:'🫕' }, { word:'СТАКАН', emoji:'🥛' },
            { word:'КРОВАТЬ', emoji:'🛏️' }, { word:'СТОЛ', emoji:'🪑' }, { word:'СТУЛ', emoji:'🪑' },
            { word:'ШКАФ', emoji:'🗄️' }, { word:'ДВЕРЬ', emoji:'🚪' }, { word:'ОКНО', emoji:'🪟' },
            { word:'ЛАМПА', emoji:'💡' }, { word:'КОВЁР', emoji:'🧶' }, { word:'ЗОНТ', emoji:'☂️' },
            { word:'СУМКА', emoji:'👜' }, { word:'КУРТКА', emoji:'🧥' }, { word:'ШАПКА', emoji:'🧢' },
            { word:'ШАРФ', emoji:'🧣' }, { word:'ПЕРЧАТКИ', emoji:'🧤' }, { word:'ТУФЛИ', emoji:'👟' },
            { word:'НОСКИ', emoji:'🧦' }, { word:'ПЛАТЬЕ', emoji:'👗' }, { word:'РУБАШКА', emoji:'👕' },
            { word:'БЕРЕГ', emoji:'🏖️' }, { word:'РЕКА', emoji:'🏞️' }, { word:'ГОРА', emoji:'⛰️' },
            { word:'ПОЛЕ', emoji:'🌾' }, { word:'КАМЕНЬ', emoji:'🪨' }, { word:'ПЕСОК', emoji:'🏜️' },
            { word:'ТРАВА', emoji:'🌿' }, { word:'ВЕТКА', emoji:'🌿' }, { word:'КОРЕНЬ', emoji:'🌱' },
            { word:'НЕБО', emoji:'🌤️' }, { word:'ЗВЕЗДА', emoji:'⭐' }, { word:'ВЕТЕР', emoji:'💨' },
            { word:'СОЛНЦЕ', emoji:'☀️' }, { word:'ТУЧА', emoji:'☁️' }, { word:'РАДУГА', emoji:'🌈' },
            { word:'УТРО', emoji:'🌅' }, { word:'ВЕЧЕР', emoji:'🌆' }, { word:'НОЧЬ', emoji:'🌙' },
            { word:'ВЕСНА', emoji:'🌸' }, { word:'ЛЕТО', emoji:'☀️' }, { word:'ОСЕНЬ', emoji:'🍂' },
            { word:'КИНО', emoji:'🎬' }, { word:'ЦИРК', emoji:'🎪' }, { word:'ПАРК', emoji:'🌳' },
            { word:'КОШКА', emoji:'🐈' }, { word:'СОБАКА', emoji:'🐕' }, { word:'ПОПУГАЙ', emoji:'🦜' },
            { word:'ЗЕБРА',   emoji:'🦓' }, { word:'ОБЕЗЬЯНА', emoji:'🐒' },
            { word:'ФЛАМИНГО', emoji:'🦩' }, { word:'ПАВЛИН',  emoji:'🦚' },
            { word:'ВЕРБЛЮД', emoji:'🐪' }, { word:'НОСОРОГ',  emoji:'🦏' },
            { word:'БЕГЕМОТ', emoji:'🦛' },
        ],
        hard: [
            { word:'КНИГА', emoji:'📖' }, { word:'ШКОЛА', emoji:'🏫' }, { word:'МЫШКА', emoji:'🐭' },
            { word:'ОБЛАКО', emoji:'☁️' }, { word:'ДЕРЕВО', emoji:'🌳' }, { word:'РАКЕТА', emoji:'🚀' },
            { word:'ЯБЛОКО', emoji:'🍎' }, { word:'БАБОЧКА', emoji:'🦋' }, { word:'КОРАБЛЬ', emoji:'🚢' },
            { word:'ЧЕРЕПАХА', emoji:'🐢' }, { word:'КРОКОДИЛ', emoji:'🐊' }, { word:'ПИНГВИН', emoji:'🐧' },
            { word:'ЖИРАФ', emoji:'🦒' }, { word:'АПЕЛЬСИН', emoji:'🍊' }, { word:'КЛУБНИКА', emoji:'🍓' },
            { word:'ВИНОГРАД', emoji:'🍇' }, { word:'ПИРОЖНОЕ', emoji:'🍰' }, { word:'МОРОЖЕНОЕ', emoji:'🍦' },
            { word:'ШОКОЛАД', emoji:'🍫' }, { word:'ВЕЛОСИПЕД', emoji:'🚲' }, { word:'АВТОБУС', emoji:'🚌' },
            { word:'ВЕРТОЛЁТ', emoji:'🚁' }, { word:'КАРАНДАШ', emoji:'✏️' }, { word:'ПОРТФЕЛЬ', emoji:'🎒' },
            { word:'ТЕТРАДЬ', emoji:'📓' }, { word:'УЧИТЕЛЬ', emoji:'👨‍🏫' }, { word:'УЧЕНИК', emoji:'👦' },
            { word:'БОЛЬНИЦА', emoji:'🏥' }, { word:'АПТЕКА', emoji:'💊' }, { word:'МАГАЗИН', emoji:'🏪' },
            { word:'БИБЛИОТЕКА', emoji:'📚' }, { word:'СТАДИОН', emoji:'🏟️' }, { word:'ТЕАТР', emoji:'🎭' },
            { word:'МУЗЕЙ', emoji:'🏛️' }, { word:'ПЛОЩАДЬ', emoji:'🌆' }, { word:'ФОНТАН', emoji:'⛲' },
            { word:'САМОКАТ', emoji:'🛴' }, { word:'САМОЛЁТ', emoji:'✈️' }, { word:'ТРАКТОР', emoji:'🚜' },
            { word:'ТРАМВАЙ', emoji:'🚃' }, { word:'ТРОЛЛЕЙБУС', emoji:'🚎' }, { word:'ЭКСКАВАТОР', emoji:'🚧' },
            { word:'ПОЖАРНАЯ', emoji:'🚒' }, { word:'СКОРАЯ', emoji:'🚑' }, { word:'ПОЛИЦИЯ', emoji:'🚓' },
            { word:'РЮКЗАК', emoji:'🎒' }, { word:'ЧЕМОДАН', emoji:'🧳' }, { word:'КОШЕЛЁК', emoji:'👛' },
            { word:'ЗЕРКАЛО', emoji:'🪞' }, { word:'ПОДУШКА', emoji:'🛌' }, { word:'ОДЕЯЛО', emoji:'🛏️' },
            { word:'ПОЛОТЕНЦЕ', emoji:'🧸' }, { word:'РАСЧЁСКА', emoji:'💇' }, { word:'ЗУБНАЯ', emoji:'🪥' },
            { word:'ПИАНИНО', emoji:'🎹' }, { word:'ГИТАРА', emoji:'🎸' }, { word:'БАРАБАН', emoji:'🥁' },
            { word:'СКРИПКА', emoji:'🎻' }, { word:'ФЛЕЙТА', emoji:'🎵' }, { word:'ТРУБА', emoji:'🎺' },
            { word:'ХУДОЖНИК', emoji:'🎨' }, { word:'ПЕВИЦА', emoji:'🎤' }, { word:'ТАНЦОР', emoji:'💃' },
            { word:'ДОКТОР', emoji:'👨‍⚕️' }, { word:'ПОВАР', emoji:'👨‍🍳' }, { word:'ЛЁТЧИК', emoji:'👨‍✈️' },
            { word:'СТРОИТЕЛЬ', emoji:'👷' }, { word:'ПОЖАРНЫЙ', emoji:'🧑‍🚒' }, { word:'ПОЛИЦЕЙСКИЙ', emoji:'👮' },
            { word:'ФУТБОЛИСТ', emoji:'⚽' }, { word:'ПЛОВЕЦ', emoji:'🏊' }, { word:'ГИМНАСТ', emoji:'🤸' },
            { word:'ПЛАНЕТА', emoji:'🪐' }, { word:'КОМЕТА', emoji:'☄️' }, { word:'ГАЛАКТИКА', emoji:'🌌' },
            { word:'ТЕЛЕСКОП', emoji:'🔭' }, { word:'АСТРОНАВТ', emoji:'👨‍🚀' }, { word:'ЛУНОХОД', emoji:'🌕' },
            { word:'ДИНОЗАВР', emoji:'🦕' }, { word:'МАМОНТ', emoji:'🦣' }, { word:'ДРАКОН', emoji:'🐉' },
            { word:'ЕДИНОРОГ', emoji:'🦄' }, { word:'РУСАЛКА', emoji:'🧜' }, { word:'ВОЛШЕБНИК', emoji:'🧙' },
            { word:'ПРИНЦЕССА', emoji:'👸' }, { word:'РЫЦАРЬ', emoji:'⚔️' }, { word:'ЗАМОК', emoji:'🏰' },
            { word:'СОКРОВИЩЕ', emoji:'💎' }, { word:'ПРИКЛЮЧЕНИЕ', emoji:'🗺️' }, { word:'ПУТЕШЕСТВИЕ', emoji:'✈️' },
            { word:'ФОТОГРАФ', emoji:'📷' }, { word:'ПРОГРАММИСТ', emoji:'💻' }, { word:'ИЗОБРЕТАТЕЛЬ', emoji:'💡' },
            { word:'ОТВЕТСТВЕННОСТЬ', emoji:'🎯' }, { word:'ВООБРАЖЕНИЕ', emoji:'💭' },
            { word:'ЭЛЕКТРИЧЕСТВО', emoji:'⚡' }, { word:'ТЕМПЕРАТУРА', emoji:'🌡️' },
            { word:'ЭКОНОМИКА', emoji:'💰' }, { word:'МАТЕМАТИКА', emoji:'📐' },
            { word:'ЛИТЕРАТУРА', emoji:'📚' },
        ],
    },

    _alphabet: 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ',

    init() {
        AudioMgr.stop();
        this._sessionScore = 0;
        this._streak = 0;
        this._sessionHints = 0;
        this._rebuildQueue();
        App.navigate('words', 'Слова');
        this._updateScore();
        this._renderLevelBtns();
        const hb = document.getElementById('words-hint-btn');
        if (hb) hb.style.display = isHintEnabled('words') ? '' : 'none';
        if (!this._engine) {
            this._engine = new TileEngine({
                slotsId:   'words-slots',
                tilesId:   'words-tiles',
                msgId:     'words-msg',
                nextBtnId: 'words-next-btn',
                streakId:  'words-streak',
                onComplete: (assembled) => this._checkWord(assembled),
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

    setLevel(lv) {
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

        const word    = this._current.word;
        const letters = word.split('');
        const decoyCount = this._level === 'easy' ? 0 : this._level === 'medium' ? 2 : 4;
        const decoys  = this._getDecoyLetters(word, decoyCount);
        const allTiles = this._shuffle([...letters, ...decoys]);

        document.getElementById('words-emoji').textContent = this._current.emoji;

        // Анимации: сброс на время инициализации
        const slotsEl = document.getElementById('words-slots');
        const tilesEl = document.getElementById('words-tiles');
        slotsEl.classList.add('no-anim');
        tilesEl.classList.add('no-anim');

        this._engine.setup(letters, allTiles);

        requestAnimationFrame(() => {
            slotsEl.classList.remove('no-anim');
            tilesEl.classList.remove('no-anim');
        });
    },

    _checkWord(assembled) {
        const correct = this._current.word;
        const msgEl   = document.getElementById('words-msg');

        if (assembled === correct) {
            this._solved = true;
            this._sessionScore++;
            this._updateScore();
            StatTracker.inc('words');

            playCorrectSound('words');
            this._engine.markCorrect();

            msgEl.textContent = getPersonalPraise();
            msgEl.className   = 'words-msg words-msg-ok';

            if (window.confetti) confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });

            const _interW = Interstitials.bump('words');
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
            msgEl.className   = 'words-msg words-msg-err';
            this._engine.markWrong();
        }
    },

    hint() {
        if (this._solved) return;
        if (!isHintEnabled('words')) { showToast('💡 Подсказки отключены в настройках'); return; }
        this._sessionHints++;
        this._updateHintBtn();
        StatTracker.incHints('words');
        const result = this._engine.hint();
        if (result) showToast('💡 Подсказка: ' + result);
        else showToast('🤔 Попробуй убрать неправильные буквы');
    },

    next() {
        this._qpos++;
        if (this._qpos >= this._queue.length) this._rebuildQueue();
        this.show();
    },

    _updateScore() {
        const el = document.getElementById('words-score');
        if (el) el.textContent = this._sessionScore;
    },


    _updateHintBtn() {
        const btn = document.getElementById('words-hint-btn');
        if (!btn) return;
        const svg = btn.querySelector('svg');
        const svgHtml = svg ? svg.outerHTML : '💡';
        btn.innerHTML = svgHtml + (this._sessionHints > 0
            ? ` Подсказка <span style="opacity:0.7">($${this._sessionHints})</span>`
            : ' Подсказка');
    },

        _playTick() {
        if (!getSoundSetting('snd-words-correct')) return;
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
