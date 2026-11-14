// Запис анімованого слайду: node record_slide.cjs <slide.html> <duration_s> <times_json> <out.mp4>
// Пункти слайду з'являються в моменти, коли ведуча про них говорить (times — початки речень, у секундах).
const { chromium } = require('playwright');
const fs = require('fs'), { execFileSync } = require('child_process');
(async () => {
  const [html, dur, timesJson, out] = process.argv.slice(2);
  const D = parseFloat(dur), T = JSON.parse(timesJson);
  const tmp = fs.mkdtempSync('/tmp/slide-');
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } });
  const p = await ctx.newPage();
  const tRec = Date.now();
  await p.goto('file://' + html, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const t0 = Date.now();
  await p.evaluate(([D, T]) => {
    const st = document.createElement('style');
    st.textContent = `.rv{opacity:0;transform:translateY(18px) scale(.98);transition:opacity .5s ease,transform .6s cubic-bezier(.2,.8,.2,1)}.rv.in{opacity:1;transform:none}
      .slide{animation:kb ${D}s linear forwards}@keyframes kb{from{transform:scale(1)}to{transform:scale(1.035)}}
      .rv.in.flash{animation:fl 1.2s ease}@keyframes fl{0%{box-shadow:0 0 0 0 rgba(255,45,120,.5)}100%{box-shadow:0 0 0 14px rgba(255,45,120,0)}}`;
    document.head.appendChild(st);
    const head = [...document.querySelectorAll('.pill, h1, h2, .sub')];
    head.forEach((e, i) => { e.classList.add('rv'); setTimeout(() => e.classList.add('in'), 150 + i * 250); });
    const items = [...document.querySelectorAll('.list>div, .cmp>div, .formula>div, .formula>em, .grid>div, .prompt')];
    const real = items.filter(e => e.tagName !== 'EM');
    items.forEach(e => e.classList.add('rv'));
    // момент появи кожного пункту
    const starts = T.slice(1);
    const n = real.length;
    const at = real.map((e, i) => starts.length >= n ? starts[i] : 1.2 + (D * 0.8 - 1.2) * i / Math.max(1, n - 1));
    real.forEach((e, i) => setTimeout(() => {
      e.classList.add('in', 'flash');
      const prev = e.previousElementSibling; if (prev && prev.tagName === 'EM') prev.classList.add('in');
      if (e.classList.contains('prompt')) {           // промпт друкується
        const txt = e.textContent; e.textContent = ''; let k = 0;
        const step = Math.max(12, Math.min(45, (D - at[i] - 1.5) * 1000 / txt.length));
        const iv = setInterval(() => { e.textContent = txt.slice(0, ++k); if (k >= txt.length) clearInterval(iv); }, step);
      }
    }, Math.max(300, at[i] * 1000)));
  }, [D, T]);
  const left = D * 1000 - (Date.now() - t0) + 600;
  await p.waitForTimeout(Math.max(0, left));
  const v = p.video(); await ctx.close(); await b.close();
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', await v.path(), '-ss', ((t0 - tRec) / 1000).toFixed(3), '-t', D.toFixed(3), '-vf', 'fps=25,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-an', out]);
})();
