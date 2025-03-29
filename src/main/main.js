const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// アプリケーションデータの保存先パス
const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'routineData.json');

// アプリケーションデータの読み込み
function loadAppData() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load app data:', error);
  }
  // デフォルトデータ（ファイルが存在しないか、読み込みに失敗した場合）
  return { checklist: null, history: [] };
}

// アプリケーションデータの保存
function saveAppData(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
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
      contextIsolation: true, // 推奨: セキュリティのため有効化
      nodeIntegration: false, // 推奨: セキュリティのため無効化
    },
  });

  // Vite開発サーバーのURLまたはビルドされたHTMLファイルをロード
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173'); // Vite dev server URL
    mainWindow.webContents.openDevTools(); // 開発ツールを開く
  } else {
    // Viteのビルド出力先(dist/renderer)に合わせてパスを修正
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC ハンドラー ---

// アプリデータの取得リクエスト
ipcMain.handle('load-data', async () => {
  return loadAppData();
});

// アプリデータの保存リクエスト
ipcMain.handle('save-data', async (event, data) => {
  saveAppData(data);
  return { success: true };
});

// データのインポートリクエスト
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

      // 簡単なバリデーション (必要に応じて強化)
      if (importedData && typeof importedData.checklist !== 'undefined' && Array.isArray(importedData.history)) {
        saveAppData(importedData); // 既存データを上書き
        // レンダラープロセスにデータを再読み込みさせる通知
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

// データのエクスポートリクエスト
ipcMain.handle('export-data', async () => {
  const currentData = loadAppData();
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'データをエクスポート',
    defaultPath: 'routine_backup.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });

  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, JSON.stringify(currentData, null, 2), 'utf-8');
      return { success: true, message: 'データが正常にエクスポートされました。' };
    } catch (error) {
      console.error('Failed to export data:', error);
      return { success: false, message: `エクスポート中にエラーが発生しました: ${error.message}` };
    }
  }
  return { success: false, message: 'エクスポートがキャンセルされました。' };
});
