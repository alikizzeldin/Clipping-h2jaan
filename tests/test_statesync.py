import json

from clipper.statesync import merge_activity, merge_history, merge_into, merge_published


def test_both_runs_clips_and_skips_survive():
    theirs = {"version": 1, "metrics_checked_at": "2026-11-18T11:00:00+00:00",
              "published": {"a": {"title": "A", "status": "sent"}, "b": {"title": "B"}},
              "skipped": {"x": {"reason": "old"}}}
    ours = {"version": 1, "metrics_checked_at": "2026-11-18T21:00:00+00:00",
            "published": {"b": {"title": "B", "status": "error"}, "c": {"title": "C"}},
            "skipped": {"y": {"reason": "new"}}}
    merged = merge_published(theirs, ours)
    assert set(merged["published"]) == {"a", "b", "c"} and set(merged["skipped"]) == {"x", "y"}
    assert merged["published"]["b"]["status"] == "error" and merged["published"]["a"]["status"] == "sent"
    assert merged["metrics_checked_at"].startswith("2026-11-18T21")


def test_logs_and_history_are_combined_without_repeats():
    a = [{"time": "2026-11-18T21:00", "type": "info", "text": "one"}]
    b = [{"time": "2026-11-18T22:00", "type": "info", "text": "two"}, {"time": "2026-11-18T21:00", "type": "info", "text": "one"}]
    assert [i["text"] for i in merge_activity(a, b)] == ["two", "one"]
    assert merge_history([{"date": "2026-11-17", "views": 1}], [{"date": "2026-11-18", "views": 2}, {"date": "2026-11-17", "views": 5}]) == [
        {"date": "2026-11-17", "views": 5}, {"date": "2026-11-18", "views": 2}]


def test_merge_into_a_checkout(tmp_path):
    repo, ours = tmp_path / "repo", tmp_path / "ours"
    (repo / "state").mkdir(parents=True)
    (ours / "state").mkdir(parents=True)
    (ours / "control").mkdir(parents=True)
    (repo / "state" / "published.json").write_text(json.dumps({"published": {"a": {"t": 1}}, "skipped": {}}))
    (ours / "state" / "published.json").write_text(json.dumps({"published": {"b": {"t": 2}}, "skipped": {}}))
    (ours / "control" / "settings.json").write_text(json.dumps({"paused": True}))
    written = merge_into(ours, repo)
    assert "state/published.json" in written and "control/settings.json" in written
    assert set(json.loads((repo / "state" / "published.json").read_text())["published"]) == {"a", "b"}
    assert json.loads((repo / "control" / "settings.json").read_text()) == {"paused": True}
