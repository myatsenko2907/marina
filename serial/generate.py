"""Генерує кліпи серій через Vivix W1: python3 generate.py OUT_DIR REF_URL [серії...]"""
import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

import vivix
from episodes import EPISODES, HEROINE, STYLE

def last_frame(video, jpg):
    subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-sseof", "-0.1", "-i", video,
                           "-frames:v", "1", "-q:v", "2", jpg])
    return jpg

def episode(ep, out_dir, ref_url):
    prev, outfit = None, None
    for i, clip in enumerate(ep["clips"]):
        out = os.path.join(out_dir, f"ep{ep['n']}_{i}.mp4")
        outfit = clip.get("outfit", outfit)
        if os.path.exists(out):
            prev = out
            continue
        if clip["mode"] == "ref":
            prompt = HEROINE.format(outfit=outfit) + clip["prompt"] + STYLE
            vivix.generate(prompt, out, ref_images=[ref_url])
        else:
            frame = vivix.upload_image(last_frame(prev, out[:-4] + "_start.jpg"))
            prompt = f"Maryna (wearing {outfit}) continues the scene. " + clip["prompt"] + STYLE
            vivix.generate(prompt, out, first_frame=frame)
        prev = out

if __name__ == "__main__":
    out_dir, ref_url = sys.argv[1], sys.argv[2]
    wanted = {int(n) for n in sys.argv[3:]} or {e["n"] for e in EPISODES}
    os.makedirs(out_dir, exist_ok=True)
    with ThreadPoolExecutor(4) as pool:
        for f in [pool.submit(episode, e, out_dir, ref_url) for e in EPISODES if e["n"] in wanted]:
            f.result()
