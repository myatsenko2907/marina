"""Збирає буклет програми курсу AI Creator: booklet.html -> AI-Creator-programa.pdf

Запуск:  python3 build.py && node pdf.cjs
Тексти програми редагуються у списку MODULES нижче.
"""
import html, pathlib

HERE = pathlib.Path(__file__).parent

MODULES = [
    dict(n="0", weeks="Тиждень 1", title="Швидкий старт у професії", color="#FF4F1F", soft="#FFE7DE",
         goal="Розумієш, як заробляє AI Creator, і налаштовуєш свій робочий набір нейромереж.",
         tools="ChatGPT, Claude, Gemini",
         lessons=[
             ("Професія AI Creator", "Ринок AI-контенту в Україні та світі. Ролі: AI-креатор, AI-відеомейкер, AI-арт-директор, AI-UGC-продюсер. Хто замовляє і скільки платить. Набір сервісів і як вкластися в $30–60 на місяць."),
             ("LLM як креативний директор", "Промпт-інжиніринг: роль, контекст, формат, приклади. Ідеї, сценарії та промпти для інших нейромереж. Власний AI-асистент (Projects / Custom GPT) під креативні задачі."),
         ],
         hw="Налаштувати AI-асистента і згенерувати 10 рекламних ідей для реального бренду.",
         works=2),
    dict(n="1", weeks="Тижні 2–4", title="AI-фото і рекламні креативи", color="#C88A00", soft="#FFF3C9",
         goal="Створюєш комерційні фото рівня студійної зйомки: предметка, fashion, банери.",
         tools="Midjourney, Flux, Imagen, Ideogram, Krea, Nano Banana, Flux Kontext, Topaz, Magnific, Canva",
         lessons=[
             ("Основи візуалу", "Композиція, світло, колір, оптика і ракурси. Чому AI-фото виглядають «пластиковими» і як цього уникнути. Мудборд і референси."),
             ("Midjourney від А до Я", "Структура промпту, параметри, стилі та стиль-коди, робота з референсами, варіації та апскейл."),
             ("Flux, Imagen, Ideogram, Krea", "Сильні сторони кожної моделі. Текст і логотипи на зображеннях. Швидкий вибір інструмента під задачу."),
             ("Редагування і апскейл", "Nano Banana і Flux Kontext: заміна фону, об'єктів, одягу. Inpainting і outpainting. Апскейл у Topaz і Magnific для друку."),
             ("Предметна зйомка і маркетплейси", "Товар у будь-якій сцені без студії. Серія карток для маркетплейсу в одному стилі. Ретуш і підготовка до публікації."),
             ("Fashion і рекламні банери", "Лукбук з моделлю, банери для соцмереж і реклами, адаптація під формати. Робота з брендбуком клієнта."),
         ],
         hw="Щотижня: серія з 5–7 комерційних фото за брифом. Розбір ментором кожної серії.",
         works=20),
    dict(n="2", weeks="Тиждень 5", title="Персонажі, маскоти, цифрові двійники", color="#1F7AD6", soft="#DDF0FF",
         goal="Створюєш персонажа, який виглядає однаково в будь-якій сцені.",
         tools="LoRA-тренування, Higgsfield, Nano Banana, Midjourney (character reference)",
         lessons=[
             ("Консистентні персонажі", "Цифровий двійник людини: тренування LoRA на фото. Character reference. Один герой у десятках сцен."),
             ("Маскот бренду і AI-інфлюенсер", "Концепт, візуальна біблія, контент-план. Права і етика: згода на зовнішність, діпфейки, маркування AI-контенту."),
         ],
         hw="Маскот бренду в 10 різних сценах + профіль AI-інфлюенсера.",
         works=10),
    dict(n="3", weeks="Тижні 6–8", title="AI-відео і монтаж", color="#4F8A00", soft="#EAF8C9",
         goal="Робиш продуктові та рекламні ролики з кадрів, згенерованих AI, і монтуєш їх під будь-яку платформу.",
         tools="Veo, Sora, Kling, Runway, Seedance, Higgsfield, CapCut, DaVinci Resolve",
         lessons=[
             ("Мова кіно", "Кадр, план, ракурс, рух камери, ритм. Сторіборд у нейромережах перед генерацією відео."),
             ("Veo і Sora", "Text-to-video: як описувати рух, світло і камеру. Звук у Veo. Типові помилки і як їх виправляти."),
             ("Kling, Runway, Seedance", "Image-to-video, перший і останній кадр, контроль руху, подовження сцени."),
             ("Higgsfield і консистентність", "Кінематографічні рухи камери. Один герой у всьому ролику. Склейка сцен без «стрибків»."),
             ("Монтаж", "CapCut і DaVinci Resolve: ритм, переходи, кольорокорекція, робота зі звуком."),
             ("Формати для платформ", "Reels, TikTok, YouTube Shorts і горизонтальне відео. Субтитри, обкладинки, експорт без втрати якості."),
         ],
         hw="Продуктовий ролик 30 с + 3 вертикальні відео + щотижневі відеоетюди.",
         works=12),
    dict(n="4", weeks="Тиждень 9", title="Голос, музика, AI-аватари", color="#8A3FD1", soft="#EFE3FB",
         goal="Додаєш до роликів озвучку, музику і ведучих, що говорять.",
         tools="ElevenLabs, Suno, Udio, HeyGen, Synthesia",
         lessons=[
             ("Голос і музика", "ElevenLabs: озвучка, клонування голосу, кілька мов. Музика і джингли в Suno, саунд-дизайн."),
             ("AI-аватари", "Аватари, що говорять: HeyGen і Synthesia. Lip-sync для згенерованих персонажів. Експертні ролики без зйомки."),
         ],
         hw="Ролик з AI-ведучим українською та англійською.",
         works=4),
    dict(n="5", weeks="Тижні 10–11", title="Реклама, за яку платять: UGC і промо", color="#FF4F1F", soft="#FFE7DE",
         goal="Створюєш рекламні креативи, які бізнес запускає в Meta і TikTok Ads.",
         tools="Higgsfield, HeyGen, Veo, Kling, ElevenLabs, CapCut",
         lessons=[
             ("AI-UGC реклама", "Відгуки «від покупця» з AI-персонажами. Структура «проблема → рішення → заклик». Хуки на перші 3 секунди."),
             ("Performance-креативи", "10 варіантів креативу для A/B-тестів. Метрики: CTR, hook rate, утримання. Як говорити з таргетологом."),
             ("Рекламний ролик бренду", "Від брифу до здачі: сценарій, кадри, відео, звук, правки. Таймінг і кошторис."),
             ("Мультфільми і кліпи", "Анімаційні ролики з маскотом, музичні кліпи, дитячий контент. Робота з реальним брифом від бренду-партнера."),
         ],
         hw="Пакет UGC-креативів + рекламний ролик за реальним брифом партнера.",
         works=12),
    dict(n="6", weeks="Тиждень 12", title="AI-агенти і масове виробництво", color="#1F7AD6", soft="#DDF0FF",
         goal="Будуєш систему, яка робить десятки креативів за годину.",
         tools="Claude, ChatGPT-агенти, Figma Weave, Flora, Krea Nodes, n8n",
         lessons=[
             ("AI-агент як продюсер", "Claude і ChatGPT ведуть ланцюжок «бриф → сценарії → промпти → генерація». Підключення Google Drive, Figma, Canva."),
             ("Нодові креативні схеми", "Figma Weave, Flora, Krea Nodes: одна схема дає 50 варіантів. Заміна товару, фону, мови в один клік. Запуск за розкладом."),
         ],
         hw="Система «бриф клієнта → 20 креативів за годину» для одного бізнесу.",
         works=5),
    dict(n="7", weeks="Тижні 13–14", title="Перші гроші: клієнти, ціни, договори", color="#C88A00", soft="#FFF3C9",
         goal="Пакуєш себе як фахівця, знаходиш клієнтів і отримуєш перше замовлення.",
         tools="Behance, Framer, Upwork, Fiverr, Contra, Freelancehunt, LinkedIn",
         lessons=[
             ("Ніша і упаковка", "Вибір ніші, офер, портфоліо на Behance, шоурил, сайт-візитка у Framer за годину."),
             ("Пошук клієнтів", "Upwork, Fiverr, Contra, Freelancehunt, LinkedIn, Instagram. Відгуки на вакансії і холодні листи, які читають."),
             ("Ціни і переговори", "Ціна за одиницю, пакет, абонемент. Як підняти чек зі $100 до $1000. Правки, дедлайни, повторні замовлення."),
             ("Юридичне і англійська", "ФОП, договір, права на AI-контент, оплата з-за кордону (Payoneer, Wise). Шаблони листів і дзвінка з клієнтом англійською."),
         ],
         hw="Профіль на Upwork, прайс, 10 відгуків на вакансії, перше замовлення.",
         works=2),
    dict(n="8", weeks="Тижні 15–16", title="Спеціалізація, фінальний проєкт, Demo Day", color="#4F8A00", soft="#EAF8C9",
         goal="Робиш фінальний проєкт для реального замовника і показуєш його брендам та агенціям.",
         tools="Увесь набір курсу",
         lessons=[
             ("Вибір треку і старт проєкту", "Треки: AI-реклама і UGC, AI-фільммейкінг, AI-персонажі та інфлюенсери, AI-автоматизація контенту. Бриф від замовника."),
             ("Робота з ментором", "Розбір чернеток, сценарію і кадрів. Робота з правками як у реальному продакшні."),
             ("Шоурил і кейс", "Фінальний монтаж, шоурил 30–60 с, опис кейсу для портфоліо."),
             ("Demo Day", "Захист перед брендами, агенціями та рекрутерами. Зворотний зв'язок і знайомства з замовниками."),
         ],
         hw="Фінальний проєкт, шоурил і кейс у портфоліо.",
         works=5),
]

