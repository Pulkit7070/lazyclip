# reely — Architecture

Chat-native content studio, built as a native **Hermes skill**. One engine, three input
modes. ffmpeg-first, no Remotion, everything heavy is capped and queued.

---

## 1. High-level shape

```
                 ┌─────────────────────────────────────────────┐
   chat msg ───▶ │  HERMES GATEWAY (Telegram first, then WA/DC) │
 (idea/file/URL) └───────────────┬─────────────────────────────┘
                                 │  message + attachments + user ctx
                                 ▼
                 ┌─────────────────────────────────────────────┐
                 │  reely SKILL (Hermes)                        │
                 │   • intent + brainstorm/script (LLM)         │
                 │   • NL → OpSchema (validated, no shell str)  │
                 └───────────────┬─────────────────────────────┘
                                 │  JobSpec
                                 ▼
                 ┌─────────────────────────────────────────────┐
                 │  EXECUTOR  (Node/TS, capped worker pool)     │
                 │   ingest → transcribe → ffmpeg chain → send  │
                 └───┬───────────┬───────────┬─────────────┬────┘
                     │           │           │             │
                 yt-dlp      Whisper      ffmpeg        ElevenLabs
                (segment)  (transcribe)  (all cuts)     (Mode 1 TTS)
                                 │
                 Convex (jobs/users/usage)   Cloudflare (landing/OG/deliver)   Dodo (₹99 unlock)
```

**Eligibility:** Hermes is both the coding partner (Way 1) and the base harness the product
runs on with end users interacting through it (Way 2). The skill registration + NL routing +
content generation is the "≥1 Hermes capability doing real work."

---

## 2. Tech stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript / Node | fits Convex + Cloudflare + Pulkit's stack |
| Agent | Hermes (Nous Research), Telegram gateway first | mandatory; TG is the recommended first gateway |
| Media cut | `ffmpeg` (system binary) | does 100% of trim/caption/format/convert/sticker |
| Ingest | `yt-dlp` with `--download-sections` | segment-only download = light |
| Transcribe | Whisper via fast API (Groq/OpenAI) | no local model infra; swap to whisper.cpp later |
| Voice | ElevenLabs API | Mode 1 voiceover; +25 power-up |
| Live search | Linkup API | Mode 1 grounds the script in current facts + sources; +25 power-up |
| LLM | OpenAI-compatible (GPT-5.6 Sol via Hermes) | brainstorm + script + captions + routing |
| State | Convex | jobs/users/usage + free-tier cap; +25 |
| Host/deliver | Cloudflare Pages + R2 | landing, OG cards, temp file URLs; +25 |
| Pay | Dodo checkout + webhook | ₹99 watermark unlock; +25 |
| Queue | in-process concurrency limiter (p-limit) | simple for the day; Redis/BullMQ later |

---

## 3. Contracts (freeze these FIRST — everything builds against them)

```ts
// ---- Op schema: the ONLY thing that touches ffmpeg. User text never becomes a shell string.
type Op =
  | { op: 'clip';      start: string; end: string }          // yt / long source
  | { op: 'trim';      start: string; end: string }
  | { op: 'captions';  source: 'whisper' | 'script'; style: 'karaoke'|'meme'|'clean'; text?: string }
  | { op: 'format';    aspect: '9:16' | '1:1' | '16:9' }
  | { op: 'speed';     factor: number }
  | { op: 'convert';   to: 'mp4' | 'mp3' | 'gif' | 'webm' }
  | { op: 'watermark'; text: string; show: boolean; position?: 'br'|'bl'|'tr'|'tl' }
  | { op: 'sticker' }
  | { op: 'thumbnail'; at: string }
  | { op: 'voiceover'; voiceId: string; script: string }     // Mode 1
  | { op: 'broll';     keywords: string[] };                 // Mode 1

// ---- What the router produces and the executor consumes
interface JobSpec {
  id: string;
  userId: string;
  platform: 'telegram' | 'whatsapp' | 'discord' | 'cli';
  mode: 'generate' | 'edit' | 'clip';
  source: { kind: 'upload' | 'youtube' | 'none'; path?: string; url?: string; sections?: string };
  ops: Op[];
  isPro: boolean;
  limits: { maxBytes: number; maxDurationSec: number; timeoutSec: number };
}

interface JobResult {
  ok: boolean;
  outputPath?: string;
  meta?: { bytes: number; durationSec: number; ms: number };
  failedOp?: number;      // index into ops[] if a step died
  error?: string;         // human-facing message
}

// ---- Module function signatures (the interfaces subagents implement in isolation)
runOp(inputPath: string, op: Op, ctx: JobCtx): Promise<{ outputPath: string }>;     // media-core
ingest(source: JobSpec['source'], limits: JobSpec['limits']): Promise<{ path: string; meta: MediaMeta }>;
probe(path: string): Promise<MediaMeta>;                                            // ffprobe validate
transcribe(path: string): Promise<{ srt: string; words: Word[] }>;                  // whisper
brainstorm(topic: string): Promise<Angle[]>;                                        // content
script(angle: Angle): Promise<{ script: string; captions: string }>;               // content
route(message: string, ctx: ChatCtx): Promise<JobSpec>;                             // router
enqueue(job: JobSpec): Promise<JobResult>;                                          // queue
```

