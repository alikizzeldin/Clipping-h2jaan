"""Everything written on the video: game label, clip title and spoken captions.

Text is burned in from an ASS subtitle file. ffmpeg's libass does the shaping,
so Arabic joins and runs right-to-left correctly, and each caption highlights
the word being spoken.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import ImageFont

from .speech import Word

FONTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
CAPTION_FONT = ("Baloo Bhaijaan 2 ExtraBold", "BalooBhaijaan2-ExtraBold.ttf")  # Arabic + Latin
TITLE_FONT = ("Cairo", "Cairo-Bold.ttf")
LABEL_FONT = ("Anton", "Anton-Regular.ttf")  # Latin display face for the game label

_ARABIC = ((0x0600, 0x06FF), (0x0750, 0x077F), (0xFB50, 0xFDFF), (0xFE70, 0xFEFF))


def drawable(text: str) -> bool:
    """True if the bundled fonts can draw this text (Latin and Arabic scripts)."""
    def ok(ch: str) -> bool:
        code = ord(ch)
        return code < 0x250 or ch in "‘’“”–—…" or any(lo <= code <= hi for lo, hi in _ARABIC)

    return bool(text.strip()) and all(ok(ch) for ch in text)


def has_arabic(text: str) -> bool:
    return any(lo <= ord(ch) <= hi for ch in text for lo, hi in _ARABIC)


def text_width(text: str, font_file: str, size: int) -> float:
    return ImageFont.truetype(str(FONTS_DIR / font_file), size).getlength(text)


@dataclass(frozen=True)
class Chunk:
    """A few words shown together on screen."""

    words: tuple[Word, ...]
    start: float
    end: float

    @property
    def text(self) -> str:
        return " ".join(w.text for w in self.words)


def chunk_words(words: list[Word], max_words: int = 3, max_chars: int = 14,
                max_gap: float = 0.6, hold: float = 0.3) -> list[Chunk]:
    """Group words into short captions, breaking on pauses."""
    groups: list[list[Word]] = []
    for word in words:
        current = groups[-1] if groups else None
        if (
            current
            and len(current) < max_words
            and len(" ".join(w.text for w in current)) + 1 + len(word.text) <= max_chars
            and word.start - current[-1].end <= max_gap
        ):
            current.append(word)
        else:
            groups.append([word])

    chunks: list[Chunk] = []
    for i, group in enumerate(groups):
        start = group[0].start
        end = group[-1].end + hold
        if i + 1 < len(groups):
            end = min(end, groups[i + 1][0].start)
        chunks.append(Chunk(tuple(group), start, max(end, start + 0.1)))
    return chunks


def ass_time(seconds: float) -> str:
    cs = max(0, int(round(seconds * 100)))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def ass_color(hex_rgb: str, alpha: int = 0) -> str:
    """#RRGGBB -> ASS &HAABBGGRR."""
    value = hex_rgb.lstrip("#")
    r, g, b = value[0:2], value[2:4], value[4:6]
    return f"&H{alpha:02X}{b}{g}{r}".upper()


def _plain(text: str) -> str:
    return text.replace("\\", "").replace("{", "").replace("}", "").replace("\n", " ").strip()


def fit_line(text: str, font_file: str, size: int, max_width: int, min_size: int) -> tuple[str, int]:
    """Shrink, then shorten, a line until it fits; returns (text, font size)."""
    text = _plain(text)
    while size > min_size and text_width(text, font_file, size) > max_width:
        size -= 2
    while text_width(text, font_file, size) > max_width and " " in text:
        text = text.rsplit(" ", 1)[0].rstrip(" ,.|-") + "…"
        if text.count(" ") == 0:
            break
    return text, size


@dataclass(frozen=True)
class TextLayout:
    width: int
    height: int
    caption_y: int
    caption_size: int
    label_y: int = 0  # 0 = no label
    title_y: int = 0  # 0 = no title
    highlight: str = "#FFE14D"
    glow: str = ""
    outline: str = "#000000"
    caption_style: str = "outline"  # outline | neon
    glow_strength: float = 0.3  # neon only: 0 = no backlight, 1 = strongest


def build_ass(layout: TextLayout, chunks: list[Chunk], *, label: str = "", title: str = "",
              duration: float = 0.0) -> str:
    """The full subtitle file for one clip."""
    w, h = layout.width, layout.height
    cx = w // 2
    max_text = w - 110
    white = ass_color("#FFFFFF")
    outline = ass_color(layout.outline)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,{CAPTION_FONT[0]},{layout.caption_size},{white},{white},&H00000000,&H78000000,0,0,0,0,100,100,0,0,1,9,4,5,40,40,0,-1
