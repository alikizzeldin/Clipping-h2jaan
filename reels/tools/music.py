"""An original dark synthwave bed, composed in code (no samples, no licence questions).

    python tools/music.py out.wav --length 29 --drop 4.6 --break 15.2 --back 16.5 --outro 23.8

Sections: an eerie intro (pad + theremin), the groove from --drop, a short
breakdown at --break, the groove again from --back, and a softer outro.
"""

from __future__ import annotations

import argparse

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
BPM = 100
BEAT = 60 / BPM
# D minor: Dm, Bb, Gm, A (the A major chord keeps the tension of a mystery)
CHORDS = [(50, 53, 57), (46, 50, 53), (43, 46, 50), (45, 49, 52)]


def hz(note: float) -> float:
    return 440.0 * 2 ** ((note - 69) / 12)


def lowpass(x, cutoff, order=2):
    return sosfilt(butter(order, min(cutoff, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def highpass(x, cutoff, order=2):
    return sosfilt(butter(order, cutoff, "high", fs=SR, output="sos"), x)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def saw(freq, n, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * freq + phase) % 1.0) - 1


def env(n, attack, release, sustain=1.0):
    e = np.full(n, sustain)
    a, r = int(attack * SR), int(release * SR)
    if a:
        e[:a] = np.linspace(0, sustain, a)
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def place(track, sound, at):
    i = int(at * SR)
    if i >= len(track):
        return
    sound = sound[: len(track) - i]
    track[i: i + len(sound)] += sound


def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    freq = 45 + 95 * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 7.5)
    click = highpass(np.random.randn(n), 3000) * np.exp(-t * 220) * 0.25
    return np.tanh((body + click) * 1.8) * 0.9


def clap():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = bandpass(np.random.randn(n), 900, 5200)
    bursts = sum(np.exp(-np.maximum(t - d, 0) * 60) * (t >= d) for d in (0, 0.011, 0.022))
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 30) * 0.3
    return (noise * bursts * 0.5 + tone) * 0.55


