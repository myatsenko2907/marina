"""Детальна програма курсу AI Creator у стилі сайту: program.html -> AI-Creator-detalna-programa.pdf

Запуск:  python3 program.py && node pdf.cjs program
Заняття і домашні завдання беруться з build.py (MODULES), тут додаються навички та портфоліо.
"""
import html, pathlib
from build import MODULES, TARIFFS

HERE = pathlib.Path(__file__).parent
e = html.escape
V = "../landing/videos/"  # обкладинки роликів із сайту

# Що студент вміє після кожного модуля
SKILLS = {
    "0": ["Розумієш ринок AI-контенту: хто замовляє, що і за скільки",
          "Пишеш промпти за структурою «роль, контекст, формат, приклади»",
          "Маєш власного AI-асистента для ідей, сценаріїв і промптів",
          "Зібрав робочий набір нейромереж у бюджеті $30–60 на місяць"],
    "1": ["Будуєш кадр за законами світла, композиції та кольору",
          "Генеруєш фото рівня студійної зйомки в Midjourney, Flux, Imagen",
          "Редагуєш зображення: заміна фону, одягу, об'єктів, апскейл для друку",
          "Робиш предметну зйомку і картки для маркетплейсів у стилі бренду",
          "Створюєш рекламні банери і fashion-лукбуки під брендбук клієнта"],
    "2": ["Створюєш персонажа, який однаковий у будь-якій сцені",
          "Тренуєш цифрового двійника людини (LoRA)",
          "Розробляєш маскота бренду і AI-інфлюенсера з контент-планом",
          "Знаєш правила щодо прав, згоди на зовнішність і маркування AI"],
    "3": ["Мислиш як режисер: кадр, план, рух камери, ритм",
          "Генеруєш відео з тексту і з фото у Veo, Sora, Kling, Runway",
          "Тримаєш одного героя в усьому ролику без «стрибків»",
          "Монтуєш у CapCut і DaVinci: ритм, переходи, колір, звук",
          "Здаєш ролики у форматах Reels, TikTok, YouTube"],
    "4": ["Озвучуєш ролики кількома мовами і клонуєш голос в ElevenLabs",
          "Пишеш музику і джингли в Suno",
          "Робиш AI-ведучих і експертні ролики без зйомки в HeyGen"],
    "5": ["Пишеш хуки і сценарії UGC-реклами, яка продає",
          "Робиш 10 варіантів креативу для A/B-тестів",
          "Розумієш метрики реклами: CTR, hook rate, утримання",
          "Ведеш проєкт від брифу до здачі з правками і кошторисом",
          "Створюєш мультфільми і кліпи для брендів"],
    "6": ["Будуєш з AI-агентом ланцюжок «бриф → сценарій → генерація»",
          "Збираєш нодові схеми у Figma Weave, Flora, Krea",
          "Робиш 20+ креативів за годину для одного клієнта"],
    "7": ["Обираєш нішу і пакуєш себе як фахівця",
          "Знаходиш клієнтів на Upwork, Fiverr, Freelancehunt і в Instagram",
          "Рахуєш ціну, продаєш пакети й абонементи",
          "Оформлюєш ФОП, договір і права на контент, отримуєш оплату з-за кордону",
          "Спілкуєшся з іноземним клієнтом англійською за шаблонами"],
    "8": ["Обираєш спеціалізацію і доводиш проєкт до рівня агенції",
          "Збираєш шоурил і оформлюєш кейс",
          "Презентуєш роботу перед брендами й агенціями"],
}

# Які роботи потрапляють у портфоліо
PORTFOLIO = {
    "0": ["AI-асистент для креативу", "Банк з 10 рекламних ідей для бренду"],
    "1": ["Предметна зйомка товару (10 фото)", "Серія карток для маркетплейсу", "Рекламні банери для соцмереж", "Fashion-лукбук"],
    "2": ["Маскот бренду в 10 сценах", "Профіль AI-інфлюенсера", "Цифровий двійник"],
    "3": ["Продуктовий ролик 30 с", "3 вертикальні відео для Reels і TikTok", "Відеоетюди щотижня"],
    "4": ["Ролик з AI-ведучим двома мовами", "Джингл для бренду"],
    "5": ["Пакет UGC-креативів", "Рекламний ролик за брифом партнера", "Мультфільм або кліп"],
    "6": ["Система «бриф → 20 креативів за годину»", "Серія креативів, зроблених системою"],
    "7": ["Сайт-портфоліо і профіль на Upwork", "Прайс і медіакит"],
    "8": ["Фінальний проєкт для замовника", "Шоурил 30–60 с", "Оформлений кейс"],
}

