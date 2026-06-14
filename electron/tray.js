"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTray = createTray;
exports.updateTrayIcon = updateTrayIcon;
const electron_1 = require("electron");
let tray = null;
function createTray(mainWindow) {
    const icon = electron_1.nativeImage.createFromDataURL('data:image/svg+xml;base64,' +
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="#4da6ff" stroke="#fff" stroke-width="1"/></svg>').toString('base64'));
    tray = new electron_1.Tray(icon);
    tray.setToolTip('Timelog');
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: 'Show Timelog',
            click: () => {
                if (mainWindow.isMinimized())
                    mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                electron_1.app.quit();
            },
        },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        if (mainWindow.isMinimized())
            mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    });
}
function updateTrayIcon(isRunning) {
    if (!tray)
        return;
    const color = isRunning ? '#4da6ff' : '#888';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="${color}" stroke="#fff" stroke-width="1"/></svg>`;
    const icon = electron_1.nativeImage.createFromDataURL('data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'));
    tray.setImage(icon);
}
//# sourceMappingURL=tray.js.map