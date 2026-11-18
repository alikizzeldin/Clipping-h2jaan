"""The whole run, with Kick, the renderer and the publisher replaced by stand-ins."""

import json
from datetime import datetime, timedelta, timezone

import pytest

from clipper import cli
from clipper.models import Clip, LiveChannel
from clipper.publishers import Published, PublishError

CONFIG = """profile: game
profiles:
  game: {{kick_category: the-game, label: The Game, min_views: 50}}
selection: {{featured_channels: [sxb], featured_min_views: 5, require_gameplay: {gameplay}, max_duration: 120, max_per_channel: {per_channel}}}
captions: {{enabled: false}}
publish: {{via: buffer, buffer_channel_id: chan, max_per_run: {per_run}, max_per_day: 3, featured_per_day: 2, min_gap_hours: {gap}, privacy: public}}
state_path: {root}/state/published.json
control_dir: {root}/control
work_dir: {root}/work
out_dir: {root}/out
"""


def clip(clip_id, channel, views, stream="s1", minute=0, **over):
    made = datetime.now(timezone.utc) - timedelta(hours=2)
    base = dict(id=clip_id, source="kick", title=f"Title {clip_id}", channel_slug=channel, channel_name=channel.upper(),
                category_slug="the-game", category_name="The Game", views=views, likes=0, duration=30.0,
                created_at=made, media_url=f"https://clips/{clip_id}.m3u8", livestream_id=stream)
    base.update(over)
    return Clip(**base), made + timedelta(minutes=minute)


class FakeKick:
    """Serves a fixed set of clips; every clip's moment is looked up like on Kick."""

    def __init__(self, entries):
        self.entries = dict(entries)  # clip -> start time

    def category_clips(self, slug, sort="view", window="day"):
        return list(self.entries)

    def channel_clips(self, slug, sort="view", window="day"):
        return [c for c in self.entries if c.channel_slug == slug]

    def live_channels(self, category, limit=30):
        return [LiveChannel("big", "BIG", "English", 9000)]

    def followers(self, slug):
        return 1000

    def clip_moment(self, clip_id):
        found = next(c for c in self.entries if c.id == clip_id)
        return found.livestream_id, self.entries[found]


class FakeVision:
    """Everything is gameplay; scenes are told apart by the clip's file name."""

    def __init__(self, scenes=None):
        self.scenes = scenes or {}

    def is_gameplay(self, path):
        return True, 0.99

    def fingerprint(self, path):
        return self.scenes.get(path.stem, "")


class FakePublisher:
    def __init__(self, fail=False):
        self.sent, self.fail = [], fail

    def prepare(self, state, report):
        pass

    def publish(self, video, clip, meta):
        if self.fail:
            raise PublishError("Buffer said no")
        self.sent.append(clip.id)
        return Published(f"post_{clip.id}", "", "buffer")


@pytest.fixture
def world(tmp_path, monkeypatch):
    for name in ("CLIPPER_PROFILE", "CLIPPER_PRIVACY", "GITHUB_STEP_SUMMARY", "DISCORD_WEBHOOK_URL", "TELEGRAM_BOT_TOKEN"):
        monkeypatch.delenv(name, raising=False)

    def setup(entries, gameplay="false", per_run=1, gap=0, publisher=None, judge=None, per_channel=1):
        config = tmp_path / "config.yaml"
        config.write_text(CONFIG.format(root=tmp_path, gameplay=gameplay, per_run=per_run, gap=gap, per_channel=per_channel))
        publisher = publisher or FakePublisher()
        monkeypatch.setattr(cli, "KickClient", lambda: FakeKick(entries))
        monkeypatch.setattr(cli, "make_publisher", lambda pub: publisher)
        monkeypatch.setattr(cli.dl, "download", lambda url, work, name: _touch(tmp_path / "work" / f"{name}.ts"))
        monkeypatch.setattr(cli.rnd, "render", lambda raw, dest, *a, **k: _touch(dest))
        monkeypatch.setattr(cli, "GameplayJudge", lambda: judge or FakeVision())
        return publisher, lambda *args: cli.main(["--config", str(config), "run", *args])

    def read(name):
        return json.loads((tmp_path / "state" / name).read_text())

    return setup, read, tmp_path


def _touch(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"video")
    return path


