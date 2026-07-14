// String-based function references so the frontend builds without `convex dev` codegen.
import { makeFunctionReference } from "convex/server";

export const api = {
  users: {
    currentUser: makeFunctionReference<"query">("users:currentUser"),
    ensureUser: makeFunctionReference<"mutation">("users:ensureUser"),
  },
  credits: {
    getPacks: makeFunctionReference<"query">("credits:getPacks"),
    consumeGeneration: makeFunctionReference<"mutation">("credits:consumeGeneration"),
  },
  waitlist: {
    join: makeFunctionReference<"mutation">("waitlist:join"),
    count: makeFunctionReference<"query">("waitlist:count"),
  },
  payments: {
    createCheckout: makeFunctionReference<"action">("payments:createCheckout"),
    simulatePurchase: makeFunctionReference<"mutation">("payments:simulatePurchase"),
  },
  generate: {
    requestGeneration: makeFunctionReference<"mutation">("generate:requestGeneration"),
    myJobs: makeFunctionReference<"query">("generate:myJobs"),
    getJob: makeFunctionReference<"query">("generate:getJob"),
    requestEdit: makeFunctionReference<"mutation">("generate:requestEdit"),
  },
};

// Clerk drives the sign-in UI. Convex adds the credit backend on top.
export const authEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
export const convexEnabled = Boolean(import.meta.env.VITE_CONVEX_URL);
