#!/usr/bin/env python3
"""timelog daemon — auto-track time via mic speech detection."""

from __future__ import annotations

import json
import math
import random
import sys
import time
from datetime import datetime
from pathlib import Path

import click
import pyaudio
from rich.console import Console

console = Console()

# ── config ────────────────────────────────────────────────────────
SILENCE_THRESHOLD_SEC = 300  # 5 min of silence → prompt
SPEECH_ENERGY_MIN = 800  # RMS energy above this = "speaking"
CHECKIN_INTERVAL_SEC = 1800  # 30 min periodic check-in
SAMPLE_RATE = 16_000
CHANNELS = 1
CHUNK = 1024
SAMPLE_WIDTH = 2

DATA_DIR = Path(click.get_app_dir("timelog"))
STATE_FILE = DATA_DIR / "daemon_state.json"


# ── state machine ────────────────────────────────────────────────


class Daemon:
    """Background daemon that tracks time via mic activity."""

    def __init__(self):
        self.audio = pyaudio.PyAudio()
        self.stream = None
        self.running = False
        self.headless = False

        # Timing state
        self.current_activity: str | None = None
        self.activity_start: float | None = None  # epoch

        # Speech detection state
        self.last_speech_time: float | None = (
            None  # epoch, when speech was last detected
        )
        self.silence_start: float | None = None  # epoch, when silence began

        # Periodic check-in state
        self.last_checkin: float | None = None  # epoch, last wellness check-in

    def start_stream(self):
        self.stream = self.audio.open(
            format=pyaudio.paInt16,
            channels=CHANNELS,
            rate=SAMPLE_RATE,
            input=True,
            frames_per_buffer=CHUNK,
        )

    def stop_stream(self):
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
            self.audio.terminate()

    def rms_energy(self, data: bytes) -> float:
        """Calculate RMS energy of an audio chunk."""
        if not data:
            return 0.0
        samples = list(data[::2])  # every other byte is sample start for 16-bit
        if not samples:
            return 0.0
        # Convert to signed 16-bit integers
        values = []
        for i in range(0, len(data) - 1, 2):
            val = int.from_bytes(data[i : i + 2], byteorder="little", signed=True)
            values.append(val)
        if not values:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        return math.sqrt(variance)

    def prompt_activity(self, context: str = "") -> str:
        """Ask the user what they're doing. Returns activity string."""
        if context == "morning":
            prompt = "[bold]☀️ Good morning![/bold] What are you working on?"
        elif context == "meeting_ended":
            prompt = "[bold]🔇 Meeting looks done.[/bold] What's next?"
        else:
            prompt = "What are you doing now?"

        activity = click.prompt(prompt, default="")
        return activity.strip() or "unknown"

    def log_entry(self):
        """Save the current activity as a completed entry."""
        if not self.current_activity or not self.activity_start:
            return

        now = time.time()
        seconds = now - self.activity_start

        entry = {
            "project": self.current_activity,
            "task": "",
            "start": datetime.fromtimestamp(self.activity_start).isoformat(),
            "end": datetime.fromtimestamp(now).isoformat(),
            "seconds": seconds,
        }

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        data_file = DATA_DIR / "entries.json"

        entries = []
        if data_file.exists():
            with open(data_file) as f:
                entries = json.load(f)

        entries.append(entry)
        with open(data_file, "w") as f:
            json.dump(entries, f, indent=2)

        console.print(
            f"■ Logged [bold]{self.current_activity}[/bold] "
            f"[dim]{entry['start']} → {entry['end']}[/dim] "
            f"({self._fmt(seconds)})"
        )

    @staticmethod
    def _fmt(seconds: float) -> str:
        h, rem = divmod(int(seconds), 3600)
        m, s = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"

    def run(self, headless: bool = False):
        """Main daemon loop."""
        self.running = True
        self.headless = headless
        self.start_stream()

        console.print(
            "[bold]🎤 timelog daemon started[/bold]\n"
            f"[dim]   silence threshold: {SILENCE_THRESHOLD_SEC // 60} min · "
            f"speech energy: {SPEECH_ENERGY_MIN}[/dim]\n"
            "[dim]   press Ctrl+C to stop[/dim]"
        )

        # Morning prompt — what are you doing?
        if headless:
            self.current_activity = "background"
        else:
            self.current_activity = self.prompt_activity(context="morning")

        self.activity_start = time.time()

        console.print(
            f"\n▶ Tracking [bold]{self.current_activity}[/bold] "
            f"from [dim]{datetime.now().strftime('%H:%M')}[/dim]\n"
        )

        try:
            self._monitor_loop()
        except KeyboardInterrupt:
            console.print("\n[bold]⏹ Stopping daemon...[/bold]")
        finally:
            self.log_entry()
            self.stop_stream()

    def _wellness_tip(self) -> str:
        """Pick a random wellness reminder."""
        tips = [
            "💧 Grab a glass of water",
            "🚶 Stand up and stretch for 30 seconds",
            "👀 Look away from the screen — blink a few times",
            "💧 Drink some water, your brain needs it",
            "🚶 Quick walk to the kitchen and back",
            "🫁 Take 3 deep breaths — in through nose, out through mouth",
            "💧 Water break! Hydrate",
            "🚶 Roll your shoulders back, stand up a bit",
        ]
        return random.choice(tips)

    def _periodic_checkin(self):
        """30-minute wellness + task check-in."""
        tip = self._wellness_tip()

        console.print(f"\n[bold]⏰ Check-in[/bold] — {tip}")

        if self.current_activity:
            elapsed = time.time() - (self.activity_start or time.time())
            console.print(
                f"   Currently: [bold]{self.current_activity}[/bold] "
                f"({self._fmt(elapsed)})"
            )

        if self.headless:
            console.print("   [dim]Headless check-in: continuing active task.[/dim]")
            self.last_checkin = time.time()
            return

        response = click.prompt(
            "   Press [Enter] to continue, or type new task",
            default="",
        )

        if response.strip():
            # New activity — log the old one first
            self.log_entry()
            self.current_activity = response.strip()
            self.activity_start = time.time()
            console.print(f"▶ Now tracking [bold]{self.current_activity}[/bold]")
        else:
            console.print(f"▶ Continuing [bold]{self.current_activity}[/bold]")

        self.last_checkin = time.time()

    def _monitor_loop(self):
        """Continuously monitor audio for speech/silence."""
        self.last_checkin = time.time()
        stream = self.stream
        assert stream is not None

        while self.running:
            try:
                data = stream.read(CHUNK, exception_on_overflow=False)
            except Exception:
                time.sleep(0.1)
                continue

            energy = self.rms_energy(data)
            now = time.time()

            # ── periodic check-in every 30 min ────────────────
            if self.last_checkin is not None:
                since_checkin = now - self.last_checkin
                if since_checkin >= CHECKIN_INTERVAL_SEC:
                    self._periodic_checkin()

            # ── speech detected ───────────────────────────────
            if energy > SPEECH_ENERGY_MIN:
                self.last_speech_time = now
                self.silence_start = None

            # ── silence tracking ──────────────────────────────
            elif self.last_speech_time is not None:
                # We were speaking before, now silent
                if self.silence_start is None:
                    self.silence_start = now

                silence_duration = now - self.silence_start

                # Show countdown when approaching threshold
                if silence_duration > SILENCE_THRESHOLD_SEC - 60:
                    remaining = int(SILENCE_THRESHOLD_SEC - silence_duration)
                    if remaining % 10 == 0:  # print every ~10s to avoid spam
                        console.print(
                            f"[dim]   🔇 silent {self._fmt(silence_duration)} "
                            f"({remaining}s until prompt)[/dim]"
                        )

                # ── threshold reached → ask what's next ───────
                if silence_duration >= SILENCE_THRESHOLD_SEC:
                    console.print(
                        f"\n[bold]🔇 No speech for {self._fmt(silence_duration)}.[/bold]"
                    )

                    if self.headless:
                        console.print(
                            "   [dim]Headless: silence threshold reached, continuing...[/dim]"
                        )
                        self.silence_start = None
                        continue

                    # Log the previous activity
                    self.log_entry()

                    # Ask what's next
                    choice = click.prompt(
                        "What are you doing now?",
                        type=click.Choice(["continue", "switch", "quit"]),
                        default="switch",
                    )

                    if choice == "continue":
                        # Same activity, just reset silence timer
                        self.silence_start = None
                        console.print(
                            f"▶ Continuing [bold]{self.current_activity}[/bold]"
                        )

                    elif choice == "switch":
                        # New activity
                        self.current_activity = self.prompt_activity(
                            context="meeting_ended"
                        )
                        self.activity_start = time.time()
                        self.silence_start = None
                        console.print(
                            f"▶ Now tracking [bold]{self.current_activity}[/bold]"
                        )

                    elif choice == "quit":
                        self.running = False
                        return


