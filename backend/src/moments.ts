// Auto-moments: given a bare YouTube link, read the transcript (yt-dlp subs) and have the LLM
// pick the 2-3 most viral 15-30s segments. Used by the gateway when a link arrives with no range.
// yt-dlp gotcha: YouTube 429s subtitle downloads from datacenter IPs when several languages are
// requested back-to-back — so try ONE language at a time (--sleep-subtitles lives in yt-dlp config).
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export interface Moment { start: string; end: string; hook: string }

const SUB_LANGS = ['en', 'en-orig', 'hi-orig', 'hi'];

function runYtDlp(args: string[], timeoutMs = 90_000): Promise<boolean> {
  return new Promise((res) => {
    const p = spawn('yt-dlp', args);
    const t = setTimeout(() => { p.kill('SIGKILL'); res(false); }, timeoutMs);
    p.on('error', () => { clearTimeout(t); res(false); });
    p.on('close', (c) => { clearTimeout(t); res(c === 0); });
  });
}

// vtt -> "123s: line" entries, deduped (auto-subs repeat lines across cues)
export function parseVtt(vtt: string): string[] {
  const lines: string[] = [];
  let last = '';
  for (const block of vtt.split('\n\n')) {
    const m = block.match(/(\d{2}):(\d{2}):(\d{2})\.\d{3} --> /);
    if (!m) continue;
    const sec = +m[1] * 3600 + +m[2] * 60 + +m[3];
    const text = block.split('\n').slice(1).join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text && text !== last) { lines.push(`${sec}s: ${text}`); last = text; }
  }
  return lines;
}

async function fetchTranscript(url: string): Promise<string[] | null> {
  const work = await mkdtemp(join(tmpdir(), 'reely-subs-'));
  try {
    for (const lang of SUB_LANGS) {
      const ok = await runYtDlp(['--write-subs', '--write-auto-subs', '--sub-langs', lang,
        '--skip-download', '--sub-format', 'vtt', '-o', join(work, 'subs'), url]);
      if (!ok) continue;
      const vtt = (await readdir(work)).find((f) => f.endsWith('.vtt'));
      if (vtt) return parseVtt(await readFile(join(work, vtt), 'utf8'));
    }
    return null;
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export async function pickMoments(url: string, count = 3): Promise<Moment[]> {
  const key = process.env.LLM_API_KEY;
  if (!key) throw new Error('LLM_API_KEY not set — auto-moments needs the LLM');
  const lines = await fetchTranscript(url);
  if (!lines?.length) throw new Error('no captions on that video — give me a range like "2:30 to 3:15"');

  const base = process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1';
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? 'gpt-5.6-sol',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Timestamped transcript of a YouTube video. Pick the ${count} BEST 15-30 second segments ` +
          `for viral vertical shorts (punchlines, roasts, high-energy or surprising moments). Segments must ` +
          `not overlap. Reply as JSON: {"moments":[{"start_sec":int,"end_sec":int,"hook":"<=6 word overlay"}]}\n\n` +
          lines.join('\n').slice(0, 24_000),
      }],
    }),
  });
  if (!res.ok) throw new Error(`llm ${res.status}`);
  const j = await res.json();
  const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? '{}');
  const moments = (parsed.moments ?? [])
    .filter((x: any) => Number.isFinite(x.start_sec) && Number.isFinite(x.end_sec) && x.end_sec > x.start_sec)
    .slice(0, count)
    .map((x: any) => ({ start: mmss(x.start_sec), end: mmss(Math.min(x.end_sec, x.start_sec + 30)), hook: String(x.hook ?? '') }));
  if (!moments.length) throw new Error('could not find good moments — give me a range like "2:30 to 3:15"');
  return moments;
}
