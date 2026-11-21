"""Find gameplay shots for a reel among the day's top GTA 6 clips on Kick.

    python reels/tools/footage.py fetch [--max 40]
        download the top GTA 6 clips of the day and the week (kept in a cache)
    python reels/tools/footage.py search "a car in a garage at night" "a phone screen" [--top 6]
        find the frames that best match each description; writes a contact sheet
    python reels/tools/footage.py sheet CLIP@SEC [CLIP@SEC ...]
        a contact sheet of exact moments (CLIP = a clip id or its last 6 characters)
    python reels/tools/footage.py crop CLIP@SEC --x 700
        preview the vertical crop a plan would cut (x = left edge in a 1920x1080 frame)

Look at every sheet before choosing a shot: avoid streamer facecams, burned-in
subtitles, sponsor logos and blurry pause menus. Each match prints the clip's
playlist URL and channel, which go straight into plan.json.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

import requests  # noqa: E402

from clipper.kick import USER_AGENT  # noqa: E402
from clipper.reels import source  # noqa: E402

CACHE = Path(os.environ.get("REELS_CACHE", os.path.expanduser("~/.cache/gta6fied/kick")))
INDEX = CACHE / "index.json"
FRAMES = CACHE / "frames.npz"
OUT = ROOT / "out" / "footage"
CATEGORY = "grand-theft-auto-vi"


def _index() -> dict:
    return json.loads(INDEX.read_text()) if INDEX.exists() else {}


def fetch(limit: int) -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    index = _index()
    found = []
    for window in ("day", "week"):
        resp = requests.get(f"https://kick.com/api/v2/categories/{CATEGORY}/clips", params={"sort": "view", "time": window},
                            headers={"User-Agent": USER_AGENT, "Accept": "application/json"}, timeout=30)
        resp.raise_for_status()
        found += resp.json().get("clips") or []
    added = 0
    for raw in found:
        if len(index) >= limit and raw["id"] not in index:
            break
        if (raw.get("category") or {}).get("slug") != CATEGORY or raw["id"] in index:
            continue
        url = raw.get("video_url") or raw.get("clip_url")
        try:
            path = source(url, CACHE)
        except Exception as exc:  # one bad clip must not stop the rest
            print(f"skip {raw['id']}: {exc}")
            continue
        index[raw["id"]] = {"url": url, "file": path.name, "channel": (raw.get("channel") or {}).get("slug", ""),
                            "title": raw.get("title", ""), "views": raw.get("view_count", 0), "duration": raw.get("duration", 0)}
        added += 1
        print(f"{raw['id']}  {index[raw['id']]['channel']:<18} {raw.get('view_count', 0):>7} views  {raw.get('title', '')[:50]}")
    INDEX.write_text(json.dumps(index, indent=1, ensure_ascii=False))
    print(f"{added} new clip(s); {len(index)} in the cache")


def _resolve(key: str) -> tuple[str, dict]:
    index = _index()
    for cid, meta in index.items():
        if cid == key or cid.endswith(key):
            return cid, meta
    raise SystemExit(f"no cached clip matches {key!r} (run fetch first)")


def _frame(meta: dict, at: float, width: int = 480, x: float | None = None):
    from PIL import Image

    vf = f"scale={width}:-2"
    if x is not None:
        vf = f"crop=ih*9/16:ih:{x}*iw/1920:0,scale=270:480"
    png = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", str(at), "-i", str(CACHE / meta["file"]), "-frames:v", "1",
                          "-vf", vf, "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
    return Image.open(io.BytesIO(png)).convert("RGB") if png else None


def _sheet(items: list[tuple[str, dict, float, str]], path: Path, x: float | None = None) -> Path:
    from PIL import Image, ImageDraw

    tiles = []
    for cid, meta, at, label in items:
        im = _frame(meta, at, x=x) or Image.new("RGB", (480, 270))
        ImageDraw.Draw(im).rectangle((0, 0, im.width, 18), fill=(0, 0, 0))
        ImageDraw.Draw(im).text((4, 3), f"{cid[-6:]}@{at:g} {label}"[:70], fill=(255, 230, 0))
        tiles.append(im)
    w, h = tiles[0].size
    cols = 4 if x is None else 6
    rows = (len(tiles) + cols - 1) // cols
    board = Image.new("RGB", (w * cols, h * rows))
    for i, tile in enumerate(tiles):
        board.paste(tile, ((i % cols) * w, (i // cols) * h))
    path.parent.mkdir(parents=True, exist_ok=True)
    board.save(path, quality=88)
    print(f"sheet: {path}")
    return path


def _judge():
    from clipper.vision import GameplayJudge

    judge = GameplayJudge()
    judge._load()
    return judge


def _text_embed(judge, prompts: list[str]):
    import numpy as np
    import onnxruntime as ort
    from huggingface_hub import hf_hub_download
    from tokenizers import Tokenizer

    from clipper.vision import MODEL_REPO

    tok = Tokenizer.from_file(hf_hub_download(MODEL_REPO, "tokenizer.json"))
    text = ort.InferenceSession(hf_hub_download(MODEL_REPO, "onnx/text_model.onnx"), providers=["CPUExecutionProvider"])
    ids = np.full((len(prompts), 77), 49407, dtype=np.int64)
    for r, p in enumerate(prompts):
        t = tok.encode(p).ids[:77]
        ids[r, : len(t)] = t
    feeds = {"input_ids": ids}
    if any(i.name == "attention_mask" for i in text.get_inputs()):
        feeds["attention_mask"] = (ids != 49407).astype(np.int64) | (np.cumsum(ids == 49407, axis=1) == 1)
    f = judge._named(text, text.run(None, feeds), "text_embeds")
    return f / np.linalg.norm(f, axis=1, keepdims=True)


def _frames_index(judge):
    """CLIP vectors for a frame every 2 seconds of every cached clip (built once per clip)."""
    import numpy as np
    from PIL import Image

    from clipper.vision import _has_detail

    keys, feats = [], []
    if FRAMES.exists():
        old = np.load(FRAMES, allow_pickle=True)
        keys, feats = list(old["keys"]), [old["feats"]]
    done = {k[0] for k in keys}
    for cid, meta in _index().items():
        if cid in done:
            continue
        out = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", str(CACHE / meta["file"]), "-vf", "fps=1/2,scale=448:-2",
                              "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
        ims, ats = [], []
        for i, part in enumerate(out.split(b"\x89PNG")[1:]):
            im = Image.open(io.BytesIO(b"\x89PNG" + part)).convert("RGB")
            if _has_detail(im):
                ims.append(im)
                ats.append(i * 2.0)
        for k in range(0, len(ims), 32):
            feats.append(judge._embed(ims[k:k + 32]))
        keys += [(cid, at) for at in ats]
    import numpy as np  # noqa: F811

    merged = np.concatenate(feats) if feats else np.zeros((0, 512), dtype=np.float32)
    np.savez(FRAMES, keys=np.array(keys, dtype=object), feats=merged)
    return keys, merged


def search(queries: list[str], top: int) -> None:
    import numpy as np

    judge = _judge()
    keys, feats = _frames_index(judge)
    index = _index()
    vecs = _text_embed(judge, queries)
    items = []
    for q, v in zip(queries, vecs):
        scores = feats @ v
        print(f"\n# {q}")
        shown = 0
        seen = set()
        for i in np.argsort(-scores):
            cid, at = keys[i]
            if (cid, round(at / 6)) in seen:
                continue
            seen.add((cid, round(at / 6)))
            meta = index[cid]
            print(f"  {scores[i]:.3f}  {cid}@{at:g}  {meta['channel']:<16} {meta['url']}")
            items.append((cid, meta, float(at), q[:24]))
            shown += 1
            if shown == top:
                break
    _sheet(items, OUT / "search.jpg")


def main() -> None:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    f = sub.add_parser("fetch")
    f.add_argument("--max", type=int, default=40)
    s = sub.add_parser("search")
    s.add_argument("queries", nargs="+")
    s.add_argument("--top", type=int, default=6)
    sh = sub.add_parser("sheet")
    sh.add_argument("moments", nargs="+")
    c = sub.add_parser("crop")
    c.add_argument("moments", nargs="+")
    c.add_argument("--x", type=float, required=True)
    a = p.parse_args()
    if a.cmd == "fetch":
        fetch(a.max)
    elif a.cmd == "search":
        search(a.queries, a.top)
    else:
        items = []
        for m in a.moments:
            key, at = m.rsplit("@", 1)
            cid, meta = _resolve(key)
            items.append((cid, meta, float(at), meta["channel"]))
            print(f"{cid}@{at}  {meta['channel']}  {meta['url']}")
        _sheet(items, OUT / ("crop.jpg" if a.cmd == "crop" else "sheet.jpg"), x=a.x if a.cmd == "crop" else None)


if __name__ == "__main__":
    main()