def hat(open_=False):
    n = int((0.22 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return highpass(np.random.randn(n), 7500) * np.exp(-t * (18 if open_ else 80)) * 0.18


def pluck(note, length, cutoff):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = saw(hz(note), n) * 0.6 + saw(hz(note) * 1.005, n, 0.3) * 0.4
    return lowpass(tone, cutoff) * np.exp(-t * 9) * 0.22


def pad_chord(notes, length, cutoff):
    n = int(length * SR)
    left, right = np.zeros(n), np.zeros(n)
    for note in notes:
        for cents, side in ((-9, 0), (0, 2), (9, 1)):
            f = hz(note + 12) * 2 ** (cents / 1200)
            wave = saw(f, n, np.random.rand())
            if side in (0, 2):
                left += wave
            if side in (1, 2):
                right += wave
    shape = env(n, 0.35, 0.5)
    return np.stack([lowpass(left, cutoff), lowpass(right, cutoff)]) * shape * 0.035


def bass_note(note, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = hz(note - 12)
    tone = np.sin(2 * np.pi * f * t) * 0.8 + lowpass(saw(f, n), 420) * 0.5
    return np.tanh(tone * 1.4) * env(n, 0.005, 0.06) * 0.42


def theremin(notes, at_times, total):
    """An eerie sine lead with vibrato that glides between notes."""
    n = int(total * SR)
    t = np.arange(n) / SR
    target = np.zeros(n)
    for note, start in zip(notes, at_times):
        target[int(start * SR):] = hz(note)
    glide = lowpass(target, 6, order=1)  # slow glides between pitches
    vibrato = 1 + 0.012 * np.sin(2 * np.pi * 5.8 * t)
    wave = np.sin(2 * np.pi * np.cumsum(glide * vibrato) / SR)
    gate = (target > 0).astype(float)
    return wave * lowpass(gate, 3, order=1) * 0.16


def reverb(stereo, seconds=2.4, mix=0.28):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = []
    for ch in range(2):
        ir = np.random.randn(n) * np.exp(-t * 3.2 / seconds * 2)
        ir = lowpass(ir, 6000)
        ir /= np.sqrt((ir ** 2).sum())
        wet = fftconvolve(stereo[ch], ir)[: stereo.shape[1]]
        out.append(stereo[ch] * (1 - mix) + wet * mix * 1.6)
    return np.stack(out)


def delay(mono, seconds, feedback=0.38, mix=0.35):
    out = mono.copy()
    d = int(seconds * SR)
    echo = np.zeros_like(mono)
    for k in range(1, 6):
        if d * k >= len(mono):
            break
        echo[d * k:] += mono[: len(mono) - d * k] * feedback ** k
    return out + echo * mix


def compose(length, drop, brk, back, outro, seed=7):
    np.random.seed(seed)
    n = int(length * SR)
    drums, bass, arp = np.zeros(n), np.zeros(n), np.zeros(n)
    pads = np.zeros((2, n))
    groove = lambda t: (drop <= t < brk) or (back <= t < outro)  # noqa: E731

    # Pads: one chord per bar, from the start, a little brighter once the beat drops.
    bar = BEAT * 4
    t = 0.0
    k = 0
    while t < length:
        chord = CHORDS[k % len(CHORDS)]
        cutoff = 900 if t < drop else 1600 if t < outro else 1100
        seg = pad_chord(chord, bar + 0.6, cutoff)
        i = int(t * SR)
        m = min(seg.shape[1], n - i)
        pads[:, i: i + m] += seg[:, :m]
        t += bar
        k += 1

    # The groove is on a grid that starts at the drop.
    step = BEAT / 4
    j = 0
    t = drop
    while t < length:
        beat_pos = j % 16
        bar_index = int((t - drop) // bar)
        chord = CHORDS[bar_index % len(CHORDS)]
        if groove(t):
            if beat_pos % 4 == 0:
                place(drums, kick(), t)
            if beat_pos in (4, 12):
                place(drums, clap(), t)
            if beat_pos % 2 == 0:
                place(drums, hat(open_=beat_pos % 4 == 2), t)
            if beat_pos % 2 == 0:
                place(bass, bass_note(chord[0], step * 1.8), t)
            arp_notes = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[0] + 24]
            cutoff = 1200 + 2600 * min(1.0, (t - drop) / 8)
            place(arp, pluck(arp_notes[j % 4], step * 1.6, cutoff), t)
        elif t >= outro and beat_pos % 2 == 0:
            arp_notes = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[0] + 24]
            place(arp, pluck(arp_notes[(j // 2) % 4], step * 3, 1400) * 0.7, t)
        t += step
        j += 1

    # Sidechain: everything but the drums ducks under each kick.
    duck = np.ones(n)
    t = drop
    while t < length:
        if groove(t):
            i = int(t * SR)
            m = min(int(0.3 * SR), n - i)
            duck[i: i + m] = np.minimum(duck[i: i + m], 0.35 + 0.65 * np.linspace(0, 1, m) ** 0.6)
        t += BEAT

    lead = theremin([69, 74, 72, 69, 65, 64], [0.3, 1.5, 2.4, 3.0, 3.6, 4.1], length)
    lead *= (np.arange(n) / SR < drop + 0.2)
    lead2 = theremin([74, 77, 76], [brk, brk + 0.5, brk + 0.9], length)
    lead2 *= ((np.arange(n) / SR >= brk) & (np.arange(n) / SR < back + 0.3))

    arp = delay(arp, BEAT * 0.75)
    music = pads * duck
    music += np.stack([arp * 0.85, arp]) * duck  # arp sits slightly right
    music += np.stack([bass, bass]) * duck
    music += np.stack([lead * 1.0, lead * 0.8]) + np.stack([lead2 * 0.8, lead2])
    music = reverb(music)
    music += np.stack([drums, drums])

    # A long fade at the very end.
    tail = int(1.2 * SR)
    music[:, -tail:] *= np.linspace(1, 0, tail)
    music = np.tanh(music * 1.3) / np.tanh(1.3)
    return music / np.max(np.abs(music)) * 0.89


def main():
    p = argparse.ArgumentParser()
    p.add_argument("out")
    p.add_argument("--length", type=float, default=30)
    p.add_argument("--drop", type=float, default=4.6)
    p.add_argument("--break", dest="brk", type=float, default=15.2)
    p.add_argument("--back", type=float, default=16.5)
    p.add_argument("--outro", type=float, default=24)
    p.add_argument("--seed", type=int, default=7)
    a = p.parse_args()
    import soundfile as sf

    music = compose(a.length, a.drop, a.brk, a.back, a.outro, a.seed)
    sf.write(a.out, music.T, SR, subtype="PCM_16")


if __name__ == "__main__":
    main()
