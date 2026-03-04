// =============================================
// NOTIFICATIONS — Уведомления и Telegram
// =============================================
// =============================================
// NOTIFICATIONS — Уведомления
// =============================================
const Notif = {
    _open: false,

    _getAll() {
        try { return JSON.parse(localStorage.getItem('admin_notif') || '[]'); } catch { return []; }
    },
    _getReadIds() {
        try { return JSON.parse(localStorage.getItem('notif_read_ids') || '[]'); } catch { return []; }
    },
    _saveReadIds(ids) { localStorage.setItem('notif_read_ids', JSON.stringify(ids)); },

    getUnreadCount() {
        const all = this._getAll();
        const read = new Set(this._getReadIds());
        return all.filter(n => !read.has(n.id)).length;
    },

    updateBadge() {
        const count = this.getUnreadCount();
        const badge = document.getElementById('notif-badge');
        const bell = document.getElementById('notif-bell-btn');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? '' : 'none';
        }
        if (bell) bell.style.display = '';
        // PWA icon badge (iOS 16.4+, Chrome)
        if ('setAppBadge' in navigator) {
            if (count > 0) navigator.setAppBadge(count).catch(() => {});
            else navigator.clearAppBadge().catch(() => {});
        }
    },

    toggle() {
        if (this._open) {
            App.back();
            this._open = false;
        } else {
            App.navigate('notifications', 'Уведомления');
            this._open = true;
            this._markAllRead();
            this._render();
        }
    },

    _markAllRead() {
        const all = this._getAll();
        const ids = all.map(n => n.id);
        this._saveReadIds(ids);
        this.updateBadge();
    },

    _render() {
        const list = document.getElementById('notif-list');
        const empty = document.getElementById('notif-empty');
        const all = this._getAll().sort((a, b) => b.id - a.id);

        if (!all.length) {
            if (list) list.innerHTML = '';
            if (empty) empty.style.display = '';
            return;
        }
        if (empty) empty.style.display = 'none';

        const icons = {
            songs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
            podcasts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
            riddles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            puzzles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.5 2.5 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877L1.998 12"/></svg>',
            message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
        };
        const typeLabels = { songs:'Новая песенка', podcasts:'Новый подкаст', riddles:'Новая загадка', puzzles:'Новый ребус', message:'Сообщение' };

        list.innerHTML = all.map(n => {
            const icon = icons[n.type] || icons.message;
            const date = n.date ? this._fmtDate(n.date) : '';
            const label = typeLabels[n.type] || 'Уведомление';
            return `<div class="notif-item">
                <div class="notif-icon notif-icon-${n.type || 'message'}">${icon}</div>
                <div class="notif-body">
                    <div class="notif-title">${n.title || label}</div>
                    ${n.body ? `<div class="notif-text">${n.body}</div>` : ''}
                    <div class="notif-date">${date}</div>
                </div>
            </div>`;
        }).join('');
    },

    _fmtDate(iso) {
        try {
            const d = new Date(iso);
            const now = new Date();
            const diff = now - d;
            if (diff < 60000) return 'Только что';
            if (diff < 3600000) return Math.floor(diff / 60000) + ' мин назад';
            if (diff < 86400000) return Math.floor(diff / 3600000) + ' ч назад';
            const day = d.getDate();
            const months = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
            return day + ' ' + months[d.getMonth()];
        } catch { return ''; }
    },

    // ── Auto-detect new content ──
    checkNewContent(data) {
        if (!data) return;
        const prevCounts = JSON.parse(localStorage.getItem('notif_content_counts') || '{}');
        const currentCounts = {};
        const newNotifs = [];
        const existing = this._getAll();
        const existingIds = new Set(existing.map(n => n.id));

        const sections = {
            songs: { label: 'песенка', key: 'songs' },
            podcasts: { label: 'подкаст', key: 'podcasts' },
            riddles: { label: 'загадка', key: 'riddles' },
            puzzles: { label: 'ребус', key: 'puzzles' }
        };

        Object.entries(sections).forEach(([key, cfg]) => {
            const items = data[key] || [];
            currentCounts[key] = items.length;
            const prev = prevCounts[key] || 0;
            if (prev > 0 && items.length > prev) {
                // New items added
                const diff = items.length - prev;
                const newest = items.slice(-diff);
                newest.forEach(item => {
                    const name = item.name || item.text || '—';
                    const nid = Date.now() + Math.floor(Math.random() * 1000);
                    if (!existingIds.has(nid)) {
                        newNotifs.push({
                            id: nid,
                            type: key,
                            title: cfg.label === 'песенка' ? 'Новая ' + cfg.label : cfg.label === 'подкаст' ? 'Новый ' + cfg.label : cfg.label === 'загадка' ? 'Новая ' + cfg.label : 'Новый ' + cfg.label,
                            body: name,
                            date: new Date().toISOString(),
                            auto: true
                        });
                    }
                });
            }
        });

        // Handle admin_notif from data.json (manual messages)
        if (Array.isArray(data.notifications)) {
            data.notifications.forEach(n => {
                if (!existingIds.has(n.id)) {
                    newNotifs.push(n);
                }
            });
        }

        if (newNotifs.length) {
            const all = [...existing, ...newNotifs];
            localStorage.setItem('admin_notif', JSON.stringify(all));
            this.updateBadge();
        }

        localStorage.setItem('notif_content_counts', JSON.stringify(currentCounts));
    }
};

// -------- TELEGRAM VISIT NOTIFICATION --------
function notifyTelegramVisit() {
    try {
        const tg = window.Telegram?.WebApp;
        const userId = tg?.initDataUnsafe?.user?.id || 'unknown';
        // WORKER_URL — замени на свой URL после деплоя воркера
        const WORKER_URL = 'https://gosha-notify.saturngroup2025.workers.dev';
        fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        }).catch(() => {});
    } catch (e) { /* silent */ }
}

// ── Telegram Mini App viewport fix ──
function initTelegramWebApp() {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    document.documentElement.classList.add('tg-webapp');
    try {
        tg.ready();
        tg.expand();
        // Telegram SDK may provide safe area insets
        if (tg.safeAreaInset) {
            const top = tg.safeAreaInset.top || 0;
            const contentTop = tg.contentSafeAreaInset?.top || 0;
            document.documentElement.style.setProperty('--tg-safe-top', (top + contentTop) + 'px');
        }
        // Listen for viewport changes
        tg.onEvent?.('viewportChanged', () => {
            const app = document.getElementById('app');
            if (app && tg.viewportStableHeight) {
                app.style.height = tg.viewportStableHeight + 'px';
            }
        });
    } catch(e) { console.warn('TG WebApp init:', e); }
}