def test_a_featured_clip_is_published_and_everything_is_recorded(world):
    setup, read, _ = world
    publisher, run = setup([clip("fav", "sxb", 40), clip("top", "big", 900, stream="s2")])
    assert run() == 0
    assert publisher.sent == ["fav"]  # the featured channel's slot comes first, despite fewer views
    saved = read("published.json")["published"]["fav"]
    assert saved["video_id"] == "post_fav" and saved["via"] == "buffer" and saved["channel"] == "sxb"
    assert saved["livestream_id"] == "s1" and "started_at" in saved and saved["origin"] == "viewer"
    activity = read("activity.json")
    assert activity[0]["type"] == "published" and "SXB" in activity[0]["text"] and " | " in activity[0]["text"]
    assert saved["hook"] and saved["title"].startswith("SXB") or "SXB" in saved["title"]  # English, then Arabic


def test_posts_are_spaced_and_other_channels_get_their_slot(world):
    setup, read, _ = world
    entries = [clip("fav1", "sxb", 40), clip("fav2", "sxb", 30, minute=30), clip("top", "big", 900, stream="s2")]
    publisher, run = setup(entries, gap=7)
    assert run() == 0 and publisher.sent == ["fav1"]
    assert run() == 0 and publisher.sent == ["fav1"]  # too soon after the last post
    publisher, run = setup(entries, gap=0, publisher=publisher)
    for _ in range(3):
        assert run() == 0
    assert publisher.sent == ["fav1", "fav2", "top"]  # two featured, then the open slot
    assert run() == 0 and len(publisher.sent) == 3  # the day is full


def test_a_second_clip_of_the_same_moment_is_skipped_for_good(world):
    setup, read, _ = world
    entries = [clip("first", "sxb", 80), clip("again", "sxb", 60, minute=0), clip("later", "sxb", 20, minute=40)]
    publisher, run = setup(entries, per_run=3, per_channel=3)
    assert run() == 0
    assert publisher.sent == ["first", "later"]  # "again" overlaps "first" in the same broadcast
    skipped = read("published.json")["skipped"]
    assert skipped["again"]["reason"] == "the same moment was already posted"
    assert any(a["type"] == "skipped" and "same moment" in a["text"] for a in read("activity.json"))


def test_clips_without_gameplay_are_skipped(world):
    setup, read, _ = world

    class Judge(FakeVision):
        def is_gameplay(self, path):
            return ("talk" not in path.name), 0.12 if "talk" in path.name else 0.97

    # one clip per channel per run: when the best one is dropped, the next still gets its turn
    publisher, run = setup([clip("talk", "sxb", 90), clip("play", "sxb", 40, minute=30)], gameplay="true", judge=Judge())
    assert run() == 0 and publisher.sent == ["play"]
    assert "no game on screen" in read("published.json")["skipped"]["talk"]["reason"]


def test_a_dry_run_renders_but_records_nothing(world):
    setup, _, root = world
    publisher, run = setup([clip("fav", "sxb", 40)])
    assert run("--dry-run") == 0
    assert publisher.sent == [] and not (root / "state").exists()
    assert (root / "out" / "fav.mp4").exists()


def test_a_publishing_failure_is_reported_and_logged(world):
    setup, read, _ = world
    _, run = setup([clip("fav", "sxb", 40)], publisher=FakePublisher(fail=True))
    assert run() == 1
    assert read("activity.json")[0]["type"] == "error" and "Buffer said no" in read("activity.json")[0]["text"]
    assert "fav" not in read("published.json")["published"]


def test_the_pause_switch_stops_publishing(world):
    setup, _, root = world
    publisher, run = setup([clip("fav", "sxb", 40)])
    (root / "control").mkdir()
    (root / "control" / "settings.json").write_text('{"paused": true}')
    assert run() == 0 and publisher.sent == []


def test_a_launch_burst_posts_many_now_without_using_up_the_daily_plan(world, monkeypatch):
    setup, read, _ = world
    entries = [clip("a", "big", 900, stream="s2"), clip("b", "other", 800, stream="s3"),
               clip("c", "third", 700, stream="s4"), clip("d", "big", 600, stream="s2", minute=30),
               clip("tiny", "fourth", 8, stream="s5")]
    publisher, run = setup(entries, gap=7)
    asked = {}
    monkeypatch.setattr(cli, "find_highlights", lambda kick, channels, *a, **k: asked.setdefault("channels", channels) and [])
    assert run("--burst", "8") == 0
    # One clip per channel, at once, ignoring the daily limit and the spacing;
    # the burst's lower bar lets a small channel's clip in too.
    assert publisher.sent == ["a", "b", "c", "tiny"]
    assert asked["channels"] == ["big"]  # highlights are cut from the biggest live channels
    published = read("published.json")["published"]
    assert all(entry["burst"] for entry in published.values())
    # The burst did not use up the day: the regular plan still posts afterwards.
    assert run() == 0
    assert publisher.sent[-1] == "d"
    assert "burst" not in read("published.json")["published"]["d"]


