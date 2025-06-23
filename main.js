// main.js
const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const db = require("./backend/db.js");
const server = require("./server.js");

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

  win.loadURL("http://localhost:3000"); // ✅ CORRECT


  const menuTemplate = [
    {
      label: "File",
      submenu: [
        {
          label: "Admin Settings",
          click: () => {
            win.webContents.send("menu-admin-settings");
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


ipcMain.handle("render-admin-settings", async () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  win.loadURL("http://localhost:3000/admin-settings.html");

});

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

ipcMain.handle("delete-quote", (event, id) => {
  return db.deleteQuote(id);
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

///////////////////////
// User Management
///////////////////////
ipcMain.handle("add-user", async (event, user) => {
  return db.addUser(user);
});

ipcMain.handle("remove-user", async (event, userId) => {
  return db.removeUser(userId);
});

ipcMain.handle("get-users", async () => {
  return db.getUsers();
});

///////////////////////
// Content Management
///////////////////////
ipcMain.handle("add-content", async (event, content) => {
  return db.addContent(content);
});

ipcMain.handle("edit-content", async (event, contentId, newContent) => {
  return db.editContent(contentId, newContent);
});

ipcMain.handle("delete-content", async (event, contentId) => {
  return db.deleteContent(contentId);
});

///////////////////////
// System Settings
///////////////////////
ipcMain.handle("update-settings", async (event, settings) => {
  return db.updateSettings(settings);
});

ipcMain.handle("get-logs", async () => {
  return db.getLogs();
});

ipcMain.handle("backup-data", async () => {
  return db.backupData();
});

///////////////////////
// Database Settings
///////////////////////
ipcMain.handle("configure-database", async (event, config) => {
  return db.configureDatabase(config);
});

ipcMain.handle("optimize-database", async () => {
  return db.optimizeDatabase();
});

ipcMain.handle("clear-database", async () => {
  return db.clearDatabase();
});

ipcMain.on('login-attempt', (event, { username, password }) => {
  db.login(username, password)
    .then(user => {
      if (user) {
        event.sender.send('login-success', user);
      } else {
        event.sender.send('login-failure', 'Invalid credentials');
      }
    })
    .catch(err => {
      console.error("Login error:", err);
      event.sender.send('login-failure', 'An error occurred during login');
    });
});
ipcMain.on('logout', (event) => {
  db.logout()
    .then(() => {
      event.sender.send('logout-success');
    })
    .catch(err => {
      console.error("Logout error:", err);
      event.sender.send('logout-failure', 'An error occurred during logout');
    });
});
ipcMain.on('register-user', (event, user) => {
  db.registerUser(user)
    .then(() => {
      event.sender.send('register-success');
    })
    .catch(err => {
      console.error("Registration error:", err);
      event.sender.send('register-failure', 'An error occurred during registration');
    });
});
ipcMain.on('get-user-info', (event, userId) => {
  db.getUserInfo(userId)
    .then(user => {
      event.sender.send('user-info', user);
    })
    .catch(err => {
      console.error("Get user info error:", err);
      event.sender.send('user-info-error', 'An error occurred while fetching user info');
    });
});
ipcMain.on('update-user-info', (event, userId, newInfo) => {
  db.updateUserInfo(userId, newInfo)
    .then(() => {
      event.sender.send('update-success');
    })
    .catch(err => {
      console.error("Update user info error:", err);
      event.sender.send('update-failure', 'An error occurred while updating user info');
    });
});
ipcMain.on('delete-user', (event, userId) => {
  db.deleteUser(userId)
    .then(() => {
      event.sender.send('delete-success');
    })
    .catch(err => {
      console.error("Delete user error:", err);
      event.sender.send('delete-failure', 'An error occurred while deleting user');
    });
});
ipcMain.on('get-current-user', (event) => {
  db.getCurrentUser()
    .then(user => {
      event.sender.send('current-user', user);
    })
    .catch(err => {
      console.error("Get current user error:", err);
      event.sender.send('current-user-error', 'An error occurred while fetching current user');
    });
});
ipcMain.on('get-current-user-id', (event) => {
  db.getCurrentUserId()
    .then(userId => {
      event.sender.send('current-user-id', userId);
    })
    .catch(err => {
      console.error("Get current user ID error:", err);
      event.sender.send('current-user-id-error', 'An error occurred while fetching current user ID');
    });
});
ipcMain.on('get-current-user-role', (event) => {
  db.getCurrentUserRole()
    .then(role => {
      event.sender.send('current-user-role', role);
    })
    .catch(err => {
      console.error("Get current user role error:", err);
      event.sender.send('current-user-role-error', 'An error occurred while fetching current user role');
    });
});
ipcMain.on('get-current-user-permissions', (event) => {
  db.getCurrentUserPermissions()
    .then(permissions => {
      event.sender.send('current-user-permissions', permissions);
    })
    .catch(err => {
      console.error("Get current user permissions error:", err);
      event.sender.send('current-user-permissions-error', 'An error occurred while fetching current user permissions');
    });
});
ipcMain.on('get-current-user-settings', (event) => {
  db.getCurrentUserSettings()
    .then(settings => {
      event.sender.send('current-user-settings', settings);
    })
    .catch(err => {
      console.error("Get current user settings error:", err);
      event.sender.send('current-user-settings-error', 'An error occurred while fetching current user settings');
    });
});
ipcMain.on('update-current-user-settings', (event, settings) => {
  db.updateCurrentUserSettings(settings)
    .then(() => {
      event.sender.send('update-settings-success');
    })
    .catch(err => {
      console.error("Update current user settings error:", err);
      event.sender.send('update-settings-failure', 'An error occurred while updating current user settings');
    });
});

