"""Сцены с точной синхронизацией губ: python3 lipsync.py CLIPS_DIR VOICE_DIR OUT_DIR

1) voice.py уже сделал VOICE_DIR/<id>.mp3 (ElevenLabs);
2) первый кадр каждой сцены берётся из клипа Vivix W1 (CLIPS_DIR), кадрируется в 672×1280;
3) Vivix A1 оживляет этот кадр под реплику — получается OUT_DIR/<id>.mp4 со звуком.
"""
import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

import vivix
from scenes import SCENES

LEAD, TAIL = 0.3, 0.6  # тишина до и после реплики, с

def scene(s, clips, voice, out_dir):
    out = os.path.join(out_dir, s["id"] + ".mp4")
    if os.path.exists(out):
        return out
    jpg, mp3 = (os.path.join(out_dir, s["id"] + x) for x in (".jpg", ".mp3"))
    subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(clips, s["id"] + ".mp4"), "-frames:v", "1",
                           "-vf", "scale=672:1280:force_original_aspect_ratio=increase,crop=672:1280", "-q:v", "2", jpg])
    subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(voice, s["id"] + ".mp3"), "-af",
                           f"adelay={int(LEAD * 1000)}:all=1,apad=pad_dur={TAIL}", "-b:a", "192k", mp3])
    setting = s["prompt"].split(" She ")[0].split(" One continuous")[0]
    prompt = (f"{setting} The woman ({s['outfit']}) talks to the camera in Russian, natural lip sync, "
              "expressive face, small natural head and hand movements. Realistic, cinematic, no text.")
    return vivix.lipsync(prompt, vivix.upload_image(jpg), vivix.upload_audio(mp3), out)

if __name__ == "__main__":
    clips, voice, out_dir = sys.argv[1:4]
    os.makedirs(out_dir, exist_ok=True)
    with ThreadPoolExecutor(4) as pool:
        for f in [pool.submit(scene, s, clips, voice, out_dir) for s in SCENES]:
            f.result()
