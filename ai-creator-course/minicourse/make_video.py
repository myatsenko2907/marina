"""Збирає відеоуроки: слайди в стилі сайту + аватар «Ліна» з рухом губ під озвучку.

Запуск: python3 make_video.py [lesson-1|lesson-2]
Озвучка: ElevenLabs, якщо працює ключ (api.elevenlabs.io), інакше Microsoft Neural (edge-tts, uk-UA-PolinaNeural).
Результат: app/media/lesson-N.mp4, lesson-N.jpg (обкладинка), lesson-N.vtt (субтитри).
"""
import asyncio, json, math, os, pathlib, re, subprocess, sys, wave, struct, urllib.request
from html import escape as e
from lessons import LESSONS, HOST

HERE = pathlib.Path(__file__).parent
OUT = HERE / "app" / "media"
WORK = pathlib.Path(os.environ.get("WORK", "/tmp/minicourse-build"))
FPS = 25
W, H = 1280, 720
VOICE = "uk-UA-PolinaNeural"
ELEVEN_VOICE = os.environ.get("ELEVEN_VOICE", "")  # id голосу ElevenLabs; порожньо = edge-tts
ELEVEN_HOST = os.environ.get("ELEVEN_HOST", "api.elevenlabs.io")
ELEVEN_KEY = os.environ.get("ELEVEN_KEY", "proxy-injected")  # ключ лише зі змінної оточення, не з коду

OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)

FONTS = '<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800;900&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">'
CSS = """
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#FBFAF8;--ink:#121317;--sub:#5E6270;--line:#E8E6E1;--grad:linear-gradient(100deg,#FF4A1C 0%,#FF2D78 55%,#FFB01F 110%)}
html,body{width:1280px;height:720px;background:transparent}
.slide{width:1280px;height:720px;position:relative;overflow:hidden;background:var(--bg);font:600 26px/1.4 Manrope,sans-serif;color:var(--ink);padding:64px 70px}
.slide::before{content:"";position:absolute;inset:0;background:radial-gradient(40% 55% at 95% 0%,rgba(255,45,120,.16),transparent 70%),radial-gradient(35% 50% at 70% 110%,rgba(255,176,31,.20),transparent 70%)}
.slide>*{position:relative}
.top{display:flex;justify-content:space-between;align-items:center;font:800 15px Manrope;letter-spacing:.14em;text-transform:uppercase;color:var(--sub);margin-bottom:34px}
.top b{display:flex;align-items:center;gap:10px;color:var(--ink)}
.top b i{width:26px;height:26px;border-radius:8px;background:var(--grad);display:grid;place-items:center;color:#fff;font:900 10px Unbounded;font-style:normal}
h1{font:900 76px/1 Unbounded;letter-spacing:-.045em;max-width:880px}
h2{font:800 50px/1.05 Unbounded;letter-spacing:-.035em;max-width:900px;margin-bottom:34px}
.g{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{font:700 28px Manrope;color:var(--sub);margin-top:24px}
.pill{display:inline-flex;gap:10px;align-items:center;font:800 16px Manrope;letter-spacing:.12em;text-transform:uppercase;background:#fff;border:1px solid var(--line);padding:10px 16px;border-radius:99px;margin-bottom:30px}
.pill::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--grad)}
.list{display:grid;gap:18px;max-width:820px}
.list div{display:flex;gap:18px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:22px;padding:20px 24px;font-size:28px}
.list div span{flex:none;width:44px;height:44px;border-radius:50%;background:var(--grad);color:#fff;display:grid;place-items:center;font:800 20px Unbounded}
.cmp{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:900px}
.cmp>div{border-radius:26px;padding:28px}
.cmp .l{background:#EFEDE8}
.cmp .r{background:#fff;border:3px solid transparent;background:linear-gradient(#fff,#fff) padding-box,var(--grad) border-box}
.cmp h3{font:700 26px Unbounded;margin-bottom:16px}
.cmp p{font-size:24px;margin-top:10px;color:#33363F}
.cmp .l p{color:var(--sub)}
.formula{display:flex;flex-wrap:wrap;gap:14px;align-items:center;max-width:900px}
.formula div{background:#fff;border:2px solid var(--line);border-radius:22px;padding:22px 26px;font:700 30px Unbounded;letter-spacing:-.02em}
.formula div:nth-child(odd){border-color:transparent;background:linear-gradient(#fff,#fff) padding-box,var(--grad) border-box}
.formula em{font:900 34px Unbounded;font-style:normal;color:#C9C5BD}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:880px}
.grid div{background:#fff;border:1px solid var(--line);border-radius:22px;padding:22px 24px}
.grid b{display:block;font:700 26px Unbounded;letter-spacing:-.02em;margin-bottom:6px}
.grid span{font:600 20px ui-monospace,monospace;color:#B0346A}
.prompt{max-width:880px;background:var(--ink);color:#F2F2F4;border-radius:26px;padding:30px 34px;font:600 26px/1.5 Manrope;position:relative}
.prompt::before{content:"ПРОМПТ";display:block;font:800 14px Manrope;letter-spacing:.16em;margin-bottom:12px;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.task{background:var(--ink);color:#fff}
.task .list div{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.12);color:#fff}
.task .top,.task .top b{color:#C9CBD2}
.title h1{margin-top:60px}
.outro{background:var(--ink);color:#fff}
.outro .top,.outro .top b{color:#C9CBD2}
.outro .sub{color:#C9CBD2}
.outro h1{margin-top:60px}
.real .list,.real .cmp,.real .grid,.real .prompt,.real .formula{max-width:850px}
.real h1,.real h2{max-width:850px}
.host{position:absolute;right:300px;bottom:78px;text-align:right;font:800 22px Unbounded;letter-spacing:-.02em}
.host small{display:block;font:700 15px Manrope;letter-spacing:.08em;text-transform:uppercase;color:var(--sub)}
.task .host small,.outro .host small{color:#A3A6B0}
"""

