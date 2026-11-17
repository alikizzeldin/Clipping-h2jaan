from datetime import timedelta
from pathlib import Path

import pytest

from clipper.config import ConfigError, load_settings
from clipper.render import drawable, shorts_geometry
from clipper.state import State

REPO = Path(__file__).resolve().parent.parent


def test_state_round_trip_and_daily_count(tmp_path, make_clip, now):
    path = tmp_path / "state" / "published.json"
    state = State(path)
    assert not state.has("clip_1")
    state.add(make_clip(), "yt123", "A title", now - timedelta(hours=2))
    state.add(make_clip(id="clip_old"), "yt000", "Old", now - timedelta(hours=30))
    state.save()
    again = State(path)
    assert again.has("clip_1") and again.has("clip_old")
    assert again.published["clip_1"]["video_id"] == "yt123"
    assert again.uploads_last_day(now) == 1


def test_repo_config_loads_and_has_both_games(monkeypatch):
    monkeypatch.delenv("CLIPPER_PROFILE", raising=False)
    monkeypatch.delenv("CLIPPER_PRIVACY", raising=False)
    settings = load_settings(REPO / "config.yaml")
    assert settings.profile == "valorant"
    assert settings.profiles["gta6"].kick_category == "grand-theft-auto-vi"
    assert settings.publish.privacy == "private"
    assert load_settings(REPO / "config.yaml", "gta6").active.label == "GTA 6"


def test_profile_and_privacy_can_come_from_environment(monkeypatch):
    monkeypatch.setenv("CLIPPER_PROFILE", "gta6")
    monkeypatch.setenv("CLIPPER_PRIVACY", "public")
    settings = load_settings(REPO / "config.yaml")
    assert settings.profile == "gta6" and settings.publish.privacy == "public"


def test_typos_in_config_are_reported(tmp_path, monkeypatch):
    monkeypatch.delenv("CLIPPER_PROFILE", raising=False)
    bad = tmp_path / "config.yaml"
    bad.write_text("profile: a\nprofiles:\n  a: {kick_category: x, label: X}\nselection:\n  min_veiws: 3\n")
    with pytest.raises(ConfigError, match="min_veiws"):
        load_settings(bad)
    bad.write_text("profile: missing\nprofiles:\n  a: {kick_category: x, label: X}\n")
    with pytest.raises(ConfigError, match="not defined"):
        load_settings(bad)


def test_shorts_geometry():
    assert shorts_geometry(1920, 1080, 1.35) == (1458, 820, 1080, 820)
    assert shorts_geometry(1920, 1080, 1.0) == (1080, 608, 1080, 608)
    assert shorts_geometry(1080, 1920, 1.35) == (1080, 1920, 1080, 1920)  # already vertical


def test_drawable_only_accepts_latin_text():
    assert drawable("Waylay Ace 5k — clutch!")
    assert not drawable("汗耐久") and not drawable("نذاله") and not drawable("")
