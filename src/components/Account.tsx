import { useEffect, useState } from "react";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/clerk-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Sparkles, Zap, X } from "lucide-react";
import { api } from "../lib/convexApi";

export default function Account() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="flex items-center gap-1.5 text-sm font-semibold text-charcoal hover:text-electricBlue transition-colors duration-300 hover-trigger">
            <Sparkles className="w-4 h-4" /> Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <AccountInner />
      </SignedIn>
    </>
  );
}

function AccountInner() {
  const { user } = useUser();
  const me = useQuery(api.users.currentUser) as
    | { credits: number; freeRemaining: number; freeLimit: number; canGenerate: boolean }
    | null
    | undefined;
  const packs = useQuery(api.credits.getPacks) as { id: string; label: string; credits: number; amountUsd: number }[] | undefined;
  const ensureUser = useMutation(api.users.ensureUser);
  const consume = useMutation(api.credits.consumeGeneration);
  const createCheckout = useAction(api.payments.createCheckout);
  const simulate = useMutation(api.payments.simulatePurchase);

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>("");

  // make sure a user row exists on first sign-in
  useEffect(() => {
    ensureUser({ email: user?.primaryEmailAddress?.emailAddress, name: user?.fullName ?? undefined }).catch(() => {});
  }, [user?.id]);

  const onGenerate = async () => {
    setStatus("generating…");
    try {
      const r = (await consume({})) as { mode: string };
      setStatus(r.mode === "free" ? "used a free generation" : "used 1 credit");
    } catch (e: any) {
      if (e?.data?.code === "NO_CREDITS") { setStatus("out of credits"); setOpen(true); }
      else setStatus("something went wrong");
    }
  };

  const buy = async (packId: string) => {
    setStatus("opening checkout…");
    try {
      const { url } = (await createCheckout({ packId, returnUrl: window.location.origin })) as { url: string };
      window.location.href = url;
    } catch {
      // fall back to the test-only simulated purchase if Dodo isn't configured yet
      try { const r = (await simulate({ packId })) as { credited: number }; setStatus(`+${r.credited} credits (test)`); setOpen(false); }
      catch { setStatus("payments not configured yet"); }
    }
  };

  const free = me?.freeRemaining ?? 0;
  const credits = me?.credits ?? 0;

  return (
    <div className="flex items-center gap-3">
      {/* credits / free pill */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E5E5E2] bg-white text-xs font-mono text-secondaryText">
        <Zap className="w-3.5 h-3.5 text-electricBlue" />
        {free > 0 ? <span>{free} free left</span> : <span>{credits} credits</span>}
      </div>

      <button onClick={onGenerate} className="text-sm font-semibold text-charcoal hover:text-electricBlue transition-colors hover-trigger">
        Generate
      </button>
      <button onClick={() => setOpen(true)} className="text-sm font-semibold text-electricBlue hover:opacity-80 transition-opacity hover-trigger">
        Buy credits
      </button>
      <UserButton afterSignOutUrl="/" />
      {status && <span className="hidden md:inline font-mono text-[10px] text-secondaryText">{status}</span>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="relative w-[min(92vw,420px)] rounded-2xl bg-white border border-[#E5E5E2] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-secondaryText hover:text-charcoal" onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
            <h3 className="font-display font-bold text-lg text-charcoal">Buy credits</h3>
            <p className="font-mono text-xs text-secondaryText mt-1">1 credit = 1 generation. You have {credits} credits{free > 0 ? ` + ${free} free` : ""}.</p>
            <div className="mt-5 flex flex-col gap-3">
              {(packs ?? []).map((p) => (
                <button key={p.id} onClick={() => buy(p.id)} className="flex items-center justify-between rounded-xl border border-[#E5E5E2] hover:border-electricBlue px-4 py-3 transition-colors hover-trigger">
                  <div className="text-left">
                    <div className="font-display font-bold text-charcoal">{p.label}</div>
                    <div className="font-mono text-xs text-secondaryText">{p.credits} credits</div>
                  </div>
                  <div className="font-display font-bold text-electricBlue">${p.amountUsd}</div>
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] text-secondaryText mt-4">Secure checkout via Dodo Payments.</p>
          </div>
        </div>
      )}
    </div>
  );
}
