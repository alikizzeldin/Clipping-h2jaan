"""Learning from results.

Once a day the agent reads each published clip's view count from Buffer,
compares groups of clips (by streamer, by length, by language) and writes down
the groups that clearly do better or worse than the rest as rules. Rules nudge
the ranking: a preferred group's clips score higher, an avoided group's lower.

The owner is in charge: rules they switch off or remove in the dashboard are
ignored, removed ones are never learned again, and their own rules always
apply. Their choices live in control/rules.json; what the agent learned lives
in state/learned.json.
"""

from __future__ import annotations

import json
import logging
import re
import statistics
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .models import Clip

log = logging.getLogger(__name__)

NEEDED_CLIPS = 8  # measured clips before any conclusion is drawn
GROUP_MIN = 3  # clips a group needs to count
CLEAR_WIN = 1.25  # a group must beat (or trail) the rest by this ratio

LANGUAGE_NAMES = {"ar": "Arabic", "en": "English", "es": "Spanish", "pt": "Portuguese", "tr": "Turkish",
                  "fr": "French", "de": "German", "th": "Thai", "ja": "Japanese", "ru": "Russian"}


def language_name(code_or_name: str) -> str:
    value = (code_or_name or "").strip()
    return LANGUAGE_NAMES.get(value.lower(), value[:1].upper() + value[1:]) if value else ""


def length_bucket(seconds: float | None) -> str:
    if not seconds:
        return ""
    if seconds < 30:
        return "Under 30s"
    if seconds < 60:
        return "30–60s"
    return "Over 60s"


@dataclass(frozen=True)
class Rule:
    id: str
    kind: str  # channel | duration | language | keyword
    target: str
    factor: float  # 0 = never use, below 1 = use less, above 1 = prefer

    def matches(self, clip: Clip, spoken: str = "") -> bool:
        target = self.target.strip().lower()
        if not target:
            return False
        if self.kind == "channel":
            return clip.channel_slug.lower() == target
        if self.kind == "duration":
            return length_bucket(clip.duration).lower() == target
        if self.kind == "language":
            return bool(clip.language) and language_name(clip.language).lower().startswith(target)
        if self.kind == "keyword":
            return target in clip.title.lower() or (bool(spoken) and target in spoken.lower())
        return False


def _read(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return fallback


def active_rules(control_path: str | Path, learned_path: str | Path) -> list[Rule]:
    """The rules in force: the owner's own, plus learned ones they haven't turned off."""
    control = _read(Path(control_path), {})
    learned = _read(Path(learned_path), {})
    off = set(control.get("dismissed") or []) | set(control.get("disabled") or [])
    rules: list[Rule] = []
    for raw in [*(control.get("manual") or []), *(learned.get("rules") or [])]:
        try:
            rule = Rule(str(raw["id"]), str(raw["kind"]), str(raw["target"]), float(raw["factor"]))
        except (KeyError, TypeError, ValueError):
            continue
        if rule.id not in off and rule.kind in ("channel", "duration", "language", "keyword") and rule.factor >= 0:
            rules.append(rule)
    return rules


def factor_for(clip: Clip, rules: list[Rule], spoken: str = "") -> float:
    """How much the rules raise or lower this clip's priority (0 = ruled out)."""
    factor = 1.0
    for rule in rules:
        if rule.matches(clip, spoken):
            factor *= rule.factor
    return factor


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def learn(published: dict[str, dict], dismissed: set[str], now: datetime | None = None,
          previous: list[dict] | None = None) -> dict:
    """Derive rules from the measured clips. Returns the learned.json content."""
    now = now or datetime.now(timezone.utc)
    measured = [e for e in published.values() if isinstance(e.get("views"), (int, float)) and e.get("status") != "error"]
    result = {"updated_at": now.isoformat(timespec="seconds"), "measured_clips": len(measured),
              "needed_clips": NEEDED_CLIPS, "rules": []}
    if len(measured) < NEEDED_CLIPS:
        return result
    born = {r["id"]: r.get("created_at") for r in (previous or []) if "id" in r}

    def consider(kind: str, key_of, describe) -> None:
        groups: dict[str, list[float]] = {}
        for entry in measured:
            key = key_of(entry)
            if key:
                groups.setdefault(key, []).append(float(entry["views"]))
        for key, views in groups.items():
            rest = [float(e["views"]) for e in measured if key_of(e) != key]
            if len(views) < GROUP_MIN or len(rest) < GROUP_MIN:
                continue
            # Typical (median) views, not the mean: one viral clip must not
            # decide what the agent believes about everything else.
            avg, baseline = statistics.median(views), statistics.median(rest)
            if baseline <= 0:
                continue
            ratio = avg / baseline
            if 1 / CLEAR_WIN < ratio < CLEAR_WIN:
                continue
            rule_id = f"auto-{kind}-{_slug(key)}"
            if rule_id in dismissed:
                continue
            result["rules"].append({
                "id": rule_id, "kind": kind, "target": key,
                "factor": round(min(1.6, max(0.6, ratio)), 1),
                "text": describe(key, ratio > 1),
                "evidence": {"clips": len(views), "avg_views": round(avg), "baseline": round(baseline)},
                "created_at": born.get(rule_id) or now.isoformat(timespec="seconds"),
            })

    consider("channel", lambda e: str(e.get("channel") or "").lower(),
             lambda key, up: f"Clips from {key} usually get {'more' if up else 'fewer'} views than the rest")
    consider("duration", lambda e: length_bucket(e.get("duration")),
             lambda key, up: f"Clips that are {key.lower()} usually get {'more' if up else 'fewer'} views")
    consider("language", lambda e: language_name(str(e.get("language") or "")),
             lambda key, up: f"Clips in {key} usually get {'more' if up else 'fewer'} views")
    return result


def update_history(path: str | Path, published: dict[str, dict], now: datetime | None = None) -> None:
    """Record today's totals, so the dashboard can chart growth over time."""
    now = now or datetime.now(timezone.utc)
    path = Path(path)
    history = _read(path, [])
    history = history if isinstance(history, list) else []
    live = [e for e in published.values() if e.get("status") != "error"]
    point = {"date": now.date().isoformat(), "views": int(sum(float(e.get("views") or 0) for e in live)), "clips": len(live)}
    history = [p for p in history if p.get("date") != point["date"]] + [point]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(history[-400:], indent=1) + "\n", encoding="utf-8")
