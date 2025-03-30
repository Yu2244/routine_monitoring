import React, { useState, useEffect } from 'react';
import './InputModal.css'; // Create this CSS file next

function InputModal({ isOpen, title, message, defaultValue = '', onOk, onCancel }) {
  const [inputValue, setInputValue] = useState(defaultValue);

  // Reset input value when modal opens with a new default
  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) {
    return null;
  }

  const handleOk = () => {
    onOk(inputValue);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleOk();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="input-modal-overlay" onClick={onCancel}>
      <div className="input-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{title || '入力'}</h3>
        {message && <p>{message}</p>}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoFocus // Focus the input when the modal opens
        />
        <div className="input-modal-actions">
          <button onClick={onCancel} className="cancel-button">キャンセル</button>
          <button onClick={handleOk} className="ok-button">OK</button>
        </div>
      </div>
    </div>
  );
}

export default InputModal;
