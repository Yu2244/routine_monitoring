import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// Import Screens
import ChecklistScreen from './screens/ChecklistScreen';
import HistoryScreen from './screens/HistoryScreen';
import EditScreen from './screens/EditScreen';
import GraphScreen from './screens/GraphScreen';
import AlertScreen from './screens/AlertScreen';
import WikiScreen from './screens/wiki/WikiScreen';
import WikiEditScreen from './screens/wiki/WikiEditScreen';

// Import Custom Hooks
import { useAppData } from './hooks/useAppData';
import { useWiki } from './hooks/useWiki';
import { useGraphData } from './hooks/useGraphData';
import InputModal from './components/common/InputModal';

// Import alert calculation helpers from the new utility file
import { checkAlertCondition, getRelevantValue } from './utils/alertUtils';

import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('checklist');

  // Use Custom Hooks for state management
  const {
    checklist, history, dismissedAlerts, isLoading: isLoadingAppData, error: appDataError,
    loadAppData, addAnswer, updateChecklist, deleteAnswer, dismissAlert,
    setChecklist: setAppDataChecklist,
    setHistory: setAppDataHistory,
    setDismissedAlerts: setAppDataDismissedAlerts,
    handleImport,
    handleExport,
  } = useAppData();

  const {
    pages: wikiPages, selectedPageId: selectedWikiPageId, selectedPageContent,
    isEditing: isEditingWiki, editPageId: wikiEditPageId, editInitialContent: wikiEditInitialContent,
    isLoadingWiki, loadPages: loadWikiPages, selectPage: handleSelectWikiPage,
    createPage: handleCreateWikiPage, editPage: handleEditWikiPage,
    savePage: handleSaveWikiPage, cancelEdit: handleCancelWikiEdit, deletePage: handleDeleteWikiPage,
    setPages: setWikiPagesData,
    setSelectedPageId: setSelectedWikiPageIdDirect,
    setSelectedPageContent: setSelectedWikiPageContentDirect,
    isPromptOpen: isWikiPromptOpen,
    promptOptions: wikiPromptOptions,
    handlePromptOk: handleWikiPromptOk,
    handlePromptCancel: handleWikiPromptCancel,
  } = useWiki();

  // Calculate graph data using the hook
  const graphData = useGraphData(checklist, history);

  // Combined loading and error states
  const isLoading = isLoadingAppData || isLoadingWiki;
  const error = appDataError;

  // --- Calculate Active Alert Count ---
  const activeAlertCount = useMemo(() => {
      if (!checklist || !checklist.questions || !history || history.length === 0 || !graphData || !dismissedAlerts) {
          return 0;
      }
      let count = 0;
      checklist.questions.forEach(q => {
          if (
              q.graphConfig?.enabled &&
              q.graphConfig.thresholdValue !== undefined &&
              q.graphConfig.alertCondition !== undefined &&
              (q.type !== 'multiple_choice' || q.graphConfig.thresholdOption !== undefined)
          ) {
              const questionData = graphData[q.id];
              if (questionData && questionData.length > 0) {
                  const latestDataPoint = questionData[questionData.length - 1];
                  const currentValue = getRelevantValue(latestDataPoint, q);
                  const threshold = q.graphConfig.thresholdValue;
                  const condition = q.graphConfig.alertCondition;
                  const alertId = `${q.id}-${latestDataPoint.date}`;

                  if (checkAlertCondition(currentValue, threshold, condition) && !dismissedAlerts.includes(alertId)) {
                      count++;
                  }
              }
          }
      });
      return count;
  }, [checklist, history, graphData, dismissedAlerts]);
  // --- End Active Alert Count ---


  // --- Initial Load & Import Handling ---
  useEffect(() => {
    const initialLoad = async () => {
      await loadAppData();
      await loadWikiPages();
    };
    initialLoad();

    const removeListener = window.electronAPI.onDataImported((importedData) => {
      console.log('Data imported event received:', importedData);
      alert('データがインポートされました。アプリケーションを更新します。');
      setAppDataChecklist(importedData.checklist);
      setAppDataHistory(importedData.history || []);
      setAppDataDismissedAlerts(importedData.dismissedAlerts || []);
      loadWikiPages().then((loadedPages) => {
          if (loadedPages && loadedPages.length > 0) {
              handleSelectWikiPage(loadedPages[0].id);
          } else {
              setSelectedWikiPageIdDirect(null);
              setSelectedWikiPageContentDirect('');
          }
      });
      setCurrentScreen('checklist');
    });

    return () => {
      window.electronAPI.removeDataImportedListener();
    };
  }, [loadAppData, loadWikiPages, setAppDataChecklist, setAppDataHistory, setAppDataDismissedAlerts, handleSelectWikiPage, setSelectedWikiPageIdDirect, setSelectedWikiPageContentDirect]);

  // --- Navigation ---
  const navigate = (screen) => {
    if (isEditingWiki && currentScreen === 'wikiEdit' && screen !== 'wikiEdit') {
      if (!window.confirm("Wiki の編集中の内容が失われます。移動しますか？")) return;
      handleCancelWikiEdit();
    }
    setCurrentScreen(screen);
    if (screen === 'wiki' && !selectedWikiPageId && wikiPages.length > 0) {
        handleSelectWikiPage(wikiPages[0].id);
    }
  };

  // --- Markdown Link Handling ---
  const LinkRenderer = ({ href, children }) => {
    if (href && href.endsWith('.md')) {
      const targetPageId = href.replace(/\.md$/, '');
      if (wikiPages.some(p => p.id === targetPageId)) {
        return <a href="#" onClick={(e) => { e.preventDefault(); handleSelectWikiPage(targetPageId); }}>{children}</a>;
      } else {
        return <span style={{ color: 'red', textDecoration: 'line-through' }}>{children}</span>;
      }
    }
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        return <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.preventDefault(); window.open(href, '_blank'); }}>{children}</a>;
    }
    if (href && href.startsWith('#')) {
        return <a href={href} onClick={(e) => { e.preventDefault(); const targetId = href.substring(1); const element = document.getElementById(targetId); if (element) element.scrollIntoView({ behavior: 'smooth' }); }}>{children}</a>;
    }
    return <a>{children}</a>;
  };
  // --- End Markdown Link Handling ---

  // --- Screen Rendering ---
  const renderScreen = () => {
    if (isLoading) return <div className="loading">読み込み中...</div>;
    if (error) return <div className="error">{error}</div>;

    let screenToShow = currentScreen;
    if (isEditingWiki) {
        screenToShow = 'wikiEdit';
    }

    switch (screenToShow) {
        case 'checklist': return <ChecklistScreen checklist={checklist} addAnswer={addAnswer} navigate={navigate} />;
        case 'history': return <HistoryScreen history={history} checklist={checklist} deleteAnswer={deleteAnswer} />;
        case 'edit': return <EditScreen checklist={checklist} updateChecklist={updateChecklist} navigate={navigate} />;
        case 'graph': return <GraphScreen history={history} checklist={checklist} graphData={graphData} />;
        case 'alerts': return <AlertScreen history={history} checklist={checklist} graphData={graphData} dismissedAlerts={dismissedAlerts} dismissAlert={dismissAlert} />;
        case 'wiki': return <WikiScreen pages={wikiPages} selectedPage={selectedWikiPageId} content={<ReactMarkdown children={selectedPageContent} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{ a: LinkRenderer }} />} onSelectPage={handleSelectWikiPage} onEditPage={handleEditWikiPage} onCreatePage={handleCreateWikiPage} onDeletePage={handleDeleteWikiPage} navigate={navigate} />;
        case 'wikiEdit': return <WikiEditScreen pageId={wikiEditPageId} initialContent={wikiEditInitialContent} onSave={handleSaveWikiPage} onCancel={handleCancelWikiEdit} />;
        default: return <div>画面が見つかりません</div>;
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
                  {/* Add alert indicator */}
                  <li className={currentScreen === 'alerts' ? 'active' : ''} onClick={() => navigate('alerts')}>
                    アラート {activeAlertCount > 0 && <span className="alert-indicator">{activeAlertCount}</span>}
                  </li>
                  <li className={currentScreen === 'wiki' ? 'active' : ''} onClick={() => navigate('wiki')}>Wiki</li>
              </ul>
              <div className="data-actions">
                  <button onClick={handleImport}>インポート</button>
                  <button onClick={handleExport}>エクスポート</button>
              </div>
          </nav>
          <main className="main-content">
              {renderScreen()}
          </main>
          {/* Render the Input Modal */}
          <InputModal
              isOpen={isWikiPromptOpen}
              title={wikiPromptOptions.title}
              message={wikiPromptOptions.message}
              defaultValue={wikiPromptOptions.defaultValue}
              onOk={handleWikiPromptOk}
              onCancel={handleWikiPromptCancel}
          />
      </div>
  );
}

export default App;
