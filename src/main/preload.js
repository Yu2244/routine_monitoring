const { contextBridge, ipcRenderer } = require('electron');

// メインプロセスからレンダラープロセスへ公開するAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // メインプロセスに関数を呼び出す (invoke)
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  importData: () => ipcRenderer.invoke('import-data'),
  exportData: () => ipcRenderer.invoke('export-data'),

  // メインプロセスからの通知を受け取る (on)
  onDataImported: (callback) => ipcRenderer.on('data-imported', (_event, value) => callback(value)),

  // リスナーのクリーンアップ関数 (removeListener)
  // Reactコンポーネントのアンマウント時に呼び出すことが重要
  removeDataImportedListener: () => ipcRenderer.removeAllListeners('data-imported'),
});
