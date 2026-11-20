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
    r = subprocess.run(cmd, text=True, capture_output=True, **kw)
    if r.returncode:
        sys.stderr.write(r.stderr[-2000:])
        raise subprocess.CalledProcessError(r.returncode, cmd[:6])
    return r


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
    from multiprocessing import Pool
    with Pool(4) as pool:
        res = pool.map(analyse_loc, CFG["locations"])
    all_shots = {k: v for k, v in res if v}
    (WORK / "shots.json").write_text(json.dumps(all_shots, indent=1, ensure_ascii=False))
    pick(all_shots)


def analyse_loc(loc):
    cv2.setNumThreads(1)
    if True:
        d = SRC / loc["dir"]
        files = sorted(p for p in d.glob("**/*") if p.suffix.lower() in VIDEO_EXT) if d.exists() else []
        if not files:
            print(f"  [skip] {loc['dir']}: no footage")
            return loc["dir"], []
        shots = []
        for f in files:
            try:
                dur, w, h = probe(f)
            except Exception as e:
                print(f"  [bad] {f}: {e}")
                continue
            vertical = h > w
            rel = str(f.relative_to(SRC)).replace("/", "_")
            px = WORK / "proxy" / (rel + ".mp4")
            ana = px if px.exists() else f
            cuts = [0.0] + scene_cuts(ana) + [dur]
            cap = cv2.VideoCapture(str(ana))
            for a, b in zip(cuts, cuts[1:]):
                a, b = a + 0.25, b - 0.25          # avoid transition frames
                t = a
                while b - t >= 1.2:                # windows of up to 4 s inside a scene
                    e = min(t + 4.0, b)
                    fr = [frame_at(cap, t + (e - t) * k) for k in (0.15, 0.5, 0.85)]
                    fr = [x for x in fr if x is not None]
                    if len(fr) >= 2:
                        feats = [frame_features(x) for x in fr]
                        sc, info = score_shot(feats)
                        if vertical:
                            sc -= 1.5             # vertical phone footage needs heavy crop
                        shots.append(dict(file=str(f), proxy=str(ana), start=round(t, 2), end=round(e, 2),
                                          score=sc, vertical=vertical, src_w=w, src_h=h, **info))
                    t = e + 0.5
            cap.release()
            pass
        print(f"  {loc['dir']}: done, {len(shots)} shots", flush=True)
        return loc["dir"], sorted(shots, key=lambda s: -s["score"])


def pick(all_shots, per_loc=14):
    picks = {}
    for loc, shots in all_shots.items():
        chosen = []
        # keep a mix: at least one exterior if any exists
        ext = [s for s in shots if s["kind"] == "exterior" and s["score"] > -2]
        pool = (ext[:1] + shots) if ext else shots
        for s in pool:
            if s in chosen or s["score"] < -3:
                continue
            if any(c["file"] == s["file"] and abs(c["start"] - s["start"]) < 3 for c in chosen):
                continue
            chosen.append(s)
            if len(chosen) >= per_loc:
                break
        picks[loc] = chosen
    (WORK / "picks.json").write_text(json.dumps(picks, indent=1, ensure_ascii=False))
    print(f"picked shots -> {WORK/'picks.json'}")


# ---------- rendering ----------
BEAT = 0.5          # 120 BPM grid: every cut lands on a beat
GAP = 6             # gutter between triptych panels


