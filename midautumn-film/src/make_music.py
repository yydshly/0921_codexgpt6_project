"""Render an original, quiet felt-piano and air score for the family film.

This is procedural music, composed as the explicit note/chord schedule below.
It uses no recordings, downloaded music, pretrained music model, or samples.
The output WAV carries this provenance in its RIFF INFO metadata.

Run: python midautumn-film/src/make_music.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path
import struct

import numpy as np
import soundfile as sf


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "audio" / "music.wav"
SR = 48_000
DURATION = 51.0
SEED = 9222026
TITLE = "A Light Left On - Original Procedural Score"
PROVENANCE = (
    "Original music composed and synthesized programmatically for the "
    "Mid-Autumn family film. Additive felt-piano tones and quiet harmonic air; "
    "no external music, audio recordings, samples, or music-generation model. "
    "Composer/renderer: Codex. Source: midautumn-film/src/make_music.py. "
    "48000 Hz, stereo, 24-bit PCM. Deterministic seed: 9222026."
)


def frequency(midi: int) -> float:
    return 440.0 * 2.0 ** ((midi - 69) / 12.0)


def felt_note(midi: int, velocity: float, seconds: float = 6.0) -> np.ndarray:
    """A soft hammer attack with damped, slightly inharmonic piano partials."""
    t = np.arange(round(seconds * SR), dtype=np.float64) / SR
    f = frequency(midi)
    signal = np.zeros_like(t)
    # The partials quickly soften, leaving a warm, short-lived fundamental.
    partials = [(1, 1.00, 1.80), (2, 0.36, 0.88), (3, 0.12, 0.53),
                (4, 0.042, 0.33), (5, 0.012, 0.22)]
    for order, amplitude, decay in partials:
        stretched = f * order * math.sqrt(1.0 + 0.000075 * order * order)
        envelope = np.exp(-t / (decay * (1.06 - (midi - 60) * 0.012)))
        signal += amplitude * envelope * np.sin(2 * np.pi * stretched * t)
    # A rounded 14 ms onset removes electronic clicks and a long cosine tail
    # prevents truncation. No continuous oscillating bass or metronome is used.
    attack = np.sin(np.minimum(t / 0.014, 1.0) * np.pi / 2) ** 2
    release = np.sin(np.clip((seconds - t) / 0.85, 0, 1) * np.pi / 2) ** 2
    signal *= attack * release
    return (signal * velocity * 0.34).astype(np.float32)


def air_chord(notes: list[int], seconds: float, rng: np.random.Generator) -> np.ndarray:
    """Breathing upper-mid harmonic air, intentionally much quieter than piano."""
    t = np.arange(round(seconds * SR), dtype=np.float64) / SR
    signal = np.zeros_like(t)
    attack = np.sin(np.minimum(t / 2.8, 1) * np.pi / 2) ** 2
    release = np.sin(np.clip((seconds - t) / 3.8, 0, 1) * np.pi / 2) ** 2
    for index, midi in enumerate(notes):
        phase = rng.uniform(0, 2 * np.pi)
        breath = 0.90 + 0.10 * np.sin(2 * np.pi * (0.067 + index * 0.008) * t + phase)
        # Every voice starts at or above D3: warmth without a low-frequency bed.
        signal += np.sin(2 * np.pi * frequency(midi) * t + phase) * breath
        signal += 0.065 * np.sin(2 * np.pi * frequency(midi) * 2 * t + phase)
    signal *= attack * release * (0.009 / len(notes))
    return signal.astype(np.float32)


def place(destination: np.ndarray, mono: np.ndarray, start: float,
          pan: float = 0.0, gain: float = 1.0) -> None:
    begin = round(start * SR)
    if begin >= len(destination):
        return
    end = min(begin + len(mono), len(destination))
    angle = (pan + 1.0) * np.pi / 4
    destination[begin:end, 0] += mono[:end - begin] * (math.cos(angle) * gain)
    destination[begin:end, 1] += mono[:end - begin] * (math.sin(angle) * gain)


def add_info_metadata(path: Path) -> None:
    """Append portable RIFF INFO chunks without changing the audio samples."""
    fields = {
        b"INAM": TITLE,
        b"IART": "Codex - original programmatic composition",
        b"ICMT": PROVENANCE,
        b"ISFT": "Python / NumPy / SoundFile; original additive synthesis",
        b"ICRD": "2026-09-22",
    }
    info = bytearray(b"INFO")
    for tag, text in fields.items():
        payload = text.encode("utf-8") + b"\x00"
        info.extend(tag + struct.pack("<I", len(payload)) + payload)
        if len(payload) % 2:
            info.extend(b"\x00")
    chunk = b"LIST" + struct.pack("<I", len(info)) + bytes(info)
    with path.open("r+b") as handle:
        if handle.read(4) != b"RIFF":
            raise RuntimeError("Expected a RIFF WAV file")
        handle.seek(0, 2)
        handle.write(chunk)
        size = handle.tell()
        handle.seek(4)
        handle.write(struct.pack("<I", size - 8))


def main() -> None:
    rng = np.random.default_rng(SEED)
    mix = np.zeros((round(DURATION * SR), 2), dtype=np.float32)

    # A deliberately sparse, original F-major/D-minor phrase. Uneven spacing
    # leaves room for speech and feels like remembered moments, not a beat.
    # tuple = (seconds, MIDI pitch, touch, pan); maximum melody pitch is C5.
    melody = [
        (0.35, 65, 0.57, -0.10), (1.92, 69, 0.42, 0.08),
        (3.30, 72, 0.36, 0.16), (6.80, 69, 0.30, -0.05),
        (10.55, 67, 0.35, 0.08), (12.65, 65, 0.30, -0.13),
        (16.25, 62, 0.28, -0.05), (20.15, 65, 0.32, 0.10),
        (22.50, 69, 0.27, -0.10), (26.10, 67, 0.29, 0.11),
        (29.05, 65, 0.34, -0.02), (33.10, 64, 0.27, -0.13),
        (36.40, 67, 0.31, 0.08), (40.45, 69, 0.33, -0.08),
        (43.30, 67, 0.27, 0.10), (46.20, 65, 0.43, -0.02),
        (47.38, 69, 0.23, 0.10),
    ]
    # Soft broken harmony. No low octave doubling; slight strumming offsets
    # keep the transitions unobtrusive and avoid heavy sustained low energy.
    chords = [
        (0.10, [53, 60, 64, 69], 0.22),   # Fmaj7
        (8.65, [50, 57, 60, 65], 0.17),   # Dm7
        (17.25, [58, 62, 65, 69], 0.16),  # Bbmaj7
        (25.75, [57, 60, 65, 67], 0.16),  # Fadd9/A
        (34.25, [52, 60, 62, 67], 0.15),  # Cadd9/E, resolves gently
        (42.60, [53, 60, 65, 69], 0.20),  # F
    ]
    all_notes = list(melody)
    for start, notes, touch in chords:
        for index, midi in enumerate(notes):
            all_notes.append((start + index * 0.17, midi,
                              touch * (0.92 if index == 0 else 0.75),
                              -0.22 + index * 0.14))
        # Upper chord tones create air; they do not add a bass drone.
        pad_notes = [midi if midi >= 50 else midi + 12 for midi in notes[1:]]
        pad = air_chord(pad_notes, 10.5, rng)
        place(mix, pad, start + 0.3, pan=-0.08, gain=0.75)
        place(mix, pad, start + 0.329, pan=0.30, gain=0.23)

    for start, midi, touch, pan in all_notes:
        note = felt_note(midi, touch)
        place(mix, note, start, pan)
        # Quiet diffuse room reflections, all below the direct sound. Irregular
        # delays and opposing pans form space without an audible rhythmic echo.
        for delay, gain, reflection_pan in [
            (0.079, 0.075, -pan - 0.25), (0.137, 0.056, pan + 0.22),
            (0.223, 0.045, -0.32), (0.347, 0.028, 0.35),
            (0.541, 0.017, -0.15), (0.829, 0.009, 0.16),
        ]:
            place(mix, note, start + delay, reflection_pan, gain)

    time = np.arange(len(mix), dtype=np.float64) / SR
    fade_in = np.sin(np.minimum(time / 1.4, 1.0) * np.pi / 2) ** 2
    fade_out = np.sin(np.clip((DURATION - time) / 4.6, 0, 1) * np.pi / 2) ** 2
    mix *= (fade_in * fade_out)[:, None].astype(np.float32)
    mix -= np.mean(mix, axis=0, keepdims=True)
    # Reserve generous mixing headroom; this is a bed underneath the voice.
    peak = float(np.max(np.abs(mix)))
    mix *= (10 ** (-15.0 / 20.0)) / max(peak, 1e-12)
    # Preserve true silence at the edges after DC removal.
    mix[:64] *= np.linspace(0, 1, 64, dtype=np.float32)[:, None]
    mix[-64:] *= np.linspace(1, 0, 64, dtype=np.float32)[:, None]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sf.write(OUTPUT, mix, SR, subtype="PCM_24")
    add_info_metadata(OUTPUT)

    audio, rate = sf.read(OUTPUT, dtype="float64", always_2d=True)
    sample_peak = float(np.max(np.abs(audio)))
    rms = float(np.sqrt(np.mean(audio ** 2)))
    print(json.dumps({
        "output": str(OUTPUT),
        "provenance": PROVENANCE,
        "duration_seconds": len(audio) / rate,
        "sample_rate": rate,
        "channels": audio.shape[1],
        "encoding": sf.info(OUTPUT).subtype,
        "peak_dbfs": round(20 * math.log10(max(sample_peak, 1e-12)), 3),
        "rms_dbfs": round(20 * math.log10(max(rms, 1e-12)), 3),
        "clipped_samples": int(np.count_nonzero(np.abs(audio) >= 1.0)),
        "first_last_sample": [audio[0].tolist(), audio[-1].tolist()],
        "melody_events": len(melody),
        "total_piano_events": len(all_notes),
        "file_bytes": OUTPUT.stat().st_size,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
