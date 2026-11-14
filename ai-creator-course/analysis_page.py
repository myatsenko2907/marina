"""Сторінка «Анализ рынка и программа» з README.md у стилі сайту.

Запуск: python3 analysis_page.py <вихідний.html>
Вихідний файл без <html>/<head>/<body>: його публікують як Artifact.
"""
import re, sys, pathlib, markdown

HERE = pathlib.Path(__file__).parent
md = (HERE / "README.md").read_text()

# прибираємо заголовок і рядок версії: вони йдуть у hero
md = re.sub(r"^# .*\n+\*[^\n]*\*\n+---\n", "", md, count=1)
md = re.sub(r"(https?://[^\s,;)]+)", r"<\1>", md) if False else md

body = markdown.markdown(md, extensions=["tables", "sane_lists"])
# голі посилання в джерелах робимо клікабельними
body = re.sub(r'(?<![">])(https?://[^\s<,;)]+)', r'<a href="\1">\1</a>', body)
# кожен розділ h2 — окрема картка з якорем
parts = re.split(r"(?=<h2>)", body)
cards, toc = [], []
for i, p in enumerate(parts):
    p = p.replace("<hr />", "").strip()
    if not p:
        continue
    m = re.match(r"<h2>(.*?)</h2>", p)
    if m:
        sid = f"s{i}"
        title = re.sub(r"<.*?>", "", m.group(1))
        toc.append(f'<a href="#{sid}">{title}</a>')
        p = p.replace("<h2>", f'<h2 id="{sid}">', 1)
    cards.append(f'<section class="card">{p}</section>')
# таблиці в обгортку з горизонтальним скролом
html_cards = "\n".join(cards).replace("<table>", '<div class="tw"><table>').replace("</table>", "</table></div>")

page = f'''<meta name="claude:viewport-fit-sides" content="cover">
<title>AI Creator: анализ рынка</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800;900&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  /* Макет: світлий звіт у стилі лендингу; hero з градієнтом, зміст-чипи, розділи-картки */
  :root{{color-scheme:light;--bg:#FBFAF8;--card:#fff;--ink:#121317;--sub:#5E6270;--line:#E8E6E1;--hot:#FF4A1C;--pink:#FF2D78;--amber:#FFB01F;
    --grad:linear-gradient(100deg,#FF4A1C 0%,#FF2D78 55%,#FFB01F 110%);--display:'Unbounded',system-ui,sans-serif;--text:'Manrope',system-ui,sans-serif}}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:var(--bg);color:var(--ink);font:500 16px/1.6 var(--text);-webkit-font-smoothing:antialiased}}
  .wrap{{max-width:1080px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
  .hero{{position:relative;overflow:hidden;padding-block:56px 36px}}
  .hero::before{{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(40% 60% at 90% 10%,rgba(255,45,120,.2),transparent 70%),radial-gradient(40% 60% at 70% 100%,rgba(255,176,31,.22),transparent 70%)}}
  .tag{{display:inline-flex;align-items:center;gap:8px;font:800 12px/1 var(--text);letter-spacing:.12em;text-transform:uppercase;padding:9px 14px;border-radius:999px;background:#fff;border:1px solid var(--line)}}
  .tag::before{{content:"";width:8px;height:8px;border-radius:50%;background:var(--grad)}}
  h1{{font:900 clamp(34px,6vw,68px)/1 var(--display);letter-spacing:-.045em;margin:18px 0 16px;text-wrap:balance}}
  .g{{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}}
  .hero p{{font-size:18px;color:var(--sub);max-width:680px}}
  .kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:28px}}
  .kpis div{{background:#fff;border:1px solid var(--line);border-radius:20px;padding:18px}}
  .kpis b{{display:block;font:900 30px/1 var(--display);letter-spacing:-.04em}}
  .kpis span{{font-size:13px;color:var(--sub);font-weight:700}}
  .kpis div:first-child{{background:var(--grad);color:#fff;border-color:transparent}}
  .kpis div:first-child span{{color:#fff}}
  .toc{{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:rgba(251,250,248,.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-block:1px solid var(--line)}}
  .toc .wrap{{display:flex;gap:8px;overflow-x:auto;padding-block:10px;scrollbar-width:none}}
  .toc a{{flex:none;font:700 13px var(--text);text-decoration:none;color:var(--sub);background:#fff;border:1px solid var(--line);padding:7px 12px;border-radius:999px;white-space:nowrap}}
  .toc a:hover{{color:var(--ink);border-color:var(--ink)}}
  body::before{{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--bg)}}
  main{{padding-block:28px 60px;display:grid;gap:16px}}
  .card{{background:var(--card);border:1px solid var(--line);border-radius:26px;padding:28px;min-width:0}}
  .card h2{{font:800 clamp(22px,3.2vw,32px)/1.1 var(--display);letter-spacing:-.03em;margin-bottom:16px;scroll-margin-top:70px}}
  .card h3{{font:700 18px/1.25 var(--display);letter-spacing:-.02em;margin:24px 0 10px}}
  .card p,.card li{{color:#33363F}}
  .card p{{margin:10px 0}}
  .card ul,.card ol{{padding-left:22px;display:grid;gap:6px;margin:10px 0}}
  .card strong{{color:var(--ink)}}
  .card a{{color:var(--pink);text-decoration:none;word-break:break-word}}
  .card a:hover{{text-decoration:underline}}
  .card blockquote{{margin:12px 0;padding:14px 18px;border-radius:16px;background:#FFF1E9;border-left:4px solid var(--hot)}}
  .card blockquote p{{margin:0}}
  .tw{{overflow-x:auto;margin:14px 0;border:1px solid var(--line);border-radius:16px}}
  table{{border-collapse:collapse;width:100%;min-width:560px;font-size:14px}}
  th,td{{text-align:left;vertical-align:top;padding:11px 14px;border-bottom:1px solid var(--line)}}
  th{{background:var(--bg);font:800 12px var(--text);letter-spacing:.04em;text-transform:uppercase;color:var(--sub)}}
  tr:last-child td{{border-bottom:0}}
  td:first-child{{font-weight:700}}
  footer{{padding-block:20px 50px;color:var(--sub);font-size:13px;text-align:center}}
</style>

<div class="hero"><div class="wrap">
  <span class="tag">Анализ рынка · 14.11.2026</span>
  <h1>Курс <span class="g">AI Creator</span>: анализ рынка и программа</h1>
  <p>Конкуренты в Украине, России и США, цифры спроса, позиционирование, программа на 4 месяца, цены, маркетинг и риски.</p>
  <div class="kpis">
    <div><b>+329%</b><span>спрос на AI-видео, Upwork</span></div>
    <div><b>+84%</b><span>медиана AI creator, Work.ua</span></div>
    <div><b>4 мес</b><span>16 недель, 32 занятия</span></div>
    <div><b>70+</b><span>работ в портфолио</span></div>
  </div>
</div></div>
<nav class="toc" aria-label="Разделы"><div class="wrap">{"".join(toc)}</div></nav>
<main class="wrap">
{html_cards}
</main>
<footer>AI Creator · анализ рынка и программа курса</footer>
'''
pathlib.Path(sys.argv[1]).write_text(page)
print("sections:", len(toc))
