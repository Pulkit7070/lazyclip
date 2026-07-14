import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { useAction, useQuery } from "convex/react";
import { Check, Zap } from "lucide-react";
import { api } from "../lib/convexApi";

type Pack = { id: string; label: string; credits: number; amountUsd: number };

export default function Pricing() {
  const packs = (useQuery(api.credits.getPacks) as Pack[] | undefined) ?? [];
  const createCheckout = useAction(api.payments.createCheckout);

  const buy = async (packId: string) => {
    try {
      const { url } = (await createCheckout({ packId, returnUrl: window.location.origin + "/create" })) as { url: string };
      window.location.href = url;
    } catch {
      alert("Checkout isn't available yet — payments are being set up.");
    }
  };

  return (
    <div className="min-h-screen bg-warmBg text-charcoal">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/" className="font-display font-bold text-xl tracking-tight">lazyclip</Link>
        <Link to="/create" className="text-sm font-semibold hover:text-electricBlue">Dashboard →</Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-10 pb-24 text-center">
        <h1 className="font-display font-extrabold text-4xl md:text-6xl tracking-tight">Simple, credit-based pricing</h1>
        <p className="font-sans text-secondaryText mt-4 max-w-xl mx-auto">
          Start free — every account gets <b>5 free generations</b>. Buy credits when you need more. 1 credit = 1 reel.
        </p>

        <div className="grid sm:grid-cols-3 gap-5 mt-12 text-left">
          {/* Free */}
          <div className="rounded-3xl border border-[#E5E5E2] bg-white p-7">
            <div className="font-mono text-xs uppercase tracking-wider text-secondaryText">Free</div>
            <div className="font-display font-extrabold text-4xl mt-2">$0</div>
            <ul className="mt-5 space-y-2 text-sm text-secondaryText">
              <li className="flex gap-2"><Check className="w-4 h-4 text-acidGreen" /> 5 free generations</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-acidGreen" /> All 3 modes</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-acidGreen" /> Watermarked output</li>
            </ul>
            <Link to="/create" className="mt-6 block text-center rounded-xl border border-charcoal py-3 font-semibold text-sm hover:bg-charcoal hover:text-white transition-colors">Start free</Link>
          </div>

          {/* Paid packs */}
          {packs.map((p, i) => (
            <div key={p.id} className={`rounded-3xl p-7 ${i === packs.length - 1 ? "bg-charcoal text-white border-2 border-electricBlue" : "bg-white border border-[#E5E5E2]"}`}>
              <div className={`font-mono text-xs uppercase tracking-wider ${i === packs.length - 1 ? "text-white/60" : "text-secondaryText"}`}>{p.label}</div>
              <div className="font-display font-extrabold text-4xl mt-2">${p.amountUsd}</div>
              <ul className={`mt-5 space-y-2 text-sm ${i === packs.length - 1 ? "text-white/80" : "text-secondaryText"}`}>
                <li className="flex gap-2"><Zap className="w-4 h-4 text-electricBlue" /> {p.credits} credits</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-acidGreen" /> No watermark</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-acidGreen" /> Priority queue</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-acidGreen" /> HD export</li>
              </ul>
              <SignedIn>
                <button onClick={() => buy(p.id)} className={`mt-6 w-full rounded-xl py-3 font-semibold text-sm transition-colors ${i === packs.length - 1 ? "bg-electricBlue text-white hover:opacity-90" : "border border-charcoal hover:bg-charcoal hover:text-white"}`}>Buy {p.credits} credits</button>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className={`mt-6 w-full rounded-xl py-3 font-semibold text-sm transition-colors ${i === packs.length - 1 ? "bg-electricBlue text-white hover:opacity-90" : "border border-charcoal hover:bg-charcoal hover:text-white"}`}>Sign in to buy</button>
                </SignInButton>
              </SignedOut>
            </div>
          ))}
        </div>
        <p className="font-mono text-[11px] text-secondaryText mt-8">Secure one-time checkout via Dodo Payments · UPI, cards. No subscription.</p>
      </main>
    </div>
  );
}
