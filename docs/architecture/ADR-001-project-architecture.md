# ADR-001: Project Architecture

**Status:** Accepted  
**Date:** 2026-05-17  

## Context

timelog is a minimal CLI time tracker for work. It needs two operation modes: manual (user-controlled start/stop) and daemon (automatic speech-detection-driven tracking). Must be installable via pip/uv and work on macOS.

## Decision

### Architecture

Single-package Python project managed by `uv`. Two modules:

- **`main.py`** — CLI entry point (`timelog`), provides manual commands (start, stop, now, log, report, export). Uses Click for CLI framework and Rich for terminal output.
- **`daemon.py`** — Background daemon with speech detection via PyAudio. Monitors microphone RMS energy to detect speech/silence. Logs entries to the same JSON store as manual mode.

### Storage

Flat JSON files in XDG application data directory (`~/.local/share/timelog/`). No database dependency. Entries are an append-only array of objects with project/task/timestamps/duration.

### Distribution

Published as `py-modules` (not a package with `src/` layout) via setuptools, installed as a Click console script entry point `timelog = main:cli`.

### Dependencies

- **click** — CLI framework
- **rich** — terminal formatting (tables, colors)
- **pyaudio** — microphone access for daemon mode
- **speechrecognition** — (declared but not yet used; reserved for future voice-to-text)

## Consequences

- No external database needed — zero setup friction
- JSON files are human-readable and editable
- Daemon mode requires PortAudio on macOS (`brew install portaudio`)
- No concurrent write safety (single-user tool)
