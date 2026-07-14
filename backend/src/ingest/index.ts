// B2 — ingest. Resolves a JobSpec.source into a local file + validated MediaMeta.
// upload: validate existing file. youtube: yt-dlp --download-sections (segment only). none: passthrough.
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Ingest, JobSpec, MediaMeta } from '../types.js';
import { ffprobe } from '../media/ffmpeg.js';

export class IngestError extends Error {}

// pure, testable: the exact yt-dlp argv for a segment download
export function ytdlpArgs(url: string, sections: string | undefined, dest: string): string[] {
  // merge best video+audio streams — progressive "mp4/best" often resolves to an audio-only
  // or missing stream on modern YouTube (especially from datacenter IPs)
  // 1080p default: a 9:16 crop keeps only ~1/3 of a wide frame, so a 720p source means ~2.7x
  // upscale and soft clips. YouTube throttles datacenter IPs — set YT_MAX_HEIGHT=720 there if
  // section downloads get too slow.
  const cap = Number(process.env.YT_MAX_HEIGHT) || 1080;
  const args = ['--no-playlist', '--no-warnings', '-f', `bv*[height<=${cap}]+ba/b`,
    '--merge-output-format', 'mp4', '-o', dest];
  if (sections) args.push('--download-sections', sections, '--force-keyframes-at-cuts');
  args.push(url);
  return args;
}

async function haveYtDlp(): Promise<boolean> {
  return new Promise((res) => {
    const p = spawn('yt-dlp', ['--version']);
    p.on('error', () => res(false)); p.on('close', (c) => res(c === 0));
  });
}

export const ingest: Ingest = {
  async probe(path: string): Promise<MediaMeta> {
    const p = await ffprobe(path);
    const bytes = (await stat(path)).size;
    return { durationSec: p.durationSec, width: p.width, height: p.height, hasAudio: p.hasAudio, hasVideo: p.hasVideo, bytes };
  },

  async ingest(source: JobSpec['source'], limits: JobSpec['limits']): Promise<{ path: string; meta: MediaMeta }> {
    if (source.kind === 'none') {
      return { path: '', meta: { durationSec: 0, width: 0, height: 0, hasAudio: false, hasVideo: false, bytes: 0 } };
    }

    if (source.kind === 'youtube') {
      if (!source.url) throw new IngestError('no youtube url');
      if (!(await haveYtDlp())) throw new IngestError('yt-dlp not installed — run: pip install yt-dlp (or brew install yt-dlp)');
      const dest = join('/tmp', `reely-yt-${Date.now()}.mp4`);
      try {
        try {
          await runYtDlp(ytdlpArgs(source.url, source.sections, dest));
        } catch {
          // YouTube 403s back-to-back extractions from datacenter IPs; a fresh
          // extraction after a short pause reliably succeeds
          await new Promise((r) => setTimeout(r, 12_000));
          await runYtDlp(ytdlpArgs(source.url, source.sections, dest));
        }
        const meta = await this.probe(dest);
        validate(meta, limits);
        return { path: dest, meta };
      } catch (e) {
        if (e instanceof IngestError) throw e;
        throw new IngestError(`couldn't fetch that video: ${(e as Error).message.slice(0, 120)}`);
      }
    }

    // upload
    if (!source.path) throw new IngestError('no file path');
    let meta;
    try {
      meta = await this.probe(source.path);
    } catch (e) {
      const msg = (e as Error).message;
      throw new IngestError(/ENOENT/.test(msg) ? "couldn't find that file" : "couldn't read that file (corrupt or unsupported)");
    }
    validate(meta, limits);
    return { path: source.path, meta };
  },
};

function validate(meta: MediaMeta, limits: JobSpec['limits']) {
  if (!meta.hasVideo && !meta.hasAudio) throw new IngestError('not a media file (no audio or video stream)');
  if (meta.bytes > limits.maxBytes) throw new IngestError(`file too big (${(meta.bytes / 1e6).toFixed(1)}MB > ${(limits.maxBytes / 1e6)}MB)`);
  if (meta.durationSec > limits.maxDurationSec) throw new IngestError(`too long (${meta.durationSec.toFixed(0)}s > ${limits.maxDurationSec}s)`);
}

function runYtDlp(args: string[]): Promise<void> {
  return new Promise((res, rej) => {
    const p = spawn('yt-dlp', args);
    let err = ''; p.stderr.on('data', (d) => (err += d));
    p.on('error', rej); p.on('close', (c) => (c === 0 ? res() : rej(new IngestError(`yt-dlp failed: ${err.slice(-160)}`))));
  });
}
