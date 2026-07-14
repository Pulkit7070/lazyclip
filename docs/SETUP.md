# reely - Setup

## ✅ Already working locally (done automatically)

The pipeline runs end-to-end from the terminal right now - no agent runtime, no Telegram, no API keys.

```bash
npm install
npm run build        # tsc, clean
npm test             # 52/52 pass

# run any mode from the CLI:
npm run reely -- "make it vertical with a watermark" fixtures/sample.mp4   # EDIT
npm run reely -- "why UPI beat credit cards in india"                     # GENERATE
npm run reely -- "clip https://youtu.be/aqz-KE-bpKQ 0:02 to 0:06"         # CLIP (yt-dlp)
```

Each prints the path to a real 1080×1920 `.mp4`. Verified: all three modes produce valid
video+audio; the YouTube clip downloads only the requested segment via yt-dlp.

Installed for you: `yt-dlp` (brew), `telegraf` (npm), `.env` created from the template.

---

## 🔧 Manual steps (kept aside - need your accounts/keys)

Everything below is optional for the local demo (there are offline fallbacks) but required for the
full/live experience and the buildathon power-ups.

### 1. API keys - edit `.env`
| Var | For | Without it (fallback) |
|---|---|---|
| `LLM_API_KEY` (+`LLM_BASE_URL`,`LLM_MODEL`) | brainstorm/script quality | template scripts |
| `WHISPER_API_KEY` (+`WHISPER_BASE_URL`) | real caption text (edit/clip) | caption **bar** placeholder |
| `ELEVENLABS_API_KEY` | real voiceover | macOS `say` |
| `TELEGRAM_BOT_TOKEN` | the chat bot | CLI only |
| `DODO_CHECKOUT_URL`, `DODO_WEBHOOK_SECRET` | ₹99 unlock | in-memory Pro toggle |
| `CONVEX_URL` | persisted state | in-memory store |

Get a Telegram token from **@BotFather** (`/newbot`). Whisper: Groq (`https://api.groq.com/openai/v1`) or OpenAI.

### 2. Real caption text (burned) - needs a full ffmpeg build
This machine's ffmpeg lacks `drawtext`/`libass`, so captions render as a bar. On the VPS install a
full build: `brew install ffmpeg` here already includes libass in most bottles - verify with
`ffmpeg -filters | grep -E "drawtext|subtitles"`. On Linux use the static ffmpeg or `apt install ffmpeg`.

### 3. Agent runtime (the eligibility layer)
The agent runtime connects Telegram/WhatsApp and routes to the reely skill. Install it on
the day from the **official handbook one-liner** (the agent runtime), then:

```bash
# agent-runtime config (template)
model:
  provider: openai-api
  base_url: https://api.openai.com/v1     # or OpenRouter / Nous Portal
  api_key: ${LLM_API_KEY}
  name: gpt-5.6-sol
gateway:
  telegram: { token: ${TELEGRAM_BOT_TOKEN} }
skills:
  dirs: [ /Users/psudokit/video-hermess ]   # picks up .hermes.md -> the reely skill
```

Then start the agent-runtime gateway. The reely skill's entry is `src/gateway/run.ts` (Telegram) which calls
`createReely()`. Keep prompt-history + commits as the Way-1 (built-with-Codex) receipts.

> Note: exact agent-runtime install command comes from the buildathon handbook on the day. Don't pre-build
> the product code off-site - this repo is the reference/prototype; rebuild fresh on the floor.

### 4. Run the live bot (after token set)
```bash
npm run gateway     # connects Telegram; DM it a clip / idea / youtube link
```

### 5. Deploy (optional)
- Convex: `npx convex dev` (schema + functions in `convex/`).
- Landing: deploy `web/index.html` to Cloudflare Pages; wildcard/OG later.
- Dodo: create the ₹99 product, set the checkout URL + webhook → `handleDodoWebhook` sets Pro.
