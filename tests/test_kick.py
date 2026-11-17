import json
from datetime import timezone
from pathlib import Path

from clipper.kick import _parse_time, parse_clip

RAW = json.loads((Path(__file__).parent / "kick_clip.json").read_text(encoding="utf-8"))


def test_parses_a_real_feed_entry():
    clip = parse_clip(RAW)
    assert clip.id == "clip_01M7GYWNB7E1QQK4ZWD4NE2Y1K"
    assert clip.channel_slug == "keznit1"
    assert clip.category_slug == "valorant"
    assert clip.views == 71 and clip.duration == 27
    assert clip.media_url.endswith("playlist.m3u8")
    assert clip.created_at.tzinfo == timezone.utc
    assert clip.url == "https://kick.com/keznit1/clips/clip_01M7GYWNB7E1QQK4ZWD4NE2Y1K"
    assert clip.clipper_name == "pollopobre"


def test_unusable_entries_are_skipped():
    assert parse_clip({}) is None
    assert parse_clip({**RAW, "channel": None}) is None
    assert parse_clip({**RAW, "video_url": "", "clip_url": ""}) is None
    assert parse_clip({**RAW, "privacy": "private"}) is None
    assert parse_clip({**RAW, "created_at": "not a date"}) is None


def test_time_parsing_handles_kick_formats():
    assert _parse_time("2026-11-16T01:18:25.441841Z").microsecond == 441841
    assert _parse_time("2026-11-16T01:18:25.4418412345Z").second == 25
    assert _parse_time("2026-11-16T01:18:25Z").hour == 1
    assert _parse_time("") is None
