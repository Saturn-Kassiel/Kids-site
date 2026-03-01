// =============================================
// SHARE MODULE — share section links with branded images
// =============================================

const ShareHelper = {
    BASE_URL: 'https://saturn-kassiel.github.io/Kids-site/',

    // Polyfill roundRect for older browsers
    _ensureRoundRect() {
        if (!CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
                const r = typeof radii === 'number' ? [radii,radii,radii,radii]
                    : Array.isArray(radii) ? [...radii, ...Array(4 - radii.length).fill(0)]
                    : [0,0,0,0];
                this.beginPath();
                this.moveTo(x + r[0], y);
                this.lineTo(x + w - r[1], y);
                this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
                this.lineTo(x + w, y + h - r[2]);
                this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
                this.lineTo(x + r[3], y + h);
                this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
                this.lineTo(x, y + r[0]);
                this.quadraticCurveTo(x, y, x + r[0], y);
                this.closePath();
            };
        }
    },

    // Section configs: id → { emoji, name, cta, color1, color2, initFn }
    SECTIONS: {
        puzzles:    { emoji: '🧩', name: 'Ребусы',      cta: 'Больше ребусов в',       color1: '#fdba74', color2: '#f97316', initFn: () => Puzzles.init() },
        riddles:    { emoji: '❓', name: 'Загадки',      cta: 'Больше загадок в',       color1: '#fde68a', color2: '#eab308', initFn: () => Riddles.init() },
        testing:    { emoji: '✅', name: 'Тестирование', cta: 'Проверь знания в',       color1: '#67e8f9', color2: '#06b6d4', initFn: () => Testing.init() },
        songs:      { emoji: '🎵', name: 'Песенки',      cta: 'Слушай песенки в',       color1: '#6ee7b7', color2: '#10b981', initFn: () => Songs.init() },
        podcasts:   { emoji: '🎧', name: 'Подкасты',     cta: 'Слушай подкасты в',      color1: '#5eead4', color2: '#0d9488', initFn: () => Podcasts.init() },
        alphabet:   { emoji: '🔤', name: 'Алфавит',      cta: 'Учи буквы в',            color1: '#c4b5fd', color2: '#7c3aed', initFn: () => Media.initSection('alphabet') },
        numbers:    { emoji: '🔢', name: 'Цифры',        cta: 'Учи цифры в',            color1: '#93c5fd', color2: '#3b82f6', initFn: () => Media.initSection('numbers') },
        colors:     { emoji: '🎨', name: 'Цвета',        cta: 'Учи цвета в',            color1: '#f9a8d4', color2: '#ec4899', initFn: () => Media.initSection('colors') },
        words:      { emoji: '📝', name: 'Слова',        cta: 'Учи новые слова в',      color1: '#fde68a', color2: '#f59e0b', initFn: () => Words.init() },
        arithmetic: { emoji: '➕', name: 'Арифметика',   cta: 'Считай вместе с',        color1: '#c4b5fd', color2: '#7c3aed', initFn: () => Arithmetic.init() },
        finger:     { emoji: '🖐️', name: 'Пальчиковые игры', cta: 'Играй вместе с', color1: '#f9a8d4', color2: '#e879a8', initFn: () => App.navigate('finger') },
        articul:    { emoji: '😛', name: 'Арт. гимнастика',  cta: 'Занимайся с',     color1: '#fca5a5', color2: '#ef4444', initFn: () => App.navigate('articul') },
        breath:     { emoji: '💨', name: 'Дыхательная гимнастика', cta: 'Дыши с', color1: '#93c5fd', color2: '#6aa1e8', initFn: () => App.navigate('breath') }
    },

    // Map navigate IDs → share section IDs (media-page needs special handling)
    NAV_TO_SECTION: {},
    _mediaSection: null, // track current media sub-section

    _mascotImg: null,
    _mascotLoaded: false,

    init() {
        this._ensureRoundRect();

        // Inject styles
        const style = document.createElement('style');
        style.textContent = `
            .share-section-btn {
                display: flex; align-items: center; justify-content: center;
                background: var(--card); border: 1.5px solid var(--border);
                border-radius: 12px; padding: 8px 13px;
                cursor: pointer; box-shadow: var(--shadow);
                transition: all var(--tr); flex-shrink: 0; color: var(--text2);
            }
            .share-section-btn:hover { transform: scale(1.05); color: var(--text); }
            .share-section-btn:active { transform: scale(0.95); }
        `;
        document.head.appendChild(style);

        // Build reverse nav map
        Object.keys(this.SECTIONS).forEach(id => { this.NAV_TO_SECTION[id] = id; });
        // media-page maps to alphabet/numbers/colors
        this.NAV_TO_SECTION['media-page'] = '_media_';

        // Preload mascot
        this._mascotImg = new Image();
        this._mascotImg.crossOrigin = 'anonymous';
        this._mascotImg.onload = () => { this._mascotLoaded = true; };
        this._mascotImg.src = 'assets/favicon/favicon.webp';

        // Hook into Media.initSection to track which sub-section
        if (typeof Media !== 'undefined' && Media.initSection) {
            const origInit = Media.initSection.bind(Media);
            Media.initSection = (type) => {
                ShareHelper._mediaSection = type;
                origInit(type);
            };
        }

        // Hook into App.navigate to inject share button
        const origNav = App.navigate.bind(App);
        App.navigate = (id, title) => {
            origNav(id, title);
            this._injectShareButton(id);
        };
    },

    _injectShareButton(navId) {
        // Remove any previous share button
        const old = document.getElementById('share-section-btn');
        if (old) old.remove();

        // Determine section ID
        let sectionId = this.NAV_TO_SECTION[navId];
        if (!sectionId) return;
        if (sectionId === '_media_') sectionId = this._mediaSection;
        if (!sectionId || !this.SECTIONS[sectionId]) return;

        const topBar = document.getElementById('top-bar');
        const settingsBtn = document.getElementById('settings-icon-btn');
        if (!topBar || !settingsBtn) return;

        const btn = document.createElement('button');
        btn.id = 'share-section-btn';
        btn.className = 'share-section-btn';
        btn.title = 'Поделиться';
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="17" height="17"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
        btn.addEventListener('click', () => this.share(sectionId));
        topBar.insertBefore(btn, settingsBtn);
    },

    async share(sectionId) {
        const cfg = this.SECTIONS[sectionId];
        if (!cfg) return;

        const url = this.BASE_URL + '#' + sectionId;
        const childN = typeof getChildName === 'function' ? getChildName() : '';
        const text = childN
            ? `${cfg.cta} мини школе Гоша! 🎓\nПрисоединяйся: ${url}`
            : `${cfg.cta} мини школе Гоша! 🎓\nПрисоединяйся: ${url}`;

        try {
            const blob = await this._generateImage(sectionId);
            if (blob && navigator.share) {
                const file = new File([blob], 'gosha-share.png', { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], text });
                } else {
                    await navigator.share({ text, url });
                }
                return;
            }
        } catch(e) { console.warn('Share image failed:', e); }

        // Fallback — text only
        if (navigator.share) {
            try { await navigator.share({ text, url }); } catch(e) {}
        } else {
            try {
                await navigator.clipboard.writeText(text);
                if (typeof showToast === 'function') showToast('📋 Ссылка скопирована!');
            } catch(e) {}
        }
    },

    _generateImage(sectionId) {
        return new Promise((resolve) => {
            const cfg = this.SECTIONS[sectionId];
            if (!cfg) { resolve(null); return; }

            const W = 600, H = 600;
            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d');

            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

            // ── Background ──
            const bgColor = isDark ? '#0f1f36' : '#f0f4ff';
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.roundRect(0, 0, W, H, 32);
            ctx.fill();

            // ── Accent gradient stripe at top ──
            const grad = ctx.createLinearGradient(0, 0, W, 120);
            grad.addColorStop(0, cfg.color1);
            grad.addColorStop(1, cfg.color2);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.roundRect(0, 0, W, 180, [32, 32, 0, 0]);
            ctx.fill();

            // ── Semi-transparent overlay for text readability ──
            ctx.fillStyle = isDark ? 'rgba(15,31,54,0.35)' : 'rgba(255,255,255,0.25)';
            ctx.fillRect(0, 60, W, 120);

            // ── Section emoji (large) ──
            ctx.font = '96px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cfg.emoji, W / 2, 260);

            // ── Section name ──
            ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = isDark ? '#ffffff' : '#1e293b';
            ctx.textBaseline = 'top';
            ctx.fillText(cfg.name, W / 2, 325);

            // ── CTA text ──
            ctx.font = '500 28px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
            ctx.fillText(cfg.cta, W / 2, 390);
            ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = cfg.color2;
            ctx.fillText('мини школе Гоша! 🎓', W / 2, 428);

            // ── Bottom card ──
            ctx.fillStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
            ctx.beginPath();
            ctx.roundRect(30, 492, W - 60, 80, 20);
            ctx.fill();

            // ── Mascot in bottom-left ──
            if (this._mascotLoaded && this._mascotImg) {
                const mSize = 56;
                const mx = 52, my = 508;
                // Circle clip
                ctx.save();
                ctx.beginPath();
                ctx.arc(mx + mSize / 2, my + mSize / 2, mSize / 2, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(this._mascotImg, mx, my, mSize, mSize);
                ctx.restore();

                // Ring around mascot
                ctx.strokeStyle = cfg.color2;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(mx + mSize / 2, my + mSize / 2, mSize / 2 + 2, 0, Math.PI * 2);
                ctx.stroke();
            }

            // ── "Мини школа Гоша" next to mascot ──
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
            ctx.fillText('Мини школа Гоша', 120, 527);

            // ── URL under branding ──
            ctx.font = '400 14px system-ui, -apple-system, sans-serif';
            ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
            ctx.fillText('saturn-kassiel.github.io/Kids-site', 120, 553);

            // ── Convert to blob ──
            canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
    },

    // ── Deep link handling ──
    handleDeepLink() {
        // Use pre-captured flag from inline script (runs before app.js)
        const sectionId = window.__sectionDeepLink;
        if (!sectionId) return false;

        window.__sectionDeepLink = null; // consume it

        const cfg = this.SECTIONS[sectionId];
        if (!cfg) return false;

        // Wait for app to be ready, then navigate
        const tryInit = () => {
            if (typeof App !== 'undefined' && App._history) {
                try { cfg.initFn(); } catch(e) { console.warn('Deep link init failed:', e); }
            } else {
                setTimeout(tryInit, 100);
            }
        };

        // Delay to let DOMContentLoaded + App.init() finish
        setTimeout(tryInit, 300);
        return true;
    }
};

// ── Auto-init after DOM ready ──
document.addEventListener('DOMContentLoaded', () => {
    // Check for deep link BEFORE app init takes over
    const isDeepLink = ShareHelper.handleDeepLink();

    // If not a deep link, just init share buttons
    // (ShareHelper.init() hooks into navigate which runs after App.init)
    const waitForApp = () => {
        if (typeof App !== 'undefined' && App.navigate) {
            ShareHelper.init();
        } else {
            setTimeout(waitForApp, 50);
        }
    };

    if (!isDeepLink) {
        waitForApp();
    } else {
        // For deep links, still init but after a delay
        setTimeout(waitForApp, 200);
    }
});
