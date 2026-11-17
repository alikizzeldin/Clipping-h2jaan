"""The pieces added around the core pipeline: repeat-moment check, activity
log, alerts, dashboard overrides, spoken titles, the translated line, view
counts and the agent's own cuts."""

import json
from datetime import datetime, timedelta, timezone

from clipper.activity import KEEP, Activity
from clipper.buffer import Buffer
from clipper.cli import same_moment
from clipper.config import Profile, Publish, Selection, load_settings
from clipper.highlights import chat_pace, find_peaks, pieces_between
from clipper.kick import parse_clip
from clipper.learning import Rule
from clipper.notify import Notifier
from clipper.ranking import rank, reject_reason
from clipper.speech import Line, Word, tidy_translation
from clipper.state import State
from clipper.subtitles import TextLayout, build_ass, chunk_words, wrap_lines
from clipper.titles import build_metadata, spoken_title

PROFILE = Profile(kick_category="valorant", label="Valorant", min_views=50)


# ---------------------------------------------------------- repeat moments

def test_overlapping_clips_of_one_broadcast_are_the_same_moment(make_clip, now):
    posted = [("stream1", now.timestamp(), 30.0)]
    def clip(stream, offset, length=30):
        return make_clip(livestream_id=stream, started_at=now + timedelta(seconds=offset), duration=length)
    assert same_moment(clip("stream1", 5), posted)  # 25 of 30 seconds shared
    assert same_moment(clip("stream1", -10, 60), posted)  # a longer clip around it
    assert not same_moment(clip("stream1", 25), posted)  # only the last 5 seconds shared
    assert not same_moment(clip("stream1", 300), posted)
    assert not same_moment(clip("stream2", 5), posted)  # another broadcast
    assert not same_moment(make_clip(), posted)  # timing unknown: can't tell


def test_feed_entries_carry_the_broadcast_but_not_a_real_time():
    raw = {"id": "clip_1", "channel": {"slug": "sxb"}, "video_url": "https://x/y.m3u8", "created_at": "2026-11-16T14:13:12Z",
           "livestream_id": "137964193", "started_at": "0001-01-01T00:00:00Z"}
    clip = parse_clip(raw)
    assert clip.livestream_id == "137964193" and clip.started_at is None
    assert parse_clip({**raw, "started_at": "2026-11-16T14:11:48Z"}).started_at == datetime(2026, 11, 16, 14, 11, 48, tzinfo=timezone.utc)


def test_state_remembers_skips_moments_and_extra_details(tmp_path, make_clip, now):
    state = State(tmp_path / "published.json")
    clip = make_clip(livestream_id="s1", started_at=now, duration=42, origin="auto", views=310)
    state.add(clip, "post1", "T", now, via="buffer", extra={"language": "Arabic"})
    state.skip("clip_dull", "no game on screen", now)
    state.metrics_checked_at = now.isoformat()
    state.save()
    again = State(tmp_path / "published.json")
    assert again.has("clip_1") and again.has("clip_dull") and not again.has("other")
    saved = again.published["clip_1"]
    assert (saved["duration"], saved["origin"], saved["kick_views"], saved["language"]) == (42, "auto", 310, "Arabic")
    assert again.moments() == [("s1", now.timestamp(), 42.0)]
    assert again.skipped["clip_dull"]["reason"] == "no game on screen" and again.metrics_checked_at == now.isoformat()


# ------------------------------------------------------- activity and alerts

def test_activity_log_is_newest_first_and_capped(tmp_path, now):
    log = Activity(tmp_path / "state" / "activity.json")
    for i in range(KEEP + 5):
        log.add("published" if i % 2 else "weird-kind", f"event {i}", when=now + timedelta(seconds=i))
    log.save()
    items = json.loads((tmp_path / "state" / "activity.json").read_text())
    assert len(items) == KEEP and items[0]["text"] == f"event {KEEP + 4}"
    assert {i["type"] for i in items} == {"published", "info"}  # unknown kinds become "info"
    assert Activity(tmp_path / "state" / "activity.json").items[0] == items[0]


class FakePost:
    def __init__(self, status=204, fail=False):
        self.calls, self.status, self.fail = [], status, fail

    def post(self, url, json=None, timeout=None):
        if self.fail:
            import requests
            raise requests.ConnectionError("down")
        self.calls.append((url, json))
        return type("R", (), {"status_code": self.status})()


