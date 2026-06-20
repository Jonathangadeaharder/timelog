#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/Documents/projects/timelog"
git pull origin main
pnpm install --frozen-lockfile
pnpm build
echo "==> Dev deploy complete. Run 'pnpm preview' or 'pnpm electron:preview' to test."
