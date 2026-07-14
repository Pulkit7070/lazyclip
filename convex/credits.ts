import { queryGeneric as query, mutationGeneric as mutation, internalMutationGeneric as internalMutation } from "convex/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { FREE_LIMIT, PACKS } from "./config.js";

export const getPacks = query({ args: {}, handler: async () => PACKS });

// Spend one generation: free quota first, then credits. Throws NO_CREDITS when exhausted.
export const consumeGeneration = mutation({
  args: { prompt: v.optional(v.string()) },
  handler: async (ctx: any, args: any) => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q: any) => q.eq("tokenIdentifier", id.subject)).unique();
    if (!user) throw new ConvexError({ code: "NO_USER" });

    let mode: "free" | "credit";
    if (user.freeUsed < FREE_LIMIT) {
      await ctx.db.patch(user._id, { freeUsed: user.freeUsed + 1 });
      mode = "free";
    } else if (user.credits > 0) {
      await ctx.db.patch(user._id, { credits: user.credits - 1 });
      mode = "credit";
    } else {
      throw new ConvexError({ code: "NO_CREDITS", message: "Out of credits — buy a pack to keep generating." });
    }
    await ctx.db.insert("generations", { tokenIdentifier: id.subject, mode, prompt: args.prompt, at: Date.now() });
    return { mode };
  },
});

// Internal: credit a user after a verified payment (called by the Dodo webhook).
export const addCredits = internalMutation({
  args: { tokenIdentifier: v.string(), credits: v.number(), packId: v.string(), amountUsd: v.number(), reference: v.optional(v.string()), provider: v.optional(v.string()) },
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db.query("users").withIndex("by_token", (q: any) => q.eq("tokenIdentifier", args.tokenIdentifier)).unique();
    if (!user) return; // unknown user — ignore
    await ctx.db.patch(user._id, { credits: user.credits + args.credits });
    await ctx.db.insert("purchases", {
      tokenIdentifier: args.tokenIdentifier, packId: args.packId, credits: args.credits,
      amountUsd: args.amountUsd, provider: args.provider ?? "dodo", reference: args.reference, at: Date.now(),
    });
  },
});
