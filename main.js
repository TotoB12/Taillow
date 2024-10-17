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
const { functions, tools } = require('./tools');
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-8b-exp-0924",
    systemInstruction: "",
    generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 1000,
        topP: 0.4,
        topK: 10,
        presencePenalty: 0,
        frequencyPenalty: 0,
    },
    safetySettings: safetySettings,
    tools: { functionDeclarations: tools },
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
        let response = null;
        response = await model.generateContent(query);
        let tool_results = [];

        while (response.response.functionCalls()) {
            if (response.response.text() != "") {
                console.log("Tool calling text, DONT READ IT,\n" + response.response.text());
            }

            for (const tool of response.response.functionCalls()) {
                console.log("Tool name: " + tool.name);
                console.log("Tool args: " + JSON.stringify(tool.args));
                const output = await functions[tool.name](tool.args);
                tool_results.push({
                    functionResponse: {
                        name: tool.name,
                        response: output,
                    },
                });
            }

            console.log("Tool results getting fed back:");
            for (const tool_result of tool_results) {
                console.log(tool_result.functionResponse.name);
                console.log(tool_result.functionResponse.response);
            }

            response = await model.generateContent([
                query,
                tool_results
            ]);
        }
        
        event.sender.send('response', response.response.text());
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
