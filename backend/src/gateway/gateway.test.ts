import { describe, it, expect, vi } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { handleMessage, type GatewayDeps } from './index.js';
import type { JobSpec, JobResult } from '../types.js';

async function fakeOutput(): Promise<string> {
  const p = join(tmpdir(), `reely-test-${Math.random().toString(36).slice(2)}.mp4`);
  await writeFile(p, 'video'); return p;
}
function mkDeps(over: Partial<GatewayDeps> = {}, used = 0, pro = false): GatewayDeps {
  return {
    enqueue: async (_job: JobSpec): Promise<JobResult> => ({ ok: true, outputPath: await fakeOutput(), meta: { bytes: 5, durationSec: 0, ms: 1 } }),
    data: {
      isPro: async () => pro,
      incUsage: vi.fn(async () => used + 1),
      freeUsedToday: async () => used,
    },
    ...over,
  };
}

describe('gateway.handleMessage', () => {
  it('edit with attachment -> returns a file reply', async () => {
    const out = await handleMessage(
      { userId: 'u1', platform: 'telegram', text: 'add subtitles', attachmentPath: '/tmp/x.mp4', isPro: false },
      mkDeps());
    expect(out[0].kind).toBe('file');
  });

  it('youtube clip without confirmation -> ownership prompt, does NOT enqueue', async () => {
    const enqueue = vi.fn();
    const out = await handleMessage(
      { userId: 'u1', platform: 'telegram', text: 'clip https://youtu.be/aqz-KE-bpKQ 2:30 to 3:15', isPro: false },
      mkDeps({ enqueue: enqueue as any }));
    expect(out[0].kind).toBe('text');
    expect((out[0] as any).text).toMatch(/rights|confirm/i);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('youtube clip WITH confirmation -> file reply', async () => {
    const out = await handleMessage(
      { userId: 'u1', platform: 'telegram', text: 'clip https://youtu.be/aqz-KE-bpKQ 2:30 to 3:15', isPro: false, confirmedOwnership: true },
      mkDeps());
    expect(out[0].kind).toBe('file');
  });

  it('vague message -> clarify text', async () => {
    const out = await handleMessage({ userId: 'u1', platform: 'telegram', text: 'make it better', isPro: false }, mkDeps());
    expect(out[0].kind).toBe('text');
    expect((out[0] as any).text).toMatch(/topic|clip|youtube/i);
  });

  it('free-tier cap reached -> upsell text, no enqueue', async () => {
    const enqueue = vi.fn();
    const out = await handleMessage(
      { userId: 'u1', platform: 'telegram', text: 'caption it', attachmentPath: '/tmp/x.mp4', isPro: false },
      mkDeps({ enqueue: enqueue as any }, 3));
    expect((out[0] as any).text).toMatch(/free reels|pro/i);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('pro user -> no watermark op + usage not incremented', async () => {
    let captured: JobSpec | undefined;
    const inc = vi.fn(async () => 1);
    await handleMessage(
      { userId: 'u1', platform: 'telegram', text: 'caption it', attachmentPath: '/tmp/x.mp4', isPro: true },
      mkDeps({ enqueue: async (j) => { captured = j; return { ok: true, outputPath: await fakeOutput() }; },
               data: { isPro: async () => true, incUsage: inc, freeUsedToday: async () => 0 } }));
    expect(captured!.ops.find(o => o.op === 'watermark')).toMatchObject({ show: false });
    expect(inc).not.toHaveBeenCalled();
  });

  it('failed job -> explains which step', async () => {
    const out = await handleMessage(
      { userId: 'u1', platform: 'telegram', text: 'caption it', attachmentPath: '/tmp/x.mp4', isPro: false },
      mkDeps({ enqueue: async () => ({ ok: false, failedOp: 1, error: 'boom' }) }));
    expect((out[0] as any).text).toMatch(/step 2.*boom|boom/i);
  });
});
