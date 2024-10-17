const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const { GlobalKeyboardListener } = require('node-global-key-listener');

let mainWindow;
let tray;
let keyListener = new GlobalKeyboardListener();
let ctrlPressTimes = [];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 60,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  const { screen } = require('electron');
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow.setPosition((width - 400) / 2, 50);

  mainWindow.on('blur', () => {
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip('AI Assistant');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  keyListener.addListener((e) => {
    console.log(e);
    if (e.name === 'RIGHT CTRL' && e.state === 'DOWN') {
      const currentTime = Date.now();
      ctrlPressTimes.push(currentTime);

      if (ctrlPressTimes.length > 2) {
        ctrlPressTimes.shift();
      }

      if (
        ctrlPressTimes.length === 2 &&
        ctrlPressTimes[1] - ctrlPressTimes[0] < 500
      ) {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
        ctrlPressTimes = [];
      }
    }
  });
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('before-quit', () => {
  keyListener.removeAllListeners();
});
