"""Decide which clips are worth publishing, and in what order."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable

from .config import Profile, Selection
from .learning import Rule, factor_for
from .models import Clip
from .titles import is_offensive


def score(clip: Clip, now: datetime | None = None) -> float:
    """Views, discounted by age so a fresh clip with momentum beats a stale one."""
    return clip.views / (clip.age_hours(now) + 2) ** 0.5


def reject_reason(
    clip: Clip,
    profile: Profile,
    sel: Selection,
    already_published: Callable[[str], bool],
    now: datetime | None = None,
    not_before: datetime | None = None,
    big_channels: set[str] | None = None,
    rules: list[Rule] | None = None,
    channel_starts: dict[str, datetime] | None = None,
) -> str | None:
    """Why this clip can't be used, or None if it qualifies.

    Featured channels skip the size, language and allow-list rules and have
    their own view bar; everything else applies to them too.
    """
    slug = clip.channel_slug.lower()
    featured = slug in {c.lower() for c in sel.featured_channels}
    allowed = {c.lower() for c in sel.allow_channels}
    if already_published(clip.id):
        return "already published"
    if not_before and clip.created_at < not_before:
        return "made before the start time"
    own_start = (channel_starts or {}).get(slug)
    if own_start and clip.created_at < own_start:
        return "made before this channel's start time"
    if clip.category_slug != profile.kick_category:
        return f"other category ({clip.category_slug or 'none'})"
    if slug in {c.lower() for c in sel.block_channels}:
        return "channel blocked"
    if allowed and slug not in allowed and not featured:
        return "channel not on allow list"
    if (sel.top_channels_only and big_channels is not None and not featured
            and slug not in big_channels and slug not in allowed):
        return "not one of the biggest channels"
    if clip.is_mature and not sel.allow_mature:
        return "marked mature"
    if is_offensive(clip.title):
        return "offensive title"
    if rules and factor_for(clip, rules) == 0:
        return "ruled out by one of your rules"
    if clip.duration < sel.min_duration:
        return f"too short ({clip.duration:.0f}s)"
    if clip.duration > sel.max_duration:
        return f"too long ({clip.duration:.0f}s)"
    if clip.views < (sel.featured_min_views if featured else profile.min_views) and not (featured and clip.origin == "auto"):
        # A featured streamer's own cuts need no bar: their chat spikes are
        # measured against their own chat, however small it is.
        return f"too few views ({clip.views})"
    if clip.age_hours(now) > sel.max_age_hours:
        return f"too old ({clip.age_hours(now):.0f}h)"
    if sel.languages and not featured:
        wanted = {lang.lower() for lang in sel.languages}
        if clip.language:
            # "English (India)" should match a wanted "English".
            if not any(clip.language.lower().startswith(w) for w in wanted):
                return f"language {clip.language}"
        elif sel.drop_unknown_language:
            return "language unknown"
    return None


def rank(
    clips: list[Clip],
    profile: Profile,
    sel: Selection,
    already_published: Callable[[str], bool],
    now: datetime | None = None,
    not_before: datetime | None = None,
    big_channels: set[str] | None = None,
    rules: list[Rule] | None = None,
    cap_channels: bool = True,
    channel_starts: dict[str, datetime] | None = None,
) -> tuple[list[Clip], list[tuple[Clip, str]]]:
    """Return (qualifying clips best-first, rejected clips with reasons).

    The qualifying list is capped per channel (unless `cap_channels` is off)
    but otherwise uncapped: the caller works down it until it has published
    enough.
    """
    now = now or datetime.now(timezone.utc)
    unique: dict[str, Clip] = {}
    for clip in clips:
        kept = unique.get(clip.id)
        if kept is None or clip.views > kept.views:
            unique[clip.id] = clip

    accepted: list[Clip] = []
    rejected: list[tuple[Clip, str]] = []
    for clip in unique.values():
        reason = reject_reason(clip, profile, sel, already_published, now, not_before,
                               big_channels, rules, channel_starts)
        if reason:
            rejected.append((clip, reason))
        else:
            accepted.append(clip)

    # Learned and taught rules raise or lower a clip's place in the queue.
    accepted.sort(key=lambda c: score(c, now) * factor_for(c, rules or []), reverse=True)
    if not cap_channels:  # the caller applies the per-channel limit itself
        return accepted, rejected
    per_channel: dict[str, int] = {}
    chosen: list[Clip] = []
    for clip in accepted:
        count = per_channel.get(clip.channel_slug, 0)
        if count >= sel.max_per_channel:
            rejected.append((clip, "channel cap for this run"))
            continue
        per_channel[clip.channel_slug] = count + 1
        chosen.append(clip)
    return chosen, rejected
