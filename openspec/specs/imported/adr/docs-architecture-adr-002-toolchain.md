---
id: ADR-002
kind: adr
title: Toolchain
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
checksum: a16a70833967cf867abd2bc83f427a080af167b104fec1743086ebd5809b7e6c
---

> Imported legacy ADR artifact from `docs/architecture/ADR-002-toolchain.md`. Keep future lifecycle work in OpenSpec.

## Context

Need a consistent Python toolchain for package management, linting, formatting, type checking, and testing. Must align with modern Python 3.14 and avoid legacy tools.

## Decision

### Package Management: `uv`

- Project configured with `[tool.uv] package = true`
- All dependencies in `[project] dependencies` and `[dependency-groups] dev`
- `uv sync` for install, `uv run` for execution, `uv add` for new deps
- Python version pinned via `.python-version` (3.14)

### Linting & Formatting: `ruff`

- Runs via `uv run ruff check` (linting) and `uv run ruff format` (formatting)
- No config file yet — uses defaults

### Type Checking: `pyright`

- Runs via `uv run pyright`
- Uses default config (no `pyproject.toml` section yet)

### Testing: `pytest` + `pytest-cov`

- Branch coverage enabled (`--cov-branch`)
- Fail-under threshold: 90% (enforced in CI, advisory locally)
- Config in `[tool.pytest.ini_options]` and `[tool.coverage.*]` sections

### Mutation Testing: `mutmut`

- Config in `[tool.mutmut]` section
- Mutates `main.py` and `daemon.py`
- Runs via `uv run mutmut run`
- Dictionary synonyms configured for `project`, `task`, `current_activity`

## Consequences

- Zero legacy tooling — `pip`/`pipx`/`black`/`flake8`/`isort`/`mypy` never used
- All tooling config lives in `pyproject.toml` (single source of truth)
- `uv` ensures reproducible environments via `uv.lock`
