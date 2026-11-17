"""Re-cut a downloaded clip into the upload format with ffmpeg.

`shorts` puts the gameplay, zoomed, over a blurred copy of itself in a
1080x1920 frame, with the clip title above and the streamer credit below.
`landscape` keeps 1920x1080 and adds a small credit in the corner.
Text is drawn with Pillow into a transparent overlay so no ffmpeg text
escaping is involved.
"""

from __future__ import annotations

import json
import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .config import Render

log = logging.getLogger(__name__)

KICK_GREEN = (83, 252, 24, 255)
WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf",
    "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]


class RenderError(RuntimeError):
    pass


@dataclass(frozen=True)
class Probe:
    width: int
    height: int
    duration: float
    fps: float
    has_audio: bool


def probe(path: Path) -> Probe:
    cmd = [
        "ffprobe", "-v", "error", "-print_format", "json",
        "-show_entries", "stream=codec_type,width,height,avg_frame_rate:format=duration",
        str(path),
    ]
    done = subprocess.run(cmd, capture_output=True, text=True)
    if done.returncode != 0:
        raise RenderError(f"ffprobe failed: {done.stderr.strip()[-300:]}")
    data = json.loads(done.stdout or "{}")
    video = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
    if not video or not video.get("width"):
        raise RenderError("clip has no video stream")
    num, _, den = str(video.get("avg_frame_rate") or "0/1").partition("/")
    try:
        fps = float(num) / float(den or 1)
    except (ValueError, ZeroDivisionError):
        fps = 0.0
    return Probe(
        width=int(video["width"]),
        height=int(video["height"]),
        duration=float(data.get("format", {}).get("duration") or 0),
        fps=fps,
        has_audio=any(s.get("codec_type") == "audio" for s in data.get("streams", [])),
    )


def _even(value: float) -> int:
    return max(2, int(round(value / 2)) * 2)


def _font(size: int, font_path: str = "") -> ImageFont.FreeTypeFont:
    for candidate in [font_path, *FONT_CANDIDATES]:
        if candidate and Path(candidate).exists():
            try:
                return ImageFont.truetype(candidate, size)
            except OSError:
                continue
    return ImageFont.load_default(size)


def drawable(text: str) -> bool:
    """True if the bundled Latin fonts can draw this text (no CJK, Arabic, emoji...)."""
    return bool(text) and all(ord(ch) < 0x250 or ch in "‘’“”–—…" for ch in text)


def _wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int, max_lines: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        trial = f"{current} {word}".strip()
        if draw.textlength(trial, font=font) <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(" .,") + "…"
    return lines


def _text(draw, xy, text, font, fill, anchor="ma", stroke=4):
    draw.text(xy, text, font=font, fill=fill, anchor=anchor, stroke_width=stroke, stroke_fill=BLACK)


def shorts_overlay(
    path: Path, title: str, streamer: str, channel_slug: str, fg_top: int, fg_bottom: int,
    font_path: str = "",
) -> Path:
    """Transparent 1080x1920 layer: title above the gameplay, credit below it."""
    img = Image.new("RGBA", (1080, 1920), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if drawable(title) and fg_top >= 220:
        size = 68
        while size >= 44:
            font = _font(size, font_path)
            lines = _wrap(draw, title, font, 980, 3)
            line_h = int(size * 1.2)
            if len(lines) * line_h <= fg_top - 150 or size == 44:
                break
            size -= 6
        y = fg_top - 50 - len(lines) * line_h
        for line in lines:
            _text(draw, (540, y), line, font, WHITE, stroke=5)
            y += line_h

    if 1920 - fg_bottom >= 200:
        name = streamer if drawable(streamer) else channel_slug
        name_font = _font(64, font_path)
        while draw.textlength(name, font=name_font) > 980 and name_font.size > 36:
            name_font = _font(name_font.size - 4, font_path)
        _text(draw, (540, fg_bottom + 44), name, name_font, WHITE, stroke=5)
        _text(draw, (540, fg_bottom + 44 + 84), f"kick.com/{channel_slug}", _font(42, font_path),
              KICK_GREEN, stroke=4)

    img.save(path)
    return path


def landscape_overlay(path: Path, channel_slug: str, font_path: str = "") -> Path:
    img = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    _text(draw, (40, 1040), f"kick.com/{channel_slug}", _font(40, font_path), KICK_GREEN,
          anchor="ls", stroke=4)
    img.save(path)
    return path


def shorts_geometry(width: int, height: int, zoom: float) -> tuple[int, int, int, int]:
    """(scaled w, scaled h, cropped w, cropped h) of the gameplay inside 1080x1920."""
    scaled_w = 1080 * max(zoom, 1.0)
    scaled_h = scaled_w * height / width
    if scaled_h > 1920:  # already-vertical source: fit by height instead
        scaled_h = 1920
        scaled_w = scaled_h * width / height
    sw, sh = _even(scaled_w), _even(scaled_h)
    return sw, sh, min(sw, 1080), min(sh, 1920)


def render(
    src: Path, dest: Path, cfg: Render, *, title: str, streamer: str, channel_slug: str,
    max_duration: float | None = None,
) -> Path:
    info = probe(src)
    dest.parent.mkdir(parents=True, exist_ok=True)
    overlay = dest.with_suffix(".overlay.png")
    fps_cap = "fps=60," if info.fps > 61 else ""

    if cfg.layout == "shorts":
        sw, sh, cw, ch = shorts_geometry(info.width, info.height, cfg.zoom)
        top = (1920 - ch) // 2
        shorts_overlay(overlay, title if cfg.overlay_title else "", streamer, channel_slug,
                       top, top + ch, cfg.font_path)
        graph = (
            f"[0:v]{fps_cap}split=2[bgsrc][fgsrc];"
            "[bgsrc]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,"
            "boxblur=10:2,scale=1080:1920,eq=brightness=-0.14:saturation=1.15[bg];"
            f"[fgsrc]scale={sw}:{sh},crop={cw}:{ch}[fg];"
            f"[bg][fg]overlay=(W-w)/2:{top}[base];"
            "[base][1:v]overlay=0:0,format=yuv420p[v]"
        )
    else:
        landscape_overlay(overlay, channel_slug, cfg.font_path)
        graph = (
            f"[0:v]{fps_cap}scale=1920:1080:force_original_aspect_ratio=decrease,"
            "pad=1920:1080:(ow-iw)/2:(oh-ih)/2[base];"
            "[base][1:v]overlay=0:0,format=yuv420p[v]"
        )

    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-i", str(overlay)]
    if info.has_audio:
        graph += ";[0:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]"
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
    cmd += ["-filter_complex", graph, "-map", "[v]", "-map", "[a]" if info.has_audio else "2:a"]
    if not info.has_audio:
        cmd += ["-shortest"]
    if max_duration:
        cmd += ["-t", f"{max_duration:.2f}"]
    cmd += [
        "-c:v", "libx264", "-preset", cfg.preset, "-crf", str(cfg.crf),
        "-c:a", "aac", "-b:a", "160k", "-ac", "2",
        "-movflags", "+faststart", str(dest),
    ]
    done = subprocess.run(cmd, capture_output=True, text=True)
    overlay.unlink(missing_ok=True)
    if done.returncode != 0 or not dest.exists():
        raise RenderError(f"ffmpeg failed: {done.stderr.strip()[-500:]}")
    return dest
