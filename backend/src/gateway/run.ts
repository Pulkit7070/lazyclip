// A4 — Telegram binding. Wires the Hermes gateway to the fully-assembled reely pipeline.
// Requires: npm i telegraf, and TELEGRAM_BOT_TOKEN in .env.
//
// Manual test (the A4 gate):
//   1. npm i telegraf && set TELEGRAM_BOT_TOKEN in .env
//   2. npm run gateway
//   3. DM the bot: send a video with "add subtitles"     -> file back
//      send "clip <yt link> 0:05 to 0:15" (needs yt-dlp)  -> ownership prompt -> "yes" -> file
//      send a bare <yt link>                              -> ownership prompt -> "yes" -> 2-3 auto-picked reels
//      send "make a reel about why upi won"               -> generated reel back
import 'dotenv/config';
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { createReely } from '../app.js';
import { pickMoments } from '../moments.js';
import type { Incoming } from './index.js';

const run = promisify(execFile);
const reely = createReely({ freeDailyLimit: Number(process.env.FREE_DAILY_LIMIT ?? 3) });

// Onboarding mirrors the dashboard's three modes (Generate / Edit / Clip).
const WELCOME = [
  'LazyClip — your video editor, in chat. 🎬',
  '',
  'Three ways to use me:',
  '',
  '🧠 Generate — send a topic',
  '     e.g. "make a reel on why UPI beat credit cards"',
  '',
  '✂️ Edit — send a video + an instruction',
  '     e.g. "caption it and make it vertical"',
  '',
  '📎 Clip — send a YouTube link + timestamps',
  '     e.g. "https://youtu.be/xyz 2:30 to 3:15"',
  '     (or just paste the link — I\'ll pick the best moments)',
  '',
  'Vertical by default. Add "square" or "landscape" to any request.',
  'Prefer a screen? Full studio at lazyclip.buzz',
].join('\n');

const FOOTER = 'Made with LazyClip · lazyclip.buzz';

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.error('set TELEGRAM_BOT_TOKEN in .env'); process.exit(1); }
  const mod = await import('telegraf' as string).catch(() => null);
  if (!mod) { console.error('run: npm i telegraf'); process.exit(1); }
  const { Telegraf } = mod as any;

  // render jobs run for minutes — telegraf's default 90s handlerTimeout throws an unhandled
  // TimeoutError that kills the whole process mid-batch
  const bot = new Telegraf(token, { handlerTimeout: 30 * 60_000 });
  bot.catch((err: any) => console.error('bot error:', err?.message ?? err));
  const pending = new Map<string, Incoming>();   // per-user YouTube ownership confirm (explicit range)
  const pendingAuto = new Map<string, string>(); // per-user ownership confirm for auto-moments (bare link)
  const lastLink = new Map<string, string>();    // per-user last YT link, so a bare "2:30 to 3:15" reply works

  bot.on('message', async (ctx: any) => {
    const userId = String(ctx.from.id);
    let text: string = ctx.message.text ?? ctx.message.caption ?? '';

    if (/^\/(start|help)/.test(text.trim())) {
      return ctx.reply(WELCOME, { disable_web_page_preview: true });
    }

    if (/^\s*(yes|y|confirm)\s*$/i.test(text)) {
      if (pendingAuto.has(userId)) {
        const url = pendingAuto.get(userId)!; pendingAuto.delete(userId);
        return autoMoments(url, userId, ctx);
      }
      if (pending.has(userId)) {
        const prev = pending.get(userId)!; pending.delete(userId);
        await ctx.reply('Great — clipping that now. About a minute…');
        return dispatch({ ...prev, confirmedOwnership: true }, ctx, pending);
      }
    }

    const url = text.match(/https?:\/\/\S*(?:youtu\.be|youtube\.com)\S*/i)?.[0];
    if (url) lastLink.set(userId, url);
    else if (/\d{1,2}[:.]\d{2}/.test(text) && lastLink.has(userId)) text = `clip ${lastLink.get(userId)} ${text}`;

    // bare link, no range -> auto-moments (transcript -> LLM picks the best segments)
    if (url && !/\d{1,2}[:.]\d{2}\s*(?:to|-|–|—|until)/i.test(text)) {
      pendingAuto.set(userId, url);
      return ctx.reply('Quick check: do you own or have the rights to use this video?\nReply "yes" and I\'ll read the transcript and clip the best moments.');
    }

    let attachmentPath: string | undefined;
    const fileId = ctx.message.video?.file_id ?? ctx.message.document?.file_id ?? ctx.message.voice?.file_id;
    if (fileId) {
      const link = await ctx.telegram.getFileLink(fileId);
      attachmentPath = await download(link.href);
    }

    // Nothing actionable yet (e.g. a plain "hi") — point them at how it works.
    if (!attachmentPath && !text.trim()) return ctx.reply(WELCOME, { disable_web_page_preview: true });

    // Acknowledge the render up front, except when a YouTube clip still needs the ownership check.
    const needsOwnership = !!url && /\d{1,2}[:.]\d{2}\s*(?:to|-|–|—|until)/i.test(text);
    if (!needsOwnership) {
      await ctx.reply(attachmentPath
        ? 'On it — editing your clip. This takes about a minute…'
        : 'On it — generating your reel. This takes about a minute…').catch(() => {});
    }
    return dispatch({ userId, platform: 'telegram', text, attachmentPath, isPro: false }, ctx, pending);
  });

  // Register the command menu + profile copy so the bot presents like the product (best-effort).
  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'How LazyClip works' },
      { command: 'help', description: 'Show examples' },
    ]);
    await bot.telegram.setMyShortDescription('Your video editor in chat — generate, edit, and clip vertical reels.');
    await bot.telegram.setMyDescription(
      'Send a topic, a video, or a YouTube link and get back a captioned vertical reel.\n\n' +
      '• Generate from an idea\n• Edit a clip you send\n• Clip a moment from any YouTube video\n\nFull studio at lazyclip.buzz',
    );
  } catch (e) { console.error('setup (commands/description) failed:', (e as Error).message); }

  bot.launch();
  console.log('reely gateway up (telegram)');
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

