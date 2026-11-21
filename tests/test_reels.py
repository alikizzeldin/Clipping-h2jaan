import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from clipper import reels
from clipper.config import Publish
from clipper.models import Clip
from clipper.quota import plan
from clipper.state import State

ROOT = Path(__file__).resolve().parent.parent


def test_words_follow_the_character_timings():
    alignment = {
        "characters": list("Hi you."),
        "character_start_times_seconds": [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
        "character_end_times_seconds": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
    }
    assert reels.words(alignment) == [
        {"text": "Hi", "start": 0.0, "end": 0.2},
        {"text": "you.", "start": 0.3, "end": 0.7},
    ]


def test_every_saved_episode_plan_is_complete():
    folders = sorted((ROOT / "reels" / "episodes").iterdir())
    assert folders
    for folder in folders:
        p = reels.load_plan(folder)
        assert (folder / "voice.mp3").exists() and (folder / "alignment.json").exists()
        shots = set(p.get("footage", {})) | set(p.get("stills", {}))
        for scene in p["reel"]["scenes"]:
            if scene.get("broll"):
                assert scene["broll"]["src"] in shots, (folder.name, scene["broll"]["src"])
        assert p["rating"]["score"] >= 7 and len(p["sources"]) >= 2


def test_metadata_is_english_then_arabic_and_fits():
    p = reels.load_plan(ROOT / "reels" / "episodes" / "002-chapter-1-money")
    meta = reels.metadata(p, ["GTA6"])
    assert meta["title"].startswith("Your GTA 6 money") and " | " in meta["title"]
    assert len(meta["title"]) <= 100
    assert "kick.com/affiwillcarry" in meta["description"]
    assert len(meta["caption"]) <= 2200
    assert reels.reel_clip(p, 31).id == "reel_002"


def _clip(cid, channel="maherco"):
    return Clip(id=cid, source="kick", title="", channel_slug=channel, channel_name=channel, category_slug="gta",
                category_name="GTA", views=10, likes=0, duration=30, created_at=datetime.now(timezone.utc), media_url="")


def test_reels_do_not_use_up_the_clip_slots(tmp_path):
    state = State(tmp_path / "published.json")
    now = datetime.now(timezone.utc)
    state.add(_clip("c1"), "p1", "t", when=now - timedelta(hours=1), via="buffer")
    reel = reels.reel_clip({"episode": 3, "title": {"en": "x"}}, 30)
    state.add(reel, "p2", "t", when=now, via="buffer", extra={"kind": "reel"})
    state.update(reel.id, instagram="i1", instagram_at=now.isoformat())
    assert [ch for _, ch in state.recent(now - timedelta(hours=24))] == ["maherco"]
    assert state.instagram_since(now - timedelta(hours=24)) == 0


def test_without_reserved_slots_featured_streamers_still_compete():
    pub = Publish(max_per_day=2, featured_per_day=0, min_gap_hours=6)
    now = datetime.now(timezone.utc)
    chosen, why = plan([_clip("a", "xqc"), _clip("b", "someone")], {"xqc", "maherco"}, pub, [], now)
    assert [c.id for c in chosen] == ["a", "b"] and why == "an open slot"


def test_sample_reel_json_is_valid():
    data = json.loads((ROOT / "reels" / "public" / "sample" / "reel.json").read_text())
    assert data["scenes"][0]["type"] == "hook"
