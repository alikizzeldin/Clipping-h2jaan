from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from clipper.config import ConfigError, load_settings, parse_start
from clipper.render import REPO_ROOT, shorts_window
from clipper.state import State

REPO = Path(__file__).resolve().parent.parent
MINIMAL = "profile: a\nprofiles:\n  a: {kick_category: x, label: X}\n"


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    monkeypatch.delenv("CLIPPER_PROFILE", raising=False)
    monkeypatch.delenv("CLIPPER_PRIVACY", raising=False)


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


def test_unconfirmed_lists_buffer_posts_until_their_outcome_is_known(tmp_path, make_clip, now):
    state = State(tmp_path / "s.json")
    state.add(make_clip(id="a"), "post_a", "A", now - timedelta(hours=3), via="buffer")
    state.add(make_clip(id="b"), "post_b", "B", now - timedelta(hours=1), via="buffer")
    state.add(make_clip(id="c"), "ytid", "C", now, via="youtube", link="https://youtu.be/ytid")
    state.add(make_clip(id="old"), "post_old", "Old", now - timedelta(days=5), via="buffer")
    since = now - timedelta(days=2)
    assert [clip_id for clip_id, _ in state.unconfirmed("buffer", since)] == ["a", "b"]
    state.update("a", status="sent", link="https://youtube.com/shorts/x")
    state.update("b", status="error", error="nope")
    assert state.unconfirmed("buffer", since) == []


def test_repo_config_loads_with_both_games_and_their_artwork():
    settings = load_settings(REPO / "config.yaml")
    assert set(settings.profiles) >= {"gta6", "valorant"}
    assert settings.profiles["gta6"].kick_category == "grand-theft-auto-vi"
    for name in ("gta6", "valorant"):
        theme = load_settings(REPO / "config.yaml", name).theme
        assert (REPO_ROOT / theme.background).exists(), name
    assert settings.start_time is None or settings.start_time.tzinfo is not None


def test_profile_and_privacy_can_come_from_environment(monkeypatch):
    monkeypatch.setenv("CLIPPER_PROFILE", "valorant")
    monkeypatch.setenv("CLIPPER_PRIVACY", "unlisted")
    settings = load_settings(REPO / "config.yaml")
    assert settings.profile == "valorant" and settings.publish.privacy == "unlisted"


@pytest.mark.parametrize("extra,match", [
    ("selection:\n  min_veiws: 3\n", "min_veiws"),
    ("publish:\n  via: tiktok\n", "buffer or youtube"),
    ("publish:\n  via: buffer\nrender:\n  layout: landscape\n", "vertical"),
    ("publish:\n  start_at: tomorrow\n", "start_at"),
    ("publish:\n  start_at: '2026-11-18T13:00:00'\n", "offset"),
    ("themes:\n  t: {highlight: pink}\n", "colours"),
])
def test_config_mistakes_are_reported(tmp_path, extra, match):
    bad = tmp_path / "config.yaml"
    bad.write_text(MINIMAL + extra)
    with pytest.raises(ConfigError, match=match):
        load_settings(bad)


def test_unknown_profile_and_theme_are_reported(tmp_path):
    bad = tmp_path / "config.yaml"
    bad.write_text("profile: missing\nprofiles:\n  a: {kick_category: x, label: X}\n")
    with pytest.raises(ConfigError, match="not defined"):
        load_settings(bad)
    bad.write_text("profile: a\nprofiles:\n  a: {kick_category: x, label: X, theme: nope}\n")
    with pytest.raises(ConfigError, match="theme 'nope'"):
        load_settings(bad)


def test_start_time_is_read_in_its_own_time_zone():
    assert parse_start("2026-11-18T13:00:00+02:00") == datetime(2026, 11, 18, 11, tzinfo=timezone.utc)
    assert parse_start("") is None


def test_the_whole_picture_fits_the_window_by_default():
    win = shorts_window(1920, 1080, 1.0)
    assert (win.scaled_w, win.scaled_h) == (win.w, win.h) == (1032, 580)  # scaled, not cropped
    assert (win.x, win.y, win.bottom) == (24, 420, 1000) and win.caption_y(1560) == 1280
    framed = shorts_window(1920, 1080, 1.0, top=404, inset=54)
    assert (framed.x, framed.y, framed.w, framed.h) == (54, 404, 972, 546)


def test_zoom_enlarges_and_crops_the_sides_only():
    win = shorts_window(1920, 1080, 1.35)
    assert (win.scaled_w, win.scaled_h) == (1394, 784)
    assert (win.w, win.h) == (1032, 784)  # full height kept, sides cropped to the window


def test_vertical_sources_are_fitted_by_height():
    win = shorts_window(1080, 1920, 1.0)
    assert win.scaled_h == 1000 and win.w == win.scaled_w == 562
    assert win.x == (1080 - 562) // 2
