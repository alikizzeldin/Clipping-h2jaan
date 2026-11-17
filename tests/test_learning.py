import json
from datetime import timedelta

from clipper.learning import (NEEDED_CLIPS, Rule, active_rules, factor_for, language_name, learn,
                              length_bucket, update_history)


def entry(channel, views, duration=40, language="English", status="sent"):
    return {"channel": channel, "views": views, "duration": duration, "language": language, "status": status}


def published(*entries):
    return {f"clip_{i}": e for i, e in enumerate(entries)}


def test_nothing_is_concluded_from_too_few_clips(now):
    result = learn(published(*[entry("sxb", 900_000) for _ in range(NEEDED_CLIPS - 1)]), set(), now)
    assert result["rules"] == [] and result["measured_clips"] == NEEDED_CLIPS - 1
    assert result["needed_clips"] == NEEDED_CLIPS


def test_a_streamer_who_clearly_beats_the_rest_becomes_a_rule(now):
    data = published(*[entry("sxb", 300_000) for _ in range(4)], *[entry("xqc", 100_000) for _ in range(5)])
    rules = {r["id"]: r for r in learn(data, set(), now)["rules"]}
    best = rules["auto-channel-sxb"]
    assert best["kind"] == "channel" and best["target"] == "sxb" and best["factor"] == 1.6  # capped
    assert best["evidence"] == {"clips": 4, "avg_views": 300_000, "baseline": 100_000}
    assert best["text"] == "Clips from sxb usually get more views than the rest"
    assert rules["auto-channel-xqc"]["factor"] == 0.6 and "fewer" in rules["auto-channel-xqc"]["text"]


def test_length_and_language_are_compared_too(now):
    data = published(
        *[entry("a", 400_000, duration=20, language="Arabic") for _ in range(4)],
        *[entry("b", 100_000, duration=80, language="English") for _ in range(4)],
        entry("c", 100_000, duration=45, language=""),
    )
    ids = {r["id"] for r in learn(data, set(), now)["rules"]}
    assert {"auto-duration-under-30s", "auto-duration-over-60s", "auto-language-arabic"} <= ids


def test_small_groups_close_calls_unmeasured_and_failed_clips_are_ignored(now):
    data = published(
        *[entry("sxb", 110_000) for _ in range(4)], *[entry("xqc", 100_000) for _ in range(4)],  # too close
        entry("solo", 9_000_000), entry("solo", 9_000_000),  # only two clips, and viral: must not skew the rest
        entry("ghost", 5, status="error"), {"channel": "new", "duration": 30},  # failed / not counted yet
    )
    result = learn(data, set(), now)
    assert result["rules"] == [] and result["measured_clips"] == 10


def test_removed_rules_are_never_learned_again_and_ages_are_kept(now):
    data = published(*[entry("sxb", 300_000) for _ in range(4)], *[entry("xqc", 100_000) for _ in range(5)])
    first = learn(data, set(), now - timedelta(days=3))
    again = learn(data, {"auto-channel-xqc"}, now, previous=first["rules"])
    assert [r["id"] for r in again["rules"]] == ["auto-channel-sxb"]
    assert again["rules"][0]["created_at"] == first["rules"][0]["created_at"]


def test_active_rules_respect_the_owner(tmp_path):
    control, learned = tmp_path / "rules.json", tmp_path / "learned.json"
    learned.write_text(json.dumps({"rules": [
        {"id": "auto-channel-sxb", "kind": "channel", "target": "sxb", "factor": 1.5},
        {"id": "auto-channel-xqc", "kind": "channel", "target": "xqc", "factor": 0.6},
        {"id": "auto-duration-over-60s", "kind": "duration", "target": "Over 60s", "factor": 0.7},
    ]}))
    control.write_text(json.dumps({
        "manual": [{"id": "manual-1", "kind": "keyword", "target": "police", "factor": 2}, {"id": "broken"}],
        "disabled": ["auto-channel-xqc"], "dismissed": ["auto-duration-over-60s"],
    }))
    assert [r.id for r in active_rules(control, learned)] == ["manual-1", "auto-channel-sxb"]
    assert active_rules(tmp_path / "missing.json", tmp_path / "also-missing.json") == []


def test_rules_raise_lower_or_rule_out_a_clip(make_clip):
    rules = [
        Rule("r1", "channel", "SXB", 1.5), Rule("r2", "duration", "under 30s", 1.2),
        Rule("r3", "language", "arabic", 2.0), Rule("r4", "keyword", "Police", 0.5), Rule("r5", "keyword", "leak", 0),
    ]
    clip = make_clip(channel_slug="sxb", duration=20, language="ar", title="Police chase")
    assert factor_for(clip, rules) == 1.5 * 1.2 * 2.0 * 0.5
    assert factor_for(make_clip(), rules) == 1.0
    assert factor_for(make_clip(title="fine"), rules, spoken="this is a LEAK") == 0  # heard, not titled
    assert factor_for(make_clip(language=""), [Rule("r", "language", "arabic", 2)]) == 1.0


def test_buckets_and_language_names():
    assert [length_bucket(s) for s in (0, 12, 30, 59, 60, 175)] == ["", "Under 30s", "30–60s", "30–60s", "Over 60s", "Over 60s"]
    assert [language_name(v) for v in ("ar", "EN", "Arabic", "xx", "")] == ["Arabic", "English", "Arabic", "Xx", ""]


def test_history_keeps_one_point_per_day(tmp_path, now):
    path = tmp_path / "state" / "history.json"
    update_history(path, published(entry("a", 100), entry("b", 50), entry("c", 999, status="error")), now)
    update_history(path, published(entry("a", 400), entry("b", 50)), now)  # same day: replaced
    update_history(path, published(entry("a", 900)), now + timedelta(days=1))
    assert json.loads(path.read_text()) == [
        {"date": "2026-11-17", "views": 450, "clips": 2}, {"date": "2026-11-18", "views": 900, "clips": 1},
    ]
