#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$HOME/Documents/projects/timelog"
PLIST_LABEL="com.jonathan.timelog"

cd "$REPO_DIR"

# Only act on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
    exit 0
fi

# Check for new commits
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git ls-remote origin main 2>/dev/null | awk '{print $1}')

if [ -z "$REMOTE" ] || [ "$LOCAL" = "$REMOTE" ]; then
    exit 0
fi

echo "==> New commits detected. Deploying..."

git fetch origin main
git reset --hard origin/main

pnpm install --frozen-lockfile
pnpm build

launchctl bootout gui/$(id -u) "$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist" 2>/dev/null || true
launchctl bootstrap gui/$(id -u) "$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"

echo "==> Deploy complete."
