import React from 'react';

function NumberValidationEditor({ questionId, validation, onValidationChange }) {
  return (
    <div className="number-validation">
      <h4>数値制限:</h4>
      <label>
        <input
          type="checkbox"
          checked={validation.integer || false}
          onChange={(e) => onValidationChange(questionId, 'integer', e.target.checked)}
        /> 整数のみ
      </label>
      <label>
        最小値:
        <input
          type="number"
          value={validation.min === undefined ? '' : validation.min}
          onChange={(e) => onValidationChange(questionId, 'min', e.target.value)}
          placeholder="指定なし"
          step={validation.integer ? 1 : 'any'}
        />
      </label>
      <label>
        最大値:
        <input
          type="number"
          value={validation.max === undefined ? '' : validation.max}
          onChange={(e) => onValidationChange(questionId, 'max', e.target.value)}
          placeholder="指定なし"
          step={validation.integer ? 1 : 'any'}
        />
      </label>
    </div>
  );
}

export default NumberValidationEditor;
