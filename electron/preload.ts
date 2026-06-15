import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: (host: string) => ipcRenderer.invoke('ping', host),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  // Window drag IPC
  windowDragStart: (mouseX: number, mouseY: number) => ipcRenderer.send('window-drag-start', mouseX, mouseY),
  windowDragMove: (mouseX: number, mouseY: number) => ipcRenderer.send('window-drag-move', mouseX, mouseY),
  windowDragEnd: () => ipcRenderer.send('window-drag-end'),

  // Window control IPC
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowToggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
});
