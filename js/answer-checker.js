// =============================================
// FUZZY ANSWER CHECKER
// =============================================
const AnswerChecker = {
    // Нормализация: е↔ё, и↔й, регистр, лишние пробелы
    _norm(s) {
        return s.trim().toLowerCase()
            .replace(/ё/g, 'е')
            .replace(/й/g, 'и')
            .replace(/\s+/g, ' ');
    },

    // Русский стеммер — обрезаем окончания/суффиксы
    // Возвращает основу слова (минимум 3 буквы)
    _stem(w) {
        if (w.length <= 3) return w;
        // Уменьшительно-ласкательные суффиксы (убираем перед окончаниями)
        const diminutive = [
            'еньк','оньк','ышк','ушк','юшк','ишк','чик','щик',
            'ёнок','онок','ёнк','инк','очк','ечк','ичк','ник','ок','ёк'
        ];
        let stem = w;
        for (const suf of diminutive) {
            if (stem.endsWith(suf) && stem.length - suf.length >= 3) {
                stem = stem.slice(0, -suf.length);
                break;
            }
        }
        // Падежные окончания (с учётом мягкого знака)
        // Дубли убраны: ами/ями×3→1, ах/ях×2→1, ой×3→1, ей×3→1
        const endings = [
            'ами','ями','ого','его','ому','ему',
            'ую','юю','ых','их','ев','ов',
            'ий','ый','ая','яя',
            'ом','ем','ые','ие','ью',
            'ам','ям','ах','ях',
            'ат','ят','ут','ют','ит','ет',
            'ся','сь','ой','ей',
            'е','и','у','а','я','ю','ь','й'
        ];
===================================
// FUZZY ANSWER CHECKER
// =============================================
const AnswerChecker = {
    // Нормализация: е↔ё, и↔й, регистр, лишние пробелы
    _norm(s) {
        return s.trim().toLowerCase()
            .replace(/ё/g, 'е')
            .replace(/й/g, 'и')
            .replace(/\s+/g, ' ');
    },

    // Русский стеммер — обрезаем окончания/суффиксы
    // Возвращает основу слова (минимум 3 буквы)
    _stem(w) {
        if (w.length <= 3) return w;
        // Уменьшительно-ласкательные суффиксы (убираем перед окончаниями)
        const diminutive = [
            'еньк','оньк','ышк','ушк','юшк','ишк','чик','щик',
            'ёнок','онок','ёнк','инк','очк','ечк','ичк','ник','ок','ёк'
        ];
        let stem = w;
        for (const suf of diminutive) {
            if (stem.endsWith(suf) && stem.length - suf.length >= 3) {
                stem = stem.slice(0, -suf.length);
                break;
            }
        }
        // Падежные окончания (с учётом мягкого знака)
        const endings = [
            'ами','ями','ого','его','ому','ему','ой','ей',
            'ую','юю','ых','их','ах','ях','ев','ов',
            'ами','ями','ий','ый','ая','яя',
            'ом','ем','ые','ие','ью','ей','ой',
            'ам','ям','ах','ях',
            'ат','ят','ут','ют','ит','ет',
            'ся','сь',
            'ах','ях','ей','ой','ой',
            'ами','ями',
            'ов','ев','ей',
            'е','и','у','а','я','ю','ь','й'
        ];
        for (const end of endings) {
            if (stem.endsWith(end) && stem.length - end.length >= 3) {
                stem = stem.slice(0, -end.length);
                break;
            }
        }
        return stem;
    },

    // Основная проверка
    // Возвращает: 'exact' | 'fuzzy' | 'wrong'
    check(input, answer) {
        const a = this._norm(input);
        const b = this._norm(answer);

        // 1. Точное совпадение после нормализации
        if (a === b) return 'exact';

        // 2. Многословный ответ — проверяем каждое слово
        const wordsA = a.split(' ');
        const wordsB = b.split(' ');

        // Для каждого слова ответа проверяем нечёткое совпадение
        const allMatch = wordsB.every(wb => {
            return wordsA.some(wa => this._wordMatch(wa, wb));
        });
        if (allMatch) return 'fuzzy';

        // 3. Частичное — если ввёл одно слово из многословного ответа
        if (wordsB.length > 1 && wordsA.length === 1) {
            const anyMatch = wordsB.some(wb => this._wordMatch(wordsA[0], wb));
            if (anyMatch) return 'fuzzy';
        }

        return 'wrong';
    },

    _wordMatch(a, b) {
        if (a === b) return true;
        const sa = this._stem(a);
        const sb = this._stem(b);
        // Совпадение основ
        if (sa === sb) return true;
        // Одна основа начинается с другой (минимум 3 буквы)
        const minLen = Math.min(sa.length, sb.length);
        if (minLen >= 3 && (sa.startsWith(sb.slice(0,minLen)) || sb.startsWith(sa.slice(0,minLen)))) return true;
        // Расстояние Левенштейна ≤ 1 для коротких слов, ≤ 2 для длинных
        const dist = this._levenshtein(sa, sb);
        const threshold = sa.length <= 5 ? 1 : 2;
        return dist <= threshold;
    },

    _levenshtein(a, b) {
        if (Math.abs(a.length - b.length) > 3) return 99;
        const m = a.length, n = b.length;
        const dp = Array.from({length: m+1}, (_,i) => [i, ...Array(n).fill(0)]);
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++)
            for (let j = 1; j <= n; j++)
                dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
                    : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        return dp[m][n];
    }
};
