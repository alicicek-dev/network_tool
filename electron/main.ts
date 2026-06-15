import { app, BrowserWindow, ipcMain, dialog, screen } from 'electron';
import path from 'path';
import { spawn } from 'child_process';

let backendProcess = null;

const startBackend = () => {
  const serverPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'app.asar', 'server.js')
    : path.join(__dirname, '../server.js');

  backendProcess = spawn(process.execPath, [serverPath], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  });
};

app.on('quit', () => {
  if (backendProcess) backendProcess.kill();
});

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e1e2e',
      symbolColor: '#cdd6f4',
    },
    backgroundColor: '#1e1e2e'
  });

  // Vite dev server URL
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // Production
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

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

// Basic IPC handlers
ipcMain.handle('ping', async (event, host) => {
  // TODO: implement ping logic
  return { success: true, host };
});

ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  // Refocus the main window after native dialog closes
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
  }

  if (result.canceled) return null;
  return result.filePaths[0];
});

// --- JavaScript-based window dragging (replaces broken CSS -webkit-app-region) ---
let dragState: { startMouseX: number; startMouseY: number; startWinX: number; startWinY: number } | null = null;

ipcMain.on('window-drag-start', (event, mouseX: number, mouseY: number) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const [winX, winY] = win.getPosition();
  dragState = { startMouseX: mouseX, startMouseY: mouseY, startWinX: winX, startWinY: winY };
});

ipcMain.on('window-drag-move', (event, mouseX: number, mouseY: number) => {
  if (!dragState) return;
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  const deltaX = mouseX - dragState.startMouseX;
  const deltaY = mouseY - dragState.startMouseY;
  win.setPosition(dragState.startWinX + deltaX, dragState.startWinY + deltaY);
});

ipcMain.on('window-drag-end', () => {
  dragState = null;
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
