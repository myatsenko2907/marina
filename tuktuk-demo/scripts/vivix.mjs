// Tiny Vivix API client: W1 video from text and A1 talking avatar.
// Usage:
//   node scripts/vivix.mjs world  <out.mp4> <aspect> <seconds> "<prompt>" [reference-image.jpg]
//   node scripts/vivix.mjs avatar <out.mp4> <first-frame.jpg> "<prompt>" "<line to say>" [voice_id]
// Key: VIVIX_API_KEY
import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

const BASE = 'https://api.vivix.ai';
const KEY = process.env.VIVIX_API_KEY || '';
const headers = KEY ? { Authorization: `Bearer ${KEY}` } : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path, opts = {}) {
  const res = await fetch(BASE + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (body.code !== 0) throw new Error(`${path}: ${res.status} ${JSON.stringify(body)}`);
  return body.data;
}

const json = (obj) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });

async function download(url, out) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  console.log('saved', out);
}

async function uploadImage(file) {
  const form = new FormData();
  const type = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  form.append('file', new Blob([await readFile(file)], { type }), basename(file));
  return (await call('/v1/files/images', { method: 'POST', body: form })).url;
}

async function world(out, aspect, seconds, prompt, refImage, model = process.env.W1_MODEL || 'vivix-w1-fast') {
  const job = { prompt, aspect_ratio: aspect, duration: Number(seconds) };
  // several reference images can be passed as a comma-separated list
  if (refImage) job.ref_images = await Promise.all(refImage.split(',').map(async (f) => ({ url: await uploadImage(f) })));
  const data = await call('/v1/videos/jobs', json({ model, jobs: [job] }));
  const id = data.results[0].job_id;
  console.log('job', id);
  for (;;) {
    await sleep(8000);
    const job = await call(`/v1/videos/jobs/${id}`);
    console.log(id, job.status);
    if (job.status === 'succeeded') return download(job.video_url, out);
    if (job.status === 'failed') throw new Error(JSON.stringify(job.error));
  }
}

async function avatar(out, image, prompt, dialogue, voice = 'cgSgspJ2msm6clMCkdW9') {
  const first = await uploadImage(image);
  const data = await call('/v1/videos/generations', json({
    model: 'vivix-a1', prompt, first_frame_image: first, dialogue, voice_id: voice,
    tts_config: { tts_provider: 'elevenlabs', tts_model_id: 'eleven_v3', speed: 1, vol: 1 },
    resolution: '720p', video_ratio: '9:16',
  }));
  if (data.error_code) throw new Error(JSON.stringify(data));
  const id = data.video_id;
  console.log('video', id);
  for (;;) {
    await sleep(8000);
    const item = (await call(`/v1/videos/generations/${id}`)).items?.[0];
    console.log(id, item?.status);
    if (item?.status === 'succeeded' && item.playback_url) {
      console.log('playback', item.playback_url);
      return item.playback_url;
    }
    if (item && ['failed', 'timeout'].includes(item.status)) throw new Error(item.watch_error || item.status);
  }
}

const [mode, ...args] = process.argv.slice(2);
if (mode === 'world') await world(...args);
else if (mode === 'avatar') console.log(await avatar(...args));
else console.log('usage: world|avatar ...');
