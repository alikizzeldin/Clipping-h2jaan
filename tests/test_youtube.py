import json

import pytest

from clipper import youtube
from clipper.youtube import QuotaExceeded, YouTube, YouTubeError


class Resp:
    def __init__(self, status, body=None, headers=None):
        self.status_code = status
        self._body = body or {}
        self.headers = headers or {}
        self.text = json.dumps(self._body)

    def json(self):
        return self._body


class FakeGoogle:
    """Just enough of the token and resumable-upload endpoints."""

    def __init__(self, fail_first_chunk=False, start=None):
        self.received = bytearray()
        self.metadata = None
        self.fail_first_chunk = fail_first_chunk
        self.start = start
        self.puts = 0

    def post(self, url, **kw):
        if url == youtube.TOKEN_URL:
            return Resp(200, {"access_token": "tok", "expires_in": 3600})
        self.metadata = json.loads(kw["data"])
        self.size = int(kw["headers"]["X-Upload-Content-Length"])
        assert kw["headers"]["Authorization"] == "Bearer tok"
        return self.start or Resp(200, headers={"Location": "https://upload.example/session"})

    def put(self, url, headers=None, data=None, timeout=None):
        self.puts += 1
        rng = headers["Content-Range"]
        if rng.startswith("bytes */"):  # "how much do you have?"
            if not self.received:
                return Resp(308)
            return Resp(308, headers={"Range": f"bytes=0-{len(self.received) - 1}"})
        if self.fail_first_chunk and self.puts == 1:
            return Resp(503)
        start = int(rng.split(" ")[1].split("-")[0])
        assert start == len(self.received), "chunks must arrive in order with no gaps"
        self.received += data
        if len(self.received) == self.size:
            return Resp(200, {"id": "abc123"})
        return Resp(308, headers={"Range": f"bytes=0-{len(self.received) - 1}"})


@pytest.fixture
def video(tmp_path, monkeypatch):
    monkeypatch.setattr(youtube, "CHUNK", 1024)
    monkeypatch.setattr(youtube.time, "sleep", lambda s: None)
    path = tmp_path / "clip.mp4"
    path.write_bytes(bytes(range(256)) * 10 + b"tail")  # 2564 bytes -> 3 chunks
    return path


def upload(google, video):
    yt = YouTube("id", "secret", "refresh", session=google)
    return yt.upload(video, title="T", description="D", tags=["a"], privacy="unlisted")


def test_upload_sends_every_byte_and_metadata(video):
    google = FakeGoogle()
    assert upload(google, video) == "abc123"
    assert bytes(google.received) == video.read_bytes()
    assert google.metadata["snippet"]["title"] == "T"
    assert google.metadata["status"] == {
        "privacyStatus": "unlisted", "selfDeclaredMadeForKids": False, "embeddable": True,
    }


def test_upload_resumes_after_a_server_error(video):
    google = FakeGoogle(fail_first_chunk=True)
    assert upload(google, video) == "abc123"
    assert bytes(google.received) == video.read_bytes()


def test_quota_errors_are_distinguished(video):
    quota = Resp(403, {"error": {"message": "exceeded", "errors": [{"reason": "quotaExceeded"}]}})
    with pytest.raises(QuotaExceeded):
        upload(FakeGoogle(start=quota), video)
    other = Resp(400, {"error": {"message": "bad", "errors": [{"reason": "invalidTitle"}]}})
    with pytest.raises(YouTubeError) as err:
        upload(FakeGoogle(start=other), video)
    assert not isinstance(err.value, QuotaExceeded) and err.value.reason == "invalidTitle"
