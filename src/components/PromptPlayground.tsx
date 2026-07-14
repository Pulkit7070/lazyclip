import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Terminal, CheckCircle2, Download, CornerDownLeft } from "lucide-react";

interface SuggestionChip {
  label: string;
  command: string;
  outputSize: string;
  pipeline: string[];
}

const SUGGESTIONS: SuggestionChip[] = [
  {
    label: "Turn this into a GIF",
    command: "Convert video to high-quality GIF, speed it up 1.25x",
    outputSize: "4.2 MB GIF",
    pipeline: ["Extract frames", "Generate palette", "Apply scale filter", "Render GIF"],
  },
  {
    label: "Compress below 10MB",
    command: "Compress video for Discord to fit under 10MB limit",
    outputSize: "7.8 MB MP4",
    pipeline: ["Calculate target bitrate", "2-pass encoding", "Audio compression", "Verify bounds"],
  },
  {
    label: "Burn subtitles",
    command: "Transcribe audio and burn subtitles in styled captions",
    outputSize: "24.5 MB MP4",
    pipeline: ["Extract speech", "Generate SRT file", "Burn subtitles (ass filter)", "Export"],
  },
  {
    label: "Crop for Instagram",
    command: "Crop video to 9:16 vertical, center focus",
    outputSize: "18.3 MB MP4",
    pipeline: ["Parse dimensions", "Apply crop filter (w=h*9/16)", "Hardware encode", "Done"],
  },
  {
    label: "Convert to MP3",
    command: "Extract audio and convert to 320kbps MP3 stereo",
    outputSize: "5.1 MB MP3",
    pipeline: ["Isolate audio track", "Convert to mp3 stream", "Apply constant bitrate", "Write ID3 tags"],
  },
  {
    label: "Make Telegram sticker",
    command: "Trim first 3 seconds, resize to 512x512, export as WebM sticker",
    outputSize: "128 KB WEBM",
    pipeline: ["Crop duration 0:00-0:03", "Resize to 512x512 px", "Encode VP9 alpha channel", "Sticker envelope"],
  },
];

