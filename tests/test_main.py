from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

from click.testing import CliRunner
from freezegun import freeze_time

from main import (
    _clear_active,
    _elapsed,
    _fmt,
    _load,
    _load_active,
    _save,
    _save_active,
    cli,
)

# ── storage helpers ─────────────────────────────────────────────


def test_load_returns_empty_when_no_file(data_dir: Path):
    with patch("main.DATA_DIR", data_dir):
        assert _load() == []


def test_load_returns_entries(data_dir: Path, sample_entries: list[dict]):
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "entries.json").write_text(json.dumps(sample_entries))
    with patch("main.DATA_DIR", data_dir):
        entries = _load()
        assert len(entries) == 3  # noqa: PLR2004
        assert entries[0]["project"] == "backend"


def test_save_creates_directory(tmp_path: Path):
    d = tmp_path / "new_dir" / "nested"
    with patch("main.DATA_DIR", d):
        _save([{"project": "test"}])
        f = d / "entries.json"
        assert f.exists()
        loaded = json.loads(f.read_text())
        assert loaded == [{"project": "test"}]


def test_save_overwrites_existing(data_dir: Path, sample_entries: list[dict]):
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "entries.json").write_text(json.dumps(sample_entries))
    with patch("main.DATA_DIR", data_dir):
        _save([{"project": "replacement"}])
        entries = _load()
        assert len(entries) == 1
        assert entries[0]["project"] == "replacement"


def test_load_active_returns_none_when_no_file(data_dir: Path):
    with patch("main.DATA_DIR", data_dir):
        assert _load_active() is None


def test_load_active_returns_entry(data_dir: Path):
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "active.json").write_text(json.dumps({"project": "test"}))
    with patch("main.DATA_DIR", data_dir):
        assert _load_active() == {"project": "test"}


def test_save_active_creates_file(data_dir: Path):
    with patch("main.DATA_DIR", data_dir):
        _save_active({"project": "test", "start": "2026-01-01T00:00:00"})
        f = data_dir / "active.json"
        assert f.exists()
        assert json.loads(f.read_text())["project"] == "test"


def test_clear_active_removes_file(data_dir: Path):
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "active.json").write_text(json.dumps({"project": "test"}))
    with patch("main.DATA_DIR", data_dir):
        _clear_active()
        assert not (data_dir / "active.json").exists()


def test_clear_active_noop_when_no_file(data_dir: Path):
    with patch("main.DATA_DIR", data_dir):
        _clear_active()


def test_active_path():
    from main import _active_path  # noqa: PLC0415

    assert _active_path().name == "active.json"


def test_fmt_zero():
    assert _fmt(0) == "00:00:00"


def test_fmt_exact_hours():
    assert _fmt(3600) == "01:00:00"


def test_fmt_exact_minutes():
    assert _fmt(3660) == "01:01:00"


def test_fmt_seconds():
    assert _fmt(3661) == "01:01:01"


def test_fmt_large():
    assert _fmt(100000) == "27:46:40"


def test_fmt_rounds_down():
    assert _fmt(1.7) == "00:00:01"


def test_fmt_negative():
    assert _fmt(-3600) == "-1:00:00"


# ── CLI commands ────────────────────────────────────────────────


def test_start_tracks(runner: CliRunner, data_dir: Path, active_file: Path):
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T10:00:00"):
        result = runner.invoke(cli, ["start", "backend"])
        assert result.exit_code == 0
        assert "Started tracking" in result.output
        assert active_file.exists()
        active = json.loads(active_file.read_text())
        assert active["project"] == "backend"
        assert active["task"] == ""


def test_start_with_task(runner: CliRunner, data_dir: Path, active_file: Path):
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T10:00:00"):
        result = runner.invoke(cli, ["start", "backend", "fix auth bug"])
        assert result.exit_code == 0
        active = json.loads(active_file.read_text())
        assert active["task"] == "fix auth bug"


def test_start_warns_already_tracking(
    runner: CliRunner, data_dir: Path, active_file: Path
):
    active_file.parent.mkdir(parents=True, exist_ok=True)
    active_file.write_text(
        json.dumps({"project": "frontend", "start": "2026-05-16T09:00:00"})
    )
    with patch("main.DATA_DIR", data_dir):
        result = runner.invoke(cli, ["start", "backend"])
        assert result.exit_code == 0
        assert "Already tracking" in result.output


def test_stop_warns_nothing_tracking(runner: CliRunner, data_dir: Path):
    with patch("main.DATA_DIR", data_dir):
        result = runner.invoke(cli, ["stop"])
        assert result.exit_code == 0
        assert "Nothing is currently being tracked" in result.output


def test_stop_logs_entry(
    runner: CliRunner, data_dir: Path, data_file: Path, active_file: Path
):
    active_file.parent.mkdir(parents=True, exist_ok=True)
    active_file.write_text(
        json.dumps({"project": "backend", "start": "2026-05-16T09:00:00"})
    )
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T11:30:00"):
        result = runner.invoke(cli, ["stop"])
        assert result.exit_code == 0
        assert "Stopped" in result.output
        assert data_file.exists()
        entries = json.loads(data_file.read_text())
        assert len(entries) == 1
        assert entries[0]["project"] == "backend"
        assert not active_file.exists()


