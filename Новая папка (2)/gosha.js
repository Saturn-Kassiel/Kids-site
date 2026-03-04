// =============================================
// GOSHA — Анимации маскота
// =============================================
const Gosha = {
    _lastCelebrate: 0,

    // Вызывается при получении нового значка
    celebrate() {
        const wrap = document.querySelector('.home-mascot-wrap');
        if (!wrap) return;
        // Не чаще раза в 3 сек
        if (Date.now() - this._lastCelebrate < 3000) return;
        this._lastCelebrate = Date.now();

        wrap.classList.remove('gosha-idle');
        wrap.classList.add('gosha-celebrate');
        wrap.addEventListener('animationend', () => {
            wrap.classList.remove('gosha-celebrate');
            wrap.classList.add('gosha-idle');
        }, { once: true });
    },

    // Подпрыгивание при возврате на главную после прогресса
    bounce() {
        const wrap = document.querySelector('.home-mascot-wrap');
        if (!wrap) return;
        wrap.classList.add('gosha-bounce');
        wrap.addEventListener('animationend', () => {
            wrap.classList.remove('gosha-bounce');
        }, { once: true });
    }
};
