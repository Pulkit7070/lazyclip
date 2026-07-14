// A2 — queue / executor. The anti-crash core: capped concurrency, per-user serialization,
// per-job temp dir, wall-clock timeout with cancellation, output validation, cleanup.
import { availableParallelism } from 'node:os';
import { mkdtemp, mkdir, rm, stat, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import pLimit from 'p-limit';
import type { JobSpec, JobResult, JobCtx, Op } from '../types.js';

export type RunOp = (inputPath: string, op: Op, ctx: JobCtx) => Promise<{ outputPath: string }>;

export interface ExecutorDeps {
  runOp: RunOp;
  // optional: resolve the source (ingest) and enrich ops (transcription / generate assembly)
  // before the op loop. Returns the input path for the first op and the (possibly rewritten) ops.
  prepare?: (job: JobSpec, ctx: JobCtx) => Promise<{ inputPath?: string; ops: Op[] }>;
  onProgress?: (jobId: string, msg: string) => void;
}
export interface ExecutorOptions {
  maxConcurrent?: number;   // default cores - 1
  maxQueueDepth?: number;   // default 20
  outDir?: string;          // where final artifacts land (survives cleanup)
}

export function createExecutor(deps: ExecutorDeps, opts: ExecutorOptions = {}) {
  const maxConcurrent = Math.max(1, opts.maxConcurrent ?? availableParallelism() - 1);
  const maxQueueDepth = opts.maxQueueDepth ?? 20;
  const outDir = opts.outDir ?? join(process.cwd(), 'tmp', 'out');
  const limit = pLimit(maxConcurrent);

  let pending = 0;                                  // queued + running
  const userChains = new Map<string, Promise<unknown>>();
  const activeByUser = new Map<string, number>();   // observability / per-user cap proof

  function stats() {
    return { pending, active: limit.activeCount, queued: limit.pendingCount, maxConcurrent };
  }

  async function processJob(job: JobSpec): Promise<JobResult> {
    const t0 = Date.now();
    activeByUser.set(job.userId, (activeByUser.get(job.userId) ?? 0) + 1);
    await mkdir(outDir, { recursive: true });
    const work = await mkdtemp(join(tmpdir(), `reely-${job.id}-`));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), job.limits.timeoutSec * 1000);
    const ctx: JobCtx = { tmpDir: work, isPro: job.isPro, signal: controller.signal };
    let current = job.source.path;                  // undefined for mode 'generate'
    let ops = job.ops;
    try {
      if (deps.prepare) {
        try {
          const prep = await deps.prepare(job, ctx);
          if (prep.inputPath !== undefined) current = prep.inputPath;
          ops = prep.ops;
        } catch (e) {
          return { ok: false, error: `prepare failed: ${(e as Error).message}` };
        }
      }
      for (let i = 0; i < ops.length; i++) {
        if (controller.signal.aborted) return { ok: false, failedOp: i, error: 'timed out' };
        deps.onProgress?.(job.id, `op ${i + 1}/${ops.length}: ${ops[i].op}`);
        try {
          const { outputPath } = await deps.runOp(current ?? '', ops[i], ctx);
          current = outputPath;
        } catch (e) {
          const msg = controller.signal.aborted ? 'timed out' : (e as Error).message;
          return { ok: false, failedOp: i, error: msg, outputPath: undefined };
        }
      }
      if (!current) return { ok: false, error: 'no output produced' };
      let size = 0;
      try { size = (await stat(current)).size; } catch { return { ok: false, error: 'output missing' }; }
      if (size === 0) return { ok: false, error: 'empty output' };
      // move the final artifact out of the work dir so cleanup can't delete it
      const finalPath = join(outDir, `${job.id}-${current.split('/').pop()}`);
      await copyFile(current, finalPath);
      return { ok: true, outputPath: finalPath, meta: { bytes: size, durationSec: 0, ms: Date.now() - t0 } };
    } finally {
      clearTimeout(timer);
      await rm(work, { recursive: true, force: true }).catch(() => {});
      activeByUser.set(job.userId, Math.max(0, (activeByUser.get(job.userId) ?? 1) - 1));
    }
  }

  function enqueue(job: JobSpec): Promise<JobResult> {
    if (pending >= maxQueueDepth) {
      return Promise.resolve({ ok: false, error: 'swamped right now, try again in a minute' });
    }
    pending++;
    const run = () => limit(() => processJob(job)).finally(() => { pending--; });
    // per-user serialization: a user's next job waits for their previous to settle (1 active/user)
    const prev = userChains.get(job.userId) ?? Promise.resolve();
    const p = prev.then(run, run);
    userChains.set(job.userId, p.catch(() => {}));
    return p;
  }

  return { enqueue, stats, _activeByUser: activeByUser };
}

// cleanup a delivered artifact (call after sending to chat)
export async function cleanupOutput(path: string) {
  await rm(path, { force: true }).catch(() => {});
}
