# Deploy the agent to Google Cloud Run

Prereqs (your machine - not installed here yet):
```bash
brew install --cask google-cloud-sdk   # or https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project <YOUR_PROJECT_ID>
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

Build + deploy (from repo root, points at backend/):
```bash
gcloud run deploy reely-agent \
  --source backend \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 2Gi --cpu 2 --concurrency 4 --min-instances 1 \
  --set-env-vars LLM_API_KEY=...,ELEVENLABS_API_KEY=...,WHISPER_API_KEY=...,TELEGRAM_BOT_TOKEN=...
```
`--source backend` builds the Dockerfile via Cloud Build (no local Docker needed).

## Cloud Run HTTP note
Cloud Run expects the container to listen on `$PORT`. The Telegram gateway uses long-polling, not
HTTP, so either: keep **--min-instances=1** (simplest, poller stays alive), switch telegraf to
**webhook mode** serving `$PORT`, or deploy as a **Cloud Run Job** / small **GCE VM** for a pure worker.

## Sizing
2 vCPU / 2Gi handles ~3 concurrent ffmpeg jobs behind the queue (per ARCHITECTURE.md caps).