FINAL_SKILLS = [
    ("Візуал і AI-фото", "Створюєш комерційні фото рівня студії: предметка, fashion, банери, маркетплейси."),
    ("AI-відео", "Генеруєш і монтуєш рекламні ролики, мультфільми, кліпи під будь-яку платформу."),
    ("Персонажі та аватари", "Робиш маскотів, цифрових двійників, AI-ведучих і інфлюенсерів."),
    ("Реклама, що продає", "Пишеш хуки й сценарії, робиш UGC-креативи і варіанти для тестів."),
    ("Масове виробництво", "Будуєш AI-агентів і схеми, які роблять десятки креативів за годину."),
    ("Бізнес і продажі", "Знаходиш клієнтів, рахуєш ціну, оформлюєш договір і працюєш з іноземцями."),
]

TRACKS = [
    ("AI-реклама і UGC", "Performance-креативи і UGC для брендів та e-commerce."),
    ("AI-фільммейкінг", "Кліпи, короткий метр, серіали, реклама «під ТБ»."),
    ("AI-персонажі", "Віртуальні блогери, маскоти, цифрові двійники та їх монетизація."),
    ("AI-автоматизація", "Контент-системи й агенти для бізнесу."),
]

TOOLS = [
    ("Тексти й ідеї", "ChatGPT, Claude, Gemini"),
    ("Зображення", "Midjourney, Flux, Imagen, Nano Banana, Ideogram, Krea, Topaz, Magnific"),
    ("Відео", "Veo, Sora, Kling, Runway, Seedance, Higgsfield"),
    ("Звук і аватари", "ElevenLabs, Suno, Udio, HeyGen, Synthesia"),
    ("Монтаж і дизайн", "CapCut, DaVinci Resolve, Canva, Figma"),
    ("Агенти й автоматизація", "Claude, ChatGPT-агенти, Figma Weave, Flora, Krea Nodes, n8n"),
    ("Портфоліо і клієнти", "Behance, Framer, Upwork, Fiverr, Contra, Freelancehunt, LinkedIn"),
]

POSTERS = ["v-3d", "v-cinema", "v-anime", "v-avatar", "v-clay", "v-folk", "v-scifi", "v-street"]


def head(section, n):
    return f'<div class="ph"><span><i></i>{e(section)}</span><span>AI Creator · Детальна програма</span></div><div class="pf">{n:02d}</div>'


def module_page(m, start_no, page_no, poster):
    lessons = "".join(
        f'<div class="ls"><span class="no">{start_no + i:02d}</span><div><h4>{e(t)}</h4><p>{e(d)}</p></div></div>'
        for i, (t, d) in enumerate(m["lessons"]))
    skills = "".join(f"<li>{e(s)}</li>" for s in SKILLS[m["n"]])
    port = "".join(f"<li>{e(s)}</li>" for s in PORTFOLIO[m["n"]])
    return f'''
<div class="page">
  {head("Модуль " + m["n"], page_no)}
  <div class="mhero">
    <div class="mtext">
      <span class="mk">Модуль {m["n"]} · {e(m["weeks"])} · {len(m["lessons"])} занять</span>
      <h2>{e(m["title"])}</h2>
      <p class="goal">{e(m["goal"])}</p>
    </div>
    <div class="mimg"><img src="{V}{poster}.jpg" alt=""><span class="mnum">{m["n"]}</span></div>
  </div>
  <div class="two">
    <div class="box skills"><h3>Після модуля ти вмієш</h3><ul>{skills}</ul></div>
    <div class="box port"><h3><b>+{m["works"]}</b> у портфоліо</h3><ul>{port}</ul></div>
  </div>
  <h3 class="h3">Заняття</h3>
  <div class="lessons">{lessons}</div>
  <div class="hw"><b>Домашнє завдання</b><span>{e(m["hw"])}</span></div>
  <p class="tools"><b>Інструменти:</b> {e(m["tools"])}</p>
</div>'''


