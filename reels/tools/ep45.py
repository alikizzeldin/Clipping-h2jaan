"""Plans for the two cheat-code versions: 004 (myth-busting hook) and 005 (nostalgia hook).

Both are held (status.json "hold") until the owner picks one.
"""

import json
from pathlib import Path

EP = Path(__file__).resolve().parent.parent / "episodes"
AFFI = {"url": "https://clips.kick.com/clips/f6/clip_01M7W22AM19F7R996QK4RSCEC5/playlist.m3u8", "channel": "affiwillcarry"}
RDJAVI = {"url": "https://clips.kick.com/clips/da/clip_01M7X21XEN4AG89S03FJ21NV01/playlist.m3u8", "channel": "rdjavi"}
XQC = {"url": "https://clips.kick.com/clips/7c/clip_01M7XRSJ2ZSJY4HAQHF3M4EY55/playlist.m3u8", "channel": "xqc"}
ADIN = {"url": "https://clips.kick.com/clips/93/clip_01M7RP0WZYS0W8VVWWZ4CR5M7B/playlist.m3u8", "channel": "adinross"}
PLANE = {"url": "https://clips.kick.com/clips/ee/clip_01M7WYYTNRS4Z48JXTFXT6STA7/playlist.m3u8", "channel": "paulinholokobr"}


def shot(src, start, dur, x, slow=1.0):
    p = dict(src, start=start, dur=dur, x=x)
    if slow != 1:
        p["slow"] = slow
    return {"parts": [p]}


SOURCES = [
    "https://tbreak.com/gta-6-cheats-locked-until-main-story/",
    "https://www.vice.com/en/article/gta-6-cheat-codes-explained/",
    "https://www.redbull.com/int-en/gta-6-cheat-codes",
    "https://www.gamesradar.com/games/grand-theft-auto/gta-6-cheats/",
    "https://leonidaverse.com/en/codex/gta-6-cheats",
]
CTA = {"type": "cta", "captions": False, "broll": {"src": "plane", "grade": "warm", "dim": 0.25},
       "line1": "A new GTA 6 secret", "line2": "every day", "button": "FOLLOW @GTA6FIED",
       "ar": "تابعنا… كل يوم سر جديد في GTA 6", "next": "SAVE THIS FOR LATER"}

