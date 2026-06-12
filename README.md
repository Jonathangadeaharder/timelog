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
# Start tracking (project + optional task)
uv run python main.py start backend "fix auth bug"

# See what you're tracking right now
uv run python main.py now

# Stop and log the entry
uv run python main.py stop

# View today's entries (default)
uv run python main.py log

# View this week / all time
uv run python main.py log --week
uv run python main.py log --all

# Project summary (today, this week, all time)
uv run python main.py report

# Filter to one project
uv run python main.py report backend

# Export entries
uv run python main.py export csv -o timesheet.csv
uv run python main.py export json
```

### Daemon mode — it controls itself 🤖

The daemon monitors your mic for speech activity and auto-manages time tracking:

```bash
# Start the daemon (uses defaults: 5 min silence, 30 min check-ins)
uv run python main.py daemon start

# Customise thresholds
uv run python main.py daemon start --silence 240 --checkin 900

# Check mic is available
uv run python main.py daemon check
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
