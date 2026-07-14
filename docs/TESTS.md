# reely — Testing Plan

**63 tests, all green.** `npm test` (vitest). Layered so failures point at the right place.

## Layers

| Layer | Files | What it proves | Speed |
|---|---|---|---|
| **Unit (pure)** | router, captions, transcribe(parse), content, data | logic in isolation, no I/O — NL→JobSpec, .ass/.srt builders, whisper JSON parsing, free-tier cap, Dodo webhook | ms |
| **Module (real tools)** | media (ffmpeg), ingest (ffprobe/yt-dlp args) | each op produces valid media; validation rejects bad input | seconds |
| **Integration** | app.integration | full spine route→queue→prepare→ffmpeg→file, Mode 1 + Mode 2 end-to-end | ~15s |
| **Edge / adversarial** | edge | broken inputs, missing streams, graceful degradation, injection, load | ~2s |

## What the edge suite covers (the failure modes that actually bite)

- **Bad files** — corrupt / zero-byte / missing → clean `IngestError`, never a raw crash.
- **Missing streams** — `speed` on no-audio (no `[0:a]` crash), `convert mp3` on no-audio → clear
  `MediaError`, `format` on audio-only → "no video to edit", no-audio video formats fine (drops audio).
- **Graceful pipeline** — a corrupt upload returns friendly text to the user, not a stack trace.
- **Odd/portrait sources** — portrait → 9:16 without distortion; even-dimension scale guards libx264.
- **Security** — injection-y watermark text can't crash ffmpeg; inputs read with
  `-protocol_whitelist file` (http/hls/concat refused → SSRF guard).
- **Load / anti-crash** — 12 concurrent jobs across users never exceed the concurrency cap and all
  complete; temp dirs cleaned (the core "won't fall over under a spike" claim, tested).

## Bugs this pass caught and fixed
1. `speed` crashed on no-audio video (unconditional `[0:a]` map). → conditional audio filter.
2. `convert mp3` crashed on no-audio. → clear `MediaError`.
3. missing file surfaced a raw `ENOENT`. → wrapped as `IngestError("couldn't find that file")`.
4. `-protocol_whitelist file` (documented SSRF guard) wasn't applied. → now on every file input.
5. `format` silently "succeeded" on audio-only. → rejects with `MediaError`.

## How to run
```bash
npm test                          # everything (63)
npx vitest run src/edge.test.ts   # just edge cases
npx vitest run src/media          # just the ffmpeg ops
npx vitest                        # watch mode
```
Fixtures: `fixtures/sample.mp4` (happy path) + `fixtures/edge_*` (corrupt, zero, noaudio, audioonly, portrait).

## Known gaps (feature-level, not bugs — next pass)
- **Output size vs platform send-limit** — no auto-compress-to-fit / link fallback yet if an output
  exceeds WhatsApp 16MB / Discord 25MB / Telegram 50MB.
- **YouTube live-stream / age-restricted / geo-block** — errors are caught generically; not
  yet distinguished with tailored messages, and live-stream isn't pre-detected before download.
- **yt-dlp rate-limit / bot-detection** — no backoff/cookies retry.
- **Real burned caption text locally** — needs a full ffmpeg (libass); this build degrades to a bar.
  Covered by a runtime `hasFilter('subtitles')` check, so it's correct on a VPS build.
- These need network or a full-ffmpeg VPS to test meaningfully — verify there before the event.
