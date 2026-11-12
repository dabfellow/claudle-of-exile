const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('balanceLab', {
  getSource: () => ipcRenderer.invoke('balance-lab:source'),
  verifyLive: () => ipcRenderer.invoke('balance-lab:verify'),
});
