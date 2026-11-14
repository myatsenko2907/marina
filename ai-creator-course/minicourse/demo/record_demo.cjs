// Запис демонстрацій «студії» у відео: node record_demo.cjs <scenario.json> <out.mp4>
// Сценарій: { "assetsBase": "../media/vivix/v2/", "steps": [[дія, параметри], ...] }
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
(async () => {
  const [scFile, out] = process.argv.slice(2);
  const sc = JSON.parse(fs.readFileSync(scFile, 'utf8'));
  const tmp = fs.mkdtempSync('/tmp/demo-');
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } });
  const p = await ctx.newPage();
  await p.goto('file://' + path.join(__dirname, sc.page || 'studio.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const base = 'file://' + path.resolve(path.dirname(scFile), sc.assetsBase || '.') + '/';
  const fix = v => typeof v === 'string' ? v.replace(/@([\w.-]+\.(?:jpg|jpeg|png|mp4))/g, (_, f) => base + f) : Array.isArray(v) ? v.map(fix) : v;
  const steps = fix(sc.steps);
  await p.waitForTimeout(600);
  await p.evaluate(s => window.runScenario(s), steps);
  await p.waitForTimeout(sc.tail || 1500);
  const v = p.video(); await ctx.close(); await b.close();
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', await v.path(), '-ss', '0.4', '-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '25', '-movflags', '+faststart', '-an', out]);
  console.log('ok', out);
})();
