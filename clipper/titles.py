"""Turn a viewer-written clip title into YouTube metadata.

Clip titles on Kick are typed by whoever cut the clip, and many are keyboard
mash ("kkkkkkk", "dffdefe 2"). Those fall back to a generic title rather than
being published as-is.
"""

from __future__ import annotations

import re
import unicodedata

from .config import Profile, Publish
from .models import Clip

MAX_TITLE = 100  # YouTube's limit
MAX_DESCRIPTION = 4900
MAX_TAG_CHARS = 450  # YouTube allows 500 across all tags; leave headroom

_NOISE = re.compile(r"\s*\|\s*clip\s*$", re.IGNORECASE)
_COMMANDS = re.compile(r"(?<!\S)![\w-]+")


# Slurs that must never reach a published title. Matched at the start of a
# word, after undoing look-alike spellings ("n1gg4") and stretched letters.
_SLURS = re.compile(
    r"\b(n+i+g{2,}|n+i+g+r|f+a+g{2,}|f+a+g+o+t|r+e+t+a+r+d|k+i+k+e+s?\b|c+h+i+n+k+s?\b|t+r+a+n+n+(y|ies)\b)"
)
_LOOKALIKES = str.maketrans({"1": "i", "!": "i", "3": "e", "4": "a", "@": "a", "0": "o", "5": "s", "$": "s", "7": "t"})


def is_offensive(title: str) -> bool:
    """True if the title contains a slur, including look-alike spellings."""
    plain = (title or "").lower().translate(_LOOKALIKES)
    return bool(_SLURS.search(re.sub(r"[^a-z ]", "", plain)))


def _is_mash(token: str) -> bool:
    """Keyboard mash: a long Latin token built from very few distinct letters."""
    if not token.isascii():
        return False  # the heuristic only makes sense for Latin script
    letters = [ch for ch in token.lower() if ch.isalpha()]
    if len(letters) < 5:
        return False
    if len(letters) > 22:
        return True
    return len(set(letters)) / len(letters) <= 0.5


def clean_title(raw: str) -> str:
    """A tidied title, or "" when the original isn't worth showing."""
    text = unicodedata.normalize("NFC", raw or "")
    text = "".join(ch for ch in text if unicodedata.category(ch)[0] != "C")
    text = text.replace("<", "").replace(">", "")
    text = _NOISE.sub("", text)
    text = _COMMANDS.sub("", text)
    text = re.sub(r"\s+", " ", text).strip(" |-_.,/")
    text = re.sub(r"\s*\|\s*(\|\s*)+", " | ", text)
    text = re.sub(r"([!?.])\1{2,}", r"\1", text)

    if not any(ch.isalpha() for ch in text) or sum(ch.isalnum() for ch in text) < 3:
        return ""  # "aa", "+18", "a"
    words = [w for w in re.split(r"[\s|]+", text) if any(ch.isalpha() for ch in w)]
    mash = [w for w in words if _is_mash(w)]
    solid = [w for w in words if w not in mash]
    if mash and len(solid) < 2:
        return ""  # "kkkkkkk", "dffdefe 2", "sfgdffdgfdhgdhgfdjgf mami"
    if text.isupper() and len(text) > 12:
        text = text.capitalize()
    return text


def _fit(text: str, limit: int) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    cut = text[: limit - 1].rsplit(" ", 1)[0].rstrip(" |-,")
    return (cut or text[: limit - 1]) + "…"


def _hashtag(word: str) -> str:
    return "#" + re.sub(r"[^\w]", "", word)


def build_metadata(clip: Clip, profile: Profile, publish: Publish, shorts: bool) -> dict:
    """Title, description and tags for one upload."""
    cleaned = clean_title(clip.title)
    template = publish.title_template if cleaned else publish.fallback_title_template
    suffix = " #shorts" if shorts else ""
    base = template.format(title="{title}", streamer=clip.channel_name, game=profile.label)
    # Shorten the clip title, not the streamer or game, when the whole thing is too long.
    room = MAX_TITLE - len(suffix) - (len(base) - len("{title}") if "{title}" in base else len(base))
    title = base.replace("{title}", _fit(cleaned, max(room, 10))) if "{title}" in base else base
    title = _fit(title, MAX_TITLE - len(suffix)) + suffix

    hashtags = [_hashtag(h) for h in profile.hashtags if h]
    if shorts:
        hashtags.append("#shorts")
    lines = [
        f"{clip.channel_name} playing {profile.label}, live on Kick.",
        "",
        f"Streamer: {clip.channel_url}",
        f"Original clip: {clip.url}",
    ]
    if clip.clipper_name:
        lines.append(f"Clipped by: {clip.clipper_name}")
    if publish.description_footer.strip():
        lines += ["", publish.description_footer.strip()]
    if hashtags:
        lines += ["", " ".join(dict.fromkeys(hashtags))]
    description = "\n".join(lines)[:MAX_DESCRIPTION]

    tags: list[str] = []
    used = 0
    for tag in [profile.label, clip.channel_name, *profile.hashtags, "kick", "kick clips", "clips"]:
        tag = tag.strip()
        if not tag or tag.lower() in {t.lower() for t in tags}:
            continue
        if used + len(tag) + 1 > MAX_TAG_CHARS:
            break
        tags.append(tag)
        used += len(tag) + 1

    return {"title": title, "description": description, "tags": tags, "clean_title": cleaned}
