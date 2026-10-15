import math, random, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, DUR = 1080, 1920, 30, 20.0
N = int(FPS * DUR)
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
_fc = {}
def font(sz, bold=True):
    k = (sz, bold)
    if k not in _fc: _fc[k] = ImageFont.truetype(FB if bold else FR, sz)
    return _fc[k]

def clamp(x, a=0, b=1): return max(a, min(b, x))
def eo(x): x = clamp(x); return 1 - (1 - x) ** 3
def eback(x):
    x = clamp(x); c = 1.7
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2

def grad(top, bot):
    t = np.linspace(0, 1, H)[:, None, None]
    a = np.array(top, float); b = np.array(bot, float)
    g = (a + (b - a) * t).repeat(W, axis=1)
    return Image.fromarray(g.astype(np.uint8), "RGB")

_tc = {}
def textimg(txt, sz, color=(255, 255, 255), bold=True, shadow=True, stroke=0, scolor=(0,0,0)):
    k = (txt, sz, color, bold, shadow, stroke, scolor)
    if k in _tc: return _tc[k]
    f = font(sz, bold)
    l, t, r, b = f.getbbox(txt, stroke_width=stroke)
    pad = 30
    im = Image.new("RGBA", (r - l + pad * 2, b - t + pad * 2), (0, 0, 0, 0))
    if shadow:
        sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).text((pad - l + 4, pad - t + 8), txt, font=f, fill=(0, 0, 0, 150), stroke_width=stroke, stroke_fill=(0,0,0,150))
        im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(8)))
    ImageDraw.Draw(im).text((pad - l, pad - t), txt, font=f, fill=color + (255,), stroke_width=stroke, stroke_fill=scolor)
    _tc[k] = im
    return im

def put(frame, img, cx, cy, alpha=1.0, scale=1.0):
    if alpha <= 0.01: return
    if abs(scale - 1) > 0.01:
        img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.LANCZOS)
    if alpha < 0.999:
        img = img.copy(); a = img.getchannel("A").point(lambda v: int(v * alpha)); img.putalpha(a)
    frame.paste(img, (int(cx - img.width / 2), int(cy - img.height / 2)), img)

def textin(frame, txt, sz, cx, cy, t, start, color=(255,255,255), dy=80, **kw):
    p = eo((t - start) / 0.45)
    put(frame, textimg(txt, sz, color, **kw), cx, cy + (1 - p) * dy, alpha=p)

def popin(frame, txt, sz, cx, cy, t, start, color=(255,255,255), **kw):
    p = clamp((t - start) / 0.5)
    put(frame, textimg(txt, sz, color, **kw), cx, cy, alpha=clamp(p * 3), scale=max(0.05, eback(p)))

RED = (214, 32, 50)

