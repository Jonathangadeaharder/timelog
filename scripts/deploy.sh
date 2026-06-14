#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$HOME/Documents/projects/timelog"
PLIST_LABEL="com.jonathan.timelog"
PORT=3000

cd "$REPO_DIR"

echo "==> Pulling main..."
git fetch origin main
git reset --hard origin/main

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building..."
pnpm build

echo "==> Restarting LaunchAgent..."
launchctl bootout gui/$(id -u) "$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist" 2>/dev/null || true
launchctl bootstrap gui/$(id -u) "$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"

echo "==> Deploy complete. Server on http://localhost:${PORT}"
