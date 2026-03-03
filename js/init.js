// =============================================
// INIT — DOMContentLoaded и запуск приложения
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    initTelegramWebApp();
    // notifyTelegramVisit(); // отключено — уведомления о входе через Telegram
    // Читаем хэш ДО любых операций
    const deepLinkHash = window.location.hash;
    const deepLinkMatch = deepLinkHash.match(/^#(song|podcast|info)-(\d+)$/);

    // Сразу убираем хэш из URL
    if (deepLinkMatch) history.replaceState(null, '', location.pathname);

    if (deepLinkMatch) {
        // Deep link: инициализируем UI немедленно, данные грузим фоном
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        document.getElementById('modal').classList.add('hidden');
        document.getElementById('loader').style.display = 'none';

        const [, type, idStr] = deepLinkMatch;
        const id = parseInt(idStr);

        if (type === 'song') {
            Songs.init();
            const idx = Songs._allSongs.findIndex(s => s.id === id);
            if (idx !== -1) Songs.play(idx);
        } else if (type === 'podcast') {
            Podcasts.init();
            const idx = Podcasts._allPodcasts.findIndex(p => p.id === id);
            if (idx !== -1) Podcasts.play(idx);
        } else if (type === 'info') {
            App.navigate('info', 'Информация');
            Info.render();
            // Открываем нужный аккордеон после рендера
            setTimeout(() => {
                const container = document.getElementById('info-blocks-container');
                if (!container) return;
                const blocks = (() => { try { return JSON.parse(localStorage.getItem('admin_info')) || []; } catch { return []; } })();
                const blockIdx = blocks.findIndex(b => b.id === id);
                if (blockIdx !== -1) {
                    const items = container.querySelectorAll('.info-accordion');
                    if (items[blockIdx]) {
                        items[blockIdx].classList.add('open');
                        items[blockIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }, 100);
        }

        // Данные обновляем фоном — не блокируем запуск трека
        App._loadRemoteData();
    } else {
        // Обычный запуск — ждём данных
        await App.init();
        App.navigate('main');
        // Загружаем имя ребёнка
        regUpdateCard();
        updateHomeGreeting();
        Notif.updateBadge();
        CardBadges.updateAll();
        // Enter в поле имени = сохранить
        document.getElementById('child-name-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') regSaveName(); });
        // Гоша приветствует при запуске
    }
});
