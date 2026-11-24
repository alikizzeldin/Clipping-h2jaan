"""Preview looks on a real episode, to check a new look before using it.

    python reels/tools/look.py leonida-sunset                       # on the newest episode
    python reels/tools/look.py vice-tape classic --episode reels/episodes/016-satan-boss
    python reels/tools/look.py vice-tape --frames 10,90,300,600

For each look it renders still frames of the episode in that look (a dry run: nothing is
posted, the episode folder is not touched) and writes out/looks/<look>.jpg, a contact sheet
with the look's name on it. Open it and check every frame like a normal layout check.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
EPISODES = ROOT / "reels" / "episodes"
OUT = ROOT / "out" / "looks"


def newest_episode() -> Path:
    own = sorted(p for p in EPISODES.iterdir() if p.is_dir() and p.name[:1].isdigit() and (p / "plan.json").exists())
    if not own:
        sys.exit("no episode folders to preview on")
    return own[-1]


def default_frames(plan: dict) -> list[int]:
    """A frame in the middle of every scene (plus frame 10, the hook as it lands)."""
    frames = [10]
    for scene in plan["reel"]["scenes"]:
        frames.append(int(round((scene["from"] + scene["to"]) / 2 * 30)))
    return frames[:12]


def preview(look: str, episode: Path, frames: list[int]) -> Path:
    stage = OUT / "stage" / look / episode.name
    shutil.rmtree(stage, ignore_errors=True)
    stage.mkdir(parents=True)
    for f in episode.iterdir():
        if f.is_file() and f.name != "status.json":
            shutil.copy(f, stage / f.name)
    plan = json.loads((stage / "plan.json").read_text())
    if look == "classic":
        plan["reel"].pop("style", None)
    else:
        plan["reel"]["style"] = look
    (stage / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1))
    cmd = [sys.executable, "-m", "clipper", "reel", str(stage), "--dry-run", "--stills", ",".join(map(str, frames))]
    res = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if res.returncode != 0:
        sys.exit(f"{look}: render failed\n{res.stdout[-2000:]}\n{res.stderr[-3000:]}")
    sheet = ROOT / "out" / "reels" / f"reel_{int(plan['episode']):03d}-stills.jpg"
    board = Image.open(sheet).convert("RGB")
    label = Image.new("RGB", (board.width, 70), (12, 12, 16))
    draw = ImageDraw.Draw(label)
    try:
        font = ImageFont.truetype(str(ROOT / "reels" / "public" / "fonts" / "JetBrainsMono.ttf"), 34)
    except OSError:
        font = ImageFont.load_default()
    draw.text((20, 16), f"LOOK: {look}   ·   {episode.name}   ·   frames {','.join(map(str, frames))}", fill=(255, 255, 255), font=font)
    out = Image.new("RGB", (board.width, board.height + 70))
    out.paste(label, (0, 0))
    out.paste(board, (0, 70))
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / f"{look}.jpg"
    out.save(dest, quality=88)
    shutil.rmtree(stage, ignore_errors=True)
    return dest


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("looks", nargs="+", help="look ids (files in reels/src/looks/catalog), or 'classic'")
    ap.add_argument("--episode", type=Path, help="episode folder (default: the newest numbered one)")
    ap.add_argument("--frames", help="comma-separated frame numbers (default: one per scene)")
    args = ap.parse_args()
    episode = (args.episode or newest_episode()).resolve()
    plan = json.loads((episode / "plan.json").read_text())
    frames = [int(x) for x in args.frames.split(",")] if args.frames else default_frames(plan)
    for look in args.looks:
        print(preview(look, episode, frames))


if __name__ == "__main__":
    main()
