import subprocess
import time

import pytest

from clipper.hosting import GitMediaHost, HostingError, repo_slug


def git(cwd, *args):
    return subprocess.run(["git", "-C", str(cwd), *args], check=True, capture_output=True, text=True).stdout


@pytest.fixture
def repo(tmp_path, monkeypatch):
    """A checkout whose `origin` is a bare repository standing in for GitHub."""
    monkeypatch.setenv("GITHUB_REPOSITORY", "someone/clips")
    remote = tmp_path / "remote.git"
    subprocess.run(["git", "init", "-q", "--bare", str(remote)], check=True)
    work = tmp_path / "work"
    subprocess.run(["git", "init", "-q", str(work)], check=True)
    git(work, "remote", "add", "origin", str(remote))
    return work, remote


def test_upload_pushes_a_one_file_branch_and_returns_a_raw_url(repo, tmp_path):
    work, remote = repo
    video = tmp_path / "out.mp4"
    video.write_bytes(b"not really a video")
    url, branch = GitMediaHost(work).upload(video, "clip_01ABC")

    assert branch.startswith("media/") and branch.endswith("-clip_01ABC")
    commit = git(remote, "rev-parse", f"refs/heads/{branch}").strip()
    assert url == f"https://raw.githubusercontent.com/someone/clips/{commit}/clip_01ABC.mp4"
    assert git(remote, "ls-tree", "--name-only", commit).split() == ["clip_01ABC.mp4"]
    assert git(remote, "show", f"{commit}:clip_01ABC.mp4") == "not really a video"
    assert git(remote, "rev-list", "--count", commit).strip() == "1"  # no history behind it
    assert git(work, "status", "--porcelain") == ""  # the working tree is untouched


def test_prune_deletes_only_old_media_branches(repo, tmp_path):
    work, remote = repo
    video = tmp_path / "out.mp4"
    video.write_bytes(b"x")
    host = GitMediaHost(work, keep_hours=24)
    _, fresh = host.upload(video, "fresh")
    commit = git(remote, "rev-parse", f"refs/heads/{fresh}").strip()
    old = f"media/{int(time.time()) - 30 * 3600}-old"
    git(work, "push", "-q", "origin", f"{commit}:refs/heads/{old}")
    git(work, "push", "-q", "origin", f"{commit}:refs/heads/main")

    assert host.prune() == 1
    heads = git(remote, "for-each-ref", "--format=%(refname:short)", "refs/heads").split()
    assert sorted(heads) == sorted([fresh, "main"])
    host.remove(fresh)
    assert "media/" not in git(remote, "for-each-ref", "--format=%(refname:short)")


def test_oversized_files_and_push_failures_are_reported(repo, tmp_path, monkeypatch):
    work, _ = repo
    video = tmp_path / "out.mp4"
    video.write_bytes(b"x" * 10)
    monkeypatch.setattr("clipper.hosting.MAX_BYTES", 5)
    with pytest.raises(HostingError, match="too large"):
        GitMediaHost(work).upload(video, "big")
    monkeypatch.setattr("clipper.hosting.MAX_BYTES", 10**9)
    with pytest.raises(HostingError, match="push failed"):
        GitMediaHost(work, remote="nowhere").upload(video, "x")


def test_repository_name_comes_from_actions_or_the_remote(repo, monkeypatch):
    work, _ = repo
    assert repo_slug(work) == "someone/clips"
    monkeypatch.delenv("GITHUB_REPOSITORY")
    for url in ("https://github.com/alice/My-Clips.git", "git@github.com:alice/My-Clips.git",
                "https://github.com/alice/My-Clips"):
        git(work, "remote", "set-url", "origin", url)
        assert repo_slug(work) == "alice/My-Clips"
    git(work, "remote", "set-url", "origin", "https://example.com/x/y.git")
    with pytest.raises(HostingError):
        repo_slug(work)
