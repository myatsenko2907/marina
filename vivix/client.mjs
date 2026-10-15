// Minimal Vivix API client (World Video Generation, model W1).
// Docs: https://docs.vivix.ai/video-generation/world-video-generation
// Needs Node 18+ (built-in fetch/FormData/Blob). Key comes from VIVIX_API_KEY.

import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.webm': 'audio/webm',
};

export class VivixError extends Error {
  constructor(message, { code, status, requestId, traceId } = {}) {
    super(message);
    this.name = 'VivixError';
    Object.assign(this, { code, status, requestId, traceId });
  }
}

export class Vivix {
  constructor({ apiKey = process.env.VIVIX_API_KEY, baseUrl = 'https://api.vivix.ai' } = {}) {
    if (!apiKey) throw new Error('VIVIX_API_KEY is not set');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  // Sends a request and unwraps the {code, message, data} envelope.
  async request(method, path, body) {
    const headers = { Authorization: `Bearer ${this.apiKey}` };
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    const res = await fetch(this.baseUrl + path, { method, headers, body });
    let json;
    try { json = await res.json(); } catch { json = null; }
    if (!json || json.code !== 0) {
      throw new VivixError(json?.message || `HTTP ${res.status}`, {
        code: json?.code,
        status: res.status,
        requestId: res.headers.get('x-request-id'),
        traceId: res.headers.get('x-trace-id'),
      });
    }
    return json.data;
  }

  async #upload(kind, filePath, contentType) {
    const type = contentType || MIME[extname(filePath).toLowerCase()];
    if (!type) throw new Error(`Unknown file type for ${filePath}; pass contentType`);
    const form = new FormData();
    form.append('file', new Blob([await readFile(filePath)], { type }), basename(filePath));
    return this.request('POST', `/v1/files/${kind}`, form);
  }

  /** Upload a reference image (jpg/png/webp/heic, ≤10MB). Returns { file_id, url, ... }. */
  uploadImage(filePath, contentType) { return this.#upload('images', filePath, contentType); }

  /** Upload a reference audio (wav/mp3/m4a/ogg/webm, ≤10MB). Returns { file_id, url, ... }. */
  uploadAudio(filePath, contentType) { return this.#upload('audios', filePath, contentType); }

  /**
   * Submit one video job. Returns { job_id, status }.
   * job: { prompt, duration (5–15), aspect_ratio?, ref_images?, ref_audios?,
   *        first_frame_image?, last_frame_image?, output_format? }
   * ref_images / ref_audios may be plain URL strings or { url } objects.
   */
  async createVideoJob(job, { model = 'vivix-w1', pe_mode, seed } = {}) {
    const toRefs = (list) => list?.map((r) => (typeof r === 'string' ? { url: r } : r));
    const j = { ...job };
    if (j.ref_images) j.ref_images = toRefs(j.ref_images);
    if (j.ref_audios) j.ref_audios = toRefs(j.ref_audios);
    const body = { model, jobs: [j] };
    if (pe_mode) body.pe_mode = pe_mode;
    if (seed !== undefined) body.seed = seed;
    const data = await this.request('POST', '/v1/videos/jobs', body);
    return data.results[0];
  }

  getVideoJob(jobId) {
    return this.request('GET', `/v1/videos/jobs/${encodeURIComponent(jobId)}`);
  }

  async getVideoJobs(jobIds) {
    return (await this.request('POST', '/v1/videos/jobs/batch-get', { job_ids: jobIds })).items;
  }

  /** Poll until the job is succeeded or failed. Throws on failure or timeout. */
  async waitForVideo(jobId, { intervalMs = 5000, timeoutMs = 15 * 60 * 1000, onProgress } = {}) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const job = await this.getVideoJob(jobId);
      onProgress?.(job);
      if (job.status === 'succeeded') return job;
      if (job.status === 'failed') {
        throw new VivixError(job.error?.message || 'Video generation failed', { code: job.error?.code });
      }
      if (Date.now() > deadline) throw new VivixError(`Timed out waiting for ${jobId}`, { code: 'timeout' });
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  /** Submit a job and wait for the finished video. Returns the job with video_url. */
  async generateVideo(job, options = {}) {
    const { job_id } = await this.createVideoJob(job, options);
    return this.waitForVideo(job_id, options);
  }
}
