"""Build public/ep2/reel.json (Secret File #002: keep your Chapter 1 money, then the Moses car loop)."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from words import words  # noqa: E402

root = Path(__file__).resolve().parent.parent / "public"
w = words(json.loads((root / "ep2/alignment.json").read_text()))

reel = {
    "series": "SECRET FILE", "episode": 2, "duration": 31.0,
    "voice": "ep2/voice.wav", "music": "ep2/music.wav", "musicVolume": 0.42,
    "words": w,
    "scenes": [
        {"type": "hook", "from": 0, "to": 3.2, "captions": False,
         "broll": {"src": "ep2/hook.mp4", "grade": "warm", "dim": 0.15, "zoom": [1.05, 1.2]},
         "stamp": "WARNING", "kicker": "YOUR GTA 6 MONEY IS ABOUT TO", "title": ["VANISH"], "color": "red",
         "tagAt": 1.6, "counter": {"from": 24800, "to": 0, "at": 2.24},
         "ar": "فلوسك في GTA 6 راح تختفي!"},
        {"type": "list", "from": 3.2, "to": 11.52,
         "broll": {"src": "ep2/house.mp4", "grade": "none", "dim": 0.1, "zoom": [1.02, 1.1]},
         "chip": "WARNING", "label": "WHEN CHAPTER 1 ENDS", "fromLabel": "CHAPTER 1", "toLabel": "CHAPTER 2",
         "cardAt": 2.2, "arAt": 2.6,
         "items": [
             {"text": "YOUR CASH", "status": "WIPED", "ok": False, "at": 2.56, "icon": "cash"},
             {"text": "JASON'S HOUSE STASH", "status": "WIPED", "ok": False, "at": 3.6, "icon": "house"},
             {"text": "BUCKME FAMILY SAVINGS", "status": "SAFE", "ok": True, "at": 6.32, "icon": "bank"},
         ],
         "ar": "نهاية الفصل الأول تمسح الكاش والمخبأ في بيت جيسون… والتوفير العائلي بس يبقى"},
        {"type": "phone", "from": 11.52, "to": 16.24, "captions": False,
         "broll": {"src": "ep2/room.mp4", "grade": "night", "dim": 0.45, "blur": 6},
         "app": "BuckMe", "notice": {"title": "MISSION · TOURIST TRAP", "text": "Do this BEFORE you start it", "at": 1.36},
         "source": {"label": "CASH", "amount": 24800}, "target": {"label": "FAMILY SAVINGS", "amount": 0},
         "moveAt": 2.4, "done": "MONEY SAFE",
         "ar": "حوّل كل فلوسك للتوفير العائلي قبل مهمة Tourist Trap"},
        {"type": "scan", "from": 16.24, "to": 22.48,
         "broll": {"src": "ep2/scan.mp4", "grade": "cold", "zoom": [1.03, 1.1]},
         "step": "CHAPTER 2", "label": "REBUILD FAST",
         "target": {"x": 560, "y": 980, "w": 820, "h": 760},
         "checks": [
             {"text": "STEAL A CAR", "at": 2.72},
             {"text": "NO TRACKER", "at": 3.76},
             {"text": "SCAN IT ON YOUR PHONE", "at": 4.64},
         ],
         "ar": "الفصل الثاني: اسرق سيارة بدون جهاز تتبع وافحصها بجوالك أول"},
        {"type": "cash", "from": 22.48, "to": 26.96, "captions": False,
         "broll": {"src": "ep2/garage.mp4", "grade": "green", "dim": 0.35, "blur": 2},
         "proof": {"src": "ep2/wainK.png", "at": 0.0, "until": 1.5, "caption": "REAL IN-GAME PHONE SCAN",
                   "highlights": [{"y": 55, "h": 13}, {"y": 69, "h": 13, "color": "gold"}]},
         "title": "SELL TO MOSES", "amount": "$1,000+", "per": "each car", "amountAt": 1.5,
         "repeat": "REPEAT", "repeatAt": 3.36,
         "ar": "وبيعها لموسى بألف دولار أو أكثر… وكرر!"},
        {"type": "cta", "from": 26.96, "to": 31.0, "captions": False,
         "broll": {"src": "sample/plane.mp4", "grade": "warm", "dim": 0.25},
         "line1": "A new GTA 6 secret", "line2": "every day", "button": "FOLLOW @GTA6FIED",
         "ar": "تابعنا… كل يوم سر جديد في GTA 6", "next": "SECRET FILE #003 · TOMORROW"},
    ],
    "sfx": [
        {"src": "sfx/impact.wav", "at": 0.0, "volume": 0.55},
        {"src": "sfx/glitch.wav", "at": 0.1, "volume": 0.35},
        {"src": "sfx/error.wav", "at": 1.8, "volume": 0.5},
        {"src": "sfx/whoosh.wav", "at": 3.1, "volume": 0.5},
        {"src": "sfx/error.wav", "at": 5.95, "volume": 0.4},
        {"src": "sfx/error.wav", "at": 7.0, "volume": 0.4},
        {"src": "sfx/ping.wav", "at": 9.72, "volume": 0.55},
        {"src": "sfx/whoosh.wav", "at": 11.45, "volume": 0.5},
        {"src": "sfx/ping.wav", "at": 12.85, "volume": 0.5},
        {"src": "sfx/coins.wav", "at": 13.92, "volume": 0.5},
        {"src": "sfx/cash.wav", "at": 14.85, "volume": 0.5},
        {"src": "sfx/whoosh.wav", "at": 16.15, "volume": 0.5},
        {"src": "sfx/scan.wav", "at": 16.6, "volume": 0.35},
        {"src": "sfx/tick.wav", "at": 18.95, "volume": 0.5},
        {"src": "sfx/tick.wav", "at": 19.99, "volume": 0.5},
        {"src": "sfx/tick.wav", "at": 20.87, "volume": 0.5},
        {"src": "sfx/whoosh.wav", "at": 22.4, "volume": 0.5},
        {"src": "sfx/cash.wav", "at": 23.98, "volume": 0.7},
        {"src": "sfx/impact.wav", "at": 23.98, "volume": 0.35},
        {"src": "sfx/coins.wav", "at": 24.1, "volume": 0.45},
        {"src": "sfx/whoosh.wav", "at": 25.8, "volume": 0.4},
        {"src": "sfx/whoosh.wav", "at": 26.88, "volume": 0.55},
        {"src": "sfx/impact.wav", "at": 26.98, "volume": 0.5},
    ],
}

(root / "ep2/reel.json").write_text(json.dumps(reel, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(w), "words")
