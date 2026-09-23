"""Generate the real MiniMax voice master and retain provider sentence timestamps."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import requests

ROOT = Path(__file__).resolve().parents[1]
LINES = [
    "开完会，桌上留下三条记录。",
    "第一条，周五发布新版。",
    "第二条，小林负责上线。",
    "第三条，登录问题必须先修复。",
    "如果只把纸张堆在一起，重点还是不好找。",
    "现在，让这三条记录进入同一个整理流程。",
    "先提取时间，再找到负责人，最后标出前置条件。",
    "于是，零散记录变成了一张行动摘要。",
    "周五发布，小林负责，上线前修复登录。",
    "原始记录仍然保留，摘要只是帮助我们快速抓住重点。",
    "你看到的每一次移动，都跟着这段真实配音发生。",
    "先有声音，再让画面把意思演出来。",
]

def stamp(t):
    ms = round(t * 1000)
    return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", type=Path, required=True)
    parser.add_argument("--model", default="speech-2.8-hd")
    parser.add_argument("--voice", default="male-qn-jingying")
    parser.add_argument("--script", type=Path, help="JSON array of spoken sentences")
    parser.add_argument("--out", type=Path, help="Episode asset folder")
    parser.add_argument("--language", default="Chinese")
    parser.add_argument("--speed", type=float, default=0.94)
    parser.add_argument("--pauses", type=Path, help="JSON mapping zero-based sentence index to following pause seconds")
    args = parser.parse_args()
    lines = json.loads(args.script.read_text(encoding="utf-8-sig")) if args.script else LINES
    if not isinstance(lines,list) or not lines or not all(isinstance(x,str) and x.strip() for x in lines):
        raise SystemExit("Script must be a nonempty JSON array of sentences.")
    out = args.out.resolve() if args.out else ROOT / "assets"
    out.mkdir(exist_ok=True, parents=True)
    if (out / "narration.mp3").exists():
        raise SystemExit("Existing voice master retained. Move it explicitly before requesting a new paid synthesis.")
    env = {}
    for line in args.env.read_text(encoding="utf-8-sig").splitlines():
        if line.strip() and not line.lstrip().startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    base = env.get("MINIMAX_API_BASE", "https://api.minimax.cn").rstrip("/")
    endpoint = base if base.endswith("/t2a_v2") else base + ("/t2a_v2" if base.endswith("/v1") else "/v1/t2a_v2")
    pauses=json.loads(args.pauses.read_text(encoding="utf-8-sig")) if args.pauses else {}
    speech="".join(line+(f"<#{float(pauses.get(str(i),0.4))}#>" if i<len(lines)-1 else "") for i,line in enumerate(lines))
    payload = {
        "model": args.model, "text": speech, "stream": False,
        "voice_setting": {"voice_id": args.voice, "speed": args.speed, "vol": 1, "pitch": 0},
        "audio_setting": {"sample_rate": 32000, "bitrate": 128000, "format": "mp3", "channel": 1},
        "language_boost": args.language, "subtitle_enable": True, "subtitle_type": "sentence", "output_format": "hex",
    }
    (out / "narration-script.txt").write_text("\n".join(lines), encoding="utf-8")
    (out / "tts-request.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    response = requests.post(endpoint, json=payload, headers={"Authorization": "Bearer " + env["MINIMAX_API_KEY"]}, timeout=240)
    response.raise_for_status()
    data = response.json()
    status = data.get("base_resp", {})
    if status.get("status_code") != 0:
        raise SystemExit(f"MiniMax synthesis failed: {status.get('status_code')} {status.get('status_msg')}")
    audio = bytes.fromhex(data["data"]["audio"])
    (out / "narration.mp3").write_bytes(audio)
    sub_url = data["data"].get("subtitle_file")
    if not sub_url:
        raise SystemExit("Voice saved but provider did not return subtitles; do not fabricate alignment.")
    subtitles = requests.get(sub_url, timeout=60)
    subtitles.raise_for_status()
    raw = subtitles.json()
    (out / "provider-subtitles.json").write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
    duration = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(out / "narration.mp3")], text=True).strip())
    metadata = {"provider": "MiniMax", "model": args.model, "voice_id": args.voice, "speed": args.speed, "duration": duration,
                "sha256": hashlib.sha256(audio).hexdigest(), "extra_info": data.get("extra_info", {}), "transcript": lines,
                "alignment_source": "MiniMax generated-audio sentence timestamps", "audio_retimed": False}
    (out / "voice-metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": "saved", "duration": duration, "subtitle_cues":len(raw)}, ensure_ascii=True))

if __name__ == "__main__":
    main()
