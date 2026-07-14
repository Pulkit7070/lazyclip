# CLAUDE.md — LazyClip project context (read this first)

> Multiple agents/sessions work on this repo (Claude + Codex). Keep this file updated.
> Last updated by Claude: building auth + dashboard + pricing + Dodo + waitlist→users migration.

## What this is
**LazyClip** — "your video editor lives in chat." Monorepo:
- **root** = Vite/React/Tailwind marketing site + waitlist + (in progress) app dashboard.
- **`backend/`** = the agent (Node/TS, ffmpeg/yt-dlp) — 3 modes (generate/edit/clip). Deploys to GCP Cloud Run (`backend/docs/DEPLOY-GCP.md`). GCP VM `conmap-vps` already provisioned in a parallel session.

## Live infra (production)
- **Domain:** `lazyclip.buzz` + `www.lazyclip.buzz` → Vercel (A `216.198.79.1`, www CNAME). DNS at Spaceship.
- **Vercel:** project `video-hermess` (account `pulkit7070`). Deploy: `npx vercel deploy --prod --yes`. Env `VITE_CONVEX_URL` set (production).
- **Convex:** team `pulkit-saraf`, project `lazyclip-9b988`.
  - **prod** deployment = `kindhearted-owl-403` → `https://kindhearted-owl-403.convex.cloud` (the LIVE site writes here). Deploy: `npx convex deploy --yes`. Run/inspect: `npx convex run <fn> --prod`.
  - **dev** deployment = `silent-starfish-567` (local dev only; `.env.local`). ⚠️ Don't confuse the two — waitlist rows are in **prod**, dashboard shows the deployment picker.
- **Resend:** domain `lazyclip.buzz` **verified**; sender `hello@lazyclip.buzz`. Convex prod env: `RESEND_API_KEY`, `WAITLIST_FROM` set. Welcome email fires on waitlist signup (scheduled action `email:sendWelcome`).
- **Clerk:** app **"LazyClip"** (`pk_test_Z2VuZXJvdX…`), issuer `https://generous-tadpole-21.clerk.accounts.dev`. CLI logged in as prateeksaraf9@gmail.com.
- **Dodo:** checkout wired in `convex/payments.ts` (needs `DODO_API_KEY` env for live checkout).

## Convex functions (`convex/`)
- `waitlist.ts` — `join` (dedupe, position = 1400+count, schedules welcome email), `count`.
- `users.ts` — `currentUser`, `ensureUser` (called on Clerk sign-in).
- `credits.ts` — `getPacks`, `consumeGeneration` (free quota then credits, throws NO_CREDITS), internal `addCredits`.
- `payments.ts` — `createCheckout` (Dodo), test-only `simulatePurchase`.
- `email.ts` — `sendWelcome` (Resend; uses `public/waitlist-welcome.png`).
- `http.ts` — Dodo webhook → addCredits. `schema.ts`, `config.ts` (FREE_LIMIT=5, PACKS: starter $2/20cr, creator $5/60cr).

## Frontend
- `src/main.tsx` — ConvexProvider (+ ClerkProvider when key set). `src/lib/convexApi.ts` — function refs + `authEnabled`/`convexEnabled`.
- Waitlist forms (`HeroSection`, `FinalCTA`) → `waitlist.join` (localStorage fallback). Success = "🎉 Congratulations" (no queue number).
- `src/components/Account.tsx` — Clerk sign-in + credits UI.

## Status / TODO (in progress)
- [x] Waitlist → prod Convex (working; ~36 signups). Welcome email (verified domain).
- [x] Clerk Google sign-in wired (app 'LazyClip', issuer generous-tadpole-21; keys in Vercel/Convex/local).
- [x] Routing (react-router): `/`, `/pricing`, `/create` — all live (200). SPA rewrites in vercel.json.
- [x] Dashboard `/create` — sign-in gate, credits, mode picker, credit-gated generate (media delivery = TODO via agent).
- [x] Pricing `/pricing` — free + packs, Dodo checkout (needs DODO_API_KEY for live).
- [x] Waitlist→users: ensureUser grants Founding Creator + 20 credits if email was on waitlist.

## Gotchas
- Concurrent git with Codex — pull before pushing; my work has been preserved across merges. Commit + `git push origin HEAD:main`.
- Two Convex deployments (prod vs dev) — live site = prod `kindhearted-owl-403`.
- Convex functions use generic builders + `declare const process` for env typing.
- Vercel builds bake `VITE_*` env at build time — redeploy after changing env.

## Recent (this session)
- Clerk: **"convex" JWT template created** (jtmp_…) — REQUIRED for Clerk↔Convex auth; without it users can't sign in. Google OAuth enabled. app_id app_3GOmo5kw9djyUoSQfiob5hDfd14, issuer generous-tadpole-21.clerk.accounts.dev.
- Post-login redirect → /create (signInForceRedirectUrl/signUpForceRedirectUrl on ClerkProvider).
- Nav: Sign up / Sign in / Pricing / Dashboard (Header uses Clerk). Landing waitlist CTA relabeled "Sign up" and redirects to /create after submit.
- PostHog analytics wired (src/lib/posthog.ts; VITE_POSTHOG_KEY, US cloud host) in main.tsx.
- Generation queue: convex/generate.ts (requestGeneration/myJobs/claimNextJob/completeJob) + genJobs table + backend/src/webPoller.ts (VM poller → pipeline → GCS signed URL). Dashboard /create now calls generate:requestGeneration. Poller not yet running on the VM (needs npm i convex @google-cloud/storage + CONVEX deploy key + GCS bucket conmap-auto-videos).
- Data (prod Convex kindhearted-owl-403): waitlist ~95 signups; users table populates on first Clerk sign-in (founding creator + 20 credits if email on waitlist).
- Dodo: pending — user's Dodo account not verified yet; createCheckout ready, needs DODO_API_KEY.
