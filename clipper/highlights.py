"""Cutting the agent's own clips from a streamer's broadcast.

Viewer-made clips only exist when someone bothers to clip. For featured
channels the agent can also look for highlights itself: moments where the
chat suddenly speeds up are almost always a reaction to something on screen.
It samples the chat's pace across the last couple of hours of the broadcast,
picks the sharpest spikes, and cuts the seconds around each one out of the
recording.

It only does this while the stream is filed under the game being clipped,
and the usual checks (gameplay on screen, not a repeat of a posted moment)
still apply to every cut.
"""

from __future__ import annotations

import logging
import re
import statistics
import subprocess
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests

from .kick import USER_AGENT, KickClient, KickError, _parse_time
from .models import Clip

log = logging.getLogger(__name__)

LOOKBACK_HOURS = 2.0  # how much of the broadcast each run examines
STEP = 30  # seconds between chat samples
LEAD = 35  # the clip starts this long before the chat spike...
LENGTH = 50  # ...and runs this long: chat reacts a few seconds after the moment
MAX_CUTS = 3  # per channel per run


class HighlightError(RuntimeError):
    pass


def chat_pace(messages: list[dict]) -> float:
    """Messages per second in one chat sample.

    A sample is the first 25 messages within 5 seconds of the asked time. A
    busy chat fills all 25 early, so the pace is how fast it filled.
    """
    if len(messages) < 25:
        return len(messages) / 5.0
    times = sorted(t for t in (_parse_time(str(m.get("created_at") or "")) for m in messages) if t)
    spread = (times[-1] - times[0]).total_seconds() if len(times) > 1 else 0
    return len(messages) / max(1.0, spread + 1.0)


def find_peaks(samples: list[tuple[datetime, float]], top: int = MAX_CUTS, apart: float = 90) -> list[tuple[datetime, float]]:
    """The moments where the chat's pace stands clearly above its usual level."""
    if len(samples) < 8:
        return []
    paces = [pace for _, pace in samples]
    usual = statistics.median(paces)
    spread = statistics.median(abs(p - usual) for p in paces) * 1.4826
    bar = usual + max(3 * spread, 0.5 * usual, 0.4)
    peaks: list[tuple[datetime, float]] = []
    for when, pace in sorted(samples, key=lambda s: s[1], reverse=True):
        if pace < bar:
            break
        if all(abs((when - other).total_seconds()) >= apart for other, _ in peaks):
            peaks.append((when, pace))
        if len(peaks) == top:
            break
    return sorted(peaks)


def find_highlights(kick: KickClient, channels: list[str], category: str, now: datetime | None = None,
                    lookback_hours: float = LOOKBACK_HOURS,
                    not_before: dict[str, datetime] | None = None) -> list[Clip]:
    """Candidate clips cut from the recent broadcasts of `channels`.

    `not_before` gives channels a start time: nothing earlier is examined.
    """
    now = now or datetime.now(timezone.utc)
    found: list[Clip] = []
    for slug in channels:
        start = (not_before or {}).get(slug.lower())
        if start and now <= start:
            continue
        try:
            found += _channel_highlights(kick, slug, category, now, lookback_hours, start)
        except (KickError, HighlightError) as exc:
            log.warning("no own clips from %s this run: %s", slug, exc)
    return found


