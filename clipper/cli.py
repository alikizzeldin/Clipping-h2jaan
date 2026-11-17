"""Command line: `python -m clipper discover | run | channels | auth`."""

from __future__ import annotations

import argparse
import logging
import os
import shutil
import sys
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from pathlib import Path

from . import download as dl
from . import render as rnd
from .buffer import Buffer, BufferError
from .config import ConfigError, Settings, load_settings
from .hosting import GitMediaHost, HostingError
from .kick import KickClient, KickError
from .models import Clip
from .publishers import PublishError, PublishLimit, SetupError, make_publisher
from .quota import plan
from .ranking import rank, score
from .speech import SpeechError, Transcriber
from .state import State
from .subtitles import Chunk, chunk_words, drawable
from .titles import build_metadata
from .youtube import YouTubeError, authorize

log = logging.getLogger("clipper")


def discover(settings: Settings, kick: KickClient) -> tuple[list[Clip], set[str]]:
    """Collect candidate clips and name the biggest channels.

    Reads the category's top feed, the feeds of the biggest live channels and
    of every featured channel. Returns (clips, slugs of the biggest channels):
    the ones with the most live viewers now, plus the most-followed ones.
    """
    profile, sel = settings.active, settings.selection
    clips = kick.category_clips(profile.kick_category, "view", sel.window)
    log.info("category feed: %d clips", len(clips))

    # With an allow list, read exactly those channels; otherwise the biggest live ones.
    languages: dict[str, str] = {}
    big: list[str] = [c.lower() for c in sel.allow_channels]
    if sel.top_live_channels > 0 or sel.languages:
        try:
            live = kick.live_channels(profile.kick_category, max(sel.top_live_channels, 30))
        except KickError as exc:
            log.warning("could not list live channels: %s", exc)
            live = []
        languages = {ch.slug.lower(): ch.language for ch in live}
        wanted = {lang.lower() for lang in sel.languages}
        for ch in live:
            if sel.allow_channels or len(big) >= sel.top_live_channels:
                break
            if wanted and not any(ch.language.lower().startswith(w) for w in wanted):
                continue
            big.append(ch.slug.lower())
            log.debug("big channel: %s (%d viewers)", ch.slug, ch.viewers)

    blocked = {c.lower() for c in sel.block_channels}
    feeds = list(dict.fromkeys([c.lower() for c in sel.featured_channels] + big))
    for slug in feeds:
        if slug in blocked:
            continue
        try:
            found = kick.channel_clips(slug, "view", sel.window)
        except KickError as exc:
            log.warning("skipping channel %s: %s", slug, exc)
            continue
        clips.extend(found)
    log.info("with %d channel feeds: %d clips", len(feeds), len(clips))

    clips = [
        replace(c, language=languages.get(c.channel_slug.lower(), "")) if not c.language else c
        for c in clips
    ]
    if sel.top_channels_only and not sel.allow_channels:
        big += _most_followed(kick, clips, profile.kick_category, sel.top_live_channels)
    return clips, set(big)


def _most_followed(kick: KickClient, clips: list[Clip], category: str, count: int) -> list[str]:
    """The `count` most-followed channels among those with clips in the category.

    Being live right now is a narrow view of who is big: a major streamer who
    went offline an hour ago still has the day's best clips.
    """
    channels = sorted({c.channel_slug.lower() for c in clips if c.category_slug == category})
    sizes = {slug: kick.followers(slug) for slug in channels}
    ranked = sorted(sizes, key=lambda slug: sizes[slug], reverse=True)[:count]
    for slug in ranked:
        log.debug("big channel: %s (%d followers)", slug, sizes[slug])
    return ranked


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
    clips, big = discover(settings, kick)
    chosen, rejected = rank(clips, settings.active, settings.selection, state.has, big_channels=big)
    print(f"Profile {settings.profile} ({settings.active.kick_category}): "
          f"{len(chosen)} clips qualify, {len(rejected)} rejected\n")
    if settings.selection.top_channels_only:
        print("Biggest channels: " + (", ".join(sorted(big)) or "none found") + "\n")
    print(_table(chosen[: args.limit or 20]))
    if args.verbose and rejected:
        print("\nRejected:")
        for clip, why in sorted(rejected, key=lambda r: -r[0].views)[:30]:
            print(f"  {clip.views:6d}  {clip.channel_slug[:20]:<20} {why}")
    return 0


