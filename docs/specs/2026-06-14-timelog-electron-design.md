# Timelog Electron Desktop App — Design Spec

## Goal

Package the SvelteKit timelog web app as a native macOS .app bundle using Electron. Dock icon, menu bar tray, auto-update from GitHub Releases. Zero changes to SvelteKit app code.

## Architecture

```
Electron main process (electron/main.ts)
├── Spawns child: node build/index.js (:3000)
├── BrowserWindow → http://localhost:3000
├── Tray icon (timer status, start/stop)
├── Auto-updater (electron-updater + GitHub Releases)
└── App lifecycle (dock, single-instance, quit)
```

### What changes

| Layer | Before (LaunchAgent) | After (Electron) |
|---|---|---|
| Server | Node process via LaunchAgent | Electron main spawns `build/index.js` |
| Window | Browser tab | Electron BrowserWindow |
| Deploy | git pull + rebuild | GitHub Release .dmg + auto-update |
| Tray | None | Menu bar icon with timer status |
| Start | Login LaunchAgent | `app.setLoginItemSettings()` |

### What stays the same

- All SvelteKit code — zero changes
- `+page.server.ts`, form actions, `load()` — unchanged
- PGlite — runs in Node server process as before
- Mic, Notifications — Chromium in BrowserWindow supports all APIs
- Tests, build pipeline — unchanged

## Implementation Details

### Server as child process

- `main.ts` spawns `node build/index.js` as child process
- Polls `http://localhost:3000` until server responds (max 10s)
- Then opens BrowserWindow pointing at the server
- On `app.quit()`, kills child process via `child.kill()`
- Port 3000 hardcoded (matches SvelteKit `ORIGIN` env)

### BrowserWindow

- Frameless with custom titlebar (or default macOS traffic lights)
- Min size: 800x600
- `titleBarStyle: 'hiddenInset'` for native feel
- Opens on launch, re-opens on dock click

### Menu bar tray

- Shows mic status icon (🔴 silent / 🟢 speaking)
- Context menu: Show Window, Start/Stop Timer, Quit
- Click: focus/restore BrowserWindow
- Tray updates via IPC from renderer (renderer posts timer state)

### Single instance

- `app.requestSingleInstanceLock()` — second launch focuses existing window

### Auto-update

- `electron-updater` with GitHub provider
- Checks on app launch (every 4h while running)
- Downloads `.dmg` from GitHub Release in background
- Prompts to install on next restart
- Requires code signing for auto-update on macOS (or use `electron-builder` notarize)

### Dev mode

- `pnpm dev:electron` — runs Vite dev server + Electron concurrently
- Electron loads `http://localhost:5173` (Vite dev)
- No build step needed during dev

### Release flow

1. `git tag v1.x.x && git push --tags`
2. GitHub Action: `electron-builder --mac --arm64`
3. Action creates GitHub Release with `.dmg` + `latest-mac.yml`
4. Installed app auto-updates

## Files to add

```
electron/
  main.ts          — Electron main process
  preload.ts       — contextBridge for IPC
  tray.ts          — menu bar tray icon
electron-builder.yml — build/config
.github/workflows/release.yml — build + publish on tag
```

## Dependencies to add

```
electron (devDep)
electron-builder (devDep)
electron-updater (dep)
```

## Migration from LaunchAgent

- Remove `com.jonathan.timelog` LaunchAgent (node server)
- Remove `com.jonathan.timelog.autodeploy` LaunchAgent (auto-pull)
- Remove `scripts/auto-deploy.sh`
- Keep `scripts/deploy.sh` for dev server deploys
- Remove `.git/hooks/post-merge`
- Install .app bundle in /Applications

## Concerns

- **Code signing**: Auto-update on macOS requires notarization. Without Apple Developer cert ($99/yr), auto-update shows security warning. Can distribute unsigned .dmg with manual install.
- **App size**: ~150MB (Chromium bundled). Acceptable for Electron.
- **Port conflicts**: If port 3000 is taken, server fails. Could use dynamic port or check availability.
- **PGlite data**: Persists at `./data/timelog` relative to CWD. Electron sets CWD to app resources. Need to ensure data path resolves to stable location (e.g. `~/Library/Application Support/timelog/`).
