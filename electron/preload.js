
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, data, isBase64) => ipcRenderer.invoke('fs:writeFile', { filePath, data, isBase64 }),
  
  // SQLite Handlers
  exportSQLite: (filePath, data) => ipcRenderer.invoke('sqlite:export', { filePath, data }),
  importSQLite: (filePath) => ipcRenderer.invoke('sqlite:import', filePath),

  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  }
});
