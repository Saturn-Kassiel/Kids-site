// -------- AUDIO MANAGER --------
// Keeps only one audio playing globally; persists across section changes
const AudioMgr = {
    _current: null,
    _section: null,

    play(audioEl, section) {
        if (this._current && this._current !== audioEl) {
            this._current.pause();
        }
        this._current = audioEl;
        this._section = section;
        audioEl.play().catch(() => {});
    },

    stop(section) {
        if (!section || this._section === section) {
            if (this._current) this._current.pause();
            this._current = null;
        }
    },

    isCurrent(audioEl) {
        return this._current === audioEl;
    }
};

// -------- HELPERS --------
function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
}

function setupProgress(audio, fillId, curId, durId, wrapId) {
    audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const pct = audio.currentTime / audio.duration * 100;
        document.getElementById(fillId).style.width = pct + '%';
        document.getElementById(curId).textContent = fmtTime(audio.currentTime);
        document.getElementById(durId).textContent = fmtTime(audio.duration);
    });
    const wrap = document.getElementById(wrapId);
    if (wrap) {
        wrap.addEventListener('click', e => {
            if (!audio.duration) return;
            const r = wrap.getBoundingClientRect();
            audio.currentTime = (e.clientX - r.left) / r.width * audio.duration;
        });
    }
}
