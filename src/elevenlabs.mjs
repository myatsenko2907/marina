// Minimal ElevenLabs client (text-to-speech). The API key is read from the
// ELEVENLABS_API_KEY environment variable — never commit it or ship it to the browser.
const API = 'https://api.elevenlabs.io/v1';

export const DEFAULT_VOICE = 'JBFqnCBsd6RMkjVDRZzb'; // "George", multilingual
export const DEFAULT_MODEL = 'eleven_multilingual_v2';

export async function textToSpeech(text, {
  voiceId = DEFAULT_VOICE,
  modelId = DEFAULT_MODEL,
  format = 'mp3_44100_128',
  apiKey = process.env.ELEVENLABS_API_KEY,
} = {}) {
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set (put it in .env)');
  const res = await fetch(`${API}/text-to-speech/${voiceId}?output_format=${format}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: modelId }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}
