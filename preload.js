const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  shell: shell
});

contextBridge.exposeInMainWorld('api', {
  // Menu callbacks
  onMenuAddComponent: (callback) => ipcRenderer.on("menu-add-component", callback),
  onMenuExportQuote: (callback) => ipcRenderer.on("menu-export-quote", callback),

  // Quotes
  createQuote: (quote) => ipcRenderer.invoke('create-quote', quote),
  getQuote: (id) => ipcRenderer.invoke('get-quote', id),
  getAllQuotes: () => ipcRenderer.invoke('get-all-quotes'),
  loadQuote: () => ipcRenderer.invoke('load-quote'),
  viewQuotePDF: (quote) => ipcRenderer.invoke('view-quote-pdf', quote),

  // Components
  addComponent: (component) => ipcRenderer.invoke("add-component", component),
  getComponents: (archived = false) => ipcRenderer.invoke("get-components", archived),
  deleteComponent: (id) => ipcRenderer.invoke("delete-component", id),
  archiveComponent: (id) => ipcRenderer.invoke("archive-component", id),
  exportComponents: () => ipcRenderer.invoke("export-components"),
  importComponents: () => ipcRenderer.invoke('import-components')
});
