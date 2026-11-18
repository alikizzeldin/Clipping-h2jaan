"""The two ways a rendered clip reaches YouTube: through Buffer, or directly."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .buffer import Buffer, BufferError, BufferLimit
from .config import Publish
from .hosting import GitMediaHost, HostingError
from .models import Clip
from .state import State
from .youtube import QuotaExceeded, YouTube, YouTubeError

log = logging.getLogger(__name__)

YT_ENV = ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN")
CONFIRM_PER_RUN = 12  # earlier posts whose result is checked at the start of a run


class PublishError(RuntimeError):
    """This clip could not be published."""


class PublishLimit(PublishError):
    """Nothing more can be published for now; stop the run."""


class SetupError(RuntimeError):
    """A secret or setting is missing."""


@dataclass(frozen=True)
class Published:
    ref: str  # YouTube video id, or Buffer post id
    link: str  # YouTube URL when already known
    via: str


class YouTubePublisher:
    via = "youtube"

    def __init__(self, pub: Publish):
        missing = [name for name in YT_ENV if not os.environ.get(name)]
        if missing:
            raise SetupError(f"missing {', '.join(missing)}")
        self.pub = pub
        self.client = YouTube(*(os.environ[name] for name in YT_ENV))

    def prepare(self, state: State, report) -> None:
        return None

    def publish(self, video: Path, clip: Clip, meta: dict) -> Published:
        try:
            video_id = self.client.upload(
                video, title=meta["title"], description=meta["description"], tags=meta["tags"],
                category_id=self.pub.category_id, privacy=self.pub.privacy,
            )
        except QuotaExceeded as exc:
            raise PublishLimit(str(exc)) from exc
        except YouTubeError as exc:
            raise PublishError(str(exc)) from exc
        return Published(video_id, f"https://youtu.be/{video_id}", self.via)


class BufferPublisher:
    via = "buffer"

    def __init__(self, pub: Publish, repo: str | Path = "."):
        key = os.environ.get("BUFFER_API_KEY", "")
        channel = os.environ.get("BUFFER_CHANNEL_ID") or pub.buffer_channel_id
        if not key:
            raise SetupError("missing BUFFER_API_KEY (add it as a repository secret)")
        if not channel:
            raise SetupError("no Buffer channel set: fill in publish.buffer_channel_id")
        self.pub = pub
        self.client = Buffer(key, channel)
        self.host = GitMediaHost(repo, prefix=pub.media_prefix)
        self.last_url = ""  # where the last published clip is hosted, for Instagram

    def prepare(self, state: State, report) -> None:
        """Housekeeping before a run: confirm earlier posts, drop old hosted clips.

        `report(kind, text, link)` is told about each post that went live or
        that Buffer could not publish.
        """
        now = datetime.now(timezone.utc)
        # Enough per run to keep up with extra batches (8 posts a run); each post
        # is normally checked once, so this costs no more requests overall.
        for clip_id, entry in state.unconfirmed("buffer", now - timedelta(days=2))[:CONFIRM_PER_RUN]:
            try:
                info = self.client.post_status(entry["video_id"])
            except BufferError as exc:
                log.warning("could not check an earlier post: %s", exc)
                break
            if info["status"] == "sent":
                state.update(clip_id, status="sent", link=info["link"])
                report("info", f"Live on YouTube: “{entry['title']}”", info["link"])
            elif info["status"] == "error":
                state.update(clip_id, status="error", error=info["error"])
                report("error", f"Buffer could not publish “{entry['title']}”: {info['error']}", "")
        self._confirm_instagram(state, report, now)
        try:
            removed = self.host.prune()
            if removed:
                log.info("removed %d old hosted clip(s)", removed)
        except HostingError as exc:
            log.warning("could not tidy hosted clips: %s", exc)

    def _confirm_instagram(self, state: State, report, now: datetime) -> None:
        """Check the Instagram posts that have no result yet (a few per run)."""
        waiting = [
            (clip_id, entry) for clip_id, entry in state.published.items()
            if entry.get("instagram") and not entry.get("instagram_status")
            and entry.get("instagram_at", "") >= (now - timedelta(days=2)).isoformat()
        ][:CONFIRM_PER_RUN]
        for clip_id, entry in waiting:
            try:
                info = self.client.post_status(entry["instagram"])
            except BufferError as exc:
                log.warning("could not check an Instagram post: %s", exc)
                return
            if info["status"] == "sent":
                state.update(clip_id, instagram_status="sent", instagram_link=info["link"])
                report("info", f"Live on Instagram: “{entry.get('instagram_title') or entry['title']}”", info["link"])
            elif info["status"] == "error":
                state.update(clip_id, instagram_status="error", instagram_error=info["error"])
                report("error", f"Instagram did not publish “{entry.get('instagram_title') or entry['title']}”: {info['error']}", "")

    def publish(self, video: Path, clip: Clip, meta: dict) -> Published:
        try:
            url, branch = self.host.upload(video, clip.id)
            self.host.wait_until_public(url)
        except HostingError as exc:
            raise PublishError(str(exc)) from exc
        try:
            post_id = self.client.publish_video(
                url, title=meta["title"], description=meta["description"],
                privacy=self.pub.privacy, category_id=self.pub.category_id,
            )
        except BufferLimit as exc:
            self._discard(branch)
            raise PublishLimit(str(exc)) from exc
        except BufferError as exc:
            if not str(exc).startswith("could not reach Buffer"):
                self._discard(branch)  # after a timeout Buffer may still fetch the file
            raise PublishError(str(exc)) from exc
        self.last_url = url
        return Published(post_id, "", self.via)

    def to_instagram(self, url: str, caption: str) -> str:
        """Post an already hosted clip to the Instagram channel as a Reel; returns Buffer's post id."""
        if not self.pub.instagram_channel_id:
            raise PublishError("no Instagram channel is set (publish.instagram_channel_id)")
        try:
            return self.client.publish_reel(url, channel_id=self.pub.instagram_channel_id, caption=caption)
        except BufferLimit as exc:
            raise PublishLimit(str(exc)) from exc
        except BufferError as exc:
            raise PublishError(str(exc)) from exc

    def _discard(self, branch: str) -> None:
        try:
            self.host.remove(branch)
        except HostingError:
            pass


def make_publisher(pub: Publish, repo: str | Path = "."):
    return BufferPublisher(pub, repo) if pub.via == "buffer" else YouTubePublisher(pub)
