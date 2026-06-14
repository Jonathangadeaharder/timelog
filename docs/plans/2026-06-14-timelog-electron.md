# Timelog Electron Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the SvelteKit timelog app as a native macOS .app bundle using Electron with menu bar tray, single-instance lock, and auto-update.

**Architecture:** Electron main process spawns the SvelteKit Node server (`build/index.js`) as a child process, opens a BrowserWindow pointing at `http://localhost:3000`. Zero changes to SvelteKit app code. Menu bar tray shows timer status. Auto-update via GitHub Releases.

**Tech Stack:** Electron, electron-builder, electron-updater, TypeScript

---

### Task 1: Install Electron dependencies

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install Electron and builder**

```bash
pnpm add -D electron electron-builder
pnpm add electron-updater
```

- [ ] **Step 2: Add Electron scripts to package.json**

Add to `scripts`:

```json
"electron:dev": "concurrently \"pnpm dev\" \"wait-on http://localhost:5173 && electron .\"",
"electron:build": "pnpm build && tsc -p electron/tsconfig.json && electron-builder --mac",
"electron:preview": "electron ."
```

- [ ] **Step 3: Install concurrently and wait-on**

```bash
pnpm add -D concurrently wait-on
```

- [ ] **Step 4: Add Electron entry field to package.json**

Add at top level:

```json
"main": "electron/main.js",
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add Electron deps and scripts"
```

---

### Task 2: Create Electron main process

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`

- [ ] **Step 1: Create electron/main.ts**

```ts
import { app, BrowserWindow } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { createTray } from './tray'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(require.resolve('../package.json'))

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
```

- [ ] **Step 2: Create electron/preload.ts**

```ts
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
	platform: process.platform,
})
```

- [ ] **Step 3: Commit**

```bash
git add electron/
git commit -m "feat: Electron main process with server child and BrowserWindow"
```

---

### Task 3: Create menu bar tray

**Files:**
- Create: `electron/tray.ts`

- [ ] **Step 1: Create electron/tray.ts**

```ts
import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow): void {
	const icon = nativeImage.createFromDataURL(
		'data:image/svg+xml;base64,' +
			Buffer.from(
				'<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="#4da6ff" stroke="#fff" stroke-width="1"/></svg>'
			).toString('base64')
	)

	tray = new Tray(icon)
	tray.setToolTip('Timelog')

	const contextMenu = Menu.buildFromTemplate([
		{
			label: 'Show Timelog',
			click: () => {
				if (mainWindow.isMinimized()) mainWindow.restore()
				mainWindow.show()
				mainWindow.focus()
			},
		},
		{ type: 'separator' },
		{
			label: 'Quit',
			click: () => {
				app.quit()
			},
		},
	])

	tray.setContextMenu(contextMenu)

	tray.on('click', () => {
		if (mainWindow.isMinimized()) mainWindow.restore()
		mainWindow.show()
		mainWindow.focus()
	})
}

