"""End-to-end render checks with real ffmpeg, on a 4-second sample clip."""

import shutil
import subprocess
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from clipper.config import Captions, Render, Theme, load_settings
from clipper.render import build_frame, probe, render, shorts_window
from clipper.speech import Word
from clipper.subtitles import chunk_words

SAMPLE = Path(__file__).parent / "data" / "sample.mp4"
REPO = Path(__file__).resolve().parent.parent
needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")
CHUNKS = chunk_words([Word("آه", 0.5, 0.9), Word("والله", 0.9, 1.4), Word("nice", 2.0, 2.5)])


def white_pixels(img: Image.Image) -> int:
    return int((np.asarray(img).min(axis=2) > 235).sum())


def frame_at(video: Path, seconds: float, dest: Path) -> Image.Image:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(seconds), "-i", str(video),
                    "-frames:v", "1", str(dest)], check=True)
    return Image.open(dest).convert("RGB")


def test_frame_cuts_a_window_through_the_artwork(tmp_path):
    theme = load_settings(REPO / "config.yaml", "gta6").theme
    window = shorts_window(1920, 1080, 1.35, theme.window_top, theme.window_inset)
    assert build_frame(tmp_path / "frame.png", theme, window) is True
    frame = Image.open(tmp_path / "frame.png")
    assert frame.size == (1080, 1920)
    alpha = frame.getchannel("A")
    assert alpha.getpixel((540, window.y + window.h // 2)) == 0  # gameplay shows through
    assert alpha.getpixel((540, 100)) == 255 and alpha.getpixel((540, window.bottom + 100)) == 255
    assert alpha.getpixel((window.x - 2, window.y + 300)) > 240  # the border is opaque


def test_frame_without_artwork_is_just_a_border(tmp_path):
    window = shorts_window(1920, 1080, 1.35)
    assert build_frame(tmp_path / "frame.png", Theme(), window) is False
    alpha = Image.open(tmp_path / "frame.png").getchannel("A")
    assert alpha.getpixel((540, 100)) == 0 and alpha.getpixel((window.x - 3, 800)) > 240


@needs_ffmpeg
@pytest.mark.parametrize("profile", ["gta6", "valorant"])
def test_themed_short_is_vertical_with_captions_burned_in(tmp_path, profile):
    settings = load_settings(REPO / "config.yaml", profile)
    out = render(SAMPLE, tmp_path / "short.mp4", settings.render, settings.theme, settings.captions,
                 label=settings.active.label, title="Sample title", chunks=CHUNKS)
    info = probe(out)
    assert (info.width, info.height) == (1080, 1920) and info.has_audio
    assert 3.5 < info.duration < 4.6

    window = shorts_window(1280, 720, settings.render.zoom, settings.theme.window_top,
                           settings.theme.window_inset)
    y = window.caption_y(settings.theme.caption_floor)
    box = (200, y - 70, 880, y + 70)
    silent = frame_at(out, 3.5, tmp_path / "silent.png").crop(box)
    spoken = frame_at(out, 1.0, tmp_path / "spoken.png").crop(box)
    assert white_pixels(spoken) > white_pixels(silent) + 500  # caption text shows while spoken


@needs_ffmpeg
def test_plain_short_and_landscape_layouts_render(tmp_path):
    plain = render(SAMPLE, tmp_path / "plain.mp4", Render(), Theme(), Captions(), label="Game",
                   chunks=CHUNKS)
    assert (probe(plain).width, probe(plain).height) == (1080, 1920)
    wide = render(SAMPLE, tmp_path / "wide.mp4", Render(layout="landscape"), Theme(), Captions(),
                  chunks=CHUNKS, max_duration=2)
    info = probe(wide)
    assert (info.width, info.height) == (1920, 1080) and info.duration < 2.5
