---
id: ADR-005
kind: adr
title: CLI Data Model & Storage
status: draft
date: 2026-05-17T00:00:00.000Z
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
checksum: 7696aeb5078d3d707499b77d7df8301ce11d4f2a622cf807acb739a93e492ac1
---

> Imported legacy ADR artifact from `docs/architecture/ADR-005-cli-data-model-and-storage.md`. Keep future lifecycle work in OpenSpec.

## Context

timelog needs to persist time entries across sessions and share storage between manual and daemon modes. The storage format must be human-readable, trivially parseable, and require no external database.

## Decision

### Storage Location

XDG application data directory (`~/.local/share/timelog/`), resolved via `click.get_app_dir("timelog")`.

### Files

| File | Purpose | Format |
|------|---------|--------|
| `entries.json` | Append-only log of completed time entries | JSON array |
| `active.json` | Currently running timer (single entry) | JSON object |
| `daemon_state.json` | Daemon runtime state (currently unused) | JSON object |

### Entry Schema

```json
{
  "project": "backend",
  "task": "fix auth bug",
  "start": "2026-05-16T09:00:00",
  "end": "2026-05-16T11:30:00",
  "seconds": 9000.0
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project` | string | yes | Project name |
| `task` | string | yes | Task description (empty string if none) |
| `start` | string (ISO 8601) | yes | Start timestamp |
| `end` | string (ISO 8601) | yes | End timestamp (missing in active.json) |
| `seconds` | number | yes | Duration in seconds (float) |

### Active Entry Schema (active.json)

```json
{
  "project": "backend",
  "task": "fix auth bug",
  "start": "2026-05-16T09:00:00"
}
```

No `end` or `seconds` fields — these are computed when `stop` is called.

### Storage API (internal)

| Function | Signature | Description |
|----------|-----------|-------------|
| `_load()` | `() -> list[dict]` | Load all entries |
| `_save(entries)` | `(list[dict]) -> None` | Overwrite all entries |
| `_load_active()` | `() -> dict | None` | Load active timer |
| `_save_active(entry)` | `(dict) -> None` | Save active timer |
| `_clear_active()` | `() -> None` | Delete active timer file |
| `_data_file()` | `() -> Path` | Path to entries.json |
| `_active_path()` | `() -> Path` | Path to active.json |

### Design Decisions

- **JSON over SQLite** — Simpler, human-readable, no schema migrations, sufficient for single-user CLI tool
- **Separate active.json** — Avoids corrupting entries.json with incomplete entries; atomic read/clear on stop
- **Append-only entries.json** — New entries appended via load-modify-save (acceptable for a personal tool)
- **ISO 8601 strings** — Timezone-naive local time; no timezone handling needed for single-user tool
- **Float seconds** — Allows sub-second precision from daemon mode

## Consequences

- Storage is trivially debuggable — open the JSON file in any editor
- No SQLite dependency — keeps install footprint small
- No concurrent write safety — `_save` is a full rewrite, not an append
- Entries can be manually edited or exported via `timelog export`
