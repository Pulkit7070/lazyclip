declare const process: { env: Record<string, string | undefined> };
import { actionGeneric as action, mutationGeneric as mutation } from "convex/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { packById } from "./config.js";

const addCredits = makeFunctionReference<"mutation">("credits:addCredits");

// Create a Dodo checkout session for a credit pack. Metadata carries who to credit + how many,
// so the webhook can complete the purchase after payment. Returns a URL to redirect to.
export const createCheckout = action({
  args: { packId: v.string(), returnUrl: v.string() },
  handler: async (ctx: any, args: any): Promise<{ url: string }> => {
    const id = await ctx.auth.getUserIdentity();
    if (!id) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const pack = packById(args.packId);
    if (!pack) throw new ConvexError({ code: "BAD_PACK" });

    const key = process.env.DODO_API_KEY;
    if (!key) throw new ConvexError({ code: "PAYMENTS_UNCONFIGURED", message: "DODO_API_KEY not set" });

    const res = await fetch("https://api.dodopayments.com/checkouts", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        product_cart: [{ name: `reely ${pack.label} — ${pack.credits} credits`, quantity: 1, amount: pack.amountUsd * 100 }],
        return_url: args.returnUrl,
        metadata: { tokenIdentifier: id.subject, credits: String(pack.credits), packId: pack.id, amountUsd: String(pack.amountUsd) },
      }),
    });
    if (!res.ok) throw new ConvexError({ code: "DODO_ERROR", message: `${res.status}` });
    const data: any = await res.json();
    return { url: data.checkout_url ?? data.url ?? data.payment_link };
  },
});

// TEST-ONLY: credit the current user without paying. Gated on ALLOW_SIMULATED_PURCHASE so it can
// never run in production. Lets you exercise the credit flow before Dodo is wired.
export const simulatePurchase = mutation({
  args: { packId: v.string() },
  handler: async (ctx: any, args: any) => {
    if (process.env.ALLOW_SIMULATED_PURCHASE !== "true") throw new ConvexError({ code: "DISABLED" });
    const id = await ctx.auth.getUserIdentity();
    if (!id) throw new ConvexError({ code: "UNAUTHENTICATED" });
    const pack = packById(args.packId);
    if (!pack) throw new ConvexError({ code: "BAD_PACK" });
    await ctx.runMutation(addCredits, { tokenIdentifier: id.subject, credits: pack.credits, packId: pack.id, amountUsd: pack.amountUsd, reference: "simulated", provider: "test" });
    return { credited: pack.credits };
  },
});