def test_alerts_go_to_every_configured_place():
    assert not Notifier().enabled and Notifier().send("x") is False
    session = FakePost()
    both = Notifier("https://discord.example/hook", "TOKEN", "42", session=session)
    assert both.enabled and both.send("Clip published") is True
    assert session.calls == [
        ("https://discord.example/hook", {"content": "Clip published"}),
        ("https://api.telegram.org/botTOKEN/sendMessage", {"chat_id": "42", "text": "Clip published"}),
    ]


def test_a_failed_alert_never_raises():
    assert Notifier("https://discord.example/hook", session=FakePost(fail=True)).send("x") is False
    assert Notifier("https://discord.example/hook", session=FakePost(status=404)).send("x") is False


# --------------------------------------------------- dashboard's settings file

CONFIG = """profile: a
profiles:
  a: {{kick_category: x, label: X, min_views: 150, theme: t}}
themes:
  t: {{caption_style: neon, caption_glow: 0.3}}
publish: {{max_per_day: 3, featured_per_day: 2, privacy: public}}
control_dir: {control}
"""


def settings_with(tmp_path, monkeypatch, overrides):
    monkeypatch.delenv("CLIPPER_PROFILE", raising=False)
    monkeypatch.delenv("CLIPPER_PRIVACY", raising=False)
    control = tmp_path / "control"
    control.mkdir(exist_ok=True)
    (control / "settings.json").write_text(json.dumps(overrides))
    config = tmp_path / "config.yaml"
    config.write_text(CONFIG.format(control=control))
    return load_settings(config)


def test_dashboard_settings_override_the_config_file(tmp_path, monkeypatch):
    s = settings_with(tmp_path, monkeypatch, {
        "paused": True, "privacy": "unlisted", "max_per_day": 5, "featured_per_day": 1, "min_gap_hours": 4.5,
        "featured_channels": ["SXB", " xQc "], "block_channels": ["bad"], "languages": ["Arabic"],
        "min_views": 400, "featured_min_views": 5, "max_duration": 90, "top_channels_only": True,
        "require_gameplay": True, "own_clips": True, "english_subtitles": True, "caption_glow": 0.8,
    })
    assert (s.publish.paused, s.publish.privacy, s.publish.max_per_day, s.publish.featured_per_day) == (True, "unlisted", 5, 1)
    assert s.publish.min_gap_hours == 4.5 and s.active.min_views == 400 and s.theme.caption_glow == 0.8
    sel = s.selection
    assert (sel.featured_channels, sel.block_channels, sel.languages) == (["sxb", "xqc"], ["bad"], ["Arabic"])
    assert (sel.featured_min_views, sel.max_duration, sel.top_channels_only, sel.require_gameplay, sel.own_clips) == (5, 90, True, True, True)
    assert s.captions.english_subtitles is True


def test_odd_values_in_the_settings_file_are_ignored_or_tamed(tmp_path, monkeypatch):
    s = settings_with(tmp_path, monkeypatch, {
        "paused": "yes", "privacy": "everyone", "max_per_day": 2, "featured_per_day": 9, "min_gap_hours": "soon",
        "max_duration": 9999, "caption_glow": 7, "featured_channels": "sxb", "render": {"crf": 1}, "min_views": True,
    })
    assert s.publish.paused is False and s.publish.privacy == "public"
    assert (s.publish.max_per_day, s.publish.featured_per_day) == (2, 2)  # reserved slots can't exceed the total
    assert s.publish.min_gap_hours == 0 and s.selection.max_duration == 175 and s.theme.caption_glow == 1.0
    assert s.selection.featured_channels == [] and s.active.min_views == 150


def test_a_missing_or_broken_settings_file_changes_nothing(tmp_path, monkeypatch):
    monkeypatch.delenv("CLIPPER_PROFILE", raising=False)
    (tmp_path / "control").mkdir()
    (tmp_path / "control" / "settings.json").write_text("{not json")
    config = tmp_path / "config.yaml"
    config.write_text(CONFIG.format(control=tmp_path / "control"))
    assert load_settings(config).publish.max_per_day == 3


