// Покадровая запись интерфейса (30 к/с) для ролика: node rec.js OUT_DIR
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2]; const FPS = 30;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, locale: 'ru-RU', timezoneId: 'Europe/Kyiv' });
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date('2026-10-22T07:05:00Z') });
  await p.goto('file://' + __dirname + '/lp.html');
  await p.fill('input[type=password]', 'demo'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
  await p.selectOption('select', 'admin'); await p.getByRole('button', { name: 'Войти' }).click(); await p.waitForTimeout(1500);
  await p.addStyleTag({ content: 'html{scroll-behavior:auto!important} *{caret-color:transparent}' });
  let seg, n;
  const start = (name) => { seg = `${out}/${name}`; fs.mkdirSync(seg, { recursive: true }); n = 0; };
  const shot = async () => { await p.screenshot({ path: `${seg}/${String(n++).padStart(4, '0')}.jpg`, quality: 92, type: 'jpeg' }); };
  const hold = async (sec) => { for (let i = 0; i < sec * FPS; i++) await shot(); };
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const scrollTo = async (y, sec) => {
    const y0 = await p.evaluate(() => scrollY); const k = sec * FPS;
    for (let i = 1; i <= k; i++) { await p.evaluate((v) => scrollTo(0, v), y0 + (y - y0) * ease(i / k)); await shot(); }
  };
  const yOf = (text, off = 92) => p.evaluate(([t, o]) => { const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.trim().startsWith(t)); return h.closest('.card').getBoundingClientRect().top + scrollY - o; }, [text, off]);

  // A: главная — KPI сети, филиалы по темпу
  start('a');
  await p.evaluate(() => scrollTo(0, 0));
  await hold(1.6);
  await scrollTo(await yOf('Филиалы по темпу') - 300, 1.6);
  await hold(0.8);
  await p.getByText('Раскрыть все').click(); await p.waitForTimeout(300);
  await hold(1.2);
  await scrollTo(await yOf('Филиалы по темпу'), 1.4);
  await hold(1.0);
  await scrollTo(await yOf('Филиалы по темпу') + 520, 2.6);
  await hold(0.6);

  // B: филиал в провале — задачи маркетолога
  start('b');
  await p.evaluate(() => { location.hash = '#/b/ck'; }); await p.waitForTimeout(1200);
  await p.evaluate(() => scrollTo(0, 0));
  await hold(1.6);
  await scrollTo(await yOf('Задачи маркетолога'), 1.8);
  await hold(2.2);
  await scrollTo(await yOf('Задачи маркетолога') + 240, 2.6);
  await hold(1.8);
  await b.close();
})();
