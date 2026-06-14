"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
const tray_1 = require("./tray");
let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
function startServer() {
    return new Promise((resolve, reject) => {
        const serverPath = electron_1.app.isPackaged
            ? node_path_1.default.join(process.resourcesPath, 'server', 'index.js')
            : node_path_1.default.join(__dirname, '..', 'build', 'index.js');
        const dataDir = node_path_1.default.join(electron_1.app.getPath('userData'), 'data', 'timelog');
        serverProcess = (0, node_child_process_1.spawn)(process.execPath, [serverPath], {
            env: {
                ...process.env,
                HOST: '127.0.0.1',
                PORT: String(SERVER_PORT),
                NODE_ENV: 'production',
                ORIGIN: SERVER_URL,
                DATA_DIR: dataDir,
            },
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        serverProcess.stdout?.on('data', (data) => {
            const msg = data.toString();
            console.log('[server]', msg);
            if (msg.includes('Listening'))
                resolve();
        });
        serverProcess.stderr?.on('data', (data) => {
            console.error('[server:err]', data.toString());
        });
        serverProcess.on('error', reject);
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            if (attempts > 50) {
                clearInterval(interval);
                reject(new Error('Server failed to start within 10s'));
            }
            try {
                const res = await fetch(SERVER_URL);
                if (res.ok) {
                    clearInterval(interval);
                    resolve();
                }
            }
            catch { }
        }, 200);
    });
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 16, y: 18 },
        webPreferences: {
            preload: node_path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false,
    });
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    mainWindow.loadURL(SERVER_URL);
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(async () => {
    const gotLock = electron_1.app.requestSingleInstanceLock();
    if (!gotLock) {
        electron_1.app.quit();
        return;
    }
    try {
        await startServer();
    }
    catch (err) {
        console.error('Failed to start server:', err);
        electron_1.app.quit();
        return;
    }
    createWindow();
    (0, tray_1.createTray)(mainWindow);
    electron_updater_1.autoUpdater.autoDownload = true;
    electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
    electron_updater_1.autoUpdater.checkForUpdates();
    setInterval(() => {
        electron_updater_1.autoUpdater.checkForUpdates();
    }, 4 * 60 * 60 * 1000);
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
        else {
            mainWindow?.show();
        }
    });
});
electron_1.app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized())
            mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
});
electron_1.app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill('SIGTERM');
        serverProcess = null;
    }
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
//# sourceMappingURL=main.js.map