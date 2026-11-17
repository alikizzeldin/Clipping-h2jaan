"""Source-agnostic data types shared by every stage of the pipeline."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class Clip:
    id: str
    source: str  # "kick" today; "twitch" slots in here later
    title: str
    channel_slug: str
    channel_name: str
    category_slug: str
    category_name: str
    views: int
    likes: int
    duration: float  # seconds
    created_at: datetime  # timezone-aware, UTC
    media_url: str  # HLS playlist or MP4
    thumbnail_url: str = ""
    is_mature: bool = False
    clipper_name: str = ""  # the viewer who cut the clip
    language: str = ""  # filled in from live listings when known

    @property
    def url(self) -> str:
        return f"https://kick.com/{self.channel_slug}/clips/{self.id}"

    @property
    def channel_url(self) -> str:
        return f"https://kick.com/{self.channel_slug}"

    def age_hours(self, now: datetime | None = None) -> float:
        now = now or datetime.now(timezone.utc)
        return max(0.0, (now - self.created_at).total_seconds() / 3600)


@dataclass(frozen=True)
class LiveChannel:
    slug: str
    name: str
    language: str
    viewers: int
