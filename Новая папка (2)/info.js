// =============================================
// INFO — Информационные блоки
// =============================================
const Info = {
    render() {
        const container = document.getElementById('info-blocks-container');
        if (!container) return;
        const blocks = (() => {
            try { return JSON.parse(localStorage.getItem('admin_info')) || []; } catch { return []; }
        })();
        container.innerHTML = '';
        if (!blocks.length) {
            container.innerHTML = '<div style="text-align:center;color:var(--text2);padding:40px 20px;font-size:15px;">Нет информационных блоков</div>';
            return;
        }
        blocks.forEach(b => {
            const div = document.createElement('div');
            div.className = 'info-accordion';
            const parseBody = (text) => {
                return (text || '')
                    .replace(/\n/g, '<br>')
                    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
                        '<a href="$2" target="_blank" rel="noopener" class="info-link">$1</a>')
                    .replace(/(?<!\()(https?:\/\/[^\s<]+)/g,
                        '<a href="$1" target="_blank" rel="noopener" class="info-link">$1</a>');
            };
            div.innerHTML = `
                <div class="info-acc-header-row">
                    <button class="info-acc-header">
                        <span class="info-acc-title">${b.name || ''}</span>
                        <span class="info-acc-arrow">›</span>
                    </button>
                    <button class="info-deeplink-btn" title="Скопировать ссылку">🔗</button>
                </div>
                <div class="info-acc-body">
                    <p>${parseBody(b.body)}</p>
                </div>
            `;
            div.querySelector('.info-acc-header').addEventListener('click', () => {
                const isOpen = div.classList.contains('open');
                container.querySelectorAll('.info-accordion.open').forEach(a => a.classList.remove('open'));
                if (!isOpen) div.classList.add('open');
            });
            div.querySelector('.info-deeplink-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                copyDeepLink('info', b.id, b.name);
            });
            container.appendChild(div);
        });
    }
};