def esc(t):
    return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def caption_filter(city, country, dur, x0=96, base=None, big=76, small=36):
    """Lower-left caption: accent bar + CITY (bold) + COUNTRY, eased slide/fade in and out."""
    if not (city or country):
        return None
    fi, fo, d0 = 0.45, 0.35, 0.15
    alpha = f"if(lt(t,{d0}),0,if(lt(t,{d0 + fi}),(t-{d0})/{fi},if(gt(t,{dur - fo}),max(0,({dur}-t)/{fo}),1)))"
    x = f"{x0 + 26}-50*pow(1-min(max(t-{d0},0)/{fi + 0.25},1),3)"
    main, sub = (city, country) if city else (country, "")
    yb = base if base is not None else "h-150"
    bar_h = big + (small + 18 if sub else 0)
    ybox = yb.replace("h-", "ih-") if isinstance(yb, str) else yb
    parts = [f"drawbox=x={x0}:y={ybox}-{bar_h}+8:w=5:h={bar_h - 4}:color=0x2EC5FF:t=fill:"
             f"enable='between(t,{d0 + 0.1},{dur - fo})'"]
    ymain = f"{yb}-{bar_h}" if sub else f"{yb}-{big}"
    parts.append(f"drawtext=fontfile={FONT_BOLD}:text='{esc(main)}':fontsize={big}:fontcolor=white:"
                 f"x='{x}':y={ymain}:alpha='{alpha}':shadowcolor=black@0.55:shadowx=0:shadowy=3")
    if sub:
        parts.append(f"drawtext=fontfile={FONT_MED}:text='{esc(sub)}':fontsize={small}:fontcolor=white@0.92:"
                     f"x='{x}+2':y={yb}-{small}+2:alpha='{alpha}':shadowcolor=black@0.55:shadowx=0:shadowy=2")
    return ",".join(parts)


def center_title(lines, dur, t_in=0.0, t_out=None, big=120, small=48):
    t_out = dur if t_out is None else t_out
    fi, fo = 0.8, 0.6
    alpha = f"if(lt(t,{t_in}),0,if(lt(t,{t_in + fi}),(t-{t_in})/{fi},if(gt(t,{t_out - fo}),max(0,({t_out}-t)/{fo}),1)))"
    out = []
    for i, ln in enumerate(lines):
        size = big if i == 0 else small
        font = FONT_BOLD if i == 0 else FONT_MED
        y = f"(h/2)-{big}" if i == 0 else f"(h/2)+{int(big * 0.25)}"
        spacing = "" if i == 0 else ""
        out.append(f"drawtext=fontfile={font}:text='{esc(ln)}':fontsize={size}:fontcolor=white:{spacing}"
                   f"x=(w-text_w)/2:y={y}:alpha='{alpha}':shadowcolor=black@0.6:shadowx=0:shadowy=4")
    return ",".join(out)


GRADE = ("normalize=smoothing=45:independence=0.4:strength=0.55,"
         "eq=contrast=1.06:saturation=1.12:gamma=0.98,"
         "colorbalance=rs=-0.02:bs=0.03:rh=0.02:bh=-0.02,unsharp=5:5:0.4")


def move_chain(dur, w, h, move):
    """Slow push-in / pull-out / lateral drift, computed on a 2x canvas so motion is sub-pixel smooth."""
    frames = max(int(round(dur * FPS)), 1)
    z0, z1, dx = {"in": (1.0, 1.07, 0), "out": (1.07, 1.0, 0), "left": (1.07, 1.07, -1),
                  "right": (1.07, 1.07, 1), "still": (1.02, 1.02, 0)}[move]
    zexpr = f"{z0}+({z1 - z0})*on/{frames}"
    xexpr = (f"(iw-iw/zoom)/2+{dx}*(iw-iw/zoom)/2*(2*on/{frames}-1)" if dx else "(iw-iw/zoom)/2")
    return [f"scale={w * 2}:{h * 2}:flags=lanczos",
            f"zoompan=z='{zexpr}':d=1:x='{xexpr}':y='(ih-ih/zoom)/2':s={w}x{h}:fps={FPS}", GRADE]


def render_shot(shot, dur, out, w=W, h=H, move="in", extra=None):
    try:
        _render_shot(shot, dur, out, w, h, move, extra)
    except subprocess.CalledProcessError:
        if shot.get("nostab"):
            raise
        print("    (stabiliser failed, rendering without it)", flush=True)
        _render_shot(dict(shot, nostab=True), dur, out, w, h, move, extra)


