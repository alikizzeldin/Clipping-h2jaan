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
        if self.path.exists():
            data = json.loads(self.path.read_text(encoding="utf-8") or "{}")
            self.published = dict(data.get("published") or {})

    def has(self, clip_id: str) -> bool:
        return clip_id in self.published

    def add(self, clip: Clip, video_id: str, title: str, when: datetime | None = None) -> None:
        when = when or datetime.now(timezone.utc)
        self.published[clip.id] = {
            "video_id": video_id,
            "title": title,
            "channel": clip.channel_slug,
            "source": clip.source,
            "category": clip.category_slug,
            "uploaded_at": when.isoformat(timespec="seconds"),
        }

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
        tmp.write_text(
            json.dumps({"version": 1, "published": self.published}, indent=1, ensure_ascii=False)
            + "\n",
            encoding="utf-8",
        )
        tmp.replace(self.path)
