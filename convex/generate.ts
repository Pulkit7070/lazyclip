// Generation job queue — bridges the web dashboard (/create) and the GCP agent.
//
// Flow: web calls requestGeneration (spends a credit, enqueues a genJobs row) ->
// the agent's webPoller on the VM calls claimNextJob -> runs the pipeline ->
// uploads to GCS -> calls completeJob (or failJob) -> dashboard polls myJobs.
//
// Follows the repo's generic-builder convention so it deploys cleanly.
import {
  queryGeneric as query,
  mutationGeneric as mutation,
  internalMutationGeneric as internalMutation,
} from "convex/server";
import { v, ConvexError } from "convex/values";
import { FREE_LIMIT } from "./config.js";

declare const process: { env: Record<string, string | undefined> };

// Public: the dashboard requests a reel. Spends a credit (free quota first, then
// paid credits — same rule as credits.ts consumeGeneration), then enqueues a job.
export const requestGeneration = mutation({
  args: { mode: v.string(), prompt: v.string() },
  handler: async (ctx: any, args: any) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) throw new ConvexError({ code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", id.subject))
      .unique();
    if (!user) throw new ConvexError({ code: "NO_USER" });

    // Inlined credit spend (mirrors convex/credits.ts consumeGeneration).
    if (user.freeUsed < FREE_LIMIT) {
      await ctx.db.patch(user._id, { freeUsed: user.freeUsed + 1 });
    } else if (user.credits > 0) {
      await ctx.db.patch(user._id, { credits: user.credits - 1 });
    } else {
      throw new ConvexError({
        code: "NO_CREDITS",
        message: "Out of credits — buy a pack to keep generating.",
      });
    }

    const jobId = await ctx.db.insert("genJobs", {
      userId: id.subject,
      mode: args.mode,
      prompt: args.prompt,
      status: "queued",
      createdAt: Date.now(),
    });

    return { jobId, mode: args.mode };
  },
});

// Public: the caller's recent jobs (newest first), for the dashboard to poll.
export const myJobs = query({
  args: {},
  handler: async (ctx: any) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) throw new ConvexError({ code: "UNAUTHENTICATED" });
    return await ctx.db
      .query("genJobs")
      .withIndex("by_user", (q: any) => q.eq("userId", id.subject))
      .order("desc")
      .take(20);
  },
});

// Public: a single job by id (the studio viewer polls this). Owner-scoped.
export const getJob = query({
  args: { jobId: v.id("genJobs") },
  handler: async (ctx: any, args: any) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== id.subject) return null;
    return job;
  },
});

// Public: edit an already-generated reel with a natural-language instruction.
// Spends a credit (free quota first, then paid), then enqueues an edit job that
// references the source reel's URL. The VM poller downloads it and runs ffmpeg.
export const requestEdit = mutation({
  args: { sourceUrl: v.string(), instruction: v.string() },
  handler: async (ctx: any, args: any) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) throw new ConvexError({ code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", id.subject))
      .unique();
    if (!user) throw new ConvexError({ code: "NO_USER" });

    if (user.freeUsed < FREE_LIMIT) {
      await ctx.db.patch(user._id, { freeUsed: user.freeUsed + 1 });
    } else if (user.credits > 0) {
      await ctx.db.patch(user._id, { credits: user.credits - 1 });
    } else {
      throw new ConvexError({
        code: "NO_CREDITS",
        message: "Out of credits — buy a pack to keep editing.",
      });
    }

    const jobId = await ctx.db.insert("genJobs", {
      userId: id.subject,
      mode: "edit",
      prompt: args.instruction,
      sourceUrl: args.sourceUrl,
      status: "queued",
      createdAt: Date.now(),
    });

    return { jobId };
  },
});

// Internal: the agent claims the oldest queued job and marks it processing.
// Returns null when the queue is empty.
export const claimNextJob = internalMutation({
  args: {},
  handler: async (ctx: any) => {
    const job = await ctx.db
      .query("genJobs")
      .withIndex("by_status", (q: any) => q.eq("status", "queued"))
      .order("asc")
      .first();
    if (!job) return null;
    await ctx.db.patch(job._id, { status: "processing", startedAt: Date.now() });
    return {
      jobId: job._id,
      userId: job.userId,
      mode: job.mode,
      prompt: job.prompt,
      sourceUrl: job.sourceUrl ?? null,
    };
  },
});

// Internal: the agent marks a job done and attaches the result URL.
export const completeJob = internalMutation({
  args: { jobId: v.id("genJobs"), resultUrl: v.string() },
  handler: async (ctx: any, args: any) => {
    await ctx.db.patch(args.jobId, {
      status: "done",
      resultUrl: args.resultUrl,
      finishedAt: Date.now(),
    });
  },
});

// Internal: the agent marks a job failed with an error message.
export const failJob = internalMutation({
  args: { jobId: v.id("genJobs"), error: v.string() },
  handler: async (ctx: any, args: any) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      error: args.error,
      finishedAt: Date.now(),
    });
  },
});