export function updateTrayIcon(isRunning: boolean): void {
	if (!tray) return
	const color = isRunning ? '#4da6ff' : '#888'
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="${color}" stroke="#fff" stroke-width="1"/></svg>`
	const icon = nativeImage.createFromDataURL(
		'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
	)
	tray.setImage(icon)
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/tray.ts
git commit -m "feat: menu bar tray with show/quit"
```

---

### Task 4: Configure electron-builder

**Files:**
- Create: `electron-builder.yml`
- Create: `electron/tsconfig.json`
- Create: `electron/resources/` (directory)

- [ ] **Step 1: Create electron-builder.yml**

```yaml
appId: com.jonathan.timelog
productName: Timelog
directories:
  buildResources: electron/resources
  output: dist-electron
files:
  - electron/**/*
  - build/**/*
extraResources:
  - from: build
    to: server
mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch:
        - arm64
  hardenedRuntime: true
  gatekeeperAssess: false
dmg:
  sign: false
publish:
  provider: github
  owner: Jonathangadeaharder
  repo: timelog
```

- [ ] **Step 2: Create electron/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": ".",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["./*.ts"]
}
```

- [ ] **Step 3: Create placeholder resources directory**

```bash
mkdir -p electron/resources
```

- [ ] **Step 4: Commit**

```bash
git add electron-builder.yml electron/tsconfig.json electron/resources/
git commit -m "chore: electron-builder config for macOS dmg"
```

---

### Task 5: Fix PGlite data directory for Electron

**Files:**
- Modify: `src/lib/server/db/index.ts`

- [ ] **Step 1: Update db/index.ts to use DATA_DIR env var**

Replace the data directory logic with:

```ts
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data', 'timelog')
mkdirSync(dataDir, { recursive: true })

let pgInstance: PGlite | null = null
let initPromise: Promise<void> | null = null

export async function getDb(): Promise<PGlite> {
	if (pgInstance) return pgInstance

	pgInstance = new PGlite({ dataDir })
	initPromise = pgInstance.waitReady
	await initPromise

	const { migrate } = await import('./migrate')
	await migrate(pgInstance)

	return pgInstance
}
```

- [ ] **Step 2: Run existing tests**

```bash
pnpm vitest run
```

Expected: 63 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/db/index.ts
git commit -m "fix: respect DATA_DIR env var for PGlite data path"
```

---

### Task 6: Add auto-update support

**Files:**
- Modify: `electron/main.ts`

- [ ] **Step 1: Add electron-updater to main.ts**

Add import at top:

```ts
import { autoUpdater } from 'electron-updater'
```

Add inside `app.whenReady().then()`, after `createWindow()` and `createTray()`:

```ts
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.checkForUpdates()
setInterval(() => {
	autoUpdater.checkForUpdates()
}, 4 * 60 * 60 * 1000)
```

- [ ] **Step 2: Commit**

```bash
git add electron/main.ts
git commit -m "feat: auto-update via electron-updater"
```

---

### Task 7: Add .gitignore entries

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add dist-electron/**

Add to `.gitignore`:

```
dist-electron/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore dist-electron"
```

---

### Task 8: Create release workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create .github/workflows/release.yml**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build SvelteKit
        run: pnpm build

      - name: Build Electron
        run: pnpm run electron:build
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload artifacts
        uses: softprops/action-gh-release@v2
        with:
          files: |
            dist-electron/*.dmg
            dist-electron/latest-mac.yml
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release workflow for Electron .dmg"
```

---

### Task 9: Remove old LaunchAgent deploy infrastructure

**Files:**
- Delete: `scripts/auto-deploy.sh`
- Modify: `scripts/deploy.sh`

- [ ] **Step 1: Delete auto-deploy script**

```bash
rm scripts/auto-deploy.sh
```

- [ ] **Step 2: Unload LaunchAgents**

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.jonathan.timelog.autodeploy.plist 2>/dev/null || true
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.jonathan.timelog.plist 2>/dev/null || true
rm ~/Library/LaunchAgents/com.jonathan.timelog.plist
rm ~/Library/LaunchAgents/com.jonathan.timelog.autodeploy.plist
```

- [ ] **Step 3: Simplify deploy.sh**

Replace `scripts/deploy.sh` with:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/Documents/projects/timelog"
git pull origin main
pnpm install --frozen-lockfile
pnpm build
echo "==> Dev deploy complete. Run 'pnpm preview' or 'pnpm electron:preview' to test."
```

- [ ] **Step 4: Remove post-merge hook**

```bash
rm -f .git/hooks/post-merge
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove LaunchAgent deploy, keep dev deploy.sh"
```

---

### Task 10: Local build and test

**Files:** None (verification only)

- [ ] **Step 1: Build the Electron app locally**

```bash
pnpm build
npx tsc -p electron/tsconfig.json
npx electron-builder --mac --arm64 --dir
```

Expected: `dist-electron/mac-arm64/Timelog.app` created.

- [ ] **Step 2: Run the built app**

```bash
open dist-electron/mac-arm64/Timelog.app
```

Expected: App opens, shows Timelog UI.

- [ ] **Step 3: Verify tray icon**

Expected: Blue circle in menu bar, right-click shows Show/Quit.

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run
```

Expected: 63 tests pass.

- [ ] **Step 5: Commit any fixes**

---

### Task 11: Install .app to /Applications

**Files:** None (manual setup)

- [ ] **Step 1: Copy to Applications**

```bash
cp -r dist-electron/mac-arm64/Timelog.app /Applications/Timelog.app
```

- [ ] **Step 2: Launch from /Applications**

```bash
open /Applications/Timelog.app
```

Expected: Dock icon, app opens with Timelog UI.

- [ ] **Step 3: Set as login item**

Add `app.setLoginItemSettings({ openAtLogin: true })` to `electron/main.ts` inside `app.whenReady()`, or add manually in System Settings > General > Login Items.
