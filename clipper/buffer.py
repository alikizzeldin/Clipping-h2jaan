"""Publish to YouTube through Buffer's GraphQL API (https://developers.buffer.com).

Buffer has no file upload: it fetches the video from a public URL when the
post goes out (see hosting.py). Its YouTube publishing is Shorts-only, so the
video must be vertical.

The free plan allows about 1,000 API requests per 30 days, so this module
makes one request per published clip and one later to confirm it.
"""

from __future__ import annotations

import logging
import re
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

_METRICS = """
query Metrics($input: PostsInput!) {
  posts(first: 50, input: $input) {
    edges { node { id externalLink metricsUpdatedAt metrics { type value } } }
  }
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
        # Requests left in each of Buffer's windows, by window length in seconds
        # (900, 86400, 2592000), as Buffer last reported them.
        self.remaining: dict[int, int] = {}

    def _note_allowance(self, headers) -> None:
        """Read Buffer's RateLimit headers: '"600-in-1day";r=598;t=86397, …'."""
        try:
            windows = dict(re.findall(r'"([^"]+)"[^,]*?;\s*w=(\d+)', headers.get("RateLimit-Policy") or ""))
            for name, left in re.findall(r'"([^"]+)"[^,]*?;\s*r=(\d+)', headers.get("RateLimit") or ""):
                if name in windows:
                    self.remaining[int(windows[name])] = int(left)
        except (TypeError, ValueError):
            pass

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
        self._note_allowance(getattr(resp, "headers", None) or {})
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
        """Send a video to the YouTube channel right away; returns Buffer's post id."""
        return self._create({
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
        })

    def publish_reel(self, video_url: str, *, channel_id: str, caption: str) -> str:
        """Send a video to an Instagram channel as a Reel (also shown on the profile grid)."""
        return self._create({
            "channelId": channel_id,
            "text": caption,
            "schedulingType": "automatic",
            "mode": "shareNow",
            "assets": [{"video": {"url": video_url, "metadata": {"thumbnailOffset": 3000}}}],
            "metadata": {"instagram": {"type": "reel", "shouldShareToFeed": True}},
        })

    def _create(self, post: dict[str, Any]) -> str:
        data = self._gql(_CREATE, {"input": post})
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

    def organization_id(self) -> str:
        orgs = (self._gql(_ORGS).get("account") or {}).get("organizations") or []
        if not orgs:
            raise BufferError("the Buffer key has no organization")
        return str(orgs[0]["id"])

    def metrics(self, organization_id: str) -> dict[str, dict[str, Any]]:
        """Views, likes and comments of the channel's latest 50 published posts,
        by Buffer post id, in one request. Posts YouTube has not reported on
        yet are left out."""
        data = self._gql(_METRICS, {"input": {
            "organizationId": organization_id,
            "filter": {"status": ["sent"], "channelIds": [self.channel_id]},
        }})
        found: dict[str, dict[str, Any]] = {}
        for edge in (data.get("posts") or {}).get("edges") or []:
            node = edge.get("node") or {}
            values = {m.get("type"): m.get("value") for m in node.get("metrics") or []}
            views = values.get("views", values.get("impressions"))
            # Until Buffer's daily read of YouTube has reached a post, its
            # numbers are placeholders, not real zeros.
            if views is None or not node.get("metricsUpdatedAt"):
                continue
            found[str(node.get("id"))] = {
                "views": int(views),
                "likes": int(values.get("reactions", values.get("likes", 0)) or 0),
                "comments": int(values.get("comments", 0) or 0),
                "link": str(node.get("externalLink") or ""),
            }
        return found

    def channels(self) -> list[dict[str, Any]]:
        """Every channel the key can post to (two or more requests; setup use only)."""
        orgs = (self._gql(_ORGS).get("account") or {}).get("organizations") or []
        found = []
        for org in orgs:
            data = self._gql(_CHANNELS, {"input": {"organizationId": org["id"]}})
            found += [dict(ch, organization=org.get("name")) for ch in data.get("channels") or []]
        return found
