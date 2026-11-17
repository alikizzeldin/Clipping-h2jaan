from datetime import timedelta

from clipper.config import Profile, Selection
from clipper.ranking import rank, reject_reason, score

PROFILE = Profile(kick_category="valorant", label="Valorant", min_views=50)
never = lambda clip_id: False  # noqa: E731


def reason(clip, now, sel=None, seen=never):
    return reject_reason(clip, PROFILE, sel or Selection(), seen, now)


def test_good_clip_qualifies(make_clip, now):
    assert reason(make_clip(), now) is None


def test_each_rule_rejects(make_clip, now):
    assert reason(make_clip(), now, seen=lambda i: True) == "already published"
    assert "other category" in reason(make_clip(category_slug="just-chatting"), now)
    assert reason(make_clip(is_mature=True), now) == "marked mature"
    assert "too short" in reason(make_clip(duration=3), now)
    assert "too long" in reason(make_clip(duration=180), now)
    assert "too few views" in reason(make_clip(views=10), now)
    assert "too old" in reason(make_clip(created_at=now - timedelta(hours=80)), now)
    assert reason(make_clip(), now, Selection(block_channels=["Streamer"])) == "channel blocked"
    assert "allow list" in reason(make_clip(), now, Selection(allow_channels=["other"]))


def test_only_clips_made_after_the_start_time_qualify(make_clip, now):
    start = now - timedelta(hours=2)
    before = make_clip(created_at=now - timedelta(hours=3))
    after = make_clip(created_at=now - timedelta(hours=1))
    assert reject_reason(before, PROFILE, Selection(), never, now, start) == "made before the start time"
    assert reject_reason(after, PROFILE, Selection(), never, now, start) is None
    chosen, _ = rank([before, make_clip(id="late", created_at=now)], PROFILE, Selection(), never, now, start)
    assert [c.id for c in chosen] == ["late"]


def test_language_filter(make_clip, now):
    sel = Selection(languages=["English"])
    assert reason(make_clip(language="English (India)"), now, sel) is None
    assert reason(make_clip(language="Turkish"), now, sel) == "language Turkish"
    assert reason(make_clip(language=""), now, sel) is None
    strict = Selection(languages=["English"], drop_unknown_language=True)
    assert reason(make_clip(language=""), now, strict) == "language unknown"


def test_fresh_momentum_beats_stale_views(make_clip, now):
    fresh = make_clip(id="fresh", views=400, created_at=now - timedelta(hours=1))
    stale = make_clip(id="stale", views=600, created_at=now - timedelta(hours=30))
    assert score(fresh, now) > score(stale, now)


def test_rank_orders_dedupes_and_caps_per_channel(make_clip, now):
    clips = [
        make_clip(id="a", views=900),
        make_clip(id="a", views=950),  # same clip seen in two feeds
        make_clip(id="b", views=800),  # same channel as a
        make_clip(id="c", views=700, channel_slug="other"),
        make_clip(id="d", views=5),
    ]
    chosen, rejected = rank(clips, PROFILE, Selection(max_per_channel=1), never, now)
    assert [c.id for c in chosen] == ["a", "c"]
    assert chosen[0].views == 950
    reasons = {c.id: why for c, why in rejected}
    assert reasons["b"] == "channel cap for this run"
    assert "too few views" in reasons["d"]
