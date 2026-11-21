"""Turn ElevenLabs character timings into word timings: python tools/words.py alignment.json"""

import json
import sys


def words(alignment: dict) -> list[dict]:
    chars = alignment["characters"]
    starts = alignment["character_start_times_seconds"]
    ends = alignment["character_end_times_seconds"]
    out, cur, s, e = [], "", None, None
    for ch, a, b in zip(chars, starts, ends):
        if ch.isspace():
            if cur:
                out.append({"text": cur, "start": round(s, 3), "end": round(e, 3)})
            cur, s = "", None
            continue
        if s is None:
            s = a
        cur += ch
        e = b
    if cur:
        out.append({"text": cur, "start": round(s, 3), "end": round(e, 3)})
    return out


if __name__ == "__main__":
    print(json.dumps(words(json.load(open(sys.argv[1]))), ensure_ascii=False))