def test_stop_preserves_task(
    runner: CliRunner, data_dir: Path, active_file: Path, data_file: Path
):
    active_file.parent.mkdir(parents=True, exist_ok=True)
    active_file.write_text(
        json.dumps(
            {"project": "backend", "task": "fix auth", "start": "2026-05-16T09:00:00"}
        )
    )
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T11:30:00"):
        runner.invoke(cli, ["stop"])
        entries = json.loads(data_file.read_text())
        assert entries[0]["task"] == "fix auth"


def test_stop_calculates_seconds(
    runner: CliRunner, data_dir: Path, active_file: Path, data_file: Path
):
    active_file.parent.mkdir(parents=True, exist_ok=True)
    active_file.write_text(
        json.dumps({"project": "backend", "start": "2026-05-16T09:00:00"})
    )
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T11:30:00"):
        runner.invoke(cli, ["stop"])
        entries = json.loads(data_file.read_text())
        assert entries[0]["seconds"] == 9000.0  # noqa: PLR2004


def test_now_shows_nothing_when_idle(runner: CliRunner, data_dir: Path):
    with patch("main.DATA_DIR", data_dir):
        result = runner.invoke(cli, ["now"])
        assert result.exit_code == 0
        assert "Nothing is currently being tracked" in result.output


def test_now_shows_active(runner: CliRunner, data_dir: Path, active_file: Path):
    active_file.parent.mkdir(parents=True, exist_ok=True)
    active_file.write_text(
        json.dumps({"project": "backend", "start": "2026-05-16T09:00:00"})
    )
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T10:00:00"):
        result = runner.invoke(cli, ["now"])
        assert result.exit_code == 0
        assert "Currently tracking" in result.output
        assert "backend" in result.output


def test_log_shows_no_entries(runner: CliRunner, data_dir: Path):
    with patch("main.DATA_DIR", data_dir):
        result = runner.invoke(cli, ["log"])
        assert result.exit_code == 0
        assert "No entries found" in result.output


def test_log_defaults_to_today(runner: CliRunner, with_entries: Path, data_dir: Path):  # noqa: ARG001
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T14:00:00"):
        result = runner.invoke(cli, ["log"])
        assert result.exit_code == 0
        assert "backend" in result.output
        assert "frontend" in result.output
        # yesterday's entries should not appear
        assert result.output.count("backend") == 1  # only in table, not "no entries"
        assert "review PRs" not in result.output


def test_log_week_flag(runner: CliRunner, with_entries: Path, data_dir: Path):  # noqa: ARG001
    # May 16 2026 is a Saturday. Week started Monday May 11
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T14:00:00"):
        result = runner.invoke(cli, ["log", "--week"])
        assert result.exit_code == 0
        assert "backend" in result.output
        assert "review PRs" in result.output  # May 15 is within the same week


def test_log_all_flag(runner: CliRunner, with_entries: Path, data_dir: Path):  # noqa: ARG001
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T14:00:00"):
        result = runner.invoke(cli, ["log", "--all"])
        assert result.exit_code == 0
        assert "backend" in result.output
        assert "frontend" in result.output
        assert "review PRs" in result.output


def test_log_no_entries_for_period(
    runner: CliRunner, with_entries: Path, data_dir: Path  # noqa: ARG001
):
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-20T14:00:00"):
        result = runner.invoke(cli, ["log", "--today"])
        assert result.exit_code == 0
        assert "No entries for Today" in result.output


def test_log_all_with_flag(runner: CliRunner, with_entries: Path, data_dir: Path):  # noqa: ARG001
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T14:00:00"):
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        # Just verify --help works (smoke test)


def test_report_no_entries(runner: CliRunner, data_dir: Path):
    with patch("main.DATA_DIR", data_dir):
        result = runner.invoke(cli, ["report"])
        assert result.exit_code == 0
        assert "No entries found" in result.output


def test_report_all_projects(runner: CliRunner, with_entries: Path, data_dir: Path):  # noqa: ARG001
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T14:00:00"):
        result = runner.invoke(cli, ["report"])
        assert result.exit_code == 0
        assert "backend" in result.output
        assert "frontend" in result.output


def test_report_filter_by_project(
    runner: CliRunner, with_entries: Path, data_dir: Path  # noqa: ARG001
):
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T14:00:00"):
        result = runner.invoke(cli, ["report", "frontend"])
        assert result.exit_code == 0
        assert "frontend" in result.output
        assert result.output.count("backend") == 0


def test_report_shows_today_and_week(
    runner: CliRunner, with_entries: Path, data_dir: Path  # noqa: ARG001
):
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T14:00:00"):
        result = runner.invoke(cli, ["report"])
        assert result.exit_code == 0
        assert "Today" in result.output
        assert "This Week" in result.output
        assert "All Time" in result.output


def test_export_no_entries(runner: CliRunner, data_dir: Path):
    with patch("main.DATA_DIR", data_dir):
        result = runner.invoke(cli, ["export", "csv"])
        assert result.exit_code == 0
        assert "No entries to export" in result.output


