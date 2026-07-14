import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(), // Clerk subject
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    credits: v.number(),
    freeUsed: v.number(),
    founding: v.optional(v.boolean()),
  }).index("by_token", ["tokenIdentifier"]).index("by_email", ["email"]),

  generations: defineTable({
    tokenIdentifier: v.string(),
    mode: v.string(), // "free" | "credit"
    prompt: v.optional(v.string()),
    at: v.number(),
  }).index("by_token", ["tokenIdentifier"]),

  purchases: defineTable({
    tokenIdentifier: v.string(),
    packId: v.string(),
    credits: v.number(),
    amountUsd: v.number(),
    provider: v.string(),
    reference: v.optional(v.string()),
    at: v.number(),
  }).index("by_token", ["tokenIdentifier"]),

  waitlist: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
    position: v.number(),
    at: v.number(),
  }).index("by_email", ["email"]),

  genJobs: defineTable({
    userId: v.string(),
    mode: v.string(),
    prompt: v.string(),
    status: v.string(), // queued | processing | done | failed
    resultUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_user", ["userId"]),
});
