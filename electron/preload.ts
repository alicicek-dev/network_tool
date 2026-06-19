import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: (host: string) => ipcRenderer.invoke('ping', host),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowToggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  checkForUpdates: () => ipcRenderer.send('updater-check'),
  restartAndInstall: () => ipcRenderer.send('updater-restart'),
  onUpdateStatus: (callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('updater-status', listener);
    return () => {
      ipcRenderer.removeListener('updater-status', listener);
    };
  },
});
