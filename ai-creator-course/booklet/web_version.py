"""Веб-версія детальної програми для публікації посиланням (Artifact).

Запуск: python3 web_version.py <вихідний.html>
Бере program.html, прибирає обгортку документа, переводить шляхи до обкладинок на videos/
і масштабує сторінки A4 під ширину екрана.
"""
import re, sys, pathlib

HERE = pathlib.Path(__file__).parent
s = (HERE / "program.html").read_text()
s = re.sub(r"<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset=\"utf-8\">", "", s, flags=re.I)
s = s.replace("<title>AI Creator · Детальна програма курсу</title>",
              '<meta name="claude:viewport-fit-sides" content="cover">\n<title>AI Creator: програма курсу</title>')
s = s.replace("</head><body>", "").replace("</body></html>", "")
s = s.replace("../landing/videos/", "videos/")

screen = """
<style>
  @media screen{
    :root{color-scheme:light}
    html,body{background:#E9E6E0}
    body{padding-block:24px 40px;padding-left:max(12px,env(safe-area-inset-left,0px));padding-right:max(12px,env(safe-area-inset-right,0px))}
    .sheet{width:210mm;margin:0 auto;display:grid;gap:18px;transform-origin:top left}
    .page{box-shadow:0 20px 50px -25px rgba(18,19,23,.45);border-radius:6px}
    .bar{max-width:210mm;margin:0 auto 18px;display:flex;justify-content:space-between;align-items:center;gap:12px;font:800 14px/1.3 'Manrope',sans-serif;color:#121317}
    .bar span{color:#5E6270;font-weight:700}
  }
</style>
"""
script = """
<script>
  // Масштабуємо A4-сторінки під ширину екрана
  (function(){
    const sheet = document.querySelector('.sheet');
    function fit(){
      const avail = document.documentElement.clientWidth - 24;
      const w = sheet.scrollWidth || 794;
      const k = Math.min(1, avail / w);
      sheet.style.zoom = k;
    }
    addEventListener('resize', fit); fit();
  })();
</script>
"""
# огортаємо сторінки в .sheet
first = s.index('<div class="page cover">')
s = s[:first] + screen + '<div class="bar">AI Creator · Детальна програма курсу<span>4 місяці · 32 заняття · 72+ робіт</span></div>\n<div class="sheet">\n' + s[first:] + "\n</div>\n" + script
pathlib.Path(sys.argv[1]).write_text(s)
print("ok")
