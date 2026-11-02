"""Озвучка реплик через ElevenLabs: python3 voice.py CLIPS_DIR VOICE_DIR

Ключ — переменная окружения ELEVENLABS_API_KEY (в настройках облачного окружения, не в репозитории).
Голос — ELEVENLABS_VOICE_ID (по умолчанию Sarah из стандартной библиотеки).
Для каждой сцены получается VOICE_DIR/<id>.wav длиной ровно в сцену: реплика стоит там же,
где героиня говорит в клипе Vivix, а если она длиннее окна — немного ускоряется.
Затем: VOICE_DIR=... python3 assemble.py ... — ролик соберётся с этой дорожкой вместо голоса Vivix.
"""
import json, os, subprocess, sys, urllib.request

from scenes import SCENES

API = "https://api.elevenlabs.io/v1"
VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
MODEL = os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2")
# когда героиня начинает и заканчивает говорить в текущих клипах (с) — по распознаванию речи
WINDOW = {"s1_problem": (1.4, 9.9), "s2_solution": (0.0, 9.6), "s3_tasks": (0.0, 9.9), "s4_result": (0.0, 8.4)}

# как читать слова, которые TTS может произнести неверно
SAY = {"Claude": "Клод", "CRM": "си-ар-эм"}

def line(s):
    text = s["prompt"].split('says in Russian')[1].split('"')[1]
    for a, b in SAY.items():
        text = text.replace(a, b)
    return text

def tts(text, out):
    if not os.environ.get("ELEVENLABS_API_KEY"):
        sys.exit("Нет ELEVENLABS_API_KEY: добавьте ключ в настройки окружения и откройте новую сессию.")
    body = {"text": text, "model_id": MODEL,
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.3, "use_speaker_boost": True}}
    req = urllib.request.Request(f"{API}/text-to-speech/{VOICE}?output_format=mp3_44100_128", method="POST",
                                 data=json.dumps(body).encode(),
                                 headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r, open(out, "wb") as f:
        f.write(r.read())

def dur(f):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))

if __name__ == "__main__":
    clips, out_dir = sys.argv[1:3]
    os.makedirs(out_dir, exist_ok=True)
    for s in SCENES:
        mp3 = os.path.join(out_dir, s["id"] + ".mp3")
        if not os.path.exists(mp3):
            tts(line(s), mp3)
        a, b = WINDOW[s["id"]]
        scene_len = dur(os.path.join(clips, s["id"] + ".mp4"))
        speed = max(0.88, dur(mp3) / (b - a))  # подгоняем под окно, где у героини двигаются губы (замедление не больше 12%)
        subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-af",
            f"atempo={speed:.3f},adelay={int(a * 1000)}:all=1,apad,atrim=0:{scene_len},"
            "aresample=48000,aformat=channel_layouts=stereo", os.path.join(out_dir, s["id"] + ".wav")])
        print(s["id"], f"{dur(mp3):.1f} c", f"темп ×{speed:.2f}")
