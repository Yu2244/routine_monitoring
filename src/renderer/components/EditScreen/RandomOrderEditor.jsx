import React from 'react';

function RandomOrderEditor({ questionId, randomOrder, totalQuestions, onRandomOrderChange }) {
  const handleRangeChange = (subField, value) => {
    onRandomOrderChange(questionId, 'range', value, subField);
  };

  const handlePositionChange = (value) => {
    onRandomOrderChange(questionId, 'position', value || undefined); // Send undefined if empty
  };

  const handleEnabledChange = (enabled) => {
    onRandomOrderChange(questionId, 'enabled', enabled);
  };

  const isRangeDisabled = randomOrder.position !== undefined;
  const isPositionDisabled = randomOrder.range?.start !== undefined || randomOrder.range?.end !== undefined;

  return (
    <div className="random-order-settings">
      <h4>ランダム順序設定:</h4>
      <label>
        <input
          type="checkbox"
          checked={randomOrder.enabled || false}
          onChange={(e) => handleEnabledChange(e.target.checked)}
        /> ランダム順序を有効にする
      </label>
      {randomOrder.enabled && (
        <div className="random-details">
          <label>
            範囲 (任意):
            <input
              type="number"
              min="1"
              max={totalQuestions}
              value={randomOrder.range?.start === undefined ? '' : randomOrder.range.start}
              onChange={(e) => handleRangeChange('start', e.target.value)}
              placeholder="開始"
              style={{ width: '70px', marginRight: '5px' }}
              disabled={isRangeDisabled}
            />
            -
            <input
              type="number"
              min={randomOrder.range?.start || 1}
              max={totalQuestions}
              value={randomOrder.range?.end === undefined ? '' : randomOrder.range.end}
              onChange={(e) => handleRangeChange('end', e.target.value)}
              placeholder="終了"
              style={{ width: '70px', marginLeft: '5px' }}
              disabled={isRangeDisabled}
            />
            問目
          </label>
          <label>
            固定位置 (任意):
            <select
              value={randomOrder.position || ''}
              onChange={(e) => handlePositionChange(e.target.value)}
              disabled={isPositionDisabled}
            >
              <option value="">指定なし</option>
              <option value="last">必ず最後</option>
              {/* Add other positions like 'first' if needed */}
            </select>
          </label>
          {isRangeDisabled && isPositionDisabled && // Should not happen with current logic, but good check
            <p style={{ color: 'red', fontSize: '0.8em' }}>エラー: 範囲と固定位置は同時に指定できません。</p>
          }
           {isRangeDisabled && !isPositionDisabled && randomOrder.position &&
               <p style={{color: 'orange', fontSize: '0.8em'}}>固定位置指定が優先されています。</p>
           }
            {isPositionDisabled && !isRangeDisabled && (randomOrder.range?.start !== undefined || randomOrder.range?.end !== undefined) &&
               <p style={{color: 'orange', fontSize: '0.8em'}}>範囲指定が優先されています。</p>
           }
        </div>
      )}
    </div>
  );
}

export default RandomOrderEditor;
