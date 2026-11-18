"""Whose turn it is: the daily limit, spacing between posts, and each featured
streamer's daily share."""

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
    `max_per_day` daily clips, each featured streamer has `featured_per_day`
    of its own, and the rest go to everyone else. Featured streamers who are
    behind go first, the one with the fewest posts that day before the
    others. A held slot that its streamer can't fill is opened to anyone
    once nothing has been posted for `fill_after_hours`.
    """
    total = len(uploads)
    if total >= pub.max_per_day:
        return [], "today's clips are all posted"
    last = max((when for when, _ in uploads), default=None)
    idle = (now - last).total_seconds() / 3600 if last else None
    if not ignore_gap and idle is not None and idle < pub.min_gap_hours:
        return [], f"the next clip is due in {pub.min_gap_hours - idle:.1f} hours"

    each = pub.featured_per_day if featured else 0
    reserved = min(each * len(featured), pub.max_per_day)
    posted: dict[str, int] = {}
    for _, channel in uploads:
        posted[channel.lower()] = posted.get(channel.lower(), 0) + 1
    featured_done = sum(min(posted.get(name, 0), each) for name in featured)
    others_left = (pub.max_per_day - reserved) - (total - featured_done)
    behind = {name for name in featured if posted.get(name, 0) < each}

    # Stable sort: among streamers equally far along, the ranking's order stays.
    favourites = sorted((c for c in candidates if c.channel_slug.lower() in behind),
                        key=lambda c: posted.get(c.channel_slug.lower(), 0))
    others = [c for c in candidates if c.channel_slug.lower() not in featured]

    if favourites:
        return favourites, "a featured channel's slot"
    if others_left > 0 and others:
        return others, "an open slot"
    if others and (idle is None or idle >= pub.fill_after_hours):
        return others, "a held slot nobody had filled"
    if not candidates:
        return [], "no clip met the selection rules"
    if behind:
        return [], f"the remaining slots are held for {', '.join(sorted(behind))}"
    return [], "the remaining slots are held for other channels"