export default function PromptPlayground() {
  const [inputValue, setInputValue] = useState("");
  const [isTypingSim, setIsTypingSim] = useState(false);
  const [chatLog, setChatLog] = useState<
    Array<{ type: "user" | "bot"; text: string; details?: SuggestionChip; progress?: number; done?: boolean }>
  >([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom only after user interaction (not on initial mount)
  useEffect(() => {
    if (chatLog.length > 1 && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [chatLog]);

  // Initial welcome message
  useEffect(() => {
    setChatLog([
      {
        type: "bot",
        text: "Ready. Select a suggestion below or type a command to see how LazyClip builds your editing pipeline.",
        done: true,
      },
    ]);
  }, []);

  const simulateTyping = (chip: SuggestionChip) => {
    if (isTypingSim) return;
    setIsTypingSim(true);
    setInputValue("");

    let currentText = "";
    let charIndex = 0;
    const speed = 25; // ms per char

    const interval = setInterval(() => {
      if (charIndex < chip.command.length) {
        currentText += chip.command.charAt(charIndex);
        setInputValue(currentText);
        charIndex++;
      } else {
        clearInterval(interval);
        setIsTypingSim(false);
        // Automatically submit the message
        submitMessage(chip.command, chip);
      }
    }, speed);
  };

  const submitMessage = (textToSubmit: string, chipContext?: SuggestionChip) => {
    if (!textToSubmit.trim()) return;

    // 1. Add User Prompt
    const newLogs = [
      ...chatLog,
      { type: "user" as const, text: textToSubmit },
    ];
    setChatLog(newLogs);
    setInputValue("");

    // Find custom/mock info if user typed something not in chips
    const chip = chipContext || {
      label: "Custom Command",
      command: textToSubmit,
      outputSize: "12.4 MB MP4",
      pipeline: ["Parse user parameters", "Initialize FFmpeg pipeline", "Apply filter overlay", "Compile package"],
    };

    // 2. Add pending bot response after a short delay
    setTimeout(() => {
      const botIndex = newLogs.length;
      
      // Insert empty bot log with progress 0
      setChatLog((prev) => [
        ...prev,
        {
          type: "bot",
          text: `Executing custom pipeline for media request...`,
          details: chip,
          progress: 0,
          done: false,
        },
      ]);

      // Animate progress up
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress += 10;
        setChatLog((prev) => {
          const updated = [...prev];
          const item = updated[botIndex];
          if (item) {
            item.progress = currentProgress;
            if (currentProgress >= 100) {
              item.done = true;
              item.text = `Successfully compiled and executed. Output generated.`;
              clearInterval(progressInterval);
            }
          }
          return updated;
        });
      }, 150);
    }, 400);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isTypingSim) {
      submitMessage(inputValue);
    }
  };

  return (
    <section className="w-full py-16 bg-white border-y border-[#E5E5E2] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-radial-gradient from-warmBg/50 to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Title */}
        <div className="text-center mb-16">
          <span className="font-mono text-xs uppercase tracking-widest text-secondaryText px-3 py-1 rounded-full border border-[#E5E5E2] bg-warmBg">
            Playground
          </span>
          <h2 className="font-display font-bold text-4xl md:text-6xl tracking-tight text-charcoal mt-6">
            Test the command line.
          </h2>
          <p className="font-sans text-secondaryText text-lg mt-4 max-w-lg mx-auto">
            Click any suggestion below to see how the editor parses natural language requests into operational FFmpeg scripts.
          </p>
        </div>

        {/* Command Terminal UI Wrapper */}
        <div className="w-full bg-[#111111] border border-[#2A2A2A] rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[480px]">
          
          {/* Top terminal bar */}
          <div className="bg-[#181818] border-b border-[#2A2A2A] px-4 py-3 flex justify-between items-center text-xs font-mono text-white/50">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-electricBlue" />
              <span>lazyclip-agent --interactive</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            </div>
          </div>

          {/* Chat Logs Area */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[300px]">
            {chatLog.map((log, idx) => (
              <div
                key={idx}
                className={`flex ${log.type === "user" ? "justify-end" : "justify-start"}`}
              >
                {log.type === "user" ? (
                  /* User message bubble */
                  <div className="bg-[#222222] border border-[#333333] text-white px-4 py-2.5 rounded-xl rounded-tr-sm max-w-[85%] font-mono text-sm">
                    {log.text}
                  </div>
                ) : (
                  /* Bot log output */
                  <div className="text-white/90 space-y-3 max-w-[85%]">
                    {/* Bot status statement */}
                    <div className="font-mono text-sm leading-relaxed text-white/70">
                      {log.text}
                    </div>

                    {/* Active compilation steps */}
                    {log.details && (
                      <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-4 space-y-2.5 font-mono text-xs shadow-inner">
                        <div className="flex justify-between items-center text-white/40 border-b border-white/5 pb-1.5 mb-2">
                          <span>FFMPEG PIPELINE BINDINGS</span>
                          <span>{log.progress}%</span>
                        </div>

                        {log.details.pipeline.map((step, sIdx) => {
                          const threshold = ((sIdx + 1) / log.details!.pipeline.length) * 100;
                          const isDone = (log.progress || 0) >= threshold;
                          
                          return (
                            <div key={sIdx} className="flex items-center gap-2">
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-acidGreen" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-dashed border-white/20 animate-spin" />
                              )}
                              <span className={isDone ? "text-white" : "text-white/40"}>
                                {step}
                              </span>
                            </div>
                          );
                        })}

                        {/* If completely finished, show file card output */}
                        {log.done && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#222222] border border-[#333333] p-3 rounded-lg flex items-center justify-between mt-3 text-xs"
                          >
                            <div>
                              <div className="text-white font-semibold">export_result.{log.details.outputSize.split(" ")[1].toLowerCase()}</div>
                              <div className="text-white/40 text-[10px] mt-0.5">{log.details.outputSize}</div>
                            </div>
                            <button className="h-8 px-3 rounded bg-white text-black hover:bg-electricBlue hover:text-white transition-colors duration-200 flex items-center gap-1.5 font-semibold text-[10px] hover-trigger" data-cursor-text="Get File">
                              <span>Download</span>
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Bottom input area */}
          <div className="bg-[#181818] border-t border-[#2A2A2A] p-4 flex gap-3 items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isTypingSim}
              placeholder={isTypingSim ? "Simulating typing..." : "Type custom editing instructions... (e.g. Speed it up x2, convert to gif)"}
              className="flex-1 bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-white/20 outline-none focus:border-electricBlue transition-colors"
            />
            <button
              onClick={() => submitMessage(inputValue)}
              disabled={isTypingSim || !inputValue.trim()}
              className="h-11 px-4 rounded-xl bg-white text-charcoal hover:bg-electricBlue hover:text-white disabled:opacity-40 transition-all duration-300 flex items-center justify-center gap-1.5 font-mono text-xs font-bold hover-trigger"
              data-cursor-text="Run"
            >
              <span>Execute</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Suggestion Chips */}
        <div className="mt-8 flex flex-wrap gap-2.5 justify-center">
          {SUGGESTIONS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => simulateTyping(chip)}
              disabled={isTypingSim}
              className="px-4 py-2 rounded-full border border-[#E5E5E2] bg-white text-xs font-mono text-secondaryText hover:text-charcoal hover:border-charcoal disabled:opacity-50 transition-all duration-200 shadow-sm flex items-center gap-1.5 hover-trigger"
              data-cursor-text="Try"
            >
              <Sparkles className="w-3.5 h-3.5 text-electricBlue" />
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}
