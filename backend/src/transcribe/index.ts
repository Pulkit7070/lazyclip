// B3 — transcribe. Whisper via OpenAI-compatible API (Groq/OpenAI). Returns srt + word timings.
// The verbose_json parser is a pure function (fully unit-tested without a key).
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { Transcriber, Word } from '../types.js';
import { wordsToCues, toSrt } from '../media/captions.js';

export class TranscribeError extends Error {}

// pure: OpenAI/Groq whisper verbose_json -> { srt, words }
export function parseWhisper(json: any): { srt: string; words: Word[] } {
  const words: Word[] = [];
  if (Array.isArray(json.words)) {
    for (const w of json.words) words.push({ text: String(w.word ?? w.text ?? '').trim(), start: Number(w.start ?? 0), end: Number(w.end ?? 0) });
  } else if (Array.isArray(json.segments)) {
    for (const s of json.segments) words.push({ text: String(s.text ?? '').trim(), start: Number(s.start ?? 0), end: Number(s.end ?? 0) });
  }
  return { srt: toSrt(wordsToCues(words, 3)), words };
}

export const transcriber: Transcriber = {
  async transcribe(path: string): Promise<{ srt: string; words: Word[] }> {
    const key = process.env.WHISPER_API_KEY;
    const base = process.env.WHISPER_BASE_URL ?? 'https://api.openai.com/v1';
    if (!key) throw new TranscribeError('WHISPER_API_KEY not set (Groq or OpenAI whisper endpoint)');

    const buf = await readFile(path);
    const form = new FormData();
    form.append('file', new Blob([buf]), basename(path));
    form.append('model', process.env.WHISPER_MODEL ?? 'whisper-1');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');

    const res = await fetch(`${base}/audio/transcriptions`, { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form });
    if (!res.ok) throw new TranscribeError(`whisper ${res.status}: ${(await res.text()).slice(0, 160)}`);
    return parseWhisper(await res.json());
  },
};
