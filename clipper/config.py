"""Settings: defaults here, overrides from config.yaml, secrets from the environment."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field, fields
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


class ConfigError(ValueError):
    pass


@dataclass
class Profile:
    """One game the agent can clip. Switch between them with `profile:`."""

    kick_category: str
    label: str  # how the game is written in titles, e.g. "GTA 6"
    hashtags: list[str] = field(default_factory=list)  # with the streamer: the description's 10 keywords
    min_views: int = 50
    theme: str = ""  # a name from `themes:`; empty = blurred-video background


@dataclass
class Theme:
    """The look of the vertical frame around the gameplay."""

    background: str = ""  # 1080x1920 image; empty = blurred copy of the clip
    border: list[str] = field(default_factory=lambda: ["#FFFFFF", "#C9C9C9"])  # left, right
    glow: str = ""  # colour of the glow around the window and the game label
    highlight: str = "#FFE14D"  # the caption word being spoken
    outline: str = "#000000"  # outline of the label and title text
    caption_style: str = "outline"  # outline (white, black edge) | neon (glowing tubes)
    caption_glow: float = 0.3  # neon backlight: 0 = none, 1 = strongest
    # Where things sit, in a 1080x1920 frame. Match these to the artwork.
    window_top: int = 420  # y where the gameplay starts
    window_inset: int = 24  # gap between the gameplay and the left/right edges
    caption_floor: int = 1560  # captions stay above this line
    radius: int = 30  # corner rounding of the gameplay window
    border_width: int = 6  # 0 = no border around the gameplay
    show_label: bool = True  # draw the game name (turn off when the artwork has a logo)
    show_title: bool = True  # draw the clip's title under it


@dataclass
class Selection:
    window: str = "day"  # day | week | month | all — Kick's "top clips" window
    max_age_hours: float = 36
    min_duration: float = 8
    max_duration: float = 90
    allow_mature: bool = False
    max_per_channel: int = 1  # per run, so one streamer can't fill the feed
    top_live_channels: int = 10  # also pull clips from the biggest live channels
    languages: list[str] = field(default_factory=list)  # e.g. ["English"]; empty = any
    drop_unknown_language: bool = False
    top_channels_only: bool = False  # use only the biggest live channels (and featured ones)
    featured_channels: list[str] = field(default_factory=list)  # favourites, always followed
    featured_min_views: int = 20  # their own, lower view bar
    # Channels that start later than everyone else: no clip of theirs made
    # before this time is used, e.g. {sxb: "2026-11-19T00:00:00+03:00"}.
    channel_start: dict[str, str] = field(default_factory=dict)
    allow_channels: list[str] = field(default_factory=list)  # if set, only these
    block_channels: list[str] = field(default_factory=list)
    require_gameplay: bool = False  # skip clips where no game is on screen
    own_clips: bool = False  # also cut highlights from featured channels' streams itself


@dataclass
class Render:
    layout: str = "shorts"  # shorts (1080x1920) | landscape (1920x1080)
    zoom: float = 1.0  # shorts: 1.0 shows the whole picture; above that crops the sides
    show_label: bool = True  # the game name above the gameplay
    overlay_title: bool = True  # the clip's title under the game name
    crf: int = 20
    preset: str = "veryfast"


@dataclass
class Captions:
    """Spoken-word captions, transcribed with Whisper."""

    enabled: bool = True
    model: str = "large-v3-turbo"  # smaller and faster, less accurate: small, medium
    language: str = "auto"  # or a code such as ar / en to skip detection
    max_words: int = 3  # words shown at once
    max_chars: int = 14
    size: int = 150
    english_subtitles: bool = False  # an English line under captions in another language
    translate_model: str = "medium"  # Whisper model used for that translation


@dataclass
class Publish:
    via: str = "buffer"  # buffer (your Buffer account posts it) | youtube (own Google API project)
    buffer_channel_id: str = ""  # the Buffer channel to post to; see `python -m clipper channels`
    buffer_organization_id: str = ""  # for reading view counts; looked up when left empty
    paused: bool = False  # publish nothing (the dashboard's pause switch)
    start_at: str = ""  # e.g. "2026-11-18T13:00:00+02:00": publish nothing before this,
    #                     and only clips made after it
    media_prefix: str = "media"  # branch prefix for clips hosted for Buffer to fetch
    privacy: str = "private"  # private | unlisted | public
    max_per_run: int = 2
    max_per_day: int = 6
    featured_per_day: int = 0  # daily clips reserved for EACH featured channel
    min_gap_hours: float = 0  # shortest time between two posts
    fill_after_hours: float = 12  # a reserved slot opens to anyone after this long with no post
    category_id: str = "20"  # YouTube "Gaming"
    description_footer: str = ""
    # Instagram, connected to the same Buffer organization: the first
    # `instagram_per_day` clips of every 24 hours are also posted there as Reels.
    instagram_channel_id: str = ""  # empty = YouTube only
    instagram_per_day: int = 3
    # Extra batches: until this time, every run also posts up to `burst_per_run`
    # clips outside the daily plan (e.g. on launch day). Empty = off.
    burst_until: str = ""
    burst_per_run: int = 8
    # Extra batches stop when Buffer has fewer requests than this left in its
    # 30-day allowance, so the regular posts never run out.
    buffer_reserve: int = 300
    # How many uploads YouTube takes per rolling 24 hours (an unverified channel
    # gets about 2). Reels post to Instagram at once and wait for a free YouTube
    # slot instead of failing. 0 = no limit (after verifying the channel).
    youtube_per_day: int = 2
    # Buffer counts those per calendar day in the channel's time zone; this is
    # when that day starts, in UTC (seen in the publish history: about 19:00).
    youtube_day_start: str = "19:00"
    # False: clips go to Instagram alone, leaving YouTube's few daily posts to the reels.
    clips_to_youtube: bool = True


@dataclass
class Settings:
    profile: str
    profiles: dict[str, Profile]
    themes: dict[str, Theme] = field(default_factory=dict)
    selection: Selection = field(default_factory=Selection)
    render: Render = field(default_factory=Render)
    captions: Captions = field(default_factory=Captions)
    publish: Publish = field(default_factory=Publish)
    state_path: str = "state/published.json"
    control_dir: str = "control"  # the dashboard's own files: settings.json, rules.json
    dashboard_url: str = ""  # where the owner's settings and rules are fetched from before a run
    work_dir: str = "work"
    out_dir: str = "out"

    def beside_state(self, name: str) -> Path:
        """A file the agent keeps next to its publish history."""
        return Path(self.state_path).parent / name

    @property
    def active(self) -> Profile:
        return self.profiles[self.profile]

    @property
    def theme(self) -> Theme:
        return self.themes.get(self.active.theme) or Theme()

    @property
    def start_time(self) -> datetime | None:
        """`publish.start_at` as an aware datetime, or None when unset."""
        return parse_start(self.publish.start_at)

    @property
    def burst_until(self) -> datetime | None:
        return parse_start(self.publish.burst_until, "publish.burst_until")

    @property
    def channel_starts(self) -> dict[str, datetime]:
        """`selection.channel_start` as {channel: aware datetime}."""
        found = {}
        for channel, value in (self.selection.channel_start or {}).items():
            when = parse_start(str(value), f"selection.channel_start.{channel}")
            if when:
                found[str(channel).lower()] = when
        return found


def parse_start(value: str, name: str = "publish.start_at") -> datetime | None:
    if not str(value or "").strip():
        return None
    try:
        parsed = datetime.fromisoformat(str(value).strip().replace("Z", "+00:00"))
    except ValueError as exc:
        raise ConfigError(
            f"{name} '{value}' is not a time like 2026-11-18T13:00:00+02:00"
        ) from exc
    if parsed.tzinfo is None:
        raise ConfigError(f"{name} needs a UTC offset, e.g. +02:00")
    return parsed.astimezone(timezone.utc)


def _read_json(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _names(value: Any) -> list[str]:
    return [str(v).strip().lower() for v in value if str(v).strip()] if isinstance(value, list) else []


def apply_overrides(settings: "Settings", changes: dict) -> None:
    """Apply the settings saved from the dashboard on top of config.yaml.

    Only the listed settings can be changed this way, and odd values are
    ignored rather than trusted: the file can be edited by hand.
    """
    sel, pub, cap = settings.selection, settings.publish, settings.captions

    def number(key: str, low: float, high: float, whole: bool = True):
        value = changes.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None
        value = min(high, max(low, value))
        return int(value) if whole else float(value)

    for key, target, attr in (
        ("paused", pub, "paused"), ("top_channels_only", sel, "top_channels_only"),
        ("require_gameplay", sel, "require_gameplay"), ("own_clips", sel, "own_clips"),
        ("english_subtitles", cap, "english_subtitles"),
    ):
        if isinstance(changes.get(key), bool):
            setattr(target, attr, changes[key])
    if changes.get("privacy") in ("private", "unlisted", "public"):
        pub.privacy = changes["privacy"]
    for key, target, attr, low, high, whole in (
        ("max_per_day", pub, "max_per_day", 1, 24, True),
        ("featured_per_day", pub, "featured_per_day", 0, 24, True),
        ("min_gap_hours", pub, "min_gap_hours", 0, 24, False),
        ("featured_min_views", sel, "featured_min_views", 0, 10**7, True),
        ("max_duration", sel, "max_duration", 15, 175, True),
        ("min_views", settings.active, "min_views", 0, 10**7, True),
        ("instagram_per_day", pub, "instagram_per_day", 0, 24, True),
    ):
        value = number(key, low, high, whole)
        if value is not None:
            setattr(target, attr, value)
    if "max_per_day" in changes or "featured_per_day" in changes:
        # Each featured streamer's share: together they can't take more than the day.
        pub.featured_per_day = min(pub.featured_per_day, pub.max_per_day // max(1, len(sel.featured_channels)))
    for key, attr in (("featured_channels", "featured_channels"), ("block_channels", "block_channels")):
        if isinstance(changes.get(key), list):
            setattr(sel, attr, _names(changes[key]))
    if isinstance(changes.get("languages"), list):
        sel.languages = [str(v).strip() for v in changes["languages"] if str(v).strip()]
    glow = number("caption_glow", 0, 1, whole=False)
    if glow is not None and settings.active.theme in settings.themes:
        settings.themes[settings.active.theme].caption_glow = glow


def _build(cls: type, data: Any, where: str) -> Any:
    if data is None:
        data = {}
    if not isinstance(data, dict):
        raise ConfigError(f"{where} must be a mapping")
    known = {f.name for f in fields(cls)}
    unknown = sorted(set(data) - known)
    if unknown:
        raise ConfigError(f"{where}: unknown setting(s) {', '.join(unknown)}")
    try:
        return cls(**data)
    except TypeError as exc:
        raise ConfigError(f"{where}: {exc}") from exc


def load_settings(path: str | Path = "config.yaml", profile: str | None = None) -> Settings:
    path = Path(path)
    if not path.exists():
        raise ConfigError(f"config file not found: {path}")
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not isinstance(raw, dict):
        raise ConfigError("config.yaml must be a mapping")

    top_known = {f.name for f in fields(Settings)}
    unknown = sorted(set(raw) - top_known)
    if unknown:
        raise ConfigError(f"config.yaml: unknown setting(s) {', '.join(unknown)}")

    profiles_raw = raw.get("profiles") or {}
    if not isinstance(profiles_raw, dict) or not profiles_raw:
        raise ConfigError("config.yaml needs at least one entry under `profiles`")
    profiles = {
        name: _build(Profile, body, f"profiles.{name}") for name, body in profiles_raw.items()
    }

    themes_raw = raw.get("themes") or {}
    if not isinstance(themes_raw, dict):
        raise ConfigError("`themes` must be a mapping")
    themes = {name: _build(Theme, body, f"themes.{name}") for name, body in themes_raw.items()}
    for name, theme in themes.items():
        colors = [*theme.border, theme.highlight, theme.outline] + ([theme.glow] if theme.glow else [])
        bad = [c for c in colors if not re.fullmatch(r"#[0-9a-fA-F]{6}", str(c))]
        if bad or len(theme.border) != 2:
            raise ConfigError(
                f"themes.{name}: colours must look like \"#FF3D9A\" and `border` needs two"
                + (f" (got {bad[0]!r})" if bad else "")
            )
        if theme.caption_style not in ("outline", "neon"):
            raise ConfigError(f"themes.{name}: caption_style must be outline or neon")
    for name, prof in profiles.items():
        if prof.theme and prof.theme not in themes:
            raise ConfigError(f"profiles.{name}: theme '{prof.theme}' is not defined under `themes`")

    chosen = profile or os.environ.get("CLIPPER_PROFILE") or raw.get("profile")
    if not chosen:
        raise ConfigError("no profile selected: set `profile:` in config.yaml")
    if chosen not in profiles:
        raise ConfigError(f"profile '{chosen}' is not defined (have: {', '.join(profiles)})")

    settings = Settings(
        profile=chosen,
        profiles=profiles,
        themes=themes,
        selection=_build(Selection, raw.get("selection"), "selection"),
        render=_build(Render, raw.get("render"), "render"),
        captions=_build(Captions, raw.get("captions"), "captions"),
        publish=_build(Publish, raw.get("publish"), "publish"),
        state_path=raw.get("state_path", "state/published.json"),
        control_dir=raw.get("control_dir", "control"),
        dashboard_url=str(raw.get("dashboard_url") or ""),
        work_dir=raw.get("work_dir", "work"),
        out_dir=raw.get("out_dir", "out"),
    )

    apply_overrides(settings, _read_json(Path(settings.control_dir) / "settings.json"))

    privacy = os.environ.get("CLIPPER_PRIVACY")
    if privacy:
        settings.publish.privacy = privacy
    if settings.publish.privacy not in ("private", "unlisted", "public"):
        raise ConfigError("publish.privacy must be private, unlisted or public")
    if settings.render.layout not in ("shorts", "landscape"):
        raise ConfigError("render.layout must be shorts or landscape")
    if settings.publish.via not in ("buffer", "youtube"):
        raise ConfigError("publish.via must be buffer or youtube")
    if settings.publish.via == "buffer" and settings.render.layout != "shorts":
        raise ConfigError("Buffer only publishes vertical YouTube Shorts: use render.layout: shorts")
    parse_start(settings.publish.start_at)
    if not isinstance(settings.selection.channel_start, dict):
        raise ConfigError("selection.channel_start must map channel names to start times")
    settings.channel_starts  # reports any start time that can't be read
    if settings.publish.featured_per_day > settings.publish.max_per_day:
        raise ConfigError("publish.featured_per_day can't be more than publish.max_per_day")
    if settings.selection.window not in ("day", "week", "month", "all"):
        raise ConfigError("selection.window must be day, week, month or all")
    return settings
