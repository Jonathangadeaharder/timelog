from __future__ import annotations

import json
from pathlib import Path

import pytest
from click.testing import CliRunner


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    return tmp_path / "timelog"


@pytest.fixture
def data_file(data_dir: Path) -> Path:
    return data_dir / "entries.json"


@pytest.fixture
def active_file(data_dir: Path) -> Path:
    return data_dir / "active.json"


@pytest.fixture
def sample_entries() -> list[dict]:
    return [
        {
            "project": "backend",
            "task": "fix auth",
            "start": "2026-05-16T09:00:00",
            "end": "2026-05-16T11:30:00",
            "seconds": 9000.0,
        },
        {
            "project": "frontend",
            "task": "build ui",
            "start": "2026-05-16T12:00:00",
            "end": "2026-05-16T14:00:00",
            "seconds": 7200.0,
        },
        {
            "project": "backend",
            "task": "review PRs",
            "start": "2026-05-15T15:00:00",
            "end": "2026-05-15T16:00:00",
            "seconds": 3600.0,
        },
    ]


@pytest.fixture
def with_entries(data_dir: Path, data_file: Path, sample_entries: list[dict]):
    data_dir.mkdir(parents=True, exist_ok=True)
    data_file.write_text(json.dumps(sample_entries, indent=2))
    return data_file
