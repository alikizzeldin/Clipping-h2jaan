"""Publish to YouTube through Buffer's GraphQL API (https://developers.buffer.com).

Buffer has no file upload: it fetches the video from a public URL when the
post goes out (see hosting.py). Its YouTube publishing is Shorts-only, so the
video must be vertical.

The free plan allows about 1,000 API requests per 30 days, so this module
makes one request per published clip and one later to confirm it.
"""

from __future__ import annotations

import logging
from typing import Any

import requests

log = logging.getLogger(__name__)

API_URL = "https://api.buffer.com"

_CREATE = """
mutation Create($input: CreatePostInput!) {
  createPost(input: $input) {
    __typename
    ... on PostActionSuccess { post { id status } }
    ... on MutationError { message }
  }
}"""

_STATUS = """
query Status($input: PostInput!) {
  post(input: $input) { id status sentAt externalLink error { message } }
}"""

_ORGS = "query Orgs { account { organizations { id name } } }"

_CHANNELS = """
query Channels($input: ChannelsInput!) {
  channels(input: $input) { id name service isDisconnected }
}"""


class BufferError(RuntimeError):
    pass


class BufferLimit(BufferError):
    """Buffer won't take more for now (rate limit or the plan's posting limit)."""


class Buffer:
    def __init__(self, api_key: str, channel_id: str, session: requests.Session | None = None):
        self.api_key = api_key
        self.channel_id = channel_id
        self.session = session or requests.Session()

    def _gql(self, query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
        try:
            resp = self.session.post(
                API_URL,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"query": query, "variables": variables or {}},
                timeout=120,
            )
        except requests.RequestException as exc:
            raise BufferError(f"could not reach Buffer: {exc}") from exc
        if resp.status_code == 429:
            raise BufferLimit("Buffer's API rate limit is used up for now")
        if resp.status_code in (401, 403):
            raise BufferError("Buffer rejected the API key (check the BUFFER_API_KEY secret)")
        try:
            body = resp.json()
        except ValueError as exc:
            raise BufferError(f"Buffer answered {resp.status_code} with no JSON") from exc
        if body.get("errors"):
            message = "; ".join(str(e.get("message", e)) for e in body["errors"])
            raise BufferError(f"Buffer error: {message}")
        return body.get("data") or {}

    def publish_video(self, video_url: str, *, title: str, description: str,
                      privacy: str = "public", category_id: str = "20") -> str:
        """Send a video to the channel right away; returns Buffer's post id."""
        data = self._gql(_CREATE, {"input": {
            "channelId": self.channel_id,
            "text": description,
            "schedulingType": "automatic",
            "mode": "shareNow",
            "assets": [{"video": {"url": video_url}}],
            "metadata": {"youtube": {
                "title": title,
                "categoryId": category_id,
                "privacy": privacy,
                "madeForKids": False,
            }},
        }})
        result = data.get("createPost") or {}
        kind = result.get("__typename", "")
        if kind == "PostActionSuccess":
            return str(result["post"]["id"])
        message = result.get("message") or "no details given"
        if "limit" in kind.lower():
            raise BufferLimit(f"Buffer's posting limit is reached: {message}")
        raise BufferError(f"Buffer refused the post ({kind or 'unknown error'}): {message}")

    def post_status(self, post_id: str) -> dict[str, str]:
        """{'status': sent|error|..., 'link': YouTube URL or '', 'error': message or ''}."""
        post = self._gql(_STATUS, {"input": {"id": post_id}}).get("post") or {}
        return {
            "status": str(post.get("status") or ""),
            "link": str(post.get("externalLink") or ""),
            "error": str((post.get("error") or {}).get("message") or ""),
        }

    def channels(self) -> list[dict[str, Any]]:
        """Every channel the key can post to (two or more requests; setup use only)."""
        orgs = (self._gql(_ORGS).get("account") or {}).get("organizations") or []
        found = []
        for org in orgs:
            data = self._gql(_CHANNELS, {"input": {"organizationId": org["id"]}})
            found += [dict(ch, organization=org.get("name")) for ch in data.get("channels") or []]
        return found
