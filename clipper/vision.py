"""Is there a game on screen?

Kick files a clip under whatever category the stream was set to, so a "GTA"
clip can be the streamer chatting on a sofa. This looks at a few frames with
CLIP, an open image-and-text model that runs on the CPU, and compares them
with descriptions of gameplay and of people on camera.
"""

from __future__ import annotations

import io
import logging
import subprocess
from pathlib import Path

log = logging.getLogger(__name__)

MODEL_REPO = "Xenova/clip-vit-base-patch32"
# Wordings chosen by testing on real clips: GTA gameplay scored 0.90-0.99 and
# real-life footage 0.04-0.24. Mentioning the HUD and "real camera" matters,
# because realistic games and street video otherwise look alike.
GAME = (
    "a screenshot of a video game with a minimap and HUD",
    "computer-generated 3D video game graphics",
    "gameplay footage of an open world video game",
    "a video game character seen from behind in third person",
)
NOT_GAME = (
    "real camera footage of real people outdoors",
    "a real-life photo of people standing next to a car",
    "a photo of people sitting on a couch in a living room",
    "a webcam video of a person talking",
    "a vlog filmed with a phone camera",
)
_MEAN = (0.48145466, 0.4578275, 0.40821073)
_STD = (0.26862954, 0.26130258, 0.27577711)


class VisionError(RuntimeError):
    pass


def frames(path: Path, count: int = 5) -> list:
    """`count` stills spread across the video, as PIL images."""
    from PIL import Image

    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    )
    try:
        length = float(probe.stdout.strip())
    except ValueError as exc:
        raise VisionError("could not read the clip's length") from exc
    stills = []
    for i in range(count):
        at = length * (i + 0.5) / count
        shot = subprocess.run(
            ["ffmpeg", "-v", "error", "-ss", f"{at:.2f}", "-i", str(path), "-frames:v", "1",
             "-vf", "scale=448:-2", "-f", "image2pipe", "-vcodec", "png", "-"],
            capture_output=True,
        )
        if shot.returncode == 0 and shot.stdout:
            stills.append(Image.open(io.BytesIO(shot.stdout)).convert("RGB"))
    if not stills:
        raise VisionError("could not read any frame from the clip")
    return stills


class GameplayJudge:
    """Loads the model once and reuses it for every clip in a run."""

    def __init__(self):
        self._vision = None
        self._text_features = None

    def _load(self):
        if self._vision is not None:
            return
        try:
            import numpy as np
            import onnxruntime as ort
            from huggingface_hub import hf_hub_download
            from tokenizers import Tokenizer
        except ImportError as exc:
            raise VisionError("the gameplay check needs onnxruntime, tokenizers and huggingface_hub") from exc
        try:
            vision_path = hf_hub_download(MODEL_REPO, "onnx/vision_model.onnx")
            text_path = hf_hub_download(MODEL_REPO, "onnx/text_model.onnx")
            tokenizer = Tokenizer.from_file(hf_hub_download(MODEL_REPO, "tokenizer.json"))
        except Exception as exc:
            raise VisionError(f"could not download the gameplay model: {exc}") from exc
        options = ort.SessionOptions()
        options.log_severity_level = 3
        self._vision = ort.InferenceSession(vision_path, options, providers=["CPUExecutionProvider"])
        text = ort.InferenceSession(text_path, options, providers=["CPUExecutionProvider"])

        ids = np.full((len(GAME) + len(NOT_GAME), 77), 49407, dtype=np.int64)  # padded with end-of-text
        for row, prompt in enumerate((*GAME, *NOT_GAME)):
            tokens = tokenizer.encode(prompt).ids[:77]
            ids[row, : len(tokens)] = tokens
        feeds = {"input_ids": ids}
        if any(i.name == "attention_mask" for i in text.get_inputs()):
            feeds["attention_mask"] = (ids != 49407).astype(np.int64) | (np.cumsum(ids == 49407, axis=1) == 1)
        features = self._named(text, text.run(None, feeds), "text_embeds")
        self._text_features = features / np.linalg.norm(features, axis=1, keepdims=True)

    @staticmethod
    def _named(session, outputs, name):
        names = [o.name for o in session.get_outputs()]
        return outputs[names.index(name)] if name in names else outputs[0]

    def score(self, path: Path) -> float:
        """0..1: how sure the model is that the clip shows gameplay."""
        import numpy as np
        from PIL import Image

        self._load()
        batch = []
        for image in frames(path):
            scale = 224 / min(image.size)
            image = image.resize((max(224, round(image.width * scale)), max(224, round(image.height * scale))), Image.BICUBIC)
            left, top = (image.width - 224) // 2, (image.height - 224) // 2
            pixels = np.asarray(image.crop((left, top, left + 224, top + 224)), dtype=np.float32) / 255.0
            batch.append(((pixels - _MEAN) / _STD).transpose(2, 0, 1))
        feats = self._named(self._vision, self._vision.run(None, {"pixel_values": np.stack(batch).astype(np.float32)}), "image_embeds")
        feats = feats / np.linalg.norm(feats, axis=1, keepdims=True)
        logits = 100.0 * feats @ self._text_features.T
        probs = np.exp(logits - logits.max(axis=1, keepdims=True))
        probs /= probs.sum(axis=1, keepdims=True)
        return float(probs[:, : len(GAME)].sum(axis=1).mean())

    def is_gameplay(self, path: Path, threshold: float = 0.5) -> tuple[bool, float]:
        value = self.score(path)
        return value >= threshold, value
