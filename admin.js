// =============================================
// ADMIN
// =============================================
const Admin = {
    _tab: 'songs',
    _editId: null,

    init() {
        // Данные поступают из data.json через App._loadRemoteData(), которая
        // отрабатывает до открытия админки и пишет в localStorage('admin_*').
        // Дублировать их здесь в виде defaults не нужно — это единственный
        // источник правды. Здесь только миграция старых форматов данных.
        const _needsMigration = (k, parsed) => {
            if (!parsed || parsed.length === 0) return true;
            if (k === 'podcasts'  && parsed.length < 3) return true;
            if (k === 'riddles'   && parsed[0] && (parsed[0].emoji !== undefined || parsed[0].text === '—')) return true;
            if (k === 'info'      && parsed[0] && (!parsed[0].body || parsed.length < 4)) return true;
            if (k === 'puzzles'   && parsed.some(p => !p.pic || p.pic.includes('5+2'))) return true;
            if (k === 'puzzles'   && parsed.some(p => !p.answer)) return true;
            if (k === 'puzzles'   && parsed[0] && parsed[0].img && !parsed[0].pic) return true;
            return false;
        };
        let staleSections = [];
        ['songs','podcasts','puzzles','riddles','info'].forEach(k => {
            const stored = localStorage.getItem('admin_' + k);
            let parsed = null;
            try { parsed = stored ? JSON.parse(stored) : null; } catch { /* ignore */ }
            if (_needsMigration(k, parsed)) {
                // Устаревший/битый формат — сбрасываем; свежие данные придут
                // при следующем _loadRemoteData() (вызывается ниже).
                localStorage.removeItem('admin_' + k);
                staleSections.push(k);
            }
        });
        if (staleSections.length > 0) {
            // Перезагружаем данные из сети и только потом рендерим
            console.log('[Admin] Устаревшие секции, перезагружаем:', staleSections);
            App._loadRemoteData().then(() => this.render());
        } else {
            this.render();
        }
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
        if (addBtn) addBtn.style.display = isNotif ? 'none' : '';

        if (isNotif) {
            this._renderNotifTab();
            return;
        }

        const items = this._getData(this._tab);
        const list = document.getElementById('admin-list');
        list.innerHTML = '';

        // Кнопка «Загрузить пачкой» в footer — только для ребусов и загадок
        const batchBtn = document.getElementById('admin-batch-btn');
        if (batchBtn) batchBtn.classList.toggle('hidden', this._tab !== 'puzzles' && this._tab !== 'riddles');

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

    // ── Пакетная загрузка ──────────────────────────────────────────────────────
    _batchItems: [],

    openBatch() {
        const modal = document.getElementById('batch-modal');
        if (!modal) return;
        // Настраиваем модал под текущую вкладку
        const isRiddles = this._tab === 'riddles';
        document.getElementById('batch-modal-title').textContent =
            isRiddles ? 'Загадки пачкой' : 'Пакетная загрузка картинок';
        document.getElementById('batch-pics-section').style.display = isRiddles ? 'none' : '';
        document.getElementById('batch-text-section').style.display = isRiddles ? '' : 'none';
        document.getElementById('batch-preview-list').innerHTML = '';
        document.getElementById('batch-summary').style.display = 'none';
        const filesEl = document.getElementById('batch-files');
        if (filesEl) filesEl.value = '';
        this._batchItems = [];
        modal.classList.remove('hidden');
    },

    closeBatch(e) {
        if (e && e.target !== document.getElementById('batch-modal')) return;
        document.getElementById('batch-modal').classList.add('hidden');
        this._batchItems = [];
    },

    _onBatchFiles(input) {
        const files = Array.from(input.files);
        if (!files.length) return;
        const preview = document.getElementById('batch-preview-list');
        preview.innerHTML = '';
        this._batchItems = [];

        const data = this._getData(this._tab);
        const maxId = data.reduce((m, i) => Math.max(m, i.id || 0), 0);

        files.forEach((file, idx) => {
            const rawName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
            const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
            const id = maxId + idx + 1;
            const pending_key = 'puzzle_' + id;

            this._batchItems.push({ id, name, answer: name, file, pending_key, level: 'easy' });

            const url = URL.createObjectURL(file);
            const div = document.createElement('div');
            div.className = 'batch-item';
            div.dataset.idx = idx;
            div.innerHTML = `
                <img src="${url}" class="batch-thumb">
                <div class="batch-item-fields">
                    <input type="text" class="batch-name" value="${name}" placeholder="Название / ответ">
                    <select class="batch-lvl">
                        <option value="easy">Простой</option>
                        <option value="medium">Средний</option>
                        <option value="hard">Сложный</option>
                    </select>
                </div>`;
            preview.appendChild(div);
        });

        const summary = document.getElementById('batch-summary');
        summary.textContent = `Найдено: ${files.length} картинок`;
        summary.style.display = '';
    },

    _parseBatchText(raw) {
        // Поддерживаем два формата:
        // 1. JSON: [{"text":"...","answer":"...","level":"easy"}, ...]
        // 2. Построчный: Текст загадки|Ответ|easy (уровень опционален)
        raw = raw.trim();
        if (raw.startsWith('[')) {
            try { return JSON.parse(raw); } catch(e) { showToast('❌ Ошибка JSON: ' + e.message); return []; }
        }
        return raw.split('\n').filter(l => l.trim()).map(line => {
            const parts = line.split('|');
            return { text: (parts[0]||'').trim(), answer: (parts[1]||'').trim(), level: (parts[2]||'easy').trim() };
        }).filter(r => r.text && r.answer);
    },

    saveBatch() {
        const level = document.getElementById('batch-level')?.value || 'easy';
        const isRiddles = this._tab === 'riddles';

        if (isRiddles) {
            // Сохраняем загадки из текста
            const raw = document.getElementById('batch-riddle-text')?.value || '';
            const parsed = this._parseBatchText(raw);
            if (!parsed.length) { showToast('❌ Нет данных для сохранения'); return; }

            const data = this._getData('riddles');
            const maxId = data.reduce((m, i) => Math.max(m, i.id || 0), 0);
            parsed.forEach((r, idx) => {
                data.push({ id: maxId + idx + 1, text: r.text, answer: r.answer, level: r.level || level, pic: '' });
            });
            this._setData('riddles', data);
            showToast(`✅ Добавлено ${parsed.length} загадок`);
        } else {
            // Сохраняем ребусы из картинок
            const preview = document.getElementById('batch-preview-list');
            const rows = preview.querySelectorAll('.batch-item');
            if (!rows.length) { showToast('❌ Выберите картинки'); return; }

            const data = this._getData('puzzles');
            const pending = JSON.parse(localStorage.getItem('admin_pending_pics') || '{}');

            rows.forEach((row, idx) => {
                const item = this._batchItems[idx];
                if (!item) return;
                const nameEl = row.querySelector('.batch-name');
                const lvlEl  = row.querySelector('.batch-lvl');
                const name   = nameEl ? nameEl.value.trim() : item.name;
                const lvl    = lvlEl  ? lvlEl.value          : 'easy';

                const reader = new FileReader();
                reader.onload = e => {
                    pending[item.pending_key] = { data: e.target.result, name: item.file.name };
                    localStorage.setItem('admin_pending_pics', JSON.stringify(pending));
                };
                reader.readAsDataURL(item.file);

                const safeName = name.toLowerCase().replace(/\s+/g, '_').replace(/[^а-яёa-z0-9_]/gi, '');
                data.push({
                    id: item.id, name, answer: name, level: lvl,
                    pic: `assets/images/rebuses_pictures_opt/${safeName}.webp`,
                    hint: 'Присмотрись к картинке',
                    _pending_pic: item.pending_key,
                });
            });

            this._setData('puzzles', data);
            showToast(`✅ Добавлено ${rows.length} ребусов. Не забудьте опубликовать на GitHub!`);
        }

        document.getElementById('batch-modal').classList.add('hidden');
        this._batchItems = [];
        this.render();
    },

    // Запрашивает немедленную отправку отчёта через воркер
    async requestReport() {
        const btn = document.getElementById('admin-report-btn');
        if (!btn) return;

        const WORKER_URL = TgReminder.WORKER_URL;
        let secret = localStorage.getItem('report_secret') || '';
        if (!secret) {
            const s = prompt('Введите REPORT_SECRET (из настроек воркера):');
            if (!s) return;
            secret = s.trim();
            localStorage.setItem('report_secret', secret);
        }

        const orig = btn.textContent;
        btn.disabled = true;
        btn.textContent = '⏳';

        try {
            const resp = await fetch(WORKER_URL + '/report-now', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret }),
            });
            const data = await resp.json();
            if (data.ok) {
                btn.textContent = '✅';
                showToast('📊 Отчёт отправлен в Telegram');
            } else {
                throw new Error(data.error || 'Ошибка');
            }
        } catch(e) {
            btn.textContent = '❌';
            if (e.message === 'Forbidden') {
                localStorage.removeItem('report_secret');
                showToast('❌ Неверный секрет — нажмите ещё раз');
            } else {
                showToast('❌ ' + e.message);
            }
        } finally {
            setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 3000);
        }
    },

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
    }
};
