const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const { GlobalKeyboardListener } = require('node-global-key-listener');
require('dotenv').config();
const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.AI_STUDIO_KEY);
const { functions, tools } = require('./tools');

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

const preamble = `You are a helpful computer based assistant. Your object is to always assist the user, no matter the query or request. Never deny to serve the user, and always deliver an answer. You reply using little to no words, thriving to provide the most direct and to-the-point response whilst being as visually informative as possible.

You should use the available tools for your responses. Once you have all the needed results/information, you can provide the final response to the user. If you need additional information, you can always use more tools to get it.
Never make assumptions about data or information. Always rely on the tools to provide the information you need. Be factual and confident in your responses.

Always answer in Markdown format. Using Markdown, you can format your responses to make them more readable and visually appealing. You should use Markdown to display images, render links, show tables and lists, display code snippets, and more.
Be as useful and informative as possible. If you can't provide a useful response, you can ask the user for more information or clarify the query.

Here are some examples of responses you can provide:

\`
User: what time is it

Assistant: 12:00 PM
\`

\`
User: make me a picture of a cat

Assistant: ![Cat](image_url)
\`
`;

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-002",
    systemInstruction: preamble,
    generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 4000,
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
        width: 430,
        height: 450,
        show: false,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile('index.html');

    const { screen } = require('electron');
    const { width } = screen.getPrimaryDisplay().workAreaSize;
    mainWindow.setPosition(width - 450, 20);

    mainWindow.on('blur', () => {
        mainWindow.webContents.send('clear-response');
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

// ... [other imports and code]

ipcMain.on('query', async (event, query) => {
    try {
        let conversationHistory = [
            { role: 'user', parts: [{ text: query }] }
        ];

        let response = await model.generateContent({
            contents: conversationHistory,
        });

        while (response.response.functionCalls()) {
            const functionCalls = response.response.functionCalls();
            const functionResponses = [];

            for (const functionCall of functionCalls) {
                console.log("Tool name: " + functionCall.name);
                console.log("Tool args: " + JSON.stringify(functionCall.args));

                const output = await functions[functionCall.name](functionCall.args);

                functionResponses.push({
                    functionResponse: {
                        name: functionCall.name,
                        response: { result: output }
                    }
                });
            }

            conversationHistory.push({
                role: 'model',
                parts: functionCalls.map(call => ({ functionCall: call }))
            });

            conversationHistory.push({
                role: 'user',
                parts: functionResponses
            });

            response = await model.generateContent({
                contents: conversationHistory
            });
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