def _render_shot(shot, dur, out, w=W, h=H, move="in", extra=None):
    src_len = shot["end"] - shot["start"]
    speed = 1.0
    if shot.get("speed"):
        speed = shot["speed"]
    elif src_len > dur * 1.4:
        speed = min(src_len / dur, 1.25)          # gentle energy; more would exaggerate hand-held shake
    ss = shot["start"] + max(0, (src_len - dur * speed) / 2) + shot.get("offset", 0)
    cy = shot.get("cy", 0.5)
    fill = [f"scale={w}:{h}:force_original_aspect_ratio=increase:flags=lanczos", f"crop={w}:{h}:(iw-{w})/2:(ih-{h})*{cy}"]
    if shot.get("crop"):   # [x, y, w, h] as fractions: cut away burned subtitles / logos
        cx, cyy, cw, ch = shot["crop"]
        fill = [f"crop=iw*{cw}:ih*{ch}:iw*{cx}:ih*{cyy}"] + fill
    if shot.get("frost"):   # hide burned-in city plates of the old tour video (1280x720) under a frosted panel
        fill = ["split[fm][fc];[fc]crop=680:270:0:450,boxblur=60:5,eq=saturation=0.15:brightness=-0.30[fb];[fm][fb]overlay=0:450"] + fill
    if speed < 0.85:   # real slow motion: motion-compensated in-between frames instead of duplicates
        pre = [f"setpts=PTS/{speed:.3f}"] + fill + \
            [f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"]
    else:
        pre = ([f"setpts=PTS/{speed:.3f}"] if speed != 1.0 else []) + [f"fps={FPS}"] + fill
    inp = ["-ss", f"{ss:.3f}", "-t", f"{dur * speed + 0.6:.2f}", "-i", shot["file"], "-an"]
    vf = list(pre)
    if not shot.get("nostab"):
        trf = str(out) + ".trf"
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"] + inp +
            ["-vf", ",".join(pre + [f"vidstabdetect=shakiness=9:accuracy=15:stepsize=6:result={trf}"]), "-f", "null", "-"])
        vf.append(f"vidstabtransform=input={trf}:smoothing=40:optzoom=1:zoomspeed=0.15:interpol=bicubic")
    vf += move_chain(dur, w, h, move)
    if extra:
        vf.append(extra)
    vf.append(f"trim=duration={dur},setpts=PTS-STARTPTS,format=yuv420p")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"] + inp + ["-vf", ",".join(vf), "-r", str(FPS),
         "-c:v", "libx264", "-preset", "slow", "-crf", "14", str(out)])


def render_triptych(items, dur, out, tmp, panel_caps=True):
    """Three vertical shots side by side, each with its own small caption; panels reveal left-to-right."""
    pw = (W - 2 * GAP) // 3
    parts = []
    moves = ["in", "out", "in"]
    for i, (shot, loc) in enumerate(items):
        p = tmp.with_name(tmp.stem + f"_p{i}.mp4")
        cap = caption_filter(loc.get("city"), loc.get("country"), dur, x0=34, base="h-70", big=44, small=24) \
            if (panel_caps and loc.get("caption", True)) else None
        render_shot(shot, dur, p, pw, H, moves[i], cap)
        parts.append(p)
    ins = sum((["-i", str(p)] for p in parts), [])
    fc = (f"color=c=0x05070C:s={W}x{H}:r={FPS}:d={dur}[bg];"
          f"[bg][0:v]overlay=x=0:y=0[a];[a][1:v]overlay=x={pw + GAP}:y=0:enable='gte(t,0.12)'[b];"
          f"[b][2:v]overlay=x={2 * (pw + GAP)}:y=0:enable='gte(t,0.24)',format=yuv420p")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"] + ins + ["-filter_complex", fc, "-t", str(dur),
         "-c:v", "libx264", "-preset", "slow", "-crf", "14", str(out)])


