// =============================================
// ACHIEVEMENT SYSTEM
// =============================================
const Achievements = {
    // Счётчики подряд (сбрасываются при ошибке)
    _streak: { puzzles: 0, riddles: 0 },
    // Лучший результат (сохраняется между сессиями)
    _best:   { puzzles: 0, riddles: 0 },
    // Уже показанные рубежи в текущей серии
    _shown:  { puzzles: new Set(), riddles: new Set() },

    init() {
        const saved = JSON.parse(localStorage.getItem('achievements_best') || '{}');
        this._best.puzzles = saved.puzzles || 0;
        this._best.riddles = saved.riddles || 0;
    },

    correct(section) {
        this._streak[section]++;
        const s = this._streak[section];
        if (this._best[section] < s) {
            this._best[section] = s;
            localStorage.setItem('achievements_best', JSON.stringify(this._best));
        }
        if (s % 5 === 0 && !this._shown[section].has(s)) {
            this._shown[section].add(s);
            setTimeout(() => this._show(section, s), 600);
        }
    },

    wrong(section) {
        this._streak[section] = 0;
        this._shown[section]  = new Set();
    },

    _playFanfare(section) {
        const key = section === 'riddles' ? 'snd-riddle-achieve' : 'snd-puzzle-achieve';
        if (!getSoundSetting(key)) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = section === 'riddles'
                ? [523, 659, 784, 1047]   // C E G C — загадки (мягко)
                : [392, 523, 659, 784, 1047]; // G C E G C — ребусы (торжественно)
            let t = ctx.currentTime;
            notes.forEach((freq, i) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, t);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                osc.start(t); osc.stop(t + 0.4);
                t += i < notes.length - 1 ? 0.12 : 0;
            });
        } catch(e) {}
    },

    _milestoneTheme(section, count) {
        // Медальки по уровню
        const tier = count >= 20 ? 4 : count >= 15 ? 3 : count >= 10 ? 2 : 1;
        if (section === 'riddles') {
            // Совы / лампочки
            const items = [
                { icon: this._drawOwl,   color: '#A7EBF2', label: 'Умная сова' },
                { icon: this._drawBulb,  color: '#fde68a', label: 'Яркая идея' },
                { icon: this._drawOwl,   color: '#c4b5fd', label: 'Мудрая сова' },
                { icon: this._drawOwlGold, color: '#fcd34d', label: 'Великий знаток' },
            ];
            return items[tier - 1];
        } else {
            // Пазлы / мозг
            const items = [
                { icon: this._drawPuzzle, color: '#A7EBF2', label: 'Сообразительный' },
                { icon: this._drawBrain,  color: '#86efac', label: 'Острый ум' },
                { icon: this._drawPuzzle, color: '#c4b5fd', label: 'Мастер ребусов' },
                { icon: this._drawBrainGold, color: '#fcd34d', label: 'Гений загадок' },
            ];
            return items[tier - 1];
        }
    },

    _show(section, count) {
        this._playFanfare(section);
        StatTracker.recordAchievement(section, count);
        const theme = this._milestoneTheme(section, count);

        const overlay = document.createElement('div');
        overlay.id = 'achievement-overlay';
        overlay.innerHTML = `
            <div class="ach-card" id="ach-card">
                <div class="ach-canvas-wrap">
                    <canvas id="ach-canvas" width="220" height="220"></canvas>
                    <div class="ach-count-badge">${count}</div>
                </div>
                <div class="ach-label">${getChildName() ? getChildName() + ' — ' : ''}${count} правильных ответов подряд!</div>
                <div class="ach-sub">${theme.label}</div>
                <div class="ach-progress-bar"><div class="ach-progress-fill" id="ach-progress"></div></div>
                <div class="ach-btns">
                    <button class="ach-share-btn" onclick="Achievements._share(${count},'${section}')">
                        <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        Поделиться
                    </button>
                    <button class="ach-close-btn" onclick="Achievements._close()">Закрыть</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Рисуем иконку на canvas
        const canvas = document.getElementById('ach-canvas');
        if (canvas) {
            const ctx2 = canvas.getContext('2d');
            theme.icon.call(this, ctx2, 220, theme.color);
        }

        // Анимация появления
        requestAnimationFrame(() => {
            overlay.classList.add('ach-visible');
            document.getElementById('ach-card')?.classList.add('ach-card-in');
            // Запускаем progress bar
            setTimeout(() => {
                const bar = document.getElementById('ach-progress');
                if (bar) bar.style.width = '0%';
            }, 50);
        });

        // Конфетти
        if (window.confetti) confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });

        // Автозакрытие через 10 сек
        this._autoClose = setTimeout(() => this._close(), 10000);
    },

    _close() {
        clearTimeout(this._autoClose);
        const overlay = document.getElementById('achievement-overlay');
        if (overlay) {
            overlay.classList.remove('ach-visible');
            setTimeout(() => overlay.remove(), 350);
        }
    },

    async _share(count, section) {
        const sectionName = section === 'riddles' ? 'загадках' : 'ребусах';
        const childN = getChildName();
        const text = childN
            ? `🎉 ${childN}: ${count} правильных ответов подряд в ${sectionName}! Попробуй сам: https://saturn-kassiel.github.io/Kids-site/`
            : `🎉 ${count} правильных ответов подряд в ${sectionName}! Попробуй сам: https://saturn-kassiel.github.io/Kids-site/`;

        // Пробуем поделиться вместе с картинкой
        const canvas = document.getElementById('ach-canvas');
        if (canvas && navigator.share) {
            try {
                // Создаём новый canvas с картинкой + текстом поверх
                const shareCanvas = document.createElement('canvas');
                shareCanvas.width = 600; shareCanvas.height = 600;
                const sc = shareCanvas.getContext('2d');

                // Белый/тёмный фон в зависимости от темы
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                sc.fillStyle = isDark ? '#0f1f36' : '#f0f9ff';
                sc.roundRect(0, 0, 600, 600, 40);
                sc.fill();

                // Рисуем иконку в центре (перерисовываем)
                const theme = this._milestoneTheme(section, count);
                theme.icon.call(this, sc, 600, theme.color);

                // Полупрозрачная подложка под текст
                sc.fillStyle = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.75)';
                sc.beginPath();
                sc.roundRect(40, 430, 520, 130, 20);
                sc.fill();

                // Имя ребёнка (если есть)
                if (childN) {
                    sc.font = '500 30px system-ui, sans-serif';
                    sc.textAlign = 'center';
                    sc.fillStyle = isDark ? '#fbbf24' : '#d97706';
                    sc.fillText(childN, 300, 470);
                }

                // Число
                sc.font = 'bold 72px system-ui, sans-serif';
                sc.textAlign = 'center';
                sc.fillStyle = isDark ? '#A7EBF2' : '#0369a1';
                sc.fillText(count, 300, childN ? 540 : 500);

                // Текст
                sc.font = '500 28px system-ui, sans-serif';
                sc.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
                sc.fillText(`правильных ответов подряд в ${sectionName}`, 300, childN ? 576 : 542);

                // Бренд
                sc.font = '400 20px system-ui, sans-serif';
                sc.fillStyle = isDark ? '#94a3b8' : '#64748b';
                sc.fillText('Гоша · saturn-kassiel.github.io/Kids-site', 300, childN ? 600 : 576);

                // Конвертируем в blob и шарим
                shareCanvas.toBlob(async (blob) => {
                    const file = new File([blob], 'achievement.png', { type: 'image/png' });
                    try {
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({ files: [file], text });
                        } else {
                            await navigator.share({ text });
                        }
                    } catch(e) {}
                }, 'image/png');
                return;
            } catch(e) {}
        }

        // Fallback — только текст или копирование
        if (navigator.share) {
            try { await navigator.share({ text }); } catch(e) {}
        } else {
            navigator.clipboard.writeText(text).catch(() => {});
            showToast('📋 Скопировано!');
        }
    },

    // ── Canvas рисовалки ──

    _drawOwl(ctx, size, color) {
        const cx = size/2, cy = size/2, r = size*0.36;
        // Фон — круг с градиентом
        const g = ctx.createRadialGradient(cx, cy-r*0.2, r*0.1, cx, cy, r*1.2);
        g.addColorStop(0, color); g.addColorStop(1, color + '44');
        ctx.beginPath(); ctx.arc(cx, cy, r*1.1, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
        // Тело
        ctx.beginPath();
        ctx.ellipse(cx, cy+r*0.15, r*0.55, r*0.7, 0, 0, Math.PI*2);
        ctx.fillStyle = '#5b4a2e'; ctx.fill();
        // Голова
        ctx.beginPath();
        ctx.arc(cx, cy-r*0.3, r*0.4, 0, Math.PI*2);
        ctx.fillStyle = '#7c6542'; ctx.fill();
        // Ушки
        ctx.beginPath();
        ctx.moveTo(cx-r*0.28, cy-r*0.55);
        ctx.lineTo(cx-r*0.42, cy-r*0.85);
        ctx.lineTo(cx-r*0.08, cy-r*0.62);
        ctx.fillStyle = '#7c6542'; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx+r*0.28, cy-r*0.55);
        ctx.lineTo(cx+r*0.42, cy-r*0.85);
        ctx.lineTo(cx+r*0.08, cy-r*0.62);
        ctx.fillStyle = '#7c6542'; ctx.fill();
        // Глаза
        [[cx-r*0.18, cy-r*0.32],[cx+r*0.18, cy-r*0.32]].forEach(([x,y]) => {
            ctx.beginPath(); ctx.arc(x, y, r*0.14, 0, Math.PI*2);
            ctx.fillStyle = '#fff'; ctx.fill();
            ctx.beginPath(); ctx.arc(x+r*0.02, y+r*0.02, r*0.08, 0, Math.PI*2);
            ctx.fillStyle = '#1a1a2e'; ctx.fill();
            ctx.beginPath(); ctx.arc(x+r*0.04, y-r*0.04, r*0.03, 0, Math.PI*2);
            ctx.fillStyle = '#fff'; ctx.fill();
        });
        // Клюв
        ctx.beginPath();
        ctx.moveTo(cx, cy-r*0.18); ctx.lineTo(cx-r*0.08, cy-r*0.1); ctx.lineTo(cx+r*0.08, cy-r*0.1);
        ctx.fillStyle = '#f59e0b'; ctx.fill();
        // Брови удивлённые
        ctx.strokeStyle = '#3d2b00'; ctx.lineWidth = r*0.05; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx-r*0.28, cy-r*0.48); ctx.lineTo(cx-r*0.08, cy-r*0.44); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+r*0.28, cy-r*0.48); ctx.lineTo(cx+r*0.08, cy-r*0.44); ctx.stroke();
        // Звёздочки
        Achievements._drawStars(ctx, cx, cy, r, color);
    },

    _drawOwlGold(ctx, size, color) {
        Achievements._drawOwl(ctx, size, color);
        // Корона
        const cx = size/2, cy = size/2, r = size*0.36;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.rect(cx-r*0.35, cy-r*0.85, r*0.7, r*0.22);
        ctx.fill();
        for(let i=0; i<5; i++){
            ctx.beginPath();
            ctx.moveTo(cx-r*0.35+i*r*0.175, cy-r*0.85);
            ctx.lineTo(cx-r*0.315+i*r*0.175, cy-r*1.05);
            ctx.lineTo(cx-r*0.28+i*r*0.175, cy-r*0.85);
            ctx.fillStyle = '#f59e0b'; ctx.fill();
        }
    },

    _drawBulb(ctx, size, color) {
        const cx = size/2, cy = size/2, r = size*0.36;
        const g = ctx.createRadialGradient(cx, cy-r*0.2, r*0.1, cx, cy, r*1.2);
        g.addColorStop(0, color); g.addColorStop(1, color + '44');
        ctx.beginPath(); ctx.arc(cx, cy, r*1.1, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
        // Лампочка
        ctx.beginPath();
        ctx.arc(cx, cy-r*0.15, r*0.5, Math.PI, 0);
        ctx.lineTo(cx+r*0.3, cy+r*0.2);
        ctx.bezierCurveTo(cx+r*0.3, cy+r*0.45, cx-r*0.3, cy+r*0.45, cx-r*0.3, cy+r*0.2);
        ctx.closePath();
        ctx.fillStyle = '#fef08a'; ctx.fill();
        ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = r*0.06; ctx.stroke();
        // Цоколь
        ctx.beginPath(); ctx.rect(cx-r*0.22, cy+r*0.42, r*0.44, r*0.12);
        ctx.fillStyle = '#9ca3af'; ctx.fill();
        ctx.beginPath(); ctx.rect(cx-r*0.18, cy+r*0.54, r*0.36, r*0.1);
        ctx.fillStyle = '#9ca3af'; ctx.fill();
        // Свечение
        ctx.beginPath(); ctx.arc(cx, cy-r*0.15, r*0.65, 0, Math.PI*2);
        ctx.strokeStyle = '#fde047' + '55'; ctx.lineWidth = r*0.12; ctx.stroke();
        // Лучи
        ctx.strokeStyle = '#fde047'; ctx.lineWidth = r*0.05;
        for(let a=0; a<8; a++){
            const angle = (a/8)*Math.PI*2;
            const x1=cx+Math.cos(angle)*r*0.7, y1=cy-r*0.15+Math.sin(angle)*r*0.7;
            const x2=cx+Math.cos(angle)*r*0.9, y2=cy-r*0.15+Math.sin(angle)*r*0.9;
            ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        }
        Achievements._drawStars(ctx, cx, cy, r, color);
    },

    _drawPuzzle(ctx, size, color) {
        const cx = size/2, cy = size/2, r = size*0.36;
        const g = ctx.createRadialGradient(cx, cy-r*0.2, r*0.1, cx, cy, r*1.2);
        g.addColorStop(0, color); g.addColorStop(1, color + '44');
        ctx.beginPath(); ctx.arc(cx, cy, r*1.1, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
        // 4 кусочка пазла
        const ps = r * 0.38;
        const pieces = [
            {x: cx-ps*0.05, y: cy-ps*0.05, c:'#60a5fa'},
            {x: cx+ps*0.05, y: cy-ps*0.05, c:'#34d399'},
            {x: cx-ps*0.05, y: cy+ps*0.05, c:'#f472b6'},
            {x: cx+ps*0.05, y: cy+ps*0.05, c:'#fbbf24'},
        ];
        pieces.forEach(({x,y,c},i) => {
            const dx = i%2===0 ? -1 : 1, dy = i<2 ? -1 : 1;
            ctx.save(); ctx.translate(x + dx*ps*0.48, y + dy*ps*0.48);
            ctx.beginPath();
            ctx.rect(-ps*0.46, -ps*0.46, ps*0.9, ps*0.9);
            ctx.fillStyle = c; ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = r*0.05; ctx.stroke();
            // Выступ пазла
            ctx.beginPath();
            if(i===0) ctx.arc(0, ps*0.46, ps*0.15, Math.PI, 0);
            if(i===1) ctx.arc(-ps*0.46, 0, ps*0.15, Math.PI*0.5, -Math.PI*0.5);
            if(i===2) ctx.arc(ps*0.46, 0, ps*0.15, -Math.PI*0.5, Math.PI*0.5);
            if(i===3) ctx.arc(0, -ps*0.46, ps*0.15, 0, Math.PI);
            ctx.fillStyle = c; ctx.fill();
            ctx.restore();
        });
        Achievements._drawStars(ctx, cx, cy, r, color);
    },

    _drawBrain(ctx, size, color) {
        const cx = size/2, cy = size/2, r = size*0.36;
        const g = ctx.createRadialGradient(cx, cy, r*0.1, cx, cy, r*1.2);
        g.addColorStop(0, color); g.addColorStop(1, color + '44');
        ctx.beginPath(); ctx.arc(cx, cy, r*1.1, 0, Math.PI*2);
        ctx.fillStyle = g; ctx.fill();
        // Мозг — два полушария
        ctx.strokeStyle = '#e879f9'; ctx.lineWidth = r*0.07; ctx.lineCap = 'round';
        ctx.fillStyle = '#f0abfc';
        // Левое полушарие
        ctx.beginPath();
        ctx.moveTo(cx, cy-r*0.1);
        ctx.bezierCurveTo(cx-r*0.1, cy-r*0.7, cx-r*0.85, cy-r*0.6, cx-r*0.8, cy-r*0.1);
        ctx.bezierCurveTo(cx-r*0.85, cy+r*0.4, cx-r*0.2, cy+r*0.55, cx, cy+r*0.4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Правое полушарие
        ctx.beginPath();
        ctx.moveTo(cx, cy-r*0.1);
        ctx.bezierCurveTo(cx+r*0.1, cy-r*0.7, cx+r*0.85, cy-r*0.6, cx+r*0.8, cy-r*0.1);
        ctx.bezierCurveTo(cx+r*0.85, cy+r*0.4, cx+r*0.2, cy+r*0.55, cx, cy+r*0.4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Борозды
        ctx.strokeStyle = '#d946ef'; ctx.lineWidth = r*0.045;
        const grooves = [
            [cx-r*0.55, cy-r*0.35, cx-r*0.3, cy-r*0.15],
            [cx-r*0.6, cy+r*0.05, cx-r*0.25, cy+r*0.2],
            [cx+r*0.55, cy-r*0.35, cx+r*0.3, cy-r*0.15],
            [cx+r*0.6, cy+r*0.05, cx+r*0.25, cy+r*0.2],
        ];
        grooves.forEach(([x1,y1,x2,y2]) => {
            ctx.beginPath();
            ctx.moveTo(x1,y1); ctx.quadraticCurveTo((x1+x2)/2, (y1+y2)/2-r*0.1, x2,y2);
            ctx.stroke();
        });
        // Разделитель
        ctx.strokeStyle = '#a21caf'; ctx.lineWidth = r*0.05;
        ctx.beginPath(); ctx.moveTo(cx, cy-r*0.1); ctx.lineTo(cx, cy+r*0.4); ctx.stroke();
        Achievements._drawStars(ctx, cx, cy, r, color);
    },

    _drawBrainGold(ctx, size, color) {
        Achievements._drawBrain(ctx, size, color);
        const cx = size/2, cy = size/2, r = size*0.36;
        // Корона поверх
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.rect(cx-r*0.4, cy-r*0.9, r*0.8, r*0.22);
        ctx.fill();
        for(let i=0;i<5;i++){
            ctx.beginPath();
            ctx.moveTo(cx-r*0.4+i*r*0.2, cy-r*0.9);
            ctx.lineTo(cx-r*0.36+i*r*0.2, cy-r*1.12);
            ctx.lineTo(cx-r*0.32+i*r*0.2, cy-r*0.9);
            ctx.fillStyle = '#f59e0b'; ctx.fill();
        }
    },

    _drawStars(ctx, cx, cy, r, color) {
        // Маленькие звёздочки вокруг
        const positions = [
            [cx-r*0.85, cy-r*0.8], [cx+r*0.85, cy-r*0.8],
            [cx-r*1.0,  cy+r*0.1], [cx+r*1.0,  cy+r*0.1],
            [cx,        cy-r*1.1],
        ];
        positions.forEach(([x,y], i) => {
            const sr = r * (i===4 ? 0.13 : 0.09);
            ctx.save(); ctx.translate(x, y);
            ctx.beginPath();
            for(let p=0; p<5; p++){
                const a = (p*4*Math.PI/5) - Math.PI/2;
                const b = (p*4*Math.PI/5 + 2*Math.PI/5) - Math.PI/2;
                p===0 ? ctx.moveTo(Math.cos(a)*sr, Math.sin(a)*sr)
                      : ctx.lineTo(Math.cos(a)*sr, Math.sin(a)*sr);
                ctx.lineTo(Math.cos(b)*sr*0.4, Math.sin(b)*sr*0.4);
            }
            ctx.closePath();
            ctx.fillStyle = '#fde047'; ctx.fill();
            ctx.restore();
        });
    },
};