AVATAR_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
<defs>
 <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE3D6"/><stop offset="1" stop-color="#FFD1E2"/></linearGradient>
 <linearGradient id="ring" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF4A1C"/><stop offset=".55" stop-color="#FF2D78"/><stop offset="1" stop-color="#FFB01F"/></linearGradient>
 <clipPath id="c"><circle cx="150" cy="150" r="138"/></clipPath>
</defs>
<circle cx="150" cy="150" r="148" fill="url(#ring)"/>
<circle cx="150" cy="150" r="140" fill="#fff"/>
<g clip-path="url(#c)">
 <rect width="300" height="300" fill="url(#bg)"/>
 <path d="M70 120 C60 210 80 250 95 270 L205 270 C220 250 240 210 230 120 Z" fill="#2B1B17"/>
 <path d="M40 300 C45 240 90 222 150 222 C210 222 255 240 260 300 Z" fill="#121317"/>
 <path d="M112 222 L150 262 L188 222 Z" fill="#FF4A1C"/>
 <rect x="132" y="188" width="36" height="40" rx="14" fill="#E9AE8E"/>
 <ellipse cx="150" cy="138" rx="58" ry="68" fill="#F4C7AA"/>
 <ellipse cx="94" cy="142" rx="9" ry="14" fill="#EDB495"/><ellipse cx="206" cy="142" rx="9" ry="14" fill="#EDB495"/>
 <circle cx="93" cy="160" r="4" fill="#FFB01F"/><circle cx="207" cy="160" r="4" fill="#FFB01F"/>
 <path d="M88 128 C86 78 120 62 152 62 C190 62 216 84 212 132 C200 104 176 92 150 96 C124 98 104 108 88 128 Z" fill="#2B1B17"/>
 <path d="M150 64 C130 78 116 100 112 118 C130 100 146 92 170 90 Z" fill="#3A2620"/>
 <path d="M118 120 Q128 114 138 120" stroke="#2B1B17" stroke-width="4" fill="none" stroke-linecap="round"/>
 <path d="M162 120 Q172 114 182 120" stroke="#2B1B17" stroke-width="4" fill="none" stroke-linecap="round"/>
 {EYES}
 <ellipse cx="120" cy="160" rx="11" ry="6" fill="#FF8FA3" opacity=".35"/><ellipse cx="180" cy="160" rx="11" ry="6" fill="#FF8FA3" opacity=".35"/>
 <path d="M150 140 Q146 156 152 158" stroke="#D99A7B" stroke-width="3" fill="none" stroke-linecap="round"/>
 {MOUTH}
