#!/usr/bin/env node
// CLI: generate a video with Vivix W1 and print its URL.
//
//   VIVIX_API_KEY=... node vivix/generate.mjs "prompt" [--duration 8] [--aspect 16:9]
//       [--model vivix-w1|vivix-w1-fast|vivix-w1-ultrafast] [--image ref.png]... [--audio ref.mp3]...
//       [--first first.png] [--last last.png] [--seed 123]

import { Vivix } from './client.mjs';

function parseArgs(argv) {
  const opts = { images: [], audios: [], duration: 8, aspect: '16:9', model: 'vivix-w1' };
  const prompt = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--duration') opts.duration = Number(next());
    else if (a === '--aspect') opts.aspect = next();
    else if (a === '--model') opts.model = next();
    else if (a === '--image') opts.images.push(next());
    else if (a === '--audio') opts.audios.push(next());
    else if (a === '--first') opts.first = next();
    else if (a === '--last') opts.last = next();
    else if (a === '--seed') opts.seed = Number(next());
    else prompt.push(a);
  }
  opts.prompt = prompt.join(' ');
  return opts;
}

// Local paths are uploaded first; http(s) URLs are passed through as-is.
const isUrl = (s) => /^https?:\/\//.test(s);
async function resolve(vivix, src, kind) {
  if (isUrl(src)) return src;
  const file = kind === 'audio' ? await vivix.uploadAudio(src) : await vivix.uploadImage(src);
  console.error(`uploaded ${src} → ${file.url}`);
  return file.url;
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.prompt) {
  console.error('Usage: node vivix/generate.mjs "prompt" [--duration 8] [--aspect 16:9] [--model vivix-w1] [--image f] [--audio f] [--first f] [--last f]');
  process.exit(1);
}

const vivix = new Vivix();
const job = { prompt: opts.prompt, duration: opts.duration, aspect_ratio: opts.aspect };
if (opts.images.length) job.ref_images = await Promise.all(opts.images.map((f) => resolve(vivix, f, 'image')));
if (opts.audios.length) job.ref_audios = await Promise.all(opts.audios.map((f) => resolve(vivix, f, 'audio')));
if (opts.first) job.first_frame_image = await resolve(vivix, opts.first, 'image');
if (opts.last) job.last_frame_image = await resolve(vivix, opts.last, 'image');

try {
  const result = await vivix.generateVideo(job, {
    model: opts.model,
    seed: opts.seed,
    onProgress: (j) => console.error(`${j.job_id}: ${j.status}`),
  });
  console.log(result.video_url);
} catch (err) {
  console.error(`Error${err.code ? ` ${err.code}` : ''}: ${err.message}`);
  if (err.requestId) console.error(`X-Request-Id: ${err.requestId}, X-Trace-Id: ${err.traceId}`);
  process.exit(1);
}
