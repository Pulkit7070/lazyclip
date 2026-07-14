# genJobs schema snippet — MANUAL STEP

`convex/generate.ts` reads/writes a `genJobs` table that does not yet exist in
`convex/schema.ts`. A human must paste the table below into the `defineSchema({ ... })`
object in `convex/schema.ts` (alongside `users`, `generations`, etc.), then run
`npx convex deploy --yes` (or `npx convex dev`).

> Not edited automatically to avoid colliding with the other agent working on schema.ts.

## Paste this table into `defineSchema({ ... })` in `convex/schema.ts`

```ts
  genJobs: defineTable({
    userId: v.string(),          // Clerk subject (identity.subject)
    mode: v.string(),            // "generate" | "edit" | "clip"
    prompt: v.string(),
    status: v.string(),          // "queued" | "processing" | "done" | "failed"
    resultUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),
```

- `by_status` — the agent's `claimNextJob` scans this for the oldest `"queued"` row.
- `by_user` — the dashboard's `myJobs` lists a caller's own jobs, newest first.

No other edits to `schema.ts` are required.
