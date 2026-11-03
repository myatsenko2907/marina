"""Мінімальний клієнт Vivix W1: submit job -> poll -> download mp4."""
import json, sys, time, urllib.error, urllib.request

API = "https://api.vivix.ai"

def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"})
    for attempt in range(30):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                res = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503):
                raise RuntimeError(f"{path}: {e.code} {e.read()[:300]}")
            print(path, e.code, e.read()[:200], flush=True)
            time.sleep(int(e.headers.get("Retry-After") or 20))
    if res.get("code") != 0:
        raise RuntimeError(f"{path}: {res}")
    return res["data"]

def generate(prompt, out, duration=10, ref_images=None, first_frame=None,
             model="vivix-w1-fast", seed=None):
    job = {"prompt": prompt, "duration": duration, "aspect_ratio": "9:16"}
    if ref_images:
        job["ref_images"] = [{"url": u} for u in ref_images]
    if first_frame:
        job["first_frame_image"] = first_frame
    body = {"model": model, "jobs": [job]}
    if seed is not None:
        body["seed"] = seed
    job_id = call("POST", "/v1/videos/jobs", body)["results"][0]["job_id"]
    print(out, job_id, flush=True)
    while True:
        time.sleep(8)
        d = call("GET", f"/v1/videos/jobs/{job_id}")
        if d["status"] == "succeeded":
            urllib.request.urlretrieve(d["video_url"], out)
            print(out, "done", flush=True)
            return out
        if d["status"] == "failed":
            raise RuntimeError(f"{out}: {d['error']}")

def upload_image(path):
    import subprocess
    res = json.loads(subprocess.check_output(["curl", "-sS", "-X", "POST",
        API + "/v1/files/images", "-F", f"file=@{path};type=image/jpeg"]))
    if res.get("code") != 0:
        raise RuntimeError(res)
    return res["data"]["url"]
