// =============================================
// INIT — DOMContentLoaded и запуск приложения
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    initTelegramWebApp();
    TgReminder.init();
    // notifyTelegramVisit(); // отключено — уведомления о входе через Telegram
    // Читаем хэш ДО любых операций
    const deepLinkHash = window.location.hash;
    const deepLinkMatch = deepLinkHash.match(/^#(song|podcast|info)-(\d+)$/);

    // Сразу убираем хэш из URL
    if (deepLinkMatch) history.replaceState(null, '', location.pathname);

    if (deepLinkMatch) {
        // Deep link: показываем UI немедленно, но ждём загрузки данных
        // прежде чем искать трек/подкаст по id.
        // Ранее данные грузились фоном параллельно — Songs._allSongs мог
        // оказаться пустым и трек не запускался.
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        document.getElementById('modal').classList.add('hidden');

        const [, type, idStr] = deepLinkMatch;
        const id = parseInt(idStr);

        // Ждём данных, затем запускаем контент
        App._loadRemoteData().then(() => {
            document.getElementById('loader').style.display = 'none';

            if (type === 'song') {
                // При deep link — инициализируем Songs без AudioMgr.stop()
                // чтобы видео не сбрасывалось до того как загрузится
                Songs._loadSongs();
                App.navigate('songs', 'Песенки');
                Songs._loadFavorites();
                Songs._buildList();
                Songs._applyFilter();
                Songs._renderChips();
                Songs.render();
                setupProgress(Songs.audio, 'song-progress-bar', 'song-time-cur', 'song-time-dur', 'song-prog-wrap');
                if (!Songs._timeTracked) { StatTracker.trackAudioTime(Songs.audio, 'songs'); Songs._timeTracked = true; }
                Songs.audio.onended = () => {
                    if (!Songs._wasPaused) StatTracker.inc('songs');
                    const song = Songs._allSongs[Songs.index];
                    if (song) CardBadges.markTried('songs', song.id);
                    if (Songs.isRepeat) { Songs.play(Songs.index); return; }
                    Songs._setPlayBtn(false);
                    setTimeout(() => Songs.nextSong(), 1000);
                };
                Songs._loadDurations();
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
        });
    } else {
        // Обычный запуск — ждём данных
        await App.init();
        App.navigate('main');
        // Загружаем имя ребёнка
        Profiles.init();
        regUpdateCard();
        updateHomeGreeting();
        Notif.updateBadge();
        CardBadges.updateAll();
        // Онбординг при первом запуске
        setTimeout(() => Onboarding.start(), 600);
        // Enter в поле имени = сохранить
        document.getElementById('child-name-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') regSaveName(); });
        // Гоша приветствует при запуске
    }
});
