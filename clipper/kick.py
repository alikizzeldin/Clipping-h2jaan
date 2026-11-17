"""Kick discovery: top clips for a category or a channel, and who is live.

Kick's official API (api.kick.com) has no clips endpoints, so this reads the
same JSON feeds the kick.com website uses. They are undocumented and can
change; `parse_clip` is deliberately tolerant and skips anything it can't read.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

import requests

from .models import Clip, LiveChannel

log = logging.getLogger(__name__)

BASE = "https://kick.com"
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)


class KickError(RuntimeError):
    pass


def _parse_time(value: str) -> datetime | None:
    if not value:
        return None
    text = value.strip().replace("Z", "+00:00")
    # Kick sends up to 6+ fractional digits; fromisoformat wants at most 6.
    if "." in text:
        head, _, tail = text.partition(".")
        frac = tail
        zone = ""
        for sep in ("+", "-"):
            if sep in tail:
                frac, _, rest = tail.partition(sep)
                zone = sep + rest
                break
        text = f"{head}.{frac[:6]}{zone}"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _real_time(value: str) -> datetime | None:
    """A timestamp, unless it is the year-1 placeholder Kick's feeds send."""
    parsed = _parse_time(value)
    return parsed if parsed and parsed.year > 2000 else None


def parse_clip(raw: dict[str, Any]) -> Clip | None:
    """Turn one feed entry into a Clip, or None if it is unusable."""
    try:
        clip_id = str(raw["id"])
        channel = raw.get("channel") or {}
        slug = str(channel["slug"])
        media_url = raw.get("video_url") or raw.get("clip_url") or ""
        created = _parse_time(str(raw.get("created_at") or ""))
        if not (clip_id and slug and media_url and created):
            return None
        if str(raw.get("privacy", "public")).lower() not in ("public", "clip_privacy_public"):
            return None
        category = raw.get("category") or {}
        creator = raw.get("creator") or {}
        return Clip(
            id=clip_id,
            source="kick",
            title=str(raw.get("title") or "").strip(),
            channel_slug=slug,
            channel_name=str(channel.get("username") or slug),
            category_slug=str(category.get("slug") or ""),
            category_name=str(category.get("name") or ""),
            views=int(raw.get("view_count") or raw.get("views") or 0),
            likes=int(raw.get("likes_count") or raw.get("likes") or 0),
            duration=float(raw.get("duration") or 0),
            created_at=created,
            media_url=str(media_url),
            thumbnail_url=str(raw.get("thumbnail_url") or ""),
            is_mature=bool(raw.get("is_mature")),
            clipper_name=str(creator.get("username") or ""),
            livestream_id=str(raw.get("livestream_id") or ""),
            started_at=_real_time(str(raw.get("started_at") or "")),
        )
    except (KeyError, TypeError, ValueError):
        return None


class KickClient:
    def __init__(self, session: requests.Session | None = None, pause: float = 0.5):
        self.session = session or requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})
        self.pause = pause
        self._last = 0.0

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = f"{BASE}{path}"
        for attempt in range(4):
            wait = self.pause - (time.monotonic() - self._last)
            if wait > 0:
                time.sleep(wait)
            try:
                resp = self.session.get(url, params=params, timeout=30)
            except requests.RequestException as exc:
                if attempt == 3:
                    raise KickError(f"Kick request failed: {exc}") from exc
                time.sleep(2**attempt)
                continue
            finally:
                self._last = time.monotonic()
            if resp.status_code == 200:
                try:
                    return resp.json()
                except ValueError as exc:
                    raise KickError(f"Kick returned non-JSON for {path}") from exc
            if resp.status_code == 404:
                raise KickError(f"Kick has nothing at {path} (check the category or channel slug)")
            if resp.status_code == 403:
                raise KickError(
                    "Kick refused the request (403). Its bot protection blocks some "
                    "networks; run the agent from a different machine or network."
                )
            if resp.status_code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(2 ** (attempt + 1))
                continue
            raise KickError(f"Kick answered {resp.status_code} for {path}")
        raise KickError(f"Kick request failed for {path}")

    def _clips(self, path: str, sort: str, window: str) -> list[Clip]:
        data = self._get(path, {"sort": sort, "time": window})
        clips = [parse_clip(raw) for raw in (data or {}).get("clips") or []]
        return [c for c in clips if c]

    def category_clips(self, slug: str, sort: str = "view", window: str = "day") -> list[Clip]:
        """Top clips Kick lists under a category.

        The feed also returns clips from other categories, so callers must
        still check `clip.category_slug`.
        """
        return self._clips(f"/api/v2/categories/{slug}/clips", sort, window)

    def channel_clips(self, slug: str, sort: str = "view", window: str = "day") -> list[Clip]:
        return self._clips(f"/api/v2/channels/{slug}/clips", sort, window)

    def category(self, slug: str) -> dict[str, Any]:
        return self._get(f"/api/v1/subcategories/{slug}")

    def clip_moment(self, clip_id: str) -> tuple[str, datetime | None]:
        """(broadcast id, start time) of a clip. The feeds leave the time out;
        the clip's own page has it."""
        data = self._get(f"/api/v2/clips/{clip_id}")
        raw = data.get("clip", data) if isinstance(data, dict) else {}
        return str(raw.get("livestream_id") or ""), _real_time(str(raw.get("started_at") or ""))

    def videos(self, slug: str) -> list[dict[str, Any]]:
        """A channel's broadcasts, newest first, including the one that is live."""
        data = self._get(f"/api/v2/channels/{slug}/videos")
        return data if isinstance(data, list) else []

    def chat_sample(self, channel_id: str, when: datetime) -> list[dict[str, Any]]:
        """Up to 25 chat messages from the 5 seconds starting at `when`."""
        data = self._get(f"/api/v2/channels/{channel_id}/messages",
                         {"start_time": when.strftime("%Y-%m-%dT%H:%M:%S.000Z")})
        return ((data or {}).get("data") or {}).get("messages") or []

    def display_name(self, slug: str) -> str:
        try:
            return str((self._get(f"/api/v2/channels/{slug}").get("user") or {}).get("username") or slug)
        except KickError:
            return slug

    def followers(self, slug: str) -> int:
        """How many followers a channel has (0 if it can't be read)."""
        try:
            return int(self._get(f"/api/v2/channels/{slug}").get("followers_count") or 0)
        except (KickError, TypeError, ValueError):
            return 0

    def live_channels(self, category_slug: str, limit: int = 30) -> list[LiveChannel]:
        """Channels live in a category right now, biggest first."""
        found: list[LiveChannel] = []
        page = 1
        while len(found) < limit and page <= 5:
            data = self._get(
                "/stream/livestreams/en",
                {"subcategory": category_slug, "sort": "desc", "page": page, "limit": 30},
            )
            rows = (data or {}).get("data") or []
            for row in rows:
                channel = row.get("channel") or {}
                slug = channel.get("slug")
                if not slug:
                    continue
                user = channel.get("user") or {}
                found.append(
                    LiveChannel(
                        slug=str(slug),
                        name=str(user.get("username") or slug),
                        language=str(row.get("language") or ""),
                        viewers=int(row.get("viewer_count") or 0),
                    )
                )
            if not rows or not (data or {}).get("next_page_url"):
                break
            page += 1
        return found[:limit]
