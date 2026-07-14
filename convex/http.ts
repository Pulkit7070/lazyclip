import { httpRouter } from "convex/server";
import { httpActionGeneric } from "convex/server";
import { makeFunctionReference } from "convex/server";

const addCredits = makeFunctionReference<"mutation">("credits:addCredits");

const http = httpRouter();

http.route({
  path: "/dodo-webhook",
  method: "POST",
  handler: httpActionGeneric(async (ctx: any, req: Request) => {
    // NOTE: verify the signature with DODO_WEBHOOK_SECRET here in production.
    const body: any = await req.json().catch(() => ({}));
    const event = String(body.type ?? body.event ?? "");
    const md = body.data?.metadata ?? body.metadata ?? {};
    const paid = /succeeded|completed|paid|payment\.success/i.test(event);
    if (paid && md.tokenIdentifier && md.credits) {
      await ctx.runMutation(addCredits, {
        tokenIdentifier: md.tokenIdentifier,
        credits: Number(md.credits),
        packId: md.packId ?? "",
        amountUsd: Number(md.amountUsd ?? 0),
        reference: body.data?.id ?? body.id,
        provider: "dodo",
      });
    }
    return new Response("ok", { status: 200 });
  }),
});

export default http;
