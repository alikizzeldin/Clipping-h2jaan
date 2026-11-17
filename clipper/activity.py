"""A short public log of what the agent did, for the dashboard."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

KEEP = 150
TYPES = ("published", "skipped", "error", "learned", "info")


class Activity:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.items: list[dict] = []
        self.dirty = False
        if self.path.exists():
            try:
                loaded = json.loads(self.path.read_text(encoding="utf-8") or "[]")
                self.items = loaded if isinstance(loaded, list) else []
            except ValueError:
                self.items = []

    def add(self, kind: str, text: str, link: str = "", when: datetime | None = None) -> None:
        when = when or datetime.now(timezone.utc)
        entry = {"time": when.isoformat(timespec="seconds"), "type": kind if kind in TYPES else "info", "text": text}
        if link:
            entry["link"] = link
        self.items.insert(0, entry)
        del self.items[KEEP:]
        self.dirty = True

    def save(self) -> None:
        if not self.dirty:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.items, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        self.dirty = False
