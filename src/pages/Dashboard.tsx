import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { ArrowUp, ArrowRight } from "lucide-react";
import LazyClipLogo from "../components/LazyClipLogo";
import { api } from "../lib/convexApi";

const MODES = [
  { id: "generate", label: "Generate", placeholder: "Describe the reel you want — e.g. why UPI beat credit cards in India" },
  { id: "edit", label: "Edit", placeholder: "Describe the edit — e.g. caption it and make it vertical" },
  { id: "clip", label: "Clip", placeholder: "Paste a YouTube link + a timestamp — e.g. https://youtu.be/… 2:30 to 3:15" },
] as const;
const ASPECTS = [{ id: "9:16", label: "9:16" }, { id: "1:1", label: "1:1" }, { id: "16:9", label: "16:9" }] as const;

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-warmBg text-charcoal selection:bg-electricBlue/15">
      <SignedOut><SignInGate /></SignedOut>
      <SignedIn><DashboardInner /></SignedIn>
    </div>
  );
}

function SignInGate() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <LazyClipLogo className="h-10 w-10 text-charcoal" />
        <span className="font-display text-2xl font-bold tracking-tight">lazyclip</span>
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Sign in to start creating</h1>
      <p className="mt-3 max-w-sm font-sans text-sm text-secondaryText">
        Use your Google account. Waitlist members get Founding Creator credits automatically.
      </p>
      <SignInButton mode="modal">
        <button className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-charcoal px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-electricBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricBlue focus-visible:ring-offset-2 focus-visible:ring-offset-warmBg">
          Continue with Google
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </SignInButton>
    </div>
  );
}

type Me = { credits: number; freeRemaining: number; freeLimit: number; founding: boolean; canGenerate: boolean } | null | undefined;
type Job = { _id: string; mode: string; prompt: string; status: string; resultUrl?: string };

