#!/usr/bin/env python3
"""
Build a ~2 minute "scale" promo for STEP IT Academy from branch video tours.

Layout expected:
  promo-video/sources/<dir>/*.mp4|mov|mkv   (one folder per location, see locations.json)
  promo-video/music.mp3                    (optional soundtrack, trimmed/faded to length)

Steps:
  1. analyse  - cut every source into shots (scene detection), score each shot:
                + sharpness, good exposure, colour, smooth camera motion,
                + "exterior" (sky in the top of frame), wide/architectural lines,
                - people (faces + bodies)  -> strongly penalised
  2. pick     - best shots per location, spread over the source, no near-duplicates
  3. render   - 1920x1080 / 30 fps, unified grade, English caption "CITY · COUNTRY",
                intro + scale montage + stats + end card, music with fades.

Usage:
  python3 build_promo.py analyse
  python3 build_promo.py render [--length 120]
  python3 build_promo.py all
Shot choice can be hand-edited in work/picks.json between analyse and render.
"""
import json, os, re, subprocess, sys, math, random, argparse
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "sources"
WORK = ROOT / "work"
OUT = ROOT / "out"
CFG = json.loads((ROOT / "locations.json").read_text())
FONT_BOLD = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
FONT_LIGHT = "/usr/share/fonts/opentype/inter/Inter-Thin.otf"
FONT_MED = "/usr/share/fonts/opentype/inter/InterDisplay-Medium.otf"
W, H, FPS = 1920, 1080, 30
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".m4v", ".avi", ".webm", ".mts"}

random.seed(7)


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, text=True, capture_output=True, **kw)


def probe(path):
    r = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
             "stream=width,height:stream_side_data=rotation:format=duration", "-of", "json", str(path)])
    j = json.loads(r.stdout)
    s = j["streams"][0]
    rot = 0
    for sd in s.get("side_data_list", []) or []:
        rot = int(sd.get("rotation", 0) or 0)
    w, h = s["width"], s["height"]
    if abs(rot) in (90, 270):
        w, h = h, w
    return float(j["format"]["duration"]), w, h


def scene_cuts(path, thr=0.28):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-an", "-vf",
                        f"scale=320:-2,select='gt(scene,{thr})',showinfo", "-f", "null", "-"],
                       text=True, capture_output=True)
    return [float(m) for m in re.findall(r"pts_time:([\d.]+)", r.stderr)]


# ---------- shot scoring ----------
_face = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
_profile = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")
_hog = cv2.HOGDescriptor()
_hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())


def frame_at(cap, t):
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ok, f = cap.read()
    if not ok:
        return None
    h, w = f.shape[:2]
    s = 640 / max(w, h)
    return cv2.resize(f, (int(w * s), int(h * s)))