async function autoMoments(url: string, userId: string, ctx: any) {
  await ctx.reply('🔍 reading the transcript, picking the best moments…');
  let moments;
  try {
    moments = await pickMoments(url, 3);
  } catch (e) {
    return ctx.reply(`couldn't auto-pick: ${(e as Error).message}`);
  }
  await ctx.reply(`found ${moments.length} moment${moments.length > 1 ? 's' : ''}:\n` +
    moments.map((m, i) => `${i + 1}. ${m.start}–${m.end} — ${m.hook}`).join('\n') + '\n\ncutting them now…');
  for (const [i, m] of moments.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 15_000));   // space extractions — rapid ones get 403'd
    await ctx.reply(`✂️ ${m.start}–${m.end}: ${m.hook}`).catch(() => {});
    await dispatch({ userId, platform: 'telegram', text: `clip ${url} ${m.start} to ${m.end}`,
      isPro: false, confirmedOwnership: true,
      editPlan: { reframe: m.reframe, broll: m.broll, hook: m.hook, gifs: m.gifs, zooms: m.zooms } }, ctx, new Map());
  }
}

async function dispatch(inc: Incoming, ctx: any, pending: Map<string, Incoming>) {
  await ctx.sendChatAction('upload_video').catch(() => {});
  const replies = await reely.handle(inc);
  for (const r of replies) {
    if (r.kind === 'text') {
      await ctx.reply(r.text);
      if (/rights|confirm/i.test(r.text)) pending.set(inc.userId, inc);
    } else {
      const caption = [r.caption, FOOTER].filter(Boolean).join('\n\n');
      await ctx.replyWithVideo({ source: r.filePath }, { caption });
      await shareToGcs(r.filePath, ctx).catch(() => {});   // best-effort; never fails the reply
    }
  }
}

// upload the reel in 1080p + 720p to GCS and reply with signed links (12h). No-op without GCS_BUCKET.
async function shareToGcs(filePath: string, ctx: any) {
  const bucket = process.env.GCS_BUCKET;                    // e.g. gs://conmap-auto-videos/reels
  const sa = process.env.GCS_SIGN_SA;                       // service account that signs the URLs
  if (!bucket || !sa) return;
  const name = filePath.split('/').pop()!.replace(/\.mp4$/, '');
  const p720 = join(tmpdir(), `${name}-720p.mp4`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', filePath, '-vf', 'scale=720:-2',
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', p720]);
  const urls: string[] = [];
  for (const [label, path, key] of [['1080p', filePath, `${name}-1080p.mp4`], ['720p', p720, `${name}-720p.mp4`]] as const) {
    await run('gcloud', ['storage', 'cp', path, `${bucket}/${key}`]);
    if (process.env.GCS_SHARE_LINKS !== '1') continue;   // archive-only by default: signed links stay private
    const { stdout } = await run('gcloud', ['storage', 'sign-url', `${bucket}/${key}`, '--duration=12h',
      `--impersonate-service-account=${sa}`, '--format=value(signed_url)']);
    urls.push(`${label}: ${stdout.trim()}`);
  }
  if (urls.length) await ctx.reply(`📎 share links (12h):\n${urls.join('\n\n')}`);
}

async function download(url: string): Promise<string> {
  const res = await fetch(url); const buf = Buffer.from(await res.arrayBuffer());
  const p = join(tmpdir(), `reely-in-${Date.now()}.mp4`); await writeFile(p, buf); return p;
}

main().catch((e) => { console.error(e); process.exit(1); });
