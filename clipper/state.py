"""Remembers which clips were already published, so nothing is posted twice."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .models import Clip

KEEP = 5000  # newest entries to keep in the file


class State:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.published: dict[str, dict] = {}
        self.skipped: dict[str, dict] = {}  # clips judged unusable, so they aren't fetched again
        self.metrics_checked_at = ""
        if self.path.exists():
            data = json.loads(self.path.read_text(encoding="utf-8") or "{}")
            self.published = dict(data.get("published") or {})
            self.skipped = dict(data.get("skipped") or {})
            self.metrics_checked_at = str(data.get("metrics_checked_at") or "")

    def has(self, clip_id: str) -> bool:
        """True if the clip was already published or already ruled out."""
        return clip_id in self.published or clip_id in self.skipped

    def skip(self, clip_id: str, reason: str, when: datetime | None = None) -> None:
        when = when or datetime.now(timezone.utc)
        self.skipped[clip_id] = {"reason": reason, "at": when.isoformat(timespec="seconds")}

    def moments(self) -> list[tuple[str, float, float]]:
        """(broadcast id, start as epoch seconds, length) of every published clip."""
        found = []
        for entry in self.published.values():
            try:
                start = datetime.fromisoformat(entry["started_at"]).timestamp()
                found.append((str(entry["livestream_id"]), start, float(entry.get("duration") or 0)))
            except (KeyError, TypeError, ValueError):
                continue
        return found

    def add(self, clip: Clip, video_id: str, title: str, when: datetime | None = None,
            via: str = "youtube", link: str = "", extra: dict | None = None) -> None:
        when = when or datetime.now(timezone.utc)
        self.published[clip.id] = {
            "video_id": video_id,  # YouTube id, or Buffer's post id when via == "buffer"
            "via": via,
            "link": link,
            "title": title,
            "channel": clip.channel_slug,
            "source": clip.source,
            "category": clip.category_slug,
            "uploaded_at": when.isoformat(timespec="seconds"),
            "duration": round(clip.duration),
            "origin": clip.origin,
            "kick_views": clip.views,
            **({"livestream_id": clip.livestream_id} if clip.livestream_id else {}),
            **({"started_at": clip.started_at.isoformat(timespec="seconds")} if clip.started_at else {}),
            **(extra or {}),
        }

    def update(self, clip_id: str, **fields: str) -> None:
        self.published[clip_id].update(fields)

    def unconfirmed(self, via: str, since: datetime) -> list[tuple[str, dict]]:
        """Recent posts handed to `via` whose outcome isn't recorded yet, oldest first."""
        found = []
        for clip_id, entry in self.published.items():
            if entry.get("via") != via or entry.get("link") or entry.get("status"):
                continue
            try:
                when = datetime.fromisoformat(entry["uploaded_at"])
            except (KeyError, ValueError):
                continue
            if when >= since:
                found.append((when, clip_id, entry))
        return [(clip_id, entry) for _, clip_id, entry in sorted(found, key=lambda f: f[0])]

    def recent_hooks(self, count: int = 6) -> list[str]:
        """The title hooks of the last `count` uploads, newest first."""
        entries = sorted(self.published.values(), key=lambda e: str(e.get("uploaded_at", "")), reverse=True)
        return [str(e["hook"]) for e in entries[:count] if e.get("hook")]

    def recent(self, since: datetime) -> list[tuple[datetime, str]]:
        """(time, channel) of everything published since `since` under the daily plan.

        Clips from a one-off launch burst are left out: they were extra, and
        must not use up the day's regular slots (such as a featured streamer's).
        """
        found = []
        for entry in self.published.values():
            if entry.get("burst"):
                continue
            try:
                when = datetime.fromisoformat(entry["uploaded_at"])
            except (KeyError, ValueError):
                continue
            if when >= since:
                found.append((when, str(entry.get("channel", ""))))
        return sorted(found)

    def uploads_since(self, since: datetime) -> int:
        count = 0
        for entry in self.published.values():
            try:
                if datetime.fromisoformat(entry["uploaded_at"]) >= since:
                    count += 1
            except (KeyError, ValueError):
                continue
        return count

    def uploads_last_day(self, now: datetime | None = None) -> int:
        now = now or datetime.now(timezone.utc)
        return self.uploads_since(now - timedelta(hours=24))

    def save(self) -> None:
        items = sorted(self.published.items(), key=lambda kv: kv[1].get("uploaded_at", ""))
        self.published = dict(items[-KEEP:])
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        skipped = sorted(self.skipped.items(), key=lambda kv: kv[1].get("at", ""))
        self.skipped = dict(skipped[-2000:])
        tmp.write_text(
            json.dumps(
                {"version": 1, "metrics_checked_at": self.metrics_checked_at,
                 "published": self.published, "skipped": self.skipped},
                indent=1, ensure_ascii=False,
            ) + "\n",
            encoding="utf-8",
        )
        tmp.replace(self.path)