def frame_features(f):
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
    h, w = g.shape
    sharp = cv2.Laplacian(g, cv2.CV_64F).var()
    bright = g.mean()
    sat = hsv[..., 1].mean()
    faces = len(_face.detectMultiScale(g, 1.15, 5, minSize=(24, 24))) + \
        len(_profile.detectMultiScale(g, 1.15, 6, minSize=(28, 28)))
    rects, weights = _hog.detectMultiScale(g, winStride=(8, 8), padding=(8, 8), scale=1.06)
    bodies = int(sum(1 for wgt in np.ravel(weights) if wgt > 0.6)) if len(rects) else 0
    big_body = any(rh > 0.45 * h for (_, _, _, rh) in rects) if len(rects) else False
    # sky: top third, bright-ish, low texture, blue-ish or near white
    top = hsv[: h // 3]
    texture = cv2.Laplacian(g[: h // 3], cv2.CV_64F)
    smooth = (np.abs(texture) < 6)
    blue = (top[..., 0] > 90) & (top[..., 0] < 130) & (top[..., 1] > 40) & (top[..., 2] > 120)
    pale = (top[..., 1] < 35) & (top[..., 2] > 185)
    sky = float(((blue | pale) & smooth).mean())
    # architecture: long straight lines (facades, corridors, ceilings)
    edges = cv2.Canny(g, 80, 200)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 80, minLineLength=w // 6, maxLineGap=8)
    nlines = 0 if lines is None else len(lines)
    return dict(sharp=sharp, bright=bright, sat=sat, faces=faces, bodies=bodies,
                big_body=big_body, sky=sky, lines=nlines, gray=g)


def score_shot(fs):
    sharp = np.median([f["sharp"] for f in fs])
    bright = np.mean([f["bright"] for f in fs])
    sat = np.mean([f["sat"] for f in fs])
    people = max(f["faces"] for f in fs) + 0.7 * max(f["bodies"] for f in fs)
    big = any(f["big_body"] for f in fs)
    sky = np.mean([f["sky"] for f in fs])
    lines = np.mean([f["lines"] for f in fs])
    diffs = [np.abs(fs[i]["gray"].astype(np.int16) - fs[i + 1]["gray"]).mean() for i in range(len(fs) - 1)]
    motion = float(np.mean(diffs)) if diffs else 0
    s = 0.0
    s += min(math.log1p(sharp) / math.log1p(400), 1.4) * 2.0          # focus
    s -= abs(bright - 125) / 60                                         # exposure
    s += min(sat, 110) / 110 * 0.6                                     # colour
    s += min(sky, 0.5) * 6.0                                           # exterior / facade
    s += min(lines, 60) / 60 * 1.6                                     # architecture
    s += 0.8 if 4 < motion < 28 else (-0.6 if motion >= 40 else 0)     # smooth move vs. whip/static
    s -= people * 1.1 + (2.5 if big else 0)                            # fewer people!
    kind = "exterior" if sky > 0.12 else "interior"
    return round(float(s), 3), dict(sharp=round(float(sharp)), bright=round(float(bright)),
                                    people=round(float(people), 1), big_person=bool(big), sky=round(float(sky), 3),
                                    lines=round(float(lines)), motion=round(motion, 1), kind=kind)


def analyse():
    WORK.mkdir(exist_ok=True)
    all_shots = {}
    for loc in CFG["locations"]:
        d = SRC / loc["dir"]
        files = sorted(p for p in d.glob("**/*") if p.suffix.lower() in VIDEO_EXT) if d.exists() else []
        if not files:
            print(f"  [skip] {loc['dir']}: no footage")
            continue
        shots = []
        for f in files:
            try:
                dur, w, h = probe(f)
            except Exception as e:
                print(f"  [bad] {f}: {e}")
                continue
            vertical = h > w
            cuts = [0.0] + scene_cuts(f) + [dur]
            cap = cv2.VideoCapture(str(f))
            for a, b in zip(cuts, cuts[1:]):
                a, b = a + 0.25, b - 0.25          # avoid transition frames
                t = a
                while b - t >= 2.0:                # windows of up to 4 s inside a scene
                    e = min(t + 4.0, b)
                    fr = [frame_at(cap, t + (e - t) * k) for k in (0.15, 0.5, 0.85)]
                    fr = [x for x in fr if x is not None]
                    if len(fr) >= 2:
                        feats = [frame_features(x) for x in fr]
                        sc, info = score_shot(feats)
                        if vertical:
                            sc -= 1.5             # vertical phone footage needs heavy crop
                        shots.append(dict(file=str(f), start=round(t, 2), end=round(e, 2),
                                          score=sc, vertical=vertical, **info))
                    t = e + 0.5
            cap.release()
            print(f"  {loc['dir']}: {f.name} -> {len(shots)} candidate shots so far")
        all_shots[loc["dir"]] = sorted(shots, key=lambda s: -s["score"])
    (WORK / "shots.json").write_text(json.dumps(all_shots, indent=1, ensure_ascii=False))
    pick(all_shots)


def pick(all_shots, per_loc=4):
    picks = {}
    for loc, shots in all_shots.items():
        chosen = []
        # keep a mix: at least one exterior if any exists
        ext = [s for s in shots if s["kind"] == "exterior" and s["score"] > -2]
        pool = (ext[:1] + shots) if ext else shots
        for s in pool:
            if s in chosen or s["score"] < -3:
                continue
            if any(c["file"] == s["file"] and abs(c["start"] - s["start"]) < 8 for c in chosen):
                continue
            chosen.append(s)
            if len(chosen) >= per_loc:
                break
        picks[loc] = chosen
    (WORK / "picks.json").write_text(json.dumps(picks, indent=1, ensure_ascii=False))
    print(f"picked shots -> {WORK/'picks.json'}")


# ---------- rendering ----------
def esc(t):
    return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def caption_filter(city, country, dur):
    """Lower-left caption: accent bar + CITY (bold) + COUNTRY (light), slides/fades in & out."""
    fi, fo = 0.35, 0.3
    alpha = f"if(lt(t,{fi}),t/{fi},if(gt(t,{dur - fo}),({dur}-t)/{fo},1))"
    x = f"110-40*pow(1-min(t/{fi + 0.2},1),3)"
    parts = [f"drawbox=x=80:y=ih-210:w=6:h=110:color=0x00C2FF@1:t=fill:enable='gte(t,0.1)'"]
    main, sub = (city, country) if city else (country, "")
    parts.append(f"drawtext=fontfile={FONT_BOLD}:text='{esc(main)}':fontsize=78:fontcolor=white:"
                 f"x={x}:y=h-218:alpha='{alpha}':shadowcolor=black@0.45:shadowx=0:shadowy=3")
    if sub:
        parts.append(f"drawtext=fontfile={FONT_MED}:text='{esc(sub)}':fontsize=40:fontcolor=white@0.9:"
                     f"x={x}+3:y=h-132:alpha='{alpha}':shadowcolor=black@0.45:shadowx=0:shadowy=2")
    return ",".join(parts)


def center_title(lines, dur, big=110, small=54):
    fi = 0.5
    alpha = f"if(lt(t,{fi}),t/{fi},if(gt(t,{dur - 0.4}),({dur}-t)/0.4,1))"
    out = []
    for i, ln in enumerate(lines):
        size = big if i == 0 else small
        y = f"(h/2)-{size}+{i * (big + 22)}" if len(lines) > 1 else "(h-text_h)/2"
        font = FONT_BOLD if i == 0 else FONT_MED
        out.append(f"drawtext=fontfile={font}:text='{esc(ln)}':fontsize={size}:fontcolor=white:"
                   f"x=(w-text_w)/2:y={y}-60:alpha='{alpha}':shadowcolor=black@0.5:shadowx=0:shadowy=4")
    return ",".join(out)


def base_chain(shot, dur, zoom=True):
    """Crop/scale to 16:9, gentle push-in for a 'drone/gimbal' feel, unified grade."""
    vf = [f"scale={W}:{H}:force_original_aspect_ratio=increase", f"crop={W}:{H}", "setsar=1"]
    if zoom:
        frames = int(dur * FPS)
        z = random.choice([0.06, 0.08, -0.06])
        zexpr = f"1+{abs(z)}*on/{frames}" if z > 0 else f"{1 + abs(z)}-{abs(z)}*on/{frames}"
        vf.append(f"scale={int(W * 1.1)}:{int(H * 1.1)},zoompan=z='{zexpr}':d=1:x='iw/2-(iw/zoom/2)':"
                  f"y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS}")
    vf += [f"fps={FPS}", "eq=contrast=1.06:saturation=1.12:gamma=0.98",
           "colorbalance=rs=-0.03:bs=0.04:rh=0.03:bh=-0.02",  # teal shadows / warm highlights
           "vignette=PI/5"]
    return vf


def render_clip(shot, dur, extra_vf, out):
    src_len = shot["end"] - shot["start"]
    speed = max(src_len / dur, 1.0) if src_len > dur * 1.6 else 1.0
    ss = shot["start"] + max(0, (src_len - dur * speed) / 2)
    vf = base_chain(shot, dur)
    if speed > 1.0:
        vf.insert(0, f"setpts=PTS/{speed:.3f}")
    if extra_vf:
        vf.append(extra_vf)
    vf.append(f"trim=duration={dur},setpts=PTS-STARTPTS,format=yuv420p")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{ss:.2f}", "-t", f"{dur * speed + 0.5:.2f}",
         "-i", shot["file"], "-an", "-vf", ",".join(vf), "-r", str(FPS), "-c:v", "libx264", "-preset", "medium",
         "-crf", "18", str(out)])


def black_clip(dur, extra_vf, out):
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
         f"color=c=0x05070C:s={W}x{H}:r={FPS}:d={dur}", "-vf", (extra_vf + "," if extra_vf else "") + "format=yuv420p",
         "-c:v", "libx264", "-crf", "18", str(out)])


