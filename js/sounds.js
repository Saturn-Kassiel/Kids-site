// =============================================
// SOUNDS — starsBurst, playCorrectSound, playWrongSound
// =============================================
function starsBurst() {
    showStars(window.innerWidth / 2, window.innerHeight * 0.55);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
}

// Тихий мягкий звук правильного ответа
function playCorrectSound(section) {
    const key = section === 'riddles' ? 'snd-riddle-correct'
              : section === 'words'   ? 'snd-words-correct'
              : section === 'math'    ? 'snd-math-correct'
              : section === 'interstitials' ? 'snd-inter-correct'
              : 'snd-puzzle-correct';
    if (!getSoundSetting(key)) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Два синусоидальных тона — мягкий восходящий интервал
        const notes = [
            { freq: 523.25, start: 0,    dur: 0.18 },  // C5
            { freq: 783.99, start: 0.10, dur: 0.22 },  // G5
        ];
        notes.forEach(({ freq, start, dur }) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            // Лёгкое вибрато для мягкости
            const vib  = ctx.createOscillator();
            const vibG = ctx.createGain();
            vib.frequency.value = 5.5;
            vibG.gain.value = 3;
            vib.connect(vibG);
            vibG.connect(osc.frequency);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

            // Огибающая: тихо нарастает, плавно затухает
            const t0 = ctx.currentTime + start;
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.09, t0 + 0.025);
            gain.gain.setValueAtTime(0.09, t0 + dur * 0.4);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

            vib.start(t0); vib.stop(t0 + dur);
            osc.start(t0); osc.stop(t0 + dur + 0.05);
        });
    } catch(e) {}
}

// Мягкий звук неправильного ответа (слова)
function playWrongSound(section) {
    const key = section === 'words' ? 'snd-words-correct'
              : section === 'math'  ? 'snd-math-correct'
              : section === 'interstitials' ? 'snd-inter-correct'
              : 'snd-puzzle-correct';
    if (!getSoundSetting(key)) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [
            { freq: 330, start: 0,    dur: 0.18 },  // E4
            { freq: 262, start: 0.12, dur: 0.22 },  // C4 — нисходящий
        ];
        notes.forEach(({ freq, start, dur }) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
            const t0 = ctx.currentTime + start;
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.07, t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.start(t0); osc.stop(t0 + dur + 0.05);
        });
    } catch(e) {}
}
