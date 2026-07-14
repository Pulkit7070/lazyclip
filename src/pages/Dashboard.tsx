import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import PremiumBackground from "../components/PremiumBackground";
import LazyClipLogo from "../components/LazyClipLogo";
import { api } from "../lib/convexApi";

// Modes differ only by input source — the tag names that source (real info, not decoration).
const MODES = [
  { id: "generate", tag: "from a topic", label: "Generate", hint: "topic → viral reel" },
  { id: "edit", tag: "from a clip", label: "Edit", hint: "clip → captioned short" },
  { id: "clip", tag: "from youtube", label: "Clip", hint: "link + timestamps" },
] as const;

export default function Dashboard() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-warmBg text-charcoal selection:bg-electricBlue/15">
      <div className="noise-overlay" />
      <PremiumBackground />
      <SignedOut><SignInGate /></SignedOut>
      <SignedIn><DashboardInner /></SignedIn>
    </div>
  );
}

function SignInGate() {
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <LazyClipLogo className="h-10 w-10 text-charcoal" />
        <span className="font-display text-2xl font-bold tracking-tight">lazyclip</span>
      </Link>
      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-electricBlue">Create</div>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Sign in to start creating</h1>
      <p className="mt-3 max-w-sm font-mono text-sm text-secondaryText">
        Use your Google account. Waitlist members get Founding Creator credits automatically.
      </p>
      <SignInButton mode="modal">
        <button className="group mt-7 inline-flex items-center gap-2 rounded-2xl bg-charcoal px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-electricBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricBlue focus-visible:ring-offset-2 focus-visible:ring-offset-warmBg">
          Continue with Google
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </SignInButton>
    </div>
  );
}

type Me = { credits: number; freeRemaining: number; freeLimit: number; founding: boolean; canGenerate: boolean } | null | undefined;

function DashboardInner() {
  const navigate = useNavigate();
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
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    if (!prompt.trim()) { setStatus("Tell it what to make first."); return; }
    setBusy(true); setStatus("");
    try {
      const r = (await requestGeneration({ mode, prompt })) as { mode: string };
      setStatus(r.mode === "free"
        ? "Queued — free generation used. Your reel is being made, it'll appear below shortly."
        : "Queued — 1 credit used. Your reel is being made, it'll appear below shortly.");
      setPrompt("");
    } catch (e: any) {
      if (e?.data?.code === "NO_CREDITS") setStatus("out-of-credits");
      else setStatus("Something went wrong, try again.");
    } finally { setBusy(false); }
  };

  const free = me?.freeRemaining ?? 0;
  const credits = me?.credits ?? 0;
  const placeholder = mode === "clip"
    ? "Paste a YouTube link + a timestamp, e.g. https://youtu.be/… 2:30 to 3:15"
    : mode === "edit"
    ? "Describe the edit, e.g. caption it and make it vertical"
    : "What should the reel be about? e.g. why UPI beat credit cards";

  return (
    <>
      <header className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <LazyClipLogo className="h-9 w-9 text-charcoal" />
          <span className="font-display text-2xl font-bold tracking-tight">lazyclip</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          {me?.founding && (
            <span className="hidden rounded-full border border-electricBlue/20 bg-electricBlue/[0.06] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-electricBlue sm:inline">
              Founding Creator
            </span>
          )}
          <span className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest shadow-sm">
            {free > 0 ? `${free} free left` : `${credits} credits`}
          </span>
          <Link to="/pricing" className="hidden text-sm font-semibold transition-colors hover:text-electricBlue sm:inline">Buy credits</Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-24 pt-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-electricBlue">Create</div>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-[0.95] tracking-[-0.03em] md:text-5xl">
          Make a reel<br />just by asking.
        </h1>
        <p className="mt-3 font-mono text-sm text-secondaryText">Pick a mode, describe it, and LazyClip does the rest.</p>

        {/* Mode picker — icon-free, source-labelled */}
        <div className="mt-8 grid grid-cols-3 gap-2.5">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`rounded-2xl border p-4 text-left transition-colors ${active ? "border-electricBlue bg-electricBlue/[0.05]" : "border-[#E5E5E2] bg-white hover:border-charcoal/30"}`}>
                <div className={`font-mono text-[10px] uppercase tracking-widest ${active ? "text-electricBlue" : "text-secondaryText"}`}>{m.tag}</div>
                <div className="mt-2 font-display text-base font-bold">{m.label}</div>
                <div className="mt-0.5 font-mono text-[10px] text-secondaryText">{m.hint}</div>
              </button>
            );
          })}
        </div>

        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder={placeholder}
          className="mt-4 w-full resize-none rounded-2xl border border-[#E5E5E2] bg-white p-4 font-sans text-sm outline-none transition-colors focus:border-electricBlue" />

        <button onClick={generate} disabled={busy}
          className="group mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-charcoal py-4 text-sm font-semibold text-white transition-colors hover:bg-electricBlue disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricBlue focus-visible:ring-offset-2 focus-visible:ring-offset-warmBg">
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>Generate reel {free > 0 ? "(free)" : "(1 credit)"}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
          )}
        </button>

        {status === "out-of-credits" ? (
          <div className="mt-4 rounded-2xl border border-[#E5E5E2] bg-white p-4 text-center">
            <p className="font-sans text-sm">You're out of credits.</p>
            <Link to="/pricing" className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-electricBlue px-5 py-2.5 text-sm font-semibold text-white">
              Get more credits <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : status ? (
          <p className="mt-4 text-center font-mono text-xs text-secondaryText">{status}</p>
        ) : null}

        {jobs && jobs.length > 0 && (
          <div className="mt-12">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondaryText">Your reels</h2>
            <div className="mt-4 space-y-2.5">
              {jobs.map((j) => (
                <div key={j._id}
                  onDoubleClick={() => j.status === "done" && navigate(`/studio/${j._id}`)}
                  title={j.status === "done" ? "Double-click to open in Studio" : undefined}
                  className="flex items-center gap-4 rounded-2xl border border-[#E5E5E2] bg-white p-4">
                  {j.status === "done" && j.resultUrl ? (
                    <video src={j.resultUrl} controls playsInline preload="metadata"
                      className="aspect-[9/16] w-[104px] shrink-0 rounded-xl bg-black object-contain" />
                  ) : (
                    <div className="flex aspect-[9/16] w-[104px] shrink-0 items-center justify-center rounded-xl border border-[#E5E5E2] bg-warmBg">
                      {j.status === "failed"
                        ? <span className="font-mono text-[10px] text-red-500">failed</span>
                        : <span className="h-4 w-4 animate-spin rounded-full border-2 border-secondaryText/30 border-t-secondaryText" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-secondaryText">{j.mode}</div>
                    <div className="truncate font-sans text-sm">{j.prompt}</div>
                    {j.status === "done" && j.resultUrl ? (
                      <button onClick={() => navigate(`/studio/${j._id}`)}
                        className="group mt-2 inline-flex items-center gap-1 rounded-xl bg-charcoal px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-electricBlue">
                        Open in Studio <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ) : j.status === "failed" ? (
                      <div className="mt-1 font-mono text-xs text-red-500">generation failed</div>
                    ) : (
                      <div className="mt-1 font-mono text-xs text-secondaryText">{j.status}…</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