# ------------------------------------------------------------ titles from speech

def test_the_most_quotable_line_becomes_the_title():
    assert spoken_title(["5-11 I am primary on the car", "Do we know where the primary suspect is he was in dark colour clothes red helmet",
                         "I am aiming for the bushes!", "AHHHHH!"]) == "I am aiming for the bushes!"
    assert spoken_title(["شو درع يا هبل؟ هذو جواته أغراض", "واحد الله", "كمل كمل كمل كمل"]) == "شو درع يا هبل؟ هذو جواته أغراض"
    assert spoken_title(["ok", "go go go go", ""]) == ""
    assert spoken_title(["you absolute n1gg4 what was that"]) == ""


def test_junk_viewer_titles_are_replaced_by_what_was_said(make_clip):
    lines = ["I am aiming for the bushes!"]
    junk = build_metadata(make_clip(title="kkkkkkk"), PROFILE, Publish(), True, lines)
    assert junk["title"] == "“I am aiming for the bushes!” | Streamer Valorant #shorts"
    good = build_metadata(make_clip(title="Insane 1v5 clutch"), PROFILE, Publish(), True, lines)
    assert good["title"].startswith("Insane 1v5 clutch")  # a real viewer title wins
    silent = build_metadata(make_clip(title="kkkkkkk"), PROFILE, Publish(), True, [])
    assert silent["title"] == "Streamer Valorant clip #shorts"


def test_the_agents_own_cuts_link_the_streamer_but_no_clip_page(make_clip):
    meta = build_metadata(make_clip(id="auto_1_2", origin="auto", title=""), PROFILE, Publish(), True)
    assert "https://kick.com/streamer" in meta["description"] and "Original clip" not in meta["description"]


# ------------------------------------------------------------ translated line

def test_the_english_line_sits_under_the_captions_one_at_a_time():
    layout = TextLayout(1080, 1920, caption_y=1170, caption_size=150, sub_y=1269)
    captions = chunk_words([Word("آه", 0.5, 0.9), Word("والله", 0.9, 1.4)])
    english = [Line("Oh, I swear", 0.4, 2.5), Line("there might be a weapon inside it", 2.0, 4.0), Line("blip", 4.0, 4.1)]
    ass = build_ass(layout, captions, translation=english)
    subs = [line for line in ass.splitlines() if ",Sub," in line]
    assert len(subs) == 2  # the 0.1-second line is dropped
    assert "0:00:00.40,0:00:02.00" in subs[0] and subs[0].endswith("{\\an8\\pos(540,1269)}Oh, I swear")  # ends when the next begins
    assert "Style: Sub,Cairo,56," in ass
    assert ",Sub," not in build_ass(TextLayout(1080, 1920, 1170, 150), captions, translation=english)  # no room set aside


def test_translated_lines_must_match_real_speech_and_not_loop():
    heard = [Word("آه", 1.0, 1.4), Word("والله", 5.0, 5.5)]
    lines = [Line("Oh I swear", 0.8, 2.0), Line("made up over music", 2.5, 4.0), Line("it might be", 4.8, 6.0)]
    assert [l.text for l in tidy_translation(lines, heard)] == ["Oh I swear", "it might be"]
    stuck = [Line("I'm sorry, I'm sorry", t, t + 2) for t in range(0, 20, 2)]
    talking = [Word("كلمة", t + 0.5, t + 0.9) for t in range(0, 20, 2)]
    assert tidy_translation(stuck, talking) == []  # the translator looping on one sentence
    assert tidy_translation(lines, []) == []


def test_long_translations_wrap_to_two_lines():
    lines = wrap_lines("word " * 60, "Cairo-Bold.ttf", 56, 900)
    assert len(lines) == 2 and lines[1].endswith("…")
    assert wrap_lines("short one", "Cairo-Bold.ttf", 56, 900) == ["short one"]


# ----------------------------------------------------------------- view counts

class FakeBuffer:
    def __init__(self, body):
        self.body, self.sent = body, None

    def post(self, url, headers=None, json=None, timeout=None):
        self.sent = json
        return type("R", (), {"status_code": 200, "json": lambda _self: self.body})()


