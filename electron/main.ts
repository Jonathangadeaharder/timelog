import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { createTray } from './tray'

let mainWindow: BrowserWindow | null = null
let serverProcess: ChildProcess | null = null
let isQuitting = false

const SERVER_PORT = 3000
const SERVER_URL = `http://localhost:${SERVER_PORT}`

function startServer(): Promise<void> {
	return new Promise((resolve, reject) => {
		const serverPath = app.isPackaged
			? path.join(process.resourcesPath, 'server', 'index.js')
			: path.join(__dirname, '..', 'build', 'index.js')

		const dataDir = path.join(app.getPath('userData'), 'data', 'timelog')

		serverProcess = spawn(process.execPath, [serverPath], {
			cwd: app.isPackaged ? path.join(process.resourcesPath, 'server') : path.join(__dirname, '..'),
			env: {
				...process.env,
				ELECTRON_RUN_AS_NODE: '1',
				HOST: '127.0.0.1',
				PORT: String(SERVER_PORT),
				NODE_ENV: 'production',
				ORIGIN: SERVER_URL,
				DATA_DIR: dataDir,
			},
			stdio: ['pipe', 'pipe', 'pipe'],
		})

		let pollInterval: ReturnType<typeof setInterval> | null = null

		const cleanup = () => {
			if (pollInterval) {
				clearInterval(pollInterval)
				pollInterval = null
			}
		}

		serverProcess.stdout?.on('data', (data: Buffer) => {
			const msg = data.toString()
			console.log('[server]', msg)
			if (msg.includes('Listening')) {
				cleanup()
				resolve()
			}
		})

		serverProcess.stderr?.on('data', (data: Buffer) => {
			console.error('[server:err]', data.toString())
		})

		serverProcess.on('error', (err) => {
			cleanup()
			reject(err)
		})

		serverProcess.on('exit', (code) => {
			cleanup()
			if (code !== 0 && code !== null) {
				reject(new Error(`Server exited with code ${code}`))
			}
		})

		let attempts = 0
		pollInterval = setInterval(async () => {
			attempts++
			if (attempts > 50) {
				cleanup()
				reject(new Error('Server failed to start within 10s'))
				return
			}
			try {
				const res = await fetch(SERVER_URL)
				if (res.ok) {
					cleanup()
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

	mainWindow.on('close', (event) => {
		if (!isQuitting) {
			event.preventDefault()
			mainWindow?.hide()
		}
	})

	mainWindow.on('closed', () => {
		mainWindow = null
	})
}

function showWindow() {
	if (!mainWindow || mainWindow.isDestroyed()) {
		createWindow()
	} else {
		if (mainWindow.isMinimized()) mainWindow.restore()
		mainWindow.show()
		mainWindow.focus()
	}
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
	createTray(showWindow)

	if (app.isPackaged) {
		autoUpdater.autoDownload = true
		autoUpdater.autoInstallOnAppQuit = true
		autoUpdater.checkForUpdates()
		setInterval(() => {
			autoUpdater.checkForUpdates()
		}, 4 * 60 * 60 * 1000)
	}

	app.on('activate', () => {
		showWindow()
	})
})

app.on('second-instance', () => {
	showWindow()
})

app.on('before-quit', () => {
	isQuitting = true
	if (serverProcess) {
		serverProcess.kill('SIGTERM')
		serverProcess = null
	}
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})
