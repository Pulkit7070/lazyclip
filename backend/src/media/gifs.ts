// GIPHY sticker fetcher for reaction overlays. Same reliability contract as broll.ts:
// no key / no hit / network error -> null, caller skips the overlay. Disk-cached by query.
import { createHash } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cacheDir = () => process.env.GIF_CACHE_DIR ?? join(tmpdir(), 'reely-gif-cache');
const cacheKey = (q: string) => createHash('sha1').update(q.toLowerCase().trim()).digest('hex').slice(0, 16);

// pure: pick a sticker gif URL from a GIPHY /v1/stickers/search response
export function parseGiphy(json: any): string | null {
  for (const d of json?.data ?? []) {
    const url = d.images?.fixed_height?.url ?? d.images?.original?.url;
    if (url) return String(url);
  }
  return null;
}

export async function fetchSticker(query: string): Promise<string | null> {
  const key = process.env.GIPHY_API_KEY;
  if (!key || !query.trim()) return null;
  const dir = cacheDir();
  const cached = join(dir, `${cacheKey(query)}.gif`);
  if (await access(cached).then(() => true, () => false)) return cached;
  try {
    const res = await fetch(`https://api.giphy.com/v1/stickers/search?api_key=${key}&q=${encodeURIComponent(query)}&limit=3&rating=g`,
      { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const url = parseGiphy(await res.json());
    if (!url) return null;
    const gif = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!gif.ok) return null;
    await mkdir(dir, { recursive: true });
    await writeFile(cached, Buffer.from(await gif.arrayBuffer()));
    return cached;
  } catch { return null; }
}
