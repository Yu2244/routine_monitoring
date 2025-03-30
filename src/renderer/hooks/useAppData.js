import { useState, useCallback } from 'react';

// Custom hook for managing checklist, history, and dismissed alerts
export function useAppData() {
  const [checklist, setChecklist] = useState(null);
  const [history, setHistory] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all app data (checklist, history, dismissed alerts)
  const loadAppData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.loadData();
      console.log('Loaded app data:', data);
      setChecklist(data.checklist);
      setHistory(data.history || []);
      setDismissedAlerts(data.dismissedAlerts || []);
    } catch (err) {
      console.error('Failed to load app data:', err);
      setError('アプリケーションデータの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save app data (can save specific parts or all)
  const saveData = useCallback(async (newData) => {
    // Merges new data with existing state before saving
    const dataToSave = {
      checklist: newData.checklist !== undefined ? newData.checklist : checklist,
      history: newData.history !== undefined ? newData.history : history,
      dismissedAlerts: newData.dismissedAlerts !== undefined ? newData.dismissedAlerts : dismissedAlerts,
    };
    try {
      await window.electronAPI.saveData(dataToSave);
      // Update state after successful save
      if (newData.checklist !== undefined) setChecklist(newData.checklist);
      if (newData.history !== undefined) setHistory(newData.history);
      if (newData.dismissedAlerts !== undefined) setDismissedAlerts(newData.dismissedAlerts);
    } catch (err) {
      console.error('Failed to save app data:', err);
      alert('データの保存に失敗しました。');
    }
  }, [checklist, history, dismissedAlerts]); // Dependencies include all parts of the data

  // Specific actions that modify data and then save
  const addAnswer = useCallback(async (answer) => {
    const newHistory = [...history, answer];
    await saveData({ history: newHistory });
  }, [history, saveData]);

  const updateChecklist = useCallback(async (newChecklistConfig) => {
    await saveData({ checklist: newChecklistConfig });
  }, [saveData]);

  const deleteAnswer = useCallback(async (submittedAt) => {
    if (window.confirm(`${new Date(submittedAt).toLocaleString('ja-JP')} の回答を削除しますか？`)) {
      const newHistory = history.filter(item => item.submittedAt !== submittedAt);
      await saveData({ history: newHistory });
    }
  }, [history, saveData]);

  const dismissAlert = useCallback(async (alertId) => {
    console.log("Dismissing alert permanently:", alertId);
    // Prevent duplicates
    if (!dismissedAlerts.includes(alertId)) {
        const newDismissedAlerts = [...dismissedAlerts, alertId];
        await saveData({ dismissedAlerts: newDismissedAlerts });
    }
  }, [dismissedAlerts, saveData]);

  return {
    checklist,
    history,
    dismissedAlerts,
    isLoading,
    error,
    loadAppData,
    addAnswer,
    updateChecklist,
    deleteAnswer,
    dismissAlert,
    // Expose setters needed for import handling in App.jsx
    setChecklist,
    setHistory,
    setDismissedAlerts,
    // Add import/export handlers
    handleImport,
    handleExport,
  };

  // --- Import/Export Handlers ---
  // Note: These interact with electronAPI directly, which is fine in a hook
  // They also rely on the state setters exposed by this hook
  async function handleImport() {
      try {
          const result = await window.electronAPI.importData();
          if (result.success) {
              alert(result.message);
              // State update is handled by the onDataImported listener in App.jsx
              // which calls the setters exposed by this hook.
          } else {
              alert(`インポート失敗: ${result.message}`);
          }
      } catch (err) {
          console.error('Import failed:', err);
          alert('データのインポート中にエラーが発生しました。');
      }
  };

  async function handleExport() {
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
  // --- End Import/Export Handlers ---

}
