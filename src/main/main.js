const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// --- Paths ---
const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'routineData.json');
const wikiDirPath = path.join(userDataPath, 'wiki'); // Wiki directory path

// Ensure wiki directory exists
try {
  if (!fs.existsSync(wikiDirPath)) {
    fs.mkdirSync(wikiDirPath);
  }
} catch (error) {
  console.error('Failed to create wiki directory:', error);
}

// --- Checklist/History Data Handling ---
function loadAppData() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf-8');
      // Ensure dismissedAlerts exists when loading old data
      const parsedData = JSON.parse(data);
      return {
          checklist: parsedData.checklist || null,
          history: parsedData.history || [],
          dismissedAlerts: parsedData.dismissedAlerts || [] // Default if missing
      };
    }
  } catch (error) {
    console.error('Failed to load app data:', error);
  }
  // Default data if file doesn't exist or fails to load
  return { checklist: null, history: [], dismissedAlerts: [] };
}

// Application data saving (Ensure dismissedAlerts is saved)
function saveAppData(data) { // data should include { checklist, history, dismissedAlerts }
  try {
    // Ensure dismissedAlerts is always an array, even if not provided
    const dataToSave = {
        checklist: data.checklist,
        history: data.history || [],
        dismissedAlerts: data.dismissedAlerts || []
    };
    fs.writeFileSync(dataFilePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save app data:', error);
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

ipcMain.handle('load-data', async () => loadAppData());

ipcMain.handle('save-data', async (event, data) => {
  saveAppData(data);
  return { success: true };
});

// --- Wiki Data Handling ---

ipcMain.handle('list-wiki-pages', async () => {
  try {
    const files = fs.readdirSync(wikiDirPath);
    const pages = files
      .filter(file => file.endsWith('.md'))
      .map(file => ({ id: path.basename(file, '.md'), name: path.basename(file, '.md') }));
    return { success: true, pages };
  } catch (error) {
    console.error('Failed to list wiki pages:', error);
    return { success: false, message: `Wiki ページの読み込みに失敗しました: ${error.message}` };
  }
});

ipcMain.handle('read-wiki-page', async (event, pageId) => {
  const filePath = path.join(wikiDirPath, `${pageId}.md`);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content };
    } else {
      return { success: false, message: 'ページが見つかりません。' };
    }
  } catch (error) {
    console.error(`Failed to read wiki page ${pageId}:`, error);
    return { success: false, message: `ページの読み込み中にエラーが発生しました: ${error.message}` };
  }
});

ipcMain.handle('write-wiki-page', async (event, pageId, content) => {
  if (!pageId || pageId.includes('/') || pageId.includes('\\') || pageId.startsWith('.')) {
      return { success: false, message: '無効なページ名です。' };
  }
  const filePath = path.join(wikiDirPath, `${pageId}.md`);
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error(`Failed to write wiki page ${pageId}:`, error);
    return { success: false, message: `ページの保存中にエラーが発生しました: ${error.message}` };
  }
});

ipcMain.handle('delete-wiki-page', async (event, pageId) => {
   if (!pageId || pageId.includes('/') || pageId.includes('\\') || pageId.startsWith('.')) {
       return { success: false, message: '無効なページ名です。' };
   }
  const filePath = path.join(wikiDirPath, `${pageId}.md`);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    } else {
      return { success: false, message: '削除するページが見つかりません。' };
    }
  } catch (error) {
    console.error(`Failed to delete wiki page ${pageId}:`, error);
    return { success: false, message: `ページの削除中にエラーが発生しました: ${error.message}` };
  }
});

