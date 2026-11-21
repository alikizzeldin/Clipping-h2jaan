"""Motion-graphics reels (GTA 6 secrets, tips and news): build, render, publish.

An episode is a folder under reels/episodes/ (see reels/PLAYBOOK.md):

    plan.json        the script, its rating and sources, title, the shots to cut
                     from Kick clips, stills, music settings and the scene data
    voice.mp3        the narration (ElevenLabs)
    alignment.json   ElevenLabs' character timings for the narration

`build` downloads the Kick clips the plan names, cuts its shots to vertical,
composes the music, and writes the props Remotion renders (reels/src). The
same plan renders the same video on any machine, so the plan is all that is
kept in git. `publish` posts the video through Buffer (YouTube, then
Instagram) and records it in the publish history as a reel.
"""

from __future__ import annotations

import copy
import hashlib
import json
import logging
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from .download import DownloadError, download
from .models import Clip

log = logging.getLogger(__name__)

REELS = Path(__file__).resolve().parent.parent / "reels"
FPS = 30
MAX_TITLE = 100
SHARED_PREFIXES = ("sfx/", "brand/", "fonts/", "shared/")


class ReelError(RuntimeError):
    pass


def words(alignment: dict) -> list[dict]:
    """Word timings from ElevenLabs' character timings."""
    chars = alignment["characters"]
    starts = alignment["character_start_times_seconds"]
    ends = alignment["character_end_times_seconds"]
    out: list[dict] = []
    cur, first, last = "", None, None
    for ch, a, b in zip(chars, starts, ends):
        if ch.isspace():
            if cur:
                out.append({"text": cur, "start": round(first, 3), "end": round(last, 3)})
            cur, first = "", None
            continue
        if first is None:
            first = a
        cur += ch
        last = b
    if cur:
        out.append({"text": cur, "start": round(first, 3), "end": round(last, 3)})
    return out


def load_plan(folder: Path) -> dict:
    path = folder / "plan.json"
    if not path.exists():
        raise ReelError(f"no plan.json in {folder}")
    plan = json.loads(path.read_text(encoding="utf-8"))
    for key in ("episode", "title", "reel"):
        if key not in plan:
            raise ReelError(f"plan.json has no {key!r}")
    return plan


def episode_id(plan: dict) -> str:
    return f"reel_{int(plan['episode']):03d}"


def _run(cmd: list[str], cwd: Path | None = None) -> None:
    done = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    if done.returncode != 0:
        raise ReelError(f"{cmd[0]} failed: {(done.stderr or done.stdout).strip()[-600:]}")


def _size(path: Path) -> tuple[int, int]:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True).stdout.strip()
    try:  # TS files can list the stream more than once
        w, h = (int(v) for v in out.splitlines()[0].split(",")[:2])
    except (ValueError, IndexError) as exc:
        raise ReelError(f"could not read the size of {path.name}") from exc
    return w, h


def source(url: str, cache: Path) -> Path:
    """A Kick clip (by its playlist URL), downloaded once and kept in `cache`."""
    name = hashlib.sha1(url.encode()).hexdigest()[:16]
    for found in cache.glob(f"{name}.*"):
        if found.stat().st_size:
            return found
    try:
        return download(url, cache, name)
    except DownloadError as exc:
        raise ReelError(f"could not download {url}: {exc}") from exc


def cut_shot(parts: list[dict], dest: Path, cache: Path, preset: str = "medium") -> Path:
    """Cut one shot (one or more pieces back to back) to 1080x1920.

    Each part: {"url", "start", "dur", "x", "slow"?}. "x" is the left edge of
    the vertical crop in a 1920x1080 frame (scaled for smaller sources).
    """
    pieces = []
    for i, part in enumerate(parts):
        src = source(part["url"], cache)
        w, h = _size(src)
        cw = round(h * 9 / 16 / 2) * 2
        x = round(float(part.get("x", (1920 - 608) / 2)) * w / 1920)
        x = max(0, min(w - cw, x))
        vf = (f"crop={cw}:{h}:{x}:0,scale=1080:1920:flags=lanczos,fps={FPS},"
              "unsharp=5:5:0.6,eq=contrast=1.06:saturation=1.1")
        slow = float(part.get("slow", 1))
        if slow != 1:
            vf += f",setpts={slow}*PTS"
        piece = dest.with_name(f"{dest.stem}.part{i}.mp4")
        _run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", str(part["start"]), "-i", str(src), "-t", str(part["dur"]),
              "-an", "-vf", vf, "-r", str(FPS), "-c:v", "libx264", "-preset", preset, "-crf", "16", "-pix_fmt", "yuv420p", str(piece)])
        pieces.append(piece)
    if len(pieces) == 1:
        pieces[0].replace(dest)
    else:
        listing = dest.with_name(f"{dest.stem}.txt")
        listing.write_text("".join(f"file '{p.name}'\n" for p in pieces))
        _run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listing.name, "-c", "copy", dest.name],
             cwd=dest.parent)
        listing.unlink()
        for p in pieces:
            p.unlink()
    return dest


