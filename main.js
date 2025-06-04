// main.js
const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const db = require("./backend/db.js");

// Removed redundant __dirname declaration

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // REQUIRED
      nodeIntegration: false, // REQUIRED for security
    }
  });

  win.loadFile('frontend/index.html');

  const menuTemplate = [
    {
      label: "File",
      submenu: [
        {
          label: "Add Component",
          click: () => {
            win.webContents.send("menu-add-component");
          },
        },
        {
          label: "Export Last Quote",
          click: () => {
            win.webContents.send("menu-export-quote");
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  db.initDatabase();
  createWindow();
});

// IPC handlers
ipcMain.handle("get-components", () => db.getComponents());
ipcMain.handle("delete-component", (_, id) => db.deleteComponent(id));
ipcMain.handle("archive-component", (_, id) => db.archiveComponent(id));
ipcMain.handle("export-components", async () => {
  const components = await db.exportComponents();
  const filePath = dialog.showSaveDialogSync({ defaultPath: "components.json" });
  if (filePath) fs.writeFileSync(filePath, JSON.stringify(components, null, 2));
  return filePath;
});

ipcMain.handle('add-component', (event, component) => {
  return db.addComponent(component);
});

ipcMain.handle('create-quote', (event, quote) => {
  return db.createQuote(quote);
});

ipcMain.handle("get-all-quotes", () => {
  return db.getAllQuotes(); // must be a valid function in db.js
});

ipcMain.handle("load-quote", () => {
  return db.getAllQuotes(); // must be a valid function in db.js
});

ipcMain.handle("get-quote", (event, id) => {
  return db.getQuote(id); // must return a full quote object
});

ipcMain.handle("preview-quote", async (event, quote) => {
  const quoteString = encodeURIComponent(JSON.stringify(quote));
  const win = new BrowserWindow({
    width: 800,
    height: 1000,
    webPreferences: {
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const templatePath = path.join(__dirname, "assets", "template.html");
  await win.loadURL(`file://${templatePath}?${quoteString}`);
});

ipcMain.handle("view-quote-pdf", async (event, quote) => {
  const quoteString = encodeURIComponent(JSON.stringify(quote));
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const templatePath = path.join(__dirname, "assets", "template.html");
  await win.loadURL(`file://${templatePath}?${quoteString}`);

  const pdfBuffer = await win.webContents.printToPDF({});
  const outputPath = path.join(app.getPath("documents"), `quote_${quote.id}.pdf`);

  fs.writeFileSync(outputPath, pdfBuffer);
  win.destroy();

  // Optional: open the file
  shell.openPath(outputPath);

  return outputPath;
});

ipcMain.handle('import-components', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import Component CSV',
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (canceled || filePaths.length === 0) return { success: false };
  const csv = fs.readFileSync(filePaths[0], 'utf8');
  const lines = csv.trim().split('\n');
  const result = [];
  for (let line of lines) {
    const [name, description, unit_price] = line.split(',');
    result.push({ name: name.trim(), description: description.trim(), unit_price: parseFloat(unit_price) });
  }
  for (let comp of result) await db.addComponent(comp);
  return { success: true, imported: result.length };
});

function getSuggestions(items) {
  const suggestions = [];
  for (let item of items) {
    if (item.name.toLowerCase().includes('motor') && item.unit_price > 100) {
      suggestions.push('Consider using a 24V or higher-rated power supply for motors above $100.');
    }
    if (item.name.toLowerCase().includes('sensor') && item.quantity >= 3) {
      suggestions.push('Group sensors into a single I/O module to reduce wiring.');
    }
    if (item.unit_price * item.quantity > 500) {
      suggestions.push(`Bulk discount may apply for ${item.name}. Check with supplier.`);
    }
  }
  return suggestions;
}
