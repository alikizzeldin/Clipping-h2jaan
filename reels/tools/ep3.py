"""Write reels/episodes/003-hidden-controls/plan.json (kept as a script so it is easy to re-run)."""

import json
from pathlib import Path

folder = Path(__file__).resolve().parent.parent / "episodes" / "003-hidden-controls"
AFFI = {"url": "https://clips.kick.com/clips/f6/clip_01M7W22AM19F7R996QK4RSCEC5/playlist.m3u8", "channel": "affiwillcarry"}
RDJAVI = {"url": "https://clips.kick.com/clips/da/clip_01M7X21XEN4AG89S03FJ21NV01/playlist.m3u8", "channel": "rdjavi"}
PLANE = {"url": "https://clips.kick.com/clips/ee/clip_01M7WYYTNRS4Z48JXTFXT6STA7/playlist.m3u8", "channel": "paulinholokobr"}


def part(src, start, dur, x, slow=1.0):
    p = dict(src, start=start, dur=dur, x=x)
    if slow != 1:
        p["slow"] = slow
    return p


plan = {
    "episode": 3,
    "kind": "hidden-feature",
    "topic": "4 hidden controls GTA 6 never explains: yell at drivers (R3), radio toggle (double-tap D-pad left), jump out with the engine running (double-tap Triangle/Y), push a flipped car back over",
    "title": {"en": "GTA 6 never tells you these 4 controls 🎮 (#1 saves your car)", "ar": "4 حركات في GTA 6 محد قالك عنها 🎮"},
    "summary": "4 controls GTA 6 never explains: click the right stick to yell at drivers, double-tap left on the D-pad to switch the radio, double-tap Triangle/Y to jump out with the engine running, and walk up to a flipped car and hold the prompt to push it back over.",
    "summary_ar": "4 حركات في GTA 6 ما تشرحها اللعبة: اضغط العصا اليمين عشان تصرخ على السواقين، اضغط يسار مرتين للراديو، مثلث مرتين عشان تنزل والمحرك شغال، وسيارتك مقلوبة؟ ادفعها وترجع.",
    "keywords": ["GTA6", "GTA6Tips", "GTA6Controls", "GTA6Secrets", "GTAVI", "GTA6Guide", "ViceCity", "Leonida", "قراند6", "جي_تي_اي_6"],
    "rating": {"demand": 9, "payoff": 8, "retention": 8, "fresh": 8, "visual": 7, "confidence": 8, "score": 8.2},
    "sources": [
        "https://kotaku.com/here-are-some-super-useful-control-shortcuts-gta-6-doesnt-tell-you-about-2000759100",
        "https://www.pcgamer.com/games/grand-theft-auto/15-hidden-gta-6-controls-and-features-you-should-know-about/",
        "https://rockstarintel.com/30-hidden-gta-6-controls-and-secret-mechanics-you-probably-missed/",
        "https://www.xboxachievements.com/game/grand-theft-auto-6/guide/gta-vi-how-to-roll-back-a-car-that-flips-over",
        "https://www.theclick.gg/gta-6-how-to-flip-a-car/",
    ],
    "footage": {
        "night1": {"parts": [part(AFFI, 96, 6.2, 660)]},
        "yell": {"parts": [part(RDJAVI, 13, 4.4, 1060)]},
        "night2": {"parts": [part(AFFI, 84, 4.9, 660)]},
        "exit": {"parts": [part(AFFI, 0, 4.6, 560, 1.5)]},
        "garage": {"parts": [part(AFFI, 33.5, 6.2, 600)]},
        "plane": {"parts": [part(PLANE, 0, 4.2, 660)]},
    },
    "music": {"style": "money", "bpm": 112, "seed": 23, "drop": 5.92, "break": 21.0, "back": 21.76, "outro": 27.68},
    "reel": {
        "series": "HIDDEN FEATURE", "duration": 31.3, "musicVolume": 0.42,
        "scenes": [
            {"type": "hook", "from": 0, "to": 5.92, "captions": False,
             "broll": {"src": "night1", "grade": "night", "dim": 0.2, "zoom": [1.05, 1.2]},
             "stamp": "TOP SECRET", "kicker": "GTA 6 NEVER TELLS YOU", "title": ["4", "CONTROLS"], "color": "green",
             "tag": "#1 saves your car.", "tagAt": 3.28, "ar": "4 حركات في GTA 6 محد قالك عنها"},
            {"type": "control", "from": 5.92, "to": 10.16,
             "broll": {"src": "yell", "grade": "warm", "dim": 0.35, "blur": 2},
             "rank": "4", "label": "HIDDEN CONTROL", "title": "Yell at drivers", "button": "R3", "taps": 1, "pressAt": 0.88,
             "chip": "WHILE DRIVING", "ar": "اضغط العصا اليمين وانت سايق… وصرّخ على السواقين"},
            {"type": "control", "from": 10.16, "to": 14.88,
             "broll": {"src": "night2", "grade": "night", "dim": 0.4, "blur": 2},
             "rank": "3", "label": "HIDDEN CONTROL", "title": "Radio on / off", "button": "DPAD_LEFT", "taps": 2, "pressAt": 0.88,
             "chip": "NO MENU", "ar": "يسار مرتين… والراديو يطفي أو يشتغل"},
            {"type": "control", "from": 14.88, "to": 21.76,
             "broll": {"src": "exit", "grade": "cold", "dim": 0.35, "blur": 2},
             "rank": "2", "label": "HIDDEN CONTROL", "title": "Jump out, engine running", "button": "TRIANGLE", "taps": 2, "pressAt": 0.88,
             "chip": "XBOX: Y", "ar": "مثلث مرتين… تنزل والسيارة شغالة، مثالي للهروب"},
            {"type": "control", "from": 21.76, "to": 27.68,
             "broll": {"src": "garage", "grade": "warm", "dim": 0.4, "blur": 2},
             "rank": "1", "label": "SAVES YOUR CAR", "title": "Push a flipped car back", "button": "TRIANGLE", "taps": "hold",
             "pressAt": 3.84, "flip": True, "chip": "HOLD THE PROMPT", "ar": "سيارتك انقلبت؟ لا تتركها… ادفعها وترجع"},
            {"type": "cta", "from": 27.68, "to": 31.3, "captions": False,
             "broll": {"src": "plane", "grade": "warm", "dim": 0.25},
             "line1": "A new GTA 6 secret", "line2": "every day", "button": "FOLLOW @GTA6FIED",
             "ar": "تابعنا… كل يوم سر جديد في GTA 6", "next": "MORE HIDDEN FEATURES SOON"},
        ],
        "sfx": [
            {"src": "impact.wav", "at": 0.0, "volume": 0.55},
            {"src": "glitch.wav", "at": 0.1, "volume": 0.35},
            {"src": "glitch.wav", "at": 2.1, "volume": 0.4},
            {"src": "whoosh.wav", "at": 5.85, "volume": 0.5},
            {"src": "tick.wav", "at": 6.8, "volume": 0.6},
            {"src": "whoosh.wav", "at": 10.1, "volume": 0.5},
            {"src": "tick.wav", "at": 11.04, "volume": 0.6},
            {"src": "tick.wav", "at": 11.27, "volume": 0.6},
            {"src": "whoosh.wav", "at": 14.8, "volume": 0.5},
            {"src": "tick.wav", "at": 15.76, "volume": 0.6},
            {"src": "tick.wav", "at": 15.99, "volume": 0.6},
            {"src": "riser.wav", "at": 18.8, "volume": 0.3},
            {"src": "impact.wav", "at": 21.76, "volume": 0.55},
            {"src": "whoosh.wav", "at": 24.9, "volume": 0.45},
            {"src": "trophy.wav", "at": 26.4, "volume": 0.6},
            {"src": "whoosh.wav", "at": 27.6, "volume": 0.55},
            {"src": "impact.wav", "at": 27.7, "volume": 0.5},
        ],
    },
}
(folder / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf-8")
print("ok")
