import React, { useState, useEffect } from 'react';

// 設問の順序をランダム化または指定通りにするヘルパー関数
const getOrderedQuestions = (questions) => {
  if (!questions || questions.length === 0) return [];

  const hasRandomSetting = questions.some(q => q.randomOrder && q.randomOrder.enabled);

  if (!hasRandomSetting) {
    // ランダム設定がない場合は、定義順にソート（インデックスを仮定）
    return [...questions].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }

  // ランダムロジックの実装
  let orderedQuestions = [];
  let remainingQuestions = [...questions];
  const totalQuestions = questions.length;
  let positionMap = new Array(totalQuestions).fill(null); // 各位置にどの設問が入るか

  // 1. 固定位置指定の設問を配置 ("必ず最後" など)
  const lastQuestion = remainingQuestions.find(q => q.randomOrder?.position === 'last');
  if (lastQuestion) {
    positionMap[totalQuestions - 1] = lastQuestion;
    remainingQuestions = remainingQuestions.filter(q => q.id !== lastQuestion.id);
  }
  // 他の固定位置指定があればここに追加 (例: 'first')

  // 2. 範囲指定の設問を処理
  const rangeSpecified = remainingQuestions.filter(q => q.randomOrder?.range);
  remainingQuestions = remainingQuestions.filter(q => !q.randomOrder?.range);

  // 範囲ごとにグループ化
  const rangeGroups = rangeSpecified.reduce((acc, q) => {
    const rangeKey = `${q.randomOrder.range.start}-${q.randomOrder.range.end}`;
    if (!acc[rangeKey]) {
      acc[rangeKey] = { range: q.randomOrder.range, questions: [] };
    }
    acc[rangeKey].questions.push(q);
    return acc;
  }, {});

  // 各範囲内でシャッフルし、空いている位置に配置しようと試みる
  Object.values(rangeGroups).forEach(group => {
    let availablePositions = [];
    for (let i = group.range.start - 1; i < group.range.end; i++) {
      if (positionMap[i] === null) {
        availablePositions.push(i);
      }
    }

    // 範囲内の空きが足りない場合はエラーまたは警告（ここでは単純化）
    if (availablePositions.length < group.questions.length) {
      console.warn(`範囲 ${group.range.start}-${group.range.end} の空き位置が不足しています。`);
      // 足りない分は残りの質問として扱う
      const placedCount = availablePositions.length;
      const remainingInRange = group.questions.slice(placedCount);
      remainingQuestions.push(...remainingInRange);
      group.questions = group.questions.slice(0, placedCount);
    }

    // シャッフルして配置
    const shuffledQuestions = [...group.questions].sort(() => Math.random() - 0.5);
    const shuffledPositions = [...availablePositions].sort(() => Math.random() - 0.5);

    shuffledQuestions.forEach((q, index) => {
      const posIndex = shuffledPositions[index];
      positionMap[posIndex] = q;
    });
  });


  // 3. 残りの設問（範囲指定なし）をシャッフルして空いている位置に配置
  const remainingShuffled = [...remainingQuestions].sort(() => Math.random() - 0.5);
  let currentRemainingIndex = 0;
  for (let i = 0; i < totalQuestions; i++) {
    if (positionMap[i] === null && currentRemainingIndex < remainingShuffled.length) {
      positionMap[i] = remainingShuffled[currentRemainingIndex];
      currentRemainingIndex++;
    }
  }

  // positionMapに基づいて最終的な順序を生成
  orderedQuestions = positionMap.filter(q => q !== null); // nullを除去

  // 配置できなかった質問があれば末尾に追加（フォールバック）
  if (orderedQuestions.length < questions.length) {
     const placedIds = new Set(orderedQuestions.map(q => q.id));
     const unplaced = questions.filter(q => !placedIds.has(q.id));
     orderedQuestions.push(...unplaced);
     console.warn("いくつかの質問を配置できませんでした。末尾に追加します。", unplaced);
  }


  return orderedQuestions;
};


