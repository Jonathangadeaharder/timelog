#!/usr/bin/env python3
"""timelog — a minimal CLI time tracker for work."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

console = Console()

DATA_DIR = Path(click.get_app_dir("timelog"))
DATA_FILE = DATA_DIR / "entries.json"


# ── storage helpers ───────────────────────────────────────────────

def _load() -> list[dict]:
    if not DATA_FILE.exists():
        return []
    with open(DATA_FILE) as f:
        return json.load(f)


def _save(entries: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(entries, f, indent=2)


def _active_file() -> Path:
    return DATA_DIR / "active.json"


def _load_active() -> dict | None:
    path = _active_file()
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)


def _save_active(entry: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(_active_file(), "w") as f:
        json.dump(entry, f, indent=2)


def _clear_active() -> None:
    path = _active_file()
    if path.exists():
        path.unlink()


def _elapsed(start: str) -> float:
    """Seconds elapsed since start (ISO string)."""
    return (datetime.fromisoformat(start.replace("Z", "+00:00")) - datetime.now()).total_seconds() * -1


def _fmt(seconds: float) -> str:
    """Format seconds as HH:MM:SS."""
    h, rem = divmod(int(seconds), 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


# ── commands ──────────────────────────────────────────────────────

@click.group()
def cli():
    """timelog — track your work time from the terminal."""
    pass

from daemon import daemon_cli as _daemon_group
cli.add_command(_daemon_group, "daemon")


@cli.command()
@click.argument("project")
@click.argument("task", required=False)
def start(project: str, task: str | None):
    """Start tracking time on a PROJECT (and optional TASK)."""
    active = _load_active()
    if active:
        console.print(
            f"[yellow]⚠ Already tracking [bold]{active['project']}[/bold]"
            f"{f' → {active.get('task')}' if active.get('task') else ''}[/yellow]\n"
            f"   Started [dim]{active['start']}[/dim] · elapsed [cyan]{_fmt(_elapsed(active['start']))}[/cyan]\n"
            f"   Run [bold]timelog stop[/bold] first, or use [bold]--force[/bold] to overwrite.",
        )
        return

    entry = {
        "project": project,
        "task": task or "",
        "start": datetime.now().isoformat(),
    }
    _save_active(entry)
    console.print(
        f"▶ Started tracking [bold]{project}[/bold]"
        f"{f' → [cyan]{task}[/cyan]' if task else ''}\n"
        f"   at [dim]{entry['start']}[/dim]"
    )


@cli.command()
def stop():
    """Stop the current timer and log the entry."""
    active = _load_active()
    if not active:
        console.print("[yellow]⚠ Nothing is currently being tracked.[/yellow]")
        return

    end = datetime.now().isoformat()
    seconds = _elapsed(active["start"])
    entry = {
        "project": active["project"],
        "task": active.get("task", ""),
        "start": active["start"],
        "end": end,
        "seconds": seconds,
    }

    entries = _load()
    entries.append(entry)
    _save(entries)
    _clear_active()

    console.print(
        f"■ Stopped [bold]{entry['project']}[/bold]"
        f"{f' → [cyan]{entry.get('task') or ''}[/cyan]' if entry.get('task') else ''}\n"
        f"   {entry['start']} → [dim]{end}[/dim]\n"
        f"   duration: [green]{_fmt(seconds)}[/green]"
    )


@cli.command()
def now():
    """Show what you're currently tracking."""
    active = _load_active()
    if not active:
        console.print("[yellow]⚠ Nothing is currently being tracked.[/yellow]")
        return

    elapsed = _elapsed(active["start"])
    console.print(
        f"▶ Currently tracking [bold]{active['project']}[/bold]"
        f"{f' → [cyan]{active.get('task') or ''}[/cyan]' if active.get('task') else ''}\n"
        f"   started: [dim]{active['start']}[/dim]\n"
        f"   elapsed: [green]{_fmt(elapsed)}[/green]"
    )


