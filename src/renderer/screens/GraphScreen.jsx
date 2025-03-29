import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { subDays, format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'; // date-fns for date manipulation

// Helper to get question details by ID
const getQuestionById = (checklist, questionId) => {
  return checklist?.questions?.find(q => q.id === questionId);
};

// --- Data Processing Functions for Graphs (Revised for Answer-Based Rolling Window) ---

// Calculate rolling average based on the last 7 answers for Yes/No questions
const calculateYesNoRollingAnswerAverage = (history, questionId) => {
  // 1. Filter history for the specific question and sort by date
  const relevantHistory = history
    .filter(item => item.answers[questionId] !== undefined) // Only include entries where this question was answered
    .sort((a, b) => parseISO(a.submittedAt) - parseISO(b.submittedAt)); // Sort by submission time

  // 2. Check if enough data exists
  if (relevantHistory.length < 7) return [];

  const data = [];
  // 3. Iterate through the history, starting from the 7th answer
  for (let i = 6; i < relevantHistory.length; i++) {
    // 4. Define the window of the last 7 answers (indices i-6 to i)
    const windowItems = relevantHistory.slice(i - 6, i + 1);

    // 5. Calculate stats within the window
    const yesCount = windowItems.filter(item => item.answers[questionId] === 'yes').length;
    const totalCount = windowItems.length; // Already filtered, so length is the count
    const yesRate = totalCount > 0 ? (yesCount / totalCount) * 100 : 0;

    // 6. Add data point using the date of the last answer in the window
    data.push({
      date: format(parseISO(relevantHistory[i].submittedAt), 'yyyy-MM-dd'), // Date of the 7th answer in the window
      yesRate: yesRate,
    });
  }

  // Note: If multiple answers occur on the same date, this logic might create multiple points
  // for that date. Depending on desired behavior, further aggregation might be needed,
  // but for now, we plot each 7-answer window's result.
  return data;
};

// Calculate rolling probability based on the last 7 answers for Multiple Choice questions
const calculateMultipleChoiceRollingAnswerAverage = (history, questionId, options) => {
  // 1. Filter and sort history
  const relevantHistory = history
    .filter(item => item.answers[questionId] !== undefined)
    .sort((a, b) => parseISO(a.submittedAt) - parseISO(b.submittedAt));

  // 2. Check for enough data
  if (relevantHistory.length < 7) return [];

  const data = [];
  // 3. Iterate from the 7th answer
  for (let i = 6; i < relevantHistory.length; i++) {
    // 4. Define the 7-answer window
    const windowItems = relevantHistory.slice(i - 6, i + 1);

    // 5. Calculate probabilities within the window
    const totalCount = windowItems.length;
    const point = { date: format(parseISO(relevantHistory[i].submittedAt), 'yyyy-MM-dd') };

    options.forEach(option => {
      const optionCount = windowItems.filter(item => item.answers[questionId] === option).length;
      point[option] = totalCount > 0 ? (optionCount / totalCount) * 100 : 0; // Probability as percentage
    });
    data.push(point);
  }

  return data;
};


// Prepare data for Number questions (daily values) - Stays the same (time-based)
// Added timePeriod parameter back for this specific graph type
const prepareNumberData = (history, questionId, endDate, days = 30) => {
    const startDate = subDays(endDate, days - 1);
    const relevantHistory = history
        .map(item => ({ ...item, date: startOfDay(parseISO(item.submittedAt)) }))
        .filter(item => isWithinInterval(item.date, { start: startDate, end: endOfDay(endDate) }))
        .filter(item => item.answers[questionId] !== undefined && !isNaN(Number(item.answers[questionId]))) // Ensure answer exists and is a number
        .sort((a, b) => a.date - b.date);

  const data = relevantHistory.map(item => ({
    date: format(item.date, 'yyyy-MM-dd'),
    value: Number(item.answers[questionId]),
  }));

   // If multiple entries exist for the same day, average them (or take last, first etc.)
   const dailyDataMap = new Map();
   data.forEach(item => {
       if (!dailyDataMap.has(item.date)) {
           dailyDataMap.set(item.date, { sum: 0, count: 0 });
       }
       const dayStat = dailyDataMap.get(item.date);
       dayStat.sum += item.value;
       dayStat.count += 1;
   });

   const averagedData = Array.from(dailyDataMap.entries()).map(([date, stat]) => ({
       date: date,
       value: stat.sum / stat.count,
   })).sort((a,b) => new Date(a.date) - new Date(b.date)); // Ensure sorted by date again


  return averagedData;
};

// Predefined colors for lines in multi-line charts
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];


