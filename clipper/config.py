"""Settings: defaults here, overrides from config.yaml, secrets from the environment."""

from __future__ import annotations

import os
from dataclasses import dataclass, field, fields
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
    hashtags: list[str] = field(default_factory=list)
    min_views: int = 50


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
    allow_channels: list[str] = field(default_factory=list)  # if set, only these
    block_channels: list[str] = field(default_factory=list)


@dataclass
class Render:
    layout: str = "shorts"  # shorts (1080x1920) | landscape (1920x1080)
    zoom: float = 1.35  # shorts: how far the gameplay is scaled past the frame width
    overlay_title: bool = True
    font_path: str = ""
    crf: int = 20
    preset: str = "veryfast"


@dataclass
class Publish:
    privacy: str = "private"  # private | unlisted | public
    max_per_run: int = 2
    max_per_day: int = 6
    category_id: str = "20"  # YouTube "Gaming"
    title_template: str = "{title} | {streamer} {game}"
    fallback_title_template: str = "{streamer} {game} clip"
    description_footer: str = ""


@dataclass
class Settings:
    profile: str
    profiles: dict[str, Profile]
    selection: Selection = field(default_factory=Selection)
    render: Render = field(default_factory=Render)
    publish: Publish = field(default_factory=Publish)
    state_path: str = "state/published.json"
    work_dir: str = "work"
    out_dir: str = "out"

    @property
    def active(self) -> Profile:
        return self.profiles[self.profile]


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

    chosen = profile or os.environ.get("CLIPPER_PROFILE") or raw.get("profile")
    if not chosen:
        raise ConfigError("no profile selected: set `profile:` in config.yaml")
    if chosen not in profiles:
        raise ConfigError(f"profile '{chosen}' is not defined (have: {', '.join(profiles)})")

    settings = Settings(
        profile=chosen,
        profiles=profiles,
        selection=_build(Selection, raw.get("selection"), "selection"),
        render=_build(Render, raw.get("render"), "render"),
        publish=_build(Publish, raw.get("publish"), "publish"),
        state_path=raw.get("state_path", "state/published.json"),
        work_dir=raw.get("work_dir", "work"),
        out_dir=raw.get("out_dir", "out"),
    )

    privacy = os.environ.get("CLIPPER_PRIVACY")
    if privacy:
        settings.publish.privacy = privacy
    if settings.publish.privacy not in ("private", "unlisted", "public"):
        raise ConfigError("publish.privacy must be private, unlisted or public")
    if settings.render.layout not in ("shorts", "landscape"):
        raise ConfigError("render.layout must be shorts or landscape")
    if settings.selection.window not in ("day", "week", "month", "all"):
        raise ConfigError("selection.window must be day, week, month or all")
    return settings
