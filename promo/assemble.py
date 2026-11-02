"""Собирает ролик: сцены Vivix + запись экрана сервиса + субтитры, плашки и финальная карточка.

python3 assemble.py CLIPS_DIR FRAMES_DIR OUT.mp4
CLIPS_DIR  — сцены из generate.py (s1_problem.mp4 … s4_result.mp4)
FRAMES_DIR — кадры записи экрана из record.js (папки a/ и b/, 30 к/с, 1080×1920)
"""
import os, subprocess, sys
from PIL import Image, ImageDraw

W, H, FPS = 1080, 1920, 30
PIP_W, PIP_H, PIP_R = 300, 527, 28
PIP_X, PIP_Y = W - PIP_W - 40, 960
END = 3.8  # финальная карточка, с

# (начало, конец, текст) — секунды от начала сцены (по таймингу реплик в текущих клипах)
SUBS = [
    [(1.3, 3.2, "Четырнадцать филиалов."), (3.2, 5.8, "CRM, Facebook, Google…"),
     (5.8, 10.0, "Каждое утро — три часа в таблицах,\\Nчтобы понять, кто проваливает план.")],
    [(0.0, 3.3, "Тогда мы с Claude сделали сервис."), (3.8, 6.0, "Он сам собирает данные,"),
     (6.0, 10.0, "считает лидобалы и показывает,\\Nкакой филиал отстаёт.")],
    [(0.0, 4.7, "А маркетолог филиала\\Nсразу видит задачи:"), (4.8, 6.3, "где дорогой лид,"),
     (6.3, 8.4, "где заявки не обработаны,"), (8.4, 10.0, "где заканчивается бюджет.")],
    [(0.0, 2.3, "Раньше — три часа в день."), (2.3, 5.3, "Теперь — пять минут в 10 утра."),
     (5.3, 10.0, "Это больше 60 часов в месяц.")],
]
# тайминги под озвучку ElevenLabs (voice.py) — используются, когда задан VOICE_DIR
VOICE_SUBS = [
    [(1.4, 3.05, "Четырнадцать филиалов."), (3.05, 5.3, "CRM, Facebook, Google…"),
     (5.3, 10.0, "Каждое утро — три часа в таблицах,\\Nчтобы понять, кто проваливает план.")],
    [(0.0, 2.55, "Тогда мы с Claude сделали сервис."), (2.6, 4.35, "Он сам собирает данные,"),
     (4.4, 10.0, "считает лидобалы и показывает,\\Nкакой филиал отстаёт.")],
    [(0.0, 3.3, "А маркетолог филиала\\Nсразу видит задачи:"), (3.35, 4.75, "где дорогой лид,"),
     (4.8, 6.75, "где заявки не обработаны,"), (6.8, 10.0, "где заканчивается бюджет.")],
    [(0.0, 2.3, "Раньше — три часа в день."), (2.35, 4.95, "Теперь — пять минут в 10 утра."),
     (5.0, 10.0, "Это больше 60 часов в месяц.")],
]
BIG_AT = (2.4, 5.4)        # когда появляются «3 ч → 5 мин» и «−60 ч в месяц» (с от начала сцены 4)
VOICE_BIG_AT = (2.4, 5.0)
CHIPS = [(0, "ПРОБЛЕМА"), (1, "ЧТО СДЕЛАЛИ"), (3, "СКОЛЬКО ЭКОНОМИТ")]

