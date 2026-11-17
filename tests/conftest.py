from datetime import datetime, timedelta, timezone

import pytest

from clipper.models import Clip

NOW = datetime(2026, 11, 17, 12, 0, tzinfo=timezone.utc)


@pytest.fixture
def now():
    return NOW


@pytest.fixture
def make_clip():
    def _make(**over):
        base = dict(
            id="clip_1", source="kick", title="Insane 1v5 clutch", channel_slug="streamer",
            channel_name="Streamer", category_slug="valorant", category_name="VALORANT",
            views=500, likes=3, duration=30.0, created_at=NOW - timedelta(hours=4),
            media_url="https://clips.kick.com/clips/aa/clip_1/playlist.m3u8",
        )
        base.update(over)
        return Clip(**base)

    return _make
