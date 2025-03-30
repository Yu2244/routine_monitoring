const { contextBridge, ipcRenderer } = require('electron');

// メインプロセスからレンダラープロセスへ公開するAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // メインプロセスに関数を呼び出す (invoke)
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  importData: () => ipcRenderer.invoke('import-data'), // Handles both checklist and wiki
  exportData: () => ipcRenderer.invoke('export-data'), // Handles both checklist and wiki

  // --- Wiki APIs ---
  listWikiPages: () => ipcRenderer.invoke('list-wiki-pages'),
  readWikiPage: (pageId) => ipcRenderer.invoke('read-wiki-page', pageId),
  writeWikiPage: (pageId, content) => ipcRenderer.invoke('write-wiki-page', pageId, content),
  deleteWikiPage: (pageId) => ipcRenderer.invoke('delete-wiki-page', pageId),
  showPromptDialog: (options) => ipcRenderer.invoke('show-prompt-dialog', options), // Add prompt API
  // --- End Wiki APIs ---

  // メインプロセスからの通知を受け取る (on)
  onDataImported: (callback) => ipcRenderer.on('data-imported', (_event, value) => callback(value)),

  // リスナーのクリーンアップ関数 (removeListener)
  // Reactコンポーネントのアンマウント時に呼び出すことが重要
  removeDataImportedListener: () => ipcRenderer.removeAllListeners('data-imported'),
});
