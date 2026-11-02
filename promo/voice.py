"""Озвучка реплик через ElevenLabs: python3 voice.py VOICE_DIR

Ключ — переменная окружения ELEVENLABS_API_KEY (в настройках облачного окружения, не в репозитории).
Голос — ELEVENLABS_VOICE_ID (по умолчанию Anna Sokolova, русский голос из библиотеки).
Получается VOICE_DIR/<id>.mp3 на каждую сцену; дальше lipsync.py оживляет героиню под эту дорожку.
"""
import json, os, subprocess, sys, urllib.request

from scenes import SCENES

API = "https://api.elevenlabs.io/v1"
VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "IO0VLmDxIb8N5msewtV4")  # Anna Sokolova (русский)
MODEL = os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2")
# как читать слова, которые TTS может произнести неверно
SAY = {"с Claude": "с Клодом", "Claude": "Клод", "CRM": "си-ар-эм"}

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
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    for s in SCENES:
        mp3 = os.path.join(out_dir, s["id"] + ".mp3")
        if not os.path.exists(mp3):
            tts(line(s), mp3)
        print(s["id"], f"{dur(mp3):.1f} c")
