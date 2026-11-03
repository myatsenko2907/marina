"""Генерирует сцены ролика через Vivix W1: python3 generate.py CLIPS_DIR [id сцен...]"""
import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

import vivix
from scenes import HEROINE, REF, SCENES, STYLE

MODEL = os.environ.get("VIVIX_MODEL", "vivix-w1")

def face_frame(video, jpg, at="2.0"):
    subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-ss", at, "-i", video,
                           "-frames:v", "1", "-q:v", "2", jpg])
    return jpg

def scene(s, out_dir, ref_url=None):
    out = os.path.join(out_dir, s["id"] + ".mp4")
    if os.path.exists(out):
        return out
    prompt = (REF if ref_url else "") + HEROINE.format(outfit=s["outfit"]) + s["prompt"] + STYLE
    return vivix.generate(prompt, out, ref_images=[ref_url] if ref_url else None, model=MODEL)

if __name__ == "__main__":
    out_dir = sys.argv[1]
    wanted = set(sys.argv[2:]) or {s["id"] for s in SCENES}
    os.makedirs(out_dir, exist_ok=True)
    first = scene(SCENES[0], out_dir)
    ref_url = vivix.upload_image(face_frame(first, os.path.join(out_dir, "face.jpg")))
    with ThreadPoolExecutor(3) as pool:
        for f in [pool.submit(scene, s, out_dir, ref_url) for s in SCENES[1:] if s["id"] in wanted]:
            f.result()