# ------------------------------------------------------------------ 004: myth-busting hook
a = {
    "episode": 4, "kind": "secret", "topic": "GTA 6 cheats: no phone numbers (those are GTA 5); 61 cheats via phone + L1/R1 + D-pad; locked until the story is beaten; using one turns off trophies and saving",
    "title": {"en": "Stop dialing GTA 6 cheat numbers ❌ (they're from GTA 5)", "ar": "أرقام غش GTA 6… كلها من GTA 5 ❌"},
    "summary": "GTA 6 has 61 real cheats, but no phone numbers: pull out your phone, hold L1 and R1 (LB and RB on Xbox) and type the code on the D-pad. The catch: they stay locked until you beat the whole story, then a hidden Cheats tab appears in the Progress menu. Using one turns off trophies and saving.",
    "summary_ar": "GTA 6 فيها 61 غش، بس بدون أرقام: طلّع الجوال، اضغط L1 و R1 واكتب الكود بالأسهم. بس الغش مقفل لين تختم القصة، وبعدها يطلع تبويب الغش في قائمة التقدم. واستخدامه يوقف الكؤوس والحفظ.",
    "keywords": ["GTA6", "GTA6Cheats", "GTAVI", "GTA", "GTA5", "RockstarGames", "GrandTheftAutoVI", "GTA6Clips", "GTA6Shorts", "Gaming"],
    "rating": {"demand": 10, "payoff": 9, "retention": 9, "fresh": 8, "visual": 8, "confidence": 8, "score": 8.9},
    "sources": SOURCES,
    "footage": {
        "city": shot(XQC, 4, 5.4, 1050), "heli": shot(RDJAVI, 0, 3.4, 700), "drive": shot(AFFI, 84, 5.6, 660),
        "dark": shot(XQC, 6, 5.4, 1100), "menu": shot(ADIN, 2.7, 2.6, 990, 1.4), "wasted": shot(XQC, 28, 4.2, 700),
        "wild": shot(RDJAVI, 4, 3.6, 1000), "plane": shot(PLANE, 0, 3.0, 660),
    },
    "music": {"style": "mystery", "bpm": 104, "seed": 31, "drop": 4.96, "break": 13.36, "back": 16.16, "outro": 28.9},
    "reel": {
        "series": "SECRET FILE", "duration": 31.6, "musicVolume": 0.42,
        "scenes": [
            {"type": "dial", "from": 0, "to": 4.96, "captions": False, "broll": {"src": "city", "grade": "night", "dim": 0.45, "blur": 3},
             "kicker": "STOP DIALING", "title": ["GTA 6 CHEAT", "NUMBERS"], "number": "1-999-289-9633", "typeFrom": 0.4, "failAt": 3.08,
             "stamp": "GTA 5 ONLY", "ar": "وقف تتصل بأرقام الغش… هذي من GTA 5"},
            {"type": "stat", "from": 4.96, "to": 8.08, "captions": False, "broll": {"src": "heli", "grade": "warm", "dim": 0.35, "blur": 2},
             "kicker": "GTA 6 HAS", "value": 61, "countAt": 1.2, "label": "REAL CHEATS", "sub": "STORY MODE ONLY", "ar": "GTA 6 فيها 61 غش حقيقي"},
            {"type": "combo", "from": 8.08, "to": 13.36, "broll": {"src": "drive", "grade": "night", "dim": 0.5, "blur": 3},
             "label": "ENTER A CHEAT", "phoneAt": 0.56, "holdAt": 1.28, "typeAt": 3.48, "sequence": ["↑", "→", "↓", "←", "↑", "↓"],
             "xbox": "LB + RB", "title": "Type the code on the D-pad", "ar": "طلّع الجوال، اضغط L1 و R1 واكتب الكود بالأسهم"},
            {"type": "twist", "from": 13.36, "to": 18.4, "captions": False, "broll": {"src": "dark", "grade": "cold", "dim": 0.3, "blur": 4},
             "pre": "THE CATCH…", "slamAt": 2.8,
             "lines": [{"text": "LOCKED", "at": 2.8, "color": "red", "size": 240}, {"text": "UNTIL YOU BEAT", "at": 3.52, "size": 120},
                       {"text": "THE STORY", "at": 3.88, "color": "pink", "size": 170}],
             "ar": "بس… مقفلة لين تختم القصة كاملة"},
            {"type": "menu", "from": 18.4, "to": 21.8, "broll": {"src": "menu", "grade": "night", "dim": 0.45, "blur": 5},
             "menu": "PROGRESS", "tab": "CHEATS", "revealAt": 0.96, "unlockAt": 1.52, "note": "APPEARS AFTER THE STORY",
             "ar": "بعدها يطلع تبويب الغش المخفي في قائمة التقدم"},
            {"type": "list", "from": 21.8, "to": 25.72, "broll": {"src": "wasted", "grade": "none", "dim": 0.45, "blur": 3},
             "chip": "WARNING", "label": "THE MOMENT YOU USE ONE", "cardAt": 0.2, "arAt": 0.5,
             "items": [{"text": "TROPHIES", "status": "OFF", "ok": False, "at": 1.64, "icon": "trophy"},
                       {"text": "SAVING", "status": "OFF", "ok": False, "at": 2.36, "icon": "save"}],
             "ar": "وأول ما تستخدم واحد… الكؤوس والحفظ يتوقفون"},
            {"type": "twist", "from": 25.72, "to": 29.0, "captions": False, "broll": {"src": "wild", "grade": "warm", "dim": 0.2, "blur": 1},
             "pre": "FINISH THE GAME FIRST…", "slamAt": 1.72,
             "lines": [{"text": "THEN", "at": 1.72, "size": 150}, {"text": "GO WILD", "at": 1.96, "color": "pink", "size": 260}],
             "ar": "اختم اللعبة أول… وبعدها سوّ اللي تبي"},
            dict(CTA, **{"from": 29.0, "to": 31.6}),
        ],
        "sfx": [
            {"src": "impact.wav", "at": 0.0, "volume": 0.55}, {"src": "glitch.wav", "at": 0.15, "volume": 0.35},
            {"src": "scan.wav", "at": 0.4, "volume": 0.25}, {"src": "error.wav", "at": 3.08, "volume": 0.55},
            {"src": "impact.wav", "at": 3.15, "volume": 0.45}, {"src": "whoosh.wav", "at": 4.88, "volume": 0.5},
            {"src": "impact.wav", "at": 6.16, "volume": 0.5}, {"src": "ping.wav", "at": 6.2, "volume": 0.45},
            {"src": "whoosh.wav", "at": 8.0, "volume": 0.45}, {"src": "tick.wav", "at": 8.64, "volume": 0.5},
            {"src": "tick.wav", "at": 9.36, "volume": 0.6}, {"src": "tick.wav", "at": 11.56, "volume": 0.5},
            {"src": "tick.wav", "at": 11.96, "volume": 0.5}, {"src": "tick.wav", "at": 12.36, "volume": 0.5},
            {"src": "glitch.wav", "at": 13.36, "volume": 0.4}, {"src": "riser.wav", "at": 13.4, "volume": 0.3},
            {"src": "impact.wav", "at": 16.16, "volume": 0.6}, {"src": "whoosh.wav", "at": 18.33, "volume": 0.45},
            {"src": "trophy.wav", "at": 19.92, "volume": 0.6}, {"src": "whoosh.wav", "at": 21.73, "volume": 0.45},
            {"src": "error.wav", "at": 23.5, "volume": 0.4}, {"src": "error.wav", "at": 24.22, "volume": 0.4},
            {"src": "glitch.wav", "at": 25.72, "volume": 0.35}, {"src": "impact.wav", "at": 27.68, "volume": 0.65},
            {"src": "whoosh.wav", "at": 28.92, "volume": 0.5}, {"src": "impact.wav", "at": 29.02, "volume": 0.45},
        ],
    },
}