TOTAL_WORKS = sum(m["works"] for m in MODULES)

TARIFFS = [
    ("Старт", "Для себе і свого бізнесу", "31 200", "7 800",
     ["Усі 9 модулів, живі заняття і записи", "Розбір ДЗ у групі", "Чат курсу"]),
    ("Професія", "Щоб заробляти на AI", "40 800", "10 200",
     ["Усе з тарифу «Старт»", "Особиста перевірка кожного ДЗ", "Реальні брифи і Demo Day", "3 місяці кар'єрної підтримки", "Документ про закінчення"]),
    ("PRO", "Максимум уваги ментора", "82 800", "20 700",
     ["Усе з тарифу «Професія»", "4 консультації 1:1 з ментором", "Розбір портфоліо і профілю на Upwork", "Особиста стратегія пошуку клієнтів", "Пріоритетні відповіді в чаті"]),
]

e = html.escape


def art(kind):
    return {
        "product": '<div class="art a-product"><div class="shadow"></div><span class="tag">SÉRUM</span></div>',
        "ugc": '<div class="art a-ugc"><div class="hair"></div><div class="face"></div><div class="body"></div></div>',
        "mascot": '<div class="art a-mascot"><div class="m"></div><div class="smile"></div></div>',
        "fashion": '<div class="art a-fashion"><div class="arch"></div><div class="fig"></div></div>',
        "infl": '<div class="art a-infl"><div class="ring"></div><div class="hair"></div><div class="face"></div><div class="body"></div></div>',
        "clip": '<div class="art a-clip"></div>',
    }[kind]


