"""Command line: `python -m clipper discover | run | auth`."""

from __future__ import annotations

import argparse
import logging
import os
import shutil
import sys
from dataclasses import replace
from pathlib import Path

from . import download as dl
from . import render as rnd
from .config import ConfigError, Settings, load_settings
from .kick import KickClient, KickError
from .models import Clip
from .ranking import rank, score
from .state import State
from .titles import build_metadata
from .youtube import QuotaExceeded, YouTube, YouTubeError, authorize

log = logging.getLogger("clipper")

YT_ENV = ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN")


def discover(settings: Settings, kick: KickClient) -> list[Clip]:
    """Collect candidate clips: the category's top feed plus the biggest live channels."""
    profile, sel = settings.active, settings.selection
    clips = kick.category_clips(profile.kick_category, "view", sel.window)
    log.info("category feed: %d clips", len(clips))

    # With an allow list, read exactly those channels; otherwise the biggest live ones.
    languages: dict[str, str] = {}
    channels: list[str] = [c.lower() for c in sel.allow_channels]
    if sel.top_live_channels > 0 or sel.languages:
        try:
            live = kick.live_channels(profile.kick_category, max(sel.top_live_channels, 30))
        except KickError as exc:
            log.warning("could not list live channels: %s", exc)
            live = []
        languages = {ch.slug.lower(): ch.language for ch in live}
        wanted = {lang.lower() for lang in sel.languages}
        for ch in live:
            if sel.allow_channels or len(channels) >= sel.top_live_channels:
                break
            if wanted and not any(ch.language.lower().startswith(w) for w in wanted):
                continue
            channels.append(ch.slug.lower())

    blocked = {c.lower() for c in sel.block_channels}
    for slug in channels:
        if slug in blocked:
            continue
        try:
            found = kick.channel_clips(slug, "view", sel.window)
        except KickError as exc:
            log.warning("skipping channel %s: %s", slug, exc)
            continue
        clips.extend(found)
    log.info("with %d channel feeds: %d clips", len(channels), len(clips))

    return [
        replace(c, language=languages.get(c.channel_slug.lower(), "")) if not c.language else c
        for c in clips
    ]


def _table(rows: list[Clip]) -> str:
    lines = [f"{'score':>7} {'views':>6} {'sec':>4} {'age':>5}  {'channel':<20} title"]
    for c in rows:
        lines.append(
            f"{score(c):7.1f} {c.views:6d} {c.duration:4.0f} {c.age_hours():4.0f}h  "
            f"{c.channel_slug[:20]:<20} {c.title[:60]}"
        )
    return "\n".join(lines)


def cmd_discover(settings: Settings, args: argparse.Namespace) -> int:
    kick = KickClient()
    state = State(settings.state_path)
    chosen, rejected = rank(discover(settings, kick), settings.active, settings.selection, state.has)
    print(f"Profile {settings.profile} ({settings.active.kick_category}): "
          f"{len(chosen)} clips qualify, {len(rejected)} rejected\n")
    print(_table(chosen[: args.limit or 20]))
    if args.verbose and rejected:
        print("\nRejected:")
        for clip, why in sorted(rejected, key=lambda r: -r[0].views)[:30]:
            print(f"  {clip.views:6d}  {clip.channel_slug[:20]:<20} {why}")
    return 0


def _summary(lines: list[str]) -> None:
    text = "\n".join(lines)
    print("\n" + text)
    target = os.environ.get("GITHUB_STEP_SUMMARY")
    if target:
        with open(target, "a", encoding="utf-8") as handle:
            handle.write(text + "\n")


