const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  printReceipt: (receiptText) => ipcRenderer.invoke('print-receipt', receiptText),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info')
});
