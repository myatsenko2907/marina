"""Склеює кліпи серії, накладає титр, субтитри й тизер: python3 assemble.py CLIPS_DIR OUT_DIR"""
import os, subprocess, sys

from episodes import EPISODES

# (початок, кінець, текст) — секунди від початку серії; другий кліп стартує з 10.0
SUBS = {
    1: [(4.7, 9.8, "Завтра о дев'ятій — запуск кампанії.\\NА в мене нічого немає."),
        (10.0, 12.9, "На першому занятті в IT STEP"),
        (12.9, 16.0, "ми налаштували мого AI-асистента.\\NПеревіримо."),
        (17.1, 20.0, "Стоп... це за дві хвилини?!")],
    2: [(0.0, 2.6, "Контент-план на місяць,"),
        (2.6, 5.3, "20 креативів і 3 гіпотези\\Nдля A/B-тесту."),
        (7.1, 9.9, "— За одну ніч? Хто це робив?"),
        (10.0, 13.0, "Я. І мій AI-асистент."),
        (14.4, 17.2, "— Тоді для тебе є справжня задача."),
        (17.2, 20.0, "І вона тобі не сподобається.")],
    3: [(0.0, 2.7, "Реклама їсть бюджет,\\Nа продажів нуль."),
        (2.8, 5.7, "Сьогодні на курсі —\\Nаналітика воронки."),
        (10.0, 14.8, "Ось де ми втрачаємо\\N70% клієнтів!"),
        (18.9, 20.0, "Алло?")],
    4: [(0.0, 2.1, "Так, автоматизація працює:"),
        (2.2, 5.5, "чат-бот відповідає клієнтам,\\Nнавіть коли я сплю."),
        (6.0, 9.5, "Посада AI-маркетолога?\\NЯ подумаю."),
        (12.1, 15.1, "Чотири місяці тому я боялася,\\Nщо ШІ мене замінить."),
        (15.1, 18.0, "А тепер я ним керую.")],
}

CTA = ("{\\fs64\\b1}Маркетолог + AI{\\fs46\\b0} · IT STEP\\N"
       "{\\fs40}4 місяці · 70% практики · диплом двома мовами\\N"
       "{\\fs40}Перше заняття — безкоштовно\\N{\\fs36\\c&H9FE7FF&}kiev.itstep.org/marketer-ai-course")

HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Inter SemiBold,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,4,2,2,70,70,330,1
Style: Title,Inter,46,&H00FFFFFF,&H00FFFFFF,&H99000000,&H99000000,0,0,0,0,100,100,2,0,3,22,0,8,70,70,170,1
Style: Teaser,Inter SemiBold,50,&H00FFFFFF,&H00FFFFFF,&H33DB2E6A,&H33DB2E6A,0,0,0,0,100,100,0,0,3,24,0,8,70,70,600,1
Style: Cta,Inter,40,&H00FFFFFF,&H00FFFFFF,&H22201A14,&H22201A14,0,0,0,0,100,100,0,0,3,30,0,8,60,60,170,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

def ts(t):
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"

def ass(ep, end):
    lines = [(0.0, 3.2, "Title", "{\\fad(250,300)}{\\b1}МАРИНА + AI{\\b0}  ·  "
              f"серія {ep['n']}/4  ·  {ep['title']}")]
    lines += [(a, b, "Sub", t) for a, b, t in SUBS[ep["n"]]]
    if ep["teaser"]:
        lines.append((end - 1.6, end, "Teaser", "{\\fad(200,0)}Далі буде...\\N" + ep["teaser"]))
    else:
        lines.append((end - 4.0, end, "Cta", "{\\fad(400,0)}" + CTA))
    return HEADER + "".join(f"Dialogue: 0,{ts(a)},{ts(b)},{s},,0,0,0,,{t}\n" for a, b, s, t in lines)

def build(ep, clips_dir, out_dir):
    a, b = (os.path.join(clips_dir, f"ep{ep['n']}_{i}.mp4") for i in (0, 1))
    end = sum(float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                             "-of", "csv=p=0", f])) for f in (a, b))
    sub = os.path.join(out_dir, f"ep{ep['n']}.ass")
    open(sub, "w").write(ass(ep, end))
    out = os.path.join(out_dir, f"marina-ai-ep{ep['n']}.mp4")
    subprocess.check_call([
        "ffmpeg", "-v", "error", "-y", "-i", a, "-i", b, "-filter_complex",
        "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a];"
        f"[v]scale=1080:1920,setsar=1,ass={sub}[vo];[a]loudnorm=I=-14:TP=-1[ao]",
        "-map", "[vo]", "-map", "[ao]", "-c:v", "libx264", "-crf", "21", "-preset", "slow",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
        "-movflags", "+faststart", out])
    print(out)

if __name__ == "__main__":
    clips_dir, out_dir = sys.argv[1:3]
    os.makedirs(out_dir, exist_ok=True)
    for ep in EPISODES:
        build(ep, clips_dir, out_dir)