def render(length=120.0):
    picks = json.loads((WORK / "picks.json").read_text())
    locs = [l for l in CFG["locations"] if picks.get(l["dir"])]
    if not locs:
        sys.exit("no picked shots - run analyse first")
    countries = sorted({l["country"] for l in locs})
    cities = [l for l in locs if l["city"]]
    stats = CFG.get("stats") or [f"{len(countries)} COUNTRIES", f"{len(cities)} CITIES", "ONE ACADEMY"]

    # global ranking for intro/montage: best exteriors from everywhere
    flat = [(l, s) for l in locs for s in picks[l["dir"]]]
    ext = sorted([x for x in flat if x[1]["kind"] == "exterior"], key=lambda x: -x[1]["score"])
    best = sorted(flat, key=lambda x: -x[1]["score"])

    intro_len, montage_len, stats_len, outro_len = 8.0, 9.0, 6.0, 6.0
    body_len = length - intro_len - montage_len - stats_len - outro_len
    used = set()

    plan = []   # (shot|None, dur, extra_vf)
    # 1) INTRO: 4 fast exteriors, title over them
    intro_src = (ext or best)[:4]
    for i, (l, s) in enumerate(intro_src):
        d = intro_len / len(intro_src)
        used.add(id(s))
        plan.append((s, d, None))
    plan.append(("TITLE", 0, None))   # marker -> title overlaid on whole intro later

    # 2) BODY: per location, 2-3 shots, first one carries the caption
    per = body_len / len(locs)
    n_per = 3 if per >= 6 else 2
    for l in locs:
        shots = [s for s in picks[l["dir"]] if id(s) not in used][:n_per] or picks[l["dir"]][:1]
        d = per / len(shots)
        for j, s in enumerate(shots):
            used.add(id(s))
            cap = caption_filter(l["city"], l["country"], per) if j == 0 else None
            plan.append((s, d, ("CAP", l, per, j)))

    # 3) SCALE MONTAGE: rapid 0.75 s cuts of facades/halls from every location
    rest = [x for x in best if id(x[1]) not in used] + best
    n = int(montage_len / 0.75)
    for l, s in rest[:n]:
        plan.append((s, montage_len / n, ("MINI", l)))

    # 4) STATS on dark + 5) OUTRO on best exterior
    plan.append((None, stats_len, center_title(stats[:1] + [" · ".join(stats[1:])], stats_len, 130, 60)))
    plan.append(((ext or best)[0][1], outro_len, center_title(CFG["outro_title"], outro_len, 120, 56)))

    clips_dir = WORK / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)
    clips = []
    k = 0
    i = 0
    # intro clips rendered then concatenated with title on top
    intro_parts = []
    while plan[i][0] != "TITLE":
        s, d, _ = plan[i]
        p = clips_dir / f"intro_{i:02d}.mp4"
        render_clip(s, d, None, p)
        intro_parts.append(p)
        i += 1
    i += 1
    intro = clips_dir / "000_intro.mp4"
    concat(intro_parts, clips_dir / "intro_raw.mp4")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(clips_dir / "intro_raw.mp4"), "-vf",
         "fade=in:st=0:d=0.8," + center_title(CFG["intro_title"], intro_len, 120, 64),
         "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", str(intro)])
    clips.append(intro)

    # body: group shots of one location so the caption spans the cut
    group, gl = [], None
    def flush():
        nonlocal k
        if not group:
            return
        parts = []
        for s, d in group:
            p = clips_dir / f"b{k:03d}.mp4"; k += 1
            render_clip(s, d, None, p); parts.append(p)
        raw = clips_dir / f"g{k:03d}_raw.mp4"
        concat(parts, raw)
        out = clips_dir / f"g{k:03d}.mp4"
        tot = sum(d for _, d in group)
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(raw), "-vf",
             caption_filter(gl["city"], gl["country"], tot), "-c:v", "libx264", "-crf", "18",
             "-pix_fmt", "yuv420p", str(out)])
        clips.append(out)
        group.clear()

    for s, d, tag in plan[i:]:
        if isinstance(tag, tuple) and tag[0] == "CAP":
            l = tag[1]
            if gl is not l:
                flush(); gl = l
            group.append((s, d))
            continue
        flush(); gl = None
        p = clips_dir / f"z{k:03d}.mp4"; k += 1
        if isinstance(tag, tuple) and tag[0] == "MINI":
            l = tag[1]
            label = f"drawtext=fontfile={FONT_MED}:text='{esc((l['city'] + ' · ' if l['city'] else '') + l['country'])}':" \
                    f"fontsize=34:fontcolor=white@0.85:x=90:y=h-110:shadowcolor=black@0.5:shadowy=2"
            render_clip(s, d, label, p)
        elif s is None:
            black_clip(d, tag, p)
        else:
            render_clip(s, d, tag + f",fade=out:st={d - 1.0}:d=1.0", p)
        clips.append(p)
    flush()

    OUT.mkdir(exist_ok=True)
    silent = WORK / "silent.mp4"
    concat(clips, silent)
    final = OUT / "STEP_IT_Academy_global_promo.mp4"
    music = ROOT / "music.mp3"
    if music.exists():
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(silent), "-i", str(music),
             "-filter_complex", f"[1:a]atrim=0:{length},afade=in:st=0:d=1.5,afade=out:st={length - 3}:d=3,"
             "loudnorm=I=-14:TP=-1.5:LRA=11[a]", "-map", "0:v", "-map", "[a]", "-c:v", "copy",
             "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", str(final)])
    else:
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(silent), "-c", "copy",
             "-movflags", "+faststart", str(final)])
    print("done ->", final)


def concat(parts, out):
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in parts))
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
         "-c", "copy", str(out)])


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("step", choices=["analyse", "render", "all"])
    ap.add_argument("--length", type=float, default=120.0)
    a = ap.parse_args()
    if a.step in ("analyse", "all"):
        analyse()
    if a.step in ("render", "all"):
        render(a.length)