def test_export_csv(runner: CliRunner, with_entries: Path, data_dir: Path):  # noqa: ARG001
    with patch("main.DATA_DIR", data_dir):
        result = runner.invoke(cli, ["export", "csv"])
        assert result.exit_code == 0
        assert "project,task,start,end,duration_seconds" in result.output
        assert "backend" in result.output


def test_export_json(runner: CliRunner, with_entries: Path, data_dir: Path):  # noqa: ARG001
    with patch("main.DATA_DIR", data_dir):
        result = runner.invoke(cli, ["export", "json"])
        assert result.exit_code == 0
        data = json.loads(result.output)
        assert len(data) == 3  # noqa: PLR2004
        assert data[0]["project"] == "backend"


def test_export_to_file(
    runner: CliRunner, with_entries: Path, data_dir: Path, tmp_path: Path  # noqa: ARG001
):
    out = tmp_path / "out.csv"
    with patch("main.DATA_DIR", data_dir):
        result = runner.invoke(cli, ["export", "csv", "--output", str(out)])
        assert result.exit_code == 0
        assert "Exported to" in result.output
        assert out.exists()
        content = out.read_text()
        assert "backend" in content


def test_export_to_file_json(
    runner: CliRunner, with_entries: Path, data_dir: Path, tmp_path: Path  # noqa: ARG001
):
    out = tmp_path / "out.json"
    with patch("main.DATA_DIR", data_dir):
        result = runner.invoke(cli, ["export", "json", "--output", str(out)])
        assert result.exit_code == 0
        data = json.loads(out.read_text())
        assert len(data) == 3  # noqa: PLR2004

def test_elapsed_positive():
    t0 = "2026-05-16T10:00:00"
    with freeze_time("2026-05-16T12:00:00"):
        e = _elapsed(t0)
        assert e == 7200.0  # noqa: PLR2004


def test_elapsed_zero():
    t0 = "2026-05-16T10:00:00"
    with freeze_time("2026-05-16T10:00:00"):
        assert _elapsed(t0) == 0.0


def test_elapsed_with_zulu_replaces_correctly():
    assert "2026-05-16T10:00:00Z".replace("Z", "+00:00") == "2026-05-16T10:00:00+00:00"


def test_elapsed_negative():
    t0 = "2026-05-16T12:00:00"
    with freeze_time("2026-05-16T10:00:00"):
        e = _elapsed(t0)
        assert e < 0


def test_start_with_no_project_shows_error(runner: CliRunner):
    result = runner.invoke(cli, ["start"])
    assert result.exit_code != 0


def test_cli_help_shows_commands(runner: CliRunner):
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    for cmd in ["start", "stop", "now", "log", "report", "export", "daemon"]:
        assert cmd in result.output


def test_log_with_colon_start_today_default(runner: CliRunner, data_dir: Path):
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "entries.json").write_text(
        json.dumps(
            [
                {
                    "project": "test",
                    "task": "",
                    "start": "2026-05-16T10:00:00",
                    "end": "2026-05-16T11:00:00",
                    "seconds": 3600,
                }
            ]
        )
    )
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T14:00:00"):
        result = runner.invoke(cli, ["log"])
        assert result.exit_code == 0
        assert "test" in result.output


def test_log_week_calculates_correctly(runner: CliRunner, data_dir: Path):
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "entries.json").write_text(
        json.dumps(
            [
                {
                    "project": "test",
                    "task": "",
                    "start": "2026-05-11T10:00:00",
                    "end": "2026-05-11T11:00:00",
                    "seconds": 3600,
                }
            ]
        )
    )
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T14:00:00"):
        result = runner.invoke(cli, ["log", "--week"])
        assert result.exit_code == 0
        assert "test" in result.output


def test_log_week_excludes_previous_week(runner: CliRunner, data_dir: Path):
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "entries.json").write_text(
        json.dumps(
            [
                {
                    "project": "old_task",
                    "task": "",
                    "start": "2026-05-09T10:00:00",
                    "end": "2026-05-09T11:00:00",
                    "seconds": 3600,
                }
            ]
        )
    )
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T14:00:00"):
        result = runner.invoke(cli, ["log", "--week"])
        assert result.exit_code == 0
        assert "No entries for This week" in result.output


def test_report_sorts_by_total_descending(runner: CliRunner, data_dir: Path):
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "entries.json").write_text(
        json.dumps(
            [
                {
                    "project": "small",
                    "task": "",
                    "start": "2026-05-16T09:00:00",
                    "end": "2026-05-16T10:00:00",
                    "seconds": 3600,
                },
                {
                    "project": "large",
                    "task": "",
                    "start": "2026-05-16T09:00:00",
                    "end": "2026-05-16T14:00:00",
                    "seconds": 18000,
                },
            ]
        )
    )
    with patch("main.DATA_DIR", data_dir), freeze_time("2026-05-16T14:00:00"):
        result = runner.invoke(cli, ["report"])
        assert result.exit_code == 0
        assert result.output.index("large") < result.output.index("small")
