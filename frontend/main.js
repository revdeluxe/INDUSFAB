const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backend;

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  // Run backend (adjust to backend.exe for production)
  const backendPath = path.join(__dirname, '../build/backend.exe'); // after PyInstaller
  backend = spawn(backendPath, [], { detached: true });

  backend.stdout?.on('data', (data) => console.log(`Backend: ${data}`));
  backend.stderr?.on('data', (data) => console.error(`Backend Error: ${data}`));

  createWindow();
});

app.on('will-quit', () => {
  if (backend) {
    backend.kill();
  }
});