def render_wall(seg, out, tmp):
    from concurrent.futures import ThreadPoolExecutor
    dur, cols, rows = seg["dur"], 10, 10
    TW, TH, G = 380, 212, 4                 # tiles on a 3840x2160 canvas (2x, for a smooth pull-back)
    tiles = seg["tiles"][:cols * rows]
    def one(args):
        j, (f, st, crop) = args
        o = tmp.with_name(tmp.stem + f"_w{j:03d}.mp4")
        if o.exists() and o.stat().st_size > 1000:
            return o
        src = str(ROOT / f)
        try:
            ln = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src]).stdout)
        except Exception:
            ln = dur
        avail = max(ln - st - 0.1, 0.5)
        sp = min(1.0, avail / dur)
        vf = ([f"crop=iw*{crop[2]}:ih*{crop[3]}:iw*{crop[0]}:ih*{crop[1]}"] if crop else []) + \
            [f"setpts=PTS/{sp:.3f}", f"fps={FPS}", f"scale={TW}:{TH}:force_original_aspect_ratio=increase", f"crop={TW}:{TH}",
             "eq=contrast=1.06:saturation=1.15", f"trim=duration={dur}", "setpts=PTS-STARTPTS", "format=yuv420p"]
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{st:.2f}", "-t", f"{dur * sp + 0.5:.2f}", "-i", src,
             "-an", "-vf", ",".join(vf), "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18", str(o)])
        return o
    with ThreadPoolExecutor(4) as ex:
        parts = list(ex.map(one, enumerate(tiles)))
    ox, oy = (3840 - (cols * TW + (cols - 1) * G)) // 2, (2160 - (rows * TH + (rows - 1) * G)) // 2
    layout = "|".join(f"{ox + (j % cols) * (TW + G)}_{oy + (j // cols) * (TH + G)}" for j in range(len(parts)))
    ins = sum((["-i", str(x)] for x in parts), [])
    grid = tmp.with_name(tmp.stem + "_grid.mp4")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"] + ins + ["-filter_complex",
         "".join(f"[{j}:v]" for j in range(len(parts))) + f"xstack=inputs={len(parts)}:layout={layout}:fill=0x05070C,"
         f"pad=3840:2160:(ow-iw)/2:(oh-ih)/2:color=0x05070C,format=yuv420p", "-t", str(dur),
         "-c:v", "libx264", "-preset", "fast", "-crf", "16", str(grid)])
    # pull-back: start on the hero window (index seg['hero']) and ease out to the full wall in `pull` seconds
    hero, pull, z0 = seg.get("hero", 44), seg.get("pull", 4.5), seg.get("z0", 5.0)
    hx = ox + (hero % cols) * (TW + G) + TW / 2
    hy = oy + (hero // cols) * (TH + G) + TH / 2
    fr = int(pull * FPS)
    e = f"(1-pow(1-min(on/{fr},1),3))"                     # ease-out cubic
    z = f"{z0}-({z0}-1)*{e}"
    x = f"max(0,min(iw-iw/zoom,({hx})*(1-{e})+(iw/2)*{e}-iw/zoom/2))"
    y = f"max(0,min(ih-ih/zoom,({hy})*(1-{e})+(ih/2)*{e}-ih/zoom/2))"
    t_in = seg.get("t_in", pull + 0.3)
    vf = (f"zoompan=z='{z}':x='{x}':y='{y}':d=1:s={W}x{H}:fps={FPS},"
          f"drawbox=x=0:y=0:w=iw:h=ih:color=black@{seg.get('dim', 0.5)}:t=fill:enable='gte(t,{t_in - 0.4})',"
          + center_title(seg["lines"], dur, t_in, dur - 0.4, 130, 52) + f",fade=out:st={dur - 1.6}:d=1.6,format=yuv420p")
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(grid), "-vf", vf, "-t", str(dur),
         "-c:v", "libx264", "-preset", "slow", "-crf", "14", str(out)])


def overlay_text(src, vf, out):
    run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(src), "-vf", vf + ",format=yuv420p",
         "-c:v", "libx264", "-preset", "slow", "-crf", "14", str(out)])


def get_shot(shots, ref):
    """ref = 'loc:index' into shots.json, or {"ref": "loc:i", "start":.., "end":.., "speed":..}
    or {"loc": .., "file": "sources/..", "start":.., "end":..} for hand-picked moments."""
    if isinstance(ref, str):
        loc, i = ref.split(":")
        return dict(shots[loc][int(i)])
    if "ref" in ref:
        s = get_shot(shots, ref["ref"])
    else:
        s = {"file": str(ROOT / ref["file"])}
    s.update({k: v for k, v in ref.items() if k in ("start", "end", "speed", "offset", "nostab", "frost", "cy", "crop")})
    return s


def ref_loc(ref):
    return (ref if isinstance(ref, str) else ref.get("ref", ref.get("loc", ""))).split(":")[0]


