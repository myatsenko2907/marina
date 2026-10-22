// Необязательный сервер: раздаёт демо и включает живую генерацию видео в Vivix.
// Запуск:  VIVIX_API_KEY=ваш_ключ node server.mjs   → http://localhost:3000
// Без ключа демо работает и просто как статичная страница (откройте index.html).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = process.env.PORT || 3000;
const KEY = process.env.VIVIX_API_KEY || '';
const MODEL = process.env.W1_MODEL || 'vivix-w1-fast';
const ROOT = new URL('.', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };

async function vivix(path, body) {
  const res = await fetch('https://api.vivix.ai' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(json.message || 'Vivix error ' + json.code);
  return json.data;
}

const send = (res, code, data, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(data) : data);
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/api/status') return send(res, 200, { live: Boolean(KEY) });
    if (url.pathname === '/api/video' && req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const { prompt } = JSON.parse(raw || '{}');
      if (!prompt) return send(res, 400, { error: 'пустой запрос' });
      const data = await vivix('/v1/videos/jobs', { model: MODEL, jobs: [{ prompt, aspect_ratio: '16:9', duration: 6 }] });
      return send(res, 200, data.results[0]);
    }
    const m = url.pathname.match(/^\/api\/video\/([\w-]+)$/);
    if (m) return send(res, 200, await vivix('/v1/videos/jobs/' + m[1]));

    const file = normalize(join(ROOT, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
    if (!file.startsWith(ROOT)) return send(res, 403, 'forbidden', 'text/plain');
    const buf = await readFile(file);
    const type = TYPES[extname(file)] || 'application/octet-stream';
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (!range) return send(res, 200, buf, type);
    // Range-запросы нужны Safari, чтобы проигрывать mp4
    const start = range[1] ? +range[1] : 0;
    const end = range[2] ? Math.min(+range[2], buf.length - 1) : buf.length - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${buf.length}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    res.end(buf.subarray(start, end + 1));
  } catch (e) {
    if (e.code === 'ENOENT') return send(res, 404, 'not found', 'text/plain');
    send(res, 500, { error: e.message });
  }
}).listen(PORT, () => console.log(`Демо: http://localhost:${PORT}  ·  живая генерация: ${KEY ? 'включена' : 'выключена (нет VIVIX_API_KEY)'}`));