def test_view_counts_come_back_by_post_and_skip_unmeasured_posts():
    node = lambda pid, updated, **metrics: {"node": {  # noqa: E731
        "id": pid, "externalLink": f"https://youtube.com/shorts/{pid}", "metricsUpdatedAt": updated,
        "metrics": [{"type": k, "value": v} for k, v in metrics.items()]}}
    session = FakeBuffer({"data": {"posts": {"edges": [
        node("p1", "2026-11-19T04:00:00Z", views=1200.0, reactions=80.0, comments=7.0),
        node("p2", None, views=0.0),  # YouTube not read yet: a placeholder, not a real zero
        node("p3", "2026-11-19T04:00:00Z", reactions=3.0),  # no view count reported
    ]}}})
    found = Buffer("key", "chan", session=session).metrics("org1")
    assert found == {"p1": {"views": 1200, "likes": 80, "comments": 7, "link": "https://youtube.com/shorts/p1"}}
    assert session.sent["variables"]["input"] == {"organizationId": "org1", "filter": {"status": ["sent"], "channelIds": ["chan"]}}


# ------------------------------------------------------------- rules in ranking

def test_rules_reorder_the_queue_and_can_rule_clips_out(make_clip, now):
    never = lambda clip_id: False  # noqa: E731
    clips = [make_clip(id="big", views=900, channel_slug="a"), make_clip(id="fav", views=700, channel_slug="sxb"),
             make_clip(id="banned", views=5000, channel_slug="c", title="leak footage")]
    rules = [Rule("r1", "channel", "sxb", 2.0), Rule("r2", "keyword", "leak", 0)]
    chosen, rejected = rank(clips, PROFILE, Selection(), never, now, rules=rules)
    assert [c.id for c in chosen] == ["fav", "big"]
    assert dict((c.id, why) for c, why in rejected)["banned"] == "ruled out by one of your rules"
    assert reject_reason(clips[2], PROFILE, Selection(), never, now) is None  # fine without the rule


# --------------------------------------------------------------- own highlights

def test_chat_pace_counts_how_fast_a_sample_filled():
    at = lambda s: {"created_at": f"2026-11-17T15:08:{s:02d}Z"}  # noqa: E731
    assert chat_pace([at(0)] * 10) == 2.0  # 10 messages in the 5-second window
    assert chat_pace([at(0)] * 12 + [at(1)] * 13) == 12.5  # 25 messages within 2 seconds
    assert chat_pace([at(0)] * 5 + [at(4)] * 20) == 5.0
    assert chat_pace([]) == 0.0


def test_spikes_stand_clearly_above_the_usual_pace(now):
    calm = [(now + timedelta(seconds=30 * i), 2.0 + (i % 3) * 0.2) for i in range(40)]
    samples = list(calm)
    samples[10] = (calm[10][0], 9.0)
    samples[11] = (calm[11][0], 8.0)  # same burst, 30 seconds later
    samples[30] = (calm[30][0], 6.5)
    peaks = find_peaks(samples)
    assert [when for when, _ in peaks] == [calm[10][0], calm[30][0]]  # one per burst, in time order
    assert find_peaks(calm) == [] and find_peaks(samples[:5]) == []


def test_only_the_recording_segments_covering_the_moment_are_fetched():
    playlist = "#EXTM3U\n#EXT-X-PROGRAM-DATE-TIME:2026-11-17T08:43:10.000Z\n" + "".join(
        f"#EXTINF:10.000,\n{i}.ts\n" for i in range(12))
    base = "https://stream.kick.com/x/media/hls/1080p60/playlist.m3u8"
    start = datetime(2026, 11, 17, 8, 43, 35, tzinfo=timezone.utc)
    pieces = pieces_between(playlist, base, start, start + timedelta(seconds=50))
    assert [p.url.rsplit("/", 1)[1] for p in pieces] == ["2.ts", "3.ts", "4.ts", "5.ts", "6.ts", "7.ts"]
    assert pieces[0].start == datetime(2026, 11, 17, 8, 43, 30, tzinfo=timezone.utc) and pieces[0].url.startswith("https://stream.kick.com/x/media/hls/1080p60/")
    assert pieces_between(playlist, base, start + timedelta(hours=5), start + timedelta(hours=5, seconds=50)) == []
