// =============================================
// ADMIN
// =============================================
const Admin = {
    _tab: 'songs',
    _editId: null,

    init() {
        // Seed defaults with full data
        const defaults = {
            songs: [
                { id:1,  name:'Колыбельная',             duration:'', src:'assets/audio/songs/kolybelnaya.mp3',            tags:['sleep'],   video:'assets/video/songs_video/kolibelnaya.mp4' },
                { id:2,  name:'Песенка для мамы',         duration:'', src:'assets/audio/songs/pesenka_dlya_mamy.mp3',      tags:['family'] },
                { id:3,  name:'Песенка про слона',        duration:'', src:'assets/audio/songs/pesenka_pro_clona.mp3',      tags:['animals'], video:'assets/video/songs_video/pesenka_pro_slona.mp4' },
                { id:4,  name:'Песенка про Деда Мороза',  duration:'', src:'assets/audio/songs/pesenka_pro_deda_moroza.mp3',tags:['holiday'] },
                { id:5,  name:'Песенка про февраль',      duration:'', src:'assets/audio/songs/pesenka_pro_fevral.mp3',     tags:['months'] },
                { id:6,  name:'Песенка про льва',         duration:'', src:'assets/audio/songs/pesenka_pro_lva.mp3',        tags:['animals'], video:'assets/video/songs_video/pesenka_pro_lva.mp4' },
                { id:7,  name:'Песенка про неделю',       duration:'', src:'assets/audio/songs/pesenka_pro_nedelyu.mp3',    tags:['learning'] },
                { id:8,  name:'Песенка про носорога',     duration:'', src:'assets/audio/songs/pesenka_pro_nosoroga.mp3',   tags:['animals'], video:'assets/video/songs_video/pesenka_pro_nosoroga.mp4' },
                { id:9,  name:'Песенка про папу',         duration:'', src:'assets/audio/songs/pesenka_pro_papu.mp3',       tags:['family'] },
                { id:10, name:'Песенка про умывание',     duration:'', src:'assets/audio/songs/pesenka_pro_umyvanie.mp3',   tags:['learning'] },
                { id:11, name:'Песенка про январь',       duration:'', src:'assets/audio/songs/pesenka_pro_yanvar.mp3',     tags:['months'] },
                { id:12, name:'Песенка про зебру',        duration:'', src:'assets/audio/songs/pesenka_pro_zebru.mp3',      tags:['animals'], video:'assets/video/songs_video/pesenka_pro_zebru.mp4' },
                { id:13, name:'В лесу родилась ёлочка',   duration:'', src:'assets/audio/songs/v_lesu_rodilas_yolochka.mp3',tags:['holiday'] },
                { id:14, name:'Песенка про Рождество',    duration:'', src:'assets/audio/songs/rodgestvo.mp3',              tags:['holiday'] },
                { id:15, name:'Песенка про Весну',        duration:'', src:'assets/audio/songs/vesna.mp3',                  tags:['months'] },
                { id:16, name:'Песенка про Енота',        duration:'', src:'assets/audio/songs/енот.mp3',                   tags:['animals'] },
                { id:17, name:'Песенка про Ленивца',      duration:'', src:'assets/audio/songs/lenivetc.mp3',               tags:['animals'] },
                { id:18, name:'Песенка про Март',         duration:'', src:'assets/audio/songs/mart.mp3',                   tags:['months'] },
                { id:19, name:'Песенка про Шакала',       duration:'', src:'assets/audio/songs/shakal.mp3',                 tags:['animals'] },
                { id:20, name:'Песенка про Волка',        duration:'', src:'assets/audio/songs/volk.mp3',                   tags:['animals'] },
            ],
            podcasts: [
                { id:1, name:'Благодарность',    desc:'', duration:'', src:'assets/audio/podcasts/blagodarnost.mp3' },
                { id:2, name:'Доверие ребёнка',  desc:'', duration:'', src:'assets/audio/podcasts/doverie_rebyonka.mp3' },
                { id:3, name:'Мозг дошкольника', desc:'', duration:'', src:'assets/audio/podcasts/mozg_doshkolnika.mp3' },
                { id:4, name:'Поколение Альфа',  desc:'', duration:'', src:'assets/audio/podcasts/pokolenie_alfa.mp3' },
                { id:5, name:'Слушать сердцем',  desc:'', duration:'', src:'assets/audio/podcasts/slushat_serdtsem.mp3' },
                { id:6, name:'Сравнение',         desc:'', duration:'', src:'assets/audio/podcasts/sravnenie.mp3' },
            ],
            puzzles: [
                { id:1,  name:'Рыба',      pic:'assets/images/rebuses_pictures_opt/ryba.webp',     hint:'Присмотрись к картинке', answer:'рыба',     level:'easy' },
                { id:2,  name:'Ложка',     pic:'assets/images/rebuses_pictures_opt/lozhka.webp',   hint:'Присмотрись к картинке', answer:'ложка',    level:'easy' },
                { id:3,  name:'Вилка',     pic:'assets/images/rebuses_pictures_opt/vilka.webp',    hint:'Присмотрись к картинке', answer:'вилка',    level:'easy' },
                { id:4,  name:'Море',      pic:'assets/images/rebuses_pictures_opt/more.webp',     hint:'Присмотрись к картинке', answer:'море',     level:'easy' },
                { id:5,  name:'Радуга',    pic:'assets/images/rebuses_pictures_opt/raduga.webp',   hint:'Присмотрись к картинке', answer:'радуга',   level:'easy' },
                { id:6,  name:'Слон',      pic:'assets/images/rebuses_pictures_opt/slon.webp',     hint:'Присмотрись к картинке', answer:'слон',     level:'easy' },
                { id:7,  name:'Бабочка',   pic:'assets/images/rebuses_pictures_opt/babochka.webp', hint:'Присмотрись к картинке', answer:'бабочка',  level:'medium' },
                { id:8,  name:'Коньки',    pic:'assets/images/rebuses_pictures_opt/konki.webp',    hint:'Присмотрись к картинке', answer:'коньки',   level:'medium' },
                { id:9,  name:'Трактор',   pic:'assets/images/rebuses_pictures_opt/traktor.webp',  hint:'Присмотрись к картинке', answer:'трактор',  level:'medium' },
                { id:10, name:'Туча',      pic:'assets/images/rebuses_pictures_opt/tucha.webp',    hint:'Присмотрись к картинке', answer:'туча',     level:'medium' },
                { id:11, name:'Туман',     pic:'assets/images/rebuses_pictures_opt/tuman.webp',    hint:'Присмотрись к картинке', answer:'туман',    level:'medium' },
                { id:12, name:'Зелень',    pic:'assets/images/rebuses_pictures_opt/zelen.webp',    hint:'Присмотрись к картинке', answer:'зелень',   level:'medium' },
                { id:13, name:'Креветка',  pic:'assets/images/rebuses_pictures_opt/krevetka.webp', hint:'Присмотрись к картинке', answer:'креветка', level:'hard' },
                { id:14, name:'Забор',     pic:'assets/images/rebuses_pictures_opt/zabor.webp',    hint:'Присмотрись к картинке', answer:'забор',    level:'hard' },
                { id:15, name:'Токарь',    pic:'assets/images/rebuses_pictures_opt/tokar.webp',    hint:'Присмотрись к картинке', answer:'токарь',   level:'hard' },
            ],
            info: [
                { id:1, name:'🌟 О приложении', body:'Говоруша — детское образовательное приложение для изучения букв, цифр, цветов и развития речи через игру и песенки.' },
                { id:2, name:'📚 Разделы', body:'Алфавит — учим буквы с видео и аудио. Цифры — считаем от 0 до 9. Цвета — изучаем цвета. Песенки — любимые детские треки. Ребусы и Загадки — развиваем мышление. Гимнастика — пальчиковые и артик. упражнения.' },
                { id:3, name:'💡 Советы', body:'Занимайтесь каждый день по 15–20 минут. Хвалите ребёнка за каждый правильный ответ!' },
                { id:4, name:'🔗 Пример ссылки', body:'Наш сайт: [Говоруша](https://govorusha.ru)\nНаписать нам: [Telegram](https://t.me/govorusha)' },
            ],
            riddles: [
                { id:1, text:'Белым снегом всё одето, значит наступает ...', answer:'Зима', pic:'assets/images/riddles_pictures_opt/zima.webp' , level:'easy' },
                { id:2, text:'Охраняет часто дом, повиляет всем хвостом, зарычит, коль ты чужой, и оближет, если свой.', answer:'Собака', pic:'assets/images/riddles_pictures_opt/sobaka.webp' , level:'easy' },
                { id:3, text:'По реке плывёт бревно, ох и злющее оно,  тем, кто в речку угодил, нос откусит ...', answer:'Крокодил', pic:'assets/images/riddles_pictures_opt/krokodil.webp' , level:'easy' },
                { id:7, text:'Мимо улья проходил косолапый ...', answer:'Медведь', pic:'assets/images/riddles_pictures_opt/medved.webp' , level:'easy' },
                { id:8, text:'Ночью каждое оконце слабо освещает ...', answer:'Луна', pic:'assets/images/riddles_pictures_opt/luna.webp' , level:'easy' },
                { id:9, text:'Овощ это непростой,\nВызовет слезу порой,\nНо уж больно он полезный\nЗащищает от болезней!', answer:'Лук', pic:'assets/images/riddles_pictures_opt/luk.webp' , level:'easy' },
                { id:10, text:'Кто мычит там на лугу,\nСочную жует траву,\nУгощает молоком\nИ полезным творожком.', answer:'Корова', pic:'assets/images/riddles_pictures_opt/korova.webp' , level:'easy' },
                { id:11, text:'С ветки прыгает на ветку\nРыжая красавица.\nШишки, желуди, орехи\nЗапасает на зиму.', answer:'белка', pic:'assets/images/riddles_pictures_opt/belka.webp' , level:'easy' },
                { id:12, text:'Он хвостастый и зубастый,\nНа луну он воет часто,\nВсе в лесу его боятся,\nА в особенности, зайцы.', answer:'волк', pic:'assets/images/riddles_pictures_opt/volk.webp' , level:'easy' },
                { id:13, text:'В лесу живёт плутовка,\nХитры её глаза,\nА цветом, как морковка,\nПушистая...', answer:'Лиса', pic:'assets/images/riddles_pictures_opt/lisa.webp' , level:'easy' },
                { id:14, text:'Живет в берлоге он в лесу,\nПугает волка и лису,\nЛюбит ягоды и мед,\nКосолапо он идет.', answer:'Медведь', pic:'assets/images/riddles_pictures_opt/medved.webp' , level:'medium' },
                { id:16, text:'Он пятнистый, с длинной шеей,\nГде-то в Африке живет.\nИ с огромных он деревьев\nЛегко листья достает.', answer:'Жираф', pic:'assets/images/riddles_pictures_opt/zhiraf.webp' , level:'medium' },
                { id:17, text:'Траву жуёт. Носит матроску\nВ чёрно - белую полоску.', answer:'Зебра', pic:'assets/images/riddles_pictures_opt/zebra.webp' , level:'medium' },
                { id:18, text:'В цирке трюки выполняет,\nБрёвна хоботом таскает.\nСерый и громадный он,\nКто же это? Это ...', answer:'Слон', pic:'assets/images/riddles_pictures_opt/slon.webp' , level:'medium' },
                { id:19, text:'В зоопарке, в синей клетке\nЛовко прыгает по сетке,\nКорчит рожи, ест бананы.\nКто? Конечно', answer:'Обезьяна', pic:'assets/images/riddles_pictures_opt/obezyana.webp' , level:'medium' },
                { id:20, text:'Нет того, кто не боится\nЭтой грозной хищной птицы.\nКто куда бы не забрёл,\nСверху видит всё…', answer:'Орёл', pic:'assets/images/riddles_pictures_opt/orel.webp' , level:'medium' },
                { id:21, text:'Хвост веером, на голове корона, нет птицы краше чем ...', answer:'Павлин', pic:'assets/images/riddles_pictures_opt/pavlin.webp' , level:'medium' },
                { id:22, text:'Рано он всегда встаёт,\nПо утрам всегда поёт,\nНосит гребень и серёжки,\nВ перьях все его одёжки.', answer:'Петух', pic:'assets/images/riddles_pictures_opt/petukh.webp' , level:'medium' },
                { id:23, text:'Маленькая птичка\nЧирикает отлично,\nПрыгает по веткам,\nЖить не станет в клетке.\nНе таится от людей\nРазвесёлый...', answer:'воробей', pic:'assets/images/riddles_pictures_opt/vorobey.webp' , level:'medium' },
                { id:24, text:'Перья черные летят,\nВсюду каркают, кричат,\nЧто за важная персона?\nЭто черная...', answer:'Ворона', pic:'assets/images/riddles_pictures_opt/vorona.webp' , level:'medium' },
                { id:25, text:'Я по травке не спешу.\nЕсли станет страшно вдруг,\nСпрячусь в домик, милый друг.', answer:'Улитка', pic:'assets/images/riddles_pictures_opt/ulitka.webp' , level:'hard' },
                { id:26, text:'На пруду на живёт,\nГромко песенки поёт,\nПучеглазая зверюшка\nНазывается...', answer:'Лягушка', pic:'assets/images/riddles_pictures_opt/lyagushka.webp' , level:'hard' },
                { id:27, text:'В пустыне живёт,\nПодолгу не пьёт,\nС жарой легко справляется,\nКолючками питается.', answer:'Верблюд', pic:'assets/images/riddles_pictures_opt/verblyud.webp' , level:'hard' },
                { id:29, text:'Через море-океан\nПлывёт чудо-великан,\nПрячет ус во рту,\nРастянулся на версту.', answer:'Кит', pic:'assets/images/riddles_pictures_opt/kit.webp' , level:'hard' },
                { id:30, text:'Ем я уголь, пью я воду,\nКак напьюсь — прибавлю ходу.\nВезу обоз на сто колес\nИ называюсь...', answer:'Паровоз', pic:'assets/images/riddles_pictures_opt/parovoz.webp' , level:'hard' },
                { id:31, text:'Она идет и зиму прогоняет.\nКогда придет, вокруг всё расцветает.\nОт солнышка прекрасного ясна.\nЗовут ее, конечно же ...', answer:'Весна', pic:'assets/images/riddles_pictures_opt/vesna.webp' , level:'hard' },
                { id:32, text:'Если крылья распахнет —\nКрасотой с ума сведет.\nНа лугу она летает,\nВсех собою удивляет.', answer:'Бабочка', pic:'assets/images/riddles_pictures_opt/babochka.webp' , level:'hard' },
                { id:34, text:'Живёт в норке, грызёт корки, боится кошки.', answer:'Мышь', pic:'assets/images/riddles_pictures_opt/mysh.webp' , level:'hard' },
                { id:36, text:'Лечит маленьких детей,\nЛечит птичек и зверей,\nСквозь очки свои глядит\nДобрый доктор...', answer:'Айболит', pic:'assets/images/riddles_pictures_opt/aybolit.webp' , level:'hard' },
                { id:37, text:'Сначала пашут,\nПотом засевают,\nВремя придёт,\nУрожай собирают!', answer:'Поле', pic:'assets/images/riddles_pictures_opt/pshenitsa.webp' , level:'hard' },
            ],
        };
        // Always refresh — force re-seed for all sections
        ['songs','podcasts','puzzles','riddles'].forEach(k => {
            const stored = localStorage.getItem('admin_' + k);
            let needsReseed = !stored;
            if (!needsReseed) {
                try {
                    const parsed = JSON.parse(stored);
                    // Reseed if empty, or podcasts is old placeholder, or riddles use old emoji format
                    if (parsed.length === 0) needsReseed = true;
                    if (k === 'podcasts' && parsed.length < 3) needsReseed = true;
                    if (k === 'riddles' && parsed[0] && (parsed[0].emoji !== undefined || parsed[0].text === '—')) needsReseed = true;
                    if (k === 'info' && parsed[0] && (!parsed[0].body || parsed.length < 4)) needsReseed = true;
                    // Убираем старые ребусы без pic или с неверными файлами
                    if (k === 'puzzles' && parsed.some(p => !p.pic || p.pic.includes('5+2'))) needsReseed = true;
                    // Убираем если есть ребусы с пустым answer (битые)
                    if (k === 'puzzles' && parsed.some(p => !p.answer)) needsReseed = true;
                    if (k === 'puzzles' && parsed[0] && parsed[0].img && !parsed[0].pic) needsReseed = true;
                } catch { needsReseed = true; }
            }
            if (needsReseed) {
                localStorage.setItem('admin_' + k, JSON.stringify(defaults[k]));
            }
        });
        this.render();
        // Восстанавливаем токен из localStorage
        setTimeout(() => this._loadToken(), 30);
    },

    _getData(k) { try { return JSON.parse(localStorage.getItem('admin_' + k)) || []; } catch { return []; } },
    _setData(k, v) { localStorage.setItem('admin_' + k, JSON.stringify(v)); },

    setTab(tab, el) {
        this._tab = tab;
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        if (el) el.classList.add('active');
        this.render();
    },

    render() {
        const isNotif = this._tab === 'notif';
        // Toggle add/batch buttons visibility
        const addBtn = document.querySelector('.admin-add-btn');
        const batchBtn = document.getElementById('admin-batch-btn');
        if (addBtn) addBtn.style.display = isNotif ? 'none' : '';
        if (batchBtn && !isNotif) batchBtn.classList.toggle('hidden', this._tab !== 'puzzles');

        if (isNotif) {
            this._renderNotifTab();
            return;
        }

        const items = this._getData(this._tab);
        const list = document.getElementById('admin-list');
        list.innerHTML = '';
        if (!items.length) {
            list.innerHTML = '<div style="text-align:center;color:var(--text2);padding:30px;font-weight:700;">Список пуст</div>';
            return;
        }
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'admin-item';
            const sub = this._tab === 'songs'    ? (item.duration || '') :
                        this._tab === 'podcasts' ? ((item.desc ? item.desc.slice(0,40) + (item.desc.length>40?'…':'') : '') || item.duration || '') :
                        this._tab === 'riddles'  ? (item.level === 'medium' ? '🟡 ' : item.level === 'hard' ? '🔴 ' : '🟢 ') + 'Ответ: ' + item.answer :
                        this._tab === 'info'     ? (item.body ? item.body.slice(0,50) + (item.body.length>50?'…':'') : '') :
                        `${item.level || ''} | Ответ: ${item.answer || ''}`;
            div.innerHTML = `
                <div class="admin-item-info">
                    <div class="admin-item-title">${item.name || item.text || item.title || '—'}</div>
                    <div class="admin-item-sub">${sub}</div>
                </div>
                <button class="admin-edit" data-id="${item.id}"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="admin-del"  data-id="${item.id}"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
            `;
            list.appendChild(div);
        });

        list.querySelectorAll('.admin-del').forEach(btn => btn.addEventListener('click', () => {
            const item = this._getData(this._tab).find(i => i.id === parseInt(btn.dataset.id));
            const name = item ? (item.name || item.text || 'элемент') : 'элемент';
            showConfirm(`Удалить «${name}»?`, () => {
                this._setData(this._tab, this._getData(this._tab).filter(i => i.id !== parseInt(btn.dataset.id)));
                this.render();
                showToast('🗑️ Удалено');
                this._autoSync();
            });
        }));
        list.querySelectorAll('.admin-edit').forEach(btn => btn.addEventListener('click', () => {
            const item = this._getData(this._tab).find(i => i.id === parseInt(btn.dataset.id));
            if (item) this.openModal(item);
        }));
    },

    // Stores current src/pic while editing
    _editSrc: '',
    _editPic: '',

    _renderNotifTab() {
        const list = document.getElementById('admin-list');
        const notifs = this._getData('notif').sort((a, b) => b.id - a.id);

        let html = `
            <div class="notif-compose">
                <div style="font-weight:600;font-size:15px;margin-bottom:8px;font-family:var(--font-display);">Новое сообщение</div>
                <input type="text" id="notif-compose-title" placeholder="Заголовок" style="width:100%;padding:10px 14px;background:var(--card2);border:1.5px solid var(--border);border-radius:12px;font-size:14px;color:var(--text);outline:none;margin-bottom:6px;">
                <textarea id="notif-compose-body" rows="3" placeholder="Текст сообщения..." style="width:100%;padding:10px 14px;background:var(--card2);border:1.5px solid var(--border);border-radius:12px;font-size:14px;color:var(--text);outline:none;resize:none;line-height:1.5;margin-bottom:8px;"></textarea>
                <button class="admin-add-btn" style="width:100%" onclick="Admin._sendNotif()">
                    <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
                    Отправить
                </button>
            </div>`;

        if (notifs.length) {
            html += '<div style="margin-top:14px;font-size:12px;color:var(--text2);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:0 4px;">История</div>';
            notifs.forEach(n => {
                const date = n.date ? Notif._fmtDate(n.date) : '';
                const typeTag = n.auto ? '<span style="font-size:11px;color:#10b981;font-weight:500;">авто</span>' : '<span style="font-size:11px;color:#60a5fa;font-weight:500;">вручную</span>';
                html += `<div class="admin-item" style="margin-top:6px;">
                    <div class="admin-item-info">
                        <div class="admin-item-title">${n.title || '—'} ${typeTag}</div>
                        <div class="admin-item-sub">${n.body || ''} · ${date}</div>
                    </div>
                    <button class="admin-del" data-id="${n.id}"><svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
                </div>`;
            });
        }

        list.innerHTML = html;

        list.querySelectorAll('.admin-del').forEach(btn => btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            showConfirm('Удалить уведомление?', () => {
                this._setData('notif', this._getData('notif').filter(n => n.id !== id));
                this._renderNotifTab();
                showToast('🗑️ Удалено');
            });
        }));
    },

    _sendNotif() {
        const title = document.getElementById('notif-compose-title')?.value.trim();
        const body = document.getElementById('notif-compose-body')?.value.trim();
        if (!title && !body) { showToast('✏️ Введите заголовок или текст'); return; }
        const notifs = this._getData('notif');
        notifs.push({
            id: Date.now(),
            type: 'message',
            title: title || 'Сообщение',
            body: body || '',
            date: new Date().toISOString(),
            auto: false
        });
        this._setData('notif', notifs);
        this._renderNotifTab();
        Notif.updateBadge();
        showToast('✅ Уведомление добавлено');
    },

    _onFileChange(input) {
        const file = input.files[0];
        if (!file) return;
        document.getElementById('m-file-name').textContent = file.name;
        // Показываем превью картинки сразу
        const isQA = this._tab === 'riddles' || this._tab === 'puzzles';
        if (isQA && file.type.startsWith('image/')) {
            const preview = document.getElementById('m-pic-preview');
            if (preview) {
                const url = URL.createObjectURL(file);
                preview.src = url;
                preview.style.display = 'block';
                preview.onload = () => URL.revokeObjectURL(url);
            }
        }
    },

    openModal(item) {
        this._editId  = item ? item.id  : null;
        this._editSrc = item ? (item.src || '') : '';
        this._editPic = item ? (item.pic || '') : '';

        document.getElementById('modal-title').textContent = item ? 'Редактировать' : 'Добавить';
        // Управляем полями в зависимости от вкладки
        const nameInput = document.getElementById('m-name-input');
        const nameArea  = document.getElementById('m-name-area');
        const descArea  = document.getElementById('m-desc');
        const isRiddle  = this._tab === 'riddles';
        const isPodcast = this._tab === 'podcasts';
        const isPuzzle  = this._tab === 'puzzles';
        const isInfo    = this._tab === 'info';
        // Показываем нужное поле для названия
        nameInput.style.display = (isRiddle || isPuzzle) ? 'none' : 'block';
        nameArea.style.display  = isRiddle ? 'block' : 'none';
        nameArea.placeholder    = 'Текст загадки...';
        descArea.style.display  = isPodcast ? 'block' : 'none';
        const bodyArea = document.getElementById('m-body');
        if (bodyArea) {
            bodyArea.style.display = isInfo ? 'block' : 'none';
            if (isInfo) bodyArea.value = item ? (item.body || '') : '';
        }
        const bodyHint = document.getElementById('m-body-hint');
        if (bodyHint) bodyHint.style.display = isInfo ? 'block' : 'none';
        // Заполняем значения
        const nameVal = item ? (item.name || item.text || '') : '';
        nameInput.value = nameVal;
        nameArea.value  = nameVal;
        if (descArea) descArea.value = item ? (item.desc || '') : '';
        document.getElementById('m-answer').value = item ? (item.answer || '') : '';
        document.getElementById('m-hint').value   = item ? (item.hint  || item.img || '') : '';
        document.getElementById('m-level').value  = item ? (item.level || '') : '';

        // Tag selector for songs
        const tagSel = document.getElementById('m-tag');
        if (tagSel) {
            tagSel.style.display = this._tab === 'songs' ? 'block' : 'none';
            tagSel.value = item && item.tags && item.tags.length ? item.tags[0] : '';
        }

        // Video/photo field for songs
        const videoWrap = document.getElementById('m-video-wrap');
        const videoInput = document.getElementById('m-video');
        if (videoWrap) videoWrap.style.display = this._tab === 'songs' ? 'block' : 'none';
        if (videoInput) videoInput.value = item ? (item.video || '') : '';

        // Reset file input
        const fileInput = document.getElementById('m-file');
        if (fileInput) fileInput.value = '';

        const isAudio = this._tab === 'songs' || this._tab === 'podcasts';
        const isQA    = this._tab === 'riddles' || this._tab === 'puzzles';

        // Show current file name
        const currentPath = isAudio ? this._editSrc : this._editPic;
        const currentFileName = currentPath ? currentPath.split('/').pop() : '';
        const curFileEl = document.getElementById('m-current-file');
        if (curFileEl) {
            if (currentFileName) {
                curFileEl.innerHTML = '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Текущий файл: ' + currentFileName;
                curFileEl.classList.add('visible');
            } else {
                curFileEl.textContent = '';
                curFileEl.classList.remove('visible');
            }
        }
        document.getElementById('m-file-name').textContent = 'Файл не выбран';

        // Show image preview for riddles/puzzles
        const preview = document.getElementById('m-pic-preview');
        if (preview) {
            if (this._editPic && isQA) {
                preview.src = this._editPic;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
                preview.src = '';
            }
        }

        // Для ребусов название = ответу, скрываем дублирующее поле
        // m-name-input/area уже управляются выше
        document.getElementById('m-answer').style.display = isQA  ? 'block' : 'none';
        // Подсказка только для ребусов
        document.getElementById('m-hint').style.display   = this._tab === 'puzzles' ? 'block' : 'none';
        // Уровень — для ребусов И загадок
        document.getElementById('m-level').style.display  = isQA ? 'block' : 'none';
        if (this._tab === 'riddles') {
            const lvSel = document.getElementById('m-level');
            if (lvSel) {
                lvSel.querySelector('option[value=""]').textContent = 'Уровень сложности';
                lvSel.querySelector('option[value="easy"]').textContent   = '● Простой';
                lvSel.querySelector('option[value="medium"]').textContent = '● Средний';
                lvSel.querySelector('option[value="hard"]').textContent   = '● Сложный';
            }
        }
        // Для info — скрываем файл/ответ/картинку
        const fileLabel = document.querySelector('.file-label');
        if (fileLabel) fileLabel.style.display = isInfo ? 'none' : '';
        const fileNameEl = document.getElementById('m-file-name');
        if (fileNameEl) fileNameEl.style.display = isInfo ? 'none' : '';

        document.getElementById('modal').classList.remove('hidden');
    },

    closeModal(e) {
        if (!e || e.target === document.getElementById('modal')) {
            document.getElementById('modal').classList.add('hidden');
            this._editSrc = '';
            this._editPic = '';
            const preview = document.getElementById('m-pic-preview');
            if (preview) { preview.style.display = 'none'; preview.src = ''; }
            const curFileEl = document.getElementById('m-current-file');
            if (curFileEl) { curFileEl.textContent = ''; curFileEl.classList.remove('visible'); }
            const ni = document.getElementById('m-name-input'); if (ni) ni.value = '';
            const na = document.getElementById('m-name-area');  if (na) na.value = '';
            const nd = document.getElementById('m-desc');       if (nd) nd.value = '';
            const nb = document.getElementById('m-body');       if (nb) nb.value = '';
            const nt = document.getElementById('m-tag');        if (nt) nt.value = '';
            const nv = document.getElementById('m-video');      if (nv) nv.value = '';
        }
    },

    async save() {
        // Читаем из правильного поля (input или textarea)
        const nameInput = document.getElementById('m-name-input');
        const nameArea  = document.getElementById('m-name-area');
        const isRiddle  = this._tab === 'riddles';
        const isPodcast = this._tab === 'podcasts';
        const name = (isRiddle ? nameArea : nameInput).value.trim();
        if (!name) { showToast('⚠️ Введите название'); return; }

        const items = this._getData(this._tab);
        const id = this._editId || Date.now();
        const existing = this._editId ? items.find(i => i.id === this._editId) : null;

        // ── Сохраняем картинку локально как base64 (загрузка на GitHub — при публикации) ──
        const isQA = this._tab === 'riddles' || this._tab === 'puzzles';
        const isAudio = this._tab === 'songs' || this._tab === 'podcasts';

        // Обработка файлов для аудио (песенки/подкасты)
        if (isAudio) {
            const fileInput = document.getElementById('m-file');
            const file = fileInput?.files[0];
            if (file) {
                const folder = this._tab === 'songs'
                    ? 'assets/audio/songs'
                    : 'assets/audio/podcasts';
                const ext  = file.name.split('.').pop().toLowerCase();
                const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-zа-яё0-9_-]/gi, '_');
                const fileName = base + '.' + ext;
                const filePath = folder + '/' + fileName;
                // Читаем как base64
                const base64 = await new Promise((res, rej) => {
                    const fr = new FileReader();
                    fr.onload  = () => res(fr.result);
                    fr.onerror = rej;
                    fr.readAsDataURL(file);
                });
                // Сохраняем base64 в очередь на загрузку
                const pending = JSON.parse(localStorage.getItem('admin_pending_audio') || '{}');
                pending[filePath] = base64;
                localStorage.setItem('admin_pending_audio', JSON.stringify(pending));
                this._editSrc = filePath;
            }
        }

        if (isQA) {
            const fileInput = document.getElementById('m-file');
            const file = fileInput?.files[0];
            if (file) {
                const folder = this._tab === 'riddles'
                    ? 'assets/images/riddles_pictures_opt'
                    : 'assets/images/rebuses_pictures_opt';
                const ext  = file.name.split('.').pop().toLowerCase();
                const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-zа-яё0-9_-]/gi, '_');
                const fileName = base + '.' + ext;
                const filePath = folder + '/' + fileName;
                // Читаем как base64
                const base64 = await new Promise((res, rej) => {
                    const fr = new FileReader();
                    fr.onload  = () => res(fr.result); // data:image/...;base64,...
                    fr.onerror = rej;
                    fr.readAsDataURL(file);
                });
                // Сохраняем base64 в очередь на загрузку
                const pending = JSON.parse(localStorage.getItem('admin_pending_pics') || '{}');
                pending[filePath] = base64;
                localStorage.setItem('admin_pending_pics', JSON.stringify(pending));
                this._editPic = filePath; // путь уже финальный
            }
        }

        let newItem;
        if (this._tab === 'songs' || this._tab === 'podcasts') {
            const descVal = document.getElementById('m-desc')?.value.trim() || '';
            newItem = {
                id, name,
                desc:     isPodcast ? descVal : '',
                duration: existing ? (existing.duration || '') : '',
                src:      this._editSrc || (existing ? (existing.src || '') : ''),
                tags:     this._tab === 'songs' ? (function() {
                    const v = document.getElementById('m-tag')?.value;
                    return v ? [v] : (existing && existing.tags ? existing.tags : []);
                })() : undefined,
                video:    this._tab === 'songs' ? (document.getElementById('m-video')?.value.trim() || '') : undefined
            };
        } else if (this._tab === 'riddles') {
            newItem = {
                id,
                text:   name,
                answer: document.getElementById('m-answer').value.trim(),
                pic:    this._editPic || (existing ? (existing.pic || '') : ''),
                level:  document.getElementById('m-level').value || 'easy',
            };
        } else if (this._tab === 'info') {
            const bodyVal = (document.getElementById('m-body')?.value || '').trim();
            if (!bodyVal) { showToast('⚠️ Введите текст блока'); return; }
            newItem = { id, name, body: bodyVal };
        } else {
            // puzzles — name = answer
            const puzzleAnswer = document.getElementById('m-answer').value.trim();
            newItem = {
                id,
                name:   puzzleAnswer,
                pic:    this._editPic || (existing ? (existing.pic || '') : ''),
                hint:   document.getElementById('m-hint').value.trim(),
                answer: puzzleAnswer,
                level:  document.getElementById('m-level').value || 'easy',
            };
        }

        if (this._editId) {
            const idx = items.findIndex(i => i.id === this._editId);
            if (idx !== -1) items[idx] = newItem;
        } else {
            items.push(newItem);
        }

        this._setData(this._tab, items);
        this.closeModal();
        this.render();
        if (this._tab === 'songs') {
            Songs._allSongs = this._getData('songs').map(s => ({...s}));
            Songs._allSongs.forEach(s => {
                if (!s.tags || !s.tags.length) s.tags = Songs._getTagsForSong(s);
            });
        }
        if (this._tab === 'podcasts') Podcasts._allPodcasts = this._getData('podcasts').map(p => ({...p}));
        if (this._tab === 'puzzles') {
            const saved = this._getData('puzzles');
            if (saved.length) {
                Puzzles._data = { easy: [], medium: [], hard: [] };
                saved.forEach(p => {
                    const lv = p.level || 'easy';
                    if (Puzzles._data[lv]) Puzzles._data[lv].push({ pic: p.pic||'', hint: p.hint||'', answer: p.answer||'' });
                });
            }
        }
        if (this._tab === 'riddles') Riddles._loadFromAdmin();
        if (this._tab === 'info') Info.render();
        this._updatePendingBadge();
        showToast(this._editId ? '✅ Изменения сохранены' : '✅ Добавлено');

        // Авто-синхронизация data.json
        this._autoSync();
    },

    // ── Собрать актуальный data.json из localStorage ──
    _buildDataJson() {
        return {
            songs:    this._getData('songs'),
            podcasts: this._getData('podcasts'),
            puzzles:  this._getData('puzzles'),
            riddles:  this._getData('riddles'),
            info:     this._getData('info'),
            notifications: this._getData('notif').filter(n => !n.auto),
            exportedAt: new Date().toISOString()
        };
    },

    // ── Авто-синхронизация: GitHub (если токен) или скачивание ──
    async _autoSync() {
        const data = this._buildDataJson();
        const jsonStr = JSON.stringify(data, null, 2);
        const token = localStorage.getItem('gh_token');

        if (token) {
            // Пуш на GitHub
            const REPO   = 'Saturn-Kassiel/Kids-site';
            const FILE   = 'data.json';
            const BRANCH = 'main';
            const headers = {
                'Authorization': `token ${token}`,
                'Content-Type':  'application/json',
                'Accept':        'application/vnd.github.v3+json'
            };
            try {
                const content = btoa(unescape(encodeURIComponent(jsonStr)));
                const apiUrl = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
                let sha = null;
                try {
                    const gr = await fetch(apiUrl + `?ref=${BRANCH}`, { headers });
                    if (gr.ok) { const gj = await gr.json(); sha = gj.sha; }
                } catch (_) {}
                const body = {
                    message: `📱 Авто: ${new Date().toLocaleString('ru')}`,
                    content, branch: BRANCH, ...(sha ? { sha } : {})
                };
                const resp = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });
                if (resp.ok) {
                    showToast('☁️ data.json → GitHub');
                    localStorage.setItem('gh_data_updated', 'true');
                } else {
                    // GitHub не доступен — скачиваем как fallback
                    this._downloadDataJson(jsonStr);
                }
            } catch (e) {
                console.warn('Auto-push failed:', e);
                this._downloadDataJson(jsonStr);
            }
        } else {
            // Нет токена — скачиваем файл
            this._downloadDataJson(jsonStr);
        }
    },

    _downloadDataJson(jsonStr) {
        try {
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'data.json';
            a.click();
            URL.revokeObjectURL(url);
            showToast('💾 data.json скачан');
        } catch (e) { console.warn('Download failed:', e); }
    },


    // ── Обновить счётчик pending картинок на кнопке публикации ──
    _updatePendingBadge() {
        const pendingPics = JSON.parse(localStorage.getItem('admin_pending_pics') || '{}');
        const pendingAudio = JSON.parse(localStorage.getItem('admin_pending_audio') || '{}');
        const count = Object.keys(pendingPics).length + Object.keys(pendingAudio).length;
        const btn = document.getElementById('publish-btn');
        if (!btn) return;
        btn.innerHTML = count > 0
            ? `<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Опубликовать (${count})`
            : '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Опубликовать на GitHub';
    },

    // ── GitHub Token helpers ──
    saveToken(val) {
        if (val) localStorage.setItem('gh_token', val.trim());
        else localStorage.removeItem('gh_token');
    },

    toggleTokenEye(btn) {
        const inp = document.getElementById('github-token-input');
        if (!inp) return;
        const isHidden = inp.type === 'password';
        inp.type = isHidden ? 'text' : 'password';
        btn.innerHTML = isHidden ? '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>' : '<svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" ><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    },

    // Вызывается при открытии Админки — восстанавливает токен из localStorage
    _loadToken() {
        const saved = localStorage.getItem('gh_token');
        const inp = document.getElementById('github-token-input');
        if (inp && saved) inp.value = saved;
    },

    // ── Публикация в GitHub ──
    async publish() {
        const REPO  = 'Saturn-Kassiel/Kids-site';   // ← ваш репозиторий
        const FILE  = 'data.json';                   // ← файл в корне репо
        const BRANCH = 'main';                       // ← ветка

        const token = (document.getElementById('github-token-input')?.value || '').trim()
                   || localStorage.getItem('gh_token') || '';

        if (!token) {
            showToast('⚠️ Введите GitHub Token');
            document.getElementById('github-token-input')?.focus();
            return;
        }

        const headers = {
            'Authorization': `token ${token}`,
            'Content-Type':  'application/json',
            'Accept':        'application/vnd.github.v3+json'
        };

        // ── Сначала загружаем все pending картинки ──
        const pending = JSON.parse(localStorage.getItem('admin_pending_pics') || '{}');
        const pendingPaths = Object.keys(pending);
        if (pendingPaths.length > 0) {
            const btn2 = document.getElementById('publish-btn');
            if (btn2) btn2.textContent = `⏳ Картинки: 0/${pendingPaths.length}...`;
            let uploaded = 0;
            for (const filePath of pendingPaths) {
                const dataUrl = pending[filePath];
                const base64  = dataUrl.split(',')[1]; // убираем data:...;base64,
                const apiUrl  = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
                // Проверяем SHA если файл уже есть
                let sha = null;
                try {
                    const gr = await fetch(apiUrl + `?ref=${BRANCH}`, { headers });
                    if (gr.ok) { const gj = await gr.json(); sha = gj.sha; }
                } catch (_) {}
                const pb = { message: `🖼️ ${filePath.split('/').pop()}`, content: base64, branch: BRANCH, ...(sha ? { sha } : {}) };
                const pr = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(pb) });
                if (pr.ok) {
                    uploaded++;
                    delete pending[filePath];
                    localStorage.setItem('admin_pending_pics', JSON.stringify(pending));
                    if (btn2) btn2.textContent = `⏳ Картинки: ${uploaded}/${pendingPaths.length}...`;
                } else {
                    const pe = await pr.json();
                    showToast('❌ Ошибка картинки: ' + (pe.message || pr.status));
                }
            }
        }

        // ── Загружаем pending аудио файлы ──
        const pendingAudio = JSON.parse(localStorage.getItem('admin_pending_audio') || '{}');
        const audioPaths = Object.keys(pendingAudio);
        if (audioPaths.length > 0) {
            const btn2 = document.getElementById('publish-btn');
            if (btn2) btn2.textContent = `⏳ Аудио: 0/${audioPaths.length}...`;
            let uploaded = 0;
            for (const filePath of audioPaths) {
                const dataUrl = pendingAudio[filePath];
                const base64  = dataUrl.split(',')[1];
                const apiUrl  = `https://api.github.com/repos/${REPO}/contents/${filePath}`;
                let sha = null;
                try {
                    const gr = await fetch(apiUrl + `?ref=${BRANCH}`, { headers });
                    if (gr.ok) { const gj = await gr.json(); sha = gj.sha; }
                } catch (_) {}
                const pb = { message: `🎵 ${filePath.split('/').pop()}`, content: base64, branch: BRANCH, ...(sha ? { sha } : {}) };
                const pr = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(pb) });
                if (pr.ok) {
                    uploaded++;
                    delete pendingAudio[filePath];
                    localStorage.setItem('admin_pending_audio', JSON.stringify(pendingAudio));
                    if (btn2) btn2.textContent = `⏳ Аудио: ${uploaded}/${audioPaths.length}...`;
                } else {
                    const pe = await pr.json();
                    showToast('❌ Ошибка аудио: ' + (pe.message || pr.status));
                }
            }
        }

        // Собираем все данные Админки
        const data = {
            songs:    this._getData('songs'),
            podcasts: this._getData('podcasts'),
            puzzles:  this._getData('puzzles'),
            riddles:  this._getData('riddles'),
            info:     this._getData('info'),
            notifications: this._getData('notif').filter(n => !n.auto),
            exportedAt: new Date().toISOString()
        };
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

        const btn = document.getElementById('publish-btn');
        const origText = btn ? btn.innerHTML : '';
        if (btn) { btn.innerHTML = '⏳ Публикация...'; btn.disabled = true; }

        try {
            const apiUrl = `https://api.github.com/repos/${REPO}/contents/${FILE}`;

            // Получаем текущий SHA файла (нужен для обновления)
            let sha = null;
            try {
                const getResp = await fetch(apiUrl + `?ref=${BRANCH}`, { headers });
                if (getResp.ok) {
                    const existing = await getResp.json();
                    sha = existing.sha;
                }
            } catch (_) { /* файл ещё не существует */ }

            // Загружаем файл
            const body = {
                message: `📱 Обновление данных приложения ${new Date().toLocaleString('ru')}`,
                content,
                branch: BRANCH,
                ...(sha ? { sha } : {})
            };

            const putResp = await fetch(apiUrl, {
                method:  'PUT',
                headers,
                body: JSON.stringify(body)
            });

            if (putResp.ok) {
                const result = await putResp.json();
                localStorage.setItem('gh_token', token); // сохраняем токен
                localStorage.removeItem('admin_pending_pics');
                localStorage.removeItem('admin_pending_audio');
                const stillPending = Object.keys(JSON.parse(localStorage.getItem('admin_pending_pics') || '{}')).length;
                showToast('✅ Данные опубликованы на GitHub!');
                console.log('Published:', result.content?.html_url);
                // Флаг: при следующем открытии сайта загрузить свежие данные
                localStorage.setItem('gh_data_updated', 'true');
            } else {
                const err = await putResp.json();
                const msg = err.message || 'Ошибка';
                if (putResp.status === 401) showToast('❌ Токен недействителен');
                else if (putResp.status === 404) showToast('❌ Репозиторий не найден');
                else if (putResp.status === 403) showToast('❌ Нет прав на запись');
                else showToast('❌ Ошибка: ' + msg);
            }
        } catch (e) {
            showToast('❌ Нет соединения с GitHub');
            console.error('Publish error:', e);
        } finally {
            if (btn) { btn.innerHTML = origText; btn.disabled = false; }
        }
    },

    // ── Отчёт о посетителях — вызывает /report-now на воркере → отчёт приходит в Telegram ──
    requestReport() {
        const savedSecret = localStorage.getItem('report_secret') || '';
        const WORKER_URL  = TgReminder.WORKER_URL;

        document.getElementById('rep-overlay')?.remove();

        const html = `
        <div class="rep-overlay" id="rep-overlay" onclick="if(event.target===this)this.remove()">
          <div class="rep-modal">
            <div class="rep-header">
              <div class="rep-title">📊 Отчёт о посетителях</div>
              <div class="rep-subtitle">Отчёт придёт в Telegram-бот</div>
              <button class="rep-close" onclick="document.getElementById('rep-overlay').remove()">✕</button>
            </div>
            <div class="rep-section-title">Секретный ключ (REPORT_SECRET)</div>
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;">
              <input id="rep-secret-inp" type="password"
                value="${savedSecret}"
                placeholder="Введите секрет из Cloudflare..."
                style="flex:1;padding:10px 14px;background:var(--card2);border:1.5px solid var(--border);
                       border-radius:12px;font-size:14px;color:var(--text);outline:none;">
              <button onclick="
                const i=document.getElementById('rep-secret-inp');
                i.type=i.type==='password'?'text':'password'
              " style="background:var(--card2);border:1.5px solid var(--border);border-radius:10px;
                       padding:8px 12px;font-size:14px;cursor:pointer;color:var(--text2);">👁</button>
            </div>
            <button id="rep-send-btn" onclick="Admin._sendReport()" style="
              width:100%;padding:14px;border:none;border-radius:14px;
              background:var(--accent);color:#fff;font-size:15px;font-weight:700;
              cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
              📨 Отправить отчёт в Telegram
            </button>
            <div id="rep-status" style="margin-top:12px;text-align:center;font-size:14px;min-height:20px;color:var(--text2);"></div>
          </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
    },

    async _sendReport() {
        const inp    = document.getElementById('rep-secret-inp');
        const btn    = document.getElementById('rep-send-btn');
        const status = document.getElementById('rep-status');
        const secret = (inp?.value || '').trim();
        if (!secret) { status.textContent = '⚠️ Введите секретный ключ'; status.style.color = '#f97316'; return; }

        // Сохраняем секрет для удобства
        localStorage.setItem('report_secret', secret);

        // user_id — берём из Telegram если доступен, иначе используем заглушку
        const userId = TgReminder._userId() || localStorage.getItem('report_admin_uid') || 'admin';

        btn.textContent = '⏳ Отправляю...';
        btn.disabled = true;
        status.textContent = '';
        status.style.color = 'var(--text2)';

        try {
            const resp = await fetch(TgReminder.WORKER_URL + '/report-now', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ user_id: userId, secret }),
            });
            const data = await resp.json();
            if (resp.ok && data.ok) {
                status.textContent = '✅ Отчёт отправлен! Проверьте Telegram.';
                status.style.color = '#22c55e';
                btn.textContent = '📨 Отправить отчёт в Telegram';
                btn.disabled = false;
                setTimeout(() => document.getElementById('rep-overlay')?.remove(), 2500);
            } else {
                const msg = data.error || ('HTTP ' + resp.status);
                if (resp.status === 403) {
                    status.textContent = '❌ Неверный секретный ключ';
                } else if (resp.status === 500 && msg.includes('CHAT_ID')) {
                    status.textContent = '❌ CHAT_ID не настроен в Cloudflare';
                } else {
                    status.textContent = '❌ Ошибка: ' + msg;
                }
                status.style.color = '#ef4444';
                btn.textContent = '📨 Отправить отчёт в Telegram';
                btn.disabled = false;
            }
        } catch (e) {
            status.textContent = '❌ Нет соединения с воркером';
            status.style.color = '#ef4444';
            btn.textContent = '📨 Отправить отчёт в Telegram';
            btn.disabled = false;
        }
    }
};
