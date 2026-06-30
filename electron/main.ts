import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { autoUpdater } from 'electron-updater';
import { fork, ChildProcess } from 'child_process';

let backendProcess: ChildProcess | null = null;
let currentBackendPort: number | null = null;

const startBackend = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    try {
      const serverPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'app.asar', 'server.js') 
        : path.join(__dirname, '../server.js');
      
      backendProcess = fork(serverPath, [], {
        env: process.env,
        stdio: 'inherit'
      });

      backendProcess.on('message', (msg: any) => {
        if (msg && msg.type === 'port') {
          currentBackendPort = msg.port;
          resolve(msg.port);
        }
      });

      backendProcess.on('error', (err) => {
        console.error('Backend process error:', err);
        reject(err);
      });
    } catch (error) {
      console.error('Failed to start backend server:', error);
      reject(error);
    }
  });
};

let mainWindow: BrowserWindow | null = null;

// Auto-updater integration settings
autoUpdater.autoDownload = false;

const setupAutoUpdater = (win: BrowserWindow) => {
  const safeSend = (channel: string, args: any) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, args);
    }
  };

  autoUpdater.on('checking-for-update', () => {
    safeSend('updater-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    safeSend('updater-status', { status: 'available', info });
    autoUpdater.downloadUpdate();
  });

  autoUpdater.on('update-not-available', (info) => {
    safeSend('updater-status', { status: 'not-available', info });
  });

  autoUpdater.on('error', (error) => {
    safeSend('updater-status', { status: 'error', message: error.message });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    safeSend('updater-status', { 
      status: 'downloading', 
      percent: Math.round(progressObj.percent)
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    safeSend('updater-status', { status: 'downloaded', info });
  });
};

function createWindow(port: number) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: false,
    backgroundColor: '#1e1e2e'
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}?port=${port}`);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { port: port.toString() } });
  }

  // Setup auto-updater listeners for this window
  setupAutoUpdater(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    const port = await startBackend();
    createWindow(port);
  } catch (err) {
    console.error("Could not start backend, exiting.", err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && currentBackendPort) {
    createWindow(currentBackendPort);
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
  try {
    const parsed = new URL(url);
    if (['https:', 'http:'].includes(parsed.protocol)) {
      shell.openExternal(url);
    }
  } catch { /* invalid URL — ignore */ }
});

// IPC handlers for auto-updater
ipcMain.on('updater-check', () => {
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on('updater-restart', () => {
  autoUpdater.quitAndInstall();
});
