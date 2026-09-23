"""Mix original voice/music as continuous PCM, then mux a gap-free film.

No voice generation or network calls occur here. A four-second introduction is
real PCM silence in the voice array, never a timestamp offset in an AAC stream.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import subprocess
import sys
from typing import Any

import numpy as np
import soundfile as sf


ROOT = Path(__file__).resolve().parents[1]
SAMPLE_RATE = 48_000
INTRO_SECONDS = 4.0


def _run(command: list[str]) -> subprocess.CompletedProcess[bytes]:
    process = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if process.returncode:
        raise RuntimeError(process.stderr.decode("utf-8", errors="replace"))
    return process


def _probe(path: Path, ffprobe: str) -> dict[str, Any]:
    return json.loads(_run([ffprobe, "-v", "error", "-show_streams", "-show_format",
                            "-of", "json", str(path)]).stdout)


def _decode(path: Path, ffmpeg: str, audio_filter: str | None = None) -> np.ndarray:
    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(path), "-vn"]
    if audio_filter:
        command += ["-af", audio_filter]
    command += ["-ar", str(SAMPLE_RATE), "-ac", "2", "-c:a", "pcm_f32le",
                "-f", "f32le", "pipe:1"]
    raw = _run(command).stdout
    if len(raw) % 8:
        raise RuntimeError("Decoded stereo float32 audio is not frame-aligned")
    return np.frombuffer(raw, dtype="<f4").reshape(-1, 2).copy()


def _normalized_voice(path: Path, ffmpeg: str) -> tuple[np.ndarray, dict[str, Any]]:
    # Two passes give a reproducible -17 LUFS voice and avoid clipping. Raw PCM
    # decoding deliberately discards all source/filter packet timestamps.
    first = _run([ffmpeg, "-hide_banner", "-i", str(path), "-vn", "-af",
                  "loudnorm=I=-17:TP=-1.5:LRA=7:print_format=json",
                  "-f", "null", "-"])
    stderr = first.stderr.decode("utf-8", errors="replace")
    measurement = json.loads(stderr[stderr.rfind("{"):stderr.rfind("}") + 1])
    params = ["loudnorm=I=-17:TP=-1.5:LRA=7",
              f"measured_I={measurement['input_i']}",
              f"measured_TP={measurement['input_tp']}",
              f"measured_LRA={measurement['input_lra']}",
              f"measured_thresh={measurement['input_thresh']}",
              f"offset={measurement['target_offset']}", "linear=true"]
    return _decode(path, ffmpeg, ":".join(params)), measurement


def _duck_envelope(root: Path, samples: int) -> tuple[np.ndarray, int]:
    """Smooth 0.55 music gain during real provider sentence intervals."""
    envelope = np.ones(samples, dtype=np.float32)
    subtitle_path = root / "assets/audio/provider-subtitles.json"
    if not subtitle_path.is_file():
        return envelope, 0
    subtitles = json.loads(subtitle_path.read_text(encoding="utf-8-sig"))
    attack_seconds, release_seconds = 0.20, 0.44
    for sentence in subtitles:
        start = INTRO_SECONDS + float(sentence["time_begin"]) / 1000.0
        end = INTRO_SECONDS + float(sentence["time_end"]) / 1000.0
        left = max(0, round((start - attack_seconds) * SAMPLE_RATE))
        right = min(samples, round((end + release_seconds) * SAMPLE_RATE))
        t = np.arange(left, right, dtype=np.float64) / SAMPLE_RATE
        down = np.clip((t - (start - attack_seconds)) / attack_seconds, 0, 1)
        up = np.clip((end + release_seconds - t) / release_seconds, 0, 1)
        smooth_down = 0.5 - 0.5 * np.cos(np.pi * down)
        smooth_up = 0.5 - 0.5 * np.cos(np.pi * up)
        local = 1.0 - 0.45 * np.minimum(smooth_down, smooth_up)
        envelope[left:right] = np.minimum(envelope[left:right], local)
    return envelope, len(subtitles)


def mix_film(root: Path, output: Path, duration: float, ffmpeg: str = "ffmpeg",
             ffprobe: str = "ffprobe", music_gain: float = 0.7) -> dict[str, Any]:
    """Return the renderer's existing mix metadata plus continuity checks."""
    root, output = Path(root), Path(output)
    silent = output / "silent.mp4"
    narration = root / "assets/audio/narration.mp3"
    music = root / "assets/audio/music.wav"
    if not silent.is_file():
        raise FileNotFoundError(silent)
    silent_info = _probe(silent, ffprobe)
    actual_video_duration = float(silent_info["format"]["duration"])
    if actual_video_duration + 0.06 < duration:
        raise ValueError("silent.mp4 is shorter than the requested film edit")
    if duration <= INTRO_SECONDS or music_gain < 0:
        raise ValueError("Invalid mix duration or music gain")

    total_samples = round(duration * SAMPLE_RATE)
    voice, voice_measurement = _normalized_voice(narration, ffmpeg)
    voice_offset = round(INTRO_SECONDS * SAMPLE_RATE)
    if voice_offset + len(voice) > total_samples:
        raise ValueError("Requested duration would truncate the narration")
    pcm = np.zeros((total_samples, 2), dtype=np.float32)
    pcm[voice_offset:voice_offset + len(voice)] = voice

    duck_intervals = 0
    if music.is_file():
        bed = _decode(music, ffmpeg)
        count = min(len(bed), total_samples)
        envelope, duck_intervals = _duck_envelope(root, total_samples)
        t = np.arange(total_samples, dtype=np.float64) / SAMPLE_RATE
        fade_in = np.sin(np.minimum(t / 1.8, 1) * np.pi / 2) ** 2
        fade_out = np.sin(np.clip((duration - t) / 3.0, 0, 1) * np.pi / 2) ** 2
        gain = (envelope * fade_in * fade_out * music_gain).astype(np.float32)
        pcm[:count] += bed[:count] * gain[:count, None]

    raw_peak = float(np.max(np.abs(pcm)))
    # Scale only if necessary; no compressor timestamps, lookahead, or implicit
    # latency can change the edit. Leave a small PCM rounding safety margin.
    peak_scale = min(1.0, 0.939999 / max(raw_peak, 1e-12))
    pcm *= peak_scale
    mix_path = output / "final-mix.wav"
    sf.write(mix_path, pcm, SAMPLE_RATE, subtype="PCM_24")

    target = output / "这一家-中秋样片.mp4"
    temporary = output / "film.pcm-mixing.mp4"
    exact_duration = total_samples / SAMPLE_RATE
    _run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
          "-i", str(silent), "-i", str(mix_path),
          "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
          "-c:a", "aac", "-b:a", "256k", "-ar", str(SAMPLE_RATE), "-ac", "2",
          "-t", f"{exact_duration:.9f}", "-movflags", "+faststart",
          "-metadata", "title=这一家｜一桌人，终于坐下",
          "-metadata", "comment=虚构家庭故事示范；AI 生成插画与合成旁白；原创程序合成配乐。",
          str(temporary)])

    info = _probe(temporary, ffprobe)
    video = next(s for s in info["streams"] if s["codec_type"] == "video")
    audio = next(s for s in info["streams"] if s["codec_type"] == "audio")
    if (video.get("codec_name") != "h264" or video.get("pix_fmt") != "yuv420p"
            or audio.get("codec_name") != "aac" or audio.get("sample_rate") != "48000"
            or audio.get("channels") != 2):
        raise RuntimeError("Unexpected output video/audio format")

    packets = json.loads(_run([ffprobe, "-v", "error", "-select_streams", "a:0",
                              "-show_packets", "-show_entries",
                              "packet=pts_time,duration_time", "-of", "json",
                              str(temporary)]).stdout)["packets"]
    packet_durations = np.array([float(p["duration_time"]) for p in packets])
    pts = np.array([float(p["pts_time"]) for p in packets])
    gaps = pts[1:] - pts[:-1] - packet_durations[:-1]
    max_packet = float(np.max(packet_durations))
    max_gap = float(np.max(np.abs(gaps))) if len(gaps) else 0.0
    if max_packet > 0.022 or max_gap > 0.00001:
        raise RuntimeError(f"AAC timestamp discontinuity: packet={max_packet}, gap={max_gap}")
    decoded = _decode(temporary, ffmpeg)
    decoded_duration = len(decoded) / SAMPLE_RATE
    if abs(decoded_duration - exact_duration) > 1024 / SAMPLE_RATE + 0.0001:
        raise RuntimeError(f"AAC decoded length incorrect: {decoded_duration}")
    final_duration = float(info["format"]["duration"])
    if abs(final_duration - exact_duration) > 0.05:
        raise RuntimeError(f"Unexpected container duration: {final_duration}")
    # Verify only after both muxing and full PCM decoding, then replace the old
    # deliverable. A failed check leaves the previous published path intact.
    temporary.replace(target)
    mix_peak = float(np.max(np.abs(pcm)))
    return {
        "file": str(target), "music": str(music) if music.is_file() else None,
        "music_gain_before_ducking": music_gain, "voice_loudness_target_lufs": -17,
        "duration": final_duration, "video_codec": video["codec_name"],
        "pixel_format": video["pix_fmt"], "audio_codec": audio["codec_name"],
        "width": video["width"], "height": video["height"],
        "frame_rate": video.get("avg_frame_rate"), "bytes": target.stat().st_size,
        "mix_method": "deterministic offline PCM, timestamp-based smooth music envelope",
        "mix_wav": str(mix_path), "pcm_samples": total_samples,
        "pcm_duration": exact_duration, "narration_offset_seconds": INTRO_SECONDS,
        "narration_decoded_seconds": len(voice) / SAMPLE_RATE,
        "music_duck_gain": 0.55, "duck_intervals": duck_intervals,
        "mix_peak": mix_peak, "mix_peak_dbfs": 20 * math.log10(max(mix_peak, 1e-12)),
        "peak_safety_scale": peak_scale, "clipped_samples": int(np.sum(np.abs(pcm) >= 1)),
        "aac_packet_count": len(packets), "aac_max_packet_duration": max_packet,
        "aac_max_abs_packet_gap": max_gap, "aac_decoded_samples": len(decoded),
        "aac_decoded_duration": decoded_duration,
        "voice_input_measurement": voice_measurement,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--duration", type=float, default=50.70833333333333)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    parser.add_argument("--music-gain", type=float, default=0.7)
    args = parser.parse_args()
    report = mix_film(args.root, args.output or args.root / "output", args.duration,
                      args.ffmpeg, args.ffprobe, args.music_gain)
    manifest_path = (args.output or args.root / "output") / "mix-manifest.json"
    manifest_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                             encoding="utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
