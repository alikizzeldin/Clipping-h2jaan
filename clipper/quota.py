"""Whose turn it is: the daily limit, spacing between posts, and reserved slots
for featured channels."""

from __future__ import annotations

from datetime import datetime

from .config import Publish
from .models import Clip


def plan(
    candidates: list[Clip],
    featured: set[str],
    pub: Publish,
    uploads: list[tuple[datetime, str]],
    now: datetime,
    ignore_gap: bool = False,
) -> tuple[list[Clip], str]:
    """Which clips may be published right now, best first, and why.

    `candidates` are the qualifying clips, best first. `uploads` are the
    (time, channel) of everything published in the last 24 hours. Of the
    `max_per_day` daily clips, `featured_per_day` are reserved for the
    featured channels and the rest for everyone else. A reserved slot that
    its owner can't fill is opened to anyone once nothing has been posted
    for `fill_after_hours`.
    """
    total = len(uploads)
    if total >= pub.max_per_day:
        return [], "today's clips are all posted"
    last = max((when for when, _ in uploads), default=None)
    idle = (now - last).total_seconds() / 3600 if last else None
    if not ignore_gap and idle is not None and idle < pub.min_gap_hours:
        return [], f"the next clip is due in {pub.min_gap_hours - idle:.1f} hours"

    reserved = min(pub.featured_per_day, pub.max_per_day) if featured else 0
    featured_done = sum(1 for _, channel in uploads if channel.lower() in featured)
    featured_left = reserved - featured_done
    others_left = (pub.max_per_day - reserved) - (total - featured_done)
    favourites = [c for c in candidates if c.channel_slug.lower() in featured]
    others = [c for c in candidates if c.channel_slug.lower() not in featured]

    if featured_left > 0 and favourites:
        return favourites, "a featured channel's slot"
    if others_left > 0 and others:
        return others, "an open slot"
    if candidates and (idle is None or idle >= pub.fill_after_hours):
        return candidates, "a reserved slot nobody had filled"
    if not candidates:
        return [], "no clip met the selection rules"
    if featured_left > 0:
        return [], "the remaining slots are held for a featured channel's next clip"
    return [], "the remaining slots are held for other channels"
