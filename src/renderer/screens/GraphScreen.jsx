import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { isGraphableType } from '../utils/graphUtils';
import './GraphScreen.css'; // Import CSS

// Helper to get question details by ID (can also be moved to utils)
const getQuestionById = (checklist, questionId) => {
  return checklist?.questions?.find(q => q.id === questionId);
};

// Predefined colors for lines in multi-line charts
const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

// Receive graphData as a prop now
function GraphScreen({ history, checklist, graphData }) {

  // Filter questions based on graphConfig.enabled (using checklist prop)
  const graphableQuestions = useMemo(() => {
    return checklist?.questions?.filter(q =>
      isGraphableType(q.type) && q.graphConfig?.enabled
    ) || [];
  }, [checklist]);

  if (!checklist || !checklist.questions || checklist.questions.length === 0) {
    return <div className="screen-container"><h2 className="screen-title">グラフ</h2><p>グラフを表示するためのチェックリスト設定がありません。</p></div>;
  }
  if (history.length === 0) {
     return <div className="screen-container"><h2 className="screen-title">グラフ</h2><p>グラフを表示するための回答履歴がありません。</p></div>;
  }
   if (graphableQuestions.length === 0) {
     return <div className="screen-container"><h2 className="screen-title">グラフ</h2><p>グラフ表示が有効になっている質問がありません。「チェックリスト編集」画面で設定を確認してください。</p></div>;
  }


  return (
    <div className="screen-container graph-screen">
      <h2 className="screen-title">グラフ</h2>

      {/* Removed time period controls */}

      <div className="graphs-container">
        {graphableQuestions.map((q, index) => {
          const data = graphData ? graphData[q.id] : [];
           if (!data || data.length === 0) {
               // Use question text as title even if no data
               const graphTitle = q.text || `質問 ${index + 1}`;
               return (
                   <div key={q.id} className="chart-container no-data">
                       <h3>{graphTitle}</h3>
                       <p>表示期間内に十分なデータがありません。</p>
                   </div>
               );
           }
           // Use question text directly as graph title
           const graphTitle = q.text || `質問 ${index + 1}`;
           const thresholdValue = q.graphConfig.thresholdValue;
           const thresholdOption = q.graphConfig.thresholdOption;
           const windowSize = q.graphConfig.rollingWindowSize || 7; // Get window size for legend

          return (
            <div key={q.id} className="chart-container">
              <h3>{graphTitle}</h3>
              <ResponsiveContainer width="100%" height={300}>
                {q.type === 'yes_no' && (
                  <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Yes率 (%)', angle: -90, position: 'insideLeft' }} domain={[0, 100]}/>
                    <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                    <Legend />
                    {thresholdValue !== undefined && (
                      <ReferenceLine y={thresholdValue} label={`閾値 (${thresholdValue}%)`} stroke="red" strokeDasharray="3 3" />
                    )}
                    <Line type="monotone" dataKey="yesRate" name={`Yes率 (直近${windowSize}回答)`} stroke="#8884d8" activeDot={{ r: 8 }} connectNulls={true} />
                  </LineChart>
                )}
                {q.type === 'multiple_choice' && (
                  <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: '選択率 (%)', angle: -90, position: 'insideLeft' }} domain={[0, 100]}/>
                     <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                    <Legend />
                     {thresholdValue !== undefined && thresholdOption !== undefined && (
                       <ReferenceLine y={thresholdValue} label={`閾値 (${thresholdOption}: ${thresholdValue}%)`} stroke="red" strokeDasharray="3 3" />
                     )}
                    {q.options?.map((option, optIndex) => (
                      <Line
                        key={option}
                        type="monotone"
                        dataKey={option}
                        name={`${option} (直近${windowSize}回答)`}
                        stroke={COLORS[optIndex % COLORS.length]}
                        activeDot={{ r: 6 }}
                        connectNulls={true}
                      />
                    ))}
                  </LineChart>
                )}
                {q.type === 'number' && (
                  <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: '値', angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} />
                    <Tooltip />
                    <Legend />
                     {thresholdValue !== undefined && (
                       <ReferenceLine y={thresholdValue} label={`閾値 (${thresholdValue})`} stroke="red" strokeDasharray="3 3" />
                     )}
                    <Line type="monotone" dataKey="value" name="日々の値" stroke="#82ca9d" activeDot={{ r: 8 }} connectNulls={true} />
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