# ---------- Scene 1: plane to Japan ----------
BG1 = grad((24, 30, 90), (255, 140, 120))
def scene1(t):
    f = BG1.copy(); d = ImageDraw.Draw(f, "RGBA")
    rnd = random.Random(1)
    for _ in range(70):
        x, y = rnd.randrange(W), rnd.randrange(H // 2)
        tw = 0.5 + 0.5 * math.sin(t * 4 + x)
        d.ellipse((x-3, y-3, x+3, y+3), fill=(255, 255, 255, int(120 + 120 * tw)))
    sy = 1650 - 420 * eo(t / 3)
    for r, a in ((420, 40), (360, 70), (300, 255)):
        d.ellipse((W/2 - r, sy - r, W/2 + r, sy + r), fill=RED + (a,))
    # plane flying diagonally with dashed trail
    p = clamp(t / 3.3)
    px, py = -200 + p * (W + 400), 1250 - p * 900
    ang = math.atan2(-900, W + 400)
    for i in range(1, 14):
        q = p - i * 0.025
        if q < 0: break
        tx, ty = -200 + q * (W + 400), 1250 - q * 900
        d.ellipse((tx - 7, ty - 7, tx + 7, ty + 7), fill=(255, 255, 255, 200 - i * 13))
    def rot(pts):
        c, s = math.cos(ang), math.sin(ang)
        return [(px + x * c - y * s, py + x * s + y * c) for x, y in pts]
    s = 1.6
    body = [(60*s, 0), (40*s, -10*s), (-50*s, -10*s), (-60*s, 0), (-50*s, 10*s), (40*s, 10*s)]
    wing = [(15*s, 0), (-15*s, -55*s), (-30*s, -55*s), (-12*s, 0), (-30*s, 55*s), (-15*s, 55*s)]
    tail = [(-45*s, 0), (-60*s, -28*s), (-68*s, -28*s), (-60*s, 0), (-68*s, 28*s), (-60*s, 28*s)]
    for poly in (wing, tail, body): d.polygon(rot(poly), fill=(255, 255, 255, 255))
    textin(f, "Марина, 14 лет", 100, W/2, 470, t, 0.3)
    textin(f, "летит в Японию!", 84, W/2, 610, t, 0.8, color=(255, 230, 120))
    return f

# ---------- Scene 2: Tokyo ----------
BG2 = grad((20, 8, 50), (110, 20, 110))
rb = random.Random(7)
BLD = []
x = -100
while x < W * 1.6:
    w = rb.randint(110, 230); h = rb.randint(500, 1200)
    BLD.append((x, w, h, rb.choice([(35, 25, 70), (45, 30, 85), (28, 20, 60)]),
                [(rb.random() < 0.55) for _ in range(200)], rb.random()))
    x += w + rb.randint(4, 20)
NEON = [("寿司", (255, 60, 160)), ("東京", (60, 230, 255)), ("ロボ", (255, 220, 60))]
def scene2(t):
    f = BG2.copy(); d = ImageDraw.Draw(f, "RGBA")
    d.ellipse((760, 260, 900, 400), fill=(255, 240, 220, 230))
    off = t * 60
    for i, (bx, bw, bh, col, lights, ph) in enumerate(BLD):
        x0 = bx - off; y0 = H - bh
        if x0 > W or x0 + bw < 0: continue
        d.rectangle((x0, y0, x0 + bw, H), fill=col + (255,))
        k = 0
        for wy in range(int(y0) + 30, H - 40, 55):
            for wx in range(int(x0) + 18, int(x0 + bw) - 30, 42):
                if lights[k % 200]:
                    d.rectangle((wx, wy, wx + 20, wy + 28), fill=(255, 210, 120, 210))
                k += 1
        if ph > 0.6 and i % 3 == 0:
            txt, nc = NEON[i % 3]
            on = 0.75 + 0.25 * math.sin(t * 13 + i)
            sign = textimg(txt, 0, nc, shadow=False) if False else None
    # glow-y kanji signs as text (Unifont has CJK)
    try:
        jf = ImageFont.truetype("/usr/share/fonts/opentype/unifont/unifont_jp.otf", 96)
        for j, (txt, nc) in enumerate(NEON):
            on = 0.7 + 0.3 * math.sin(t * 11 + j * 2)
            x0 = 120 + j * 330 - (t * 25)
            d.text((x0, 1050 + (j % 2) * 120), txt, font=jf, fill=nc + (int(255 * on),))
    except Exception:
        pass
    textin(f, "Токио", 190, W/2, 420, t, 0.1, color=(255, 255, 255))
    textin(f, "неон, роботы", 68, W/2, 610, t, 0.6, color=(120, 240, 255))
    textin(f, "и самые вкусные суши", 68, W/2, 710, t, 0.9, color=(255, 140, 210))
    return f

# ---------- Scene 3: Fuji + sakura + torii ----------
BG3 = grad((120, 190, 255), (255, 220, 235))
pr = random.Random(3)
PET = [(pr.uniform(0, W), pr.uniform(-H, H), pr.uniform(0.6, 1.4), pr.uniform(0, 6.28)) for _ in range(60)]
def scene3(t):
    f = BG3.copy(); d = ImageDraw.Draw(f, "RGBA")
    zoom = 1 + 0.04 * t
    cx, base = W / 2, 1500
    peak = (cx, base - 760 * zoom)
    d.polygon([(cx - 780 * zoom, base), peak, (cx + 780 * zoom, base)], fill=(80, 100, 160))
    sl = 0.3
    sx = 780 * zoom * sl; sy = peak[1] + 760 * zoom * sl
    d.polygon([peak, (cx - sx, sy), (cx - sx * 0.5, sy - 30), (cx - sx * 0.1, sy + 25),
               (cx + sx * 0.35, sy - 25), (cx + sx, sy)], fill=(250, 250, 255))
    d.rectangle((0, base, W, H), fill=(110, 170, 110))
    # torii
    tc = (200, 30, 40)
    d.rectangle((250, 1050, 300, 1800), fill=tc); d.rectangle((780, 1050, 830, 1800), fill=tc)
    d.polygon([(150, 990), (930, 990), (960, 940), (120, 940)], fill=(40, 20, 20))
    d.rectangle((160, 990, 920, 1030), fill=tc)
    d.rectangle((200, 1110, 880, 1150), fill=tc)
    d.rectangle((520, 1030, 560, 1110), fill=tc)
    # sakura branch corner
    for i in range(14):
        a = i * 0.45
        bx, by = 80 + 90 * math.cos(a) + i * 30, 120 + 60 * math.sin(a * 1.3) + i * 8
        d.ellipse((bx - 45, by - 45, bx + 45, by + 45), fill=(255, 170, 200, 230))
    for x0, y0, s, ph in PET:
        y = (y0 + t * 260 * s) % (H + 200) - 100
        x = x0 + 60 * math.sin(t * 2 * s + ph)
        rr = 16 * s
        d.ellipse((x - rr, y - rr * 0.6, x + rr, y + rr * 0.6), fill=(255, 180, 205, 230))
    textin(f, "Фудзи, сакура", 92, W/2, 300, t, 0.1, color=(255, 255, 255))
    textin(f, "и древние храмы", 92, W/2, 430, t, 0.5, color=(255, 255, 255))
    return f

# ---------- Scene 4: StepTravel camp ----------
BG4 = grad((255, 250, 245), (255, 225, 225))
CARDS = [("Друзья со всего мира", (255, 120, 60)),
         ("Японский язык и культура", (214, 32, 50)),
         ("IT, аниме и робототехника", (120, 70, 220))]
def scene4(t):
    f = BG4.copy(); d = ImageDraw.Draw(f, "RGBA")
    # rotating sun rays
    for i in range(16):
        a = i * math.pi / 8 + t * 0.25
        d.polygon([(W/2, 330), (W/2 + 1600 * math.cos(a - 0.08), 330 + 1600 * math.sin(a - 0.08)),
                   (W/2 + 1600 * math.cos(a + 0.08), 330 + 1600 * math.sin(a + 0.08))], fill=(214, 32, 50, 22))
    textin(f, "Лагерь", 88, W/2, 240, t, 0.0, color=(40, 40, 60), shadow=False)
    popin(f, "StepTravel", 150, W/2, 390, t, 0.3, color=RED)
    for i, (txt, col) in enumerate(CARDS):
        st = 1.0 + i * 0.7
        p = eback((t - st) / 0.55)
        if t < st: continue
        y = 720 + i * 260
        x_off = (1 - p) * (W if i % 2 == 0 else -W)
        x0, x1 = 80 + x_off, W - 80 + x_off
        d.rounded_rectangle((x0 + 8, y - 95 + 14, x1 + 8, y + 95 + 14), 50, fill=(0, 0, 0, 35))
        d.rounded_rectangle((x0, y - 95, x1, y + 95), 50, fill=(255, 255, 255, 255))
        d.ellipse((x0 + 40, y - 55, x0 + 150, y + 55), fill=col + (255,))
        d.line((x0 + 68, y, x0 + 90, y + 24), fill=(255,255,255), width=12)
        d.line((x0 + 90, y + 24, x0 + 125, y - 22), fill=(255,255,255), width=12)
        ti = textimg(txt, 43, (40, 40, 60), shadow=False)
        put(f, ti, x0 + 180 + ti.width / 2 - 20, y)
    textin(f, "Было круто и интересно!", 68, W/2, 1560, t, 3.3, color=RED, shadow=False)
    return f

# ---------- Scene 5: CTA ----------
BG5 = grad((230, 40, 60), (150, 10, 40))
def scene5(t):
    f = BG5.copy(); d = ImageDraw.Draw(f, "RGBA")
    r = 360 + 15 * math.sin(t * 3)
    d.ellipse((W/2 - r, 800 - r, W/2 + r, 800 + r), fill=(255, 255, 255, 30))
    d.ellipse((W/2 - r + 60, 800 - r + 60, W/2 + r - 60, 800 + r - 60), fill=(255, 255, 255, 40))
    textin(f, "Марина уже мечтает", 70, W/2, 330, t, 0.0)
    textin(f, "вернуться. А ты?", 70, W/2, 425, t, 0.25)
    popin(f, "StepTravel", 160, W/2, 790, t, 0.6)
    textin(f, "Каникулы, которые", 66, W/2, 1010, t, 1.0, color=(255, 230, 120))
    textin(f, "запомнятся навсегда", 66, W/2, 1100, t, 1.2, color=(255, 230, 120))
    if t > 1.7:
        p = eback((t - 1.7) / 0.5); pulse = 1 + 0.04 * math.sin(t * 7)
        bw, bh = 820 * p * pulse, 170 * p * pulse
        y = 1450
        d.rounded_rectangle((W/2 - bw/2, y - bh/2, W/2 + bw/2, y + bh/2), 85, fill=(255, 255, 255, 255))
        if p > 0.5:
            put(f, textimg("Записывайся на лето!", 62, RED, shadow=False), W/2, y, alpha=clamp((p - 0.5) * 2))
    return f

SCENES = [(0.0, 3.6, scene1), (3.6, 7.6, scene2), (7.6, 11.6, scene3), (11.6, 16.2, scene4), (16.2, 20.0, scene5)]
XF = 0.35

def frame_at(t):
    for i, (a, b, fn) in enumerate(SCENES):
        if a <= t < b or (i == len(SCENES) - 1 and t >= a):
            img = fn(t - a)
            if i + 1 < len(SCENES) and t > b - XF:
                na, nb, nfn = SCENES[i + 1]
                img = Image.blend(img, nfn(t - na), (t - (b - XF)) / XF)
            return img
    return SCENES[-1][2](t - SCENES[-1][0])

# ---------- Music ----------
def music(path):
    sr = 44100; n = int(sr * DUR); out = np.zeros(n)
    bpm = 128; beat = 60 / bpm
    tt = np.arange(n) / sr
    def note(freq, start, length, vol, kind="pluck"):
        s = int(start * sr); e = min(n, s + int(length * sr))
        if s >= n: return
        x = np.arange(e - s) / sr
        env = np.exp(-x * (5 if kind == "pluck" else 1.5))
        env *= np.clip(x / 0.005, 0, 1)
        w = np.sin(2 * np.pi * freq * x) + 0.3 * np.sin(4 * np.pi * freq * x) + 0.1 * np.sin(6 * np.pi * freq * x)
        out[s:e] += vol * w * env
    # Japanese-flavoured major pentatonic (D) melody
    sc = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0]
    mel = [5, 4, 3, 5, 7, 6, 5, 3, 4, 3, 1, 3, 4, 5, 6, 8]
    bars = int(DUR / beat) + 1
    for i in range(bars * 2):
        st = i * beat / 2
        if st > DUR - 1.2: break
        note(sc[mel[i % 16]], st, 0.4, 0.22)
    chords = [(146.83, 220.0, 293.66), (123.47, 185.0, 246.94), (98.0, 146.83, 196.0), (110.0, 164.81, 220.0)]
    for b in range(0, bars, 4):
        for fr in chords[(b // 4) % 4]:
            note(fr, b * beat, beat * 4, 0.10, "pad")
    for b in range(bars):
        st = b * beat
        if st > DUR - 0.8: break
        s = int(st * sr); L = int(0.25 * sr); x = np.arange(min(L, n - s)) / sr
        out[s:s + len(x)] += 0.55 * np.sin(2 * np.pi * (50 + 120 * np.exp(-x * 30)) * x) * np.exp(-x * 12)
        hs = int((st + beat / 2) * sr); hl = int(0.05 * sr)
        if hs + hl < n:
            out[hs:hs + hl] += 0.07 * np.random.RandomState(b).randn(hl) * np.exp(-np.arange(hl) / sr * 80)
    note(587.33, DUR - 1.4, 1.4, 0.3, "pad"); note(880.0, DUR - 1.4, 1.4, 0.2, "pad")
    fade = np.clip((DUR - tt) / 0.8, 0, 1) * np.clip(tt / 0.2, 0, 1)
    out = out * fade; out = out / np.max(np.abs(out)) * 0.85
    pcm = (out * 32767).astype(np.int16)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr); wf.writeframes(pcm.tobytes())

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "preview":
        for ts in [1.5, 3.0, 5.5, 9.5, 13.0, 15.5, 19.0]:
            frame_at(ts).convert("RGB").resize((360, 640)).save(f"prev_{ts}.png")
        sys.exit()
    music("music.wav")
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", "music.wav", "-c:v", "libx264", "-preset", "medium",
        "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart",
        "StepTravel_Marina_Japan_20s.mp4"], stdin=subprocess.PIPE)
    for i in range(N):
        p.stdin.write(frame_at(i / FPS).convert("RGB").tobytes())
    p.stdin.close(); p.wait()