</g>
</svg>"""
EYES_OPEN = '<ellipse cx="128" cy="136" rx="7" ry="8.5" fill="#1E1412"/><ellipse cx="172" cy="136" rx="7" ry="8.5" fill="#1E1412"/><circle cx="130.5" cy="133" r="2.4" fill="#fff"/><circle cx="174.5" cy="133" r="2.4" fill="#fff"/>'
EYES_CLOSED = '<path d="M121 137 Q128 141 135 137" stroke="#1E1412" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M165 137 Q172 141 179 137" stroke="#1E1412" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
MOUTHS = [
    '<path d="M134 176 Q150 186 166 176" stroke="#B23A4A" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
    '<path d="M136 174 Q150 172 164 174 Q160 186 150 187 Q140 186 136 174 Z" fill="#8E2236"/><path d="M139 175 Q150 173.5 161 175 L160 178 Q150 177 140 178 Z" fill="#fff"/>',
    '<path d="M134 172 Q150 169 166 172 Q163 194 150 195 Q137 194 134 172 Z" fill="#8E2236"/><path d="M137 173 Q150 171 163 173 L162 177 Q150 175.5 138 177 Z" fill="#fff"/><ellipse cx="150" cy="189" rx="8" ry="4" fill="#E25C6E"/>',
    '<path d="M138 175 Q150 171 162 175 Q158 183 150 184 Q142 183 138 175 Z" fill="#8E2236"/>',
]


def slide_html(s, lesson, real=False):
    k = s["kind"]
    top = f'<div class="top"><b><i>AI</i>AI Creator · Старт</b><span>Урок {lesson["n"]}</span></div>'
    if k == "title":
        body = f'<span class="pill">Урок {lesson["n"]}</span><h1>{e(s["title"]).replace("AI", "<span class=g>AI</span>", 1)}</h1><p class="sub">{e(s["sub"])}</p>'
    elif k == "outro":
        body = f'<span class="pill" style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15);color:#fff">Далі</span><h1>{e(s["title"])}</h1><p class="sub">{e(s["sub"])}</p>'
    elif k in ("bullets", "task", "steps"):
        items = s.get("bullets") or s.get("steps")
        body = f'<h2>{e(s["title"])}</h2><div class="list">' + "".join(f'<div><span>{i+1}</span>{e(x)}</div>' for i, x in enumerate(items)) + "</div>"
    elif k == "compare":
        (lt, li), (rt, ri) = s["left"], s["right"]
        body = f'<h2>{e(s["title"])}</h2><div class="cmp"><div class="l"><h3>{e(lt)}</h3>' + "".join(f"<p>✕ {e(x)}</p>" for x in li) + f'</div><div class="r"><h3>{e(rt)}</h3>' + "".join(f"<p>✓ {e(x)}</p>" for x in ri) + "</div></div>"
    elif k == "formula":
        parts = '<em>+</em>'.join(f"<div>{e(p)}</div>" for p in s["parts"])
        body = f'<h2>{e(s["title"])}</h2><div class="formula">{parts}</div>'
    elif k == "grid":
        body = f'<h2>{e(s["title"])}</h2><div class="grid">' + "".join(f"<div><b>{e(a)}</b><span>{e(b)}</span></div>" for a, b in s["items"]) + "</div>"
    elif k == "prompt":
        body = f'<h2>{e(s["title"])}</h2><div class="prompt">{e(s["prompt"])}</div>'
    cls = {"task": "slide task", "outro": "slide outro", "title": "slide title"}.get(k, "slide") + (" real" if real else "")
    return f'<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>{CSS}</style></head><body><div class="{cls}">{top}{body}<div class="host"{' style="right:350px"' if real else ''}>{HOST["name"]}<small>AI-ментор</small></div></div></body></html>'


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def eleven_ok():
    if not ELEVEN_VOICE:
        return False
    try:
        req = urllib.request.Request(f"https://{ELEVEN_HOST}/v1/user/subscription", headers={"xi-api-key": ELEVEN_KEY})
        urllib.request.urlopen(req, timeout=20)
        return True
    except Exception:
        return False


def tts(text, path, use_eleven):
    if use_eleven:
        body = json.dumps({"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.25}}).encode()
        req = urllib.request.Request(f"https://{ELEVEN_HOST}/v1/text-to-speech/{ELEVEN_VOICE}?output_format=mp3_44100_128", data=body,
                                     headers={"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json"})
        path.write_bytes(urllib.request.urlopen(req, timeout=120).read())
    else:
        import edge_tts
        asyncio.run(edge_tts.Communicate(text, VOICE, rate="-3%").save(str(path)))


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True).stdout
    return float(out.strip())


def render_pngs(jobs):
    """jobs: list of (html, png_path, (w,h), transparent)"""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium", args=["--headless=new", "--no-sandbox"])
        for html, path, (w, h), transp in jobs:
            pg = b.new_page(viewport={"width": w, "height": h})
            pg.set_content(html, wait_until="networkidle")
            pg.evaluate("document.fonts.ready")
            pg.screenshot(path=str(path), omit_background=transp)
            pg.close()
        b.close()


def build_avatar():
    jobs, paths = [], {}
    for mi in range(len(MOUTHS)):
        for eyes, tag in ((EYES_OPEN, "o"), (EYES_CLOSED, "c")):
            svg = AVATAR_SVG.replace("{EYES}", eyes).replace("{MOUTH}", MOUTHS[mi])
            html = f'<!doctype html><html><body style="margin:0;background:transparent">{svg}</body></html>'
            pth = WORK / f"av-m{mi}-{tag}.png"
            jobs.append((html, pth, (300, 300), True)); paths[(mi, tag)] = pth
    render_pngs(jobs)
    return paths


def rms_frames(wav_path):
    with wave.open(str(wav_path)) as w:
        sr, n = w.getframerate(), w.getnframes()
        data = struct.unpack(f"<{n}h", w.readframes(n))
    step = sr // FPS
    vals = []
    for i in range(0, n, step):
        chunk = data[i:i + step]
        vals.append(math.sqrt(sum(x * x for x in chunk) / max(1, len(chunk))))
    peak = sorted(vals)[int(len(vals) * 0.95)] or 1
    return [v / peak for v in vals]


def vtt_time(t):
    h, rem = divmod(t, 3600); m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


def make(lesson, avatar):
    from PIL import Image
    lid = lesson["id"]
    use_eleven = eleven_ok()
    print(lid, "voice:", "ElevenLabs" if use_eleven else VOICE)
    slides = lesson["slides"]
    # 1) озвучка
    segs, cues, t = [], [], 0.0
    for i, s in enumerate(slides):
        mp3 = WORK / f"{lid}-{i:02d}.mp3"
        if not mp3.exists() or mp3.stat().st_size == 0:
            tts(s["narration"], mp3, use_eleven)
        wav = WORK / f"{lid}-{i:02d}.wav"
        run(["ffmpeg", "-y", "-i", str(mp3), "-af", "apad=pad_dur=0.6", "-ar", "24000", "-ac", "1", str(wav)])
        d = duration(wav)
        sentences = [x.strip() for x in re.split(r"(?<=[.!?])\s+", s["narration"]) if x.strip()]
        total = sum(len(x) for x in sentences)
        st = t
        for x in sentences:
            dd = (d - 0.6) * len(x) / total
            cues.append((st, st + dd, x)); st += dd
        segs.append((wav, d)); t += d
    lst = WORK / f"{lid}-wav.txt"
    lst.write_text("".join(f"file '{w}'\n" for w, _ in segs))
    full = WORK / f"{lid}-full.wav"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(full)])
    # 2) слайди
    avatar_mp4 = HERE / "media" / "vivix" / f"{lid}-avatar.mp4"
    real = avatar_mp4.exists()
    print(lid, "avatar:", "Vivix A1" if real else "мальований")
    jobs = [(slide_html(s, lesson, real), WORK / f"{lid}-s{i:02d}.png", (W, H), False) for i, s in enumerate(slides)]
    render_pngs(jobs)
    # 3) кадри: слайд + аватар
    av_imgs = {k: Image.open(p).convert("RGBA").resize((236, 236), Image.LANCZOS) for k, p in avatar.items()}
    comp_cache = {}

    def frame(si, key):
        if (si, key) not in comp_cache:
            bg = Image.open(WORK / f"{lid}-s{si:02d}.png").convert("RGBA")
            if not real:
                bg.alpha_composite(av_imgs[key], (W - 236 - 44, H - 236 - 40))
            pth = WORK / f"{lid}-f{si:02d}-{key[0]}{key[1]}.jpg"
            bg.convert("RGB").save(pth, quality=92)
            comp_cache[(si, key)] = pth
        return comp_cache[(si, key)]

    levels = rms_frames(full)
    bounds, acc = [], 0.0
    for _, d in segs:
        acc += d; bounds.append(acc)
    entries, si, prev = [], 0, 0
    for fi, lv in enumerate(levels):
        tt = fi / FPS
        while si < len(bounds) - 1 and tt >= bounds[si]:
            si += 1
        m = 0 if lv < 0.12 else 3 if lv < 0.3 else 1 if lv < 0.6 else 2
        if m and prev == 0 and lv < 0.2:
            m = 0
        prev = m
        blink = "c" if (fi % 100) in (0, 1, 2) else "o"
        entries.append(frame(si, (0, "o") if real else (m, blink)))
    # стискаємо однакові кадри поспіль у concat-список
    lines, i = [], 0
    while i < len(entries):
        j = i
        while j + 1 < len(entries) and entries[j + 1] == entries[i]:
            j += 1
        lines.append(f"file '{entries[i]}'\nduration {(j - i + 1) / FPS:.3f}\n")
        i = j + 1
    lines.append(f"file '{entries[-1]}'\n")
    flist = WORK / f"{lid}-frames.txt"
    flist.write_text("".join(lines))
    mp4 = OUT / f"{lid}.mp4"
    if real:
        # картка з відео ведучої: скруглений прямокутник 280×380 з градієнтною рамкою
        from PIL import ImageDraw
        cw, ch, bw = 280, 380, 4
        mask = Image.new("L", (cw, ch), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, cw - 1, ch - 1), 28, fill=255)
        mask.save(WORK / "av-mask.png")
        ring = Image.new("RGBA", (cw + 2 * bw, ch + 2 * bw))
        grad = Image.new("RGBA", ring.size)
        for x in range(ring.size[0]):
            q = x / ring.size[0]
            c = (255, int(74 - 29 * min(1, q / .55)), int(28 + 92 * min(1, q / .55)), 255) if q < .55 else (255, int(45 + 131 * (q - .55) / .45), int(120 - 89 * (q - .55) / .45), 255)
            ImageDraw.Draw(grad).line([(x, 0), (x, ring.size[1])], fill=c)
        rmask = Image.new("L", ring.size, 0); ImageDraw.Draw(rmask).rounded_rectangle((0, 0, ring.size[0] - 1, ring.size[1] - 1), 32, fill=255)
        ring.paste(grad, (0, 0), rmask); ring.save(WORK / "av-ring.png")
        x0, y0 = W - cw - 44, H - ch - 40
        fc = (f"[1:v]crop=660:896:6:40,scale={cw}:{ch},fps={FPS},format=rgba[av];[2:v]format=gray,scale={cw}:{ch}[m];[av][m]alphamerge[ava];"
              f"[0:v]fps={FPS}[bg];[bg][3:v]overlay={x0 - bw}:{y0 - bw}[b1];[b1][ava]overlay={x0}:{y0}:shortest=1,format=yuv420p[v]")
        run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(flist), "-i", str(avatar_mp4),
             "-loop", "1", "-i", str(WORK / "av-mask.png"), "-loop", "1", "-i", str(WORK / "av-ring.png"), "-i", str(full),
             "-filter_complex", fc, "-map", "[v]", "-map", "4:a", "-c:v", "libx264", "-preset", "slow", "-crf", "28",
             "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", str(mp4)])
    else:
        run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(flist), "-i", str(full),
             "-vf", f"fps={FPS},format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-tune", "stillimage",
             "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", str(mp4)])
    # обкладинка і субтитри
    if real:
        run(["ffmpeg", "-y", "-ss", "3", "-i", str(mp4), "-frames:v", "1", "-vf", "scale=960:-2", str(OUT / f"{lid}.jpg")])
    else:
        Image.open(frame(0, (0, "o"))).resize((960, 540)).save(OUT / f"{lid}.jpg", quality=86)
    (OUT / f"{lid}.vtt").write_text("WEBVTT\n\n" + "".join(f"{vtt_time(a)} --> {vtt_time(b)}\n{x}\n\n" for a, b, x in cues))
    print(lid, f"{t/60:.1f} min", f"{mp4.stat().st_size/1e6:.1f} MB")


if __name__ == "__main__":
    which = sys.argv[1:] or [l["id"] for l in LESSONS]
    avatar = build_avatar()
    for l in LESSONS:
        if l["id"] in which:
            make(l, avatar)
