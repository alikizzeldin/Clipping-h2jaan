"""Hook titles: English first, then Arabic.

Every upload is titled with a short hook in both languages, for example
"xQc's first minutes in GTA 6 😳 | أول دقائق xQc في GTA 6 😳". The hook is
picked to fit the clip:

- the moment the game unlocked, for clips that run through the start time
  or begin within two minutes of it;
- what happens, when the words spoken in the clip clearly say so (police,
  getting killed);
- the first hours and days after the start time ("first minutes", "first
  day");
- otherwise a general highlight hook.

The last few hooks used are avoided, so the channel does not repeat itself.
The Arabic lines are noun phrases ("ردة فعل xQc", "أول دقائق xQc"), so they
fit every streamer without assuming whether they are a man or a woman.
"""

from __future__ import annotations

import re
import zlib
from dataclasses import dataclass
from datetime import datetime, timedelta

from .models import Clip


@dataclass(frozen=True)
class Hook:
    key: str
    en: str  # {s} = streamer, {g} = game
    ar: str

    def fill(self, streamer: str, game: str) -> tuple[str, str]:
        return self.en.format(s=streamer, g=game), self.ar.format(s=streamer, g=game)


UNLOCK = [Hook("unlock", "The moment {g} unlocked for {s} 🚨", "لحظة نزول {g} عند {s} 🚨")]

LAUNCH_HOURS = [
    Hook("first_minutes", "{s}'s first minutes in {g} 😳", "أول دقائق {s} في {g} 😳"),
    Hook("first_reaction", "{s}'s first reaction to {g} 🤯", "ردة فعل {s} الأولى على {g} 🤯"),
    Hook("first_time", "{s} plays {g} for the first time 🔥", "أول تجربة لـ {s} في {g} 🔥"),
    Hook("finally_here", "{s} can't believe {g} is finally here 😱", "{g} نزلت أخيرًا… وهذي ردة فعل {s} 😱"),
]

LAUNCH_DAYS = [
    Hook("first_day", "{s}'s first day in {g} 🔥", "أول يوم لـ {s} في {g} 🔥"),
    Hook("first_reaction", "{s}'s first reaction to {g} 🤯", "ردة فعل {s} الأولى على {g} 🤯"),
]

GENERAL = [
    Hook("insane", "This {g} moment from {s} is insane 🔥", "لقطة جنونية من {s} في {g} 🔥"),
    Hook("didnt_expect", "{s} did NOT expect this in {g} 😳", "ولا أحد توقع هذا… {s} في {g} 😳"),
    Hook("wait_for_it", "Wait for it… {s} in {g} 💀", "استنى للآخر… {s} في {g} 💀"),
    Hook("craziest", "{s}'s craziest {g} moment 🤯", "أقوى لحظة لـ {s} في {g} 🤯"),
    Hook("only_in", "Only in {g}… {s}'s reaction 😂", "بس في {g}… ردة فعل {s} 😂"),
]

# Hooks that say what happens, used only when the words spoken (in English, or
# their English translation) clearly say so.
BY_WORDS = [
    (re.compile(r"\b(police|cops?|swat|sheriff|arrest(ed)?|busted)\b", re.IGNORECASE),
     Hook("cops", "{s} vs the cops in {g} 🚔", "{s} ضد الشرطة في {g} 🚔")),
    (re.compile(r"\b(wasted|died|killed)\b", re.IGNORECASE),
     Hook("wasted", "{s} got wasted in {g} 💀", "موتة {s} في {g} 💀")),
]

UNLOCK_WINDOW = timedelta(minutes=2)
LAUNCH_HOURS_WINDOW = timedelta(hours=6)
LAUNCH_DAYS_WINDOW = timedelta(days=3)


def pick_hook(clip: Clip, launch_at: datetime | None = None, words: str = "",
              avoid: list[str] | tuple[str, ...] = ()) -> Hook:
    """The hook that best fits `clip`, steering clear of the hooks in `avoid`.

    `launch_at` is when the game came out (the agent's start time); `words`
    is what is said in the clip, in English.
    """
    moment = clip.started_at or clip.created_at
    since = moment - launch_at if launch_at else None
    pools: list[list[Hook]] = []
    # The unlock itself: the clip runs through the start time, or begins just after it.
    if since is not None and -timedelta(seconds=clip.duration) <= since <= UNLOCK_WINDOW:
        pools.append(UNLOCK)
    said = [hook for pattern, hook in BY_WORDS if pattern.search(words or "")]
    if said:
        pools.append(said)
    if since is not None and since <= LAUNCH_HOURS_WINDOW:
        pools.append(LAUNCH_HOURS)
    elif since is not None and since <= LAUNCH_DAYS_WINDOW:
        pools.append(LAUNCH_DAYS)
    pools.append(GENERAL)

    recent = set(avoid)
    for pool in pools:
        fresh = [hook for hook in pool if hook.key not in recent]
        if fresh:
            return _choose(fresh, clip.id)
    return _choose(pools[0], clip.id)  # everything was used lately: repeat the best fit


def _choose(hooks: list[Hook], seed: str) -> Hook:
    """A stable pick, so a clip gets the same hook if it is rendered again."""
    return hooks[zlib.crc32(seed.encode("utf-8")) % len(hooks)]
