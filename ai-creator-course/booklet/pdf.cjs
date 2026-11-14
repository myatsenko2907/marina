// Рендер буклета в PDF: node pdf.cjs [папка-для-прев'ю]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, 'booklet.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(__dirname, 'AI-Creator-programa.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  if (process.argv[2]) {
    await p.setViewportSize({ width: 794, height: 1123 });
    const pages = await p.$$('.page');
    for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${process.argv[2]}/pg${i + 1}.png` });
  }
  await b.close();
})();
