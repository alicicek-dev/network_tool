import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
const startBackend = () => {
  try {
    if (app.isPackaged) {
      require(path.join(process.resourcesPath, 'app.asar', 'server.js'));
    } else {
      require(path.join(__dirname, '../server.js'));
    }
  } catch (error) {
    console.error('Failed to start backend server:', error);
  }
};

let mainWindow: BrowserWindow | null = null;

// Auto-updater integration settings
autoUpdater.autoDownload = true;

const setupAutoUpdater = (win: BrowserWindow) => {
  autoUpdater.on('checking-for-update', () => {
    win.webContents.send('updater-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    win.webContents.send('updater-status', { status: 'available', info });
  });

  autoUpdater.on('update-not-available', (info) => {
    win.webContents.send('updater-status', { status: 'not-available', info });
  });

  autoUpdater.on('error', (error) => {
    win.webContents.send('updater-status', { status: 'error', message: error.message });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    win.webContents.send('updater-status', { 
      status: 'downloading', 
      percent: Math.round(progressObj.percent)
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('updater-status', { status: 'downloaded', info });
  });
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
    frame: false,
    backgroundColor: '#1e1e2e'
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Setup auto-updater listeners for this window
  setupAutoUpdater(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

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
ipcMain.handle('ping', async (event, host) => {
  return { success: true, host };
});

ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
  }
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Window control IPC
ipcMain.on('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('window-toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
});

ipcMain.on('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

// IPC handlers for auto-updater
ipcMain.on('updater-check', () => {
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on('updater-restart', () => {
  autoUpdater.quitAndInstall();
});
