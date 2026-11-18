from datetime import datetime, timedelta, timezone

from clipper.hooks import GENERAL, LAUNCH_DAYS, LAUNCH_HOURS, pick_hook
from clipper.models import Clip

LAUNCH = datetime(2026, 11, 18, 11, 0, tzinfo=timezone.utc)


def clip(at, clip_id="c1", name="xQc"):
    return Clip(id=clip_id, source="kick", title="", channel_slug=name.lower(), channel_name=name,
                category_slug="gta", category_name="GTA 6", views=10, likes=0, duration=50.0,
                created_at=at, media_url="", started_at=at)


def test_the_unlock_moment_gets_its_own_hook():
    assert pick_hook(clip(LAUNCH - timedelta(seconds=35)), LAUNCH).key == "unlock"  # the countdown runs into it
    assert pick_hook(clip(LAUNCH + timedelta(seconds=55)), LAUNCH).key == "unlock"
    assert pick_hook(clip(LAUNCH + timedelta(minutes=6)), LAUNCH).key != "unlock"
    assert pick_hook(clip(LAUNCH - timedelta(minutes=5)), LAUNCH).key != "unlock"
    hook = pick_hook(clip(LAUNCH + timedelta(minutes=1)), LAUNCH)
    assert hook.key == "unlock"
    assert hook.fill("xQc", "GTA 6") == ("The moment GTA 6 unlocked for xQc 🚨", "لحظة نزول GTA 6 عند xQc 🚨")


def test_launch_hours_then_launch_days_then_general():
    launch_keys = {h.key for h in LAUNCH_HOURS}
    assert pick_hook(clip(LAUNCH + timedelta(minutes=40)), LAUNCH).key in launch_keys
    assert pick_hook(clip(LAUNCH + timedelta(days=1)), LAUNCH).key in {h.key for h in LAUNCH_DAYS}
    assert pick_hook(clip(LAUNCH + timedelta(days=9)), LAUNCH).key in {h.key for h in GENERAL}
    assert pick_hook(clip(LAUNCH + timedelta(minutes=40)), None).key in {h.key for h in GENERAL}


def test_what_is_said_can_choose_the_hook():
    later = clip(LAUNCH + timedelta(days=9))
    assert pick_hook(later, LAUNCH, "oh no the cops are here").key == "cops"
    assert pick_hook(later, LAUNCH, "bro I just got killed").key == "wasted"
    assert pick_hook(later, LAUNCH, "copper wire, I'm dead laughing").key in {h.key for h in GENERAL}


def test_recent_hooks_are_avoided_and_the_pick_is_stable():
    at = LAUNCH + timedelta(minutes=40)
    first = pick_hook(clip(at), LAUNCH)
    assert pick_hook(clip(at), LAUNCH) == first
    others = {pick_hook(clip(at), LAUNCH, avoid=[first.key]).key}
    assert first.key not in others
    every = [h.key for h in LAUNCH_HOURS]
    assert pick_hook(clip(at), LAUNCH, avoid=every).key in {h.key for h in GENERAL}


def test_the_arabic_lines_name_the_streamer_and_game():
    for hook in [*LAUNCH_HOURS, *LAUNCH_DAYS, *GENERAL]:
        english, arabic = hook.fill("xQc", "GTA 6")
        assert "xQc" in english and "GTA 6" in english
        assert "xQc" in arabic and "GTA 6" in arabic
        assert any("؀" <= ch <= "ۿ" for ch in arabic)