def _scene(*values):
    """A fingerprint whose frames all point along the given 512-number directions."""
    import base64

    import numpy as np

    frames = []
    for value in values:
        vec = np.zeros(512, dtype=np.float32)
        vec[value] = 1.0
        frames.append(vec)
    return base64.b64encode(np.round(np.stack(frames) * 127).astype(np.int8).tobytes()).decode()


def test_own_cuts_come_first_and_a_scene_already_posted_is_skipped(world, monkeypatch):
    setup, read, _ = world
    viewer = clip("viewer", "big", 900, stream="s2")
    own_a = clip("auto_1_a", "big", 60, stream="s3", origin="auto")
    own_b = clip("auto_2_b", "other", 50, stream="s4", origin="auto")
    own_c = clip("auto_3_c", "third", 40, stream="s5", origin="auto")
    monkeypatch.setattr(cli, "cut_highlight", lambda c, work: _touch(work / f"{c.id}.ts"))
    vision = FakeVision({"auto_1_a": _scene(1, 2), "auto_2_b": _scene(1, 2), "auto_3_c": _scene(7, 8)})
    publisher, run = setup([viewer], judge=vision)
    monkeypatch.setattr(cli, "find_highlights", lambda kick, channels, *a, **k: [own_a[0], own_b[0], own_c[0]])
    assert run("--burst", "3") == 0
    # The agent's cuts go before the viewer clip, despite fewer "views"; the
    # second cut shows the same scene as the first, so it is left out.
    assert publisher.sent[:2] == ["auto_1_a", "auto_3_c"]
    assert "same scene" in read("published.json")["skipped"]["auto_2_b"]["reason"]
    assert read("published.json")["published"]["auto_1_a"]["scene"]


def test_extra_batches_run_on_their_own_until_the_set_time(world, tmp_path, monkeypatch):
    setup, read, _ = world
    entries = [clip("a", "big", 900, stream="s2"), clip("b", "other", 800, stream="s3")]
    publisher, run = setup(entries, gap=7)
    monkeypatch.setattr(cli, "find_highlights", lambda *a, **k: [])
    config = tmp_path / "config.yaml"
    later = (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat()
    config.write_text(config.read_text().replace("privacy: public}", f"privacy: public, burst_until: '{later}', burst_per_run: 5}}"))
    assert run() == 0
    assert publisher.sent == ["a", "b"]  # both now, despite the 7-hour spacing
    assert all(entry.get("burst") for entry in read("published.json")["published"].values())



def test_the_first_clips_of_the_day_also_go_to_instagram(world, tmp_path, monkeypatch):
    setup, read, _ = world

    class Client:
        remaining = {}

        def organization_id(self):
            return "org"

        def metrics(self, organization):
            return {}

    class Both(FakePublisher):
        last_url = "https://host/clip.mp4"

        def __init__(self):
            super().__init__()
            self.reels = []
            self.client = Client()

        def to_instagram(self, url, caption):
            self.reels.append(caption.splitlines()[0])
            return f"ig{len(self.reels)}"

    monkeypatch.setattr(cli, "BufferPublisher", Both)
    entries = [clip("a", "big", 900, stream="s2"), clip("b", "other", 800, stream="s3"), clip("c", "third", 700, stream="s4")]
    publisher, run = setup(entries, publisher=Both())
    monkeypatch.setattr(cli, "find_highlights", lambda *a, **k: [])
    config = tmp_path / "config.yaml"
    config.write_text(config.read_text().replace("privacy: public}", "privacy: public, instagram_channel_id: insta, instagram_per_day: 2}"))
    assert run("--burst", "3") == 0
    assert publisher.sent == ["a", "b", "c"] and len(publisher.reels) == 2  # Instagram's share for the day is 2
    published = read("published.json")["published"]
    assert published["a"]["instagram"] == "ig1" and published["b"]["instagram"] == "ig2" and "instagram" not in published["c"]
