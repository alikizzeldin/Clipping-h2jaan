"""Give a rendered clip a public URL, so Buffer can fetch it.

Each clip is pushed to this repository as a one-file commit on its own
`media/...` branch and served by raw.githubusercontent.com. Branches older
than a day are deleted on the next run, so clips don't pile up. The repository
has to be public for the URL to work.

Nothing is checked out or changed in the working tree: the commit is built
with git plumbing and pushed with the checkout's own credentials.
"""

from __future__ import annotations

import logging
import os
import re
import subprocess
import time
from pathlib import Path

import requests

log = logging.getLogger(__name__)

MAX_BYTES = 95 * 1024 * 1024  # GitHub rejects files over 100 MB
_IDENTITY = {
    "GIT_AUTHOR_NAME": "github-actions[bot]",
    "GIT_AUTHOR_EMAIL": "41898282+github-actions[bot]@users.noreply.github.com",
    "GIT_COMMITTER_NAME": "github-actions[bot]",
    "GIT_COMMITTER_EMAIL": "41898282+github-actions[bot]@users.noreply.github.com",
}


class HostingError(RuntimeError):
    pass


def _git(repo: Path, *args: str, stdin: str | None = None) -> str:
    done = subprocess.run(
        ["git", "-C", str(repo), *args], input=stdin, capture_output=True, text=True,
        env={**os.environ, **_IDENTITY},
    )
    if done.returncode != 0:
        raise HostingError(f"git {args[0]} failed: {done.stderr.strip()[-300:]}")
    return done.stdout.strip()


def repo_slug(repo: Path) -> str:
    """owner/name of the GitHub repository this checkout belongs to."""
    slug = os.environ.get("GITHUB_REPOSITORY", "")
    if not slug:
        url = _git(repo, "remote", "get-url", "origin")
        match = re.search(r"github\.com[:/]+([^/]+/[^/]+?)(?:\.git)?/?$", url)
        if not match:
            raise HostingError(f"can't tell the GitHub repository from the remote '{url}'")
        slug = match.group(1)
    return slug


class GitMediaHost:
    def __init__(self, repo: str | Path = ".", prefix: str = "media", keep_hours: float = 24,
                 remote: str = "origin"):
        self.repo = Path(repo)
        self.prefix = prefix.strip("/")
        self.keep_hours = keep_hours
        self.remote = remote

    def _branch(self, name: str, now: float | None = None) -> str:
        return f"{self.prefix}/{int(now or time.time())}-{name}"

    def upload(self, video: Path, name: str) -> tuple[str, str]:
        """Push the file; returns (public URL, branch it lives on)."""
        if video.stat().st_size > MAX_BYTES:
            raise HostingError(f"{video.name} is too large to host ({video.stat().st_size >> 20} MB)")
        filename = re.sub(r"[^A-Za-z0-9._-]", "_", name) + video.suffix
        blob = _git(self.repo, "hash-object", "-w", str(video.resolve()))
        tree = _git(self.repo, "mktree", stdin=f"100644 blob {blob}\t{filename}\n")
        commit = _git(self.repo, "commit-tree", tree, "-m", "Clip awaiting upload")
        branch = self._branch(re.sub(r"[^A-Za-z0-9._-]", "_", name))
        _git(self.repo, "push", "--quiet", "--force", self.remote, f"{commit}:refs/heads/{branch}")
        url = f"https://raw.githubusercontent.com/{repo_slug(self.repo)}/{commit}/{filename}"
        return url, branch

    def wait_until_public(self, url: str, timeout: float = 150) -> None:
        """Block until the URL serves the file to an anonymous request."""
        deadline = time.monotonic() + timeout
        last = "no answer"
        while time.monotonic() < deadline:
            try:
                resp = requests.get(url, headers={"Range": "bytes=0-0"}, timeout=20)
                if resp.status_code in (200, 206):
                    return
                last = f"HTTP {resp.status_code}"
            except requests.RequestException as exc:
                last = str(exc)
            time.sleep(5)
        raise HostingError(
            f"the hosted clip never became publicly reachable ({last}); "
            "is the repository public?"
        )

    def find(self, name: str) -> str:
        """The public URL of an already hosted clip (see `upload`), or "" when it is gone."""
        safe = re.sub(r"[^A-Za-z0-9._-]", "_", name)
        listing = _git(self.repo, "ls-remote", "--heads", self.remote, f"refs/heads/{self.prefix}/*-{safe}")
        hosted = sorted(
            (ref, commit) for commit, ref in (line.split("\t") for line in listing.splitlines() if "\t" in line)
            if ref.endswith(f"-{safe}")
        )
        if not hosted:
            return ""
        commit = hosted[-1][1]  # the newest upload of that clip
        return f"https://raw.githubusercontent.com/{repo_slug(self.repo)}/{commit}/{safe}.mp4"

    def remove(self, branch: str) -> None:
        _git(self.repo, "push", "--quiet", self.remote, "--delete", f"refs/heads/{branch}")

    def prune(self, now: float | None = None) -> int:
        """Delete media branches older than `keep_hours`; returns how many."""
        now = now or time.time()
        listing = _git(self.repo, "ls-remote", "--heads", self.remote, f"refs/heads/{self.prefix}/*")
        old = []
        for line in listing.splitlines():
            ref = line.split("\t")[-1]
            match = re.match(rf"refs/heads/({re.escape(self.prefix)}/(\d+)-.+)$", ref)
            if match and now - int(match.group(2)) > self.keep_hours * 3600:
                old.append(match.group(1))
        for branch in old:
            try:
                self.remove(branch)
            except HostingError as exc:
                log.warning("could not delete %s: %s", branch, exc)
        return len(old)

