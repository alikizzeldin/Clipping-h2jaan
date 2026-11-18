"""Command line: `python -m clipper discover | run | channels | notify | auth`."""

from __future__ import annotations

import argparse
import json
import logging
import os
import shutil
import sys
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml

from . import download as dl
from . import render as rnd
from .activity import Activity
from .buffer import Buffer, BufferError
from .config import ConfigError, Settings, load_settings
from .control import ControlError
from .control import pull as pull_control
from .highlights import HighlightError, cut_highlight, find_highlights
from .hosting import GitMediaHost, HostingError
from .kick import KickClient, KickError
from .learning import active_rules, factor_for, language_name, learn, update_history
from .models import Clip
from .notify import Notifier
from .publishers import BufferPublisher, PublishError, PublishLimit, SetupError, make_publisher
from .quota import plan
from .ranking import rank, score
from .speech import Line, SpeechError, Transcriber, Transcript, tidy_translation
from .state import State
from .subtitles import Chunk, chunk_words, drawable
from .titles import build_metadata
from .vision import GameplayJudge, VisionError, same_scene
from .youtube import YouTubeError, authorize

log = logging.getLogger("clipper")


BURST_CHANNELS = 16  # how many of the biggest live channels the agent cuts highlights from
BURST_WORKERS = 8  # channels examined side by side
SCENE_DAYS = 2  # a scene posted within this many days is not posted again
MONTH_WINDOW, DAY_WINDOW = 2592000, 86400  # Buffer's allowance windows, in seconds
DAY_RESERVE = 60  # extra batches leave at least this many of Buffer's daily requests


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
    rules = active_rules(Path(settings.control_dir) / "rules.json", settings.beside_state("learned.json"))
    chosen, rejected = rank(clips, settings.active, settings.selection, state.has, big_channels=big, rules=rules)
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


def _captions(transcript: Transcript, settings: Settings) -> list[Chunk]:
    """Caption lines for what is said; empty when nobody speaks."""
    if not transcript.words:
        log.info("no speech found, rendering without captions")
        return []
    if not all(drawable(w.text) for w in transcript.words):
        log.info("speech is in a script the caption font can't draw (%s), no captions", transcript.language)
        return []
    cfg = settings.captions
    chunks = chunk_words(transcript.words, cfg.max_words, cfg.max_chars)
    log.info("captions: %d words in %d lines (%s)", len(transcript.words), len(chunks), transcript.language or "?")
    return chunks


def _summary(lines: list[str]) -> None:
    text = "\n".join(lines)
    print("\n" + text)
    target = os.environ.get("GITHUB_STEP_SUMMARY")
    if target:
        with open(target, "a", encoding="utf-8") as handle:
            handle.write(text + "\n")


def same_moment(clip: Clip, moments: list[tuple[str, float, float]]) -> bool:
    """True if the clip overlaps a moment (broadcast, start, length) already used.

    Several viewers often clip the same few seconds of a stream; each of those
    clips has its own id, so they have to be matched by time.
    """
    if not clip.livestream_id or not clip.started_at:
        return False
    start = clip.started_at.timestamp()
    end = start + clip.duration
    for stream, other_start, other_length in moments:
        if stream != clip.livestream_id:
            continue
        shared = min(end, other_start + other_length) - max(start, other_start)
        if shared > 0.4 * min(clip.duration, other_length or clip.duration):
            return True
    return False


