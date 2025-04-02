import React from 'react';
import { isGraphableType } from '../../utils/graphUtils';

// Receive onQuestionChange directly to handle nested state updates more easily
function GraphConfigEditor({ question, onQuestionChange }) {
  const { id: questionId, type, text, options, graphConfig } = question;

  if (!isGraphableType(type)) {
    return null; // Don't render if the question type is not graphable
  }

  // Helper to update nested graphConfig state
  const handleConfigChange = (field, value) => {
      let processedValue = value;
      if (field === 'rollingWindowSize') {
          // Remove default setting on empty string, just parse or ensure >= 1
          const num = parseInt(value, 10);
          processedValue = isNaN(num) ? undefined : Math.max(1, num); // Use undefined for empty/invalid, ensure >= 1
      } else if (field === 'thresholdValue') {
          processedValue = value === '' ? undefined : Number(value);
      } else if (field === 'thresholdOption' || field === 'alertCondition') {
          processedValue = value || undefined; // Ensure empty string becomes undefined
      }
      // Call the main handler passed from EditScreen
      onQuestionChange(questionId, 'graphConfig', processedValue, field);
  };

  return (
    <div className="graph-config-settings">
      <h4>グラフ設定:</h4>
      <label>
        <input
          type="checkbox"
          checked={graphConfig.enabled}
          onChange={(e) => handleConfigChange('enabled', e.target.checked)}
        /> グラフに表示する
      </label>
      {graphConfig.enabled && (
        <div className="graph-details">
          {/* Removed Custom Graph Name Input */}
          {/* Rolling Window Size Input (only for yes/no and multiple_choice) */}
          {(type === 'yes_no' || type === 'multiple_choice') && (
            <label>
              集計期間 (回答数):
              <input
                type="number"
                min="1"
                step="1"
                // Display empty string if undefined, otherwise the value
                value={graphConfig.rollingWindowSize === undefined ? '' : graphConfig.rollingWindowSize}
                onChange={(e) => handleConfigChange('rollingWindowSize', e.target.value)}
                placeholder="例: 7"
                style={{ width: '60px' }}
              />
              回分
            </label>
          )}
          <label>
            閾値 (任意):
            <input
              type="number"
              value={graphConfig.thresholdValue === undefined ? '' : graphConfig.thresholdValue}
              onChange={(e) => handleConfigChange('thresholdValue', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="数値を入力"
              step="any"
            />
          </label>
          {/* Threshold option selector for multiple choice */}
          {type === 'multiple_choice' && graphConfig.thresholdValue !== undefined && (
            <label>
              閾値の対象選択肢:
              <select
                value={graphConfig.thresholdOption || ''}
                onChange={(e) => handleConfigChange('thresholdOption', e.target.value || undefined)}
                required={graphConfig.thresholdValue !== undefined}
              >
                <option value="">選択してください</option>
                {(options || []).map((opt, i) => opt.trim() && <option key={i} value={opt}>{opt}</option>)}
              </select>
            </label>
          )}
          {/* Alert condition selector (only if threshold is set) */}
          {graphConfig.thresholdValue !== undefined && (
            <label>
              アラート条件:
              <select
                value={graphConfig.alertCondition || ''}
                onChange={(e) => handleConfigChange('alertCondition', e.target.value || undefined)}
                required={graphConfig.thresholdValue !== undefined}
              >
                <option value="">選択してください</option>
                <option value="above">閾値を超えたら</option>
                <option value="below">閾値を下回ったら</option>
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export default GraphConfigEditor;
