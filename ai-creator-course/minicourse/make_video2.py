"""Відеоуроки v2: слайди + живі демонстрації «студії» + ведуча (мальована або справжня з Vivix).

Запуск: python3 make_video2.py [lesson-1|lesson-2]
- Слайди і озвучка — як у make_video.py.
- Сегменти kind="demo" записуються з demo/studio.html (Playwright) і підганяються під довжину озвучки.
- Ведуча: якщо є media/vivix/<lesson>-avatar.mp4 (Vivix A1, говорить під наш звук) — вона;
  інакше мальована «Ліна» з рухом губ. На слайдах — справа внизу, під час демо — зліва над меню.
"""
import hashlib, json, os, pathlib, re, subprocess, sys
from PIL import Image, ImageDraw
import make_video as mv
from lessons import LESSONS

HERE = mv.HERE
WORK, OUT, FPS, W, H = mv.WORK, mv.OUT, mv.FPS, mv.W, mv.H
ASSETS = HERE / "demo" / "assets"


def enc(args):
    mv.run(["ffmpeg", "-y", *args])


def seg_still(png, d, out):
    enc(["-loop", "1", "-i", str(png), "-t", f"{d:.3f}", "-r", str(FPS), "-vf", "format=yuv420p",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-tune", "stillimage", str(out)])


def seg_demo(steps, d, out, key, page="studio.html"):
    sc = WORK / f"demo-{key}.json"
    sc.write_text(json.dumps({"page": page, "assetsBase": str(ASSETS), "steps": steps, "tail": 800}, ensure_ascii=False))
    raw = WORK / f"demo-{key}-raw.mp4"
    if not raw.exists():
        subprocess.run(["node", str(HERE / "demo" / "record_demo.cjs"), str(sc), str(raw)], check=True, stdout=subprocess.DEVNULL)
    D = mv.duration(raw)
    if D <= d:
        vf = f"tpad=stop_mode=clone:stop_duration={d - D + 0.1:.3f},trim=duration={d:.3f}"
    else:
        vf = f"setpts=PTS*{d / D:.5f},trim=duration={d:.3f}"
    enc(["-i", str(raw), "-vf", f"{vf},fps={FPS},format=yuv420p", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", str(out)])


def seg_anim(html, d, times, out, key):
    """Анімований слайд: пункти з'являються в такт озвучці."""
    hf = WORK / f"anim-{key}.html"; hf.write_text(html)
    if not out.exists():
        subprocess.run(["node", str(HERE / "demo" / "record_slide.cjs"), str(hf), f"{d:.3f}", json.dumps(times), str(out)], check=True, stdout=subprocess.DEVNULL)


def ring_png(w, h, bw, r, path):
    ring = Image.new("RGBA", (w + 2 * bw, h + 2 * bw))
    grad = Image.new("RGBA", ring.size)
    dr = ImageDraw.Draw(grad)
    for x in range(ring.size[0]):
        q = x / ring.size[0]
        c = (255, int(74 - 29 * min(1, q / .55)), int(28 + 92 * min(1, q / .55)), 255) if q < .55 else (255, int(45 + 131 * (q - .55) / .45), int(120 - 89 * (q - .55) / .45), 255)
        dr.line([(x, 0), (x, ring.size[1])], fill=c)
    m = Image.new("L", ring.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, ring.size[0] - 1, ring.size[1] - 1), r + bw, fill=255)
    ring.paste(grad, (0, 0), m); ring.save(path)


def mask_png(w, h, r, path):
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255); m.save(path)


def drawn_track(levels, avatar, out):
    """Відео 300×300 з мальованою ведучою, губи за гучністю звуку."""
    bg = (251, 250, 248)
    imgs = {}
    for k, p in avatar.items():
        im = Image.new("RGB", (300, 300), bg); av = Image.open(p).convert("RGBA"); im.paste(av, (0, 0), av)
        q = WORK / f"track-{k[0]}{k[1]}.jpg"; im.save(q, quality=92); imgs[k] = q
    entries, prev = [], 0
    for fi, lv in enumerate(levels):
        m = 0 if lv < 0.12 else 3 if lv < 0.3 else 1 if lv < 0.6 else 2
        if m and prev == 0 and lv < 0.2: m = 0
        prev = m
        entries.append(imgs[(m, "c" if (fi % 100) in (0, 1, 2) else "o")])
    lines, i = [], 0
    while i < len(entries):
        j = i
        while j + 1 < len(entries) and entries[j + 1] == entries[i]: j += 1
        lines.append(f"file '{entries[i]}'\nduration {(j - i + 1) / FPS:.3f}\n"); i = j + 1
    lines.append(f"file '{entries[-1]}'\n")
    lst = WORK / "track.txt"; lst.write_text("".join(lines))
    enc(["-f", "concat", "-safe", "0", "-i", str(lst), "-vf", f"fps={FPS},format=yuv420p", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", str(out)])


def make(lesson, avatar):
    lid = lesson["id"]
    avatar_mp4 = HERE / "media" / "vivix" / f"{lid}-avatar.mp4"
    real = avatar_mp4.exists() and not os.environ.get("NO_AVATAR")
    use_eleven = mv.eleven_ok()
    print(lid, "голос:", "ElevenLabs" if use_eleven else mv.VOICE, "| ведуча:", "Vivix A1" if real else "мальована")
    slides = lesson["slides"]
    segs, cues, spans, starts, t = [], [], [], [], 0.0
    for i, s in enumerate(slides):
        h = hashlib.md5((s["narration"] + ("E" if use_eleven else "M")).encode()).hexdigest()[:10]
        mp3 = WORK / f"tts-{h}.mp3"
        if not mp3.exists() or mp3.stat().st_size == 0:
            mv.tts(s["narration"], mp3, use_eleven)
        wav = WORK / f"tts-{h}.wav"
        enc(["-i", str(mp3), "-af", "apad=pad_dur=0.5", "-ar", "24000", "-ac", "1", str(wav)])
        d = mv.duration(wav)
        sent = [x.strip() for x in re.split(r"(?<=[.!?])\s+", s["narration"]) if x.strip()]
        tot = sum(len(x) for x in sent); st = t
        for x in sent:
            dd = (d - 0.5) * len(x) / tot; cues.append((st, st + dd, x)); st += dd
        starts.append([round(c[0] - t, 2) for c in cues[len(cues) - len(sent):]]); segs.append((wav, d)); spans.append((s["kind"] in ("demo", "howto"), t, t + d)); t += d
    # аудіо
    lst = WORK / f"{lid}-a.txt"; lst.write_text("".join(f"file '{w}'\n" for w, _ in segs))
    full = WORK / f"{lid}-full2.wav"
    enc(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(full)])
    # базове відео
    parts = []
    for i, s in enumerate(slides):
        d = segs[i][1]
        if s["kind"] in ("demo", "howto"):
            key = f"{lid}-{i:02d}-{hashlib.md5((json.dumps(s['steps']) + s['kind']).encode()).hexdigest()[:8]}"
            out = WORK / f"part-{key}-{d:.2f}.mp4"
            if not out.exists():
                seg_demo(s["steps"], d, out, key, "howto.html" if s["kind"] == "howto" else "studio.html")
        else:
            html = mv.slide_html(s, lesson, True)
            key = hashlib.md5((html + f"{d:.2f}" + json.dumps(starts[i])).encode()).hexdigest()[:12]
            out = WORK / f"anim-{key}.mp4"
            seg_anim(html, d, starts[i], out, key)
        parts.append(out)
    pl = WORK / f"{lid}-parts.txt"; pl.write_text("".join(f"file '{p}'\n" for p in parts))
    base = WORK / f"{lid}-base.mp4"
    enc(["-f", "concat", "-safe", "0", "-i", str(pl), "-c", "copy", str(base)])
    mp4 = OUT / f"{lid}.mp4"
    others_real = any((HERE / "media" / "vivix" / f"{l['id']}-avatar.mp4").exists() for l in LESSONS if l["id"] != lid)
    if os.environ.get("NO_AVATAR") or (not real and others_real):
        # у цьому уроці ще немає справжньої ведучої — не змішуємо з мальованою, лише слайди і демо
        print(lid, "ведуча: без аватара (чекаємо Vivix)")
        enc(["-i", str(base), "-i", str(full), "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "27",
             "-c:a", "aac", "-b:a", "96k", "-t", f"{t:.3f}", "-movflags", "+faststart", str(mp4)])
        enc(["-ss", "2", "-i", str(mp4), "-frames:v", "1", "-vf", "scale=960:-2", str(OUT / f"{lid}.jpg")])
        (OUT / f"{lid}.vtt").write_text("WEBVTT\n\n" + "".join(f"{mv.vtt_time(a)} --> {mv.vtt_time(b)}\n{x}\n\n" for a, b, x in cues))
        print(lid, f"{t / 60:.1f} хв", f"{mp4.stat().st_size / 1e6:.1f} МБ")
        return
    # доріжка ведучої
    if real:
        track, crop = avatar_mp4, "crop=660:896:6:40,"
        (s1w, s1h, r1), (s2w, s2h, r2) = (280, 380, 28), (180, 244, 22)
    else:
        track = WORK / f"{lid}-track.mp4"; drawn_track(mv.rms_frames(full), avatar, track); crop = ""
        (s1w, s1h, r1), (s2w, s2h, r2) = (236, 236, 118), (190, 190, 95)
    bw = 4 if real else 0
    mask_png(s1w, s1h, r1, WORK / "m1.png"); mask_png(s2w, s2h, r2, WORK / "m2.png")
    ring_png(s1w, s1h, 4, r1, WORK / "r1.png"); ring_png(s2w, s2h, 4, r2, WORK / "r2.png")
    demo_en = "+".join(f"between(t,{a:.2f},{b:.2f})" for dm, a, b in spans if dm) or "0"
    slide_en = f"not({demo_en})"
    x1, y1 = W - s1w - 44, H - s1h - 40
    x2, y2 = 20, H - s2h - 20
    fc = (f"[1:v]{crop}fps={FPS},format=rgba,split=2[a][b];"
          f"[a]scale={s1w}:{s1h}[a1];[2:v]format=gray,scale={s1w}:{s1h}[m1];[a1][m1]alphamerge[av1];"
          f"[b]scale={s2w}:{s2h}[b1];[3:v]format=gray,scale={s2w}:{s2h}[m2];[b1][m2]alphamerge[av2];"
          f"[0:v][4:v]overlay={x1 - 4}:{y1 - 4}:enable='{slide_en}'[o1];[o1][av1]overlay={x1}:{y1}:enable='{slide_en}'[o2];"
          f"[o2][5:v]overlay={x2 - 4}:{y2 - 4}:enable='{demo_en}'[o3];[o3][av2]overlay={x2}:{y2}:enable='{demo_en}':shortest=1,format=yuv420p[v]")
    mp4 = OUT / f"{lid}.mp4"
    enc(["-i", str(base), "-i", str(track), "-loop", "1", "-i", str(WORK / "m1.png"), "-loop", "1", "-i", str(WORK / "m2.png"),
         "-loop", "1", "-i", str(WORK / "r1.png"), "-loop", "1", "-i", str(WORK / "r2.png"), "-i", str(full),
         "-filter_complex", fc, "-map", "[v]", "-map", "6:a", "-c:v", "libx264", "-preset", "slow", "-crf", "27",
         "-c:a", "aac", "-b:a", "96k", "-t", f"{t:.3f}", "-movflags", "+faststart", str(mp4)])
    enc(["-ss", "2", "-i", str(mp4), "-frames:v", "1", "-vf", "scale=960:-2", str(OUT / f"{lid}.jpg")])
    (OUT / f"{lid}.vtt").write_text("WEBVTT\n\n" + "".join(f"{mv.vtt_time(a)} --> {mv.vtt_time(b)}\n{x}\n\n" for a, b, x in cues))
    print(lid, f"{t / 60:.1f} хв", f"{mp4.stat().st_size / 1e6:.1f} МБ")


if __name__ == "__main__":
    which = sys.argv[1:] or [l["id"] for l in LESSONS]
    avatar = mv.build_avatar()
    for l in LESSONS:
        if l["id"] in which:
            make(l, avatar)
