import { format, parseISO, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export const isGraphableType = (type) => ['yes_no', 'multiple_choice', 'number'].includes(type);

// Add windowSize parameter (default to 7 if not provided)
export const calculateYesNoRollingAnswerAverage = (history, questionId, windowSize = 7) => {
    const relevantHistory = history.filter(item => item.answers[questionId] !== undefined).sort((a, b) => parseISO(a.submittedAt) - parseISO(b.submittedAt));
    // Ensure windowSize is at least 1
    const size = Math.max(1, windowSize);
    if (relevantHistory.length < size) return []; // Need enough data for the window
    const data = [];
    // Start iteration from the point where a full window is available
    for (let i = size - 1; i < relevantHistory.length; i++) {
        const windowItems = relevantHistory.slice(i - size + 1, i + 1); // Correct slice indices
        const yesCount = windowItems.filter(item => item.answers[questionId] === 'yes').length;
        const totalCount = windowItems.length;
        const yesRate = totalCount > 0 ? (yesCount / totalCount) * 100 : 0;
        data.push({ date: format(parseISO(relevantHistory[i].submittedAt), 'yyyy-MM-dd'), yesRate: yesRate });
    }
    return data;
};

// Add windowSize parameter (default to 7 if not provided)
export const calculateMultipleChoiceRollingAnswerAverage = (history, questionId, options, windowSize = 7) => {
    const relevantHistory = history.filter(item => item.answers[questionId] !== undefined).sort((a, b) => parseISO(a.submittedAt) - parseISO(b.submittedAt));
    // Ensure windowSize is at least 1
    const size = Math.max(1, windowSize);
    if (relevantHistory.length < size) return []; // Need enough data for the window
    const data = [];
     // Start iteration from the point where a full window is available
    for (let i = size - 1; i < relevantHistory.length; i++) {
        const windowItems = relevantHistory.slice(i - size + 1, i + 1); // Correct slice indices
        const totalCount = windowItems.length;
        const point = { date: format(parseISO(relevantHistory[i].submittedAt), 'yyyy-MM-dd') };
        (options || []).forEach(option => {
            const optionCount = windowItems.filter(item => item.answers[questionId] === option).length;
            point[option] = totalCount > 0 ? (optionCount / totalCount) * 100 : 0;
        });
        data.push(point);
    }
    return data;
};

export const prepareNumberData = (history, questionId, endDate, days = 30) => {
    const startDate = subDays(endDate, days - 1);
    const relevantHistory = history
        .map(item => ({ ...item, date: startOfDay(parseISO(item.submittedAt)) }))
        .filter(item => isWithinInterval(item.date, { start: startDate, end: endOfDay(endDate) }))
        .filter(item => item.answers[questionId] !== undefined && !isNaN(Number(item.answers[questionId])))
        .sort((a, b) => a.date - b.date);
    const data = relevantHistory.map(item => ({ date: format(item.date, 'yyyy-MM-dd'), value: Number(item.answers[questionId]) }));
    const dailyDataMap = new Map();
    data.forEach(item => { if (!dailyDataMap.has(item.date)) { dailyDataMap.set(item.date, { sum: 0, count: 0 }); } const dayStat = dailyDataMap.get(item.date); dayStat.sum += item.value; dayStat.count += 1; });
    const averagedData = Array.from(dailyDataMap.entries()).map(([date, stat]) => ({ date: date, value: stat.sum / stat.count })).sort((a,b) => new Date(a.date) - new Date(b.date));
    return averagedData;
};