def build():
    starts, no = [], 1
    for m in MODULES:
        starts.append(no); no += len(m["lessons"])
    total_lessons = no - 1
    total_works = sum(m["works"] for m in MODULES)

    mods = "".join(module_page(m, starts[i], i + 4, POSTERS[i % len(POSTERS)]) for i, m in enumerate(MODULES))
    p = len(MODULES) + 4
    toc = "".join(f'<li><span class="tn">{m["n"]}</span><div><b>{e(m["title"])}</b><small>{e(m["weeks"])} · {len(m["lessons"])} занять · +{m["works"]} робіт</small></div></li>' for m in MODULES)
    port_rows = "".join(f'<div class="pr"><span class="tn">{m["n"]}</span><div><b>{e(m["title"])}</b><p>{e(" · ".join(PORTFOLIO[m["n"]]))}</p></div><em>+{m["works"]}</em></div>' for m in MODULES)
    fs = "".join(f'<div class="fs"><span class="fi">{i+1:02d}</span><h4>{e(t)}</h4><p>{e(d)}</p></div>' for i, (t, d) in enumerate(FINAL_SKILLS))
    tracks = "".join(f'<div class="tr"><b>{chr(65+i)}</b><div><h4>{e(t)}</h4><p>{e(d)}</p></div></div>' for i, (t, d) in enumerate(TRACKS))
    tools = "".join(f'<div class="tl"><b>{e(t)}</b><span>{e(d)}</span></div>' for t, d in TOOLS)
    tariffs = "".join(
        f'''<div class="tf{' hot' if t[0]=='Професія' else ''}">{'<span class="bd">Найпопулярніший</span>' if t[0]=='Професія' else ''}
        <h4>{t[0]}</h4><p class="for">{t[1]}</p><div class="prc">{t[2]} <small>грн</small></div><p class="per">або {t[3]} грн × 4 місяці</p>
        <ul>{"".join(f"<li>{e(x)}</li>" for x in t[4])}</ul></div>''' for t in TARIFFS)
    cover_imgs = "".join(f'<img src="{V}{k}.jpg" alt="">' for k in ["v-3d", "v-cinema", "v-anime"])

    doc = f'''<!doctype html><html lang="uk"><head><meta charset="utf-8"><title>AI Creator · Детальна програма курсу</title>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800;900&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>{(HERE / "program.css").read_text()}</style></head><body>

<div class="page cover">
  <div class="glow"></div><div class="grid"></div>
  <div class="logo"><i>AI</i>AI Creator</div>
  <div class="ctext">
    <span class="tag">Нова професія 2026</span>
    <h1>Детальна програма курсу <span class="g">AI&nbsp;Creator</span></h1>
    <p>Що ти вивчиш, що вмітимеш і яке портфоліо збереш за 4 місяці.</p>
  </div>
  <div class="phones">{cover_imgs}</div>
  <div class="cstats">
    <div><b>4</b><span>місяці</span></div><div><b>{total_lessons}</b><span>живих заняття</span></div>
    <div><b>9</b><span>модулів</span></div><div class="hot"><b>{total_works}+</b><span>робіт у портфоліо</span></div>
  </div>
</div>

<div class="page">
  {head("Професія", 2)}
  <span class="tag">Професія AI Creator</span>
  <h2>Режисер, оператор і дизайнер <span class="g">в одній людині</span></h2>
  <p class="lead">AI Creator отримує бриф від бренду, пише сценарій з ChatGPT або Claude, генерує кадри, оживлює їх у Veo чи Kling, додає голос і монтує готовий ролик. Те, що робила команда з 10 людей, тепер робить одна людина за день.</p>
  <div class="stats">
    <div><b class="g">+329%</b><p>зріс попит на AI-відео на Upwork за рік</p><small>Upwork, In-Demand Skills 2026</small></div>
    <div class="dark"><b>+84%</b><p>зросла медіанна зарплата AI creator в Україні</p><small>Work.ua, 2026</small></div>
    <div><b class="g">5–10×</b><p>швидше і дешевше за класичну зйомку</p><small>оцінка за ринковими кейсами</small></div>
  </div>
  <h3 class="h3">Скільки заробляє AI Creator</h3>
  <div class="ladder">
    <div><span>Старт</span><b>30–45 тис. грн</b><p>Медіана в Україні, перші клієнти і абонементи</p></div>
    <div><span>Досвід</span><b>$1500–3000</b><p>Іноземні бренди, $150–1200 за рекламний ролик</p></div>
    <div><span>Своя студія</span><b>від $5000</b><p>Команда і пакети креативів на абонементі</p></div>
  </div>
  <h3 class="h3">Де працює</h3>
  <div class="chips"><span>Рекламні агенції</span><span>Бренди та e-commerce</span><span>SMM-агенції</span><span>Upwork і Fiverr</span><span>Своя AI-студія</span></div>
</div>

<div class="page">
  {head("Формат і зміст", 3)}
  <span class="tag">Як проходить навчання</span>
  <h2>4 місяці, {total_lessons} заняття, <span class="g">{total_works}+ робіт</span></h2>
  <div class="fmt">
    <div><b>2 заняття на тиждень</b><p>Живі онлайн-заняття по 1,5 години з ментором-практиком. Записи залишаються в тебе.</p></div>
    <div><b>Генеруєш щотижня</b><p>5–7 годин практики. Кожне ДЗ дає нові роботи в портфоліо, ментор перевіряє і розбирає.</p></div>
    <div><b>Реальні брифи</b><p>Замовлення від брендів-партнерів і Demo Day перед замовниками.</p></div>
    <div class="hot"><b>Перші клієнти</b><p>Профіль на Upwork, прайс, шаблони договорів і 3 місяці кар'єрної підтримки.</p></div>
  </div>
  <h3 class="h3">Зміст програми</h3>
  <ol class="toc">{toc}</ol>
</div>

{mods}

<div class="page">
  {head("Результат", p)}
  <span class="tag">Після курсу</span>
  <h2>Що ти знатимеш і <span class="g">вмітимеш</span></h2>
  <div class="fsg">{fs}</div>
  <div class="final-box">
    <h3>На виході в тебе є</h3>
    <ul><li>Портфоліо з {total_works}+ робіт і шоурил</li><li>Сайт-портфоліо і профіль на Upwork</li><li>Прайс, медіакит і шаблони договорів</li><li>Перші клієнти та відгуки</li><li>Документ про закінчення</li><li>3 місяці кар'єрної підтримки</li></ul>
  </div>
</div>

<div class="page">
  {head("Портфоліо", p + 1)}
  <span class="tag">Твоє портфоліо</span>
  <h2><span class="g">{total_works} робіт</span> за 16 тижнів</h2>
  <p class="lead">Кожен модуль додає нові роботи. Ти генеруєш контент щотижня, тому до Demo Day портфоліо закриває всі основні запити брендів.</p>
  <div class="prs">{port_rows}</div>
  <div class="total"><span>Разом у портфоліо</span><b>{total_works}+</b></div>
</div>

<div class="page">
  {head("Спеціалізації та інструменти", p + 2)}
  <span class="tag">Тижні 15–16</span>
  <h2>Обираєш <span class="g">спеціалізацію</span></h2>
  <div class="trs">{tracks}</div>
  <h3 class="h3">Інструменти курсу</h3>
  <div class="tls">{tools}</div>
  <p class="note">Програма оновлюється щомісяця відповідно до нових нейромереж. Ми використовуємо лише міжнародні сервіси, жодних російських.</p>
</div>

<div class="page">
  {head("Вартість", p + 3)}
  <span class="tag">Вартість навчання</span>
  <h2>Обери <span class="g">свій формат</span></h2>
  <p class="lead">Оплата щомісяця або розстрочка без переплат.</p>
  <div class="tfs">{tariffs}</div>
  <div class="cta">
    <h3>Запишись на безкоштовну консультацію</h3>
    <p>Розберемо твій досвід, підберемо тариф і надішлемо урок у подарунок.</p>
    <div class="ct"><span>+380 00 000 00 00</span><span>@ai.creator.ua</span></div>
  </div>
</div>
</body></html>'''
    (HERE / "program.html").write_text(doc)
    print("pages:", p + 3, "lessons:", total_lessons, "works:", total_works)


if __name__ == "__main__":
    build()
