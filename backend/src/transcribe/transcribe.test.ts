import { describe, it, expect } from 'vitest';
import { parseWhisper, transcriber, TranscribeError } from './index.js';

describe('transcribe', () => {
  it('parseWhisper handles word-level json', () => {
    const { words, srt } = parseWhisper({ words: [{ word: 'hi', start: 0, end: 0.5 }, { word: 'there', start: 0.5, end: 1 }] });
    expect(words.length).toBe(2); expect(words[0].text).toBe('hi'); expect(srt).toContain('-->');
  });
  it('parseWhisper falls back to segments', () => {
    const { words } = parseWhisper({ segments: [{ text: 'a segment', start: 0, end: 2 }] });
    expect(words[0].text).toBe('a segment');
  });
  it('throws a clear error without an API key', async () => {
    const prev = process.env.WHISPER_API_KEY; delete process.env.WHISPER_API_KEY;
    await expect(transcriber.transcribe('/tmp/x.mp4')).rejects.toBeInstanceOf(TranscribeError);
    if (prev) process.env.WHISPER_API_KEY = prev;
  });
});