def _check_mic():
    """Verify microphone is available."""
    audio = pyaudio.PyAudio()
    try:
        info = audio.get_default_input_device_info()
        console.print(f"[green]✓[/green] Microphone: [bold]{info['name']}[/bold]")
        return True
    except OSError:
        console.print(
            "[red]✗ No microphone found.[/red]\n"
            "   Make sure a mic is connected and permissions are granted."
        )
        # List available devices
        for i in range(audio.get_device_count()):
            dev = audio.get_device_info_by_index(i)
            if int(dev.get("maxInputChannels", 0)) > 0:
                console.print(f"   [dim]{i}:[/dim] {dev['name']}")
        return False
    finally:
        audio.terminate()


@click.group()
def daemon_cli():
    """timelog daemon — auto-track with speech detection."""
    pass


@daemon_cli.command()
@click.option(
    "--silence",
    "-s",
    default=300,
    show_default=True,
    help="Seconds of silence before prompting (default: 5 min).",
)
@click.option(
    "--energy",
    "-e",
    default=800,
    show_default=True,
    help="Minimum RMS energy to detect speech.",
)
@click.option(
    "--checkin",
    "-c",
    default=1800,
    show_default=True,
    help="Seconds between periodic check-ins (default: 30 min).",
)
@click.option(
    "--headless",
    is_flag=True,
    help="Run without initial prompt (for background daemons).",
)
def start(silence: int, energy: int, checkin: int, headless: bool):
    """Start the daemon. Monitors mic for speech to auto-track time."""
    global SILENCE_THRESHOLD_SEC, SPEECH_ENERGY_MIN, CHECKIN_INTERVAL_SEC

    if not _check_mic():
        sys.exit(1)

    SILENCE_THRESHOLD_SEC = silence
    SPEECH_ENERGY_MIN = energy
    CHECKIN_INTERVAL_SEC = checkin

    daemon = Daemon()
    daemon.run(headless=headless)


@daemon_cli.command()
def check():
    """Check if microphone is available."""
    _check_mic()


@daemon_cli.command()
def status():
    """Show current daemon state."""
    if not STATE_FILE.exists():
        console.print("[dim]No active session.[/dim]")
        return

    with open(STATE_FILE) as f:
        state = json.load(f)

    console.print(json.dumps(state, indent=2))


if __name__ == "__main__":
    daemon_cli()