function ChecklistScreen({ checklist, addAnswer, navigate }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [orderedQuestions, setOrderedQuestions] = useState([]);
  const [startTime, setStartTime] = useState(null); // 回答開始時刻

  useEffect(() => {
    if (checklist && checklist.questions) {
      setOrderedQuestions(getOrderedQuestions(checklist.questions));
      setAnswers({}); // 新しいチェックリスト開始時に回答をリセット
      setCurrentQuestionIndex(0);
      setStartTime(new Date()); // 回答開始時刻を記録
    }
  }, [checklist]); // checklistが変更されたら再計算

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    // 数値入力のバリデーション
    const currentQuestion = orderedQuestions[currentQuestionIndex];
    if (currentQuestion.type === 'number') {
        const value = answers[currentQuestion.id];
        const min = currentQuestion.validation?.min;
        const max = currentQuestion.validation?.max;
        const isInteger = currentQuestion.validation?.integer;

        if (value === undefined || value === '') {
            alert('数値を入力してください。');
            return;
        }

        const numValue = Number(value);
        if (isNaN(numValue)) {
            alert('有効な数値を入力してください。');
            return;
        }
        if (isInteger && !Number.isInteger(numValue)) {
            alert('整数を入力してください。');
            return;
        }
        if (min !== undefined && numValue < min) {
            alert(`${min}以上の数値を入力してください。`);
            return;
        }
        if (max !== undefined && numValue > max) {
            alert(`${max}以下の数値を入力してください。`);
            return;
        }
    }
     // 他の必須チェックなどもここに追加可能

    if (currentQuestionIndex < orderedQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const submission = {
      checklistId: checklist.id, //どのチェックリストに対する回答か
      checklistTitle: checklist.title, // タイトルも保存（後で表示しやすいように）
      submittedAt: new Date().toISOString(), // ISO 8601形式のタイムスタンプ
      answers: answers,
      duration: startTime ? new Date() - startTime : null, // 回答時間（ミリ秒）
    };
    console.log('Submitting:', submission); // デバッグ用
    await addAnswer(submission);
    alert('回答が記録されました。');
    // 必要であれば、回答後に履歴画面などに遷移
    // navigate('history');
    // 回答完了後、状態をリセットするかどうかは要件次第
    // setCurrentQuestionIndex(0);
    // setAnswers({});
    // setStartTime(null);
  };

  if (!checklist || !checklist.questions || checklist.questions.length === 0) {
    return (
      <div className="screen-container">
        <h2 className="screen-title">チェックリスト入力</h2>
        <p>利用可能なチェックリストがありません。</p>
        <button onClick={() => navigate('edit')}>チェックリストを作成・編集する</button>
      </div>
    );
  }

  if (orderedQuestions.length === 0) {
     return <div className="loading">質問を準備中...</div>;
  }


  const currentQuestion = orderedQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / orderedQuestions.length) * 100;

  const renderQuestionInput = (question) => {
    const value = answers[question.id] || '';
    switch (question.type) {
      case 'yes_no':
        return (
          <div>
            <label>
              <input
                type="radio"
                name={`question_${question.id}`}
                value="yes"
                checked={value === 'yes'}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              /> はい
            </label>
            <label style={{ marginLeft: '10px' }}>
              <input
                type="radio"
                name={`question_${question.id}`}
                value="no"
                checked={value === 'no'}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              /> いいえ
            </label>
          </div>
        );
      case 'multiple_choice':
        return (
          <select
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          >
            <option value="">選択してください</option>
            {question.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            min={question.validation?.min}
            max={question.validation?.max}
            step={question.validation?.integer ? 1 : 'any'} // 整数のみならstep=1
            placeholder={question.placeholder || '数値を入力'}
          />
        );
      case 'free_text':
        return (
          <textarea
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder || '自由に記述してください'}
          />
        );
      default:
        return <p>未対応の質問タイプです: {question.type}</p>;
    }
  };

  return (
    <div className="screen-container checklist-screen">
      <h2 className="screen-title">{checklist.title || 'チェックリスト'}</h2>
      {checklist.description && <p className="checklist-description">{checklist.description}</p>}

      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        <span>{currentQuestionIndex + 1} / {orderedQuestions.length}</span>
      </div>

      <div className="question-container">
        <h3>{currentQuestion.text}</h3>
        {renderQuestionInput(currentQuestion)}
      </div>

      <button onClick={handleNext} className="next-button">
        {currentQuestionIndex < orderedQuestions.length - 1 ? '次へ' : '完了'}
      </button>
    </div>
  );
}

export default ChecklistScreen;

// Add some basic styling for ChecklistScreen (can be moved to a separate CSS file)
const styles = `
.checklist-screen .checklist-description {
  margin-bottom: 20px;
  font-style: italic;
  color: #555;
}
.checklist-screen .progress-bar-container {
  width: 100%;
  background-color: #e0e0e0;
  border-radius: 5px;
  margin-bottom: 20px;
  position: relative; /* For text positioning */
  height: 20px; /* Explicit height */
}
.checklist-screen .progress-bar {
  height: 100%;
  background-color: #4caf50;
  border-radius: 5px;
  transition: width 0.3s ease-in-out;
}
.checklist-screen .progress-bar-container span {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.8em;
  color: #333;
}
.checklist-screen .question-container {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 5px;
  background-color: #f9f9f9;
}
.checklist-screen .question-container h3 {
  margin-bottom: 15px;
}
.checklist-screen .next-button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1em;
}
.checklist-screen .next-button:hover {
  background-color: #0056b3;
}
`;

// Inject styles into the head (simple approach for now)
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
