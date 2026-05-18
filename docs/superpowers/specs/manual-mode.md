---
id: SPEC-MANUAL-MODE
kind: spec
title: 'SPEC: Manual Mode — CLI Time Tracking'
status: draft
authors: []
reviewers: []
tags: []
supersedes: []
superseded_by: []
depends_on: []
blocks: []
implements: []
related: []
external: []
project: timelog
checksum: 68bc0278faf58ff6ef8948635cfd405ec40b866a8e54f0dfd544461942f8bf6f
---

## Overview

Manual mode provides user-controlled time tracking via Click CLI commands. Users start/stop timers explicitly and view logged entries with filtering and reporting.

## Commands

### `timelog start <project> [task]`

- Creates an active session in `active.json`
- Rejects if already tracking (no `--force` flag yet)
- Accepts optional task string (greedy, pass-through)

### `timelog stop`

- Reads `active.json`, computes elapsed seconds, appends entry to `entries.json`
- Deletes `active.json` after successful log
- Warns if nothing is tracking

### `timelog now`

- Reads `active.json`, displays project/task/start/elapsed
- Warns if nothing is tracking

### `timelog log [--today] [--week] [--all]`

- Lists entries in a Rich table with columns: Project, Task, Start, End, Duration
- Defaults to today's entries
- Shows total duration at bottom

### `timelog report [project]`

- Groups entries by project
- Shows Today / This Week / All Time columns per project
- Sorted by total descending
- Optional project filter

### `timelog export [csv|json] [--output <file>]`

- Exports all entries in CSV or JSON format
- Writes to stdout by default, or to file with `--output`

## Edge Cases

- **Empty state**: All commands handle empty entries/active gracefully with dim/no-color messages
- **Date boundaries**: `--week` uses Monday-start weeks; `--today` uses midnight boundary
- **Task with spaces**: Click passes everything after project as task string
- **Negative elapsed**: If system clock jumps backwards, `_elapsed()` returns negative value (formatted as `-H:MM:SS`)
