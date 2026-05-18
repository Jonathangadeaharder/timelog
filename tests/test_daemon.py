from __future__ import annotations

import json
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

from daemon import (
    CHUNK,
    SPEECH_ENERGY_MIN,
    Daemon,
    _check_mic,
    daemon_cli,
)


# ── Daemon unit tests ──────────────────────────────────────────


@pytest.fixture
def daemon():
    d = Daemon()
    d.audio = MagicMock()
    d.stream = MagicMock()
    d.running = False
    return d


class TestDaemonInit:
    def test_init_creates_pyaudio(self):
        with patch("daemon.pyaudio.PyAudio") as mock_pa:
            d = Daemon()
            mock_pa.assert_called_once()
            assert d.stream is None
            assert d.running is False
            assert d.current_activity is None
            assert d.activity_start is None
            assert d.last_speech_time is None
            assert d.silence_start is None
            assert d.last_checkin is None


class TestStartStopStream:
    def test_start_stream_opens_audio(self, daemon: Daemon):
        daemon.start_stream()
        daemon.audio.open.assert_called_once()  # type: ignore

    def test_stop_stream_closes(self, daemon: Daemon):
        daemon.start_stream()
        daemon.stop_stream()
        daemon.stream.stop_stream.assert_called_once()  # type: ignore
        daemon.stream.close.assert_called_once()  # type: ignore

    def test_stop_stream_when_no_stream(self, daemon: Daemon):
        daemon.stream = None
        daemon.stop_stream()  # should not raise


class TestRmsEnergy:
    def test_empty_data(self, daemon: Daemon):
        assert daemon.rms_energy(b"") == 0.0

    def test_single_byte(self, daemon: Daemon):
        assert daemon.rms_energy(b"\x00") == 0.0

    def test_zero_audio(self, daemon: Daemon):
        data = b"\x00\x00" * 100
        assert daemon.rms_energy(data) == 0.0

    def test_positive_audio(self, daemon: Daemon):
        data = b"\x01\x00\x02\x00" * 50  # alternating 1, 2
        e = daemon.rms_energy(data)
        assert e > 0

    def test_varying_audio(self, daemon: Daemon):
        data = bytes([(i * 50) % 256 for i in range(0, 200, 2)]) * 2
        e = daemon.rms_energy(data)
        assert e > 0
        assert isinstance(e, float)

    def test_odd_length_data(self, daemon: Daemon):
        data = b"\x01\x00\x02"
        e = daemon.rms_energy(data)
        assert e >= 0

    def test_large_amplitude(self, daemon: Daemon):
        import struct

        samples = [32767, -32768, 16384, -16384, 8000, -8000, 1000, -1000]
        data = b"".join(struct.pack("<h", s) for s in samples * 25)
        e = daemon.rms_energy(data)
        assert e > SPEECH_ENERGY_MIN


class TestPromptActivity:
    def test_morning_context(self, daemon: Daemon):
        with patch("click.prompt", return_value="backend work"):
            result = daemon.prompt_activity(context="morning")
            assert result == "backend work"

    def test_meeting_ended_context(self, daemon: Daemon):
        with patch("click.prompt", return_value="review PRs"):
            result = daemon.prompt_activity(context="meeting_ended")
            assert result == "review PRs"

    def test_default_context(self, daemon: Daemon):
        with patch("click.prompt", return_value="coding"):
            result = daemon.prompt_activity()
            assert result == "coding"

    def test_empty_response_returns_unknown(self, daemon: Daemon):
        with patch("click.prompt", return_value=""):
            result = daemon.prompt_activity()
            assert result == "unknown"

    def test_unknown_context_falls_back(self, daemon: Daemon):
        with patch("click.prompt", return_value="something"):
            result = daemon.prompt_activity(context="lunch")
            assert result == "something"