@cli.command()
@click.option("--today", "-t", is_flag=True, help="Show today's entries.")
@click.option("--week", "-w", is_flag=True, help="Show this week's entries.")
@click.option("--all", "-a", "show_all", is_flag=True, help="Show all entries.")
def log(today: bool, week: bool, show_all: bool):
    """View time entries. Defaults to today."""
    entries = _load()
    if not entries:
        console.print("[dim]No entries found.[/dim]")
        return

    now = datetime.now()
    if today:
        cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0)
        filtered = [e for e in entries if datetime.fromisoformat(e["start"]) >= cutoff]
        label = "Today"
    elif week:
        start_of_week = now - timedelta(days=now.weekday())
        cutoff = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        filtered = [e for e in entries if datetime.fromisoformat(e["start"]) >= cutoff]
        label = "This week"
    elif show_all:
        filtered = entries
        label = "All time"
    else:
        cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0)
        filtered = [e for e in entries if datetime.fromisoformat(e["start"]) >= cutoff]
        label = "Today"

    if not filtered:
        console.print(f"[dim]No entries for {label}.[/dim]")
        return

    table = Table(title=f"timelog — {label}", show_header=True)
    table.add_column("Project", style="bold")
    table.add_column("Task")
    table.add_column("Start", style="dim")
    table.add_column("End", style="dim")
    table.add_column("Duration", justify="right", style="green")

    total = 0
    for e in filtered:
        s = datetime.fromisoformat(e["start"]).strftime("%H:%M")
        e_time = datetime.fromisoformat(e["end"]).strftime("%H:%M") if "end" in e else "—"
        dur = _fmt(e["seconds"]) if "seconds" in e else "—"
        total += e.get("seconds", 0)
        table.add_row(e["project"], e.get("task") or "—", s, e_time, dur)

    console.print(table)
    console.print(f"\n   Total: [green]{_fmt(total)}[/green]")


@cli.command()
@click.argument("project", required=False)
def report(project: str | None):
    """Summarize time by project. Optionally filter to one PROJECT."""
    entries = _load()
    if not entries:
        console.print("[dim]No entries found.[/dim]")
        return

    now = datetime.now()
    today_cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)

    if project:
        entries = [e for e in entries if e["project"] == project]

    # Aggregate by project
    totals: dict[str, float] = {}
    today_totals: dict[str, float] = {}
    week_totals: dict[str, float] = {}

    for e in entries:
        p = e["project"]
        secs = e.get("seconds", 0)
        totals[p] = totals.get(p, 0) + secs

        start_dt = datetime.fromisoformat(e["start"])
        if start_dt >= week_start:
            week_totals[p] = week_totals.get(p, 0) + secs
        if start_dt >= today_cutoff:
            today_totals[p] = today_totals.get(p, 0) + secs

    table = Table(title="timelog — Project Report", show_header=True)
    table.add_column("Project", style="bold")
    table.add_column("Today", justify="right", style="green")
    table.add_column("This Week", justify="right", style="cyan")
    table.add_column("All Time", justify="right")

    for p in sorted(totals, key=lambda x: totals[x], reverse=True):
        table.add_row(
            p,
            _fmt(today_totals.get(p, 0)),
            _fmt(week_totals.get(p, 0)),
            _fmt(totals[p]),
        )

    console.print(table)


@cli.command()
@click.argument("format", type=click.Choice(["csv", "json"]), default="csv")
@click.option("--output", "-o", type=click.Path(), help="Output file path.")
def export(format: str, output: str | None):
    """Export entries as CSV or JSON."""
    entries = _load()
    if not entries:
        console.print("[dim]No entries to export.[/dim]")
        return

    if format == "json":
        content = json.dumps(entries, indent=2)
    else:
        lines = ["project,task,start,end,duration_seconds"]
        for e in entries:
            lines.append(
                f'{e["project"]},{e.get("task","")},'
                f'{e["start"]},{e.get("end","")},{e.get("seconds",0)}'
            )
        content = "\n".join(lines)

    if output:
        Path(output).write_text(content)
        console.print(f"Exported to [bold]{output}[/bold]")
    else:
        console.print(content)


if __name__ == "__main__":
    cli()