def _captions(transcriber: Transcriber, media: Path, settings: Settings) -> list[Chunk]:
    """Spoken captions for one clip; empty when nobody speaks."""
    words, language = transcriber.transcribe(media)
    if not words:
        log.info("no speech found, rendering without captions")
        return []
    if not all(drawable(w.text) for w in words):
        log.info("speech is in a script the caption font can't draw (%s), no captions", language)
        return []
    cfg = settings.captions
    chunks = chunk_words(words, cfg.max_words, cfg.max_chars)
    log.info("captions: %d words in %d lines (%s)", len(words), len(chunks), language or "?")
    return chunks


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
    now = datetime.now(timezone.utc)
    start = settings.start_time

    publisher = None
    if not args.dry_run:
        if start and now < start:
            _summary([f"Not started yet: publishing begins at {pub.start_at}."])
            return 0
        try:
            publisher = make_publisher(pub)
        except SetupError as exc:
            log.error("%s — or use --dry-run to render without publishing", exc)
            return 2

    notes: list[str] = []
    if publisher:
        notes = publisher.prepare(state)
        state.save()

    budget = pub.max_per_run if args.limit is None else args.limit
    featured = {c.lower() for c in settings.selection.featured_channels}
    day_ago = now - timedelta(hours=24)
    if publisher:  # skip the whole search when nothing may be posted yet
        _, why = plan([], featured, pub, state.recent(day_ago), now)
        if why != "no clip met the selection rules":
            _summary([f"Nothing published: {why}.", *notes])
            return 0

    try:
        clips, big = discover(settings, KickClient())
    except KickError as exc:
        log.error("%s", exc)
        return 1
    chosen, rejected = rank(
        clips, profile, settings.selection, state.has,
        not_before=start if publisher else None,  # dry runs may use older clips
        big_channels=big,
    )
    log.info("%d clips qualify, %d rejected", len(chosen), len(rejected))

    work, out = Path(settings.work_dir), Path(settings.out_dir)
    transcriber = Transcriber(settings.captions) if settings.captions.enabled else None
    done: list[str] = []
    tried: set[str] = set()
    rendered: list[tuple[datetime, str]] = []  # dry runs: stands in for the publish history
    failed = 0
    while len(done) < budget:
        uploads = state.recent(day_ago) if publisher else rendered
        queue, why = plan([c for c in chosen if c.id not in tried], featured, pub, uploads, now,
                          ignore_gap=publisher is None)
        if not queue:
            if not done:
                notes.append(f"Nothing {'published' if publisher else 'rendered'}: {why}.")
            break
        clip = queue[0]
        tried.add(clip.id)
        meta = build_metadata(clip, profile, pub, shorts)
        log.info("clip %s by %s (%d views, %s): %s", clip.id, clip.channel_slug, clip.views, why,
                 meta["title"])
        try:
            raw = dl.download(clip.media_url, work, clip.id)
            chunks = _captions(transcriber, raw, settings) if transcriber else []
            video = rnd.render(
                raw, out / f"{clip.id}.mp4", settings.render, settings.theme, settings.captions,
                label=profile.label, title=meta["clean_title"], chunks=chunks,
                max_duration=settings.selection.max_duration + 1,
            )
        except (dl.DownloadError, rnd.RenderError, SpeechError) as exc:
            log.warning("skipping %s: %s", clip.id, exc)
            failed += 1
            continue

        if publisher is None:
            rendered.append((now, clip.channel_slug))
            done.append(f"- rendered `{video}` — {meta['title']}")
            if args.check_hosting and len(done) == 1:
                notes.append(_check_hosting(video, clip.id, pub.media_prefix))
            continue
        try:
            result = publisher.publish(video, clip, meta)
        except PublishLimit as exc:
            log.warning("stopping: %s", exc)
            notes.append(f"Stopped early: {exc}")
            break
        except PublishError as exc:
            log.error("%s", exc)
            _summary([*done, f"Publishing failed: {exc}", *notes])
            return 1
        state.add(clip, result.ref, meta["title"], via=result.via, link=result.link)
        state.save()  # after every upload, so a later crash can't cause a repost
        where = result.link or f"sent to Buffer (post {result.ref})"
        done.append(f"- {where} ({pub.privacy}) — {meta['title']}")
        if not args.keep:
            video.unlink(missing_ok=True)

    if not args.keep:
        shutil.rmtree(work, ignore_errors=True)
    verb = "Published" if publisher else "Rendered"
    head = f"{verb} {len(done)} clip(s) for {profile.label}"
    if failed:
        head += f"; {failed} could not be processed"
    _summary([head, *done, *notes])
    # Every candidate failing points at a systemic problem (e.g. Kick blocking us).
    return 1 if failed and not done else 0


def _check_hosting(video: Path, name: str, prefix: str) -> str:
    """Dry-run check that a clip can be hosted publicly; leaves nothing behind."""
    host = GitMediaHost(".", prefix=prefix)
    try:
        url, branch = host.upload(video, f"check-{name}")
        try:
            host.wait_until_public(url)
        finally:
            host.remove(branch)
    except HostingError as exc:
        return f"Hosting check FAILED: {exc}"
    return "Hosting check passed: a clip was publicly reachable, then removed."


def cmd_channels(args: argparse.Namespace) -> int:
    """List the Buffer channels the key can post to, and check the configured one."""
    key = os.environ.get("BUFFER_API_KEY", "")
    if not key:
        log.error("BUFFER_API_KEY is not set (add it as a repository secret)")
        return 2
    try:
        channels = Buffer(key, "").channels()
    except BufferError as exc:
        log.error("%s", exc)
        return 1
    try:
        wanted = load_settings(args.config, args.profile).publish.buffer_channel_id
    except ConfigError:
        wanted = ""
    for ch in channels:
        marks = " (disconnected)" if ch.get("isDisconnected") else ""
        marks += "  <- the channel set in config.yaml" if ch["id"] == wanted else ""
        print(f"{ch['id']}  {ch['service']:<10} {ch['name']}{marks}")
    target = next((ch for ch in channels if ch["id"] == wanted), None)
    if wanted and not target:
        log.error("the channel set in config.yaml (%s) is not one this key can post to", wanted)
        return 1
    if target and target.get("isDisconnected"):
        log.error("the configured channel is disconnected in Buffer; reconnect it there")
        return 1
    if target:
        _summary([f"Buffer is connected: the key works and can post to \"{target['name']}\"."])
    return 0


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
    p_run.add_argument("--check-hosting", action="store_true",
                       help="with --dry-run: also test that a clip can be hosted publicly")

    p_auth = sub.add_parser("auth", help="one-time YouTube sign-in (only for publish.via: youtube)")
    p_auth.add_argument("--port", type=int, default=8765)

    sub.add_parser("channels", help="list the Buffer channels your API key can post to")

    args = parser.parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S",
    )
    if args.command == "auth":
        return cmd_auth(args)
    if args.command == "channels":
        return cmd_channels(args)
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
