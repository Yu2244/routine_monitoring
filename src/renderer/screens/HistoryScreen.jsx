import React, { useState, useMemo } from 'react';

// 日付フォーマット関数 (例: YYYY-MM-DD HH:MM)
const formatDate = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

// 質問IDから質問テキストを取得するヘルパー
const getQuestionTextById = (checklist, questionId) => {
  if (!checklist || !checklist.questions) return `質問ID: ${questionId}`;
  const question = checklist.questions.find(q => q.id === questionId);
  return question ? question.text : `不明な質問 (${questionId})`;
};

// deleteAnswer を props で受け取る
function HistoryScreen({ history, checklist, deleteAnswer }) {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    questionFilters: {}, // { questionId: filterValue }
  });
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // フィルタリングとソートを適用した履歴データ
  const filteredAndSortedHistory = useMemo(() => {
    let filtered = [...history];

    // 日付範囲フィルター
    if (filters.startDate) {
      filtered = filtered.filter(item => new Date(item.submittedAt) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      // endDateは日の終わりまで含むように調整
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => new Date(item.submittedAt) <= endOfDay);
    }

    // 質問フィルター
    Object.entries(filters.questionFilters).forEach(([questionId, filterValue]) => {
      if (filterValue === '' || filterValue === undefined) return; // 空のフィルターは無視

      const question = checklist?.questions.find(q => q.id === questionId);
      if (!question) return; // チェックリストに存在しない質問IDは無視

      filtered = filtered.filter(item => {
        const answer = item.answers[questionId];
        if (answer === undefined) return false; // 回答がない場合は除外

        const filterLower = String(filterValue).toLowerCase();
        const answerString = String(answer);
        const answerLower = answerString.toLowerCase();

        switch (question.type) {
          case 'yes_no':
          case 'multiple_choice':
            return answerLower === filterLower;
          case 'number':
            // 数値フィルターは完全一致または範囲指定など、より高度な実装も可能
            // ここでは部分一致（文字列として）で実装
            return answerString.includes(filterValue);
          case 'free_text':
            return answerLower.includes(filterLower); // 部分一致（大文字小文字区別なし）
          default:
            return false;
        }
      });
    });


    // ソート (日付のみ)
    filtered.sort((a, b) => {
      const dateA = new Date(a.submittedAt);
      const dateB = new Date(b.submittedAt);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  }, [history, checklist, filters, sortOrder]);

  // フィルター値の変更ハンドラ
  const handleFilterChange = (type, value, questionId = null) => {
    if (type === 'date') {
      setFilters(prev => ({ ...prev, [questionId]: value })); // startDate or endDate
    } else if (type === 'question') {
      setFilters(prev => ({
        ...prev,
        questionFilters: {
          ...prev.questionFilters,
          [questionId]: value,
        },
      }));
    }
  };

  // ソート順変更ハンドラ
  const toggleSortOrder = () => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // 表示するカラム（質問）を決定
  const columns = useMemo(() => {
    if (!checklist || !checklist.questions) return [];
    // 編集画面で設定された順序を尊重したいが、ここでは単純にID順
    return [...checklist.questions].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }, [checklist]);

  return (
    <div className="screen-container history-screen">
      <h2 className="screen-title">回答履歴</h2>

      {/* --- フィルターエリア --- */}
      <div className="filter-area">
        <h4>フィルター</h4>
        <div className="filter-group date-filter">
          <label>
            開始日:
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('date', e.target.value, 'startDate')}
            />
          </label>
          <label>
            終了日:
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('date', e.target.value, 'endDate')}
            />
          </label>
        </div>
        {checklist && checklist.questions && checklist.questions.length > 0 && (
          <div className="filter-group question-filters">
            {columns.map(q => (
              <div key={q.id} className="question-filter-item">
                <label title={q.text}>
                  {q.text.length > 15 ? `${q.text.substring(0, 12)}...` : q.text}:
                  {q.type === 'yes_no' ? (
                    <select
                      value={filters.questionFilters[q.id] || ''}
                      onChange={(e) => handleFilterChange('question', e.target.value, q.id)}
                    >
                      <option value="">すべて</option>
                      <option value="yes">はい</option>
                      <option value="no">いいえ</option>
                    </select>
                  ) : q.type === 'multiple_choice' ? (
                    <select
                      value={filters.questionFilters[q.id] || ''}
                      onChange={(e) => handleFilterChange('question', e.target.value, q.id)}
                    >
                      <option value="">すべて</option>
                      {q.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                     <input
                       type={q.type === 'number' ? 'number' : 'text'}
                       placeholder="キーワード/値"
                       value={filters.questionFilters[q.id] || ''}
                       onChange={(e) => handleFilterChange('question', e.target.value, q.id)}
                       style={{width: '120px'}} // 少し小さく
                     />
                  )}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- 結果テーブル --- */}
      {history.length === 0 ? (
        <p>まだ回答履歴がありません。</p>
      ) : (
        <div className="history-table-container">
          <table>
            <thead>
              <tr>
                <th onClick={toggleSortOrder} style={{ cursor: 'pointer' }}>
                  回答日時 {sortOrder === 'asc' ? '▲' : '▼'}
                </th>
                {columns.map(q => (
                  <th key={q.id} title={q.text}>
                   {q.text.length > 15 ? `${q.text.substring(0, 12)}...` : q.text}
                 </th>
               ))}
               <th>操作</th> {/* 操作列ヘッダーを追加 */}
             </tr>
           </thead>
           <tbody>
              {filteredAndSortedHistory.map((item, index) => (
                <tr key={item.submittedAt || index}>
                  <td>{formatDate(item.submittedAt)}</td>
                  {columns.map(q => (
                    <td key={q.id}>
                     {/* 自由記述の場合、スタイルを適用するためのクラスを追加 */}
                     <span className={q.type === 'free_text' ? 'free-text-cell' : ''}>
                       {item.answers[q.id] !== undefined ? String(item.answers[q.id]) : '-'}
                     </span>
                   </td>
                 ))}
                 <td> {/* 操作列セルを追加 */}
                   <button
                     onClick={() => deleteAnswer(item.submittedAt)}
                     className="delete-history-button"
                     title={`回答日時: ${formatDate(item.submittedAt)} のデータを削除`}
                   >
                     削除
                   </button>
                 </td>
               </tr>
             ))}
             {filteredAndSortedHistory.length === 0 && (
               <tr>
                 <td colSpan={columns.length + 2} style={{ textAlign: 'center' }}> {/* colSpan を +1 */}
                   フィルター条件に一致する履歴はありません。
                 </td>
               </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default HistoryScreen;


// Add some basic styling for HistoryScreen
const styles = `
.history-screen .filter-area {
  background-color: #f9f9f9;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 5px;
  margin-bottom: 20px;
}
.history-screen .filter-area h4 {
  margin-bottom: 10px;
}
.history-screen .filter-group {
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap; /* 折り返しを許可 */
  gap: 15px; /* 要素間のスペース */
  align-items: center;
}
.history-screen .filter-group label {
  display: flex;
  align-items: center;
  gap: 5px; /* ラベルと入力欄のスペース */
}
.history-screen .question-filters {
    gap: 10px 20px; /* 縦横のgap */
}
.history-screen .question-filter-item label {
    font-size: 0.9em;
}

.history-screen .history-table-container {
  overflow-x: auto; /* 横スクロールを可能に */
  /* max-height は削除または調整して、縦スクロールがコンテナ全体で制御されるようにする */
  /* overflow-y: auto; */ /* コンテナ自体の縦スクロールは screen-container で制御 */
}

.history-screen table {
  /* width: 100%; を削除または min-width に変更して、内容に応じて幅が広がるようにする */
  min-width: 100%; /* 少なくともコンテナ幅は確保 */
  border-collapse: collapse;
  margin-top: 10px;
  /* table-layout: fixed; を削除して内容に応じて列幅が変わるようにする */
}
.history-screen th, .history-screen td {
  border: 1px solid #ddd;
  padding: 8px 10px;
  text-align: left;
  font-size: 0.9em;
  white-space: nowrap; /* ★セル内での改行を禁止 */
  /* overflow: hidden; を削除 */
  /* text-overflow: ellipsis; を削除 */
}
/* 自由記述セルの折り返しスタイルを削除 */
/* .history-screen td .free-text-cell { ... } */

/* 日付列のスタイル調整 (必要であれば) */
.history-screen th:first-child, .history-screen td:first-child {
    /* width: 150px; 固定幅を削除または調整 */
    white-space: nowrap; /* 日付も改行しない */
}
/* 操作列のスタイル */
.history-screen th:last-child, .history-screen td:last-child {
    width: 80px; /* 操作列の幅は固定しても良い */
    text-align: center;
    white-space: nowrap;
}
/* 他の列の最小幅設定は削除または調整 */
/* .history-screen th:not(:first-child):not(:last-child), ... { min-width: 100px; } */


.history-screen th {
  background-color: #f2f2f2;
  font-weight: bold;
}
.history-screen tr:nth-child(even) {
  background-color: #f9f9f9;
}
.history-screen tr:hover {
  background-color: #f1f1f1;
}
.history-screen .delete-history-button {
    background-color: #f44336;
    color: white;
    border: none;
    padding: 4px 8px;
    font-size: 0.8em;
    border-radius: 3px;
    cursor: pointer;
}
.history-screen .delete-history-button:hover {
    background-color: #d32f2f;
}
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
