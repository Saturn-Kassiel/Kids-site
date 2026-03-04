// =============================================
// STAT TRACKER
// =============================================
const StatTracker = {
    // 15-секундные таймеры для каждого типа контента
    _timers: {},   // key → setInterval id
    _secs:   {},   // key → секунды в текущей сессии
    _timerPaused: {},  // key → boolean

    // ── Ежедневный лог активности ──
    _todayKey() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    },

    _getDailyLog() {
        try { return JSON.parse(localStorage.getItem('stat_daily_log') || '{}'); } catch { return {}; }
    },

    _saveDailyLog(log) {
        localStorage.setItem('stat_daily_log', JSON.stringify(log));
    },

    // Миграция: если дневной лог пуст, но накопительные статы есть —
    // засеиваем текущий день существующими значениями
    _migrateDailyLog() {
        if (localStorage.getItem('stat_daily_migrated')) return;
        const log = this._getDailyLog();
        if (Object.keys(log).length > 0) {
            localStorage.setItem('stat_daily_migrated', '1');
            return;
        }
        const totalAnswers = this.get('puzzles') + this.get('riddles')
            + this.get('words') + this.get('math')
            + this.get('interstitials') + this.get('songs')
            + this.get('letters') + this.get('numbers') + this.get('colors');
        const totalTime = Math.round(this.getTime('songs') + this.getTime('podcasts'));
        if (totalAnswers > 0 || totalTime > 0) {
            const key = this._todayKey();
            log[key] = { answers: totalAnswers, time: totalTime };
            this._saveDailyLog(log);
        }
        localStorage.setItem('stat_daily_migrated', '1');
    },

    // Логируем +1 ответ на сегодня
    _logDailyAnswer() {
        const log = this._getDailyLog();
        const key = this._todayKey();
        if (!log[key]) log[key] = { answers: 0, time: 0, hours: {} };
        log[key].answers++;
        // Почасовой лог
        const h = String(new Date().getHours());
        if (!log[key].hours) log[key].hours = {};
        if (!log[key].hours[h]) log[key].hours[h] = { a: 0, t: 0 };
        log[key].hours[h].a++;
        this._saveDailyLog(log);
    },

    // Логируем время (целые секунды) на сегодня
    _logDailyTime(seconds) {
        if (!seconds || seconds <= 0) return;
        seconds = Math.round(seconds);
        if (seconds <= 0) return;
        const log = this._getDailyLog();
        const key = this._todayKey();
        if (!log[key]) log[key] = { answers: 0, time: 0, hours: {} };
        log[key].time += seconds;
        // Почасовой лог
        const h = String(new Date().getHours());
        if (!log[key].hours) log[key].hours = {};
        if (!log[key].hours[h]) log[key].hours[h] = { a: 0, t: 0 };
        log[key].hours[h].t += seconds;
        this._saveDailyLog(log);
    },

    // Получить почасовые данные за сегодня
    getHourlyData() {
        const log = this._getDailyLog();
        const key = this._todayKey();
        const entry = log[key] || {};
        const hours = entry.hours || {};
        const result = [];
        for (let h = 0; h < 24; h++) {
            const d = hours[String(h)] || { a: 0, t: 0 };
            result.push({ hour: h, answers: d.a || 0, time: d.t || 0 });
        }
        return result;
    },

    // Получить данные за период
    getDailyData(period) {
        const log = this._getDailyLog();
        const today = new Date();
        today.setHours(0,0,0,0);
        let days = [];

        if (period === 'day') {
            // Показываем только сегодня — одна колонка
            days = [new Date(today)];
        } else if (period === 'week') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                days.push(d);
            }
        } else if (period === 'month') {
            for (let i = 29; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                days.push(d);
            }
        } else {
            // all — все дни из лога
            const allKeys = Object.keys(log).sort();
            if (allKeys.length === 0) {
                days = [new Date(today)];
            } else {
                const start = new Date(allKeys[0] + 'T00:00:00');
                const end = new Date(today);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
                    days.push(new Date(d));
                }
                // Если больше 60 дней — группируем по неделям
                if (days.length > 60) {
                    return this._groupByWeeks(days, log, today);
                }
            }
        }

        return days.map(d => {
            const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
            const entry = log[k] || { answers: 0, time: 0 };
            return {
                date: d,
                key: k,
                answers: entry.answers || 0,
                time: entry.time || 0,
                activity: (entry.answers || 0) + Math.floor((entry.time || 0) / 60),
                isToday: d.getTime() === today.getTime()
            };
        });
    },

    _groupByWeeks(days, log, today) {
        const weeks = [];
        for (let i = 0; i < days.length; i += 7) {
            const chunk = days.slice(i, i + 7);
            let answers = 0, time = 0;
            chunk.forEach(d => {
                const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                const entry = log[k] || {};
                answers += entry.answers || 0;
                time += entry.time || 0;
            });
            weeks.push({
                date: chunk[0],
                dateEnd: chunk[chunk.length - 1],
                key: 'week',
                answers, time,
                activity: answers + Math.floor(time / 60),
                isToday: chunk.some(d => d.getTime() === today.getTime())
            });
        }
        return weeks;
    },

    // Запустить таймер (привязан к audio через pauseTimer/resumeTimer)
    startTimer(key, onCredit, threshold = 15) {
        this.stopTimer(key);
        this._secs[key] = 0;
        this._timerPaused[key] = false;
        this._timers[key] = setInterval(() => {
            if (this._timerPaused[key]) return;
            this._secs[key]++;
            if (this._secs[key] >= threshold) {
                this.stopTimer(key);
                onCredit();
            }
        }, 1000);
    },

    pauseTimer(key) { this._timerPaused[key] = true; },
    resumeTimer(key) { if (this._timers[key]) this._timerPaused[key] = false; },

    stopTimer(key) {
        if (this._timers[key]) {
            clearInterval(this._timers[key]);
            delete this._timers[key];
        }
        delete this._secs[key];
        delete this._timerPaused[key];
    },

    // Добавить секунды к общему времени
    addTime(key, seconds) {
        if (!seconds || seconds <= 0) return;
        seconds = Math.round(seconds); // целые секунды
        if (seconds <= 0) return;
        const cur = parseInt(localStorage.getItem(`stat_time_${key}`) || 0);
        localStorage.setItem(`stat_time_${key}`, cur + seconds);
        this._logDailyTime(seconds);
    },

    // Трекинг времени через timeupdate события
    trackAudioTime(audioEl, timeKey) {
        let _lastTime = null;
        let _accumulator = 0; // накопитель дробных секунд
        audioEl.addEventListener('timeupdate', () => {
            if (!audioEl.paused && _lastTime !== null) {
                const delta = audioEl.currentTime - _lastTime;
                if (delta > 0 && delta < 2) {
                    _accumulator += delta;
                    if (_accumulator >= 1) {
                        const whole = Math.floor(_accumulator);
                        this.addTime(timeKey, whole);
                        _accumulator -= whole;
                    }
                }
            }
            _lastTime = audioEl.paused ? null : audioEl.currentTime;
        });
        audioEl.addEventListener('pause', () => { _lastTime = null; });
        audioEl.addEventListener('ended', () => {
            // Сбрасываем остаток при завершении
            if (_accumulator >= 0.5) this.addTime(timeKey, 1);
            _accumulator = 0;
            _lastTime = null;
        });
    },

    // Инкремент счётчика
    inc(key) {
        const cur = parseInt(localStorage.getItem(`stat_${key}`) || 0);
        localStorage.setItem(`stat_${key}`, cur + 1);
        this._logDailyAnswer();
        // Проверяем значки
        if (typeof Badges !== 'undefined') Badges.checkAll();
    },

    get(key) { return parseInt(localStorage.getItem(`stat_${key}`) || 0); },
    getTime(key) { return parseInt(localStorage.getItem(`stat_time_${key}`) || 0); },

    // Форматирование времени
    fmtDuration(secs) {
        secs = Math.floor(secs);
        if (secs < 60) return secs + ' сек';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h} ч ${m} мин`;
        return `${m} мин ${s > 0 ? s + ' сек' : ''}`.trim();
    },

    // Сохранить достижение
    recordAchievement(section, count) {
        const key = `stat_ach_${section}`;
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        const milestone = String(count);
        data[milestone] = (data[milestone] || 0) + 1;
        localStorage.setItem(key, JSON.stringify(data));
    },

    getAchievements(section) {
        return JSON.parse(localStorage.getItem(`stat_ach_${section}`) || '{}');
    },

    // Сброс всех статов
    resetAll() {
        const keys = [
            'stat_songs','stat_letters','stat_numbers','stat_colors',
            'stat_puzzles','stat_riddles','stat_words','stat_math',
            'stat_time_songs','stat_time_podcasts',
            'stat_ach_puzzles','stat_ach_riddles',
            'achievements_best',
            'badges_unlocked',
            'viewed_letters','viewed_numbers','viewed_colors',
            'stat_interstitials','inter_best_streak',
            'stat_daily_log','stat_daily_migrated',
            'tried_songs','tried_podcasts','tried_puzzles','tried_riddles'
        ];
        keys.forEach(k => localStorage.removeItem(k));
    },

    // Считаем текущую серию дней подряд (включая сегодня)
    getDayStreak() {
        const log = this._getDailyLog();
        const today = new Date();
        today.setHours(0,0,0,0);
        let streak = 0;
        for (let i = 0; i < 400; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
            const entry = log[k];
            if (entry && ((entry.answers || 0) > 0 || (entry.time || 0) > 0)) {
                streak++;
            } else {
                // Если сегодня ещё ничего — допускаем (день не кончился), считаем от вчера
                if (i === 0) continue;
                break;
            }
        }
        return streak;
    }
};

