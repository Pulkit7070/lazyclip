# Web generation — dashboard → agent → result

How the web dashboard (`/create`) gets a reel made by the agent on the GCP VM.

## Flow

```
Browser (/create)
  │  requestGeneration({ mode, prompt })        convex/generate.ts (public mutation)
  │    - Clerk identity required (UNAUTHENTICATED otherwise)
  │    - spends a credit: free quota (FREE_LIMIT) then paid credits (NO_CREDITS)
  │    - inserts a genJobs row { status: "queued" }
  ▼
Convex `genJobs` queue  ──────────────────────────────────────────────┐
  ▲                                                                    │
  │  claimNextJob()  (internalMutation)  ── oldest queued → "processing"│
webPoller on the VM (backend/src/webPoller.ts) ◄───────────────────────┘
  │    - runs the reely pipeline (createReely().handle) → mp4
  │    - uploads mp4 to gs://conmap-auto-videos + mints a V4 signed URL
  │    - completeJob({ jobId, resultUrl })  →  status "done" + resultUrl
  │      (failJob({ jobId, error }) on any error  →  status "failed")
  ▼
Browser polls myJobs()  → shows the result (signed URL) or the failure
```

Buckets are private (org policy blocks public buckets), so the agent returns a
short-lived **V4 signed URL** rather than a public object URL.

## Convex functions (`convex/generate.ts`)

| Function            | Kind             | Purpose                                             |
| ------------------- | ---------------- | --------------------------------------------------- |
| `requestGeneration` | mutation         | Web: spend a credit + enqueue a job.                |
| `myJobs`            | query            | Web: caller's 20 most recent jobs, newest first.    |
| `claimNextJob`      | internalMutation | Agent: claim + lock the oldest queued job.          |
| `completeJob`       | internalMutation | Agent: mark done + attach the signed result URL.    |
| `failJob`           | internalMutation | Agent: mark failed with an error message.           |

> One-time setup: the `genJobs` table must be added to `convex/schema.ts`. See
> `convex/GENJOBS_SCHEMA_SNIPPET.md`, then `npx convex deploy --yes`.

## Environment (on the VM)

| Var                                       | Purpose                                                              |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `CONVEX_URL` (or `VITE_CONVEX_URL`)       | Convex deployment to poll — prod `https://kindhearted-owl-403.convex.cloud`. |
| `CONVEX_DEPLOY_KEY` (or `CONVEX_ADMIN_KEY`) | Auth for calling the internal mutations. From `npx convex deploy` / dashboard. |
| `GCS_BUCKET`                              | Output bucket, default `conmap-auto-videos`.                        |
| `WEB_POLL_MS`                             | Poll interval, default `5000`.                                      |
| `SIGNED_URL_TTL_MS`                       | Signed-URL lifetime, default 7 days.                                |

Plus the pipeline's own keys (ElevenLabs / Linkup / etc.) as already documented
for the agent. GCS auth uses the VM's attached service account (ADC) — no key file
needed if the VM's service account can write to the bucket and sign URLs.

## Run the poller on the VM

```bash
cd backend
npm i convex @google-cloud/storage      # once — SDKs not yet in package.json
export CONVEX_URL=https://kindhearted-owl-403.convex.cloud
export CONVEX_DEPLOY_KEY=prod:...        # or CONVEX_ADMIN_KEY
export GCS_BUCKET=conmap-auto-videos
node --import tsx src/webPoller.ts
```

Keep it alive with systemd or pm2, e.g.:

```bash
pm2 start "node --import tsx src/webPoller.ts" --name lazyclip-webpoller
```

## Notes / TODO

- `uploadAndSign` in `webPoller.ts` dynamically imports `@google-cloud/storage`;
  if it is not installed the job fails cleanly via `failJob` with an install hint.
  Install the SDK on the VM to enable real uploads.
- The poller drains a backlog immediately (processes back-to-back while jobs exist)
  and only idle-waits `WEB_POLL_MS` when the queue is empty.
- Web jobs run with `isPro: true` on the pipeline `Incoming` to bypass the Telegram
  free-tier daily cap — credit accounting already happened in `requestGeneration`.
