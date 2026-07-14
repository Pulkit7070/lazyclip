# reely — Demo Script (2 min demo · 1 min proof · 1 min Q&A)

One narrative thread: **from "I don't know what to post" and "I hate editing" to a finished
captioned short — in a chat, in seconds.** Show three inputs, one engine.

## Before you walk on stage (pre-stage everything)
- Terminal open in `/Users/psudokit/video-hermess`, font size big, `npm run build` already done.
- Telegram open **and** a terminal — decide which you're demoing (Telegram = the story, CLI = the
  reliable fallback). Have BOTH ready.
- Pre-download the YouTube clip once so the live run is instant (yt-dlp caches nothing — so also
  have a **recorded fallback** of the clip run in case the venue wifi dies).
- Have `fixtures/sample.mp4` ready, and a real phone clip if you have one (more relatable than a test card).
- Analytics tabs pre-opened for the proof minute (Datafast, Convex, Dodo, X).
- **Rehearsed fallback:** a screen recording of all 3 modes, in case live breaks. Do not demo live without it.

---

## The 2-minute demo

| Time | On screen | What you say |
|------|-----------|--------------|
| 0:00 | Your face / a phone with 5 editing apps open | "To post one 15-second reel you open CapCut to trim, a site to convert, another to caption, another to make a sticker. Fifteen minutes of uploading and downloading. I built a thing that does all of it in a chat." |
| 0:15 | Telegram chat with the bot | "This is reely. It's a Hermes agent. Watch — I'll just talk to it." |
| 0:20 | **WOW — generate.** Type: *"make me a reel on why UPI beat credit cards"* | "I don't give it footage. I give it an idea. Hermes brainstorms a viral angle, writes the script, voices it, and cuts a vertical reel." |
| 0:40 | The finished 14–20s reel plays in-chat, captions + voiceover | *(let it play 3-4s, say nothing — let the room react)* "That was one sentence to a chat." |
| 0:55 | **Edit.** Send a raw clip + *"caption it and make it vertical"* | "Now the other direction. I send a raw clip — it transcribes it, writes the captions, and formats it 9:16." |
| 1:10 | Captioned vertical clip comes back | "Same engine. Different door." |
| 1:20 | **Clip.** Paste *"clip this https://youtu.be/… 41:20 to 41:55"* | "And the one people will actually share — paste any YouTube link and a timestamp. It pulls just that moment, not the whole two-hour video, and hands back a captioned short." |
| 1:35 | The clipped short returns | "Podcast clippers pay editors for this. Here it's a message." |
| 1:45 | Results screen showing a "made with reely" watermark + a **Go Pro ₹99** button | "Every free reel carries our watermark — that's the ad. Drop it for ₹99, one tap, UPI." |
| 1:55 | Tap Pro → watermark gone (pre-arranged) | "That's the whole loop: free reels spread it, ₹99 removes the mark. Built on Hermes, ffmpeg does the cutting." |

**If wifi/Telegram fails,** switch to the terminal without breaking stride:
```bash
npm run reely -- "why UPI beat credit cards in india"                     # generate
npm run reely -- "caption it and make it vertical" fixtures/sample.mp4     # edit
npm run reely -- "clip https://youtu.be/aqz-KE-bpKQ 0:02 to 0:06"          # clip (pre-run once)
```
Each prints the path to a real 1080×1920 mp4 — open it. Same story, zero network risk.

---

## The 1-minute proof (numbers on screen — "if it isn't on screen, it doesn't count")

Say it while clicking through, in this order:
1. **Signups (the 25× metric)** — Convex `users` table, scroll it live. "N real signups, here they are."
2. **Visitors** — Datafast dashboard (mentor read-only access ready). "M visitors from the launch."
3. **Revenue** — Dodo dashboard showing a real ₹99 checkout. "Live payments, not a mock."
4. **Reach + amplification** — X analytics: impressions > follower count, and open 1–2 notable reshares' profiles.
5. One line: "impressions→visitors and visitors→signups are both inside the rubric's caps — these are clean numbers."

---

## Q&A prep (1 min — the likely questions)

- **"Does it scale / won't it crash?"** → ffmpeg-first, no Remotion. Capped job queue: concurrency
  = cores−1, one active job per user, hard 50MB/5-min/120s limits, temp cleaned every job. A spike
  queues ("you're #6 in line"), it doesn't fall over. Runs on one modest VPS; no GPU (the model is an API call).
- **"How is this Hermes and not just ffmpeg?"** → Hermes is the runtime users talk to — the gateway,
  the skill routing, and the content generation (brainstorm/script/captions). We also built it with Hermes.
- **"Copyright on the YouTube clips?"** → ownership/rights confirmation before any download, segment-only
  fetch, attribution on output. Positioned for your own / licensed content.
- **"What's real vs faked?"** → all three modes ran live on real ffmpeg; 52 passing tests; the only
  API-gated pieces (better scripts, burned caption text, ElevenLabs voice) have working fallbacks.
- **"Business?"** → ₹99 one-time to drop the watermark (proven micro-payment pattern), priority queue
  + longer clips for Pro. The watermark is simultaneously the ad and the paywall.

## The ask (close on this)
"Try it — send the bot a YouTube link right now. Free reels carry our mark; ₹99 drops it. That's the loop."
