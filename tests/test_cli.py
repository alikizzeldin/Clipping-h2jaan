from datetime import datetime, timedelta, timezone

from clipper import cli

CONFIG = """profile: a
profiles:
  a: {{kick_category: x, label: X}}
captions: {{enabled: false}}
state_path: {state}
publish:
  via: buffer
  buffer_channel_id: chan
  start_at: "{start}"
"""


def write_config(tmp_path, start):
    path = tmp_path / "config.yaml"
    path.write_text(CONFIG.format(start=start.isoformat(), state=tmp_path / "state.json"))
    return str(path)


def test_nothing_is_published_before_the_start_time(tmp_path, monkeypatch, capsys):
    monkeypatch.delenv("CLIPPER_PROFILE", raising=False)
    monkeypatch.setenv("BUFFER_API_KEY", "key")
    monkeypatch.setattr(cli, "KickClient", lambda: (_ for _ in ()).throw(AssertionError("no network")))
    start = datetime.now(timezone.utc) + timedelta(hours=5)
    assert cli.main(["--config", write_config(tmp_path, start), "run"]) == 0
    assert "Not started yet" in capsys.readouterr().out


def test_a_missing_buffer_key_is_a_setup_error(tmp_path, monkeypatch):
    monkeypatch.delenv("CLIPPER_PROFILE", raising=False)
    monkeypatch.delenv("BUFFER_API_KEY", raising=False)
    monkeypatch.setattr(cli, "KickClient", lambda: (_ for _ in ()).throw(AssertionError("no network")))
    start = datetime.now(timezone.utc) - timedelta(hours=1)
    assert cli.main(["--config", write_config(tmp_path, start), "run"]) == 2
