import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: (host: string) => ipcRenderer.invoke('ping', host),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
});
