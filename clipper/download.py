"""Fetch a clip's media to a local file.

Kick serves clips as an HLS playlist whose segments are byte ranges inside a
few .ts files. This downloads those ranges itself (so it works behind an HTTP
proxy, where ffmpeg's own networking often doesn't) and writes one file that
ffmpeg can read locally.
"""

from __future__ import annotations

import logging
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urljoin

import requests

from .kick import USER_AGENT

log = logging.getLogger(__name__)


class DownloadError(RuntimeError):
    pass


class UnsupportedPlaylist(DownloadError):
    pass


@dataclass(frozen=True)
class Segment:
    url: str
    offset: int | None = None
    length: int | None = None


def _byterange(value: str) -> tuple[int, int | None]:
    length, _, offset = value.strip().strip('"').partition("@")
    return int(length), (int(offset) if offset else None)


def parse_media_playlist(text: str, base_url: str) -> tuple[Segment | None, list[Segment]]:
    """Return (init segment or None, media segments) for an HLS media playlist."""
    init: Segment | None = None
    segments: list[Segment] = []
    pending: tuple[int, int | None] | None = None
    next_offset: dict[str, int] = {}

    for line in (raw.strip() for raw in text.splitlines()):
        if not line:
            continue
        if line.startswith("#EXT-X-KEY") and "METHOD=NONE" not in line:
            raise UnsupportedPlaylist("encrypted playlist")
        if line.startswith("#EXT-X-MAP:"):
            uri = re.search(r'URI="([^"]+)"', line)
            if not uri:
                raise UnsupportedPlaylist("EXT-X-MAP without URI")
            rng = re.search(r'BYTERANGE="([^"]+)"', line)
            url = urljoin(base_url, uri.group(1))
            if rng:
                length, offset = _byterange(rng.group(1))
                init = Segment(url, offset or 0, length)
            else:
                init = Segment(url)
        elif line.startswith("#EXT-X-BYTERANGE:"):
            pending = _byterange(line.split(":", 1)[1])
        elif not line.startswith("#"):
            url = urljoin(base_url, line)
            if pending:
                length, offset = pending
                if offset is None:
                    offset = next_offset.get(url, 0)
                next_offset[url] = offset + length
                segments.append(Segment(url, offset, length))
            else:
                segments.append(Segment(url))
            pending = None
    return init, segments


def best_variant(text: str, base_url: str) -> str | None:
    """For a master playlist, the URL of its highest-bitrate variant."""
    best: tuple[int, str] | None = None
    lines = [raw.strip() for raw in text.splitlines()]
    for i, line in enumerate(lines):
        if not line.startswith("#EXT-X-STREAM-INF"):
            continue
        match = re.search(r"BANDWIDTH=(\d+)", line)
        bandwidth = int(match.group(1)) if match else 0
        for follow in lines[i + 1 :]:
            if follow and not follow.startswith("#"):
                if best is None or bandwidth > best[0]:
                    best = (bandwidth, urljoin(base_url, follow))
                break
    return best[1] if best else None


def merge_ranges(segments: list[Segment]) -> list[Segment]:
    """Join back-to-back ranges of the same file so they become one request."""
    merged: list[Segment] = []
    for seg in segments:
        last = merged[-1] if merged else None
        if (
            last
            and last.url == seg.url
            and last.offset is not None
            and seg.offset is not None
            and last.offset + (last.length or 0) == seg.offset
        ):
            merged[-1] = Segment(last.url, last.offset, (last.length or 0) + (seg.length or 0))
        else:
            merged.append(seg)
    return merged


def _fetch(session: requests.Session, seg: Segment, out) -> None:
    headers = {}
    if seg.offset is not None and seg.length is not None:
        headers["Range"] = f"bytes={seg.offset}-{seg.offset + seg.length - 1}"
    last_error: Exception | None = None
    for _ in range(3):
        try:
            resp = session.get(seg.url, headers=headers, timeout=60)
        except requests.RequestException as exc:
            last_error = exc
            continue
        if resp.status_code == 206 or (resp.status_code == 200 and not headers):
            out.write(resp.content)
            return
        if resp.status_code == 200 and seg.offset is not None and seg.length is not None:
            # Server ignored the Range header and sent the whole file.
            out.write(resp.content[seg.offset : seg.offset + seg.length])
            return
        last_error = DownloadError(f"HTTP {resp.status_code} for {seg.url}")
    raise DownloadError(f"could not download segment: {last_error}")


def _ffmpeg_fetch(url: str, dest: Path) -> Path:
    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-user_agent", USER_AGENT, "-i", url, "-c", "copy", str(dest),
    ]
    done = subprocess.run(cmd, capture_output=True, text=True)
    if done.returncode != 0 or not dest.exists():
        raise DownloadError(f"ffmpeg could not fetch the clip: {done.stderr.strip()[-300:]}")
    return dest


def download(url: str, dest_dir: Path, name: str, session: requests.Session | None = None) -> Path:
    """Download the clip at `url`; returns the path of a local media file."""
    dest_dir.mkdir(parents=True, exist_ok=True)
    session = session or requests.Session()
    session.headers["User-Agent"] = USER_AGENT

    if ".m3u8" not in url.split("?")[0]:
        dest = dest_dir / f"{name}.mp4"
        try:
            with session.get(url, stream=True, timeout=60) as resp:
                if resp.status_code != 200:
                    raise DownloadError(f"HTTP {resp.status_code} for {url}")
                with dest.open("wb") as out:
                    for chunk in resp.iter_content(1 << 20):
                        out.write(chunk)
        except requests.RequestException as exc:
            raise DownloadError(f"could not download clip: {exc}") from exc
        return dest

    try:
        resp = session.get(url, timeout=30)
    except requests.RequestException as exc:
        raise DownloadError(f"could not fetch playlist: {exc}") from exc
    if resp.status_code != 200:
        raise DownloadError(f"HTTP {resp.status_code} for playlist {url}")
    text = resp.text

    variant = best_variant(text, url)
    if variant:
        return download(variant, dest_dir, name, session)

    try:
        init, segments = parse_media_playlist(text, url)
    except UnsupportedPlaylist as exc:
        log.info("playlist needs ffmpeg (%s)", exc)
        return _ffmpeg_fetch(url, dest_dir / f"{name}.mp4")
    if not segments:
        raise DownloadError("playlist has no segments")

    dest = dest_dir / f"{name}.{'mp4' if init else 'ts'}"
    with dest.open("wb") as out:
        if init:
            _fetch(session, init, out)
        for seg in merge_ranges(segments):
            _fetch(session, seg, out)
    if dest.stat().st_size == 0:
        raise DownloadError("downloaded clip is empty")
    return dest
