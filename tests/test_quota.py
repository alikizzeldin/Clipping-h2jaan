from datetime import timedelta

from clipper.config import Publish
from clipper.quota import plan

PUB = Publish(max_per_day=3, featured_per_day=2, min_gap_hours=7, fill_after_hours=12)
FEATURED = {"sxb"}


def ids(result):
    return [c.id for c in result[0]]


def test_a_featured_channel_goes_first_while_it_has_slots(make_clip, now):
    clips = [make_clip(id="big", channel_slug="xqc"), make_clip(id="fav", channel_slug="SXB")]
    queue, why = plan(clips, FEATURED, PUB, [], now)
    assert [c.id for c in queue] == ["fav"] and "featured" in why


def test_other_channels_get_the_remaining_slot(make_clip, now):
    clips = [make_clip(id="fav3", channel_slug="sxb"), make_clip(id="big", channel_slug="xqc")]
    uploads = [(now - timedelta(hours=20), "sxb"), (now - timedelta(hours=9), "sxb")]
    assert ids(plan(clips, FEATURED, PUB, uploads, now)) == ["big"]


def test_the_open_slot_is_used_when_the_featured_channel_has_nothing(make_clip, now):
    clips = [make_clip(id="big", channel_slug="xqc")]
    assert ids(plan(clips, FEATURED, PUB, [], now)) == ["big"]


def test_reserved_slots_wait_then_open_to_anyone(make_clip, now):
    clips = [make_clip(id="big", channel_slug="xqc")]
    recently = [(now - timedelta(hours=8), "xqc")]  # the open slot is used; 2 reserved remain
    queue, why = plan(clips, FEATURED, PUB, recently, now)
    assert queue == [] and "held for sxb" in why
    long_ago = [(now - timedelta(hours=13), "xqc")]
    assert ids(plan(clips, FEATURED, PUB, long_ago, now)) == ["big"]


def test_posts_are_spaced_out(make_clip, now):
    clips = [make_clip(id="fav", channel_slug="sxb")]
    queue, why = plan(clips, FEATURED, PUB, [(now - timedelta(hours=3), "sxb")], now)
    assert queue == [] and why == "the next clip is due in 4.0 hours"
    assert ids(plan(clips, FEATURED, PUB, [(now - timedelta(hours=3), "sxb")], now, ignore_gap=True)) == ["fav"]
    assert ids(plan(clips, FEATURED, PUB, [(now - timedelta(hours=7), "sxb")], now)) == ["fav"]


def test_the_daily_limit_stops_everything(make_clip, now):
    uploads = [(now - timedelta(hours=h), "sxb") for h in (23, 15, 8)]
    queue, why = plan([make_clip()], FEATURED, PUB, uploads, now)
    assert queue == [] and why == "today's clips are all posted"


def test_without_featured_channels_every_slot_is_open(make_clip, now):
    clips = [make_clip(id="a"), make_clip(id="b", channel_slug="other")]
    assert ids(plan(clips, set(), PUB, [], now)) == ["a", "b"]
    assert plan([], set(), PUB, [], now) == ([], "no clip met the selection rules")



def test_each_featured_streamer_has_a_share_and_they_take_turns():
    from datetime import datetime, timedelta, timezone

    from clipper.config import Publish
    from clipper.models import Clip
    from clipper.quota import plan

    now = datetime(2026, 11, 19, 12, tzinfo=timezone.utc)

    def c(cid, channel):
        return Clip(id=cid, source="kick", title="t", channel_slug=channel, channel_name=channel, category_slug="g",
                    category_name="g", views=100, likes=0, duration=30, created_at=now, media_url="")

    pub = Publish(max_per_day=12, featured_per_day=3, min_gap_hours=0, fill_after_hours=5)
    featured = {"maherco", "alimousa96", "xqc"}
    ranked = [c("x1", "xqc"), c("m1", "maherco"), c("a1", "alimousa96"), c("o1", "big")]
    at = lambda h: now - timedelta(hours=h)

    queue, why = plan(ranked, featured, pub, [], now)
    assert queue[0].channel_slug == "xqc" and why == "a featured channel's slot"  # nobody posted yet: best first
    queue, _ = plan(ranked, featured, pub, [(at(2), "xqc")], now)
    assert queue[0].channel_slug == "maherco"  # xqc had a turn; the others go before him
    full_featured = [(at(i), name) for i, name in enumerate(["xqc", "maherco", "alimousa96"] * 3)]
    queue, why = plan(ranked, featured, pub, full_featured, now)
    assert [q.channel_slug for q in queue] == ["big"] and why == "an open slot"  # 9 featured done: the other 3
    done_others = full_featured + [(at(10 + i), "big") for i in range(3)]
    assert plan(ranked, featured, pub, done_others, now)[0] == []  # 12 posted: the day is full
    # maherco is offline all day: after 5 quiet hours another channel may take a held slot.
    no_maherco = [c("x1", "xqc"), c("o1", "big")]
    held = [(at(6 + i), name) for i, name in enumerate(["xqc"] * 3 + ["alimousa96"] * 3 + ["big"] * 3)]
    queue, why = plan(no_maherco, featured, pub, held, now)
    assert [q.channel_slug for q in queue] == ["big"] and why == "a held slot nobody had filled"
    queue, why = plan(no_maherco, featured, pub, [(at(1), n) for _, n in held], now)
    assert queue == [] and "maherco" in why