def _study(settings: Settings, state: State, client: Buffer, activity: Activity, now: datetime) -> None:
    """Once a day: read view counts, record history, and learn from the results."""
    try:
        last = datetime.fromisoformat(state.metrics_checked_at)
    except ValueError:
        last = None
    if last and now - last < timedelta(hours=20):
        return
    try:
        organization = settings.publish.buffer_organization_id or client.organization_id()
        numbers = client.metrics(organization)
    except BufferError as exc:
        log.warning("could not read view counts: %s", exc)
        return
    state.metrics_checked_at = now.isoformat(timespec="seconds")
    by_post = {entry.get("video_id"): clip_id for clip_id, entry in state.published.items()}
    for post_id, values in numbers.items():
        clip_id = by_post.get(post_id)
        if clip_id:
            link = values.pop("link", "")
            state.update(clip_id, **values, **({"link": link, "status": "sent"} if link else {}))
    update_history(settings.beside_state("history.json"), state.published, now)

    learned_path = settings.beside_state("learned.json")
    control = _read_json(Path(settings.control_dir) / "rules.json")
    before = _read_json(learned_path).get("rules") or []
    result = learn(state.published, set(control.get("dismissed") or []), now, previous=before)
    learned_path.parent.mkdir(parents=True, exist_ok=True)
    learned_path.write_text(json.dumps(result, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    known = {rule.get("id") for rule in before}
    for rule in result["rules"]:
        if rule["id"] not in known:
            activity.add("learned", f"Learned: {rule['text'][0].lower()}{rule['text'][1:]}")
    log.info("studied %d measured clips, %d rules", result["measured_clips"], len(result["rules"]))


def cmd_run(settings: Settings, args: argparse.Namespace) -> int:
    profile, pub, sel = settings.active, settings.publish, settings.selection
    shorts = settings.render.layout == "shorts"
    state = State(settings.state_path)
    activity = Activity(settings.beside_state("activity.json"))
    notifier = Notifier.from_env()
    now = datetime.now(timezone.utc)
    start = settings.start_time
    live = not args.dry_run  # a live run publishes and keeps records; a dry run only renders

    publisher = None
    if live:
        if pub.paused:
            _summary(["Paused from the dashboard: nothing was published."])
            return 0
        if start and now < start:
            _summary([f"Not started yet: publishing begins at {pub.start_at}."])
            return 0
        try:
            publisher = make_publisher(pub)
        except SetupError as exc:
            log.error("%s — or use --dry-run to render without publishing", exc)
            return 2

    notes: list[str] = []

    def report(kind: str, text: str, link: str = "") -> None:
        activity.add(kind, text, link)
        notes.append(f"- {text}{f' {link}' if link else ''}")
        if kind == "error":
            notifier.send(f"⚠️ {text}")

    def finish(code: int, *lines: str) -> int:
        if live:
            state.save()
            activity.save()
        _summary([*lines, *notes])
        return code

    if publisher:
        publisher.prepare(state, report)
        if isinstance(publisher, BufferPublisher):
            _study(settings, state, publisher.client, activity, now)

    burst = max(0, getattr(args, "burst", 0) or 0)
    if not burst and publisher and settings.burst_until and now < settings.burst_until:
        burst = pub.burst_per_run  # an extra batch every run until then (e.g. launch day)
    budget = burst or (pub.max_per_run if args.limit is None else args.limit)
    featured = {c.lower() for c in sel.featured_channels}
    day_ago = now - timedelta(hours=24)
    if burst:
        # An extra batch (e.g. on launch day): up to `burst` clips now, outside the
        # daily plan. The usual checks still apply, one clip per channel, and
        # nothing from before the start time.
        profile = replace(profile, min_views=min(profile.min_views, sel.featured_min_views))
        log.info("extra batch: up to %d clips, outside the daily plan", burst)
    elif publisher:  # skip the whole search when nothing may be posted yet
        _, why = plan([], featured, pub, state.recent(day_ago), now)
        if why != "no clip met the selection rules":
            return finish(0, f"Nothing published: {why}.")

    rules = active_rules(Path(settings.control_dir) / "rules.json", settings.beside_state("learned.json"))
    kick = KickClient()
    try:
        clips, big = discover(settings, kick)
        if sel.own_clips and featured:
            clips += find_highlights(kick, sorted(featured), profile.kick_category, now,
                                     not_before=settings.channel_starts if publisher else None)
        if sel.own_clips or burst:
            # The agent's own cuts from the biggest live streams come first; viewer
            # clips fill in when there aren't enough.
            blocked = {c.lower() for c in sel.block_channels}
            live_now = [ch.slug.lower() for ch in kick.live_channels(profile.kick_category, BURST_CHANNELS + 10)]
            targets = [slug for slug in dict.fromkeys(live_now)
                       if slug not in blocked and slug not in featured][:BURST_CHANNELS]
            log.info("cutting highlights from %s", ", ".join(targets) or "nobody")
            big |= set(targets)
            clips += find_highlights(kick, targets, profile.kick_category, now,
                                     not_before={slug: start for slug in targets} if start and publisher else None,
                                     connect=KickClient, workers=BURST_WORKERS)
    except KickError as exc:
        log.error("%s", exc)
        report("error", f"The run stopped: {exc}")
        return finish(1, "The run failed.")
    chosen, rejected = rank(
        clips, profile, sel, state.has,
        not_before=start if publisher else None,  # dry runs may use older clips
        big_channels=big, rules=rules,
        channel_starts=settings.channel_starts if publisher else None,
        cap_channels=False,  # applied below to what is actually used, so that when a
        # channel's best clip is dropped its next-best still gets a turn this run
    )
    log.info("%d clips qualify, %d rejected", len(chosen), len(rejected))
    # The agent's own cuts before viewer clips; in an extra batch, featured
    # streamers first and then the streamers posted least today, for more
    # different reactions.
    posted_today = state.posted_by_channel(day_ago)
    chosen.sort(key=lambda c: (
        (c.channel_slug.lower() not in featured) if burst else 0,
        posted_today.get(c.channel_slug.lower(), 0) if burst else 0,
        c.origin != "auto",
    ))  # a stable sort: within each group the ranking's order stays

    work, out = Path(settings.work_dir), Path(settings.out_dir)
    transcriber = Transcriber(settings.captions) if settings.captions.enabled else None
    vision: GameplayJudge | None = GameplayJudge()  # gameplay check and scene comparison
    state.forget_scenes(now - timedelta(days=SCENE_DAYS))
    recent_scenes = state.recent_scenes(now - timedelta(days=SCENE_DAYS))
    done: list[str] = []
    tried: set[str] = set()
    rendered: list[tuple[datetime, str]] = []  # dry runs: stands in for the publish history
    used_moments = state.moments()
    recent_hooks = state.recent_hooks()  # so titles don't repeat the last few
    used_channels: dict[str, int] = {}
    failed = 0

    def drop(clip: Clip, reason: str) -> None:
        """Rule a clip out for good, so later runs don't fetch it again."""
        log.info("skipping %s: %s", clip.id, reason)
        if live:
            state.skip(clip.id, reason)
            activity.add("skipped", f"Skipped a clip from {clip.channel_slug}: {reason}")

    while len(done) < budget:
        uploads = state.recent(day_ago) if publisher else rendered
        open_now = [c for c in chosen if c.id not in tried
                    and used_channels.get(c.channel_slug, 0) < sel.max_per_channel]
        if burst:
            queue, why = open_now, "an extra batch"
        else:
            queue, why = plan(open_now, featured, pub, uploads, now, ignore_gap=publisher is None)
        if not queue:
            if not done:
                notes.append(f"Nothing {'published' if publisher else 'rendered'}: {why}.")
            break
        clip = queue[0]
        tried.add(clip.id)

        if clip.origin == "viewer" and not clip.started_at:
            try:  # the feeds don't say when in the broadcast a clip is from
                stream, began = kick.clip_moment(clip.id)
                clip = replace(clip, livestream_id=stream or clip.livestream_id, started_at=began)
            except KickError as exc:
                log.debug("no timing for %s: %s", clip.id, exc)
        if same_moment(clip, used_moments):
            drop(clip, "the same moment was already posted")
            continue

        log.info("clip %s by %s (%d views, %s)", clip.id, clip.channel_slug, clip.views, why)
        try:
            raw = cut_highlight(clip, work) if clip.origin == "auto" else dl.download(clip.media_url, work, clip.id)
            scene = ""
            if vision:
                try:
                    if sel.require_gameplay:
                        is_game, sureness = vision.is_gameplay(raw)
                        if not is_game:
                            drop(clip, f"no game on screen ({sureness:.0%} sure it is gameplay)")
                            continue
                    scene = vision.fingerprint(raw)
                except VisionError as exc:
                    log.warning("vision checks unavailable, continuing without them: %s", exc)
                    vision = None
                alike = same_scene(scene, recent_scenes) if scene else 0.0
                if alike:
                    drop(clip, f"the same scene was posted recently ({alike:.0%} alike)")
                    continue
            transcript = transcriber.transcribe(raw) if transcriber else Transcript([], "", [])
            if factor_for(clip, rules, transcript.text) == 0:
                drop(clip, "ruled out by one of your rules")
                continue
            chunks = _captions(transcript, settings)
            english: list[Line] = []
            if (transcriber and chunks and settings.captions.english_subtitles
                    and transcript.language not in ("", "en")):
                try:
                    english = tidy_translation(transcriber.translate(raw, transcript.language), transcript.words)
                except SpeechError as exc:
                    log.warning("no English line for %s: %s", clip.id, exc)
            # The title's hook can follow what is said; that is read in English.
            said = transcript.lines if transcript.language == "en" else english
            meta = build_metadata(clip, profile, pub, shorts, launch_at=start,
                                  words=" ".join(line.text for line in said), avoid=recent_hooks)
            video = rnd.render(
                raw, out / f"{clip.id}.mp4", settings.render, settings.theme, settings.captions,
                label=profile.label, title=meta["clean_title"], chunks=chunks, translation=english,
                max_duration=sel.max_duration + 1,
            )
        except (dl.DownloadError, rnd.RenderError, SpeechError, HighlightError) as exc:
            log.warning("skipping %s: %s", clip.id, exc)
            failed += 1
            continue

        if clip.started_at and clip.livestream_id:
            used_moments.append((clip.livestream_id, clip.started_at.timestamp(), clip.duration))
        used_channels[clip.channel_slug] = used_channels.get(clip.channel_slug, 0) + 1
        recent_hooks.insert(0, meta["hook"])
        if scene:
            recent_scenes.append(scene)
        if publisher is None:
            rendered.append((now, clip.channel_slug))
            done.append(f"- rendered `{video}` — {meta['title']}")
            if args.check_hosting and len(done) == 1:
                notes.append(_check_hosting(video, clip.id, pub.media_prefix))
            continue
        if burst and isinstance(publisher, BufferPublisher):
            left = publisher.client.remaining
            if left.get(MONTH_WINDOW, 10**9) < pub.buffer_reserve or left.get(DAY_WINDOW, 10**9) < DAY_RESERVE:
                notes.append(f"Stopped the extra batch to keep Buffer's allowance for the regular posts "
                             f"({left.get(MONTH_WINDOW, '?')} requests left this month, {left.get(DAY_WINDOW, '?')} today).")
                break
        try:
            result = publisher.publish(video, clip, meta)
        except PublishLimit as exc:
            log.warning("stopping: %s", exc)
            notes.append(f"Stopped early: {exc}")
            break
        except PublishError as exc:
            log.error("%s", exc)
            report("error", f"Publishing “{meta['title']}” failed: {exc}")
            return finish(1, *done)
        extra = {"language": language_name(transcript.language)} if transcript.language else {}
        extra["hook"] = meta["hook"]
        if scene:
            extra["scene"] = scene
        if burst:
            extra["burst"] = True
        state.add(clip, result.ref, meta["title"], via=result.via, link=result.link, extra=extra or None)
        state.save()  # after every upload, so a later crash can't cause a repost
        insta = _to_instagram(publisher, state, clip.id, meta["caption"], now, pub, report)
        by = "cut by the agent" if clip.origin == "auto" else f"from {clip.channel_slug}"
        activity.add("published", f"Published “{meta['title']}” ({by})", result.link)
        notifier.send(f"🎬 Published: {meta['title']}\n{result.link or 'Sent to Buffer; the YouTube link follows shortly.'}")
        where = result.link or f"sent to Buffer (post {result.ref})"
        done.append(f"- {where} ({pub.privacy}) — {meta['title']}{' + Instagram' if insta else ''}")
        if not args.keep:
            video.unlink(missing_ok=True)

    if not args.keep:
        shutil.rmtree(work, ignore_errors=True)
    verb = "Published" if publisher else "Rendered"
    head = f"{verb} {len(done)} clip(s) for {profile.label}"
    if failed:
        head += f"; {failed} could not be processed"
    if failed and not done:
        # Every candidate failing points at a systemic problem (e.g. Kick blocking us).
        report("error", f"{failed} clip(s) could not be processed and nothing was published")
        return finish(1, head, *done)
    return finish(0, head, *done)


def _to_instagram(publisher, state: State, clip_id: str, caption: str, now: datetime, pub, report,
                  url: str = "") -> bool:
    """Also post a clip to Instagram, while today's Instagram share is not used up."""
    if not isinstance(publisher, BufferPublisher) or not pub.instagram_channel_id or pub.instagram_per_day <= 0:
        return False
    if state.instagram_since(now - timedelta(hours=24)) >= pub.instagram_per_day:
        return False
    url = url or publisher.last_url
    if not url:
        return False
    try:
        post_id = publisher.to_instagram(url, caption)
    except PublishError as exc:  # Instagram trouble must not stop YouTube posting
        report("error", f"Instagram did not take a clip: {exc}")
        return False
    state.update(clip_id, instagram=post_id, instagram_at=datetime.now(timezone.utc).isoformat(timespec="seconds"))
    state.save()
    return True


def cmd_instagram(settings: Settings, args: argparse.Namespace) -> int:
    """Post clips that are already on YouTube to Instagram too (e.g. the launch batch)."""
    pub, profile = settings.publish, settings.active
    state = State(settings.state_path)
    activity = Activity(settings.beside_state("activity.json"))
    try:
        publisher = make_publisher(pub)
    except SetupError as exc:
        log.error("%s", exc)
        return 2
    if not isinstance(publisher, BufferPublisher) or not pub.instagram_channel_id:
        log.error("Instagram needs publish.via: buffer and publish.instagram_channel_id")
        return 2
    kick = KickClient()
    lines, used = [], state.recent_hooks()
    for clip_id in args.clips:
        entry = state.published.get(clip_id)
        if not entry:
            lines.append(f"- {clip_id}: not in the publish history")
            continue
        if entry.get("instagram"):
            lines.append(f"- {clip_id}: already on Instagram")
            continue
        url = publisher.host.find(clip_id)
        if not url:
            lines.append(f"- {clip_id}: its video is no longer hosted (kept for 24 hours)")
            continue
        slug = str(entry.get("channel", ""))
        try:
            name = kick.display_name(slug) or slug
        except KickError:
            name = slug
        started = entry.get("started_at")
        clip = Clip(
            id=clip_id, source="kick", title="", channel_slug=slug, channel_name=name,
            category_slug=str(entry.get("category", "")), category_name="", views=0, likes=0,
            duration=float(entry.get("duration") or 0), created_at=datetime.fromisoformat(entry["uploaded_at"]),
            media_url="", started_at=datetime.fromisoformat(started) if started else None,
            origin=str(entry.get("origin", "viewer")),
        )
        meta = build_metadata(clip, profile, pub, False, launch_at=settings.start_time, avoid=used)
        used.insert(0, meta["hook"])
        try:
            post_id = publisher.to_instagram(url, meta["caption"])
        except PublishLimit as exc:
            lines.append(f"- stopped: {exc}")
            break
        except PublishError as exc:
            lines.append(f"- {clip_id}: Instagram did not take it: {exc}")
            continue
        state.update(clip_id, instagram=post_id, instagram_at=datetime.now(timezone.utc).isoformat(timespec="seconds"))
        state.save()
        activity.add("published", f"Posted to Instagram: “{meta['clean_title']}”")
        lines.append(f"- {clip_id}: sent to Instagram (post {post_id}) — {meta['clean_title']}")
    activity.save()
    _summary([f"Instagram: {sum('sent to Instagram' in line for line in lines)} of {len(args.clips)} clip(s) sent", *lines])
    return 0 if any("sent to Instagram" in line for line in lines) or not args.clips else 1


def _read_json(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def cmd_notify(args: argparse.Namespace) -> int:
    """Send one message to the owner (used by the workflow when a run crashes)."""
    notifier = Notifier.from_env()
    if not notifier.enabled:
        log.info("no notification channel is set up")
        return 0
    return 0 if notifier.send(args.message) else 1


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


def cmd_pull_control(args: argparse.Namespace) -> int:
    """Copy the owner's dashboard settings into control/. Never fails a run."""
    try:
        raw = yaml.safe_load(Path(args.config).read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError) as exc:
        log.warning("could not read %s: %s", args.config, exc)
        return 0
    url = os.environ.get("CLIPPER_DASHBOARD") or raw.get("dashboard_url")
    if not url:
        log.info("no dashboard_url in the config; using the settings already here")
        return 0
    try:
        changed = pull_control(url, raw.get("control_dir", "control"))
    except ControlError as exc:
        log.warning("%s; using the settings already here", exc)
        return 0
    log.info("dashboard settings: %s", f"updated {' and '.join(changed)}" if changed else "no change")
    return 0


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
    p_run.add_argument("--burst", type=int, default=0, metavar="N",
                       help="one-off: publish up to N clips now from the biggest live channels, "
                            "outside the daily plan (e.g. on launch day)")
    p_run.add_argument("--check-hosting", action="store_true",
                       help="with --dry-run: also test that a clip can be hosted publicly")

    p_auth = sub.add_parser("auth", help="one-time YouTube sign-in (only for publish.via: youtube)")
    p_auth.add_argument("--port", type=int, default=8765)

    sub.add_parser("channels", help="list the Buffer channels your API key can post to")
    sub.add_parser("pull-control", help="fetch the owner's settings and rules from the dashboard")
    p_insta = sub.add_parser("instagram", help="post clips already on YouTube to Instagram too")
    p_insta.add_argument("clips", nargs="+", help="clip ids from the publish history")

    p_notify = sub.add_parser("notify", help="send a message to your Discord or Telegram")
    p_notify.add_argument("message")

    args = parser.parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S",
    )
    if args.command == "auth":
        return cmd_auth(args)
    if args.command == "channels":
        return cmd_channels(args)
    if args.command == "notify":
        return cmd_notify(args)
    if args.command == "pull-control":
        return cmd_pull_control(args)
    try:
        settings = load_settings(args.config, args.profile)
    except ConfigError as exc:
        log.error("%s", exc)
        return 2
    if args.command == "instagram":
        return cmd_instagram(settings, args)
    if args.command == "run" and args.dry_run:
        args.keep = True
    return cmd_discover(settings, args) if args.command == "discover" else cmd_run(settings, args)


if __name__ == "__main__":
    sys.exit(main())
