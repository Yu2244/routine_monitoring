import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './EditScreen.css'; // Import CSS

// Import Sub-components
import MultipleChoiceOptionsEditor from '../components/EditScreen/MultipleChoiceOptionsEditor';
import NumberValidationEditor from '../components/EditScreen/NumberValidationEditor';
import RandomOrderEditor from '../components/EditScreen/RandomOrderEditor';
import GraphConfigEditor from '../components/EditScreen/GraphConfigEditor';
import { isGraphableType } from '../utils/graphUtils'; // Import helper

// Helper to create a new blank question object
const createNewQuestion = (orderIndex) => ({
  id: uuidv4(),
  text: '',
  type: 'yes_no',
  options: [],
  validation: { min: undefined, max: undefined, integer: false },
  randomOrder: { enabled: false, range: { start: undefined, end: undefined }, position: undefined },
  graphConfig: {
      enabled: true,
      customName: '',
      thresholdValue: undefined,
      thresholdOption: undefined,
      alertCondition: undefined,
      rollingWindowSize: 7 // Add default rolling window size
  },
  orderIndex: orderIndex,
});

function EditScreen({ checklist, updateChecklist, navigate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (checklist) {
      setTitle(checklist.title || '');
      setDescription(checklist.description || '');
      setQuestions(checklist.questions?.map((q, index) => ({
        ...q,
        id: q.id || uuidv4(),
        options: q.options || [],
        validation: q.validation || { min: undefined, max: undefined, integer: false },
        randomOrder: q.randomOrder || { enabled: false, range: { start: undefined, end: undefined }, position: undefined },
        graphConfig: {
            enabled: q.graphConfig?.enabled !== undefined ? q.graphConfig.enabled : isGraphableType(q.type),
            customName: q.graphConfig?.customName || '',
            thresholdValue: q.graphConfig?.thresholdValue,
            thresholdOption: q.graphConfig?.thresholdOption,
            alertCondition: q.graphConfig?.alertCondition,
            rollingWindowSize: q.graphConfig?.rollingWindowSize || 7 // Initialize rollingWindowSize
        },
        orderIndex: q.orderIndex !== undefined ? q.orderIndex : index,
      })) || [createNewQuestion(0)]);
    } else {
      const firstQuestion = createNewQuestion(0);
      firstQuestion.graphConfig.enabled = isGraphableType(firstQuestion.type);
      setTitle('');
      setDescription('');
      setQuestions([firstQuestion]);
    }
  }, [checklist]);

  // --- Handler Functions ---

  const handleQuestionChange = (id, field, value, subField = null) => {
      setQuestions(prevQuestions =>
          prevQuestions.map(q => {
              if (q.id === id) {
                  let updatedQuestion = { ...q };

                  if (field === 'graphConfig') {
                      const newGraphConfig = { ...q.graphConfig, [subField]: value };
                      if (subField === 'enabled' && !value) {
                          newGraphConfig.customName = ''; newGraphConfig.thresholdValue = undefined; newGraphConfig.thresholdOption = undefined; newGraphConfig.alertCondition = undefined;
                      }
                      if (subField === 'type' && value !== 'multiple_choice') newGraphConfig.thresholdOption = undefined;
                      if (subField === 'thresholdValue' && (value === undefined || value === '')) {
                          newGraphConfig.thresholdValue = undefined; newGraphConfig.alertCondition = undefined;
                      }
                      updatedQuestion.graphConfig = newGraphConfig;
                  } else if (field === 'type') {
                      const graphable = isGraphableType(value);
                      const newGraphConfig = { ...q.graphConfig, enabled: graphable, thresholdValue: graphable ? q.graphConfig.thresholdValue : undefined, thresholdOption: value === 'multiple_choice' ? q.graphConfig.thresholdOption : undefined, alertCondition: graphable ? q.graphConfig.alertCondition : undefined };
                      if (value !== 'multiple_choice') updatedQuestion.options = [];
                      if (value !== 'number') updatedQuestion.validation = { min: undefined, max: undefined, integer: false };
                      updatedQuestion.graphConfig = newGraphConfig;
                      updatedQuestion[field] = value;
                  } else if (field === 'validation') { // Handle nested validation change
                      const newValue = subField === 'integer' ? value : (value === '' ? undefined : Number(value));
                      updatedQuestion.validation = { ...q.validation, [subField]: newValue };
                  } else if (field === 'randomOrder') { // Handle nested randomOrder change
                      let newRandomOrder = { ...q.randomOrder };
                      if (subField === 'range') {
                          newRandomOrder.range = { ...newRandomOrder.range, [value.subSubField]: value.value === '' ? undefined : Number(value.value) };
                      } else {
                          newRandomOrder[subField] = value;
                      }
                      // Validation/cleanup logic for randomOrder
                      if (newRandomOrder.range.start !== undefined && newRandomOrder.range.end !== undefined && newRandomOrder.range.start > newRandomOrder.range.end) {
                          if (subField === 'range' && value.subSubField === 'start') newRandomOrder.range.end = newRandomOrder.range.start;
                          else if (subField === 'range' && value.subSubField === 'end') newRandomOrder.range.start = newRandomOrder.range.end;
                      }
                      if (subField === 'enabled' && !value) {
                          newRandomOrder.range = { start: undefined, end: undefined }; newRandomOrder.position = undefined;
                      }
                      updatedQuestion.randomOrder = newRandomOrder;
                  } else {
                      updatedQuestion[field] = value;
                  }
                  return updatedQuestion;
              }
              return q;
          })
      );
  };

  // Specific handlers passed to sub-components
  const handleOptionChange = (questionId, optionIndex, value) => {
    setQuestions(prevQuestions =>
      prevQuestions.map(q => q.id === questionId ? { ...q, options: q.options.map((opt, i) => i === optionIndex ? value : opt) } : q)
    );
  };
  const addOption = (questionId) => {
    setQuestions(prevQuestions => prevQuestions.map(q => q.id === questionId ? { ...q, options: [...q.options, ''] } : q));
  };
  const removeOption = (questionId, optionIndex) => {
    setQuestions(prevQuestions => prevQuestions.map(q => q.id === questionId ? { ...q, options: q.options.filter((_, i) => i !== optionIndex) } : q));
  };
  const handleValidationChange = (questionId, field, value) => {
      handleQuestionChange(questionId, 'validation', value, field);
  };
  const handleRandomOrderChange = (questionId, field, value, subField = null) => {
      // Need to wrap range changes slightly differently for the main handler
      if (field === 'range') {
          handleQuestionChange(questionId, 'randomOrder', { subSubField: subField, value: value }, field);
      } else {
          handleQuestionChange(questionId, 'randomOrder', value, field);
      }
  };
   const handleGraphConfigChange = (questionId, field, value, subField) => {
       // This function is now directly called by GraphConfigEditor,
       // but the main handleQuestionChange handles the logic.
       // We just need to ensure the parameters are passed correctly.
       handleQuestionChange(questionId, field, value, subField);
   };


  const addQuestion = () => {
    const newIndex = questions.length > 0 ? Math.max(...questions.map(q => q.orderIndex)) + 1 : 0;
    const newQ = createNewQuestion(newIndex);
    newQ.graphConfig.enabled = isGraphableType(newQ.type); // Ensure default matches type
    setQuestions(prevQuestions => [...prevQuestions, newQ]);
  };

  const removeQuestion = (id) => {
    if (questions.length <= 1) { alert('少なくとも1つの質問が必要です。'); return; }
    setQuestions(prevQuestions => prevQuestions.filter(q => q.id !== id));
  };

  const moveQuestion = (index, direction) => {
    const newQuestions = [...questions];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    const tempOrderIndex = newQuestions[index].orderIndex;
    newQuestions[index].orderIndex = newQuestions[targetIndex].orderIndex;
    newQuestions[targetIndex].orderIndex = tempOrderIndex;
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    // Validation logic remains the same
    if (!title.trim()) { alert('チェックリストのタイトルを入力してください。'); return; }
    if (questions.some(q => !q.text.trim())) { alert('すべての質問テキストを入力してください。'); return; }
    if (questions.some(q => q.type === 'multiple_choice' && q.options.length < 1)) { alert('選択肢(n択)には少なくとも1つの選択肢が必要です。'); return; }
    if (questions.some(q => q.type === 'multiple_choice' && q.options.some(opt => !opt.trim()))) { alert('選択肢(n択)のすべての選択肢を入力してください。'); return; }
    if (questions.some(q => q.randomOrder.enabled && q.randomOrder.range.start !== undefined && q.randomOrder.range.start < 1)) { alert('ランダム順序の開始範囲は1以上である必要があります。'); return; }
    if (questions.some(q => q.randomOrder.enabled && q.randomOrder.range.end !== undefined && q.randomOrder.range.end > questions.length)) { alert(`ランダム順序の終了範囲は質問数 (${questions.length}) 以下である必要があります。`); return; }
    if (questions.some(q => q.graphConfig.enabled && isGraphableType(q.type) && !q.graphConfig.customName?.trim())) { alert('グラフ化を有効にした質問には、グラフ名（カスタム名）を入力してください。'); return; }
    if (questions.some(q => q.graphConfig.thresholdValue !== undefined && q.graphConfig.alertCondition === undefined)) { alert('閾値を設定した場合は、アラート条件（超えたら/下回ったら）も選択してください。'); return; }
    if (questions.some(q => q.type === 'multiple_choice' && q.graphConfig.thresholdValue !== undefined && q.graphConfig.thresholdOption === undefined)) { alert('選択肢(n択)で閾値を設定した場合は、対象の選択肢も選択してください。'); return; }

    const newChecklist = {
      id: checklist?.id || uuidv4(),
      title: title.trim(),
      description: description.trim(),
      questions: questions.map((q, index) => ({ ...q, orderIndex: q.orderIndex !== undefined ? q.orderIndex : index })).sort((a, b) => a.orderIndex - b.orderIndex),
      updatedAt: new Date().toISOString(),
    };
    await updateChecklist(newChecklist);
    alert('チェックリストが保存されました。');
    navigate('checklist');
  };

  const sortedQuestions = [...questions].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="screen-container edit-screen">
      <h2 className="screen-title">{checklist ? 'チェックリスト編集' : '新規チェックリスト作成'}</h2>

      <div className="checklist-meta">
        <label> タイトル: <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="チェックリストのタイトル" required /> </label>
        <label> 説明 (任意): <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="チェックリストの説明" /> </label>
      </div>

      <h3 className="questions-title">質問</h3>
      <div className="questions-list">
        {sortedQuestions.map((q, index) => (
          <div key={q.id} className="question-editor">
            <div className="question-header">
              <span>質問 {index + 1}</span>
              <div className="question-actions">
                 <button onClick={() => moveQuestion(index, -1)} disabled={index === 0} className="move-button">▲</button>
                 <button onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1} className="move-button">▼</button>
                 <button onClick={() => removeQuestion(q.id)} className="remove-button" disabled={questions.length <= 1}>削除</button>
              </div>
            </div>
            <textarea value={q.text} onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)} placeholder={`質問 ${index + 1} の内容`} required rows={2} />
            <div className="question-options">
              <label> タイプ:
                <select value={q.type} onChange={(e) => handleQuestionChange(q.id, 'type', e.target.value)}>
                  <option value="yes_no">Yes/No</option>
                  <option value="multiple_choice">選択肢 (n択)</option>
                  <option value="number">数値入力</option>
                  <option value="free_text">自由記述</option>
                </select>
              </label>

              {q.type === 'multiple_choice' && (
                <MultipleChoiceOptionsEditor
                  questionId={q.id}
                  options={q.options}
                  onOptionChange={handleOptionChange}
                  onAddOption={addOption}
                  onRemoveOption={removeOption}
                />
              )}

              {q.type === 'number' && (
                <NumberValidationEditor
                  questionId={q.id}
                  validation={q.validation}
                  onValidationChange={handleValidationChange}
                />
              )}

              <RandomOrderEditor
                questionId={q.id}
                randomOrder={q.randomOrder}
                totalQuestions={questions.length}
                onRandomOrderChange={handleRandomOrderChange}
              />

              <GraphConfigEditor
                question={q}
                // Pass the unified question change handler instead of specific one
                onQuestionChange={handleQuestionChange}
              />
            </div>
          </div>
        ))}
      </div>

      <button onClick={addQuestion} className="add-question-button">+ 質問を追加</button>

      <div className="save-actions">
        <button onClick={handleSave} className="save-button">チェックリストを保存</button>
        <button onClick={() => navigate('checklist')} className="cancel-button">キャンセル</button>
      </div>
    </div>
  );
}

export default EditScreen;

// Removed inline style injection
