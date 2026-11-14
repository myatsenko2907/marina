// Рендер у PDF.
//   node pdf.cjs                 -> booklet.html  -> AI-Creator-programa.pdf
//   node pdf.cjs program         -> program.html  -> AI-Creator-detalna-programa.pdf
//   третій аргумент (необов'язковий): папка для PNG-прев'ю сторінок
const { chromium } = require('playwright');
const path = require('path');
const DOCS = {
  booklet: ['booklet.html', 'AI-Creator-programa.pdf'],
  program: ['program.html', 'AI-Creator-detalna-programa.pdf'],
};
(async () => {
  const [src, out] = DOCS[process.argv[2] || 'booklet'];
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, src), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(__dirname, out), format: 'A4', printBackground: true, preferCSSPageSize: true });
  if (process.argv[3]) {
    await p.setViewportSize({ width: 794, height: 1123 });
    const pages = await p.$$('.page');
    for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${process.argv[3]}/pg${i + 1}.png` });
  }
  await b.close();
})();