def cmd_run(settings: Settings, args: argparse.Namespace) -> int:
    profile, pub = settings.active, settings.publish
    shorts = settings.render.layout == "shorts"
    state = State(settings.state_path)

    youtube = None
    if not args.dry_run:
        missing = [name for name in YT_ENV if not os.environ.get(name)]
        if missing:
            log.error("missing %s — set them, or use --dry-run to render without uploading",
                      ", ".join(missing))
            return 2
        youtube = YouTube(*(os.environ[name] for name in YT_ENV))

    budget = pub.max_per_run if args.limit is None else args.limit
    if not args.dry_run:
        budget = min(budget, pub.max_per_day - state.uploads_last_day())
    if budget <= 0:
        _summary(["Nothing to do: the daily upload limit is already used up."])
        return 0

    try:
        chosen, rejected = rank(discover(settings, KickClient()), profile, settings.selection,
                                state.has)
    except KickError as exc:
        log.error("%s", exc)
        return 1
    log.info("%d clips qualify, %d rejected", len(chosen), len(rejected))

    work, out = Path(settings.work_dir), Path(settings.out_dir)
    done: list[str] = []
    failed = 0
    for clip in chosen:
        if len(done) >= budget:
            break
        meta = build_metadata(clip, profile, pub, shorts)
        log.info("clip %s by %s (%d views): %s", clip.id, clip.channel_slug, clip.views,
                 meta["title"])
        try:
            raw = dl.download(clip.media_url, work, clip.id)
            video = rnd.render(
                raw, out / f"{clip.channel_slug}-{clip.id}.mp4", settings.render,
                title=meta["clean_title"], streamer=clip.channel_name,
                channel_slug=clip.channel_slug,
                max_duration=settings.selection.max_duration + 1,
            )
        except (dl.DownloadError, rnd.RenderError) as exc:
            log.warning("skipping %s: %s", clip.id, exc)
            failed += 1
            continue

        if youtube is None:
            done.append(f"- rendered `{video}` — {meta['title']}")
            continue
        try:
            video_id = youtube.upload(
                video, title=meta["title"], description=meta["description"], tags=meta["tags"],
                category_id=pub.category_id, privacy=pub.privacy,
            )
        except QuotaExceeded as exc:
            log.warning("stopping: %s", exc)
            break
        except YouTubeError as exc:
            log.error("%s", exc)
            _summary(done + [f"Upload failed: {exc}"])
            return 1
        state.add(clip, video_id, meta["title"])
        state.save()  # after every upload, so a later crash can't cause a repost
        done.append(f"- https://youtu.be/{video_id} ({pub.privacy}) — {meta['title']}")
        if not args.keep:
            video.unlink(missing_ok=True)

    if not args.keep:
        shutil.rmtree(work, ignore_errors=True)
    verb = "Rendered" if args.dry_run else "Published"
    head = f"{verb} {len(done)} clip(s) for {profile.label}"
    if failed:
        head += f"; {failed} could not be processed"
    if not done and not chosen:
        head += " — no clip met the selection rules this run"
    _summary([head, *done])
    # Every candidate failing points at a systemic problem (e.g. Kick blocking us).
    return 1 if failed and not done else 0


def cmd_auth(args: argparse.Namespace) -> int:
    client_id = os.environ.get("YT_CLIENT_ID") or input("OAuth client ID: ").strip()
    client_secret = os.environ.get("YT_CLIENT_SECRET") or input("OAuth client secret: ").strip()
    try:
        token = authorize(client_id, client_secret, args.port)
    except YouTubeError as exc:
        log.error("%s", exc)
        return 1
    print("\nRefresh token (store it as the YT_REFRESH_TOKEN secret; treat it like a password):\n")
    print(token)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="clipper", description="Kick clips to YouTube.")
    parser.add_argument("--config", default="config.yaml")
    parser.add_argument("--profile", help="override the profile set in config.yaml")
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    p_discover = sub.add_parser("discover", help="list the clips that would be picked")
    p_discover.add_argument("--limit", type=int)

    p_run = sub.add_parser("run", help="download, render and upload the best clips")
    p_run.add_argument("--dry-run", action="store_true", help="render only, upload nothing")
    p_run.add_argument("--limit", type=int, help="clips to publish this run")
    p_run.add_argument("--keep", action="store_true", help="keep rendered files after upload")

    p_auth = sub.add_parser("auth", help="one-time YouTube sign-in to get a refresh token")
    p_auth.add_argument("--port", type=int, default=8765)

    args = parser.parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S",
    )
    if args.command == "auth":
        return cmd_auth(args)
    try:
        settings = load_settings(args.config, args.profile)
    except ConfigError as exc:
        log.error("%s", exc)
        return 2
    if args.command == "run" and args.dry_run:
        args.keep = True
    return cmd_discover(settings, args) if args.command == "discover" else cmd_run(settings, args)


if __name__ == "__main__":
    sys.exit(main())
