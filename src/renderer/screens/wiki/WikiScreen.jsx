import React from 'react';
import './WikiScreen.css'; // Import the CSS file

// Add onDeletePage prop
function WikiScreen({ pages, selectedPage, content, onSelectPage, onEditPage, onCreatePage, onDeletePage }) {
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
                onClick={() => onSelectPage(page.id)}
              >
                <span>{page.name}</span>
                {/* Add delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent li onClick from firing
                    if (window.confirm(`ページ「${page.name}」を削除しますか？`)) {
                      onDeletePage(page.id);
                    }
                  }}
                  className="wiki-delete-button"
                  title={`ページ「${page.name}」を削除`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button onClick={onCreatePage} className="wiki-create-button">+ 新規ページ作成</button>
        </nav>
        <main className="wiki-content">
          {selectedPage ? (
            <>
              {/* Render the content directly (it should be a React element now) */}
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

// Removed inline style injection
