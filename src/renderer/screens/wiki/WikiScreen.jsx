import React, { useState } from 'react';
import './WikiScreen.css'; // Import the CSS file

// Add onDeletePage and onRenamePage props
function WikiScreen({ pages, selectedPage, content, onSelectPage, onEditPage, onCreatePage, onDeletePage, onRenamePage }) {
  // State to manage which page title is being edited inline
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  const handleRenameClick = (page) => {
      setEditingTitleId(page.id);
      setNewTitle(page.name); // Initialize input with current name
  };

  const handleTitleChange = (e) => {
      setNewTitle(e.target.value);
  };

  const handleTitleSave = async (oldPageId) => {
      if (newTitle.trim() && oldPageId !== newTitle.trim()) {
          const success = await onRenamePage(oldPageId, newTitle.trim());
          if (success) {
              setEditingTitleId(null); // Exit edit mode on success
          }
          // Error handling is done within onRenamePage (useWiki hook) via alerts
      } else {
          setEditingTitleId(null); // Exit edit mode if name hasn't changed or is empty
          if (!newTitle.trim()) alert("ページ名を入力してください。"); // Alert if empty
      }
  };

  const handleTitleKeyDown = (e, oldPageId) => {
      if (e.key === 'Enter') {
          handleTitleSave(oldPageId);
      } else if (e.key === 'Escape') {
          setEditingTitleId(null); // Cancel on Escape
      }
  };

  // Cancel edit on blur if the input hasn't changed (or handle save on blur if preferred)
  const handleTitleBlur = (oldPageId) => {
      // Small delay to allow save button click to register if needed
      setTimeout(() => {
          if (editingTitleId === oldPageId) { // Check if still in edit mode for this item
             // Option 1: Save on blur
             // handleTitleSave(oldPageId);
             // Option 2: Cancel on blur (current implementation)
             setEditingTitleId(null);
          }
      }, 100);
  };


  return (
    <div className="screen-container wiki-screen">
      <h2 className="screen-title">Wiki</h2>
      <div className="wiki-layout">
        <nav className="wiki-sidebar">
          <h3>ページ一覧</h3>
          <ul>
            {pages.map(page => (
              <li
                key={page.id}
                className={selectedPage === page.id ? 'active' : ''}
                onClick={() => editingTitleId !== page.id && onSelectPage(page.id)} // Prevent selection while editing title
              >
                {editingTitleId === page.id ? (
                  <input
                    type="text"
                    value={newTitle}
                    onChange={handleTitleChange}
                    onKeyDown={(e) => handleTitleKeyDown(e, page.id)}
                    onBlur={() => handleTitleBlur(page.id)}
                    autoFocus
                    className="wiki-title-edit-input"
                  />
                ) : (
                  <span onDoubleClick={() => handleRenameClick(page)} title="ダブルクリックして名前を変更">
                    {page.name}
                  </span>
                )}
                <div className="wiki-page-actions">
                   {editingTitleId === page.id ? (
                       <button onClick={() => handleTitleSave(page.id)} className="wiki-save-button" title="保存">✓</button>
                   ) : (
                       <button onClick={() => handleRenameClick(page)} className="wiki-rename-button" title="名前を変更">✏️</button>
                   )}
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       if (window.confirm(`ページ「${page.name}」を削除しますか？`)) {
                         onDeletePage(page.id);
                       }
                     }}
                     className="wiki-delete-button"
                     title={`ページ「${page.name}」を削除`}
                   >
                     ×
                   </button>
                </div>
              </li>
            ))}
          </ul>
          <button onClick={onCreatePage} className="wiki-create-button">+ 新規ページ作成</button>
        </nav>
        <main className="wiki-content">
          {selectedPage ? (
            <>
              <div className="wiki-rendered-content">{content || 'ページを読み込み中...'}</div>
              <button onClick={() => onEditPage(selectedPage)}>このページを編集</button>
            </>
          ) : (
            <p>表示するページを選択してください。</p>
          )}
        </main>
      </div>
    </div>
  );
}

export default WikiScreen;
