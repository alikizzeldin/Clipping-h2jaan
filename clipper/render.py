"""Re-cut a downloaded clip into the upload format with ffmpeg.

`shorts` (1080x1920) shows the gameplay in a framed window on a themed
background, with the game label and clip title above it and the spoken
captions below it. Without a theme the background is a blurred copy of the
clip. `landscape` keeps 1920x1080 and only adds captions.
"""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

from .config import Captions, Render, Theme
from .subtitles import FONTS_DIR, Chunk, TextLayout, build_ass

log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 1080, 1920
SAFE_TOP = 150  # YouTube's own header covers what is above this
WINDOW_MAX_HEIGHT = 1000


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


@dataclass(frozen=True)
class Window:
    """Where the gameplay sits in the vertical frame."""

    scaled_w: int  # the clip is scaled to this size...
    scaled_h: int
    x: int  # ...then centre-cropped to the window at this position
    y: int
    w: int
    h: int

    @property
    def bottom(self) -> int:
        return self.y + self.h

    def caption_y(self, floor: int) -> int:
        """Vertical centre of the captions: midway between the gameplay and `floor`."""
        middle = self.bottom + (floor - self.bottom) // 2
        return max(self.bottom + 80, min(middle, floor - 60))


def shorts_window(width: int, height: int, zoom: float, top: int = 420, inset: int = 24) -> Window:
    """Place the gameplay. At zoom 1.0 the whole picture fits the window's
    width, so nothing is cut off; a larger zoom enlarges it and crops the sides.
    """
    room = _even(WIDTH - 2 * inset)
    scaled_w = room * max(zoom, 1.0)
    scaled_h = scaled_w * height / width
    if scaled_h > WINDOW_MAX_HEIGHT:  # tall or vertical source: fit by height
        scaled_w *= WINDOW_MAX_HEIGHT / scaled_h
        scaled_h = WINDOW_MAX_HEIGHT
    sw, sh = _even(scaled_w), _even(scaled_h)
    w = min(sw, room)
    return Window(sw, sh, (WIDTH - w) // 2, top, w, sh)


def _rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def _rounded_mask(box: tuple[int, int, int, int], radius: int) -> Image.Image:
    """Antialiased rounded-rectangle mask the size of the frame."""
    scale = 2
    big = Image.new("L", (WIDTH * scale, HEIGHT * scale), 0)
    ImageDraw.Draw(big).rounded_rectangle([v * scale for v in box], radius * scale, fill=255)
    return big.resize((WIDTH, HEIGHT), Image.LANCZOS)


def _resolve(path: str) -> Path | None:
    if not path:
        return None
    candidate = Path(path)
    if not candidate.is_absolute():
        candidate = REPO_ROOT / candidate
    return candidate if candidate.exists() else None


def build_frame(dest: Path, theme: Theme, window: Window) -> bool:
    """Write the layer that sits over the gameplay: background art with the
    window cut out, plus the window's border and glow.

    Returns True if the layer has opaque background art (so the caller does
    not need to supply a background of its own).
    """
    art = _resolve(theme.background)
    if art:
        frame = Image.open(art).convert("RGBA").resize((WIDTH, HEIGHT), Image.LANCZOS)
        radius = theme.radius
    else:
        frame = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        radius = 0  # a blurred-video background can't hide square corners

    border_w = max(0, theme.border_width)
    inner = (window.x, window.y, window.x + window.w, window.bottom)
    outer = (inner[0] - border_w, inner[1] - border_w, inner[2] + border_w, inner[3] + border_w)
    hole = _rounded_mask(inner, radius)
    ring = ImageChops.subtract(_rounded_mask(outer, radius + border_w if radius else 0), hole)

    if theme.glow:
        halo = _rounded_mask(outer, radius + border_w).filter(ImageFilter.GaussianBlur(22))
        glow = Image.new("RGBA", (WIDTH, HEIGHT), (*_rgb(theme.glow), 0))
        glow.putalpha(halo.point(lambda v: int(v * 0.85)))
        frame = Image.alpha_composite(frame, glow)

    first, second = (theme.border + theme.border)[:2] if theme.border else ("#FFFFFF", "#FFFFFF")
    ramp = Image.linear_gradient("L").rotate(90, expand=True).resize((WIDTH, HEIGHT))
    border = Image.composite(
        Image.new("RGB", (WIDTH, HEIGHT), _rgb(second)), Image.new("RGB", (WIDTH, HEIGHT), _rgb(first)),
        ramp,
    ).convert("RGBA")
    border.putalpha(ring)
    frame = Image.alpha_composite(frame, border)

    # Punch the window through everything, so the gameplay shows.
    alpha = ImageChops.subtract(frame.getchannel("A"), hole)
    frame.putalpha(alpha)
    frame.save(dest)
    return art is not None


def render(
    src: Path, dest: Path, cfg: Render, theme: Theme, captions: Captions, *,
    label: str = "", title: str = "", chunks: list[Chunk] | None = None,
    max_duration: float | None = None,
) -> Path:
    info = probe(src)
    dest.parent.mkdir(parents=True, exist_ok=True)
    chunks = chunks or []
    fps_cap = "fps=60," if info.fps > 61 else ""
    label = label if cfg.show_label and theme.show_label else ""
    title = title if cfg.overlay_title and theme.show_title else ""

    with tempfile.TemporaryDirectory(prefix="clipper-") as tmp_name:
        tmp = Path(tmp_name)
        # ffmpeg runs inside this folder so the subtitle filter needs no path escaping.
        shutil.copytree(FONTS_DIR, tmp / "fonts")
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src.resolve())]
        inputs = 1

        if cfg.layout == "shorts":
            win = shorts_window(info.width, info.height, cfg.zoom, theme.window_top,
                                theme.window_inset)
            has_art = build_frame(tmp / "frame.png", theme, win)
            cmd += ["-i", "frame.png"]
            inputs += 1
            header_mid = SAFE_TOP + (win.y - SAFE_TOP) // 2
            text = TextLayout(
                WIDTH, HEIGHT,
                caption_y=win.caption_y(theme.caption_floor), caption_size=captions.size,
                label_y=(header_mid - 50 if title else header_mid) if label else 0,
                title_y=(header_mid + 78 if label else header_mid) if title else 0,
                highlight=theme.highlight, glow=theme.glow, outline=theme.outline,
                caption_style=theme.caption_style, glow_strength=theme.caption_glow,
            )
            gameplay = f"scale={win.scaled_w}:{win.scaled_h},crop={win.w}:{win.h}"
            if has_art:
                graph = (
                    f"[0:v]{fps_cap}{gameplay},pad={WIDTH}:{HEIGHT}:{win.x}:{win.y}:black[placed];"
                )
            else:
                graph = (
                    f"[0:v]{fps_cap}split=2[bgsrc][fgsrc];"
                    "[bgsrc]scale=270:480:force_original_aspect_ratio=increase,crop=270:480,"
                    f"boxblur=10:2,scale={WIDTH}:{HEIGHT},eq=brightness=-0.14:saturation=1.15[bg];"
                    f"[fgsrc]{gameplay}[fg];[bg][fg]overlay={win.x}:{win.y}[placed];"
                )
            graph += "[placed][1:v]overlay=0:0[framed];"
        else:
            text = TextLayout(
                1920, 1080, caption_y=940, caption_size=int(captions.size * 0.8),
                highlight=theme.highlight, glow=theme.glow, outline=theme.outline,
                caption_style=theme.caption_style, glow_strength=theme.caption_glow,
            )
            graph = (
                f"[0:v]{fps_cap}scale=1920:1080:force_original_aspect_ratio=decrease,"
                "pad=1920:1080:(ow-iw)/2:(oh-ih)/2[framed];"
            )

        (tmp / "captions.ass").write_text(
            build_ass(text, chunks, label=label, title=title, duration=info.duration),
            encoding="utf-8",
        )
        graph += "[framed]ass=captions.ass:fontsdir=fonts,format=yuv420p[v]"

        if info.has_audio:
            graph += ";[0:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]"
            audio_map = "[a]"
        else:
            cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
            audio_map = f"{inputs}:a"
        cmd += ["-filter_complex", graph, "-map", "[v]", "-map", audio_map]
        if not info.has_audio:
            cmd += ["-shortest"]
        if max_duration:
            cmd += ["-t", f"{max_duration:.2f}"]
        cmd += [
            "-c:v", "libx264", "-preset", cfg.preset, "-crf", str(cfg.crf),
            "-c:a", "aac", "-b:a", "160k", "-ac", "2",
            "-movflags", "+faststart", str(dest.resolve()),
        ]
        done = subprocess.run(cmd, capture_output=True, text=True, cwd=tmp)

    if done.returncode != 0 or not dest.exists():
        raise RenderError(f"ffmpeg failed: {done.stderr.strip()[-500:]}")
    return dest