def cut_still(spec: dict, dest: Path, cache: Path) -> Path:
    """One frame of a clip, cropped (in 1920x1080 coordinates) and enlarged: e.g. an in-game menu as proof."""
    src = source(spec["url"], cache)
    w, _ = _size(src)
    k = w / 1920
    cw, ch, x, y = (round(v * k) for v in spec["crop"])
    _run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", str(spec["at"]), "-i", str(src), "-frames:v", "1",
          "-vf", f"crop={cw}:{ch}:{x}:{y},scale={int(spec.get('width', 1040))}:-2:flags=lanczos,unsharp=5:5:0.8", str(dest)])
    return dest


def _loudnorm(src: Path, dest: Path, target: float) -> None:
    _run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(src), "-af",
          f"loudnorm=I={target}:TP=-1.5:LRA=11,aresample=44100", "-ar", "44100", str(dest)])


def build(folder: Path, cache: Path, preset: str = "medium") -> Path:
    """Prepare everything Remotion needs for an episode; returns the props file."""
    folder = folder.resolve()
    plan = load_plan(folder)
    eid = episode_id(plan)
    stage = REELS / "public" / "ep" / eid
    shutil.rmtree(stage, ignore_errors=True)
    stage.mkdir(parents=True)
    cache.mkdir(parents=True, exist_ok=True)

    for name, spec in (plan.get("footage") or {}).items():
        log.info("cutting shot %s", name)
        cut_shot(spec["parts"], stage / f"{name}.mp4", cache, preset)
    for name, spec in (plan.get("stills") or {}).items():
        cut_still(spec, stage / name, cache)
    for extra in folder.glob("*.png"):
        shutil.copy(extra, stage / extra.name)

    _loudnorm(folder / "voice.mp3", stage / "voice.wav", -15)
    alignment = json.loads((folder / "alignment.json").read_text())
    said = words(alignment)
    reel = copy.deepcopy(plan["reel"])
    duration = float(reel.get("duration") or round(said[-1]["end"] + 1.4, 2))

    music = {"style": "mystery", "bpm": 100, "seed": 7, "drop": 3, "break": 15, "back": 16.3, "outro": duration - 4}
    music.update(plan.get("music") or {})
    raw = stage / "music.raw.wav"
    _run(["python3", str(REELS / "tools" / "music.py"), str(raw), "--length", str(duration), "--drop", str(music["drop"]),
          "--break", str(music["break"]), "--back", str(music["back"]), "--outro", str(music["outro"]),
          "--style", music["style"], "--bpm", str(music["bpm"]), "--seed", str(music["seed"])])
    _loudnorm(raw, stage / "music.wav", -16)
    raw.unlink()

    def local(src: str) -> str:
        if src.startswith(SHARED_PREFIXES):
            return src
        if (stage / f"{src}.mp4").exists():
            return f"ep/{eid}/{src}.mp4"
        if (stage / src).exists():
            return f"ep/{eid}/{src}"
        raise ReelError(f"the plan uses {src!r}, which is neither a shot, a still nor a shared file")

    for scene in reel["scenes"]:
        if scene.get("broll"):
            scene["broll"]["src"] = local(scene["broll"]["src"])
        if scene.get("proof"):
            scene["proof"]["src"] = local(scene["proof"]["src"])
    for fx in reel.get("sfx", []):
        if not fx["src"].startswith(SHARED_PREFIXES):
            fx["src"] = f"sfx/{fx['src']}"
    reel.update({
        "series": reel.get("series", "SECRET FILE"), "episode": int(plan["episode"]), "duration": duration,
        "voice": f"ep/{eid}/voice.wav", "music": f"ep/{eid}/music.wav", "words": said,
    })
    props = stage / "reel.json"
    props.write_text(json.dumps(reel, ensure_ascii=False, indent=1), encoding="utf-8")
    return props