def render(length=120.0):
    picks = json.loads((WORK / "shots.json").read_text())
    edl = json.loads((ROOT / "edl.json").read_text())
    L = {l["dir"]: l for l in CFG["locations"]}
    tmp = WORK / "clips"
    tmp.mkdir(parents=True, exist_ok=True)
    clips = []
    def seg_job(args):
        n, seg = args
        import hashlib
        key = hashlib.md5(json.dumps(seg, sort_keys=True).encode()).hexdigest()[:10]
        out = tmp / f"seg_{key}.mp4"
        kind = seg["type"]
        if out.exists() and out.stat().st_size > 10000 and not os.environ.get("REBUILD"):
            print(f"  segment {n} cached", flush=True); return out
        if kind == "group":            # several shots of one location under one caption
            loc = L[seg["loc"]]
            raws = []
            for j, (ref, d, mv) in enumerate(seg["shots"]):
                r = tmp / f"s{n:03d}_{j}.mp4"
                render_shot(get_shot(picks, ref), d, r, move=mv)
                raws.append(r)
            raw = tmp / f"s{n:03d}_raw.mp4"
            concat(raws, raw)
            tot = sum(d for _, d, _ in seg["shots"])
            vf = caption_filter(loc["city"], loc["country"], tot) if loc.get("caption", True) else None
            vf = ",".join(x for x in [vf, seg.get("vf")] if x)
            overlay_text(raw, vf, out) if vf else raw.rename(out)
        elif kind == "tri":
            items = [(get_shot(picks, r), L[ref_loc(r)]) for r in seg["shots"]]
            single = seg.get("caption") == "single"
            render_triptych(items, seg["dur"], out, tmp / f"s{n:03d}", panel_caps=not single)
            if single:
                loc = items[0][1]
                fixed = tmp / f"s{n:03d}_cap.mp4"
                overlay_text(out, caption_filter(loc["city"], loc["country"], seg["dur"]), fixed)
                fixed.replace(out)
        elif kind == "grid":            # 2x2: four countries at once
            gw, gh = (W - 8) // 2, (H - 8) // 2
            parts = []
            for j, ref in enumerate(seg["shots"]):
                loc = L[ref_loc(ref)]
                cap = caption_filter(loc["city"], loc["country"], seg["dur"], x0=40, base="h-46", big=46, small=24) \
                    if loc.get("caption", True) else None
                r = tmp / f"s{n:03d}_{j}.mp4"
                render_shot(get_shot(picks, ref), seg["dur"], r, gw, gh, ["in", "out", "out", "in"][j], cap)
                parts.append(r)
            ins = sum((["-i", str(x)] for x in parts), [])
            fc = (f"color=c=0x05070C:s={W}x{H}:r={FPS}:d={seg['dur']}[bg];[bg][0:v]overlay=0:0[a];"
                  f"[a][1:v]overlay={gw + 8}:0:enable='gte(t,0.1)'[b];[b][2:v]overlay=0:{gh + 8}:enable='gte(t,0.2)'[c];"
                  f"[c][3:v]overlay={gw + 8}:{gh + 8}:enable='gte(t,0.3)',format=yuv420p")
            run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"] + ins + ["-filter_complex", fc, "-t", str(seg["dur"]),
                 "-c:v", "libx264", "-preset", "slow", "-crf", "14", str(out)])
        elif kind == "wall":            # 10x10 wall of live campus windows; camera pulls back from one window to all 100
            render_wall(seg, out, tmp / f"s{n:03d}")
        elif kind == "mosaic":          # 3x3 wall of campuses under the closing title
            tw, th = (W - 12) // 3, (H - 12) // 3
            tw -= tw % 2; th -= th % 2
            parts = []
            for j, ref in enumerate(seg["shots"]):
                r = tmp / f"s{n:03d}_{j}.mp4"
                render_shot(get_shot(picks, ref), seg["dur"], r, tw, th, ["in", "out"][j % 2])
                parts.append(r)
            ins = sum((["-i", str(x)] for x in parts), [])
            fc = f"color=c=0x05070C:s={W}x{H}:r={FPS}:d={seg['dur']}[b0];"
            order = [4, 1, 3, 5, 7, 0, 2, 6, 8]   # tiles appear from the centre outwards
            for k, j in enumerate(order):
                x, y = (j % 3) * (tw + 6), (j // 3) * (th + 6)
                fc += f"[b{k}][{j}:v]overlay={x}:{y}:enable='gte(t,{0.12 * k:.2f})'[b{k + 1}];"
            dur = seg["dur"]
            fc += (f"[b9]drawbox=x=0:y=0:w=iw:h=ih:color=black@{seg.get('dim', 0.45)}:t=fill:enable='gte(t,{seg.get('t_in', 2.0) - 0.6})',"
                   + center_title(seg["lines"], dur, seg.get("t_in", 2.0), dur - 0.4, 130, 52)
                   + f",fade=out:st={dur - 1.6}:d=1.6,format=yuv420p")
            run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"] + ins + ["-filter_complex", fc, "-t", str(dur),
                 "-c:v", "libx264", "-preset", "slow", "-crf", "14", str(out)])
        elif kind == "montage":         # fast cuts, small corner label per shot
            raws = []
            for j, (ref, d) in enumerate(seg["shots"]):
                loc = L[ref_loc(ref)]
                lab = (loc["city"] + "  ·  " if loc["city"] else "") + loc["country"]
                extra = (f"drawtext=fontfile={FONT_MED}:text='{esc(lab)}':fontsize=30:fontcolor=white@0.9:"
                         f"x=96:y=h-104:shadowcolor=black@0.6:shadowy=2") if loc.get("caption", True) and lab.strip() else None
                r = tmp / f"s{n:03d}_{j}.mp4"
                render_shot(get_shot(picks, ref), d, r, move=random.choice(["in", "out", "left", "right"]), extra=extra)
                raws.append(r)
            concat(raws, out)
        elif kind == "title":           # shots with a centred title over them
            raws = []
            for j, (ref, d, mv) in enumerate(seg["shots"]):
                r = tmp / f"s{n:03d}_{j}.mp4"
                render_shot(get_shot(picks, ref), d, r, move=mv)
                raws.append(r)
            raw = tmp / f"s{n:03d}_raw.mp4"
            concat(raws, raw)
            tot = sum(d for _, d, _ in seg["shots"])
            vf = [f"drawbox=x=0:y=0:w=iw:h=ih:color=black@{seg.get('dim', 0.35)}:t=fill",
                  center_title(seg["lines"], tot, seg.get("t_in", 1.0), seg.get("t_out", tot - 0.3),
                               seg.get("big", 120), seg.get("small", 46))]
            if seg.get("fade_in"):
                vf.append(f"fade=in:st=0:d={seg['fade_in']}")
            if seg.get("fade_out"):
                vf.append(f"fade=out:st={tot - seg['fade_out']}:d={seg['fade_out']}")
            overlay_text(raw, ",".join(vf), out)
        print(f"  segment {n} ({kind}) ok", flush=True)
        return out

    from concurrent.futures import ThreadPoolExecutor
    segs = list(enumerate(edl["segments"]))
    # heaviest first so the pool stays busy
    order = sorted(segs, key=lambda x: -(10 if x[1]["type"] == "wall" else len(x[1].get("shots", []))))
    with ThreadPoolExecutor(int(os.environ.get("JOBS", 4))) as ex:
        res = dict(zip([n for n, _ in order], ex.map(seg_job, order)))
    clips = [res[n] for n, _ in segs]

    OUT.mkdir(exist_ok=True)
    silent = WORK / "silent.mp4"
    concat(clips, silent)
    dur = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                     str(silent)]).stdout)
    final = OUT / "STEP_IT_Academy_global_promo_1080p.mp4"
    music = ROOT / "music.mp3"
    if music.exists():
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(silent), "-i", str(music),
             "-filter_complex", f"[1:a]atrim=0:{dur},afade=in:st=0:d=0.5,afade=out:st={dur - 2.5}:d=2.5,"
             "loudnorm=I=-14:TP=-1.0:LRA=11[a]", "-map", "0:v", "-map", "[a]", "-c:v", "copy",
             "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-t", str(dur), "-movflags", "+faststart", str(final)])
    else:
        run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(silent), "-c", "copy",
             "-movflags", "+faststart", str(final)])
    print(f"done -> {final} ({dur:.1f}s)")


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
