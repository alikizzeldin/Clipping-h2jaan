"""Combining this run's records with records another run saved meanwhile.

Runs normally take turns, but if two ever overlap, a plain git merge of the
JSON files conflicts and the second run's records are lost, and with them
the memory of what it posted (so it could be posted again). This merges the
files by meaning instead: every clip and every log line from both is kept.
"""

from __future__ import annotations

import json
from pathlib import Path

from .activity import KEEP


def _load(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def _write(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def merge_published(theirs: dict, ours: dict) -> dict:
    """Every clip from both; for a clip in both, our fields on top of theirs."""
    merged = dict(theirs or {})
    for section in ("published", "skipped"):
        combined = dict((theirs or {}).get(section) or {})
        for key, entry in ((ours or {}).get(section) or {}).items():
            before = combined.get(key)
            combined[key] = {**before, **entry} if isinstance(before, dict) and isinstance(entry, dict) else entry
        merged[section] = combined
    stamps = [s for s in ((theirs or {}).get("metrics_checked_at"), (ours or {}).get("metrics_checked_at")) if s]
    if stamps:
        merged["metrics_checked_at"] = max(stamps)
    merged.setdefault("version", (ours or {}).get("version", 1))
    return merged


def merge_activity(theirs: list, ours: list) -> list:
    """Both logs, newest first, without repeating a line."""
    seen, out = set(), []
    for item in sorted([*(theirs or []), *(ours or [])], key=lambda i: str(i.get("time", "")), reverse=True):
        key = (item.get("time"), item.get("type"), item.get("text"))
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out[:KEEP]


def merge_history(theirs: list, ours: list) -> list:
    """One point per day; ours wins for a day in both."""
    days = {p.get("date"): p for p in (theirs or []) if isinstance(p, dict)}
    days.update({p.get("date"): p for p in (ours or []) if isinstance(p, dict)})
    return [days[d] for d in sorted(d for d in days if d)]


def merge_manual(theirs: dict, ours: dict) -> dict:
    """Reels for posting by hand: every run's records together (several run side by side)."""
    items = dict((theirs or {}).get("items") or {})
    items.update((ours or {}).get("items") or {})
    ordered = sorted(items.items(), key=lambda kv: kv[1].get("created_at", ""))[-200:]
    return {"version": 1, "items": dict(ordered)}


def merge_into(ours_dir: Path, repo: Path) -> list[str]:
    """Merge the records saved in `ours_dir` into the checkout at `repo` (which
    holds the newest saved version). Returns the files written."""
    written = []
    rules = {
        "state/manual.json": (merge_manual, {}),
        "state/published.json": (merge_published, {}),
        "state/activity.json": (merge_activity, []),
        "state/history.json": (merge_history, []),
    }
    for rel in sorted(p.relative_to(ours_dir).as_posix() for p in ours_dir.rglob("*.json")):
        ours = _load(ours_dir / rel, None)
        if ours is None:
            continue
        target = repo / rel
        if rel in rules:
            merge, empty = rules[rel]
            value = merge(_load(target, empty), ours)
        else:
            value = ours  # learned rules and the dashboard's settings: the newest copy is ours
        _write(target, value)
        written.append(rel)
    return written
