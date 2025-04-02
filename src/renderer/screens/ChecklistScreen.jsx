import React, { useState, useEffect } from 'react';
import './ChecklistScreen.css'; // Import CSS

// 設問の順序を決定するヘルパー関数 (ランダム化 + isLast 対応)
const getOrderedQuestions = (questions) => {
  if (!questions || questions.length === 0) return [];

  // 1. isLast が true の質問を特定
  const lastQuestion = questions.find(q => q.isLast === true);

  // 2. isLast 以外の質問を抽出
  let otherQuestions = questions.filter(q => q.isLast !== true);

  // 3. isLast 以外の質問をランダムにシャッフル
  // Fisher-Yates (Knuth) Shuffle Algorithm
  for (let i = otherQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherQuestions[i], otherQuestions[j]] = [otherQuestions[j], otherQuestions[i]];
  }

  // 4. isLast の質問があれば、シャッフルされたリストの末尾に追加
  if (lastQuestion) {
    otherQuestions.push(lastQuestion);
  }

  return otherQuestions;
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
    } else {
        // Handle case where checklist or questions are null/empty
        setOrderedQuestions([]);
        setAnswers({});
        setCurrentQuestionIndex(0);
        setStartTime(null);
    }
  }, [checklist]); // checklistが変更されたら再計算

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    // Ensure orderedQuestions is not empty and index is valid
    if (!orderedQuestions || orderedQuestions.length === 0 || !orderedQuestions[currentQuestionIndex]) {
        console.error("Cannot proceed, no ordered questions or invalid index.");
        return; // Prevent errors
    }
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
      checklistId: checklist.id,
      checklistTitle: checklist.title,
      submittedAt: new Date().toISOString(),
      answers: answers,
      duration: startTime ? new Date() - startTime : null,
    };
    console.log('Submitting:', submission);
    await addAnswer(submission);
    alert('回答が記録されました。');
    // Reset for next time (optional)
    // setCurrentQuestionIndex(0);
    // setAnswers({});
    // setStartTime(null);
    // setOrderedQuestions(getOrderedQuestions(checklist.questions)); // Re-randomize if needed
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

  // Add loading state check based on orderedQuestions population
  if (orderedQuestions.length === 0 && checklist?.questions?.length > 0) {
     return <div className="loading">質問を準備中...</div>;
  }
  // Handle case where orderedQuestions might be empty even if checklist exists (e.g., error in getOrderedQuestions)
  if (orderedQuestions.length === 0) {
      return <div className="error">質問の読み込みに失敗しました。</div>;
  }


  const currentQuestion = orderedQuestions[currentQuestionIndex];
  // Ensure currentQuestion is valid before proceeding
  if (!currentQuestion) {
      console.error("Current question is undefined at index:", currentQuestionIndex, orderedQuestions);
      return <div className="error">現在の質問の読み込みエラー。</div>;
  }
  const progress = ((currentQuestionIndex + 1) / orderedQuestions.length) * 100;

  const renderQuestionInput = (question) => {
    const value = answers[question.id] || '';
    switch (question.type) {
      case 'yes_no':
        return (
          <div>
            <label>
              <input type="radio" name={`question_${question.id}`} value="yes" checked={value === 'yes'} onChange={(e) => handleAnswerChange(question.id, e.target.value)} /> はい
            </label>
            <label style={{ marginLeft: '10px' }}>
              <input type="radio" name={`question_${question.id}`} value="no" checked={value === 'no'} onChange={(e) => handleAnswerChange(question.id, e.target.value)} /> いいえ
            </label>
          </div>
        );
      case 'multiple_choice':
        return (
          <select value={value} onChange={(e) => handleAnswerChange(question.id, e.target.value)}>
            <option value="">選択してください</option>
            {question.options?.map((option, index) => (<option key={index} value={option}>{option}</option>))}
          </select>
        );
      case 'number':
        return (
          <input type="number" value={value} onChange={(e) => handleAnswerChange(question.id, e.target.value)} min={question.validation?.min} max={question.validation?.max} step={question.validation?.integer ? 1 : 'any'} placeholder={question.placeholder || '数値を入力'} />
        );
      case 'free_text':
        return (
          <textarea value={value} onChange={(e) => handleAnswerChange(question.id, e.target.value)} placeholder={question.placeholder || '自由に記述してください'} />
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
