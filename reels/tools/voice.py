"""Narration for an episode with ElevenLabs, with word timings for the captions.

    python reels/tools/voice.py reels/episodes/003-some-topic [--voice ID] [--model eleven_v4]

Reads script.txt from the folder and writes voice.mp3 and alignment.json next
to it, then prints the word timings (scene times in plan.json follow them) and
how much of the month's ElevenLabs allowance is left.

The key is sent by this environment's network proxy; elsewhere set
ELEVENLABS_API_KEY.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from clipper.reels import words  # noqa: E402

API = "https://api.elevenlabs.io"
BRIAN = "nPczCjzI2devNBz1zQrb"  # deep, resonant narrator used for the series
HEADERS = {"xi-api-key": os.environ.get("ELEVENLABS_API_KEY", "proxy-injected")}


def allowance() -> tuple[int, int]:
    d = requests.get(f"{API}/v1/user/subscription", headers=HEADERS, timeout=30).json()
    return int(d.get("character_count", 0)), int(d.get("character_limit", 0))


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("episode")
    p.add_argument("--voice", default=BRIAN)
    p.add_argument("--model", default="eleven_v4")
    a = p.parse_args()
    folder = Path(a.episode)
    text = (folder / "script.txt").read_text(encoding="utf-8").strip()
    used, limit = allowance()
    if limit and used + len(text) > limit:
        raise SystemExit(f"ElevenLabs allowance would run out ({used}/{limit} used, script is {len(text)} characters)")
    resp = requests.post(
        f"{API}/v1/text-to-speech/{a.voice}/with-timestamps?output_format=mp3_44100_128", headers=HEADERS, timeout=180,
        json={"text": text, "model_id": a.model,
              "voice_settings": {"stability": 0.42, "similarity_boost": 0.8, "style": 0.4, "use_speaker_boost": True}},
    )
    if resp.status_code != 200:
        raise SystemExit(f"ElevenLabs answered {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    (folder / "voice.mp3").write_bytes(base64.b64decode(data["audio_base64"]))
    alignment = data.get("normalized_alignment") or data["alignment"]
    (folder / "alignment.json").write_text(json.dumps(alignment))
    said = words(alignment)
    print(" | ".join(f"{w['start']:.2f} {w['text']}" for w in said))
    print(f"\nlength {said[-1]['end']:.2f}s; ElevenLabs used {allowance()[0]}/{limit} characters this month")


if __name__ == "__main__":
    main()
