// A5 — integration wiring. Composes ingest + transcribe + content + media + queue + gateway.
// `prepare` resolves the source and enriches ops per mode before the ffmpeg op loop runs.
import { join } from 'node:path';
import { createExecutor, type RunOp, type ExecutorOptions } from './queue/index.js';
import { handleMessage, type GatewayDeps, type Incoming, type Reply } from './gateway/index.js';
import { mediaCore } from './media/index.js';
import { ff, ffprobe } from './media/ffmpeg.js';
import { wordsToCues } from './media/captions.js';
import { detectFocusX } from './media/focus.js';
import { ingest } from './ingest/index.js';
import { transcriber } from './transcribe/index.js';
import { content } from './content/index.js';
import { search } from './search/index.js';
import { data } from './data/index.js';
import type { JobSpec, JobCtx, Op } from './types.js';

async function prepare(job: JobSpec, ctx: JobCtx): Promise<{ inputPath?: string; ops: Op[] }> {
  // MODE generate: brainstorm -> script -> voiceover + b-roll -> mux a base reel; captions get the script text
  if (job.mode === 'generate') {
    const topic = job.source.topic ?? '';
    const research = await search(topic);                 // Linkup: live facts to ground the reel
    const angles = await content.brainstorm(topic, research.facts);
    const { script } = await content.script(angles[0], research.facts);
    const voice = await mediaCore.runOp('', { op: 'voiceover', voiceId: '', script }, ctx);
    const broll = await mediaCore.runOp('', { op: 'broll', keywords: topic.split(/\s+/).slice(0, 4) }, ctx);
    const base = join(ctx.tmpDir, 'base.mp4');
    await ff(['-i', broll.outputPath, '-i', voice.outputPath, '-map', '0:v', '-map', '1:a',
      '-shortest', '-c:v', 'copy', '-c:a', 'aac', base], ctx.signal);
    // pace the script words across the real voiceover duration so cues track the audio
    const voiceDur = await ffprobe(voice.outputPath).then((p) => p.durationSec).catch(() => 0);
    const w = script.trim().split(/\s+/);
    const per = voiceDur > 0 ? voiceDur / w.length : 0.4;
    const cues = wordsToCues(w.map((text, i) => ({ text, start: i * per, end: (i + 1) * per })), 3);
    const ops = job.ops.map((o) => (o.op === 'captions' ? { ...o, text: script, cues } : o));
    return { inputPath: base, ops };
  }

  // MODE edit/clip: ingest (validate upload / yt-dlp segment), then enrich whisper captions
  const { path, meta } = await ingest.ingest(job.source, job.limits);
  let ops = job.ops;

  // smart reframe: when the source is wider than the target canvas, a blind center-crop cuts
  // off-center subjects. Ask the vision LLM where the subject is -> focused crop; when it's
  // unsure (or offline) fall back to blur-pad fit so nothing is ever cut. Explicit user
  // intent (mode already set) is respected as-is.
  const RATIOS: Record<string, number> = { '9:16': 9 / 16, '1:1': 1, '16:9': 16 / 9 };
  const fmt = ops.find((o) => o.op === 'format' && o.mode !== 'fit' && o.focusX === undefined);
  if (fmt?.op === 'format' && path && meta.width / Math.max(1, meta.height) > (RATIOS[fmt.aspect] ?? 9 / 16) + 0.01) {
    const focusX = await detectFocusX(path, ctx);
    ops = ops.map((o) => (o === fmt
      ? (focusX !== null ? { ...o, mode: 'crop' as const, focusX }
        // detection unsure: an explicit crop request stays a center crop; otherwise blur-pad
        : { ...o, mode: fmt.mode ?? ('fit' as const) })
      : o));
  }
  const cap = ops.find((o) => o.op === 'captions' && o.source === 'whisper' && !(o as any).text);
  if (cap && path) {
    try {
      const { words } = await transcriber.transcribe(path);
      const text = await content.captionText(words, (cap as any).style);
      const upper = (cap as any).style === 'meme';
      const cues = wordsToCues(words, 3).map((c) => (upper ? { ...c, text: c.text.toUpperCase() } : c));
      ops = ops.map((o) => (o === cap ? { ...o, text, cues } : o));
    } catch { /* no whisper key -> media-core renders a caption bar placeholder */ }
  }
  return { inputPath: path, ops };
}

export function createReely(opts: { runOp?: RunOp; usePrepare?: boolean; executor?: ExecutorOptions; freeDailyLimit?: number } = {}) {
  const executor = createExecutor(
    { runOp: opts.runOp ?? mediaCore.runOp, prepare: opts.usePrepare === false ? undefined : prepare },
    opts.executor ?? {},
  );
  const deps: GatewayDeps = {
    enqueue: executor.enqueue,
    data: {
      isPro: (u) => data.isPro(u),
      incUsage: (u) => data.incUsage(u),
      freeUsedToday: (u) => data.freeUsedToday(u),
    },
    freeDailyLimit: opts.freeDailyLimit,
  };
  return {
    handle: (inc: Incoming): Promise<Reply[]> => handleMessage(inc, deps),
    stats: executor.stats,
  };
}