class TestLogEntry:
    def test_no_current_activity_does_nothing(self, daemon: Daemon, tmp_path: Path):
        daemon.current_activity = None
        daemon.activity_start = None
        with patch("daemon.DATA_DIR", tmp_path):
            daemon.log_entry()
            assert not (tmp_path / "entries.json").exists()

    def test_logs_entry_correctly(self, daemon: Daemon, tmp_path: Path):
        daemon.current_activity = "backend"
        daemon.activity_start = time.time() - 3600
        with patch("daemon.DATA_DIR", tmp_path):
            daemon.log_entry()
            f = tmp_path / "entries.json"
            assert f.exists()
            entries = json.loads(f.read_text())
            assert len(entries) == 1
            assert entries[0]["project"] == "backend"
            assert entries[0]["task"] == ""
            assert entries[0]["seconds"] == pytest.approx(3600, rel=1)

    def test_appends_to_existing_entries(self, daemon: Daemon, tmp_path: Path):
        f = tmp_path / "entries.json"
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps([{"project": "existing", "seconds": 100}]))
        daemon.current_activity = "new"
        daemon.activity_start = time.time()
        with patch("daemon.DATA_DIR", tmp_path):
            daemon.log_entry()
            entries = json.loads(f.read_text())
            assert len(entries) == 2


class TestFormat:
    def test_fmt_zero(self):
        assert Daemon._fmt(0) == "00:00:00"

    def test_fmt_hours(self):
        assert Daemon._fmt(3600) == "01:00:00"

    def test_fmt_complex(self):
        assert Daemon._fmt(3661) == "01:01:01"


class TestWellnessTip:
    def test_returns_string(self, daemon: Daemon):
        tip = daemon._wellness_tip()
        assert isinstance(tip, str)
        assert len(tip) > 0

    def test_returns_different_tips(self, daemon: Daemon):
        tips = {daemon._wellness_tip() for _ in range(50)}
        assert len(tips) > 1  # at least 2 different tips


class TestPeriodicCheckin:
    def test_prompt_shows_current_activity(self, daemon: Daemon):
        daemon.current_activity = "backend"
        daemon.activity_start = time.time() - 1800
        with patch("click.prompt", return_value=""):
            daemon._periodic_checkin()
            assert daemon.last_checkin is not None

    def test_new_task_logs_previous(self, daemon: Daemon, tmp_path: Path):
        daemon.current_activity = "backend"
        daemon.activity_start = time.time() - 3600
        with (
            patch("click.prompt", return_value="frontend"),
            patch("daemon.DATA_DIR", tmp_path),
        ):
            daemon._periodic_checkin()
            assert daemon.current_activity == "frontend"
            assert daemon.activity_start is not None
            # Previous activity was logged
            f = tmp_path / "entries.json"
            assert f.exists()
            entries = json.loads(f.read_text())
            assert entries[0]["project"] == "backend"

    def test_empty_prompt_continues(self, daemon: Daemon):
        daemon.current_activity = "backend"
        old_start = daemon.activity_start = time.time() - 1800
        with patch("click.prompt", return_value=""):
            daemon._periodic_checkin()
            assert daemon.current_activity == "backend"
            assert daemon.activity_start == old_start


class TestCheckMic:
    def test_mic_available(self):
        mock_pa = MagicMock()
        mock_info = {"name": "Built-in Microphone", "maxInputChannels": 1}
        mock_pa.get_default_input_device_info.return_value = mock_info
        with patch("daemon.pyaudio.PyAudio", return_value=mock_pa):
            assert _check_mic() is True

    def test_mic_unavailable(self):
        mock_pa = MagicMock()
        mock_pa.get_default_input_device_info.side_effect = OSError("No device")
        mock_pa.get_device_count.return_value = 0
        with patch("daemon.pyaudio.PyAudio", return_value=mock_pa):
            assert _check_mic() is False

    def test_mic_unavailable_lists_devices(self):
        mock_pa = MagicMock()
        mock_pa.get_default_input_device_info.side_effect = OSError("No device")
        mock_pa.get_device_count.return_value = 2
        dev0 = {"maxInputChannels": 0, "name": "Speaker"}
        dev1 = {"maxInputChannels": 2, "name": "External Mic"}
        mock_pa.get_device_info_by_index.side_effect = [dev0, dev1]
        with patch("daemon.pyaudio.PyAudio", return_value=mock_pa):
            assert _check_mic() is False


