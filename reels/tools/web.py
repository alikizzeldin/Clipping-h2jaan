"""Find real pictures and old footage on the web for a reel's `media` section.

    python reels/tools/web.py reddit "gta san andreas cheats notebook"      # Reddit image posts (via the pullpush archive)
    python reels/tools/web.py archive "vice city gameplay ps2"               # Archive.org videos
    python reels/tools/web.py files <archive-identifier>                     # an Archive.org item's video files (download URLs)
    python reels/tools/web.py steam 993090                                   # a Steam app's store screenshots
    python reels/tools/web.py sheet URL [URL ...]                            # download pictures and look at them: out/web/sheet.jpg
    python reels/tools/web.py vsheet URL --start 30 --every 2 --count 24     # frames of a video: out/web/vsheet.jpg

Then put what you choose in plan.json under "media" (see reels/PLAYBOOK.md, "Real pictures
from the web"): the build downloads, trims and crops it, and its "credit" goes into the
description. YouTube refuses this server (a "not a bot" check): don't try to get around it.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "out" / "web"
CACHE = Path.home() / ".cache" / "gta6fied" / "web"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/125.0"}
FONT = ROOT / "reels" / "public" / "fonts" / "JetBrainsMono.ttf"
IMAGE_HOSTS = ("i.redd.it", "i.imgur.com", "imgur.com", "preview.redd.it")


def reddit(query: str, sub: str | None, limit: int) -> None:
    params = {"q": query, "size": 100}
    if sub:
        params["subreddit"] = sub
    data = requests.get("https://api.pullpush.io/reddit/search/submission/", params=params, headers=UA, timeout=60).json().get("data", [])
    rows = [d for d in data if any(h in d.get("url", "") for h in IMAGE_HOSTS) and not d.get("over_18")]
    rows.sort(key=lambda d: -(d.get("score") or 0))
    for d in rows[:limit]:
        print(f"{d.get('score', 0):>6}  r/{d.get('subreddit', ''):<18} u/{d.get('author', ''):<22} {d.get('title', '')[:70]}\n        {d['url']}")
    if not rows:
        print("No image posts found; try other words (the archive matches words in titles).")


def archive(query: str, limit: int) -> None:
    r = requests.get("https://archive.org/advancedsearch.php", headers=UA, timeout=60, params={
        "q": f"({query}) AND mediatype:movies", "fl[]": ["identifier", "title", "downloads"], "rows": limit,
        "sort[]": "downloads desc", "output": "json"})
    for d in r.json()["response"]["docs"]:
        print(f"{d.get('downloads', 0):>8}  {d['identifier']}\n          {str(d.get('title'))[:90]}")


def files(identifier: str) -> None:
    m = requests.get(f"https://archive.org/metadata/{identifier}", headers=UA, timeout=60).json()
    md = m.get("metadata", {})
    print(f"{md.get('title')} | {md.get('creator') or md.get('uploader') or ''} | {str(md.get('date', ''))[:10]}")
    for f in m.get("files", []):
        if f["name"].lower().endswith((".mp4", ".webm", ".mkv")):
            url = f"https://archive.org/download/{identifier}/{requests.utils.quote(f['name'])}"
            print(f"  {f.get('width', '?')}x{f.get('height', '?')}  {float(f.get('length', 0) or 0):7.1f}s  {int(f.get('size', 0)) >> 20} MB\n    {url}")


def steam(appid: str) -> None:
    d = requests.get("https://store.steampowered.com/api/appdetails", params={"appids": appid, "cc": "us", "l": "en"},
                     headers=UA, timeout=60).json()[str(appid)]["data"]
    print(f"{d['name']} | {d.get('price_overview', {}).get('final_formatted', 'free')} | {', '.join(d.get('developers', []))}")
    for s in d.get("screenshots", []):
        print("  " + s["path_full"].split("?")[0])


def _fetch(url: str) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / hashlib.sha1(url.encode()).hexdigest()[:16]
    if not dest.exists():
        resp = requests.get(url, headers=UA, timeout=120)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
    return dest


def sheet(urls: list[str]) -> None:
    from PIL import Image, ImageDraw, ImageFont
    cells = []
    for i, url in enumerate(urls):
        try:
            im = Image.open(_fetch(url))
            im.seek(0)
            cells.append((i, url, im.convert("RGB")))
        except Exception as exc:  # noqa: BLE001 - report and carry on
            print(f"[{i}] {url}: {exc}")
    if not cells:
        return
    w, h, cols = 480, 480, min(4, len(cells))
    out = Image.new("RGB", (cols * w, ((len(cells) + cols - 1) // cols) * h))
    draw, font = ImageDraw.Draw(out), ImageFont.truetype(str(FONT), 20)
    for k, (i, url, im) in enumerate(cells):
        size = im.size
        im.thumbnail((w - 8, h - 34))
        x, y = (k % cols) * w, (k // cols) * h
        out.paste(im, (x + 4, y + 30))
        draw.text((x + 6, y + 4), f"[{i}] {size[0]}x{size[1]}", fill="yellow", font=font)
        print(f"[{i}] {size[0]}x{size[1]}  {url}")
    OUT.mkdir(parents=True, exist_ok=True)
    out.save(OUT / "sheet.jpg", quality=85)
    print(f"sheet: {OUT / 'sheet.jpg'}")


def vsheet(url: str, start: float, every: float, count: int) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    src = _fetch(url)
    cols = 8
    rows = (count + cols - 1) // cols
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", str(start), "-t", str(every * count), "-i", str(src), "-vf",
                    f"fps=1/{every},scale=320:-2,drawtext=fontfile={FONT}:text='%{{eif\\:t+{start}\\:d}}s':x=6:y=6:fontsize=20:"
                    f"fontcolor=yellow:box=1:boxcolor=black@0.6,tile={cols}x{rows}", "-frames:v", "1", str(OUT / "vsheet.jpg")], check=True)
    print(f"sheet: {OUT / 'vsheet.jpg'} (the number on each frame is its time in the source, in seconds)")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("reddit"); r.add_argument("query"); r.add_argument("--sub"); r.add_argument("--limit", type=int, default=25)
    a = sub.add_parser("archive"); a.add_argument("query"); a.add_argument("--limit", type=int, default=15)
    f = sub.add_parser("files"); f.add_argument("identifier")
    s = sub.add_parser("steam"); s.add_argument("appid")
    sh = sub.add_parser("sheet"); sh.add_argument("urls", nargs="+")
    v = sub.add_parser("vsheet"); v.add_argument("url"); v.add_argument("--start", type=float, default=0)
    v.add_argument("--every", type=float, default=2); v.add_argument("--count", type=int, default=24)
    x = p.parse_args()
    try:
        {"reddit": lambda: reddit(x.query, x.sub, x.limit), "archive": lambda: archive(x.query, x.limit), "files": lambda: files(x.identifier),
         "steam": lambda: steam(x.appid), "sheet": lambda: sheet(x.urls), "vsheet": lambda: vsheet(x.url, x.start, x.every, x.count)}[x.cmd]()
    except requests.RequestException as exc:
        sys.exit(f"The site did not answer: {exc}")


if __name__ == "__main__":
    main()
