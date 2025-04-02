import React, { useState, useEffect } from 'react';
import './WikiEditScreen.css'; // Import CSS

function WikiEditScreen({ pageId, initialContent, onSave, onCancel }) {
  const [content, setContent] = useState('');

  useEffect(() => {
    setContent(initialContent || '');
  }, [initialContent]);

  const handleSave = () => {
    onSave(pageId, content);
  };

  return (
    <div className="screen-container wiki-edit-screen">
      <h2 className="screen-title">Wiki ページ編集 {pageId ? `(${pageId})` : '(新規)'}</h2>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Markdown 形式で内容を入力..."
        className="wiki-editor-textarea"
      />
      <div className="wiki-edit-actions">
        <button onClick={handleSave}>保存</button>
        <button onClick={onCancel} className="cancel-button">キャンセル</button>
      </div>
    </div>
  );
}

export default WikiEditScreen;

// Removed inline style injection
