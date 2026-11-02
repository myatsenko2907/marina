// Usage: npm run tts -- "Text to speak" docs/audio/name.mp3 [voiceId]
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { textToSpeech } from '../src/elevenlabs.mjs';

const [text, out = 'docs/audio/speech.mp3', voiceId] = process.argv.slice(2);
if (!text) {
  console.error('Usage: npm run tts -- "Text" [out.mp3] [voiceId]');
  process.exit(1);
}
const audio = await textToSpeech(text, voiceId ? { voiceId } : {});
await mkdir(dirname(out), { recursive: true });
await writeFile(out, audio);
console.log(`Saved ${out} (${audio.length} bytes)`);
