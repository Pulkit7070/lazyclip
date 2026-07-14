import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { ArrowLeft, Wand2, Download, Sparkles } from "lucide-react";
import { api } from "../lib/convexApi";

type Job =
  | { _id: string; mode: string; prompt: string; status: string; resultUrl?: string; sourceUrl?: string; error?: string }
  | null
  | undefined;
type Msg = { role: "user" | "system"; text: string };

// One-tap edits the ffmpeg pipeline handles well.
const QUICK_EDITS = ["Make it square (1:1)", "Make it landscape (16:9)", "Add a watermark", "Convert to a GIF"];

export default function Studio() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-warmBg text-charcoal">
      {/* soft studio-light wash, kept subtle and on-brand */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-electricBlue/[0.07] blur-3xl" />
      <SignedOut>
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <Link to="/" className="mb-6 font-display text-2xl font-bold tracking-tight">lazyclip</Link>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Sign in to open the studio</h1>
          <p className="mt-2 max-w-sm font-sans text-secondaryText">Your reels and edits live behind your account.</p>
          <SignInButton mode="modal">
            <button className="mt-7 rounded-xl bg-charcoal px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-electricBlue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricBlue focus-visible:ring-offset-2 focus-visible:ring-offset-warmBg">
              Continue with Google
            </button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn><StudioInner /></SignedIn>
    </div>
  );
}

