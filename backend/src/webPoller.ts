// Web-generation poller — runs on the GCP VM `conmap-vps` beside the pipeline.
//
// Loop: claim the oldest queued genJobs row from Convex -> run the reely pipeline
// to produce an mp4 -> upload it to gs://conmap-auto-videos + mint a V4 signed URL
// (org policy blocks public buckets) -> completeJob with that URL. On any failure,
// failJob so the dashboard stops spinning.
//
// Run on the VM:
//   npm i convex @google-cloud/storage
//   CONVEX_URL=... CONVEX_DEPLOY_KEY=... GCS_BUCKET=conmap-auto-videos \
//     node --import tsx src/webPoller.ts
//
// The claim/complete Convex loop is fully wired. GCS upload + signed URL is a
// clearly-marked helper (uploadAndSign) with a TODO fallback if the GCS SDK is
// not installed — swap it for the real bucket call when @google-cloud/storage lands.
import 'dotenv/config';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { createReely } from './app.js';
import type { Incoming } from './gateway/index.js';

declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
  once(event: string, listener: () => void): void;
};

// ---- config ----
const CONVEX_URL = process.env.CONVEX_URL ?? process.env.VITE_CONVEX_URL;
// Deploy key (or an admin key) lets this backend call internalMutations.
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY ?? process.env.CONVEX_ADMIN_KEY;
const GCS_BUCKET = process.env.GCS_BUCKET ?? 'conmap-auto-videos';
const POLL_MS = Number(process.env.WEB_POLL_MS ?? 5000);
const SIGNED_URL_TTL_MS = Number(process.env.SIGNED_URL_TTL_MS ?? 7 * 24 * 60 * 60 * 1000);

if (!CONVEX_URL) {
  console.error('set CONVEX_URL (or VITE_CONVEX_URL) — the Convex deployment to poll');
  process.exit(1);
}
if (!CONVEX_DEPLOY_KEY) {
  console.error('set CONVEX_DEPLOY_KEY (or CONVEX_ADMIN_KEY) — needed to call internal mutations');
  process.exit(1);
}

// ---- Convex client ----
// The HTTP client authenticates internal-function calls with the deploy/admin key.
// setAdminAuth is the documented backend path but is not on the public type surface,
// so we reach it through a narrow cast.
const convex = new ConvexHttpClient(CONVEX_URL);
(convex as any).setAdminAuth(CONVEX_DEPLOY_KEY);

// Internal functions referenced by string path (no generated api in this package).
const claimNextJob = makeFunctionReference<'mutation'>('generate:claimNextJob');
const completeJob = makeFunctionReference<'mutation'>('generate:completeJob');
const failJob = makeFunctionReference<'mutation'>('generate:failJob');

interface ClaimedJob {
  jobId: string;
  userId: string;
  mode: string;
  prompt: string;
}

// One pipeline instance, reused across jobs. isPro=true on the Incoming below
// bypasses the Telegram free-tier daily cap — web credit accounting already
// happened in convex/generate.ts requestGeneration.
const reely = createReely();

// Run the reely pipeline for a claimed job and return the produced mp4 path.
async function runPipeline(job: ClaimedJob): Promise<string> {
  const inc: Incoming = {
    userId: `web:${job.userId}`,
    platform: 'cli',
    text: job.prompt,
    isPro: true,
  };
  const replies = await reely.handle(inc);
  const file = replies.find((r) => r.kind === 'file');
  if (!file || file.kind !== 'file') {
    const note = replies.find((r) => r.kind === 'text');
    throw new Error(note && note.kind === 'text' ? note.text : 'pipeline produced no output file');
  }
  return file.filePath;
}

// Upload an mp4 to GCS and return a V4 signed URL (buckets are private per org policy).
// TODO: requires `npm i @google-cloud/storage` on the VM; falls back to throwing if absent.
async function uploadAndSign(localPath: string, jobId: string): Promise<string> {
  const mod = await import('@google-cloud/storage' as string).catch(() => null);
  if (!mod) {
    throw new Error(
      'GCS upload unavailable — run `npm i @google-cloud/storage` on the VM (see backend/docs/WEB-GENERATION.md)',
    );
  }
  const { Storage } = mod as any;
  const storage = new Storage(); // uses the VM's attached service account / ADC
  const objectName = `web/${jobId}-${Date.now()}.mp4`;
  await storage.bucket(GCS_BUCKET).upload(localPath, {
    destination: objectName,
    metadata: { contentType: 'video/mp4' },
  });
  const [url] = await storage
    .bucket(GCS_BUCKET)
    .file(objectName)
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + SIGNED_URL_TTL_MS,
    });
  return url as string;
}

// Process a single claimed job end-to-end.
async function processJob(job: ClaimedJob): Promise<void> {
  console.log(`[job ${job.jobId}] processing (${job.mode}): ${job.prompt.slice(0, 80)}`);
  try {
    const mp4 = await runPipeline(job);
    const resultUrl = await uploadAndSign(mp4, job.jobId);
    await convex.mutation(completeJob, { jobId: job.jobId, resultUrl });
    console.log(`[job ${job.jobId}] done -> ${resultUrl}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[job ${job.jobId}] failed: ${message}`);
    await convex.mutation(failJob, { jobId: job.jobId, error: message }).catch((e: unknown) => {
      console.error(`[job ${job.jobId}] could not record failure:`, e);
    });
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  console.log(`webPoller up — polling ${CONVEX_URL} every ${POLL_MS}ms, bucket gs://${GCS_BUCKET}`);
  let running = true;
  const stop = () => {
    running = false;
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  while (running) {
    let job: ClaimedJob | null = null;
    try {
      job = (await convex.mutation(claimNextJob, {})) as ClaimedJob | null;
    } catch (err) {
      console.error('claimNextJob failed (will retry):', err);
    }
    if (job) {
      await processJob(job);
      // Drain quickly when there is a backlog; only idle-wait when empty.
      continue;
    }
    await sleep(POLL_MS);
  }
  console.log('webPoller stopped');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
