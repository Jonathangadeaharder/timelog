# timelog

A CLI time tracker for work with **automatic speech detection** — it listens to your mic, detects when meetings end (5 min silence), and prompts you for what's next. Plus periodic wellness check-ins every 30 minutes.

## Setup

```bash
cd ~/projects/timelog
uv sync
```

> **Note:** `pyaudio` needs PortAudio. On macOS: `brew install portaudio`.

## Two modes

### Manual mode — you control it

```bash
uv run timelog start backend "fix auth bug"

uv run timelog now

uv run timelog stop

uv run timelog log

uv run timelog log --week
uv run timelog log --all

uv run timelog report

uv run timelog report backend

uv run timelog export csv -o timesheet.csv
uv run timelog export json
```

### Daemon mode — it controls itself 🤖

The daemon monitors your mic for speech activity and auto-manages time tracking:

```bash
uv run timelog daemon start

uv run timelog daemon start --silence 240 --checkin 900

uv run timelog daemon check
```

#### How it works:

1. **Morning** — asks what you're working on, starts tracking
2. **Speech detection** — monitors mic energy; when you speak it knows you're in a meeting/call
3. **Silence → prompt** — after 5 minutes of no speech, asks if the meeting ended and what's next
4. **30-min check-in** — every half hour, reminds you to grab water / stand up, and asks if you're still doing the same thing
   - Press **Enter** → continue current task
   - Type something + Enter → switch to new task

#### Check-in example:

```
⏰ Check-in — 💧 Grab a glass of water
   Currently: backend (01:23:45)
   Press [Enter] to continue, or type new task> 
```

## Commands reference

### Manual commands

| Command | Description |
|---------|-------------|
| `start <project> [task]` | Start a timer for a project and optional task |
| `stop` | Stop the current timer and save the entry |
| `now` | Show what you're currently tracking + elapsed time |
| `log [--today\|--week\|--all]` | View logged entries (defaults to today) |
| `report [project]` | Time summary per project across today/week/all time |
| `export [csv\|json]` | Export entries to a file or stdout |

### Daemon commands

| Command | Description |
|---------|-------------|
| `daemon start` | Start the speech-detection daemon |
| `daemon check` | Verify microphone is available |

### Daemon options

| Option | Default | Description |
|--------|---------|-------------|
| `--silence, -s` | 300 (5 min) | Silence duration before prompting |
| `--energy, -e` | 800 | Minimum RMS energy to detect speech |
| `--checkin, -c` | 1800 (30 min) | Interval between wellness check-ins |

## Storage

Entries are stored as JSON in `~/.local/share/timelog/entries.json`.