function StudioInner() {
  const { id } = useParams<{ id: string }>();
  const [activeId, setActiveId] = useState<string | undefined>(id);
  const job = useQuery(api.generate.getJob, activeId ? { jobId: activeId } : "skip") as Job;
  const requestEdit = useMutation(api.generate.requestEdit);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastNotified, setLastNotified] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [edits, setEdits] = useState(0);

  const rendering = !!job && (job.status === "queued" || job.status === "processing");
  const ready = !!job && job.status === "done" && !!job.resultUrl;

  // Capture the reel's original prompt as the page title (first load only).
  useEffect(() => {
    if (job && !title) setTitle(job.prompt);
  }, [job, title]);

  // Announce edit results in the chat (only for edit jobs, which carry sourceUrl).
  useEffect(() => {
    if (!job || !job.sourceUrl) return;
    const key = job._id + ":" + job.status;
    if (key === lastNotified) return;
    if (job.status === "done") {
      setMessages((m) => [...m, { role: "system", text: "Done. Playing the updated reel." }]);
      setLastNotified(key);
    } else if (job.status === "failed") {
      setMessages((m) => [...m, { role: "system", text: "That edit failed: " + (job.error ?? "unknown error") }]);
      setLastNotified(key);
    }
  }, [job?._id, job?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || !ready || !job?.resultUrl || busy || rendering) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: t }]);
    setInstruction("");
    try {
      const { jobId } = (await requestEdit({ sourceUrl: job.resultUrl, instruction: t })) as { jobId: string };
      setMessages((m) => [...m, { role: "system", text: "Re-cutting with ffmpeg — about a minute." }]);
      setEdits((n) => n + 1);
      setActiveId(jobId);
    } catch (e: any) {
      const code = e?.data?.code;
      setMessages((m) => [
        ...m,
        { role: "system", text: code === "NO_CREDITS" ? "You're out of credits — grab a pack to keep editing." : "Something went wrong, try again." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link to="/create" className="group inline-flex items-center gap-1.5 text-sm font-semibold text-secondaryText transition-colors hover:text-charcoal">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to your reels
        </Link>
        <Link to="/" className="font-display text-xl font-bold tracking-tight">lazyclip</Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-76px)] max-w-5xl flex-col justify-center px-6 pb-14">
        {/* Titled header */}
        <div className="mb-7">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-electricBlue">Studio</div>
          <h1 className="mt-1.5 font-display text-2xl font-extrabold leading-tight tracking-tight text-balance md:text-[28px]">
            {title || "Your reel"}
          </h1>
        </div>

        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
          {/* Player */}
          <div className="flex flex-col items-center gap-4">
            <div className="group relative">
              <div className="pointer-events-none absolute -inset-2.5 rounded-[2.2rem] bg-charcoal/10 blur-xl" />
              <div className="relative aspect-[9/16] w-[300px] max-w-full overflow-hidden rounded-[2rem] border-[7px] border-charcoal bg-black shadow-2xl">
                {ready && job?.resultUrl ? (
                  <video key={job.resultUrl} src={job.resultUrl} controls autoPlay playsInline className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/70">
                    {job === null ? (
                      <span className="font-mono text-xs">reel not found</span>
                    ) : job?.status === "failed" ? (
                      <span className="font-mono text-xs text-red-400">generation failed</span>
                    ) : (
                      <>
                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                        <span className="font-mono text-xs">{job ? `${job.status}…` : "loading…"}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            {ready && job?.resultUrl && (
              <a href={job.resultUrl} download
                className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition-colors hover:border-charcoal/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricBlue focus-visible:ring-offset-2 focus-visible:ring-offset-warmBg">
                <Download className="h-4 w-4" /> Download
              </a>
            )}
          </div>

          {/* Edit console */}
          <div className="flex h-[547px] flex-col rounded-3xl border border-black/[0.07] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-electricBlue/10 text-electricBlue">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold leading-none">Edit with AI</h2>
                <p className="mt-1 font-mono text-[11px] text-secondaryText">re-cut with ffmpeg · plays here</p>
              </div>
            </div>

            {/* Quick edits */}
            <div className="mt-5 flex flex-wrap gap-2">
              {QUICK_EDITS.map((q) => (
                <button key={q} onClick={() => send(q)} disabled={!ready || busy || rendering}
                  className="rounded-full border border-black/10 bg-warmBg px-3.5 py-1.5 text-xs font-medium transition-colors hover:border-electricBlue hover:text-electricBlue disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricBlue">
                  {q}
                </button>
              ))}
            </div>

            {/* Chat log */}
            <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto pr-1">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-start justify-center gap-1.5">
                  <p className="font-sans text-sm text-charcoal/80">Tell it how to change the reel.</p>
                  <p className="font-mono text-[11px] leading-relaxed text-secondaryText">
                    “make it square” · “add a watermark”<br />“convert to a gif” · “speed it up 1.5x”
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <span className={`inline-block max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.role === "user" ? "rounded-br-md bg-charcoal text-white" : "rounded-bl-md border border-black/[0.06] bg-warmBg text-charcoal"}`}>
                    {m.text}
                  </span>
                </div>
              ))}
              {rendering && !!job?.sourceUrl && (
                <div className="flex items-center gap-2 font-mono text-xs text-secondaryText">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-secondaryText/30 border-t-secondaryText" /> rendering…
                </div>
              )}
            </div>

            {/* Composer */}
            <form onSubmit={(e) => { e.preventDefault(); void send(instruction); }} className="mt-4 flex items-center gap-2">
              <input value={instruction} onChange={(e) => setInstruction(e.target.value)}
                placeholder={ready ? "Describe an edit…" : rendering ? "Rendering…" : "Waiting for the reel…"}
                disabled={!ready || busy || rendering}
                className="flex-1 rounded-2xl border border-black/10 bg-warmBg px-4 py-3 font-sans text-sm outline-none transition-colors focus:border-electricBlue disabled:opacity-50" />
              <button type="submit" disabled={!ready || busy || rendering || !instruction.trim()}
                className="flex items-center gap-1.5 rounded-2xl bg-charcoal px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-electricBlue disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electricBlue focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                <Wand2 className="h-4 w-4" /> Edit
              </button>
            </form>
            {edits > 0 && (
              <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-secondaryText">
                {edits} edit{edits > 1 ? "s" : ""} · each edit uses 1 generation
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
