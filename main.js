const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const { GlobalKeyboardListener } = require('node-global-key-listener');
require('dotenv').config();
const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.AI_STUDIO_KEY);
const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    }
];
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-8b-exp-0924",
    generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 1000,
        topP: 0.4,
        topK: 10,
        presencePenalty: 0,
        frequencyPenalty: 0,
    },
    safetySettings: safetySettings,
});

let mainWindow;
let tray;
let keyListener = new GlobalKeyboardListener();
let ctrlPressTimes = [];

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 300,
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

ipcMain.on('hide-window', () => {
    if (mainWindow) {
        mainWindow.hide();
    }
});

ipcMain.on('query', async (event, query) => {
    try {
        const result = await model.generateContentStream(query);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            event.sender.send('response', chunkText);
        }
    } catch (error) {
        console.error(error);
        event.sender.send('response', 'Error: ' + error.message);
    }
});

app.on('window-all-closed', (e) => {
    e.preventDefault();
});

app.on('before-quit', () => {
    keyListener.removeAllListeners();
});
