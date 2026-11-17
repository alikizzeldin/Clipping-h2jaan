"""YouTube Data API v3: resumable uploads with a stored refresh token.

Talks to the REST endpoints directly so the only dependency is `requests`.
"""

from __future__ import annotations

import http.server
import json
import logging
import secrets
import time
import urllib.parse
import webbrowser
from pathlib import Path

import requests

log = logging.getLogger(__name__)

TOKEN_URL = "https://oauth2.googleapis.com/token"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
SCOPE = "https://www.googleapis.com/auth/youtube.upload"
CHUNK = 8 * 1024 * 1024  # must be a multiple of 256 KiB
QUOTA_REASONS = {"quotaExceeded", "uploadLimitExceeded", "rateLimitExceeded", "dailyLimitExceeded"}


class YouTubeError(RuntimeError):
    def __init__(self, message: str, reason: str = ""):
        super().__init__(message)
        self.reason = reason


class QuotaExceeded(YouTubeError):
    """The channel or API project can't upload any more for now."""


def _raise_for(resp: requests.Response, doing: str) -> None:
    reason, message = "", resp.text[:300]
    try:
        err = resp.json().get("error", {})
        if isinstance(err, dict):
            message = err.get("message", message)
            reason = (err.get("errors") or [{}])[0].get("reason", "")
        else:  # token endpoint: {"error": "invalid_grant", "error_description": "..."}
            reason = str(err)
            message = resp.json().get("error_description", message)
    except ValueError:
        pass
    text = f"YouTube refused {doing} ({resp.status_code} {reason}): {message}"
    if reason in QUOTA_REASONS:
        raise QuotaExceeded(text, reason)
    if reason == "invalid_grant":
        text += " — the refresh token is expired or revoked; run `python -m clipper auth` again."
    raise YouTubeError(text, reason)


class YouTube:
    def __init__(self, client_id: str, client_secret: str, refresh_token: str,
                 session: requests.Session | None = None):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.session = session or requests.Session()
        self._token = ""
        self._expires = 0.0

    def access_token(self) -> str:
        if self._token and time.time() < self._expires - 60:
            return self._token
        resp = self.session.post(TOKEN_URL, timeout=30, data={
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.refresh_token,
            "grant_type": "refresh_token",
        })
        if resp.status_code != 200:
            _raise_for(resp, "the token refresh")
        body = resp.json()
        self._token = body["access_token"]
        self._expires = time.time() + float(body.get("expires_in", 3600))
        return self._token

    def upload(self, path: Path, *, title: str, description: str, tags: list[str],
               category_id: str = "20", privacy: str = "private") -> str:
        """Upload one video and return its YouTube id."""
        size = path.stat().st_size
        metadata = {
            "snippet": {
                "title": title,
                "description": description,
                "tags": tags,
                "categoryId": category_id,
            },
            "status": {
                "privacyStatus": privacy,
                "selfDeclaredMadeForKids": False,
                "embeddable": True,
            },
        }
        start = self.session.post(
            UPLOAD_URL,
            params={"uploadType": "resumable", "part": "snippet,status"},
            headers={
                "Authorization": f"Bearer {self.access_token()}",
                "Content-Type": "application/json; charset=UTF-8",
                "X-Upload-Content-Type": "video/mp4",
                "X-Upload-Content-Length": str(size),
            },
            data=json.dumps(metadata).encode("utf-8"),
            timeout=60,
        )
        if start.status_code != 200 or "Location" not in start.headers:
            _raise_for(start, "the upload")
        location = start.headers["Location"]

        sent = 0
        failures = 0
        with path.open("rb") as handle:
            while True:
                handle.seek(sent)
                chunk = handle.read(CHUNK)
                end = sent + len(chunk) - 1
                try:
                    resp = self.session.put(
                        location,
                        headers={
                            "Authorization": f"Bearer {self.access_token()}",
                            "Content-Type": "video/mp4",
                            "Content-Range": f"bytes {sent}-{end}/{size}",
                        },
                        data=chunk,
                        timeout=300,
                    )
                except requests.RequestException as exc:
                    failures += 1
                    if failures > 5:
                        raise YouTubeError(f"upload kept failing: {exc}") from exc
                    time.sleep(2**failures)
                    sent = self._resume_point(location, size, sent)
                    continue

                if resp.status_code in (200, 201):
                    return str(resp.json()["id"])
                if resp.status_code == 308:  # chunk accepted, more to send
                    sent = self._next_byte(resp, end + 1)
                    failures = 0
                    continue
                if resp.status_code in (500, 502, 503, 504):
                    failures += 1
                    if failures > 5:
                        _raise_for(resp, "the upload")
                    time.sleep(2**failures)
                    sent = self._resume_point(location, size, sent)
                    continue
                _raise_for(resp, "the upload")

    @staticmethod
    def _next_byte(resp: requests.Response, default: int) -> int:
        rng = resp.headers.get("Range", "")  # e.g. "bytes=0-8388607"
        if "-" in rng:
            try:
                return int(rng.rsplit("-", 1)[1]) + 1
            except ValueError:
                pass
        return default

    def _resume_point(self, location: str, size: int, fallback: int) -> int:
        try:
            resp = self.session.put(
                location,
                headers={
                    "Authorization": f"Bearer {self.access_token()}",
                    "Content-Range": f"bytes */{size}",
                },
                timeout=60,
            )
        except requests.RequestException:
            return fallback
        if resp.status_code == 308:
            return self._next_byte(resp, 0)
        return fallback


def authorize(client_id: str, client_secret: str, port: int = 8765) -> str:
    """One-time browser sign-in on your own computer; returns a refresh token."""
    redirect = f"http://127.0.0.1:{port}/"
    state = secrets.token_urlsafe(16)
    url = AUTH_URL + "?" + urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": redirect,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    })
    result: dict[str, str] = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802 - name required by http.server
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if "code" not in query and "error" not in query:
                self.send_response(404)
                self.end_headers()
                return
            result["code"] = (query.get("code") or [""])[0]
            result["state"] = (query.get("state") or [""])[0]
            result["error"] = (query.get("error") or [""])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"<h2>Done. You can close this tab and go back to the terminal.</h2>")

        def log_message(self, *args):
            pass

    server = http.server.HTTPServer(("127.0.0.1", port), Handler)
    print("Open this link in the browser where the YouTube channel is signed in:\n")
    print(url + "\n")
    try:
        webbrowser.open(url)
    except Exception:
        pass
    while "code" not in result:
        server.handle_request()
    server.server_close()

    if result.get("error"):
        raise YouTubeError(f"sign-in was not completed: {result['error']}")
    if result.get("state") != state:
        raise YouTubeError("sign-in response did not match this request; try again")
    resp = requests.post(TOKEN_URL, timeout=30, data={
        "client_id": client_id,
        "client_secret": client_secret,
        "code": result["code"],
        "redirect_uri": redirect,
        "grant_type": "authorization_code",
    })
    if resp.status_code != 200:
        _raise_for(resp, "the sign-in")
    token = resp.json().get("refresh_token")
    if not token:
        raise YouTubeError("Google returned no refresh token; remove the app's access at "
                           "myaccount.google.com/permissions and run this again")
    return token
