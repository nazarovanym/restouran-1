const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'Naxçıvan RMS - Windows Desktop Restoran İdarəetmə Sistemi',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: '#0f172a',
    autoHideMenuBar: false
  });

  // Server URL (Yerli və ya şəbəkə serveri)
  const targetUrl = process.env.SERVER_URL || 'http://localhost:5173';

  console.log(`[Desktop] Serverə qoşulur: ${targetUrl}`);
  mainWindow.loadURL(targetUrl);

  // Şəbəkə və ya server kəsildikdə bildiriş
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.loadURL(`data:text/html;charset=utf-8,
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bağlantı Xətası</title>
          <style>
            body { background: #0f172a; color: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            h2 { color: #f97316; margin-bottom: 8px; }
            p { color: #94a3b8; font-size: 14px; max-width: 450px; line-height: 1.5; }
            button { background: #ea580c; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer; margin-top: 20px; }
            button:hover { background: #c2410c; }
          </style>
        </head>
        <body>
          <h2>Serverə Qoşulmaq Mümkün Olmadı</h2>
          <p>Restoran backend serverinin (http://localhost:5000) və ya veb interfeysinin işlək olduğunu yoxlayın.</p>
          <button onclick="location.href='${targetUrl}'">Yenidən Cəhd Et</button>
        </body>
      </html>
    `);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Termo qəbz birbaşa Windows printerə çap IPC handler
ipcMain.handle('print-receipt', async (event, receiptText) => {
  if (!mainWindow) return false;
  // Silent print options can be added here
  return true;
});

ipcMain.handle('get-system-info', async () => {
  return {
    platform: process.platform,
    version: app.getVersion(),
    arch: process.arch
  };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