def _channel_highlights(kick: KickClient, slug: str, category: str, now: datetime, lookback_hours: float,
                        start: datetime | None = None) -> list[Clip]:
    since = max(now - timedelta(hours=lookback_hours), start or now - timedelta(days=365))
    until = now - timedelta(seconds=90)  # the newest seconds are not in the recording yet
    for video in kick.videos(slug):
        began = _parse_time(str(video.get("start_time") or video.get("created_at") or ""))
        if not began or not video.get("source"):
            continue
        length_ms = float(video.get("duration") or 0)
        ended = now if video.get("is_live") else began + timedelta(milliseconds=length_ms)
        if ended < since:
            continue
        in_category = any(str(c.get("slug")) == category for c in video.get("categories") or [])
        if not in_category:
            log.info("%s is not in %s right now; no own clips", slug, category)
            continue
        first, last = max(since, began + timedelta(seconds=LEAD)), min(until, ended)
        samples = []
        when = first
        while when <= last:
            samples.append((when, chat_pace(kick.chat_sample(str(video["channel_id"]), when))))
            when += timedelta(seconds=STEP)
        peaks = find_peaks(samples)
        log.info("%s: sampled %d moments of chat, %d spike(s)", slug, len(samples), len(peaks))
        playlist = _best_variant(str(video["source"]))
        name = kick.display_name(slug)
        return [
            Clip(
                id=f"auto_{video['id']}_{int((peak - timedelta(seconds=LEAD)).timestamp())}",
                source="kick", title="", channel_slug=slug, channel_name=name,
                category_slug=category, category_name="",
                views=round(pace * 60),  # chat messages a minute, standing in for views
                likes=0, duration=float(LENGTH), created_at=peak, media_url=playlist,
                language=str(video.get("language") or ""), livestream_id=str(video["id"]),
                started_at=peak - timedelta(seconds=LEAD), origin="auto",
            )
            for peak, pace in peaks
        ]
    return []


def _get(url: str) -> requests.Response:
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=60)
    except requests.RequestException as exc:
        raise HighlightError(f"could not reach the recording: {exc}") from exc
    if resp.status_code != 200:
        raise HighlightError(f"the recording answered HTTP {resp.status_code}")
    return resp


def _best_variant(master_url: str) -> str:
    text = _get(master_url).text
    best: tuple[int, str] | None = None
    for attrs, uri in re.findall(r"#EXT-X-STREAM-INF:([^\n]+)\n([^\n#]+)", text):
        match = re.search(r"BANDWIDTH=(\d+)", attrs)
        rate = int(match.group(1)) if match else 0
        if best is None or rate > best[0]:
            best = (rate, urljoin(master_url, uri.strip()))
    return best[1] if best else master_url


@dataclass(frozen=True)
class Piece:
    url: str
    start: datetime
    length: float


def pieces_between(playlist: str, base_url: str, start: datetime, end: datetime) -> list[Piece]:
    """The recording's segments that cover start..end, from its playlist text."""
    found: list[Piece] = []
    clock: datetime | None = None
    length = 0.0
    for line in (raw.strip() for raw in playlist.splitlines()):
        if line.startswith("#EXT-X-PROGRAM-DATE-TIME:"):
            clock = _parse_time(line.split(":", 1)[1])
        elif line.startswith("#EXTINF:"):
            length = float(line.split(":", 1)[1].split(",")[0])
        elif line and not line.startswith("#") and clock:
            if clock < end and clock + timedelta(seconds=length) > start:
                found.append(Piece(urljoin(base_url, line), clock, length))
            clock += timedelta(seconds=length)  # in case the next segment carries no time
    return found


def cut_highlight(clip: Clip, work_dir: Path) -> Path:
    """Download the part of the recording a highlight covers and trim it to length."""
    if not clip.started_at:
        raise HighlightError("the highlight has no start time")
    end = clip.started_at + timedelta(seconds=clip.duration)
    pieces = pieces_between(_get(clip.media_url).text, clip.media_url, clip.started_at, end)
    if not pieces:
        raise HighlightError("that part of the stream is not in the recording")
    work_dir.mkdir(parents=True, exist_ok=True)
    joined = work_dir / f"{clip.id}.full.ts"
    with joined.open("wb") as out:
        for piece in pieces:
            out.write(_get(piece.url).content)
    cut = work_dir / f"{clip.id}.ts"
    offset = max(0.0, (clip.started_at - pieces[0].start).total_seconds())
    done = subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", f"{offset:.2f}", "-i", str(joined), "-t", f"{clip.duration:.2f}",
         "-c", "copy", str(cut)],
        capture_output=True, text=True,
    )
    joined.unlink(missing_ok=True)
    if done.returncode != 0 or not cut.exists() or cut.stat().st_size == 0:
        raise HighlightError(f"could not trim the highlight: {done.stderr.strip()[-200:]}")
    return cut
