import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Appコンポーネントをインポート (後で作成)
import './index.css'; // グローバルCSS (後で作成)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
