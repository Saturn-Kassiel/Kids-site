// =============================================
// STATS — Статистика и графики
// =============================================
const Stats = {
    _showAnswers: true,
    _showTime: true,
    _showHourlyA: true,
    _showHourlyT: true,
    _chartPeriod: 'week',

    show() {
        App.navigate('stats', 'Статистика');
        this._render();
        this._syncMetricTabs();
        this._syncHourlyMetricTabs();
        this._renderChart();
        this._renderHourlyChart();
    },

    toggleMetric(metric) {
        if (metric === 'answers') this._showAnswers = !this._showAnswers;
        if (metric === 'time') this._showTime = !this._showTime;
        // Хотя бы одна метрика должна быть включена
        if (!this._showAnswers && !this._showTime) {
            if (metric === 'answers') this._showTime = true;
            else this._showAnswers = true;
        }
        this._syncMetricTabs();
        this._renderChart();
    },

    _syncMetricTabs() {
        const tabs = document.getElementById('chart-metric-tabs');
        if (!tabs) return;
        tabs.querySelector('[data-metric="answers"]')?.classList.toggle('active', this._showAnswers);
        tabs.querySelector('[data-metric="time"]')?.classList.toggle('active', this._showTime);
    },

    setChartPeriod(period) {
        this._chartPeriod = period;
        document.querySelectorAll('#chart-period-tabs .chart-period').forEach(b => {
            b.classList.toggle('active', b.dataset.period === period);
        });
        const metricTabs = document.getElementById('chart-metric-tabs');
        if (metricTabs) metricTabs.style.display = '';
        this._renderChart();
    },

    toggleHourlyMetric(metric) {
        if (metric === 'answers') this._showHourlyA = !this._showHourlyA;
        if (metric === 'time') this._showHourlyT = !this._showHourlyT;
        if (!this._showHourlyA && !this._showHourlyT) {
            if (metric === 'answers') this._showHourlyT = true;
            else this._showHourlyA = true;
        }
        this._syncHourlyMetricTabs();
        this._renderHourlyChart();
    },

    _syncHourlyMetricTabs() {
        const tabs = document.getElementById('hourly-metric-tabs');
        if (!tabs) return;
        tabs.querySelector('[data-metric="answers"]')?.classList.toggle('active', this._showHourlyA);
        tabs.querySelector('[data-metric="time"]')?.classList.toggle('active', this._showHourlyT);
    },

    toggleInfo() {
        const box = document.getElementById('chart-info-box');
        if (box) box.classList.toggle('hidden');
    },

    // Время без единиц для графика (Day view value)
    _fmtTimeShort(sec) {
        sec = Math.round(sec);
        if (sec >= 3600) {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            return m > 0 ? h + ':' + String(m).padStart(2,'0') : h + ':00';
        }
        if (sec >= 60) {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return m + ':' + String(s).padStart(2,'0');
        }
        return '0:' + String(sec).padStart(2,'0');
    },

    // Подсказка над столбиком — компактная, без единиц
    _fmtTimeTip(sec) {
        sec = Math.round(sec);
        if (sec >= 3600) return Math.floor(sec / 3600) + ':' + String(Math.floor((sec%3600)/60)).padStart(2,'0');
        if (sec >= 60) return Math.floor(sec / 60) + ':' + String(sec%60).padStart(2,'0');
        return '0:' + String(sec).padStart(2,'0');
    },

    // Полный формат с единицами (для карточек статистики)
    _fmtTimeLabel(sec) {
        sec = Math.round(sec);
        if (sec >= 3600) {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            return m > 0 ? h + ' ч ' + m + ' мин' : h + ' ч';
        }
        if (sec >= 60) {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return s > 0 ? m + ' мин ' + s + ' сек' : m + ' мин';
        }
        return sec + ' сек';
    },

    // Форматирование подписи периода
    _getPeriodLabel(period, data) {
        const MONTH_FULL = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
        const MONTH_NOM = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
        const pad = n => String(n).padStart(2, '0');

        if (period === 'day') {
            const d = (data[0] && data[0].date) || new Date();
            return pad(d.getDate()) + ' ' + MONTH_FULL[d.getMonth()] + ' ' + d.getFullYear();
        }
        if (period === 'week') {
            const first = data[0]?.date || new Date();
            const last = data[data.length - 1]?.date || new Date();
            if (first.getMonth() === last.getMonth()) {
                return pad(first.getDate()) + '–' + pad(last.getDate()) + ' ' + MONTH_FULL[first.getMonth()] + ' ' + first.getFullYear();
            }
            return pad(first.getDate()) + ' ' + MONTH_FULL[first.getMonth()] + ' – ' + pad(last.getDate()) + ' ' + MONTH_FULL[last.getMonth()] + ' ' + last.getFullYear();
        }
        if (period === 'month') {
            const d = new Date();
            return MONTH_NOM[d.getMonth()] + ' ' + d.getFullYear();
        }
        // all
        const first = data[0]?.date || new Date();
        const last = data[data.length - 1]?.date || data[data.length - 1]?.dateEnd || new Date();
        return pad(first.getDate()) + ' ' + MONTH_FULL[first.getMonth()] + ' ' + first.getFullYear() + ' – ' + pad(last.getDate()) + ' ' + MONTH_FULL[last.getMonth()] + ' ' + last.getFullYear();
    },

    _renderChart() {
        const barsEl = document.getElementById('chart-bars');
        const labelsEl = document.getElementById('chart-labels');
        if (!barsEl || !labelsEl) return;

        const data = StatTracker.getDailyData(this._chartPeriod);
        const DAY_NAMES = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
        const MONTH_NAMES = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
        const areaEl = barsEl.parentElement;

        // Убираем старый day footer если был
        const dayFooter2 = areaEl.querySelector('.chart-day-footer');
        if (dayFooter2) dayFooter2.remove();

        labelsEl.style.display = '';

        const answersVals = data.map(d => d.answers || 0);
        const timeVals = data.map(d => Math.round(d.time || 0));

        const maxAnswers = Math.max(...answersVals, 1);
        const maxTime = Math.max(...timeVals, 1);

        const isDay = this._chartPeriod === 'day';
        const isMonth = this._chartPeriod === 'month';
        const showA = this._showAnswers;
        const showT = this._showTime;

        // Если время включено, но данных нет — показываем только ответы
        const hasAnyTime = timeVals.some(v => v > 0);
        const hasAnyAnswers = answersVals.some(v => v > 0);
        // Всегда уважаем выбор пользователя — если таб включён, показываем столбик
        let effectiveShowT = showT;
        let effectiveShowA = showA;
        // Если оба выключены — показываем ответы
        if (!effectiveShowA && !effectiveShowT) effectiveShowA = true;
        const dualMode = effectiveShowA && effectiveShowT;

        const labelStep = isMonth ? Math.ceil(data.length / 7) : 1;
        const isDense = isMonth;
        const isWide = (data.length <= 10 && this._chartPeriod === 'all') || isDay;

        let barsHTML = '';
        let labelsHTML = '';

        const chartHeight = 84; // px — matches .chart-bars height

        data.forEach((d, i) => {
            const isToday = d.isToday;
            const a = answersVals[i];
            const t = timeVals[i];

            // В месяце скрываем подписи данных
            const hideTips = isMonth;

            if (dualMode) {
                const hA = maxAnswers > 0 ? Math.max(Math.round((a / maxAnswers) * chartHeight), a > 0 ? 5 : 0) : 0;
                const hT = maxTime > 0 ? Math.max(Math.round((t / maxTime) * chartHeight), t > 0 ? 5 : 0) : 0;
                // Минимальная видимая высота placeholder когда данных нет
                const hAvis = hA > 0 ? hA : (a > 0 ? 5 : (hasAnyAnswers ? 0 : 2));
                const hTvis = hT > 0 ? hT : (t > 0 ? 5 : (hasAnyTime ? 0 : 2));
                const tipA = !hideTips && (!isDense || isToday) && a > 0 ? a : '';
                const tipT = !hideTips && (!isDense || isToday) && t > 0 ? this._fmtTimeTip(t) : '';

                barsHTML += `<div class="chart-bar-wrap ${isToday ? 'today' : ''}">
                    <div class="chart-dual-slot">
                        <div class="chart-dual-col">
                            <div class="chart-bar-tip">${tipA}</div>
                            <div class="chart-bar chart-bar-a" style="height:${hAvis}px"></div>
                        </div>
                        <div class="chart-dual-col">
                            <div class="chart-bar-tip">${tipT}</div>
                            <div class="chart-bar chart-bar-t" style="height:${hTvis}px"></div>
                        </div>
                    </div>
                </div>`;
            } else if (effectiveShowA) {
                const h = maxAnswers > 0 ? Math.max(Math.round((a / maxAnswers) * chartHeight), a > 0 ? 5 : 0) : 0;
                const tip = !hideTips && (!isDense || isToday) && a > 0 ? a : '';
                barsHTML += `<div class="chart-bar-wrap ${isToday ? 'today' : ''}">
                    <div class="chart-bar-tip">${tip}</div>
                    <div class="chart-bar chart-bar-a" style="height:${h}px"></div>
                </div>`;
            } else {
                const h = maxTime > 0 ? Math.max(Math.round((t / maxTime) * chartHeight), t > 0 ? 5 : 0) : 0;
                const hVis = h === 0 && !hasAnyTime && isToday ? 2 : h;
                const tip = !hideTips && (!isDense || isToday) && t > 0 ? this._fmtTimeTip(t) : '';
                barsHTML += `<div class="chart-bar-wrap ${isToday ? 'today' : ''}">
                    <div class="chart-bar-tip">${tip}</div>
                    <div class="chart-bar chart-bar-t" style="height:${hVis}px"></div>
                </div>`;
            }

            // Метки оси X
            let label = '';
            if (isDay) {
                label = DAY_NAMES[d.date.getDay()];
            } else if (this._chartPeriod === 'week') {
                label = DAY_NAMES[d.date.getDay()];
            } else if (isMonth) {
                if (i % labelStep === 0 || i === data.length - 1) label = d.date.getDate();
            } else {
                if (d.dateEnd) {
                    const s = d.date.getDate() + ' ' + MONTH_NAMES[d.date.getMonth()];
                    label = data.length <= 12 ? s : (i % 2 === 0 ? s : '');
                } else {
                    if (i === 0 || i === data.length - 1 || i % 7 === 0) {
                        label = d.date.getDate() + '.' + String(d.date.getMonth() + 1).padStart(2, '0');
                    }
                }
            }
            labelsHTML += `<div class="chart-label ${isToday ? 'today' : ''}">${label}</div>`;
        });

        barsEl.innerHTML = barsHTML;
        labelsEl.innerHTML = labelsHTML;

        // Широкие столбики
        barsEl.classList.toggle('chart-bars-wide', isWide);
        labelsEl.classList.toggle('chart-bars-wide', isWide);

        // ═══ Единый footer: легенда (лево) + период (право) ═══
        let footer = areaEl.querySelector('.chart-footer');
        if (!footer) {
            footer = document.createElement('div');
            footer.className = 'chart-footer';
            areaEl.appendChild(footer);
        }

        const periodLabel = this._getPeriodLabel(this._chartPeriod, data);
        let legendHTML = '';
        if (dualMode) {
            const timeDim = !hasAnyTime ? ' style="opacity:0.4"' : '';
            const dotDim = !hasAnyTime ? ';opacity:0.4' : '';
            legendHTML = `<span class="chart-legend-dot chart-legend-a"></span>ответы<span class="chart-legend-dot chart-legend-t" style="margin-left:8px${dotDim}"></span><span${timeDim}>время</span>`;
        } else if (effectiveShowA) {
            legendHTML = '<span class="chart-legend-dot chart-legend-a"></span>ответы';
        } else if (effectiveShowT) {
            const timeDim = !hasAnyTime ? ' style="opacity:0.4"' : '';
            const dotDim = !hasAnyTime ? ';opacity:0.4' : '';
            legendHTML = `<span class="chart-legend-dot chart-legend-t" style="margin-left:0${dotDim}"></span><span${timeDim}>время</span>`;
        }
        footer.innerHTML = `<div class="chart-footer-legend">${legendHTML}</div><div class="chart-footer-period">${periodLabel}</div>`;
        footer.style.display = '';

        // Убираем старую легенду если была
        const existingLegend = areaEl.querySelector('.chart-legend');
        if (existingLegend) existingLegend.remove();

        requestAnimationFrame(() => {
            barsEl.querySelectorAll('.chart-bar').forEach(bar => {
                const h = bar.style.height;
                bar.style.height = '0px';
                requestAnimationFrame(() => { bar.style.height = h; });
            });
        });
    },

    _renderHourlyChart() {
        const barsEl = document.getElementById('hourly-bars');
        const labelsEl = document.getElementById('hourly-labels');
        const card = document.getElementById('hourly-chart-card');
        if (!barsEl || !labelsEl) return;

        const data = StatTracker.getHourlyData();
        const nowHour = new Date().getHours();

        // Подсвечиваем текущее время суток
        const timeRange = nowHour < 6 ? 'night' : nowHour < 12 ? 'morning' : nowHour < 18 ? 'day' : 'evening';
        document.querySelectorAll('#hourly-period-tabs .hourly-period').forEach(el => {
            el.classList.toggle('active', el.dataset.range === timeRange);
        });

        const answersVals = data.map(d => d.answers);
        const timeVals = data.map(d => d.time);
        const hasAnyAnswers = answersVals.some(v => v > 0);
        const hasAnyTime = timeVals.some(v => v > 0);
        const hasAny = hasAnyAnswers || hasAnyTime;

        // Скрываем карточку если нет данных за сегодня
        if (card) card.style.display = hasAny ? '' : 'none';
        if (!hasAny) return;

        const showA = this._showHourlyA;
        const showT = this._showHourlyT;
        const dualMode = showA && showT;
        const maxA = Math.max(...answersVals, 1);
        const maxT = Math.max(...timeVals, 1);
        const chartH = 84;

        // Определяем активный диапазон (первый час с данными ... последний + 1)
        let firstActive = 24, lastActive = 0;
        data.forEach((d, i) => {
            if (d.answers > 0 || d.time > 0) {
                if (i < firstActive) firstActive = i;
                if (i > lastActive) lastActive = i;
            }
        });
        // Показываем ± 1 час от активного диапазона, минимум до текущего часа
        const rangeStart = Math.max(0, firstActive - 1);
        const rangeEnd = Math.min(23, Math.max(lastActive + 1, nowHour));
        const sliced = data.slice(rangeStart, rangeEnd + 1);

        let barsHTML = '';
        let labelsHTML = '';

        const labelStep = sliced.length > 12 ? 3 : sliced.length > 8 ? 2 : 1;

        sliced.forEach((d, i) => {
            const isCurrent = d.hour === nowHour;
            const a = d.answers;
            const t = d.time;

            if (dualMode) {
                const hA = maxA > 0 ? Math.max(Math.round((a / maxA) * chartH), a > 0 ? 4 : 0) : 0;
                const hT = maxT > 0 ? Math.max(Math.round((t / maxT) * chartH), t > 0 ? 4 : 0) : 0;
                const tipA = a > 0 ? a : '';
                const tipT = t > 0 ? this._fmtTimeTip(t) : '';
                barsHTML += `<div class="chart-bar-wrap today">
                    <div class="chart-dual-slot">
                        <div class="chart-dual-col">
                            <div class="chart-bar-tip">${tipA}</div>
                            <div class="chart-bar chart-bar-a" style="height:${hA}px"></div>
                        </div>
                        <div class="chart-dual-col">
                            <div class="chart-bar-tip">${tipT}</div>
                            <div class="chart-bar chart-bar-t" style="height:${hT}px"></div>
                        </div>
                    </div>
                </div>`;
            } else if (showA) {
                const h = maxA > 0 ? Math.max(Math.round((a / maxA) * chartH), a > 0 ? 4 : 0) : 0;
                barsHTML += `<div class="chart-bar-wrap today">
                    <div class="chart-bar-tip">${a > 0 ? a : ''}</div>
                    <div class="chart-bar chart-bar-a" style="height:${h}px"></div>
                </div>`;
            } else {
                const h = maxT > 0 ? Math.max(Math.round((t / maxT) * chartH), t > 0 ? 4 : 0) : 0;
                barsHTML += `<div class="chart-bar-wrap today">
                    <div class="chart-bar-tip">${t > 0 ? this._fmtTimeTip(t) : ''}</div>
                    <div class="chart-bar chart-bar-t" style="height:${h}px"></div>
                </div>`;
            }

            labelsHTML += `<div class="chart-label ${isCurrent ? 'today' : ''}">${(i % labelStep === 0 || isCurrent) ? d.hour + ':00' : ''}</div>`;
        });

        barsEl.innerHTML = barsHTML;
        labelsEl.innerHTML = labelsHTML;

        // Footer
        const areaEl = barsEl.parentElement;
        let footer = areaEl.querySelector('.chart-footer');
        if (!footer) {
            footer = document.createElement('div');
            footer.className = 'chart-footer';
            areaEl.appendChild(footer);
        }
        let legendHTML = '';
        if (dualMode) {
            const timeDim = !hasAnyTime ? ';opacity:0.4' : '';
            legendHTML = `<span class="chart-legend-dot chart-legend-a"></span>ответы<span class="chart-legend-dot chart-legend-t" style="margin-left:8px${timeDim}"></span>время`;
        } else if (showA) {
            legendHTML = '<span class="chart-legend-dot chart-legend-a"></span>ответы';
        } else {
            legendHTML = '<span class="chart-legend-dot chart-legend-t"></span>время';
        }
        const d = new Date();
        const dayNames = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
        const monthNames = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
        const dateLabel = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
        footer.innerHTML = `<div class="chart-footer-legend">${legendHTML}</div><div class="chart-footer-period">${dateLabel}</div>`;

        // Animate
        requestAnimationFrame(() => {
            barsEl.querySelectorAll('.chart-bar').forEach(bar => {
                const h = bar.style.height;
                bar.style.height = '0px';
                requestAnimationFrame(() => { bar.style.height = h; });
            });
            // Sync height with top chart card
            const topCard = document.querySelector('.stats-fixed .chart-card');
            if (topCard && card) {
                card.style.minHeight = topCard.offsetHeight + 'px';
            }
        });
    },

    shareMonth() {
        const name = getChildName();
        const now = new Date();
        const monthNames = ['января','февраля','марта','апреля','мая','июня',
                            'июля','августа','сентября','октября','ноября','декабря'];
        const monthTitle = monthNames[now.getMonth()] + ' ' + now.getFullYear();

        // Собираем статистику
        const puzzles = StatTracker.get('puzzles');
        const riddles = StatTracker.get('riddles');
        const words = StatTracker.get('words');
        const math = StatTracker.get('math');
        const songs = StatTracker.get('songs');
        const songsTime = StatTracker.getTime('songs');
        const podTime = StatTracker.getTime('podcasts');
        const interstitials = StatTracker.get('interstitials');
        const letters = StatTracker.get('letters');
        const numbers = StatTracker.get('numbers');
        const colors = StatTracker.get('colors');

        // Ежедневные данные за текущий месяц
        const log = StatTracker._getDailyLog();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        let activeDays = 0, monthAnswers = 0, monthTime = 0;
        for (let d = new Date(firstOfMonth); d <= now; d.setDate(d.getDate()+1)) {
            const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
            const entry = log[k];
            if (entry && (entry.answers > 0 || entry.time > 0)) {
                activeDays++;
                monthAnswers += entry.answers || 0;
                monthTime += entry.time || 0;
            }
        }

        const totalAnswers = puzzles + riddles + words + math + interstitials;
        const totalLearn = letters + numbers + colors;

        // Создаём canvas для картинки
        const W = 720, H = 1080;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Фон — градиент
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#011C40');
        grad.addColorStop(0.5, '#023859');
        grad.addColorStop(1, '#011C40');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Декоративные круги
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#A7EBF2';
        ctx.beginPath(); ctx.arc(600, 100, 200, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(100, 900, 180, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;

        // Заголовок
        ctx.textAlign = 'center';
        ctx.fillStyle = '#A7EBF2';
        ctx.font = 'bold 36px system-ui, sans-serif';
        ctx.fillText('Итоги ' + monthTitle, W/2, 70);

        if (name) {
            ctx.fillStyle = '#d4f0f5';
            ctx.font = '24px system-ui, sans-serif';
            ctx.fillText(name, W/2, 110);
        }

        // Линия-разделитель
        ctx.strokeStyle = 'rgba(167,235,242,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(60, 140); ctx.lineTo(W-60, 140); ctx.stroke();

        // Статы — строки
        const rows = [];
        if (activeDays > 0) rows.push({ icon: '📅', label: 'Активных дней', value: activeDays });
        if (totalAnswers > 0) rows.push({ icon: '✅', label: 'Правильных ответов', value: totalAnswers });
        if (puzzles > 0) rows.push({ icon: '🧩', label: 'Ребусов решено', value: puzzles });
        if (riddles > 0) rows.push({ icon: '❓', label: 'Загадок угадано', value: riddles });
        if (words > 0) rows.push({ icon: '🔤', label: 'Слов собрано', value: words });
        if (math > 0) rows.push({ icon: '➕', label: 'Примеров решено', value: math });
        if (interstitials > 0) rows.push({ icon: '⚡', label: 'Перебивок пройдено', value: interstitials });
        if (songs > 0) rows.push({ icon: '🎵', label: 'Песенок прослушано', value: songs });
        if (songsTime > 0) rows.push({ icon: '🎧', label: 'Время песенок', value: StatTracker.fmtDuration(songsTime) });
        if (podTime > 0) rows.push({ icon: '🎙️', label: 'Время подкастов', value: StatTracker.fmtDuration(podTime) });
        if (totalLearn > 0) rows.push({ icon: '📚', label: 'Просмотров обучения', value: totalLearn });

        if (rows.length === 0) {
            rows.push({ icon: '🌟', label: 'Начни заниматься', value: 'и тут появится статистика!' });
        }

        let y = 180;
        const rowH = 64;
        rows.forEach(r => {
            // Карточка-строка
            ctx.fillStyle = 'rgba(10,45,84,0.6)';
            this._roundRect(ctx, 50, y - 8, W - 100, rowH - 6, 16);
            ctx.fill();

            ctx.font = '28px system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#fff';
            ctx.fillText(r.icon, 72, y + 30);

            ctx.fillStyle = '#d4f0f5';
            ctx.font = '18px system-ui, sans-serif';
            ctx.fillText(r.label, 120, y + 28);

            ctx.textAlign = 'right';
            ctx.fillStyle = '#A7EBF2';
            ctx.font = 'bold 22px system-ui, sans-serif';
            ctx.fillText(String(r.value), W - 72, y + 30);

            y += rowH;
        });

        // Подпись внизу
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(167,235,242,0.3)';
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillText('Гоша — обучение и развитие', W/2, H - 30);

        // Показываем превью
        const dataURL = canvas.toDataURL('image/png');
        this._showMonthOverlay(dataURL);
    },

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },

    _showMonthOverlay(dataURL) {
        let overlay = document.getElementById('month-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'month-overlay';
        overlay.innerHTML = `
            <div class="month-card" id="month-card">
                <div class="month-card-header">
                    <span class="month-card-title">Итоги месяца</span>
                    <button class="month-close-btn" onclick="Stats._closeMonth()">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="month-preview-wrap">
                    <img class="month-preview-img" src="${dataURL}" alt="Итоги месяца">
                </div>
                <div class="month-card-btns">
                    <button class="month-share-btn" onclick="Stats._doShareMonth()">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                        Поделиться
                    </button>
                    <button class="month-download-btn" onclick="Stats._downloadMonth()">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Скачать
                    </button>
                    <button class="month-close-row-btn" onclick="Stats._closeMonth()">Закрыть</button>
                </div>
            </div>
        `;
        overlay.addEventListener('click', e => { if (e.target === overlay) Stats._closeMonth(); });
        document.body.appendChild(overlay);
        this._monthDataURL = dataURL;
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
            document.getElementById('month-card').classList.add('in');
        });
    },

    _closeMonth() {
        const overlay = document.getElementById('month-overlay');
        if (!overlay) return;
        const card = document.getElementById('month-card');
        if (card) card.classList.remove('in');
        overlay.classList.remove('visible');
        setTimeout(() => overlay.remove(), 350);
    },

    _doShareMonth() {
        if (!this._monthDataURL) return;
        // Конвертируем в blob
        fetch(this._monthDataURL).then(r => r.blob()).then(blob => {
            const file = new File([blob], 'gosha-itogi.png', { type: 'image/png' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'Итоги месяца — Гоша' }).catch(() => {});
            } else {
                // Fallback — скачиваем
                this._downloadMonth();
            }
        });
    },

    _downloadMonth() {
        if (!this._monthDataURL) return;
        const a = document.createElement('a');
        a.href = this._monthDataURL;
        a.download = 'gosha-itogi.png';
        a.click();
    },

    _render() {
        const el = id => document.getElementById(id);
        const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };
        const bar = (id, pct) => setTimeout(() => {
            const e = el(id);
            if (e) e.style.width = Math.min(pct, 100) + '%';
        }, 150);

        // ── Правильные ответы ──
        const puzzles = StatTracker.get('puzzles');
        const riddles = StatTracker.get('riddles');
        set('st-puzzles', puzzles);
        set('st-riddles', riddles);
        bar('sf-puzzles', puzzles / 50 * 100);
        bar('sf-riddles', riddles / 50 * 100);

        // ── Слова ──
        const words = StatTracker.get('words');
        set('st-words', words);
        bar('sf-words', words / 45 * 100);
        const hintsWords = StatTracker.getHints('words');
        set('st-hints-words', hintsWords > 0 ? '💡 ' + hintsWords + (hintsWords === 1 ? ' подсказка' : hintsWords < 5 ? ' подсказки' : ' подсказок') : '');

        // ── Арифметика ──
        const math = StatTracker.get('math');
        set('st-math', math);
        bar('sf-math', math / 50 * 100);
        const hintsMath = StatTracker.getHints('math');
        set('st-hints-math', hintsMath > 0 ? '💡 ' + hintsMath + (hintsMath === 1 ? ' подсказка' : hintsMath < 5 ? ' подсказки' : ' подсказок') : '');

        // ── Перебивки ──
        const interstitials = StatTracker.get('interstitials');
        set('st-interstitials', interstitials);
        bar('sf-interstitials', interstitials / 50 * 100);

        // ── Песенки ──
        const songs = StatTracker.get('songs');
        const songsTime = StatTracker.getTime('songs');
        set('st-songs', songs);
        set('st-songs-time', songsTime > 0 ? StatTracker.fmtDuration(songsTime) : '—');
        set('st-songs-time-card', songsTime > 0 ? StatTracker.fmtDuration(songsTime) : '—');
        bar('sf-songs', songs / 30 * 100);

        // ── Буквы / цифры / цвета ──
        const letters = StatTracker.get('letters');
        const numbers = StatTracker.get('numbers');
        const colors  = StatTracker.get('colors');
        set('st-letters', letters);
        set('st-numbers', numbers);
        set('st-colors',  colors);
        bar('sf-letters', letters / 33 * 100);
        bar('sf-numbers', numbers / 10 * 100);
        bar('sf-colors',  colors  / 10 * 100);

        // ── Подкасты ──
        const podTime = StatTracker.getTime('podcasts');
        set('st-podcasts-time', podTime > 0 ? StatTracker.fmtDuration(podTime) : '—');

        // ── Достижения Загадки ──
        this._renderAchievements('riddles', 'ach-riddles');
        // ── Достижения Ребусы ──
        this._renderAchievements('puzzles', 'ach-puzzles');
    },

    _renderAchievements(section, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const data = StatTracker.getAchievements(section);
        const milestones = [5, 10, 15, 20, 25, 30];
        let html = '';
        let hasAny = false;
        milestones.forEach(m => {
            const count = data[String(m)] || 0;
            if (count > 0) hasAny = true;
            html += `<div class="ach-stat-row ${count > 0 ? '' : 'ach-stat-empty'}">
                <span class="ach-stat-label">${m} подряд</span>
                <span class="ach-stat-val">${count > 0 ? '×' + count : '—'}</span>
            </div>`;
        });
        container.innerHTML = hasAny ? html : '<div class="ach-stat-none">Пока нет достижений</div>';
    },

    toggleLearn(type) {
        const acc = document.getElementById('acc-' + type);
        if (!acc) return;
        const isOpen = acc.classList.contains('open');

        // Закрываем все
        document.querySelectorAll('.learn-accordion.open').forEach(el => el.classList.remove('open'));
        document.querySelectorAll('.stat-learn-card.open').forEach(el => el.classList.remove('open'));

        if (!isOpen) {
            this._renderLearnDetails(type, acc);
            acc.classList.add('open');
            // Находим карточку-триггер
            acc.previousElementSibling?.classList.add('open');
        }
    },

    _renderLearnDetails(type, container) {
        const viewed = JSON.parse(localStorage.getItem(`viewed_${type}`) || '[]');

        const allItems = type === 'letters'
            ? 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('')
            : type === 'numbers'
            ? ['0','1','2','3','4','5','6','7','8','9']
            : ['Красный','Оранжевый','Жёлтый','Зелёный','Синий','Фиолетовый','Розовый','Голубой','Белый','Чёрный','Серый','Коричневый'];

        let html = '<div class="learn-detail-grid">';
        allItems.forEach(item => {
            const done = viewed.includes(item);
            html += `<span class="learn-item ${done ? 'done' : ''}">${item}</span>`;
        });
        html += '</div>';
        html += `<div class="learn-detail-summary">${viewed.length} из ${allItems.length} изучено</div>`;
        container.innerHTML = html;
    }
};