def _browser_args() -> list[str]:
    chrome = os.environ.get("REMOTION_BROWSER", "")
    return [f"--browser-executable={chrome}"] if chrome else []


def render(props: Path, out: Path, concurrency: int | None = None) -> Path:
    """Render the reel and set its loudness for Shorts and Reels (-14 LUFS)."""
    out.parent.mkdir(parents=True, exist_ok=True)
    raw = out.with_name(out.stem + ".raw.mp4")
    cmd = ["npx", "remotion", "render", "src/index.ts", "Reel", str(raw.resolve()), f"--props={props.resolve()}",
           "--log=error", *_browser_args()]
    if concurrency:
        cmd.append(f"--concurrency={concurrency}")
    _run(cmd, cwd=REELS)
    _run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(raw), "-c:v", "copy", "-af",
          "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)])
    raw.unlink()
    return out


def stills(props: Path, frames: list[int], sheet: Path) -> Path:
    """Render single frames and tile them into one image, to check the layout."""
    from PIL import Image

    sheet.parent.mkdir(parents=True, exist_ok=True)
    tiles = []
    for f in frames:
        png = sheet.with_name(f"{sheet.stem}-{f}.png")
        _run(["npx", "remotion", "still", "src/index.ts", "Reel", str(png.resolve()), f"--frame={f}",
              f"--props={props.resolve()}", "--log=error", *_browser_args()], cwd=REELS)
        tiles.append(Image.open(png).convert("RGB").resize((360, 640)))
        png.unlink()
    cols = min(6, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    board = Image.new("RGB", (360 * cols, 640 * rows))
    for i, tile in enumerate(tiles):
        board.paste(tile, ((i % cols) * 360, (i // cols) * 640))
    board.save(sheet, quality=88)
    return sheet


def _fit(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def metadata(plan: dict, keywords: list[str]) -> dict:
    """Title (English | Arabic), description and Instagram caption for a reel."""
    en, ar = plan["title"]["en"].strip(), plan["title"].get("ar", "").strip()
    title = f"{en} | {ar}" if ar else en
    if len(title) > MAX_TITLE and ar:
        title = f"{_fit(en, MAX_TITLE - len(ar) - 3)} | {ar}"
    title = _fit(title, MAX_TITLE)
    if len(title) + len(" #shorts") <= MAX_TITLE:
        title += " #shorts"
    tags = list(dict.fromkeys(["#" + re.sub(r"[^\w]", "", k) for k in [*plan.get("keywords", []), *keywords] if k]))[:10]
    credits = sorted({part["channel"] for shot in (plan.get("footage") or {}).values()
                      for part in shot["parts"] if part.get("channel")})
    lines = [plan.get("summary", en), ""]
    if plan.get("summary_ar"):
        lines += [plan["summary_ar"], ""]
    if credits:
        lines.append("Gameplay footage: " + ", ".join(f"kick.com/{c}" for c in credits))
    if plan.get("sources"):
        lines.append("Checked against: " + ", ".join(re.sub(r"^https?://(www\.)?", "", s).split("/")[0] for s in plan["sources"][:4]))
    lines += ["", "New GTA 6 secret every day. Follow for more!", "", " ".join(tags + ["#shorts"])]
    description = "\n".join(lines)[:4900]
    caption = "\n".join([f"{en} | {ar}" if ar else en, "", plan.get("summary", ""), "",
                         "Follow for a new GTA 6 secret every day 🔥", "", " ".join(tags)])[:2200]
    return {"title": title, "description": description, "caption": caption, "tags": [t.lstrip("#") for t in tags],
            "clean_title": en, "hook": "reel"}


def reel_clip(plan: dict, duration: float) -> Clip:
    """The publish history stores posts as clips; a reel is recorded as one of the channel's own."""
    return Clip(id=episode_id(plan), source="reel", title=plan["title"]["en"], channel_slug="gta6fied",
                channel_name="GTA6Fied", category_slug="grand-theft-auto-vi", category_name="GTA 6", views=0, likes=0,
                duration=duration, created_at=datetime.now(timezone.utc), media_url="", origin="reel")