HEADER = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Inter SemiBold,58,&H00FFFFFF,&H00FFFFFF,&H00000000,&H66000000,0,0,0,0,100,100,0,0,3,18,0,2,70,70,170,1
Style: Chip,Inter,40,&H00FFFFFF,&H00FFFFFF,&H00E0702F,&H00E0702F,1,0,0,0,100,100,3,0,3,20,0,8,70,70,150,1
Style: Demo,Inter,30,&H00FFFFFF,&H00FFFFFF,&H88000000,&H88000000,0,0,0,0,100,100,1,0,3,10,0,9,40,40,250,1
Style: Big,Inter,120,&H00FFFFFF,&H00FFFFFF,&H33000000,&H66000000,1,0,0,0,100,100,0,0,1,6,4,8,60,60,330,1
Style: Big2,Inter,96,&H0045D3FF,&H0045D3FF,&H33000000,&H66000000,1,0,0,0,100,100,0,0,1,6,4,8,60,60,500,1
Style: End,Inter,52,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,80,80,0,1
"""

END_CARD = ("{\\fad(400,0)}{\\fs40\\c&HB8B8B8&}сервис для маркетологов филиалов\\N"
            "{\\fs104\\b1\\c&HFFFFFF&}План лидобалов{\\b0}\\N\\N"
            "{\\fs56\\c&H45D3FF&}3 часа → 5 минут в день\\N"
            "{\\fs56\\c&H45D3FF&}−60 часов рутины в месяц\\N\\N"
            "{\\fs40\\c&HB8B8B8&}CRM · Facebook · Google Ads · каждое утро в 10:00\\N"
            "{\\fs44\\c&HFFFFFF&}Сделано вместе с Claude")

def ts(t):
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"

def dur(f):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", f]))

def masks(tmp):
    m = Image.new("L", (PIP_W, PIP_H), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, PIP_W - 1, PIP_H - 1), PIP_R, fill=255)
    m.save(f"{tmp}/mask.png")
    b = Image.new("RGBA", (PIP_W + 12, PIP_H + 12), (0, 0, 0, 0))
    ImageDraw.Draw(b).rounded_rectangle((0, 0, PIP_W + 11, PIP_H + 11), PIP_R + 6, fill=(255, 255, 255, 255))
    b.save(f"{tmp}/border.png")

def subtitles(starts, ui, total, path, voice=False):
    ev = []
    big = VOICE_BIG_AT if voice else BIG_AT
    for i, lines in enumerate(VOICE_SUBS if voice else SUBS):
        ev += [(starts[i] + a, starts[i] + b, "Sub", t) for a, b, t in lines]
    for i, t in CHIPS:
        ev.append((starts[i] + 0.15, starts[i] + 2.6, "Chip", "{\\fad(200,250)}" + t))
    for a, b in ui:
        ev.append((a, b, "Demo", "{\\fad(200,200)}демо-данные"))
    s4 = starts[3]
    ev.append((s4 + big[0], s4 + 10.0, "Big", "{\\fad(250,200)}3 ч → 5 мин"))
    ev.append((s4 + big[1], s4 + 10.0, "Big2", "{\\fad(250,200)}−60 ч в месяц"))
    ev.append((total - END, total, "End", END_CARD))
    with open(path, "w") as f:
        f.write(HEADER + "\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
        f.writelines(f"Dialogue: 0,{ts(a)},{ts(b)},{s},,0,0,0,,{t}\n" for a, b, s, t in ev)

def main(clips, frames, out):
    tmp = os.path.join(os.path.dirname(os.path.abspath(out)), "_build")
    os.makedirs(tmp, exist_ok=True)
    masks(tmp)
    names = ["s1_problem", "s2_solution", "s3_tasks", "s4_result"]
    files = [os.path.join(clips, n + ".mp4") for n in names]
    d = [dur(f) for f in files]
    starts = [sum(d[:i]) for i in range(4)]
    total = sum(d) + END
    cut = 2.9  # в сцене 2 первые секунды — героиня во весь кадр, дальше экран сервиса
    na, nb = (len(os.listdir(os.path.join(frames, x))) for x in "ab")
    ua_len, ub_len = d[1] - cut, d[2]
    subtitles(starts, [(starts[1] + cut, starts[3])], total, f"{tmp}/subs.ass", bool(os.environ.get("VOICE_DIR")))

    voice = os.environ.get("VOICE_DIR")
    full = f"scale={W + 14}:{H},crop={W}:{H},fps={FPS},setsar=1"
    pip = f"scale={PIP_W}:{PIP_H},fps={FPS},format=yuva420p[pc{{i}}];[pc{{i}}][m{{i}}]alphamerge[pm{{i}}]"
    fc = [
        f"[0:v]{full}[v1]",
        f"[1:v]split[s2a][s2b]",
        f"[s2a]trim=0:{cut},setpts=PTS-STARTPTS,{full}[v2]",
        f"[s2b]trim={cut}:{d[1]},setpts=PTS-STARTPTS," + pip.format(i=1),
        f"[4:v]setpts=PTS*{ua_len / (na / FPS):.5f},fps={FPS},trim=0:{ua_len},setpts=PTS-STARTPTS,setsar=1[ua]",
        f"[ua][b1]overlay={PIP_X - 6}:{PIP_Y - 6}:shortest=1[ua2];[ua2][pm1]overlay={PIP_X}:{PIP_Y}:shortest=1,trim=0:{ua_len},setpts=PTS-STARTPTS[v3]",
        f"[2:v]trim=0:{ub_len},setpts=PTS-STARTPTS," + pip.format(i=2),
        f"[5:v]fps={FPS},tpad=stop_mode=clone:stop_duration=1,trim=0:{ub_len},setpts=PTS-STARTPTS,setsar=1[ub]",
        f"[ub][b2]overlay={PIP_X - 6}:{PIP_Y - 6}:shortest=1[ub2];[ub2][pm2]overlay={PIP_X}:{PIP_Y}:shortest=1,trim=0:{ub_len},setpts=PTS-STARTPTS[v4]",
        f"[3:v]{full}[v5]",
        f"color=c=0x14213d:s={W}x{H}:r={FPS}:d={END},setsar=1[v6]",
        f"[6:v]split[m1][m2]",
        f"[7:v]split[b1][b2]",
        "[v1][v2][v3][v4][v5][v6]concat=n=6:v=1:a=0,format=yuv420p,ass=" + f"{tmp}/subs.ass[vo]",
        # финальная карточка: мягкий аккорд вместо тишины
        f"aevalsrc='0.06*(sin(2*PI*261.6*t)+sin(2*PI*329.6*t)+sin(2*PI*392*t))*exp(-0.6*t)':s=48000:d={END},"
        "aformat=channel_layouts=stereo,afade=t=in:d=0.05,afade=t=out:st=" + f"{END - 1.2}:d=1.2[ae]",
        # голос: из клипов Vivix или, если задан VOICE_DIR, озвучка ElevenLabs (voice.py)
        ";".join(f"[{i + 8 if voice else i}:a]aresample=48000,aformat=channel_layouts=stereo[a{i + 1}]" for i in range(4)),
        "[a1][a2][a3][a4]concat=n=4:v=0:a=1,loudnorm=I=-14:TP=-1[av];[av][ae]concat=n=2:v=0:a=1[ao]",
    ]
    voice = os.environ.get("VOICE_DIR")
    voice_in = sum([["-i", os.path.join(voice, n + ".wav")] for n in names], []) if voice else []
    cmd = ["ffmpeg", "-v", "error", "-y", *sum([["-i", f] for f in files], []),
           "-framerate", str(FPS), "-i", os.path.join(frames, "a", "%04d.jpg"),
           "-framerate", str(FPS), "-i", os.path.join(frames, "b", "%04d.jpg"),
           "-loop", "1", "-t", "12", "-i", f"{tmp}/mask.png", "-loop", "1", "-t", "12", "-i", f"{tmp}/border.png",
           *voice_in, "-filter_complex", ";".join(fc), "-map", "[vo]", "-map", "[ao]", "-t", f"{total:.3f}",
           "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", out]
    subprocess.check_call(cmd)
    print(out, f"{total:.1f} c")

if __name__ == "__main__":
    main(*sys.argv[1:4])
