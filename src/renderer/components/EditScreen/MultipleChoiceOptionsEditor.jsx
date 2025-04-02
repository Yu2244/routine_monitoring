import React from 'react';

function MultipleChoiceOptionsEditor({ questionId, options, onOptionChange, onAddOption, onRemoveOption }) {
  return (
    <div className="multiple-choice-options">
      <h4>選択肢:</h4>
      {options.map((option, optIndex) => (
        <div key={optIndex} className="option-item">
          <input
            type="text"
            value={option}
            onChange={(e) => onOptionChange(questionId, optIndex, e.target.value)}
            placeholder={`選択肢 ${optIndex + 1}`}
            required
          />
          <button onClick={() => onRemoveOption(questionId, optIndex)} className="remove-option-button">×</button>
        </div>
      ))}
      <button onClick={() => onAddOption(questionId)} className="add-option-button">+ 選択肢を追加</button>
    </div>
  );
}

export default MultipleChoiceOptionsEditor;