def module_page(m, start_no):
    rows = []
    for i, (t, d) in enumerate(m["lessons"]):
        rows.append(f'<div class="ls"><span class="no">{start_no + i:02d}</span><div><h4>{e(t)}</h4><p>{e(d)}</p></div></div>')
    return f'''
<section class="mod" style="--c:{m["color"]};--cs:{m["soft"]}">
  <div class="mhead">
    <div class="mnum">{m["n"]}</div>
    <div><div class="mweeks">Модуль {m["n"]} · {e(m["weeks"])} · {len(m["lessons"])} занять</div><h3>{e(m["title"])}</h3></div>
  </div>
  <p class="goal">{e(m["goal"])}</p>
  <div class="lessons">{"".join(rows)}</div>
  <div class="mfoot">
    <div><b>Домашнє завдання</b><span>{e(m["hw"])}</span></div>
    <div class="w"><b>+{m["works"]}</b><span>робіт у портфоліо</span></div>
  </div>
  <p class="tools"><b>Інструменти:</b> {e(m["tools"])}</p>
</section>'''


def build():
    css = (HERE / "booklet.css").read_text()
    art_css = (HERE / "art.css").read_text()
    # розкладка модулів по сторінках (індекси MODULES)
    LAYOUT = [[0, 1], [2, 3], [4, 5], [6, 7], [8]]
    starts, no = [], 1
    for m in MODULES:
        starts.append(no); no += len(m["lessons"])
    pages = [[module_page(MODULES[i], starts[i]) for i in grp] for grp in LAYOUT]
    total_lessons = no - 1

    toc = "".join(f'<li><span>{m["n"]}</span>{e(m["title"])}<em>{e(m["weeks"])}</em></li>' for m in MODULES)
    prog_pages = "".join(
        f'<div class="page"><div class="ph"><span>Програма курсу</span><span>AI Creator</span></div>{"".join(p)}<div class="pf">{i + 4}</div></div>'
        for i, p in enumerate(pages))
    tariffs = "".join(
        f'''<div class="tf{' hot' if t[0]=='Професія' else ''}">{'<span class="bd">Найпопулярніший</span>' if t[0]=='Професія' else ''}
        <h4>{t[0]}</h4><p class="for">{t[1]}</p><div class="pr">{t[2]} <small>грн</small></div><p class="per">або {t[3]} грн × 4 місяці</p>
        <ul>{"".join(f"<li>{e(x)}</li>" for x in t[4])}</ul></div>''' for t in TARIFFS)

    doc = f'''<!doctype html><html lang="uk"><head><meta charset="utf-8"><title>AI Creator · Програма курсу</title>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>{css}\n{art_css}</style></head><body>

<div class="page cover">
  <div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
  <div class="logo"><i>AI</i>AI Creator</div>
  <div class="ctitle">
    <span class="kick">Нова професія 2026</span>
    <h1>Детальна програма курсу <mark>AI Creator</mark></h1>
    <p>Навчись створювати рекламні відео, фото та AI-аватарів для брендів і заробляти на цьому.</p>
  </div>
  <div class="cgrid">{art("product")}{art("ugc")}{art("mascot")}{art("fashion")}{art("infl")}{art("clip")}</div>
  <div class="cstats">
    <div><b>4</b><span>місяці</span></div><div><b>{total_lessons}</b><span>живих заняття</span></div>
    <div><b>9</b><span>модулів</span></div><div><b>{TOTAL_WORKS}+</b><span>робіт у портфоліо</span></div>
  </div>
</div>

<div class="page">
  <div class="ph"><span>Про професію</span><span>AI Creator</span></div>
  <h2>Хто такий AI Creator</h2>
  <div class="def"><p><b>AI Creator</b> — режисер, оператор і дизайнер в одній людині. Він отримує бриф від бренду, пише сценарій з ChatGPT або Claude, генерує кадри в Midjourney і Nano Banana, оживлює їх у Veo чи Kling, додає голос в ElevenLabs і монтує готовий ролик. Те, що раніше робила команда з 10 людей, тепер робить одна людина за день.</p></div>
  <div class="stats3">
    <div class="s o"><b>+329%</b><p>зріс попит на AI-відео на Upwork за рік</p><small>Upwork, In-Demand Skills 2026</small></div>
    <div class="s y"><b>+84%</b><p>зросла медіанна зарплата AI creator в Україні</p><small>Work.ua, 2026</small></div>
    <div class="s l"><b>5–10×</b><p>швидше і дешевше за класичну зйомку</p><small>оцінка за ринковими кейсами</small></div>
  </div>
  <h3 class="h3">Скільки заробляє AI Creator</h3>
  <div class="ladder">
    <div><span>Старт</span><b>30–45 тис. грн</b><p>Медіана в Україні, перші клієнти і абонементи</p></div>
    <div><span>Досвід</span><b>$1500–3000</b><p>Іноземні бренди, $150–1200 за рекламний ролик</p></div>
    <div><span>Своя студія</span><b>від $5000</b><p>Команда і пакети креативів на абонементі</p></div>
  </div>
  <h3 class="h3">Де працює</h3>
  <div class="chips"><span>Рекламні агенції</span><span>Бренди та e-commerce</span><span>SMM-агенції</span><span>Фриланс: Upwork, Fiverr</span><span>Своя AI-студія</span></div>
  <div class="pf">2</div>
</div>

<div class="page">
  <div class="ph"><span>Формат навчання</span><span>AI Creator</span></div>
  <h2>Як проходить навчання</h2>
  <div class="fmt">
    <div><b>2 заняття на тиждень</b><p>Живі онлайн-заняття по 1,5 години з ментором-практиком. Записи залишаються в тебе.</p></div>
    <div><b>Ментор-практик</b><p>Вчать фахівці, які щомісяця виконують комерційні AI-замовлення.</p></div>
    <div><b>Практика щотижня</b><p>5–7 годин на домашні завдання. Кожне ДЗ перевіряє і розбирає ментор.</p></div>
    <div><b>Реальні брифи</b><p>Замовлення від брендів-партнерів і Demo Day перед замовниками.</p></div>
  </div>
  <h3 class="h3">Зміст програми</h3>
  <ol class="toc">{toc}</ol>
  <div class="result">
    <b>Після курсу в тебе є</b>
    <ul><li>Портфоліо з {TOTAL_WORKS}+ робіт і шоурил</li><li>Профіль на Upwork, прайс і шаблони договорів</li><li>Перші клієнти і відгуки</li><li>Документ про закінчення і 3 місяці кар'єрної підтримки</li></ul>
  </div>
  <div class="pf">3</div>
</div>

{prog_pages}

<div class="page">
  <div class="ph"><span>Вартість</span><span>AI Creator</span></div>
  <h2>Тарифи</h2>
  <p class="lead">Оплата щомісяця або розстрочка без переплат.</p>
  <div class="tfs">{tariffs}</div>
  <div class="cta">
    <h3>Запишись на безкоштовну консультацію</h3>
    <p>Розберемо твій досвід, підберемо тариф і надішлемо урок у подарунок.</p>
    <div class="ct"><span>+380 00 000 00 00</span><span>@ai.creator.ua</span></div>
  </div>
  <p class="note">Програма оновлюється щомісяця відповідно до нових нейромереж. Ми не використовуємо російські сервіси.</p>
  <div class="pf">{len(pages) + 4}</div>
</div>
</body></html>'''
    (HERE / "booklet.html").write_text(doc)
    print("pages:", len(pages) + 4, "lessons:", total_lessons, "works:", TOTAL_WORKS)


if __name__ == "__main__":
    build()
