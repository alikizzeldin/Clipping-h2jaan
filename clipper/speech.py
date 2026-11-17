"""Speech to text: what the streamer says, word by word, with timings.

Uses Whisper through the `faster-whisper` package (CPU is enough). The spoken
language is detected per clip unless one is forced in the config, so Arabic,
English and the other languages Whisper knows all work.
"""

from __future__ import annotations

import logging
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

from .config import Captions

log = logging.getLogger(__name__)

SAMPLE_RATE = 16000

# Whisper invents these over music, gunfire and silence; never show them.
HALLUCINATIONS = (
    "thanks for watching", "thank you for watching", "subscribe to", "like and subscribe",
    "see you in the next video", "subtitles by", "amara.org", "transcribed by",
    "ترجمة نانسي", "اشتركوا في القناة", "اشترك في القناة", "شكرا للمشاهدة",
    "شكرا على المشاهدة", "ترجمة", "لا تنسوا الاشتراك",
)

_EDGE_PUNCT = " \t\n.,!?؟،؛:;\"“”«»()[]{}…—–-*~"
_DIACRITICS = re.compile("[ً-ْٰـ]")  # Arabic tashkeel and tatweel


class SpeechError(RuntimeError):
    pass


@dataclass(frozen=True)
class Word:
    text: str
    start: float
    end: float


@dataclass(frozen=True)
class Line:
    """A sentence-sized piece of speech with its timing."""

    text: str
    start: float
    end: float


@dataclass(frozen=True)
class Transcript:
    words: list[Word]
    language: str  # Whisper's code, e.g. "ar"
    lines: list[Line]

    @property
    def text(self) -> str:
        return " ".join(line.text for line in self.lines)


def clean_word(raw: str) -> str:
    text = _DIACRITICS.sub("", raw).strip(_EDGE_PUNCT)
    text = re.sub(r"(.)\1{3,}", r"\1\1\1", text)  # "ايييييييي" -> "اييي"
    return re.sub(r"[{}\\<>]", "", text)


def is_hallucination(text: str) -> bool:
    lowered = text.lower()
    return any(phrase in lowered for phrase in HALLUCINATIONS)


def load_audio(path: Path):
    """Decode any media file to 16 kHz mono float32 samples."""
    import numpy as np

    done = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-f", "f32le", "-ac", "1",
         "-ar", str(SAMPLE_RATE), "-"],
        capture_output=True,
    )
    if done.returncode != 0:
        raise SpeechError(f"could not read audio: {done.stderr.decode(errors='replace')[-200:]}")
    return np.frombuffer(done.stdout, dtype=np.float32)


class Transcriber:
    """Loads the Whisper model once and reuses it for every clip in a run."""

    def __init__(self, cfg: Captions):
        self.cfg = cfg
        self._model = None
        self._translator = None

    def _load(self):
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
            except ImportError as exc:
                raise SpeechError(
                    "captions need the faster-whisper package: pip install -r requirements.txt"
                ) from exc
            log.info("loading Whisper model %s", self.cfg.model)
            self._model = WhisperModel(self.cfg.model, device="cpu", compute_type="int8")
        return self._model

    def _run(self, model, audio, **options):
        try:
            segments, info = model.transcribe(
                audio, vad_filter=True, beam_size=5, condition_on_previous_text=False, **options,
            )
            return list(segments), info
        except Exception as exc:  # model download, decoding, out of memory...
            raise SpeechError(f"transcription failed: {exc}") from exc

    def transcribe(self, path: Path) -> Transcript:
        """What is said in the clip: words with timings, sentences, and the language."""
        audio = load_audio(path)
        if audio.size < SAMPLE_RATE:  # under a second of sound
            return Transcript([], "", [])
        language = None if self.cfg.language in ("", "auto") else self.cfg.language
        segments, info = self._run(self._load(), audio, language=language, word_timestamps=True)

        if language is None and info.language_probability < 0.5:
            # It could not even tell the language: game noise, not speech.
            log.info("no clear speech (language guess %s at %.0f%%)", info.language,
                     info.language_probability * 100)
            return Transcript([], "", [])

        words: list[Word] = []
        lines: list[Line] = []
        for seg in segments:
            if not _trustworthy(seg):
                continue
            lines.append(Line(seg.text.strip(), float(seg.start), float(seg.end)))
            for w in seg.words or []:
                text = clean_word(w.word)
                if not text:
                    continue
                start = float(w.start)
                end = min(float(w.end), start + 1.5)  # a word stretched across a silence
                words.append(Word(text, start, max(end, start + 0.05)))
        return Transcript(words, str(info.language or ""), lines)

    def translate(self, path: Path, language: str) -> list[Line]:
        """The clip's speech in English, sentence by sentence.

        Uses a second Whisper model: the fast transcription model was not
        trained to translate.
        """
        if self._translator is None:
            from faster_whisper import WhisperModel

            log.info("loading Whisper model %s for translation", self.cfg.translate_model)
            self._translator = WhisperModel(self.cfg.translate_model, device="cpu", compute_type="int8")
        segments, _ = self._run(self._translator, load_audio(path), language=language or None, task="translate")
        return [Line(seg.text.strip(), float(seg.start), float(seg.end)) for seg in segments
                if _trustworthy(seg) and seg.text.strip()]


def tidy_translation(lines: list[Line], words: list[Word]) -> list[Line]:
    """Keep only translated lines that can be trusted on screen.

    Over music and street noise the translator invents sentences and gets
    stuck repeating one. A line is kept only where the transcript also heard
    speech, and the whole translation is dropped if it keeps repeating itself.
    """
    spoken = [line for line in lines
              if any(line.start - 0.6 <= word.start <= line.end + 0.6 for word in words)]
    if len(spoken) >= 3:
        texts = [line.text.strip().lower() for line in spoken]
        most_common = max(texts.count(text) for text in set(texts))
        if most_common >= 3 or most_common > len(texts) / 3:
            return []
    return spoken


def _trustworthy(seg) -> bool:
    """False for segments Whisper itself doubts, loops, or stock phrases it invents."""
    if seg.avg_logprob < -1.0 or seg.no_speech_prob > 0.8:
        return False
    return seg.compression_ratio <= 2.4 and not is_hallucination(seg.text)
