"""Tell the owner when a clip goes out or something breaks.

Works with a Discord webhook, a Telegram bot, or both; with neither set it
does nothing. A failed notification never stops the agent.
"""

from __future__ import annotations

import logging
import os

import requests

log = logging.getLogger(__name__)


class Notifier:
    def __init__(self, discord_webhook: str = "", telegram_token: str = "", telegram_chat: str = "",
                 session: requests.Session | None = None):
        self.discord_webhook = discord_webhook
        self.telegram_token = telegram_token
        self.telegram_chat = telegram_chat
        self.session = session or requests.Session()

    @classmethod
    def from_env(cls) -> "Notifier":
        return cls(
            os.environ.get("DISCORD_WEBHOOK_URL", ""),
            os.environ.get("TELEGRAM_BOT_TOKEN", ""),
            os.environ.get("TELEGRAM_CHAT_ID", ""),
        )

    @property
    def enabled(self) -> bool:
        return bool(self.discord_webhook or (self.telegram_token and self.telegram_chat))

    def send(self, text: str) -> bool:
        """Send to every configured place; True if at least one accepted it."""
        delivered = False
        if self.discord_webhook:
            delivered |= self._post(self.discord_webhook, {"content": text[:1900]}, "Discord")
        if self.telegram_token and self.telegram_chat:
            url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
            delivered |= self._post(url, {"chat_id": self.telegram_chat, "text": text[:4000]}, "Telegram")
        return delivered

    def _post(self, url: str, payload: dict, name: str) -> bool:
        try:
            resp = self.session.post(url, json=payload, timeout=20)
        except requests.RequestException as exc:
            log.warning("could not reach %s: %s", name, type(exc).__name__)
            return False
        if resp.status_code >= 300:
            log.warning("%s refused the notification (HTTP %s)", name, resp.status_code)
            return False
        return True