function DashboardInner() {
  const navigate = useNavigate();
  const { user } = useUser();
  const me = useQuery(api.users.currentUser) as Me;
  const ensureUser = useMutation(api.users.ensureUser);
  const requestGeneration = useMutation(api.generate.requestGeneration);
  const jobs = useQuery(api.generate.myJobs) as Job[] | undefined;

  const [mode, setMode] = useState<string>("generate");
  const [aspect, setAspect] = useState<string>("9:16");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureUser({ email: user?.primaryEmailAddress?.emailAddress, name: user?.fullName ?? undefined }).catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    if (!prompt.trim()) { setStatus("Type a prompt to start."); return; }
    setBusy(true); setStatus("");
    const aspectPhrase = aspect === "1:1" ? " (square)" : aspect === "16:9" ? " (landscape)" : "";
    try {
      const r = (await requestGeneration({ mode, prompt: prompt.trim() + aspectPhrase })) as { mode: string };
      setStatus(r.mode === "free" ? "Queued — free generation used. It'll appear below shortly." : "Queued — 1 credit used. It'll appear below shortly.");
      setPrompt("");
    } catch (e: any) {
      if (e?.data?.code === "NO_CREDITS") setStatus("out-of-credits");
      else setStatus("Something went wrong, try again.");
    } finally { setBusy(false); }
  };

  const free = me?.freeRemaining ?? 0;
  const credits = me?.credits ?? 0;
  const activeMode = MODES.find((m) => m.id === mode)!;

  return (
    <>
      {/* App bar */}
      <header className="sticky top-0 z-20 border-b border-black/[0.06] bg-warmBg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <LazyClipLogo className="h-8 w-8 text-charcoal" />
            <span className="font-display text-xl font-bold tracking-tight">lazyclip</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            {me?.founding && (
              <span className="hidden rounded-full border border-electricBlue/20 bg-electricBlue/[0.06] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-electricBlue sm:inline">
                Founding Creator
              </span>
            )}
            <span className="rounded-full border border-black/10 bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest shadow-sm">
              {free > 0 ? `${free} free left` : `${credits} credits`}
            </span>
            <Link to="/pricing" className="hidden text-sm font-semibold transition-colors hover:text-electricBlue sm:inline">Buy credits</Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        {/* Composer */}
        <div className="mx-auto max-w-3xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondaryText">New reel</div>
          <div className="mt-3 rounded-2xl border border-black/10 bg-white shadow-sm transition-shadow focus-within:shadow-md focus-within:border-charcoal/20">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void generate(); } }}
              rows={3}
              placeholder={activeMode.placeholder}
              className="w-full resize-none bg-transparent px-5 pt-5 pb-3 font-sans text-[15px] leading-relaxed outline-none placeholder:text-secondaryText/70"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] px-3 py-3">
              {/* Mode segmented control */}
              <div className="flex items-center gap-0.5 rounded-xl bg-warmBg p-0.5">
                {MODES.map((m) => (
                  <button key={m.id} onClick={() => setMode(m.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${mode === m.id ? "bg-white text-charcoal shadow-sm" : "text-secondaryText hover:text-charcoal"}`}>
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {/* Aspect ratio */}
                <div className="flex items-center gap-0.5 rounded-xl bg-warmBg p-0.5" title="Aspect ratio">
                  {ASPECTS.map((a) => (
                    <button key={a.id} onClick={() => setAspect(a.id)}
                      className={`rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors ${aspect === a.id ? "bg-white text-charcoal shadow-sm" : "text-secondaryText hover:text-charcoal"}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
                {/* Generate */}
                <button onClick={generate} disabled={busy}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-charcoal px-4 text-sm font-semibold text-white transition-colors hover:bg-electricBlue disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricBlue focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                  {busy ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>Generate <ArrowUp className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <p className="font-mono text-[10px] text-secondaryText">
              {status === "out-of-credits" ? "" : status || `${free > 0 ? "free generation" : "1 credit"} · ⌘↵ to run`}
            </p>
          </div>
          {status === "out-of-credits" && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-[#E5E5E2] bg-white px-4 py-3">
              <p className="font-sans text-sm">You're out of credits.</p>
              <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-lg bg-electricBlue px-4 py-2 text-sm font-semibold text-white">
                Get credits <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Gallery */}
        <div className="mt-14">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-secondaryText">Your reels</h2>
            {jobs && jobs.length > 0 && <span className="font-mono text-[11px] text-secondaryText/70">{jobs.length}</span>}
          </div>

          {jobs === undefined ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-black/[0.06]" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <p className="mt-4 font-sans text-sm text-secondaryText">No reels yet — your generations show up here.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {jobs.map((j) => <ReelTile key={j._id} job={j} onOpen={() => navigate(`/studio/${j._id}`)} />)}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function ReelTile({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const done = job.status === "done" && !!job.resultUrl;
  const failed = job.status === "failed";
  return (
    <div
      onClick={() => done && onOpen()}
      className={`group relative aspect-[9/16] overflow-hidden rounded-xl border border-black/10 bg-black ${done ? "cursor-pointer" : ""}`}
    >
      {done ? (
        <video
          src={job.resultUrl}
          muted loop playsInline preload="metadata"
          onMouseEnter={(e) => { void e.currentTarget.play().catch(() => {}); }}
          onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-warmBg">
          {failed
            ? <span className="font-mono text-[10px] text-red-500">failed</span>
            : <span className="flex flex-col items-center gap-2 text-secondaryText"><span className="h-5 w-5 animate-spin rounded-full border-2 border-secondaryText/30 border-t-secondaryText" /><span className="font-mono text-[10px] uppercase tracking-widest">{job.status}</span></span>}
        </div>
      )}

      {/* label + hover CTA */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-3">
        <div className="font-mono text-[9px] uppercase tracking-widest text-white/60">{job.mode}</div>
        <div className="mt-0.5 line-clamp-2 font-sans text-xs font-medium text-white">{job.prompt}</div>
      </div>
      {done && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-charcoal">
            Open in Studio <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      )}
    </div>
  );
}
