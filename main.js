const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    // icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: Add icon.png to assets folder
    titleBarStyle: 'default',
    backgroundColor: '#0f0f0f'
  });
  
  // Set Content Security Policy to reduce warnings and allow video.js workers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:; " +
          "media-src 'self' https: http: blob: data:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; " +
          "worker-src 'self' blob: data:; " +
          "style-src 'self' 'unsafe-inline' https:; " +
          "img-src 'self' data: https: http:; " +
          "font-src 'self' data: https:;"
        ]
      }
    });
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

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

// IPC handlers
ipcMain.handle('get-playlists', async () => {
  const streamsDir = path.join(__dirname, 'iptv', 'streams');
  try {
    const files = fs.readdirSync(streamsDir);
    return files
      .filter(file => file.endsWith('.m3u'))
      .map(file => {
        const code = file.replace('.m3u', '').toUpperCase();
        return {
          code,
          name: code,
          path: path.join(streamsDir, file),
          filename: file
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  } catch (error) {
    console.error('Error reading playlists:', error);
    return [];
  }
});

ipcMain.handle('read-playlist', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading playlist:', error);
    throw error;
  }
});

ipcMain.handle('select-playlist-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'M3U Playlists', extensions: ['m3u', 'm3u8'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});
