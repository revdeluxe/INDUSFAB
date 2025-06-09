const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  shell: shell
});

contextBridge.exposeInMainWorld('api', {
  // Menu callbacks
  onMenuAddComponent: (callback) => ipcRenderer.on("menu-add-component", callback),
  onMenuExportQuote: (callback) => ipcRenderer.on("menu-export-quote", callback),
  loadSectionContent: (section) => ipcRenderer.invoke('load-section-content', section),

  // Quotes
  createQuote: (quote) => ipcRenderer.invoke('create-quote', quote),
  deleteQuote: (id) => ipcRenderer.invoke('delete-quote', id),
  getQuote: (id) => ipcRenderer.invoke('get-quote', id),
  getAllQuotes: () => ipcRenderer.invoke('get-all-quotes'),
  loadQuote: () => ipcRenderer.invoke('load-quote'),
  viewQuotePDF: (quote) => ipcRenderer.invoke('view-quote-pdf', quote),

  //Admin
  getAdmin: () => ipcRenderer.invoke('get-admin'),
  updateAdmin: (admin) => ipcRenderer.invoke('update-admin', admin),
  // Export/Import
  exportQuotes: () => ipcRenderer.invoke('export-quotes'),
  importQuotes: () => ipcRenderer.invoke('import-quotes'),
  exportComponentsToJSON: () => ipcRenderer.invoke('export-components-to-json'),
  exportComponentsToCSV: () => ipcRenderer.invoke('export-components-to-csv'),
  importQuotesFromJSON: () => ipcRenderer.invoke('import-quotes-from-json'),
  importComponentsFromJSON: () => ipcRenderer.invoke('import-components-from-json'),
  importQuotesFromCSV: () => ipcRenderer.invoke('import-quotes-from-csv'),
  importComponentsFromCSV: () => ipcRenderer.invoke('import-components-from-csv'),

  // User Management
  addUser: (user) => ipcRenderer.invoke('add-user', user),
  removeUser: (userId) => ipcRenderer.invoke('remove-user', userId),
  getUsers: () => ipcRenderer.invoke('get-users'),

  // Content Management
  addContent: (content) => ipcRenderer.invoke('add-content', content),
  editContent: (contentId, newContent) => ipcRenderer.invoke('edit-content', contentId, newContent),
  deleteContent: (contentId) => ipcRenderer.invoke('delete-content', contentId),

  // System Settings
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  backupData: () => ipcRenderer.invoke('backup-data'),

  // Database Settings
  configureDatabase: (config) => ipcRenderer.invoke('configure-database', config),
  optimizeDatabase: () => ipcRenderer.invoke('optimize-database'),
  clearDatabase: () => ipcRenderer.invoke('clear-database'),

  // Components
  addComponent: (component) => ipcRenderer.invoke("add-component", component),
  getComponents: (archived = false) => ipcRenderer.invoke("get-components", archived),
  deleteComponent: (id) => ipcRenderer.invoke("delete-component", id),
  archiveComponent: (id) => ipcRenderer.invoke("archive-component", id),
  exportComponents: () => ipcRenderer.invoke("export-components"),
  importComponents: () => ipcRenderer.invoke('import-components')
});