// Rename a wiki page
ipcMain.handle('rename-wiki-page', async (event, oldPageId, newPageId) => {
  // Validate both old and new IDs
  const forbiddenCharsRegex = /[/\\:*?"<>|]/;
  if (!oldPageId || forbiddenCharsRegex.test(oldPageId) || oldPageId.startsWith('.')) {
      return { success: false, message: '元のページ名が無効です。' };
  }
   if (!newPageId || forbiddenCharsRegex.test(newPageId) || newPageId.startsWith('.')) {
       return { success: false, message: '新しいページ名が無効です。' };
   }
   if (oldPageId === newPageId) {
       return { success: true }; // No change needed
   }

  const oldFilePath = path.join(wikiDirPath, `${oldPageId}.md`);
  const newFilePath = path.join(wikiDirPath, `${newPageId}.md`);

  try {
    if (!fs.existsSync(oldFilePath)) {
      return { success: false, message: '元のページが見つかりません。' };
    }
    if (fs.existsSync(newFilePath)) {
      return { success: false, message: '新しいページ名は既に使用されています。' };
    }
    fs.renameSync(oldFilePath, newFilePath);
    return { success: true };
  } catch (error) {
    console.error(`Failed to rename wiki page ${oldPageId} to ${newPageId}:`, error);
    return { success: false, message: `ページの名称変更中にエラーが発生しました: ${error.message}` };
  }
});


// --- Import/Export including Wiki ---

ipcMain.handle('export-data', async () => {
  const appData = loadAppData();
  let wikiData = {};
  try {
    const files = fs.readdirSync(wikiDirPath);
    files.filter(file => file.endsWith('.md')).forEach(file => {
      const pageId = path.basename(file, '.md');
      const filePath = path.join(wikiDirPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      wikiData[pageId] = Buffer.from(content).toString('base64');
    });
  } catch (error) { console.error('Failed to read wiki data for export:', error); }

  const exportPayload = { ...appData, wiki: wikiData };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'データをエクスポート',
    defaultPath: 'routine_monitoring_backup.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });

  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, JSON.stringify(exportPayload, null, 2), 'utf-8');
      return { success: true, message: 'データが正常にエクスポートされました。' };
    } catch (error) {
      console.error('Failed to export data:', error);
      return { success: false, message: `エクスポート中にエラーが発生しました: ${error.message}` };
    }
  }
  return { success: false, message: 'エクスポートがキャンセルされました。' };
});

ipcMain.handle('import-data', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const filePath = result.filePaths[0];
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const importedData = JSON.parse(fileContent);

      if (importedData && typeof importedData.checklist !== 'undefined' && Array.isArray(importedData.history)) {
        const { wiki, ...appCoreData } = importedData;
        const dataToSave = {
            checklist: appCoreData.checklist,
            history: appCoreData.history || [],
            dismissedAlerts: appCoreData.dismissedAlerts || []
        };
        saveAppData(dataToSave);

        if (fs.existsSync(wikiDirPath)) fs.rmSync(wikiDirPath, { recursive: true, force: true });
        fs.mkdirSync(wikiDirPath);

        if (wiki && typeof wiki === 'object') {
          for (const pageId in wiki) {
            if (Object.hasOwnProperty.call(wiki, pageId)) {
               if (!pageId || pageId.includes('/') || pageId.includes('\\') || pageId.startsWith('.')) {
                   console.warn(`Skipping invalid wiki page ID during import: ${pageId}`); continue;
               }
              try {
                const base64Content = wiki[pageId];
                const content = Buffer.from(base64Content, 'base64').toString('utf-8');
                const wikiFilePath = path.join(wikiDirPath, `${pageId}.md`);
                fs.writeFileSync(wikiFilePath, content, 'utf-8');
              } catch (writeError) { console.error(`Failed to write imported wiki page ${pageId}:`, writeError); }
            }
          }
        }
        mainWindow.webContents.send('data-imported', importedData);
        return { success: true, message: 'データが正常にインポートされました。' };
      } else {
        return { success: false, message: '無効なファイル形式です。' };
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      return { success: false, message: `インポート中にエラーが発生しました: ${error.message}` };
    }
  }
  return { success: false, message: 'インポートがキャンセルされました。' };
});

// --- Simple Prompt Dialog ---
// NOTE: Electron's built-in dialogs don't have a simple text input.
// A proper solution would involve creating a small input window.
// This is a workaround using message box buttons, which is not ideal for free text input.
// For a real app, consider a dedicated input modal component in React.
ipcMain.handle('show-prompt-dialog', async (event, options) => {
    // This is a placeholder showing how to use dialogs, but won't actually get text input.
    // You'd need a custom window or a library for a real prompt.
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'question', // Or 'info'
        buttons: ['OK', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
        title: options.title || '入力',
        message: options.message || '値を入力してください:',
        // detail: options.detail || '', // More details if needed
    });

    // This won't return the input text, just the button index.
    // Returning a dummy value for now to avoid breaking the flow.
    if (result.response === 0) { // OK button
        return { success: true, value: options.defaultValue || 'dummy-input' }; // Placeholder
    } else {
        return { success: false, cancelled: true };
    }
});
