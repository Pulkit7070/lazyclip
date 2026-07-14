// A4 — gateway handler (platform-agnostic). Telegram binding lives in run.ts.
// Flow: free-tier cap -> route -> (YouTube ownership confirm) -> enqueue -> reply with file.
import { route, ClarifyError, ImpossibleError } from '../router/index.js';
import { cleanupOutput } from '../queue/index.js';
import type { JobSpec, JobResult, Op, Platform, BrollSegment } from '../types.js';

// per-clip plan from auto-moments (LLM): how to reframe + where b-roll cutaways go
export interface EditPlan { reframe?: 'crop' | 'fit'; broll?: BrollSegment[] }

export interface Incoming {
  userId: string;
  platform: Platform;
  text: string;
  attachmentPath?: string;
  isPro: boolean;
  confirmedOwnership?: boolean;   // set once the user confirms rights to a YouTube clip
  editPlan?: EditPlan;            // set by the auto-moments flow
}

// pure: fold an EditPlan into the routed ops — reframe mode on the format op (explicit user
// intent wins), cutaways inserted right after format so b-roll lands on the final canvas
// but UNDER the captions burned later
export function applyEditPlan(job: JobSpec, plan: EditPlan): JobSpec {
  const ops: Op[] = [];
  for (const o of job.ops) {
    if (o.op === 'format') {
      ops.push(plan.reframe && !o.mode ? { ...o, mode: plan.reframe } : o);
      if (plan.broll?.length) ops.push({ op: 'cutaways', segments: plan.broll });
    } else ops.push(o);
  }
  return { ...job, ops };
}
export type Reply =
  | { kind: 'text'; text: string }
  | { kind: 'file'; filePath: string; caption: string };

export interface GatewayDeps {
  enqueue: (job: JobSpec) => Promise<JobResult>;
  data: {
    isPro(userId: string): Promise<boolean>;
    incUsage(userId: string): Promise<number>;
    freeUsedToday(userId: string): Promise<number>;
  };
  freeDailyLimit?: number;         // default 3
  autoCleanup?: boolean;           // delete the artifact after building the reply (default true)
}

function summarize(job: JobSpec): string {
  const parts = job.ops.map((o: Op) => {
    switch (o.op) {
      case 'clip': case 'trim': return `${o.op} ${o.start}-${o.end}`;
      case 'captions': return `${o.style} captions`;
      case 'format': return o.aspect;
      case 'convert': return `→${o.to}`;
      case 'speed': return `${o.factor}x`;
      case 'watermark': return o.show ? 'watermark' : 'no watermark';
      default: return o.op;
    }
  });
  return `done: ${parts.join(' · ')}`;
}

export async function handleMessage(inc: Incoming, deps: GatewayDeps): Promise<Reply[]> {
  const limit = deps.freeDailyLimit ?? 3;
  const isPro = inc.isPro || (await deps.data.isPro(inc.userId));

  // free-tier daily cap
  if (!isPro && (await deps.data.freeUsedToday(inc.userId)) >= limit) {
    return [{ kind: 'text', text: `you've used your ${limit} free reels today. go pro for ₹99 to keep going + drop the watermark → (dodo link)` }];
  }

  let job: JobSpec;
  try {
    job = await route(inc.text, { userId: inc.userId, platform: inc.platform, isPro, attachmentPath: inc.attachmentPath });
  } catch (e) {
    if (e instanceof ClarifyError || e instanceof ImpossibleError) return [{ kind: 'text', text: e.message }];
    throw e;
  }
  if (inc.editPlan) job = applyEditPlan(job, inc.editPlan);

  // YouTube: require an ownership/rights confirmation before we download anything
  if (job.mode === 'clip' && !inc.confirmedOwnership) {
    return [{ kind: 'text', text: `i'll clip ${job.source.url}. confirm you own or have the rights to use this clip — reply "yes" to proceed.` }];
  }

  const result = await deps.enqueue(job);
  if (!result.ok || !result.outputPath) {
    const where = result.failedOp !== undefined ? ` (step ${result.failedOp + 1})` : '';
    return [{ kind: 'text', text: `couldn't finish that${where}: ${result.error ?? 'unknown error'}` }];
  }

  if (!isPro) await deps.data.incUsage(inc.userId);
  const reply: Reply[] = [{ kind: 'file', filePath: result.outputPath, caption: summarize(job) }];
  return reply;
}

// helper for the platform binding: after sending, clean the artifact
export async function afterSend(filePath: string, deps: GatewayDeps) {
  if (deps.autoCleanup !== false) await cleanupOutput(filePath);
}
