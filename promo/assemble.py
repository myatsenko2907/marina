"""Собирает ролик: сцены Vivix + запись экрана сервиса + субтитры, плашки и финальная карточка.

python3 assemble.py CLIPS_DIR FRAMES_DIR OUT.mp4
CLIPS_DIR  — сцены со звуком из lipsync.py (s1_problem.mp4 … s4_result.mp4)
FRAMES_DIR — кадры записи экрана из record.js (папки a/ и b/, 30 к/с, 1080×1920)
"""
import os, subprocess, sys
from PIL import Image, ImageDraw

W, H, FPS = 1080, 1920, 30
PIP_W, PIP_H, PIP_R = 300, 528, 28
PIP_X, PIP_Y = W - PIP_W - 40, 960
END = 3.8  # финальная карточка, с

# (начало, конец, текст) — секунды от начала сцены; сняты с текущих клипов Vivix A1 (озвучка ElevenLabs)
SUBS = [
    [(0.3, 1.95, "106 филиалов."), (1.95, 4.4, "CRM, Facebook, Google…"),
     (4.4, 9.4, "Каждое утро — три часа в таблицах,\\Nчтобы понять, кто проваливает план.")],
    [(0.3, 2.4, "Тогда мы с Claude сделали сервис."), (2.45, 3.85, "Он сам собирает данные,"),
     (3.9, 8.1, "считает лидобалы и показывает,\\Nкакой филиал отстаёт.")],
    [(0.3, 3.3, "А маркетолог филиала\\Nсразу видит задачи:"), (3.35, 4.5, "где дорогой лид,"),
     (4.55, 6.25, "где заявки не обработаны,"), (6.3, 8.7, "где заканчивается бюджет.")],
    [(0.3, 2.3, "Раньше — три часа в день."), (2.35, 4.6, "Теперь — пять минут в 10 утра."),
     (4.65, 8.1, "Это больше 60 часов в месяц.")],
]
BIG_AT = (2.35, 4.7)  # когда появляются «3 ч → 5 мин» и «−60 ч в месяц» (с от начала сцены 4)
CUT = 2.45  # в сцене 2 до этого момента героиня во весь кадр, дальше экран сервиса
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

def subtitles(starts, ui, total, path, s4_len):
    ev = []
    big = BIG_AT
    for i, lines in enumerate(SUBS):
        ev += [(starts[i] + a, starts[i] + b, "Sub", t) for a, b, t in lines]
    for i, t in CHIPS:
        ev.append((starts[i] + 0.15, starts[i] + 2.6, "Chip", "{\\fad(200,250)}" + t))
    for a, b in ui:
        ev.append((a, b, "Demo", "{\\fad(200,200)}демо-данные"))
    s4 = starts[3]
    ev.append((s4 + big[0], s4 + s4_len, "Big", "{\\fad(250,200)}3 ч → 5 мин"))
    ev.append((s4 + big[1], s4 + s4_len, "Big2", "{\\fad(250,200)}−60 ч в месяц"))
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
    cut = CUT
    na, nb = (len(os.listdir(os.path.join(frames, x))) for x in "ab")
    ua_len, ub_len = d[1] - cut, d[2]
    subtitles(starts, [(starts[1] + cut, starts[3])], total, f"{tmp}/subs.ass", d[3])

    full = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1"
    pip = f"scale={PIP_W}:{PIP_H}:force_original_aspect_ratio=increase,crop={PIP_W}:{PIP_H},fps={FPS},format=yuva420p[pc{{i}}];[pc{{i}}][m{{i}}]alphamerge[pm{{i}}]"
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
        ";".join(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo[a{i + 1}]" for i in range(4)),
        "[a1][a2][a3][a4]concat=n=4:v=0:a=1,loudnorm=I=-14:TP=-1[av];[av][ae]concat=n=2:v=0:a=1[ao]",
    ]
    cmd = ["ffmpeg", "-v", "error", "-y", *sum([["-i", f] for f in files], []),
           "-framerate", str(FPS), "-i", os.path.join(frames, "a", "%04d.jpg"),
           "-framerate", str(FPS), "-i", os.path.join(frames, "b", "%04d.jpg"),
           "-loop", "1", "-t", "12", "-i", f"{tmp}/mask.png", "-loop", "1", "-t", "12", "-i", f"{tmp}/border.png",
           "-filter_complex", ";".join(fc), "-map", "[vo]", "-map", "[ao]", "-t", f"{total:.3f}",
           "-c:v", "libx264", "-crf", "20", "-preset", "slow", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", out]
    subprocess.check_call(cmd)
    print(out, f"{total:.1f} c")

if __name__ == "__main__":
    main(*sys.argv[1:4])