Any change to these types is a broadcast event — announce before editing so parallel work
doesn't drift.

---

## 4. The executor pipeline (shared by all 3 modes)

```
enqueue(job)
  └─ acquire slot (global cap = cores-1, per-user cap = 1)
     └─ mkdtemp(job.id)                        # unique temp dir
        ├─ ingest(source)                      # yt-dlp segment | saved upload | none
        │    └─ probe() → reject if bad/oversize/too-long; downscale >1080p
        ├─ [if captions:whisper] transcribe()
        ├─ [if mode=generate] brainstorm→script→voiceover→broll
        ├─ for op of ops: runOp()              # each pure, arg arrays only
        │    └─ per-op timeout; on throw → JobResult.failedOp = i, return last-good
        ├─ validate output (not empty/black/silent, fits platform limit)
        ├─ send file to chat
        └─ finally: kill process group, rm -rf temp dir
```

**Mode differences are only the front of the pipe:**
- **edit** → `source.kind='upload'`, ops start with trim/captions.
- **clip** → `source.kind='youtube'` + `sections`, ops start with clip/captions.
- **generate** → `source.kind='none'`, ops start with voiceover/broll/captions.

---

## 5. Resource & safety (the anti-crash rules)

- Global concurrency = `cores - 1`; per-user = 1 active; queue depth > 20 → reject politely.
- Per job: ≤50MB, ≤5min, ≤1080p, wall-clock 60–120s → `kill -9` the **process group**.
- `ffmpeg -threads 2`; `ffmpeg -protocol_whitelist file` (no network protocols → no SSRF).
- yt-dlp: `--download-sections` only, cap source duration, reject live streams.
- Disk: unique temp dir/job, delete after send, free-space guard, TTL sweep for orphans.
- **No user text is ever interpolated into a shell string** — ops run with argument arrays.
- Free-tier daily cap enforced in Convex (`usage.count`), watermark `show = !isPro`.

---

## 6. Convex schema

```ts
jobs  { id, userId, mode, source, ops, status, inBytes, outBytes, ms, isPro, createdAt }
users { id, platform, handle, freeUsedToday, isPro, refCode }
usage { userId, day, count }           // free-tier limiter
```

Dodo webhook → `users.isPro = true`. Ref codes on watermark → attribution for the viral loop.

---

## 7. Module boundaries (map to subagents — §PLAN.md)

| # | Module | Depends on | Isolated-testable? |
|---|---|---|---|
| A | media-core (ffmpeg op fns) | Op type | ✅ with sample.mp4 |
| B | ingest (yt-dlp + upload + probe) | JobSpec.source | ✅ with a URL + file |
| C | transcribe (whisper) | — | ✅ with sample.mp4 |
| D | content (brainstorm/script/captions) | Linkup (search) | ✅ text I/O |
| D+ | search (Linkup grounding) | — | ✅ parse + offline fallback |
| E | router (NL → JobSpec) | Op names (A) | ✅ msg → schema |
| F | queue/executor | A interface | ✅ with mock ops |
| G | persistence (Convex) | schema | ✅ dashboard |
| H | gateway (Hermes skill wiring) | E,F,G | integration only |
| I | payments + landing (Dodo/CF) | G | ✅ semi |
