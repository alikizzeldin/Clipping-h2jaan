"""Narration for an episode, with word timings for the captions.

    python reels/tools/voice.py reels/episodes/003-some-topic [--engine auto|elevenlabs|kokoro]

Reads script.txt from the folder and writes voice.mp3 and alignment.json next
to it, then prints the word timings (scene times in plan.json follow them).

Engines:
- elevenlabs: the series' narrator (Brian). The free plan's 10,000 characters a
  month cover about 20 reels; the key is sent by this environment's network
  proxy (elsewhere set ELEVENLABS_API_KEY).
- kokoro: a free voice that runs on this machine (no allowance). Its word
  timings come from Whisper, matched back to the script's own words.
- auto (default): ElevenLabs while its allowance lasts, then Kokoro.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from clipper.reels import words  # noqa: E402

API = "https://api.elevenlabs.io"
BRIAN = "nPczCjzI2devNBz1zQrb"  # deep, resonant narrator used for the series
HEADERS = {"xi-api-key": os.environ.get("ELEVENLABS_API_KEY", "proxy-injected")}
RESERVE = 1500  # characters kept back for sound effects
KOKORO_DIR = Path(os.path.expanduser("~/.cache/gta6fied/kokoro"))
KOKORO_FILES = {
    "kokoro-v1.0.int8.onnx": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx",
    "voices-v1.0.bin": "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin",
}
KOKORO_VOICE = "am_michael"


def allowance() -> tuple[int, int]:
    d = requests.get(f"{API}/v1/user/subscription", headers=HEADERS, timeout=30).json()
    return int(d.get("character_count", 0)), int(d.get("character_limit", 0))


def elevenlabs(text: str, folder: Path, voice: str, model: str) -> None:
    resp = requests.post(
        f"{API}/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128", headers=HEADERS, timeout=180,
        json={"text": text, "model_id": model,
              "voice_settings": {"stability": 0.42, "similarity_boost": 0.8, "style": 0.4, "use_speaker_boost": True}},
    )
    if resp.status_code != 200:
        raise SystemExit(f"ElevenLabs answered {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    (folder / "voice.mp3").write_bytes(base64.b64decode(data["audio_base64"]))
    (folder / "alignment.json").write_text(json.dumps(data.get("normalized_alignment") or data["alignment"]))


def _kokoro_files() -> tuple[Path, Path]:
    KOKORO_DIR.mkdir(parents=True, exist_ok=True)
    for name, url in KOKORO_FILES.items():
        dest = KOKORO_DIR / name
        if not dest.exists() or dest.stat().st_size < 1_000_000:
            with requests.get(url, stream=True, timeout=600) as resp:
                resp.raise_for_status()
                with dest.open("wb") as out:
                    for chunk in resp.iter_content(1 << 20):
                        out.write(chunk)
    return KOKORO_DIR / "kokoro-v1.0.int8.onnx", KOKORO_DIR / "voices-v1.0.bin"


def _spoken(text: str) -> str:
    """What Kokoro should read: a few spellings it says better."""
    return text.replace("…", ", ")  # tested: "GTA 6" as written reads best


def kokoro(text: str, folder: Path, voice: str, speed: float = 1.08) -> None:
    import numpy as np
    import soundfile as sf
    from kokoro_onnx import Kokoro

    model, voices = _kokoro_files()
    tts = Kokoro(str(model), str(voices))
    parts, rate = [], 24000
    for sentence in [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]:
        audio, rate = tts.create(_spoken(sentence), voice=voice, speed=speed, lang="en-us")
        parts += [audio, np.zeros(int(rate * 0.18), dtype=audio.dtype)]  # a short breath between sentences
    wav = folder / "voice.kokoro.wav"
    sf.write(wav, np.concatenate(parts), rate)
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", str(wav), "-b:a", "160k", str(folder / "voice.mp3")], check=True)
    wav.unlink()
    (folder / "alignment.json").write_text(json.dumps({"words": align(text, folder / "voice.mp3")}))


def align(text: str, audio: Path) -> list[dict]:
    """Timings for the script's own words, from Whisper's word timings.

    The script's words are matched to the words Whisper heard; words it wrote
    differently ("one" for "1", "$1,000" for "a thousand dollars") get times
    spread between their matched neighbours, by length.
    """
    import difflib

    from faster_whisper import WhisperModel

    from clipper.speech import load_audio

    model = WhisperModel("small.en", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(load_audio(audio), word_timestamps=True)
    heard = [w for seg in segments for w in seg.words or []]
    if not heard:
        raise SystemExit("Whisper heard nothing in the narration")
    norm = lambda s: re.sub(r"[^a-z0-9']", "", s.lower())  # noqa: E731
    script = text.split()
    times: list[tuple[float, float] | None] = [None] * len(script)
    matcher = difflib.SequenceMatcher(a=[norm(w) for w in script], b=[norm(w.word) for w in heard], autojunk=False)
    for a, b, n in matcher.get_matching_blocks():
        for k in range(n):
            times[a + k] = (float(heard[b + k].start), float(heard[b + k].end))
    end_of_audio = float(heard[-1].end)
    i = 0
    while i < len(script):
        if times[i] is not None:
            i += 1
            continue
        j = i
        while j < len(script) and times[j] is None:
            j += 1
        left = times[i - 1][1] if i > 0 else 0.0
        right = times[j][0] if j < len(script) else end_of_audio
        sizes = [max(1, len(norm(w))) for w in script[i:j]]
        span, t = max(right - left, 0.05 * len(sizes)), left
        for k, size in enumerate(sizes):
            step = span * size / sum(sizes)
            times[i + k] = (t, t + step)
            t += step
        i = j
    return [{"text": w, "start": round(s, 3), "end": round(max(e, s + 0.05), 3)} for w, (s, e) in zip(script, times)]


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("episode")
    p.add_argument("--engine", choices=["auto", "elevenlabs", "kokoro"], default="auto")
    p.add_argument("--voice", help="ElevenLabs voice id or Kokoro voice name")
    p.add_argument("--model", default="eleven_v4")
    a = p.parse_args()
    folder = Path(a.episode)
    text = (folder / "script.txt").read_text(encoding="utf-8").strip()
    engine = a.engine
    if engine in ("auto", "elevenlabs"):
        try:
            used, limit = allowance()
        except (requests.RequestException, ValueError):
            used, limit = 0, 0
        fits = limit and used + len(text) + RESERVE <= limit
        if engine == "elevenlabs" and not fits:
            raise SystemExit(f"ElevenLabs allowance would run out ({used}/{limit} used, script is {len(text)} characters)")
        engine = "elevenlabs" if fits else "kokoro"
    if engine == "elevenlabs":
        elevenlabs(text, folder, a.voice or BRIAN, a.model)
    else:
        kokoro(text, folder, a.voice or KOKORO_VOICE)
    said = words(json.loads((folder / "alignment.json").read_text()))
    print(f"engine: {engine}")
    print(" | ".join(f"{w['start']:.2f} {w['text']}" for w in said))
    print(f"\nlength {said[-1]['end']:.2f}s")
    if engine == "elevenlabs":
        print(f"ElevenLabs used {allowance()[0]} characters this month")


if __name__ == "__main__":
    main()