Style: Title,{TITLE_FONT[0]},60,{white},{white},{outline},&H96000000,-1,0,0,0,100,100,0,0,1,4,2,5,40,40,0,-1
Style: Label,{LABEL_FONT[0]},120,{white},{white},{outline},&H96000000,0,0,0,0,100,100,2,0,1,6,4,5,40,40,0,-1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events: list[str] = []
    whole = (ass_time(0), ass_time(max(duration, chunks[-1].end if chunks else 0) + 1))

    if label and layout.label_y:
        text, size = fit_line(label.upper(), LABEL_FONT[1], 120, max_text, 70)
        pos = f"\\an5\\pos({cx},{layout.label_y})\\fs{size}"
        if layout.glow:
            glow = ass_color(layout.glow)
            events.append(
                f"Dialogue: 0,{whole[0]},{whole[1]},Label,,0,0,0,,"
                f"{{{pos}\\1c{glow}\\3c{glow}\\bord12\\blur16\\shad0\\alpha&H40&}}{text}"
            )
        events.append(f"Dialogue: 1,{whole[0]},{whole[1]},Label,,0,0,0,,{{{pos}}}{text}")

    if title and layout.title_y and drawable(title):
        text, size = fit_line(title, TITLE_FONT[1], 60, max_text, 40)
        events.append(
            f"Dialogue: 1,{whole[0]},{whole[1]},Title,,0,0,0,,"
            f"{{\\an5\\pos({cx},{layout.title_y})\\fs{size}}}{text}"
        )

    neon = layout.caption_style == "neon"
    for chunk in chunks:
        size = layout.caption_size
        full = chunk.text
        while size > layout.caption_size * 0.6 and text_width(full, CAPTION_FONT[1], size) > max_text:
            size -= 2
        pos = f"\\an5\\pos({cx},{layout.caption_y})\\fs{size}"
        for i, word in enumerate(chunk.words):
            start = chunk.start if i == 0 else word.start
            end = chunk.words[i + 1].start if i + 1 < len(chunk.words) else chunk.end
            if end <= start:
                continue
            pop = "\\fscx86\\fscy86\\t(0,90,\\fscx100\\fscy100)" if i == 0 else ""
            times = f"{ass_time(start)},{ass_time(end)}"
            texts = [_plain(w.text) for w in chunk.words]
            if neon:
                events += _neon_events(layout, times, pos + pop, texts, i)
            else:
                accent = ass_color(layout.highlight)
                parts = [f"{{\\1c{accent}}}{t}{{\\1c{white}}}" if j == i else t
                         for j, t in enumerate(texts)]
                events.append(f"Dialogue: 2,{times},Caption,,0,0,0,,{{{pos}{pop}}}{' '.join(parts)}")
    return head + "\n".join(events) + "\n"


def _tint(hex_rgb: str, amount: float = 0.88) -> str:
    """The colour mixed most of the way to white: the hot core of a neon tube."""
    value = hex_rgb.lstrip("#")
    mixed = [round(int(value[i:i + 2], 16) + (255 - int(value[i:i + 2], 16)) * amount) for i in (0, 2, 4)]
    return "#{:02X}{:02X}{:02X}".format(*mixed)


def _neon_events(layout: TextLayout, times: str, block: str, texts: list[str], active: int) -> list[str]:
    """Stacked copies of a caption: wide glow, tight glow, bright core.

    Every word glows in the theme's glow colour; the word being spoken glows
    in the highlight colour instead. `glow_strength` (0-1) sets how far and
    how brightly the light spreads behind the letters.
    """
    tube, hot = layout.glow or "#FF2FD0", layout.highlight

    def line(make_tags) -> str:
        return " ".join(f"{{{make_tags(hot if j == active else tube)}}}{t}" for j, t in enumerate(texts))

    g = max(0.0, min(1.0, layout.glow_strength))
    core = ("\\bord1.5\\blur0.8\\shad0", lambda c: f"\\1c{ass_color(_tint(c))}\\3c{ass_color(c)}")
    if g == 0:
        layers = [core]
    else:
        wide = f"\\bord{4 + 9 * g:.1f}\\blur{6 + 14 * g:.1f}\\shad0"
        tight = f"\\bord{2 + 3 * g:.1f}\\blur{2 + 5 * g:.1f}\\shad0"
        wide_alpha, tight_alpha = 255 - int(135 * g), 255 - int(215 * g)
        layers = [
            (wide, lambda c: f"\\1a&HFF&\\3c{ass_color(c)}\\3a&H{wide_alpha:02X}&"),
            (tight, lambda c: f"\\1a&HFF&\\3c{ass_color(c)}\\3a&H{tight_alpha:02X}&"),
            core,
        ]
    return [
        f"Dialogue: {2 + n},{times},Caption,,0,0,0,,{{{block}{shape}}}{line(tags)}"
        for n, (shape, tags) in enumerate(layers)
    ]
