"""Check deliverable decoding, timestamps, audio and asset provenance."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output'
FILM = OUT / '这一家-中秋样片.mp4'

def run(args):
    return subprocess.run(args, capture_output=True, check=True)

def pcm(path):
    result = run(['ffmpeg', '-v', 'error', '-nostdin', '-i', str(path), '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1'])
    return np.frombuffer(result.stdout, dtype='<f4')

def main():
    manifest = json.loads((OUT / 'render-manifest.json').read_text(encoding='utf-8'))
    voice_meta = json.loads((ROOT / 'assets/audio/voice-metadata.json').read_text(encoding='utf-8'))
    info = json.loads(run(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(FILM)]).stdout)
    v = next(s for s in info['streams'] if s['codec_type'] == 'video')
    a = next(s for s in info['streams'] if s['codec_type'] == 'audio')
    decode = run(['ffmpeg', '-v', 'warning', '-nostdin', '-i', str(FILM), '-f', 'null', 'NUL'])
    black = run(['ffmpeg', '-hide_banner', '-nostats', '-nostdin', '-i', str(FILM), '-vf', 'blackdetect=d=0.25:pix_th=0.08', '-an', '-f', 'null', 'NUL'])
    vol = run(['ffmpeg', '-hide_banner', '-nostats', '-nostdin', '-i', str(FILM), '-af', 'volumedetect', '-vn', '-f', 'null', 'NUL'])
    volume_log = vol.stderr.decode('utf-8', errors='replace')
    max_volume = float(re.search(r'max_volume: ([\-\d.]+) dB', volume_log).group(1))
    mean_volume = float(re.search(r'mean_volume: ([\-\d.]+) dB', volume_log).group(1))
    captions = manifest['captions']
    original_cues = json.loads((ROOT / 'assets/audio/provider-subtitles.json').read_text(encoding='utf-8'))
    timestamps_match = all(abs(c['start'] - (p['time_begin']/1000 + 4)) < 1e-8 and abs(c['end'] - (p['time_end']/1000 + 4)) < 1e-8 for c,p in zip(captions, original_cues))
    caption_order = all(captions[i]['end'] <= captions[i+1]['start'] for i in range(len(captions)-1))
    voice_file = ROOT / 'assets/audio/narration.mp3'
    source_hash = hashlib.sha256(voice_file.read_bytes()).hexdigest()
    source = pcm(voice_file)
    final = pcm(FILM)
    # Compare 2 ms absolute-amplitude envelopes around the planned four-second offset.
    block = 32
    count = len(source) // block
    source_env = np.abs(source[:count*block]).reshape(count, block).mean(axis=1)
    scores = []
    for delta in range(-160, 161, 32):
        begin = 4*16000 + delta
        segment = final[begin:begin + count*block]
        if len(segment) == count*block:
            env = np.abs(segment).reshape(count, block).mean(axis=1)
            scores.append((float(np.corrcoef(source_env, env)[0,1]), delta / 16000))
    correlation, lag = max(scores) if scores else (0.0, 999.0)
    packets = json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_packets', '-show_entries', 'packet=pts_time,duration_time', '-of', 'json', str(FILM)]).stdout)['packets']
    longest_audio_packet = max(float(p.get('duration_time', 0)) for p in packets)
    header = FILM.read_bytes()
    moov, mdat = header.find(b'moov'), header.find(b'mdat')
    black_events = re.findall(r'black_start:[^\r\n]+', black.stderr.decode('utf-8', errors='replace'))
    checks = {
        'full_decode_passed': decode.returncode == 0,
        'h264_aac_1080p': v['codec_name']=='h264' and a['codec_name']=='aac' and v['width']==1920 and v['height']==1080,
        'pixel_format_yuv420p': v['pix_fmt']=='yuv420p',
        'frame_rate_24': v['avg_frame_rate']=='24/1',
        'duration_matches_edit': abs(float(info['format']['duration'])-manifest['duration']) < .1,
        'captions_match_original_timestamps_plus_4s': timestamps_match,
        'captions_do_not_overlap': caption_order,
        'last_caption_within_film': captions[-1]['end'] < float(info['format']['duration']),
        'original_narration_hash_unchanged': source_hash == voice_meta['sha256'],
        'audio_alignment_within_10ms': abs(lag) <= .01 and correlation > .90,
        'decoded_audio_matches_video_duration': abs(len(final)/16000-float(info['format']['duration'])) < .05,
        'aac_packets_have_no_timeline_gap': longest_audio_packet < .03,
        'no_detected_black_segment': not black_events,
        'audio_peak_below_zero': max_volume < 0,
        'faststart': moov >= 0 and mdat >= 0 and moov < mdat,
    }
    report = {
        'file': str(FILM), 'duration_seconds': float(info['format']['duration']),
        'bytes': FILM.stat().st_size, 'frame_count': int(v.get('nb_frames', 0)),
        'checks': checks, 'all_automated_checks_passed': all(checks.values()),
        'audio_max_dbfs': max_volume, 'audio_mean_dbfs': mean_volume,
        'narration_envelope_correlation': correlation, 'audio_alignment_offset_error_seconds': lag,
        'decoded_audio_duration_seconds': len(final)/16000, 'longest_audio_packet_seconds': longest_audio_packet,
        'black_segments': black_events, 'decode_warnings': decode.stderr.decode('utf-8', errors='replace').strip(),
        'visual_review': 'Individually inspected all scene keyframes and both covers. Child captions moved above the subject to preserve visible double egg yolks. Source faces/clothing/materials checked.',
        'scope': 'Static frame review plus automated full-file decode/audio timing checks; not a human subjective listening panel or real-device compatibility study.',
    }
    (OUT / 'qa-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not all(checks.values()):
        raise SystemExit(1)

if __name__ == '__main__':
    main()
