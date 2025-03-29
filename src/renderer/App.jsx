import React, { useState, useEffect } from 'react';
import ChecklistScreen from './screens/ChecklistScreen'; // 後で作成
import HistoryScreen from './screens/HistoryScreen'; // 後で作成
import EditScreen from './screens/EditScreen'; // 後で作成
import GraphScreen from './screens/GraphScreen'; // 後で作成
import './App.css'; // Appコンポーネント用CSS (後で作成)

function App() {
  const [currentScreen, setCurrentScreen] = useState('checklist'); // 'checklist', 'history', 'edit', 'graph'
  const [checklist, setChecklist] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // アプリケーションデータの読み込み
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.loadData();
      console.log('Loaded data:', data); // デバッグ用ログ
      setChecklist(data.checklist);
      setHistory(data.history || []); // historyがnullの場合に空配列をセット
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('データの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // アプリケーションデータの保存
  const saveData = async (newChecklist, newHistory) => {
    try {
      const dataToSave = {
        checklist: newChecklist !== undefined ? newChecklist : checklist,
        history: newHistory !== undefined ? newHistory : history,
      };
      console.log('Saving data:', dataToSave); // デバッグ用ログ
      await window.electronAPI.saveData(dataToSave);
      // 保存後に状態を更新
      if (newChecklist !== undefined) setChecklist(newChecklist);
      if (newHistory !== undefined) setHistory(newHistory);
    } catch (err) {
      console.error('Failed to save data:', err);
      alert('データの保存に失敗しました。'); // 簡単なエラー通知
    }
  };

  // チェックリストの回答を追加
  const addAnswer = async (answer) => {
    const newHistory = [...history, answer];
    await saveData(undefined, newHistory); // checklistは変更せずhistoryのみ更新
  };

  // チェックリスト設定の更新
  const updateChecklist = async (newChecklistConfig) => {
    await saveData(newChecklistConfig, undefined); // historyは変更せずchecklistのみ更新
  };

  // 特定の回答履歴を削除
  const deleteAnswer = async (submittedAt) => {
    if (window.confirm(`${new Date(submittedAt).toLocaleString('ja-JP')} の回答を削除しますか？`)) {
      const newHistory = history.filter(item => item.submittedAt !== submittedAt);
      await saveData(undefined, newHistory); // checklistは変更せずhistoryのみ更新
    }
  };

  // データのインポート処理
  const handleImport = async () => {
    try {
      const result = await window.electronAPI.importData();
      if (result.success) {
        alert(result.message);
        // インポート成功後、メインプロセスからの通知を待つか、
        // ここで直接データを再読み込みする
        // loadData(); // メインプロセスからの通知を使う場合は不要
      } else {
        alert(`インポート失敗: ${result.message}`);
      }
    } catch (err) {
      console.error('Import failed:', err);
      alert('データのインポート中にエラーが発生しました。');
    }
  };

  // データのエクスポート処理
  const handleExport = async () => {
    try {
      const result = await window.electronAPI.exportData();
      if (result.success) {
        alert(result.message);
      } else {
        alert(`エクスポート失敗: ${result.message}`);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('データのエクスポート中にエラーが発生しました。');
    }
  };

  // 初期データの読み込みとインポート通知リスナーの設定
  useEffect(() => {
    loadData();

    // メインプロセスからデータインポート完了の通知を受け取るリスナー
    const removeListener = window.electronAPI.onDataImported((importedData) => {
      console.log('Data imported event received:', importedData); // デバッグ用ログ
      alert('データがインポートされました。アプリケーションを更新します。');
      setChecklist(importedData.checklist);
      setHistory(importedData.history || []);
    });

    // コンポーネントのアンマウント時にリスナーを解除
    return () => {
      window.electronAPI.removeDataImportedListener();
    };
  }, []); // 空の依存配列で初回マウント時のみ実行

  // 画面切り替えハンドラ
  const navigate = (screen) => setCurrentScreen(screen);

  // ローディング中またはエラー発生時の表示
  if (isLoading) return <div className="loading">読み込み中...</div>;
  if (error) return <div className="error">{error}</div>;

  // 現在の画面に応じたコンポーネントのレンダリング
  const renderScreen = () => {
    switch (currentScreen) {
      case 'checklist':
        return <ChecklistScreen checklist={checklist} addAnswer={addAnswer} navigate={navigate} />;
      case 'history':
        // deleteAnswer 関数を props として渡す
        return <HistoryScreen history={history} checklist={checklist} deleteAnswer={deleteAnswer} />;
      case 'edit':
        return <EditScreen checklist={checklist} updateChecklist={updateChecklist} navigate={navigate} />;
      case 'graph':
        return <GraphScreen history={history} checklist={checklist} />;
      default:
        return <div>画面が見つかりません</div>;
    }
  };

  return (
    <div className="app-container">
      <nav className="sidebar">
        <h2>メニュー</h2>
        <ul>
          <li className={currentScreen === 'checklist' ? 'active' : ''} onClick={() => navigate('checklist')}>チェックリスト入力</li>
          <li className={currentScreen === 'history' ? 'active' : ''} onClick={() => navigate('history')}>回答履歴</li>
          <li className={currentScreen === 'edit' ? 'active' : ''} onClick={() => navigate('edit')}>チェックリスト編集</li>
          <li className={currentScreen === 'graph' ? 'active' : ''} onClick={() => navigate('graph')}>グラフ</li>
        </ul>
        <div className="data-actions">
          <button onClick={handleImport}>インポート</button>
          <button onClick={handleExport}>エクスポート</button>
        </div>
      </nav>
      <main className="main-content">
        {renderScreen()}
      </main>
    </div>
  );
}

export default App;
