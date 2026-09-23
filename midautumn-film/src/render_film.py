"""Render the authored Mid-Autumn film without changing its source artwork.

The provider's sentence timestamps are the edit's source of truth. This is a
Pillow composition / camera / typesetting pipeline, not an image-generation or
source-image editing operation. FFmpeg encodes the frames and mixes audio.

Examples (from any directory):
    python render_film.py --frames-only
    python render_film.py
    python render_film.py --mix-only
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass, asdict
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SERIF = Path("C:/Windows/Fonts/NotoSerifSC-VF.ttf")
SANS = Path("C:/Windows/Fonts/NotoSansSC-VF.ttf")
INTRO_SECONDS = 4.0
OUTRO_SECONDS = 3.0
PAPER = (241, 230, 210)
INK = (67, 50, 38)
WHITE = (255, 248, 233)


@dataclass(frozen=True)
class Caption:
    index: int
    text: str
    start: float
    end: float


@dataclass(frozen=True)
class Shot:
    asset: str
    label: str
    start: float
    end: float
    zoom_start: float
    zoom_end: float
    anchor_x: float
    anchor_y: float
    drift_x: float = 0.0
    drift_y: float = 0.0


@dataclass(frozen=True)
class Transition:
    center: float
    duration: float


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def smooth(value: float) -> float:
    value = clamp(value)
    return value * value * (3.0 - 2.0 * value)


def executable(value: str, name: str) -> str:
    found = shutil.which(value)
    if not found and Path(value).is_file():
        found = str(Path(value).resolve())
    if not found:
        raise RuntimeError(f"Cannot find {name}: {value}. Pass --{name} with its executable path.")
    return found


def media_info(path: Path, ffprobe: str) -> dict[str, Any]:
    result = subprocess.run(
        [ffprobe, "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)],
        check=True, capture_output=True, text=True, encoding="utf-8",
    )
    return json.loads(result.stdout)


def media_duration(path: Path, ffprobe: str) -> float:
    info = media_info(path, ffprobe)
    durations = [float(info.get("format", {}).get("duration", 0))]
    durations.extend(float(s.get("duration", 0)) for s in info.get("streams", []) if s.get("duration") not in (None, "N/A"))
    result = max(durations)
    if not math.isfinite(result) or result <= 0:
        raise ValueError(f"Could not determine a positive duration for {path}")
    return result


def read_captions(root: Path) -> list[Caption]:
    script = json.loads((root / "script.json").read_text(encoding="utf-8-sig"))
    supplied = json.loads((root / "assets/audio/provider-subtitles.json").read_text(encoding="utf-8-sig"))
    if not isinstance(script, list) or len(script) != 11 or len(supplied) != 11:
        raise ValueError("This authored film requires the 11 script sentences and their 11 provider timestamps.")
    captions = []
    previous_end = 0.0
    for index, (expected, record) in enumerate(zip(script, supplied)):
        if record["text"].strip() != expected.strip():
            raise ValueError(f"Script/provider text mismatch at sentence {index}: {record['text']!r}")
        start = float(record["time_begin"]) / 1000.0
        end = float(record["time_end"]) / 1000.0
        if not all(math.isfinite(v) for v in (start, end)) or start < previous_end - 0.001 or end <= start:
            raise ValueError(f"Invalid or overlapping provider timestamp at sentence {index}.")
        captions.append(Caption(index, expected.strip(), INTRO_SECONDS + start, INTRO_SECONDS + end))
        previous_end = end
    return captions


def build_edit(captions: list[Caption], narration_duration: float, fps: int) -> tuple[list[Shot], list[Transition], float, int]:
    # A shortened input cannot silently discard the final caption.
    spoken_end = max(INTRO_SECONDS + narration_duration, captions[-1].end)
    frame_count = math.ceil((spoken_end + OUTRO_SECONDS) * fps)
    duration = frame_count / fps
    boundaries = [INTRO_SECONDS]
    transitions = [Transition(INTRO_SECONDS - 0.32, 0.64)]
    for previous, following in ((1, 2), (3, 4), (4, 5), (5, 6), (6, 7), (8, 9)):
        gap_start, gap_end = captions[previous].end, captions[following].start
        midpoint = (gap_start + gap_end) / 2.0
        boundaries.append(midpoint)
        # Dissolves stay in actual speech gaps, never shift the captions.
        transitions.append(Transition(midpoint, min(0.82, max(0.08, (gap_end - gap_start) * 0.84))))
    boundaries.append(spoken_end + 0.35)
    transitions.append(Transition(boundaries[-1], 0.70))
    starts = [0.0] + boundaries
    ends = boundaries + [duration]
    settings = [
        ("envelope", "纸封开场", 1.000, 1.018, 0.50, 0.45, 0.00, 0.00),
        ("father", "多带的一袋水果", 1.000, 1.030, 0.62, 0.00, 0.04, 0.02),
        ("child", "双黄月饼", 1.000, 1.020, 0.57, 0.00, 0.00, 0.00),
        ("mother", "厨房里的招呼", 1.015, 1.030, 0.55, 0.18, -0.015, 0.01),
        ("father", "门口的回应", 1.045, 1.055, 0.67, 0.00, 0.015, 0.00),
        ("mother", "忙着摆好一桌", 1.055, 1.080, 0.57, 0.24, -0.025, 0.01),
        ("family", "终于坐下", 1.035, 1.000, 0.50, 0.20, 0.00, 0.00),
        ("stilllife", "先尝一口", 1.000, 1.038, 0.56, 0.46, 0.02, 0.00),
        ("family", "我们家的中秋", 1.000, 1.008, 0.50, 0.20, 0.00, 0.00),
    ]
    shots = [Shot(asset, label, starts[i], ends[i], z0, z1, ax, ay, dx, dy)
             for i, (asset, label, z0, z1, ax, ay, dx, dy) in enumerate(settings)]
    return shots, transitions, duration, frame_count


def srt_time(seconds: float) -> str:
    milliseconds = max(0, round(seconds * 1000))
    return f"{milliseconds // 3600000:02}:{milliseconds // 60000 % 60:02}:{milliseconds // 1000 % 60:02},{milliseconds % 1000:03}"


def write_srt(path: Path, captions: list[Caption]) -> None:
    body = "\n\n".join(f"{n + 1}\n{srt_time(c.start)} --> {srt_time(c.end)}\n{c.text}" for n, c in enumerate(captions))
    path.write_text(body + "\n", encoding="utf-8-sig")


class FilmRenderer:
    def __init__(self, root: Path, width: int, height: int, shots: list[Shot], transitions: list[Transition], captions: list[Caption]):
        self.root, self.width, self.height = root, width, height
        self.shots, self.transitions, self.captions = shots, transitions, captions
        self.scale = width / 1920.0
        for font in (SERIF, SANS):
            if not font.is_file():
                raise FileNotFoundError(f"Required Chinese font is missing: {font}")
        missing = [root / "assets" / f"{name}.png" for name in sorted({s.asset for s in shots}) if not (root / "assets" / f"{name}.png").is_file()]
        if missing:
            raise FileNotFoundError("Waiting for original artwork (no replacement images will be drawn):\n" + "\n".join(str(p) for p in missing))
        self.images = {}
        for name in sorted({s.asset for s in shots}):
            with Image.open(root / "assets" / f"{name}.png") as source:
                self.images[name] = ImageOps.exif_transpose(source).convert("RGB")
        self.fonts: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}
        self.caption_layers = {c.index: self.make_caption(c.text, top=c.index in (2, 3)) for c in captions}
        self.subtitle_shade = self.make_subtitle_shade()
        self.top_subtitle_shade = self.subtitle_shade.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        self.intro_layer = self.make_intro()
        self.outro_layer = self.make_outro()
        self.paper = Image.new("RGB", (width, height), PAPER)

    def font(self, size: float, serif: bool = False) -> ImageFont.FreeTypeFont:
        size = max(8, round(size * self.scale))
        key = ("serif" if serif else "sans", size)
        if key not in self.fonts:
            font = ImageFont.truetype(str(SERIF if serif else SANS), size)
            # These variable fonts default to ExtraLight/Thin (200/100), not
            # Regular. Set the actual weight explicitly for video readability.
            font.set_variation_by_axes([400 if serif else 450])
            self.fonts[key] = font
        return self.fonts[key]

    def text(self, layer: Image.Image, text: str, position: tuple[float, float], size: float, *, serif: bool = False, fill=INK, anchor="lt", spacing: float = 0.0):
        draw = ImageDraw.Draw(layer)
        font = self.font(size, serif)
        x, y = position[0] * self.scale, position[1] * self.scale
        if not spacing:
            draw.text((x, y), text, font=font, fill=fill, anchor=anchor)
            return
        gap = spacing * self.scale
        total_width = sum(draw.textlength(ch, font=font) for ch in text) + gap * max(0, len(text) - 1)
        if anchor.startswith("m"):
            x -= total_width / 2.0
        for ch in text:
            draw.text((x, y), ch, font=font, fill=fill, anchor="lt")
            x += draw.textlength(ch, font=font) + gap

    def make_intro(self) -> Image.Image:
        layer = Image.new("RGBA", (self.width, self.height))
        # A soft typesetting veil is composited above the untouched artwork.
        x = np.linspace(0.0, 1.0, self.width, dtype=np.float32)
        alpha = np.clip((0.69 - x) / 0.46, 0, 1) * 168
        veil = Image.new("RGBA", layer.size, (*PAPER, 0))
        veil.putalpha(Image.fromarray(np.repeat(alpha.astype(np.uint8)[None, :], self.height, axis=0)))
        layer = Image.alpha_composite(layer, veil)
        self.text(layer, "这一家", (148, 167), 38, serif=True, spacing=13)
        d = ImageDraw.Draw(layer)
        d.line((149 * self.scale, 235 * self.scale, 239 * self.scale, 235 * self.scale), fill=(155, 111, 69, 255), width=max(1, round(2 * self.scale)))
        self.text(layer, "一桌人，", (141, 318), 101, serif=True, spacing=3)
        self.text(layer, "终于坐下", (143, 450), 101, serif=True, spacing=3)
        self.text(layer, "把日常的小事，留给团圆的夜。", (151, 624), 31, fill=(86, 69, 54, 255))
        self.text(layer, "中秋 · 家庭故事示范", (153, 697), 22, fill=(117, 98, 78, 255), spacing=2)
        return layer

    def make_outro(self) -> Image.Image:
        layer = Image.new("RGBA", (self.width, self.height))
        self.text(layer, "我们家的中秋", (1100, 106), 57, serif=True, anchor="mt", spacing=2)
        self.text(layer, "这一家 · 中秋记事", (1100, 186), 25, anchor="mt", fill=(103, 79, 53, 255), spacing=2)
        return layer

    def make_caption(self, text: str, top: bool = False) -> Image.Image:
        # Every provider sentence stays on one line inside a 160-pixel margin.
        layer = Image.new("RGBA", (self.width, self.height))
        draw = ImageDraw.Draw(layer)
        size = 43
        while draw.textlength(text, font=self.font(size)) > self.width - 320 * self.scale and size > 28:
            size -= 1
        if draw.textlength(text, font=self.font(size)) > self.width - 320 * self.scale:
            raise ValueError(f"Caption cannot fit as one readable line: {text}")
        baseline = round(94 * self.scale) if top else self.height - round(78 * self.scale)
        draw.text((self.width / 2, baseline), text, font=self.font(size), fill=(*WHITE, 255), anchor="ms",
                  stroke_width=max(1, round(self.scale)), stroke_fill=(48, 34, 25, 145))
        return layer

    def make_subtitle_shade(self) -> Image.Image:
        # Keep this gentle grade through pauses; toggling it sentence by
        # sentence would cause distracting brightness flashes.
        layer = Image.new("RGBA", (self.width, self.height))
        band_height = round(248 * self.scale)
        alpha = np.linspace(0.0, 1.0, band_height, dtype=np.float32) ** 1.2 * 166
        shade = Image.new("RGBA", (self.width, band_height), (26, 22, 19, 0))
        shade.putalpha(Image.fromarray(np.repeat(alpha.astype(np.uint8)[:, None], self.width, axis=1)))
        layer.alpha_composite(shade, (0, self.height - band_height))
        return layer

    @staticmethod
    def composite(base: Image.Image, layer: Image.Image, opacity: float = 1.0) -> Image.Image:
        opacity = clamp(opacity)
        if opacity <= 0:
            return base
        if opacity < 0.999:
            layer = layer.copy()
            layer.putalpha(layer.getchannel("A").point(lambda value: round(value * opacity)))
        result = base.copy()
        result.paste(layer, (0, 0), layer)
        return result

    def camera(self, shot: Shot, time: float) -> Image.Image:
        source = self.images[shot.asset]
        progress = smooth((time - shot.start) / max(0.1, shot.end - shot.start))
        zoom = shot.zoom_start + (shot.zoom_end - shot.zoom_start) * progress
        cover_scale = max(self.width / source.width, self.height / source.height) * zoom
        crop_width, crop_height = self.width / cover_scale, self.height / cover_scale
        ax = clamp(shot.anchor_x + shot.drift_x * (progress - 0.5))
        ay = clamp(shot.anchor_y + shot.drift_y * (progress - 0.5))
        left = max(0.0, source.width - crop_width) * ax
        top = max(0.0, source.height - crop_height) * ay
        return source.transform((self.width, self.height), Image.Transform.EXTENT,
                                (left, top, left + crop_width, top + crop_height), Image.Resampling.BICUBIC)

    def shot_frame(self, index: int, time: float) -> Image.Image:
        shot = self.shots[index]
        frame = self.camera(shot, time)
        if index == 0:
            frame = self.composite(frame, self.intro_layer, smooth((time - 0.30) / 0.75))
            frame = Image.blend(self.paper, frame, smooth(time / 0.55))
        elif index == len(self.shots) - 1:
            frame = self.composite(frame, self.outro_layer, smooth((time - shot.start - 0.15) / 0.55))
        return frame

    def frame(self, time: float, captions: bool = True) -> Image.Image:
        result = None
        for index, transition in enumerate(self.transitions):
            start = transition.center - transition.duration / 2
            end = transition.center + transition.duration / 2
            if start <= time < end:
                result = Image.blend(self.shot_frame(index, time), self.shot_frame(index + 1, time), smooth((time - start) / transition.duration))
                break
        if result is None:
            index = sum(time >= transition.center for transition in self.transitions)
            result = self.shot_frame(index, time)
        if captions:
            spoken_end = self.shots[-1].start - 0.35
            shade_opacity = min(smooth((time - INTRO_SECONDS + 0.60) / 0.60), smooth((spoken_end + 0.55 - time) / 0.60))
            child_shot = next(s for s in self.shots if s.asset == "child")
            top_mix = min(smooth((time - child_shot.start + 0.4) / 0.8), smooth((child_shot.end + 0.4 - time) / 0.8))
            result = self.composite(result, self.subtitle_shade, shade_opacity * (1 - top_mix))
            result = self.composite(result, self.top_subtitle_shade, shade_opacity * top_mix)
            active = next((caption for caption in self.captions if caption.start <= time < caption.end), None)
            if active is not None:
                # No text fade: even the shortest utterance gets its full display time.
                result = self.composite(result, self.caption_layers[active.index])
        return result

    def previews(self, output: Path, duration: float) -> list[dict[str, Any]]:
        directory = output / "previews"
        directory.mkdir(parents=True, exist_ok=True)
        times = [2.35] + [(self.captions[i].start + self.captions[i].end) / 2 for i in (0, 2, 4, 6, 8, 9)] + [duration - 1.05]
        thumb_width, thumb_height, label_height = 480, 270, 35
        sheet = Image.new("RGB", (thumb_width * 4, (thumb_height + label_height) * 2), PAPER)
        draw = ImageDraw.Draw(sheet)
        label_font = ImageFont.truetype(str(SANS), 19)
        label_font.set_variation_by_axes([400])
        records = []
        for index, time in enumerate(times):
            frame = self.frame(time)
            filename = directory / f"frame-{index + 1:02}-{time:05.2f}s.jpg"
            frame.save(filename, quality=94, subsampling=0)
            thumbnail = frame.resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)
            x = (index % 4) * thumb_width
            y = (index // 4) * (thumb_height + label_height)
            sheet.paste(thumbnail, (x, y))
            shot_index = sum(time >= item.center for item in self.transitions)
            draw.text((x + 12, y + thumb_height + 6), f"{index + 1:02}  {time:05.2f}s  {self.shots[shot_index].label}", font=label_font, fill=INK)
            records.append({"time": time, "file": str(filename), "scene": self.shots[shot_index].label})
        sheet.save(output / "contact-sheet.jpg", quality=94, subsampling=0)
        self.frame(2.35, captions=False).save(output / "cover-landscape.jpg", quality=97, subsampling=0)
        return records


def encode_video(renderer: FilmRenderer, output: Path, frame_count: int, fps: int, ffmpeg: str, crf: int, preset: str) -> Path:
    target = output / "silent.mp4"
    temporary = output / "silent.rendering.mp4"
    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-s:v", f"{renderer.width}x{renderer.height}", "-r", str(fps), "-i", "pipe:0", "-an",
               "-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p",
               "-r", str(fps), "-movflags", "+faststart", str(temporary)]
    log_path = output / "video-encode.log"
    with log_path.open("wb") as error_log:
        process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=error_log)
        try:
            assert process.stdin is not None
            for index in range(frame_count):
                process.stdin.write(renderer.frame(index / fps).tobytes())
                if index % (fps * 3) == 0 or index == frame_count - 1:
                    print(f"Video: {index + 1}/{frame_count} frames ({(index + 1) / frame_count:.0%})", flush=True)
            process.stdin.close()
            status = process.wait()
        except BaseException:
            if process.stdin and not process.stdin.closed:
                process.stdin.close()
            process.kill()
            process.wait()
            raise
    if status:
        raise RuntimeError(f"FFmpeg frame encoding failed ({status}); see {log_path}")
    temporary.replace(target)
    return target


def mix_audio(root: Path, output: Path, duration: float, ffmpeg: str, ffprobe: str, music_gain: float) -> dict[str, Any]:
    # Build a continuous sample-indexed master before AAC encoding.
    # This avoids frame-timestamp gaps in chained dynamic FFmpeg filters.
    from mix_film import mix_film
    return mix_film(root, output, duration, ffmpeg, ffprobe, music_gain)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--root", type=Path, default=ROOT)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--frames-only", action="store_true", help="Generate eight preview frames, contact sheet, cover, SRT and edit manifest only.")
    mode.add_argument("--mix-only", action="store_true", help="Keep silent.mp4 and re-mix the original voice plus current music.wav.")
    mode.add_argument("--silent-only", action="store_true", help="Render visual deliverables and silent.mp4 without audio mixing.")
    parser.add_argument("--width", type=int, default=1920)
    parser.add_argument("--height", type=int, default=1080)
    parser.add_argument("--fps", type=int, default=24)
    parser.add_argument("--crf", type=int, default=18)
    parser.add_argument("--preset", default="medium")
    parser.add_argument("--music-gain", type=float, default=0.70, help="Music linear gain before automatic speech ducking.")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    args = parser.parse_args()
    if args.width < 640 or args.height < 360 or args.width % 2 or args.height % 2 or abs(args.width / args.height - 16 / 9) > 0.001:
        parser.error("Use an even 16:9 output size of at least 640x360.")
    if not 1 <= args.fps <= 60 or not 0 <= args.crf <= 40 or not 0 <= args.music_gain <= 1:
        parser.error("Use fps 1–60, crf 0–40 and music-gain 0–1.")
    root = args.root.resolve()
    ffprobe = executable(args.ffprobe, "ffprobe")
    ffmpeg = executable(args.ffmpeg, "ffmpeg") if not args.frames_only else args.ffmpeg
    captions = read_captions(root)
    narration_duration = media_duration(root / "assets/audio/narration.mp3", ffprobe)
    shots, transitions, duration, frame_count = build_edit(captions, narration_duration, args.fps)
    output = root / "output"
    output.mkdir(parents=True, exist_ok=True)
    write_srt(output / "captions.srt", captions)
    manifest = {"title": "一桌人，终于坐下", "series": "这一家", "fictional_demonstration": True,
                "width": args.width, "height": args.height, "fps": args.fps, "frame_count": frame_count,
                "duration": duration, "narration_duration": narration_duration, "narration_offset": INTRO_SECONDS,
                "caption_timing": "Unmodified provider sentence timings plus exactly 4 seconds.",
                "source_artwork_modified": False, "shots": [asdict(s) for s in shots],
                "transitions": [asdict(t) for t in transitions], "captions": [asdict(c) for c in captions]}
    if not args.mix_only:
        renderer = FilmRenderer(root, args.width, args.height, shots, transitions, captions)
        manifest["previews"] = renderer.previews(output, duration)
        if not args.frames_only:
            encode_video(renderer, output, frame_count, args.fps, ffmpeg, args.crf, args.preset)
    if not args.frames_only and not args.silent_only:
        manifest["final"] = mix_audio(root, output, duration, ffmpeg, ffprobe, args.music_gain)
    manifest_path = output / ("mix-manifest.json" if args.mix_only else "render-manifest.json")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output), "mode": "frames" if args.frames_only else "mix" if args.mix_only else "silent" if args.silent_only else "complete",
                      "duration": duration, "frames": frame_count, "captions": len(captions)}, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        print(f"Render failed: {error}", file=sys.stderr)
        raise SystemExit(1)