function GraphScreen({ history, checklist }) {
  // Keep timePeriod state for Number graphs if needed, or remove if all graphs are answer-based
  const [timePeriod, setTimePeriod] = useState(30);
  const today = useMemo(() => new Date(), []);

  // Filter questions suitable for graphing
  const graphableQuestions = useMemo(() => {
    return checklist?.questions?.filter(q =>
      q.type === 'yes_no' || q.type === 'multiple_choice' || q.type === 'number'
    ) || [];
  }, [checklist]);

  // Generate data for each graphable question based on the selected time period
  const graphData = useMemo(() => {
    if (!history || history.length === 0 || !checklist) return {};

    const data = {};
    graphableQuestions.forEach(q => {
      try {
        if (q.type === 'yes_no') {
          // Use the new answer-based function
          data[q.id] = calculateYesNoRollingAnswerAverage(history, q.id);
        } else if (q.type === 'multiple_choice') {
          // Use the new answer-based function
          data[q.id] = calculateMultipleChoiceRollingAnswerAverage(history, q.id, q.options || []);
        } else if (q.type === 'number') {
          // Keep using the time-based function for number graphs
          data[q.id] = prepareNumberData(history, q.id, today, timePeriod);
        }
      } catch (error) {
          console.error(`Error processing data for question ${q.id} (${q.text}):`, error);
          data[q.id] = []; // Assign empty array on error
      }
    });
    return data;
  }, [history, checklist, graphableQuestions, timePeriod, today]);


  if (!checklist || !checklist.questions || checklist.questions.length === 0) {
    return <div className="screen-container"><h2 className="screen-title">グラフ</h2><p>グラフを表示するためのチェックリスト設定がありません。</p></div>;
  }
  if (history.length === 0) {
     return <div className="screen-container"><h2 className="screen-title">グラフ</h2><p>グラフを表示するための回答履歴がありません。</p></div>;
  }
   if (graphableQuestions.length === 0) {
     return <div className="screen-container"><h2 className="screen-title">グラフ</h2><p>グラフ化可能な質問（Yes/No, n択, 数値）がチェックリストにありません。</p></div>;
  }


  return (
    <div className="screen-container graph-screen">
      <h2 className="screen-title">グラフ</h2>

      {/* Remove or modify time period controls if only number graphs use it */}
      {graphableQuestions.some(q => q.type === 'number') && (
          <div className="graph-controls">
              <label>
                  数値グラフの表示期間:
                  <select value={timePeriod} onChange={(e) => setTimePeriod(Number(e.target.value))}>
                      <option value={30}>直近 1ヶ月</option>
                      <option value={90}>直近 3ヶ月</option>
                      <option value={365}>直近 1年</option>
                      <option value={9999}>全期間</option>
                  </select>
              </label>
          </div>
      )}

      <div className="graphs-container">
        {graphableQuestions.map((q, index) => {
          const data = graphData[q.id];
           if (!data || data.length === 0) {
               return (
                   <div key={q.id} className="chart-container no-data">
                       <h3>{q.text}</h3>
                       <p>表示期間内に十分なデータがありません。</p>
                   </div>
               );
           }

          return (
            <div key={q.id} className="chart-container">
              <h3>{q.text}</h3>
              <ResponsiveContainer width="100%" height={300}>
                {q.type === 'yes_no' && (
                  <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Yes率 (%)', angle: -90, position: 'insideLeft' }} domain={[0, 100]}/>
                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                    <Legend />
                    {/* Update legend name */}
                    <Line type="monotone" dataKey="yesRate" name="Yes率 (直近7回答)" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                )}
                {q.type === 'multiple_choice' && (
                  <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: '選択率 (%)', angle: -90, position: 'insideLeft' }} domain={[0, 100]}/>
                     <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                    <Legend />
                    {q.options?.map((option, optIndex) => (
                      <Line
                        key={option}
                        type="monotone"
                        dataKey={option}
                        /* Update legend name */ // Correct JSX comment syntax
                        name={`${option} (直近7回答)`}
                        stroke={COLORS[optIndex % COLORS.length]} // Cycle through predefined colors
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                )}
                {q.type === 'number' && (
                  <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: '値', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    {/* Legend name for number graph remains the same */}
                    <Line type="monotone" dataKey="value" name="日々の値" stroke="#82ca9d" activeDot={{ r: 8 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GraphScreen;

// Add some basic styling for GraphScreen
const styles = `
.graph-screen .graph-controls {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}
.graph-screen .graph-controls label {
  margin-right: 15px;
}
.graph-screen .graphs-container {
  display: flex;
  flex-direction: column;
  gap: 30px; /* Space between charts */
}
.graph-screen .chart-container {
  background-color: #fff;
  padding: 20px;
  border-radius: 5px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.graph-screen .chart-container h3 {
  margin-bottom: 15px;
  text-align: center;
  font-size: 1.1em;
  color: #333;
}
.graph-screen .chart-container.no-data {
    text-align: center;
    color: #888;
    padding: 40px 20px;
}
/* Ensure recharts tooltips are visible */
.recharts-tooltip-wrapper {
  z-index: 1000 !important; /* Ensure tooltip is on top */
  background: rgba(255, 255, 255, 0.9) !important;
  border: 1px solid #ccc !important;
  border-radius: 4px !important;
  padding: 10px !important;
}
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
