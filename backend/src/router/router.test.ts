import { describe, it, expect } from 'vitest';
import { route, ClarifyError, ImpossibleError } from './index.js';
import type { ChatCtx } from '../types.js';

const ctx = (over: Partial<ChatCtx> = {}): ChatCtx =>
  ({ userId: 'u1', platform: 'telegram', isPro: false, ...over });

describe('router: NL -> JobSpec', () => {
  it('1. edit: attachment + "add subtitles" -> edit/upload with captions', async () => {
    const j = await route('add subtitles', ctx({ attachmentPath: '/tmp/x.mp4' }));
    expect(j.mode).toBe('edit');
    expect(j.source.kind).toBe('upload');
    expect(j.ops.some(o => o.op === 'captions')).toBe(true);
  });

  it('2. clip: youtube link + range -> sections cut at download, NO second trim op', async () => {
    const j = await route('clip this https://youtu.be/aqz-KE-bpKQ from 2:30 to 3:15', ctx());
    expect(j.mode).toBe('clip');
    expect(j.source.kind).toBe('youtube');
    expect(j.source.sections).toBe('*2:30-3:15');
    // the section file starts at 0 — an absolute-time clip op would seek past its end
    expect(j.ops.find(o => o.op === 'clip')).toBeUndefined();
  });

  it('2b. clip: dot-style timestamps ("1.10 to 1.30") normalize to colons', async () => {
    const j = await route('https://youtu.be/aqz-KE-bpKQ 1.10 to 1.30', ctx());
    expect(j.mode).toBe('clip');
    expect(j.source.sections).toBe('*1:10-1:30');
  });

  it('2c. a "1:1x" timestamp must NOT trigger the 1:1 aspect (regex boundary bug)', async () => {
    const j = await route('clip https://youtu.be/aqz-KE-bpKQ 1:10 to 1:25', ctx());
    expect(j.ops.find(o => o.op === 'format')).toMatchObject({ aspect: '9:16' });
    const sq = await route('clip https://youtu.be/aqz-KE-bpKQ 2:30 to 2:45 square', ctx());
    expect(sq.ops.find(o => o.op === 'format')).toMatchObject({ aspect: '1:1' });
  });

  it('3. generate: topic only -> generate/none carrying the topic', async () => {
    const j = await route('why UPI beat credit cards in india', ctx());
    expect(j.mode).toBe('generate');
    expect(j.source.kind).toBe('none');
    expect(j.source.topic).toContain('UPI');
    expect(j.ops.some(o => o.op === 'captions' && o.source === 'script')).toBe(true);
  });

  it('4. YouTube link with no timestamp -> ClarifyError', async () => {
    await expect(route('make a short from https://youtu.be/aqz-KE-bpKQ', ctx()))
      .rejects.toBeInstanceOf(ClarifyError);
  });

  it('5. impossible chain: "to mp3 and add captions" -> ImpossibleError', async () => {
    await expect(route('convert to mp3 and add captions', ctx({ attachmentPath: '/tmp/x.mp4' })))
      .rejects.toBeInstanceOf(ImpossibleError);
  });

  it('6. vague no-source -> ClarifyError', async () => {
    await expect(route('make it better', ctx())).rejects.toBeInstanceOf(ClarifyError);
  });

  it('watermark shows for free, hidden for pro', async () => {
    const free = await route('caption it', ctx({ attachmentPath: '/tmp/x.mp4' }));
    const pro = await route('caption it', ctx({ attachmentPath: '/tmp/x.mp4', isPro: true }));
    expect(free.ops.find(o => o.op === 'watermark')).toMatchObject({ show: true });
    expect(pro.ops.find(o => o.op === 'watermark')).toMatchObject({ show: false });
  });
});
