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

// A few one-tap edits the ffmpeg pipeline handles well.
const QUICK_EDITS = [
  "Make it square (1:1)",
  "Make it landscape (16:9)",
  "Add a watermark",
  "Convert to a GIF",
];

export default function Studio() {
  return (
    <div className="min-h-screen bg-warmBg text-charcoal">
      <SignedOut>
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <Link to="/" className="font-display font-bold text-2xl tracking-tight mb-6">lazyclip</Link>
          <h1 className="font-display font-extrabold text-3xl">Sign in to open the studio</h1>
          <SignInButton mode="modal">
            <button className="mt-6 rounded-xl bg-charcoal text-white px-7 py-3.5 font-semibold text-sm hover:bg-electricBlue transition-colors">Continue with Google</button>
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

  const rendering = !!job && (job.status === "queued" || job.status === "processing");
  const ready = !!job && job.status === "done" && !!job.resultUrl;

  // Announce edit results in the chat (only for edit jobs, which carry sourceUrl).
  useEffect(() => {
    if (!job || !job.sourceUrl) return;
    const key = job._id + ":" + job.status;
    if (key === lastNotified) return;
    if (job.status === "done") {
      setMessages((m) => [...m, { role: "system", text: "✅ Done — playing the updated reel." }]);
      setLastNotified(key);
    } else if (job.status === "failed") {
      setMessages((m) => [...m, { role: "system", text: "⚠️ That edit failed: " + (job.error ?? "unknown error") }]);
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
      setMessages((m) => [...m, { role: "system", text: "Editing your reel… this takes about a minute." }]);
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
    <div>
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <Link to="/create" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-electricBlue">
          <ArrowLeft className="w-4 h-4" /> Back to your reels
        </Link>
        <Link to="/" className="font-display font-bold text-xl tracking-tight">lazyclip</Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Player */}
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-[320px] aspect-[9/16] rounded-[28px] bg-black border-[6px] border-charcoal shadow-xl overflow-hidden">
            {ready && job?.resultUrl ? (
              <video key={job.resultUrl} src={job.resultUrl} controls autoPlay playsInline
                className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/70 gap-3">
                {job === null ? (
                  <span className="font-mono text-xs">reel not found</span>
                ) : job?.status === "failed" ? (
                  <span className="font-mono text-xs text-red-400">generation failed</span>
                ) : (
                  <>
                    <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="font-mono text-xs">{job ? `${job.status}…` : "loading…"}</span>
                  </>
                )}
              </div>
            )}
          </div>
          {ready && job?.resultUrl && (
            <a href={job.resultUrl} download
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#E5E5E2] bg-white px-4 py-2 text-sm font-semibold hover:border-charcoal/30">
              <Download className="w-4 h-4" /> Download
            </a>
          )}
        </div>

        {/* Edit-with-AI chat */}
        <div className="rounded-3xl border border-[#E5E5E2] bg-white p-5 flex flex-col min-h-[520px]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-electricBlue" />
            <h2 className="font-display font-bold text-lg">Edit with AI</h2>
          </div>
          <p className="font-sans text-sm text-secondaryText mt-1">
            Tell it how to change the reel — it re-cuts with ffmpeg and plays the new version here.
          </p>

          {/* Quick edits */}
          <div className="flex flex-wrap gap-2 mt-4">
            {QUICK_EDITS.map((q) => (
              <button key={q} onClick={() => send(q)} disabled={!ready || busy || rendering}
                className="rounded-full border border-[#E5E5E2] bg-warmBg px-3 py-1.5 text-xs font-medium hover:border-electricBlue hover:text-electricBlue transition-colors disabled:opacity-40">
                {q}
              </button>
            ))}
          </div>

          {/* Chat log */}
          <div className="flex-1 mt-4 space-y-2.5 overflow-y-auto">
            {messages.length === 0 && (
              <p className="font-mono text-xs text-secondaryText/70">
                e.g. “make it square”, “add a watermark”, “convert to a gif”, “speed it up 1.5x”
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <span className={`inline-block rounded-2xl px-3.5 py-2 text-sm max-w-[85%] ${m.role === "user" ? "bg-charcoal text-white" : "bg-warmBg text-charcoal"}`}>
                  {m.text}
                </span>
              </div>
            ))}
            {rendering && !!job?.sourceUrl && (
              <div className="flex items-center gap-2 text-xs font-mono text-secondaryText">
                <span className="w-3 h-3 border-2 border-secondaryText/30 border-t-secondaryText rounded-full animate-spin" /> rendering…
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={(e) => { e.preventDefault(); void send(instruction); }} className="mt-3 flex items-center gap-2">
            <input value={instruction} onChange={(e) => setInstruction(e.target.value)}
              placeholder={ready ? "Describe an edit…" : "Waiting for the reel…"}
              disabled={!ready || busy || rendering}
              className="flex-1 rounded-2xl border border-[#E5E5E2] bg-warmBg px-4 py-3 font-sans text-sm outline-none focus:border-electricBlue transition-colors disabled:opacity-50" />
            <button type="submit" disabled={!ready || busy || rendering || !instruction.trim()}
              className="rounded-2xl bg-charcoal text-white px-4 py-3 font-semibold text-sm hover:bg-electricBlue transition-colors disabled:opacity-40 flex items-center gap-1.5">
              <Wand2 className="w-4 h-4" /> Edit
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
