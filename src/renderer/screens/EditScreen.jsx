import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; // For generating unique question IDs

// Helper to create a new blank question object
const createNewQuestion = (orderIndex) => ({
  id: uuidv4(),
  text: '',
  type: 'yes_no', // Default type
  options: [], // For multiple_choice
  validation: { min: undefined, max: undefined, integer: false }, // For number
  randomOrder: { enabled: false, range: { start: undefined, end: undefined }, position: undefined },
  orderIndex: orderIndex, // To maintain order when not randomizing
});

function EditScreen({ checklist, updateChecklist, navigate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    if (checklist) {
      setTitle(checklist.title || '');
      setDescription(checklist.description || '');
      // Ensure questions have unique IDs and orderIndex if missing
      setQuestions(checklist.questions?.map((q, index) => ({
        ...q,
        id: q.id || uuidv4(),
        options: q.options || [],
        validation: q.validation || { min: undefined, max: undefined, integer: false },
        randomOrder: q.randomOrder || { enabled: false, range: { start: undefined, end: undefined }, position: undefined },
        orderIndex: q.orderIndex !== undefined ? q.orderIndex : index, // Assign index if missing
      })) || [createNewQuestion(0)]); // Start with one blank question if none exist
    } else {
      // No existing checklist, start fresh
      setTitle('');
      setDescription('');
      setQuestions([createNewQuestion(0)]);
    }
  }, [checklist]); // Re-initialize when the checklist prop changes

  const handleQuestionChange = (id, field, value) => {
    setQuestions(prevQuestions =>
      prevQuestions.map(q => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const handleOptionChange = (questionId, optionIndex, value) => {
    setQuestions(prevQuestions =>
      prevQuestions.map(q => {
        if (q.id === questionId) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

  const addOption = (questionId) => {
    setQuestions(prevQuestions =>
      prevQuestions.map(q =>
        q.id === questionId ? { ...q, options: [...q.options, ''] } : q
      )
    );
  };

  const removeOption = (questionId, optionIndex) => {
    setQuestions(prevQuestions =>
      prevQuestions.map(q => {
        if (q.id === questionId) {
          const newOptions = q.options.filter((_, index) => index !== optionIndex);
          return { ...q, options: newOptions };
        }
        return q;
      })
    );
  };

   const handleValidationChange = (questionId, field, value) => {
    setQuestions(prevQuestions =>
      prevQuestions.map(q => {
        if (q.id === questionId) {
          const newValue = field === 'integer' ? value : (value === '' ? undefined : Number(value));
          return {
            ...q,
            validation: { ...q.validation, [field]: newValue },
          };
        }
        return q;
      })
    );
  };

  const handleRandomOrderChange = (questionId, field, value, subField = null) => {
     setQuestions(prevQuestions =>
      prevQuestions.map(q => {
        if (q.id === questionId) {
          let newRandomOrder = { ...q.randomOrder };
          if (subField) { // range.start or range.end
             newRandomOrder[field] = { ...newRandomOrder[field], [subField]: value === '' ? undefined : Number(value) };
          } else {
             newRandomOrder[field] = value;
          }
           // Ensure range start <= end if both are defined
           if (newRandomOrder.range.start !== undefined && newRandomOrder.range.end !== undefined && newRandomOrder.range.start > newRandomOrder.range.end) {
               if (field === 'range' && subField === 'start') {
                   newRandomOrder.range.end = newRandomOrder.range.start; // Adjust end if start exceeds it
               } else if (field === 'range' && subField === 'end') {
                   newRandomOrder.range.start = newRandomOrder.range.end; // Adjust start if end is less than it
               }
           }
          // Disable range/position if randomOrder is disabled
          if (field === 'enabled' && !value) {
              newRandomOrder.range = { start: undefined, end: undefined };
              newRandomOrder.position = undefined;
          }


          return { ...q, randomOrder: newRandomOrder };
        }
        return q;
      })
    );
  };


  const addQuestion = () => {
    const newIndex = questions.length > 0 ? Math.max(...questions.map(q => q.orderIndex)) + 1 : 0;
    setQuestions(prevQuestions => [...prevQuestions, createNewQuestion(newIndex)]);
  };

  const removeQuestion = (id) => {
    if (questions.length <= 1) {
      alert('少なくとも1つの質問が必要です。');
      return;
    }
    setQuestions(prevQuestions => prevQuestions.filter(q => q.id !== id));
  };

  const moveQuestion = (index, direction) => {
    const newQuestions = [...questions];
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= newQuestions.length) {
      return; // Cannot move outside bounds
    }

    // Swap orderIndex values
    const tempOrderIndex = newQuestions[index].orderIndex;
    newQuestions[index].orderIndex = newQuestions[targetIndex].orderIndex;
    newQuestions[targetIndex].orderIndex = tempOrderIndex;

    // Swap positions in the array for immediate visual feedback
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];


    setQuestions(newQuestions);
  };


  const handleSave = async () => {
    // Basic validation
    if (!title.trim()) {
      alert('チェックリストのタイトルを入力してください。');
      return;
    }
    if (questions.some(q => !q.text.trim())) {
      alert('すべての質問テキストを入力してください。');
      return;
    }
     if (questions.some(q => q.type === 'multiple_choice' && q.options.length < 1)) {
      alert('選択肢(n択)には少なくとも1つの選択肢が必要です。');
      return;
    }
     if (questions.some(q => q.type === 'multiple_choice' && q.options.some(opt => !opt.trim()))) {
      alert('選択肢(n択)のすべての選択肢を入力してください。');
      return;
    }
    // Add more validation as needed (e.g., unique options, valid ranges)
     if (questions.some(q => q.randomOrder.enabled && q.randomOrder.range.start !== undefined && q.randomOrder.range.start < 1)) {
         alert('ランダム順序の開始範囲は1以上である必要があります。');
         return;
     }
     if (questions.some(q => q.randomOrder.enabled && q.randomOrder.range.end !== undefined && q.randomOrder.range.end > questions.length)) {
         alert(`ランダム順序の終了範囲は質問数 (${questions.length}) 以下である必要があります。`);
         return;
     }


    const newChecklist = {
      id: checklist?.id || uuidv4(), // Use existing ID or generate a new one
      title: title.trim(),
      description: description.trim(),
      questions: questions.map((q, index) => ({ // Ensure orderIndex is sequential if not randomizing heavily
          ...q,
          orderIndex: q.orderIndex !== undefined ? q.orderIndex : index // Fallback index
      })).sort((a, b) => a.orderIndex - b.orderIndex), // Save sorted by orderIndex
      updatedAt: new Date().toISOString(),
    };
    console.log("Saving checklist:", newChecklist); // Debug log
    await updateChecklist(newChecklist);
    alert('チェックリストが保存されました。');
    navigate('checklist'); // Navigate back to checklist view after saving
  };

  // Sort questions based on orderIndex for display
  const sortedQuestions = [...questions].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="screen-container edit-screen">
      <h2 className="screen-title">{checklist ? 'チェックリスト編集' : '新規チェックリスト作成'}</h2>

      <div className="checklist-meta">
        <label>
          タイトル:
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="チェックリストのタイトル"
            required
          />
        </label>
        <label>
          説明 (任意):
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="チェックリストの説明"
          />
        </label>
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
            <textarea
              value={q.text}
              onChange={(e) => handleQuestionChange(q.id, 'text', e.target.value)}
              placeholder={`質問 ${index + 1} の内容`}
              required
              rows={2}
            />
            <div className="question-options">
              <label>
                タイプ:
                <select value={q.type} onChange={(e) => handleQuestionChange(q.id, 'type', e.target.value)}>
                  <option value="yes_no">Yes/No</option>
                  <option value="multiple_choice">選択肢 (n択)</option>
                  <option value="number">数値入力</option>
                  <option value="free_text">自由記述</option>
                </select>
              </label>

              {/* --- Options for Multiple Choice --- */}
              {q.type === 'multiple_choice' && (
                <div className="multiple-choice-options">
                  <h4>選択肢:</h4>
                  {q.options.map((option, optIndex) => (
                    <div key={optIndex} className="option-item">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(q.id, optIndex, e.target.value)}
                        placeholder={`選択肢 ${optIndex + 1}`}
                        required
                      />
                      <button onClick={() => removeOption(q.id, optIndex)} className="remove-option-button">×</button>
                    </div>
                  ))}
                  <button onClick={() => addOption(q.id)} className="add-option-button">+ 選択肢を追加</button>
                </div>
              )}

              {/* --- Validation for Number --- */}
              {q.type === 'number' && (
                <div className="number-validation">
                  <h4>数値制限:</h4>
                   <label>
                     <input
                       type="checkbox"
                       checked={q.validation.integer || false}
                       onChange={(e) => handleValidationChange(q.id, 'integer', e.target.checked)}
                     /> 整数のみ
                   </label>
                  <label>
                    最小値:
                    <input
                      type="number"
                      value={q.validation.min === undefined ? '' : q.validation.min}
                      onChange={(e) => handleValidationChange(q.id, 'min', e.target.value)}
                      placeholder="指定なし"
                      step={q.validation.integer ? 1 : 'any'}
                    />
                  </label>
                  <label>
                    最大値:
                    <input
                      type="number"
                      value={q.validation.max === undefined ? '' : q.validation.max}
                      onChange={(e) => handleValidationChange(q.id, 'max', e.target.value)}
                      placeholder="指定なし"
                      step={q.validation.integer ? 1 : 'any'}
                    />
                  </label>
                </div>
              )}
               {/* --- Random Order Settings --- */}
               <div className="random-order-settings">
                   <h4>ランダム順序設定:</h4>
                   <label>
                       <input
                           type="checkbox"
                           checked={q.randomOrder.enabled || false}
                           onChange={(e) => handleRandomOrderChange(q.id, 'enabled', e.target.checked)}
                       /> ランダム順序を有効にする
                   </label>
                   {q.randomOrder.enabled && (
                       <div className="random-details">
                           <label>
                               範囲 (任意):
                               <input
                                   type="number"
                                   min="1"
                                   max={questions.length}
                                   value={q.randomOrder.range?.start === undefined ? '' : q.randomOrder.range.start}
                                   onChange={(e) => handleRandomOrderChange(q.id, 'range', e.target.value, 'start')}
                                   placeholder="開始"
                                   style={{width: '70px', marginRight: '5px'}}
                               />
                               -
                               <input
                                   type="number"
                                   min={q.randomOrder.range?.start || 1}
                                   max={questions.length}
                                   value={q.randomOrder.range?.end === undefined ? '' : q.randomOrder.range.end}
                                   onChange={(e) => handleRandomOrderChange(q.id, 'range', e.target.value, 'end')}
                                   placeholder="終了"
                                    style={{width: '70px', marginLeft: '5px'}}
                               />
                               問目
                           </label>
                           <label>
                               固定位置 (任意):
                               <select
                                   value={q.randomOrder.position || ''}
                                   onChange={(e) => handleRandomOrderChange(q.id, 'position', e.target.value || undefined)}
                                   disabled={q.randomOrder.range?.start !== undefined || q.randomOrder.range?.end !== undefined} // 範囲指定と同時には使えない
                               >
                                   <option value="">指定なし</option>
                                   {/* <option value="first">必ず最初</option> */}
                                   <option value="last">必ず最後</option>
                               </select>
                           </label>
                           { (q.randomOrder.range?.start !== undefined || q.randomOrder.range?.end !== undefined) && q.randomOrder.position &&
                               <p style={{color: 'orange', fontSize: '0.8em'}}>範囲指定と固定位置指定は同時にできません。固定位置指定は無視されます。</p>
                           }
                       </div>
                   )}
               </div>
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

// Add some basic styling for EditScreen
const styles = `
.edit-screen .checklist-meta {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}
.edit-screen .checklist-meta label {
  display: block;
  margin-bottom: 15px;
  font-weight: bold;
}
.edit-screen .checklist-meta input[type="text"],
.edit-screen .checklist-meta textarea {
  width: 100%;
  margin-top: 5px;
}

.edit-screen .questions-title {
  margin-bottom: 15px;
}

.edit-screen .questions-list {
  margin-bottom: 20px;
}

.edit-screen .question-editor {
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 5px;
  padding: 15px;
  margin-bottom: 15px;
}

.edit-screen .question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #ddd;
}
.edit-screen .question-header span {
  font-weight: bold;
}
.edit-screen .question-actions {
    display: flex;
    gap: 5px;
}
.edit-screen .question-actions .move-button {
    padding: 2px 6px;
    font-size: 0.8em;
}
.edit-screen .question-actions .remove-button {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 3px 8px;
  font-size: 0.8em;
  border-radius: 3px;
}
.edit-screen .question-actions .remove-button:hover {
  background-color: #d32f2f;
}
.edit-screen .question-actions .remove-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}


.edit-screen .question-editor textarea {
  width: 100%;
  margin-bottom: 10px;
}

.edit-screen .question-options {
  display: flex;
  flex-direction: column;
  gap: 15px; /* Space between option groups */
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #ddd;
}
.edit-screen .question-options > div { /* Direct children divs */
    padding: 10px;
    background-color: #fff;
    border: 1px solid #eee;
    border-radius: 4px;
}


.edit-screen .question-options label {
  display: flex; /* Use flex for alignment */
  align-items: center;
  gap: 8px; /* Space between label text and input */
  font-size: 0.9em;
}
.edit-screen .question-options select,
.edit-screen .question-options input[type="number"],
.edit-screen .question-options input[type="text"] {
  flex-grow: 1; /* Allow input to take available space */
   width: auto; /* Override default width: 100% */
   margin-bottom: 0; /* Remove default margin */
}


.edit-screen .multiple-choice-options h4,
.edit-screen .number-validation h4,
.edit-screen .random-order-settings h4 {
  margin-bottom: 10px;
  font-size: 1em;
  font-weight: normal;
  color: #555;
}
.edit-screen .multiple-choice-options .option-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  gap: 5px;
}
.edit-screen .multiple-choice-options .option-item input {
    flex-grow: 1;
}

.edit-screen .remove-option-button {
  background: none;
  border: none;
  color: #f44336;
  font-size: 1.2em;
  padding: 0 5px;
  line-height: 1;
}
.edit-screen .add-option-button,
.edit-screen .add-question-button {
  margin-top: 10px;
  background-color: #e0e0e0;
  border: 1px solid #ccc;
  padding: 5px 10px;
  font-size: 0.9em;
}
.edit-screen .add-question-button {
    display: block; /* Make it block level */
    margin: 20px 0; /* Add vertical margin */
}

.edit-screen .number-validation,
.edit-screen .random-order-settings .random-details {
  display: flex;
  flex-direction: column;
  gap: 10px; /* Space between validation/random options */
  margin-top: 5px;
  padding-left: 15px; /* Indent options */
}
.edit-screen .number-validation label,
.edit-screen .random-order-settings .random-details label {
    width: fit-content; /* Prevent labels from stretching */
}


.edit-screen .save-actions {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
}
.edit-screen .save-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
}
.edit-screen .save-button:hover {
  background-color: #45a049;
}
.edit-screen .cancel-button {
  background-color: #f44336;
  color: white;
  border: none;
   padding: 10px 15px;
}
.edit-screen .cancel-button:hover {
    background-color: #d32f2f;
}
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);
