"""Make the texture images the looks use (reels/public/textures/).

    python reels/tools/textures.py

Textures are generated, not downloaded, so they are ours to use. Add a function for any new
texture a look needs and run the script again; commit the image it writes.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

OUT = Path(__file__).resolve().parents[1] / "public" / "textures"


def _noise(h: int, w: int, scale: int, rng: np.random.Generator) -> np.ndarray:
    small = rng.random((max(2, h // scale), max(2, w // scale)))
    img = Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32) / 255.0


def paper(w: int = 540, h: int = 960, seed: int = 3) -> Image.Image:
    """Warm newsprint: soft blotches, fine grain and a few long fibres."""
    rng = np.random.default_rng(seed)
    tone = 0.55 * _noise(h, w, 120, rng) + 0.3 * _noise(h, w, 30, rng) + 0.15 * rng.random((h, w))
    tone = (tone - tone.min()) / (tone.max() - tone.min())
    base = np.array([243, 234, 215], dtype=np.float32)
    rgb = base[None, None, :] * (0.86 + 0.14 * tone[..., None])
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
    fibres = Image.new("L", (w, h), 0)
    px = fibres.load()
    for _ in range(260):
        x, y = rng.integers(0, w), rng.integers(0, h)
        angle = rng.random() * np.pi
        for t in range(int(rng.integers(8, 40))):
            xx, yy = int(x + np.cos(angle) * t), int(y + np.sin(angle) * t)
            if 0 <= xx < w and 0 <= yy < h:
                px[xx, yy] = 70
    fibres = fibres.filter(ImageFilter.GaussianBlur(0.6))
    dark = Image.new("RGB", (w, h), (200, 188, 165))
    return Image.composite(dark, img, fibres)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    paper().save(OUT / "paper.jpg", quality=82)
    print("wrote", OUT / "paper.jpg")


if __name__ == "__main__":
    main()