# ------------------------------------------------------------------ 005: nostalgia hook
b = {
    "episode": 5, "kind": "secret", "topic": "GTA cheats through the years (Vice City R1 R2 L1 R2, San Andreas HESOYAM, GTA 4 Niko's phone, GTA 5 1-999-BUZZOFF) to GTA 6's 61 cheats: phone + L1/R1 + D-pad, locked until the story is beaten, trophies and saving off",
    "title": {"en": "From HESOYAM to GTA 6 cheats 🎮 (there's a catch)", "ar": "من HESOYAM إلى غش GTA 6 🎮"},
    "summary": "Vice City's R1, R2, L1, R2… San Andreas' HESOYAM… Niko's phone in GTA 4… 1-999-BUZZOFF in GTA 5. Now GTA 6 has 61 cheats: hold L1 and R1 on your phone and type the code on the D-pad. The catch: they're locked until you beat the story, and using one turns off trophies and saving.",
    "summary_ar": "من فايس سيتي وسان أندرياس لجوال نيكو و1-999-BUZZOFF… والحين GTA 6 فيها 61 غش: اضغط L1 و R1 بالجوال واكتب الكود بالأسهم. بس الغش مقفل لين تختم القصة، واستخدامه يوقف الكؤوس والحفظ.",
    "keywords": ["GTA6", "GTA6Cheats", "GTA", "GTA5", "GTASanAndreas", "GTAViceCity", "RockstarGames", "GTAVI", "GTA6Shorts", "Gaming"],
    "rating": {"demand": 10, "payoff": 9, "retention": 9, "fresh": 9, "visual": 9, "confidence": 8, "score": 9.1},
    "sources": SOURCES + [
        "https://www.gamesradar.com/gta-vice-city-cheats",
        "https://www.pcgamer.com/gta-5-cheats",
    ],
    "footage": {
        "heli": shot(RDJAVI, 0, 4.0, 700), "drive": shot(AFFI, 84, 5.9, 660), "dark": shot(XQC, 6, 3.5, 1100),
        "wasted": shot(XQC, 28, 3.4, 700), "night": shot(AFFI, 96, 5.0, 660), "plane": shot(PLANE, 0, 3.0, 660),
    },
    "music": {"style": "mystery", "bpm": 96, "seed": 41, "drop": 16.13, "break": 25.49, "back": 26.16, "outro": 31.85},
    "reel": {
        "series": "SECRET FILE", "duration": 39.2, "musicVolume": 0.4,
        "scenes": [
            {"type": "era", "from": 0, "to": 16.13, "captions": False,
             "eras": [
                 {"game": "Vice City", "year": "2002", "look": "vc", "at": 0.35, "kind": "buttons",
                  "cheat": "R1 R2 L1 R2 ← ↓ → ↑ ← ↓ → ↑", "beats": [1.68, 2.64, 3.76, 4.78], "note": "ALL THE WEAPONS"},
                 {"game": "San Andreas", "year": "2004", "look": "sa", "at": 6.12, "kind": "typed", "cheat": "HESOYAM",
                  "note": "HEALTH · ARMOR · $250K"},
                 {"game": "GTA IV", "year": "2008", "look": "iv", "at": 9.33, "kind": "dial", "cheat": "362-555-0100",
                  "note": "DIALED ON NIKO'S PHONE"},
                 {"game": "GTA V", "year": "2013", "look": "v", "at": 12.15, "kind": "dial", "cheat": "1-999-BUZZOFF",
                  "note": "A BUZZARD FROM THE SKY"},
             ],
             "ar": "من فايس سيتي لسان أندرياس… كل جيل له غشّه"},
            {"type": "stat", "from": 16.13, "to": 19.85, "captions": False, "broll": {"src": "heli", "grade": "warm", "dim": 0.35, "blur": 2},
             "kicker": "AND NOW… GTA 6 HAS", "value": 61, "countAt": 2.2, "label": "CHEATS", "sub": "STORY MODE ONLY", "ar": "والحين… GTA 6 فيها 61 غش"},
            {"type": "combo", "from": 19.85, "to": 25.49, "broll": {"src": "drive", "grade": "night", "dim": 0.5, "blur": 3},
             "label": "ENTER A CHEAT", "phoneAt": 0.64, "holdAt": 1.43, "typeAt": 3.81, "sequence": ["↑", "→", "↓", "←", "↑", "↓"],
             "xbox": "LB + RB", "title": "Type the code on the D-pad", "ar": "طلّع الجوال، اضغط L1 و R1 واكتب الكود بالأسهم"},
            {"type": "twist", "from": 25.49, "to": 28.69, "captions": False, "broll": {"src": "dark", "grade": "cold", "dim": 0.3, "blur": 4},
             "pre": "BUT…", "slamAt": 0.67,
             "lines": [{"text": "LOCKED", "at": 0.67, "color": "red", "size": 240}, {"text": "UNTIL YOU BEAT", "at": 1.61, "size": 120},
                       {"text": "THE STORY", "at": 2.2, "color": "pink", "size": 170}],
             "ar": "بس… مقفلة لين تختم القصة كاملة"},
            {"type": "list", "from": 28.69, "to": 31.85, "broll": {"src": "wasted", "grade": "none", "dim": 0.45, "blur": 3},
             "chip": "WARNING", "label": "USE ONE AND…", "cardAt": 0.2, "arAt": 0.5,
             "items": [{"text": "TROPHIES", "status": "OFF", "ok": False, "at": 1.69, "icon": "trophy"},
                       {"text": "SAVING", "status": "OFF", "ok": False, "at": 2.26, "icon": "save"}],
             "ar": "واستخدامه يوقف الكؤوس والحفظ"},
            {"type": "era", "from": 31.85, "to": 36.6, "captions": False, "broll": {"src": "night", "grade": "night", "dim": 0.45, "blur": 3},
             "eras": [], "recap": {"at": 0.2, "lines": [{"text": "Some things never change…", "at": 0.6},
                                                       {"text": "cheats just got harder to earn", "at": 2.6, "color": "pink"}]},
             "ar": "أشياء ما تتغير… بس الغش صار أصعب"},
            dict(CTA, **{"from": 36.6, "to": 39.2}),
        ],
        "sfx": [
            {"src": "glitch.wav", "at": 0.3, "volume": 0.4}, {"src": "tick.wav", "at": 1.68, "volume": 0.55},
            {"src": "tick.wav", "at": 2.64, "volume": 0.55}, {"src": "tick.wav", "at": 3.76, "volume": 0.55},
            {"src": "tick.wav", "at": 4.78, "volume": 0.55}, {"src": "glitch.wav", "at": 6.08, "volume": 0.4},
            {"src": "ping.wav", "at": 7.7, "volume": 0.5}, {"src": "glitch.wav", "at": 9.3, "volume": 0.4},
            {"src": "glitch.wav", "at": 12.1, "volume": 0.4}, {"src": "ping.wav", "at": 14.0, "volume": 0.45},
            {"src": "riser.wav", "at": 13.1, "volume": 0.3}, {"src": "impact.wav", "at": 16.13, "volume": 0.65},
            {"src": "whoosh.wav", "at": 16.05, "volume": 0.5}, {"src": "impact.wav", "at": 18.33, "volume": 0.5},
            {"src": "whoosh.wav", "at": 19.8, "volume": 0.45}, {"src": "tick.wav", "at": 21.28, "volume": 0.6},
            {"src": "tick.wav", "at": 23.66, "volume": 0.5}, {"src": "tick.wav", "at": 24.06, "volume": 0.5},
            {"src": "glitch.wav", "at": 25.49, "volume": 0.35}, {"src": "impact.wav", "at": 26.16, "volume": 0.6},
            {"src": "whoosh.wav", "at": 28.62, "volume": 0.45}, {"src": "error.wav", "at": 30.4, "volume": 0.4},
            {"src": "error.wav", "at": 30.98, "volume": 0.4}, {"src": "whoosh.wav", "at": 31.8, "volume": 0.4},
            {"src": "trophy.wav", "at": 34.47, "volume": 0.55}, {"src": "whoosh.wav", "at": 36.52, "volume": 0.5},
            {"src": "impact.wav", "at": 36.62, "volume": 0.45},
        ],
    },
}

for folder, plan in (("004-cheat-codes", a), ("005-cheats-nostalgia", b)):
    d = EP / folder
    (d / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding="utf-8")
    (d / "status.json").write_text(json.dumps({"hold": "waiting for the owner to pick a version"}))
print("ok")
