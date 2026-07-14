import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { Zap, Sparkles, Video, Scissors, Film, Star } from "lucide-react";
import { api } from "../lib/convexApi";

const MODES = [
  { id: "generate", label: "Generate", icon: Sparkles, hint: "topic → viral reel" },
  { id: "edit", label: "Edit", icon: Scissors, hint: "clip → captioned short" },
  { id: "clip", label: "Clip", icon: Film, hint: "YouTube link + timestamps" },
] as const;

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-warmBg text-charcoal">
      <SignedOut>
        <SignInGate />
      </SignedOut>
      <SignedIn>
        <DashboardInner />
      </SignedIn>
    </div>
  );
}

function SignInGate() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <Link to="/" className="font-display font-bold text-2xl tracking-tight mb-6">lazyclip</Link>
      <h1 className="font-display font-extrabold text-3xl md:text-4xl">Sign in to start creating</h1>
      <p className="font-sans text-secondaryText mt-3 max-w-sm">Use your Google account. Waitlist members get Founding Creator credits automatically.</p>
      <SignInButton mode="modal">
        <button className="mt-7 rounded-xl bg-charcoal text-white px-7 py-3.5 font-semibold text-sm hover:bg-electricBlue transition-colors">Continue with Google</button>
      </SignInButton>
    </div>
  );
}

type Me = { credits: number; freeRemaining: number; freeLimit: number; founding: boolean; canGenerate: boolean } | null | undefined;

function DashboardInner() {
  const { user } = useUser();
  const me = useQuery(api.users.currentUser) as Me;
  const ensureUser = useMutation(api.users.ensureUser);
  const requestGeneration = useMutation(api.generate.requestGeneration);
  const jobs = useQuery(api.generate.myJobs) as Array<{ _id: string; mode: string; prompt: string; status: string; resultUrl?: string }> | undefined;

  const [mode, setMode] = useState<string>("generate");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureUser({ email: user?.primaryEmailAddress?.emailAddress, name: user?.fullName ?? undefined }).catch(() => {});
  }, [user?.id]);

  const generate = async () => {
    if (!prompt.trim()) { setStatus("Tell it what to make first."); return; }
    setBusy(true); setStatus("");
    try {
      const r = (await requestGeneration({ mode, prompt })) as { mode: string };
      setStatus(r.mode === "free" ? "✅ Queued (free generation used). Your reel is being made, it'll appear here shortly." : "✅ Queued (1 credit used). Your reel is being made, it'll appear here shortly.");
      setPrompt("");
    } catch (e: any) {
      if (e?.data?.code === "NO_CREDITS") setStatus("out-of-credits");
      else setStatus("Something went wrong, try again.");
    } finally { setBusy(false); }
  };

  const free = me?.freeRemaining ?? 0;
  const credits = me?.credits ?? 0;

  return (
    <div>
      <header className="max-w-5xl mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/" className="font-display font-bold text-xl tracking-tight">lazyclip</Link>
        <div className="flex items-center gap-4">
          {me?.founding && (
            <span className="hidden sm:flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-full bg-electricBlue/10 text-electricBlue"><Star className="w-3 h-3" /> Founding Creator</span>
          )}
          <span className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border border-[#E5E5E2] bg-white">
            <Zap className="w-3.5 h-3.5 text-electricBlue" />
            {free > 0 ? `${free} free left` : `${credits} credits`}
          </span>
          <Link to="/pricing" className="text-sm font-semibold hover:text-electricBlue">Buy credits</Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-8 pb-24">
        <h1 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight">Create a reel</h1>
        <p className="font-sans text-secondaryText mt-2">Pick a mode, describe what you want, and LazyClip does the rest.</p>

        <div className="grid grid-cols-3 gap-2.5 mt-6">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`rounded-2xl border p-4 text-left transition-colors ${active ? "border-electricBlue bg-electricBlue/5" : "border-[#E5E5E2] bg-white hover:border-charcoal/30"}`}>
                <Icon className={`w-5 h-5 ${active ? "text-electricBlue" : "text-charcoal"}`} />
                <div className="font-display font-bold text-sm mt-2">{m.label}</div>
                <div className="font-mono text-[10px] text-secondaryText mt-0.5">{m.hint}</div>
              </button>
            );
          })}
        </div>

        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
          placeholder={mode === "clip" ? "Paste a YouTube link + a timestamp, e.g. https://youtu.be/… 2:30 to 3:15" : mode === "edit" ? "Describe the edit, e.g. caption it and make it vertical (attach clip in chat)" : "What should the reel be about? e.g. why UPI beat credit cards"}
          className="w-full mt-4 rounded-2xl border border-[#E5E5E2] bg-white p-4 font-sans text-sm outline-none focus:border-electricBlue transition-colors resize-none" />

        <button onClick={generate} disabled={busy}
          className="mt-3 w-full rounded-2xl bg-charcoal text-white py-4 font-semibold text-sm hover:bg-electricBlue transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Video className="w-4 h-4" /> Generate reel {free > 0 ? "(free)" : "(1 credit)"}</>}
        </button>

        {status === "out-of-credits" ? (
          <div className="mt-4 rounded-2xl border border-[#E5E5E2] bg-white p-4 text-center">
            <p className="font-sans text-sm text-charcoal">You're out of credits.</p>
            <Link to="/pricing" className="inline-block mt-2 rounded-xl bg-electricBlue text-white px-5 py-2.5 font-semibold text-sm">Get more credits →</Link>
          </div>
        ) : status ? (
          <p className="mt-4 font-sans text-sm text-secondaryText text-center">{status}</p>
        ) : null}

        {jobs && jobs.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display font-bold text-lg">Your reels</h2>
            <div className="mt-3 space-y-2.5">
              {jobs.map((j) => (
                <div key={j._id} className="flex items-center justify-between rounded-2xl border border-[#E5E5E2] bg-white p-4">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-secondaryText">{j.mode}</div>
                    <div className="font-sans text-sm text-charcoal truncate max-w-[46ch]">{j.prompt}</div>
                  </div>
                  {j.status === "done" && j.resultUrl ? (
                    <a href={j.resultUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-xl bg-electricBlue text-white px-4 py-2 text-sm font-semibold hover:opacity-90">Watch ↗</a>
                  ) : j.status === "failed" ? (
                    <span className="shrink-0 text-xs font-mono text-red-500">failed</span>
                  ) : (
                    <span className="shrink-0 flex items-center gap-1.5 text-xs font-mono text-secondaryText"><span className="w-3 h-3 border-2 border-secondaryText/30 border-t-secondaryText rounded-full animate-spin" /> {j.status}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 font-mono text-[11px] text-secondaryText text-center">
          Reels are generated by the LazyClip agent and delivered here when ready.
        </p>
      </main>
    </div>
  );
}
