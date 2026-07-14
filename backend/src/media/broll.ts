// Stock b-roll fetcher. Pexels -> Pixabay -> null (caller falls back to the gradient).
// Downloads are cached on disk keyed by keywords+provider so repeated topics cost zero
// API calls and zero bandwidth. No API keys -> returns null immediately (offline-safe).
import { createHash } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cacheDir = () => process.env.BROLL_CACHE_DIR ?? join(tmpdir(), 'reely-broll-cache');

export const brollCacheKey = (keywords: string[]) =>
  createHash('sha1').update(keywords.map((k) => k.toLowerCase().trim()).sort().join('|')).digest('hex').slice(0, 16);

// pure: pick the best portrait-leaning mp4 from a Pexels /videos/search response
export function parsePexels(json: any): string | null {
  for (const v of json?.videos ?? []) {
    const files = (v.video_files ?? [])
      .filter((f: any) => f.file_type === 'video/mp4' && f.height >= 720)
      .sort((a: any, b: any) => (b.height / b.width) - (a.height / a.width) || b.height - a.height);
    if (files[0]?.link) return String(files[0].link);
  }
  return null;
}

// pure: pick the best video URL from a Pixabay /api/videos response
export function parsePixabay(json: any): string | null {
  for (const h of json?.hits ?? []) {
    const v = h.videos?.large ?? h.videos?.medium ?? h.videos?.small;
    if (v?.url) return String(v.url);
  }
  return null;
}

async function pexelsUrl(query: string): Promise<string | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=portrait`,
    { headers: { Authorization: key }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  return parsePexels(await res.json());
}

async function pixabayUrl(query: string): Promise<string | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(query)}&per_page=3&safesearch=true`,
    { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  return parsePixabay(await res.json());
}

// resolve keywords -> local mp4 path (cached), or null when no provider delivers.
// Never throws: any provider/network failure degrades to the next rung.
export async function fetchStockBroll(keywords: string[]): Promise<string | null> {
  if (!keywords.length) return null;
  const dir = cacheDir();
  const cached = join(dir, `${brollCacheKey(keywords)}.mp4`);
  if (await access(cached).then(() => true, () => false)) return cached;

  const query = keywords.slice(0, 4).join(' ');
  let url: string | null = null;
  try { url = await pexelsUrl(query); } catch { /* next rung */ }
  if (!url) { try { url = await pixabayUrl(query); } catch { /* next rung */ } }
  if (!url) return null;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return null;
    await mkdir(dir, { recursive: true });
    await writeFile(cached, Buffer.from(await res.arrayBuffer()));
    return cached;
  } catch { return null; }
}