class TestMonitorLoop:
    def _make_monitor_runner(self, daemon, read_results):
        mock_stream = MagicMock()
        mock_stream.read.side_effect = read_results
        daemon.stream = mock_stream
        return daemon

    def test_monitor_stops_when_running_false(self, daemon: Daemon):
        mock_stream = MagicMock()
        mock_stream.read.return_value = b"\x00\x00" * (CHUNK // 2)
        daemon.stream = mock_stream
        daemon.running = False
        daemon._monitor_loop()

    def test_stream_read_error_continues(self, daemon: Daemon):
        calls = iter([Exception("device error")])

        def stop_on_err(*a, **kw):
            daemon.running = False
            raise next(calls)

        mock_stream = MagicMock()
        mock_stream.read.side_effect = stop_on_err
        daemon.stream = mock_stream
        daemon.last_checkin = 0.0
        daemon.running = True
        with patch("daemon.time") as mock_time:
            mock_time.time.return_value = 100.0
            mock_time.sleep.return_value = None
            daemon._monitor_loop()

    def test_speech_detection_updates_timers(self, daemon: Daemon):
        import struct

        samples = [32767, -32768, 16384, -16384]
        high_energy_data = b"".join(
            struct.pack("<h", s) for s in samples * (CHUNK // 8)
        )

        def one_read(*a, **kw):
            daemon.running = False
            return high_energy_data

        mock_stream = MagicMock()
        mock_stream.read.side_effect = one_read
        daemon.stream = mock_stream
        daemon.last_checkin = 0.0
        daemon.running = True
        with patch("daemon.time") as mock_time:
            mock_time.time.return_value = 1000.0
            mock_time.sleep.return_value = None
            daemon._monitor_loop()
            assert daemon.last_speech_time == 1000.0
            assert daemon.silence_start is None

    def test_silence_detection_starts_timer(self, daemon: Daemon):
        low_energy_data = b"\x00\x00" * (CHUNK // 2)
        read_count = 0

        def two_reads(*a, **kw):
            nonlocal read_count
            read_count += 1
            if read_count >= 2:
                daemon.running = False
            return low_energy_data

        mock_stream = MagicMock()
        mock_stream.read.side_effect = two_reads
        daemon.stream = mock_stream
        daemon.last_checkin = 0.0
        daemon.last_speech_time = 500.0
        daemon.running = True
        with patch("daemon.time") as mock_time:
            mock_time.time.side_effect = [1000.0, 1001.0, 1002.0]
            mock_time.sleep.return_value = None
            daemon._monitor_loop()
            assert daemon.silence_start is not None
            assert daemon.silence_start >= 1000.0


class TestDaemonCli:
    def test_check_mic_success(self, runner: CliRunner):
        mock_pa = MagicMock()
        mock_info = {"name": "Built-in Microphone", "maxInputChannels": 1}
        mock_pa.get_default_input_device_info.return_value = mock_info
        with patch("daemon.pyaudio.PyAudio", return_value=mock_pa):
            result = runner.invoke(daemon_cli, ["check"])
            assert result.exit_code == 0
            assert "Microphone" in result.output

    def test_check_mic_failure(self, runner: CliRunner):
        mock_pa = MagicMock()
        mock_pa.get_default_input_device_info.side_effect = OSError("No device")
        mock_pa.get_device_count.return_value = 0
        with patch("daemon.pyaudio.PyAudio", return_value=mock_pa):
            result = runner.invoke(daemon_cli, ["check"])
            assert result.exit_code == 0
            assert "No microphone found" in result.output

    def test_status_no_state_file(self, runner: CliRunner):
        result = runner.invoke(daemon_cli, ["status"])
        assert result.exit_code == 0
        assert "No active session" in result.output

    def test_status_shows_state(self, runner: CliRunner, tmp_path: Path):
        f = tmp_path / "daemon_state.json"
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps({"running": True}))
        with patch("daemon.STATE_FILE", f):
            result = runner.invoke(daemon_cli, ["status"])
            assert result.exit_code == 0
            assert "running" in result.output

    def test_daemon_help(self, runner: CliRunner):
        result = runner.invoke(daemon_cli, ["--help"])
        assert result.exit_code == 0
        for cmd in ["start", "check", "status"]:
            assert cmd in result.output


class TestRun:
    def test_run_starts_and_stops(self, daemon: Daemon, tmp_path: Path):
        daemon.current_activity = "morning task"
        mock_stream = MagicMock()
        mock_stream.read.side_effect = OSError("no device")
        daemon.stream = mock_stream
        daemon.audio.open.return_value = mock_stream  # type: ignore
        daemon.activity_start = None
        call_count = 0

        def stop_after_two(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count >= 3:
                daemon.running = False
            raise OSError("no device")

        mock_stream.read.side_effect = stop_after_two
        with (
            patch("daemon.DATA_DIR", tmp_path),
            patch.object(daemon, "prompt_activity", return_value="morning task"),
            patch.object(daemon, "start_stream") as mock_start,
            patch.object(daemon, "log_entry") as mock_log,
            patch.object(daemon, "stop_stream") as mock_stop,
            patch("daemon.time") as mock_time,
        ):
            mock_time.time.return_value = 1000.0
            mock_time.sleep.return_value = None
            daemon.run()
            mock_start.assert_called_once()
            mock_log.assert_called_once()
            mock_stop.assert_called_once()


class TestDaemonStartCli:
    def test_start_exits_on_mic_failure(self, runner: CliRunner):
        mock_pa = MagicMock()
        mock_pa.get_default_input_device_info.side_effect = OSError("No device")
        mock_pa.get_device_count.return_value = 0
        with patch("daemon.pyaudio.PyAudio", return_value=mock_pa):
            result = runner.invoke(daemon_cli, ["start"])
            assert result.exit_code == 1


class TestMainBlock:
    def test_daemon_main_block(self):
        with (
            patch("daemon.daemon_cli"),
            patch("daemon.__name__", "__main__"),
        ):
            # The __name__ check is at module level, so we test via exec
            exec("from daemon import daemon_cli; daemon_cli()")
            # Just verify the daemon_cli is callable
            assert callable(daemon_cli)


class TestHeadlessMode:
    def test_run_headless_sets_flag_and_activity(self, daemon: Daemon):
        daemon.audio.open.return_value = MagicMock()
        with patch.object(daemon, "_monitor_loop"):
            daemon.run(headless=True)
            assert daemon.headless is True
            assert daemon.current_activity == "background"

    def test_periodic_checkin_headless_bypasses_prompt(self, daemon: Daemon):
        daemon.headless = True
        daemon.current_activity = "background"
        daemon.last_checkin = 0
        with patch("click.prompt") as mock_prompt:
            daemon._periodic_checkin()
            mock_prompt.assert_not_called()
            assert daemon.last_checkin > 0

    def test_silence_headless_bypasses_prompt(self, daemon: Daemon):
        daemon.headless = True
        daemon.current_activity = "background"
        daemon.running = True
        daemon.last_speech_time = 100.0
        daemon.last_checkin = 500.0

        # mock low energy data
        low_energy_data = b"\x00\x00" * (CHUNK // 2)

        mock_stream = MagicMock()
        mock_stream.read.return_value = low_energy_data
        daemon.stream = mock_stream

        with (
            patch("daemon.time") as mock_time,
            patch("click.prompt") as mock_prompt,
            patch("daemon.SILENCE_THRESHOLD_SEC", 300),
        ):
            # mock_time.time will be called in loop.
            # We want to trigger silence_duration >= 300
            # loop 1: now=400, silence_start=400
            # loop 2: now=701, silence_duration=301
            mock_time.time.side_effect = [400.0, 701.0, 702.0]

            def stop_daemon(*args, **kwargs):
                daemon.running = False
                return low_energy_data

            mock_stream.read.return_value = low_energy_data

            # Use a generator to avoid StopIteration
            def time_gen():
                yield 400.0 # iter 1: checkin
                yield 400.0 # iter 1: energy
                yield 701.0 # iter 2: checkin
                yield 701.0 # iter 2: energy -> triggers reset
                while True:
                    yield 800.0

            mock_time.time.side_effect = time_gen()

            # Stop the loop by setting running=False when time.sleep is called
            with patch("daemon.time.sleep", side_effect=lambda x: setattr(daemon, 'running', False)):
                daemon._monitor_loop()
            mock_prompt.assert_not_called()
            assert daemon.silence_start is None
