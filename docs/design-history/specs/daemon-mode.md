---
id: SPEC-DAEMON-MODE
kind: spec
title: 'SPEC: Daemon Mode — Automatic Speech Detection Time Tracking'
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
checksum: 178214ee5f6fd5c5b7776df84a38e8b1ed57e33dfb1ce2b2499c1c12ae7f7fa0
---

## Overview

Daemon mode monitors microphone audio energy to detect speech/silence patterns. It auto-tracks time based on activity detection and prompts the user at transitions.

## Architecture

```
┌─────────────────────────────────────────┐
│              Daemon.run()                │
│  ┌─────────────────────────────────────┐ │
│  │ Morning prompt → start tracking     │ │
│  │                                     │ │
│  │  ┌─ _monitor_loop() ────────────┐  │ │
│  │  │  Read audio chunk (16kHz)    │  │ │
│  │  │  Compute RMS energy          │  │ │
│  │  │  Speech > threshold?         │  │ │
│  │  │    → Update last_speech_time │  │ │
│  │  │  Silence > 5 min?           │  │ │
│  │  │    → Prompt: switch/continue │  │ │
│  │  │  30 min elapsed?            │  │ │
│  │  │    → Periodic check-in      │  │ │
│  │  └─────────────────────────────┘  │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--silence` / `-s` | 300s (5 min) | Silence before "what's next?" prompt |
| `--energy` / `-e` | 800 RMS | Minimum energy to classify as speech |
| `--checkin` / `-c` | 1800s (30 min) | Periodic wellness/task check-in |
| `--headless` | off | Run without initial prompt (for background daemons) |

## States

### Idle → Morning Prompt
Daemon starts, asks "What are you working on?", begins tracking.

### Speaking → Silent
When audio energy drops below threshold for `silence` seconds:
1. Log current activity to `entries.json`
2. Prompt user: continue / switch / quit
   - **continue**: Reset silence timer, same activity
   - **switch**: Ask what's new, start fresh timer
   - **quit**: Stop daemon

### Periodic Check-in (every 30 min)
1. Show wellness tip (randomized)
2. Show current activity + elapsed
3. Press Enter → continue; type new task → switch + log previous

### Shutdown (Ctrl+C)
On KeyboardInterrupt, log current activity before stopping.

## Audio Processing

- **Sample rate**: 16 kHz
- **Format**: 16-bit signed int, mono
- **Chunk size**: 1024 samples
- **Energy**: RMS (root mean square) of PCM samples
- **Threshold**: Fixed constant (800 RMS) rather than adaptive

## Edge Cases

- **No microphone**: `_check_mic()` lists available input devices, exits with code 1
- **Stream errors**: Caught and skipped (sleep 100ms, retry)
- **Close-to-threshold silence**: Countdown printed every ~10s in the final 60s before prompt
- **Empty prompt**: Defaults to "unknown" activity string
- **Headless mode**: `--headless` flag skips morning prompt (defaults activity to "background"), skips check-in/silence prompts (continues current task automatically)
- **Daemon status**: `daemon status` subcommand reads `daemon_state.json` and displays current state; the daemon loop never writes/updates this file
