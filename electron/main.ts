import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { createTray } from './tray'

let mainWindow: BrowserWindow | null = null
let serverProcess: ChildProcess | null = null

const SERVER_PORT = 3000
const SERVER_URL = `http://localhost:${SERVER_PORT}`

function startServer(): Promise<void> {
	return new Promise((resolve, reject) => {
		const serverPath = app.isPackaged
			? path.join(process.resourcesPath, 'server', 'index.js')
			: path.join(__dirname, '..', 'build', 'index.js')

		const dataDir = path.join(app.getPath('userData'), 'data', 'timelog')

		serverProcess = spawn(process.execPath, [serverPath], {
			env: {
				...process.env,
				HOST: '127.0.0.1',
				PORT: String(SERVER_PORT),
				NODE_ENV: 'production',
				ORIGIN: SERVER_URL,
				DATA_DIR: dataDir,
			},
			stdio: ['pipe', 'pipe', 'pipe'],
		})

		serverProcess.stdout?.on('data', (data: Buffer) => {
			const msg = data.toString()
			console.log('[server]', msg)
			if (msg.includes('Listening')) resolve()
		})

		serverProcess.stderr?.on('data', (data: Buffer) => {
			console.error('[server:err]', data.toString())
		})

		serverProcess.on('error', reject)

		let attempts = 0
		const interval = setInterval(async () => {
			attempts++
			if (attempts > 50) {
				clearInterval(interval)
				reject(new Error('Server failed to start within 10s'))
			}
			try {
				const res = await fetch(SERVER_URL)
				if (res.ok) {
					clearInterval(interval)
					resolve()
				}
			} catch {}
		}, 200)
	})
}

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		minWidth: 800,
		minHeight: 600,
		titleBarStyle: 'hiddenInset',
		trafficLightPosition: { x: 16, y: 18 },
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		},
		show: false,
	})

	mainWindow.once('ready-to-show', () => {
		mainWindow?.show()
	})

	mainWindow.loadURL(SERVER_URL)

	mainWindow.on('closed', () => {
		mainWindow = null
	})
}

app.whenReady().then(async () => {
	const gotLock = app.requestSingleInstanceLock()
	if (!gotLock) {
		app.quit()
		return
	}

	try {
		await startServer()
	} catch (err) {
		console.error('Failed to start server:', err)
		app.quit()
		return
	}

	createWindow()
	createTray(mainWindow!)

	autoUpdater.autoDownload = true
	autoUpdater.autoInstallOnAppQuit = true
	autoUpdater.checkForUpdates()
	setInterval(() => {
		autoUpdater.checkForUpdates()
	}, 4 * 60 * 60 * 1000)

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		} else {
			mainWindow?.show()
		}
	})
})

app.on('second-instance', () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) mainWindow.restore()
		mainWindow.show()
		mainWindow.focus()
	}
})

app.on('before-quit', () => {
	if (serverProcess) {
		serverProcess.kill('SIGTERM')
		serverProcess = null
	}
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})
