---
id: ADR-004
kind: adr
title: Testing Strategy
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
checksum: 1b3b5360aa9cc61afeb5c826401f3efda066d6dbd18a272df6bb2b9b68289a35
---

## Context

Need a testing approach that provides high confidence in CLI behavior, storage correctness, and daemon speech detection logic. Tests must be fast, isolated, and CI-friendly.

## Decision

### Framework: `pytest` + `pytest-cov`

- All tests in `tests/` directory
- Branch coverage enforced at **>=90%** (in CI; advisory locally)
- Coverage measured on `main.py` and `daemon.py`

### Test Organization

Tests are organized by module. `test_daemon.py` uses classes for grouping; `test_main.py` uses flat functions with comment separators:

```text
tests/
  conftest.py          # Shared fixtures (runner, data_dir, sample_entries)
  test_main.py         # Manual CLI tests (flat functions)
    # storage helpers    _load, _save, _load_active, _save_active, _clear_active
    # format helpers     _fmt, _elapsed
    # CLI commands       start, stop, now, log, report, export
  test_daemon.py       # Daemon tests (class-based)
    - TestDaemonInit          # Constructor state
    - TestStartStopStream     # Audio stream lifecycle
    - TestRmsEnergy           # Energy calculation correctness
    - TestPromptActivity      # User prompt behavior
    - TestLogEntry            # Entry persistence
    - TestFormat              # Duration formatting
    - TestWellnessTip         # Randomized wellness tips
    - TestPeriodicCheckin     # 30-min check-in logic
    - TestCheckMic            # Microphone availability
    - TestMonitorLoop         # Speech/silence detection loop
    - TestDaemonCli           # Daemon subcommands (check, status)
    - TestRun                 # Full daemon lifecycle
    - TestDaemonStartCli      # Daemon start with mic failure
    - TestMainBlock           # Callable smoke test
    - TestHeadlessMode        # Headless daemon behavior
```

### Key Patterns

- **Click CliRunner** — Invoke CLI commands in-process with isolated filesystem
- **`patch("main.DATA_DIR", ...)`** — Redirect JSON storage to tmp_path
- **`freezegun.freeze_time`** — Deterministic time for elapsed/duration calculations
- **`unittest.mock.MagicMock`** — Mock PyAudio for daemon tests (no mic needed in CI)
- **`pytest.approx`** — Float tolerance for elapsed seconds
- **`pytest-socket`** — Network isolation (imported in conftest, gracefully skipped if not installed)

### Mutation Testing: `mutmut`

- Config in `[tool.mutmut]` section of `pyproject.toml`
- Targets: `main.py`, `daemon.py`
- Runs in merge gate only (not PR gate) due to runtime

## Consequences

- Tests run in <5s — fast feedback loop
- No external dependencies (mic, network, DB) needed in CI
- Branch coverage >=90% catches untested edge cases
- Mutation testing ensures tests actually verify behavior (not just execute code)
