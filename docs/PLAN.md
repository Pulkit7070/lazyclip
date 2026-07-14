# reely — Parallel Build Plan (2 CLIs × 5 tasks)

This file is **self-contained**. An agent with zero prior context can execute any task below
using only this file (+ `ARCHITECTURE.md` in the same folder). Read §0 first, then your task.

---

## 0. READ FIRST — full context

### What we're building
**reely** — a content studio that lives in a chat, built as a native **Hermes skill**
(Hermes = Nous Research's open-source agent framework). A user sends a message to a Telegram/
WhatsApp bot and gets back a **captioned vertical short**. Three input modes, ONE shared engine
(*Hermes writes the words, ffmpeg cuts the video*):

1. **Generate** — user gives a topic → Hermes brainstorms 2–3 viral angles → writes hook+script
   → ElevenLabs voiceover → captions over kinetic text/b-roll → a 14–20s reel.
2. **Edit** — user sends raw footage → Whisper transcribes → Hermes writes captions/meme text
   → ffmpeg trims/captions/formats → subtitled clip or sticker.
3. **Clip** — user pastes a YouTube link + timestamps (or a topic) → yt-dlp downloads **only that
   segment** → captioned vertical short.

### Why Hermes (eligibility — do not remove)
Hermes is the runtime the user talks to. Its **gateway** connects Telegram/WhatsApp; the media
toolset registers as a Hermes **skill**; Hermes does the **content generation** (brainstorm/
script/captions). We also build the code *with* Hermes (keep session receipts). This is what
makes the project eligible — the product runs ON Hermes and users interact THROUGH it.

### Stack (decided)
TypeScript/Node · Hermes (Telegram gateway first) · `ffmpeg` + `yt-dlp` (system binaries) ·
Whisper via API (Groq/OpenAI) · ElevenLabs API (voice) · OpenAI-compatible LLM (via Hermes) ·
Convex (state) · Cloudflare Pages+R2 (landing/delivery) · Dodo (₹99 unlock) · queue = in-process
concurrency limiter (`p-limit`). **No Remotion. No GPU. Model is a remote API call.**

### Non-negotiable safety rules (every task must respect)
- **Never interpolate user text into a shell string.** All ffmpeg/yt-dlp calls use argument
  arrays built from the validated Op schema (below).
- ffmpeg: `-protocol_whitelist file` (no network protocols), `-threads 2`.
- yt-dlp: `--download-sections` only; cap source duration; reject live streams.
- Per job: ≤50MB, ≤5min, ≤1080p, wall-clock 60–120s → `kill -9` the process group on timeout.
- Global concurrency = `cores-1`; per-user = 1 active; unique temp dir per job; delete all temp
  files after send.

### Repo conventions
- One module = one dir under `src/`. **Only edit your task's dir + its own test.** Never edit
  `src/types.ts` without broadcasting (it's the shared contract).
- Test runner: **vitest**. Each module ships `src/<module>/<module>.test.ts`.
- Fixtures live in `fixtures/` (`sample.mp4` 10s clip, `sample.srt`, `YT_URL.txt`, `topic.txt`).
- Run: `npm run build` (tsc), `npm test` (vitest). Env in `.env` (see `.env.example`).

### Buildathon note
Fresh build, on-site. This doc is the execution script for the day — don't ship pre-built code.

### THE FROZEN CONTRACTS (create as `src/types.ts` — verbatim)
```ts
export type Op =
  | { op: 'clip';      start: string; end: string }
  | { op: 'trim';      start: string; end: string }
  | { op: 'captions';  source: 'whisper' | 'script'; style: 'karaoke'|'meme'|'clean'; text?: string }
  | { op: 'format';    aspect: '9:16' | '1:1' | '16:9' }
  | { op: 'speed';     factor: number }
  | { op: 'convert';   to: 'mp4' | 'mp3' | 'gif' | 'webm' }
  | { op: 'watermark'; text: string; show: boolean; position?: 'br'|'bl'|'tr'|'tl' }
  | { op: 'sticker' }
  | { op: 'thumbnail'; at: string }
  | { op: 'voiceover'; voiceId: string; script: string }
  | { op: 'broll';     keywords: string[] };

export interface MediaMeta { durationSec: number; width: number; height: number; hasAudio: boolean; hasVideo: boolean; bytes: number; }
export interface Word { text: string; start: number; end: number; }
export interface Angle { hook: string; premise: string; whyViral: string; }

export interface JobSpec {
  id: string; userId: string;
  platform: 'telegram' | 'whatsapp' | 'discord' | 'cli';
  mode: 'generate' | 'edit' | 'clip';
  source: { kind: 'upload' | 'youtube' | 'none'; path?: string; url?: string; sections?: string };
  ops: Op[];
  isPro: boolean;
  limits: { maxBytes: number; maxDurationSec: number; timeoutSec: number };
}
export interface JobResult {
  ok: boolean; outputPath?: string;
  meta?: { bytes: number; durationSec: number; ms: number };
  failedOp?: number; error?: string;
}
export interface JobCtx { tmpDir: string; isPro: boolean; }
export interface ChatCtx { userId: string; platform: JobSpec['platform']; attachmentPath?: string; isPro: boolean; }
```

---

## How to run (two parallel CLIs)

- **CLI-1 runs Batch A** (foundation + integration spine). **Run A1 FIRST** — it creates the repo,
  `src/types.ts`, and fixtures, then commits/pushes.
- **CLI-2 runs Batch B** (independent leaf modules). Each B task only needs `src/types.ts`. Either
  `git pull` after A1 pushes, or (if on a separate clone) create `src/types.ts` from §0 verbatim so
  both stay identical.
- Both share one git repo (or two worktrees of it). Because each task writes only its own dir,
  parallel commits don't collide.
- **A5 is the join point:** run it only after Batch B's modules (B1–B5) are merged.

Dependency map:
```
A1 (foundation) ──┬─▶ B1 media-core  ─┐
                  ├─▶ B2 ingest       │
                  ├─▶ B3 transcribe   ├─▶ A5 integrate + Mode 2 slice + Dodo + demo  (JOIN)
                  ├─▶ B4 content      │
                  ├─▶ B5 persist/pay  ┘
                  ├─▶ A2 queue/executor ─┐
                  ├─▶ A3 router          ├─▶ A4 gateway ─▶ A5
                  └───────────────────────┘
```

---

## BATCH A — CLI-1 (foundation + integration spine)

### A1 · Repo foundation  🔒 run first, blocks everyone
- Create: repo skeleton, `package.json` (deps: typescript, vitest, p-limit, convex, telegraf or
  grammy for TG, dotenv), `tsconfig.json`, `src/` module dirs, `src/types.ts` (verbatim from §0),
  `fixtures/` (a 10s `sample.mp4`, `sample.srt`, `YT_URL.txt`, `topic.txt`), `.hermes.md` (describe
  the reely skill), `.env.example` (LLM_API_KEY, ELEVENLABS_API_KEY, WHISPER_API_KEY, CONVEX_URL,
  DODO_KEY, TELEGRAM_BOT_TOKEN).
- Stub every module's exported function (throw `"not impl"`) so imports resolve.
- **Done when:** `npm run build` compiles and `npm test` runs (stubs red/skipped). Commit + push.

### A2 · Queue / executor  (`src/queue/`)
- Implement `enqueue(job: JobSpec): Promise<JobResult>`: global concurrency `cores-1`, per-user 1
  active, queue-depth reject >20, `mkdtemp` per job, run `ops` in order via `runOp` (import from
  `src/media`; mock it until B1 lands), per-op + wall-clock timeout with process-group kill,
  validate output non-empty, delete temp dir in `finally`.
- **Done when:** test drives a 3-op mock job to success, and a 4th concurrent job from the same
  user queues (doesn't run immediately). `src/queue/queue.test.ts` green.

### A3 · NL → JobSpec router  (`src/router/`)
- Implement `route(message: string, ctx: ChatCtx): Promise<JobSpec>`: LLM maps intent to a
  validated `Op[]` + detects mode/source (upload / youtube url+sections / none). Reject invalid
  ops. Watermark op `show = !ctx.isPro`.
- **Done when:** 6 example messages (edit/clip/generate + a vague one + an impossible chain +
  a YT link) map to the expected JobSpec. `src/router/router.test.ts` green.

### A4 · Hermes skill + Telegram gateway  (`src/gateway/`)
- Register the reely skill in Hermes; wire the Telegram gateway: message/file in → `route()` →
  `enqueue()` → send resulting file back. Progress/"in queue" replies. Ownership checkbox prompt
  for YouTube links.
- **Done when:** a real TG chat: send text or a file, receive a status reply then a file back
  (can use a passthrough op until A5). Manual test documented in `src/gateway/README.md`.

### A5 · Integrate + Mode 2 slice + Dodo + demo  (JOIN — after B1–B5 merged)
- Replace mocks with real B modules. Wire **Mode 2 (edit)** fully: upload → transcribe (B3) →
  captions (B4) → media-core ops (B1) → send. Hook Dodo isPro (B5) to the watermark toggle.
  Enforce free-tier daily cap (B5). Add the 3 remaining edge handlers (bad file, oversize,
  private YT).
- **Done when:** in a real chat, uploading `sample.mp4` returns a captioned vertical clip;
  watermark shows for free, hidden for Pro; a 4th job queues. End-to-end test green.

---

## BATCH B — CLI-2 (independent leaf modules; each only needs `src/types.ts`)

### B1 · media-core  (`src/media/`)  ⭐ highest priority in B (A5 needs it)
- Implement `runOp(inputPath: string, op: Op, ctx: JobCtx): Promise<{ outputPath: string }>` for
  every Op: trim, clip, captions (burn `.ass`/`drawtext`; karaoke/meme/clean), format (9:16/1:1/
  16:9), speed, convert (mp4/mp3/gif/webm), watermark, sticker, thumbnail. Arg-array calls only;
  `-protocol_whitelist file`, `-threads 2`. (voiceover/broll can stub or live here — coordinate.)
- **Done when:** each op turns `fixtures/sample.mp4` into a valid output verified by ffprobe.
  `src/media/media.test.ts` green.

### B2 · ingest  (`src/ingest/`)
- Implement `ingest(source, limits): Promise<{ path; meta }>` (yt-dlp `--download-sections` for
  youtube, saved upload for upload, none) and `probe(path): Promise<MediaMeta>` (ffprobe) with
  validation: reject bad/oversize/too-long/live; downscale >1080p.
- **Done when:** a real YouTube URL + `*0:05-0:15` yields a ≤10s file; a corrupt/oversize file is
  rejected with a clear error. `src/ingest/ingest.test.ts` green.

### B3 · transcribe  (`src/transcribe/`)
- Implement `transcribe(path: string): Promise<{ srt: string; words: Word[] }>` via Whisper API.
- **Done when:** `fixtures/sample.mp4` → non-empty srt with sane word timings.
  `src/transcribe/transcribe.test.ts` green.

### B4 · content (LLM)  (`src/content/`)
- Implement `brainstorm(topic): Promise<Angle[]>` (2–3 viral angles), `script(angle):
  Promise<{ script; captions }>` (VO script that reads in ≤20s + caption text), and
  `captionText(words: Word[], style): Promise<string>` for edit/clip modes.
- **Done when:** a topic yields 3 distinct angles; an angle yields a <20s script.
  `src/content/content.test.ts` green.

### B5 · persistence + payments + landing  (`src/data/`, `convex/`, `web/`)
- Convex schema + mutations: `createJob`, `setStatus`, `incUsage` (free-tier daily cap),
  `setPro`. Dodo checkout link + webhook handler → `setPro`. Cloudflare Pages landing + one-field
  waitlist + OG image; serve output files via R2 or bot-direct.
- **Done when:** rows appear in the Convex dashboard; a test Dodo purchase flips `isPro`; the
  landing page is live at a public URL; the free-tier cap blocks a 4th job/day.

---

## Final gate (after A5)
- One end-to-end run per mode (happy path + one edge each). Fire 10 jobs at once → all complete via
  the queue, RAM bounded, temp dir empties. Proof pack: Convex jobs/users table, Datafast visitors,
  Dodo checkout, X analytics. Demo dry-run under 2 minutes, all 3 modes live. Cut Mode 1 first if behind.
