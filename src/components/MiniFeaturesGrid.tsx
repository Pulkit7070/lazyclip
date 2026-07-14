import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HardDrive, Type, FileVideo, RefreshCw, Scissors, Volume2 } from "lucide-react";

export default function MiniFeaturesGrid() {
  const [activeCycle, setActiveCycle] = useState(0);

  // Auto increment cycles for animations
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCycle((prev) => (prev + 1) % 100);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="w-full py-16 bg-[#F8F8F6] max-w-7xl mx-auto px-6 md:px-12">
      
      {/* Section Header */}
      <div className="mb-12 text-left">
        <span className="font-mono text-xs uppercase tracking-widest text-secondaryText px-3 py-1 rounded-full border border-[#E5E5E2] bg-white">
          Features
        </span>
        <h2 className="font-display font-bold text-4xl md:text-7xl tracking-tight text-charcoal mt-6 leading-tight max-w-3xl">
          Zero interface. <br />
          Maximum capability.
        </h2>
        <p className="font-sans text-secondaryText text-lg md:text-xl mt-6 max-w-lg">
          We built dedicated pipelines for every media operation. No buttons, no sub-menus, no exports configs. Just direct outputs.
        </p>
      </div>

      {/* Grid of Miniature UIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* CARD 1: Compression */}
        <div className="bg-white border border-[#E5E5E2] rounded-3xl p-6 flex flex-col justify-between min-h-[300px] hover:shadow-lg transition-shadow duration-300 group hover-trigger" data-cursor-text="Compress">
          <div>
            <div className="w-10 h-10 rounded-xl bg-warmBg flex items-center justify-center text-charcoal mb-4">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-charcoal">Video Compression</h3>
            <p className="font-sans text-xs text-secondaryText mt-2">
              Lossless compression targeting specific limits for Discord, Telegram, or email.
            </p>
          </div>

          {/* Mini UI Workspace */}
          <div className="mt-6 border border-[#E5E5E2] rounded-2xl p-4 bg-warmBg flex flex-col justify-center h-28 relative overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <span className="font-mono text-[10px] text-secondaryText">Status: Compressing</span>
              <span className="font-mono text-[10px] text-charcoal font-semibold">96%</span>
            </div>

            {/* Compressor shrinking visualization */}
            <div className="w-full bg-white border border-[#E5E5E2] p-3 rounded-xl flex justify-between items-center relative overflow-hidden">
              <div className="flex items-center gap-2 z-10">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-500 font-mono text-[10px] font-bold">
                  MP4
                </div>
                <div className="font-mono text-[10px]">
                  <div>party.mp4</div>
                  <div className="text-secondaryText text-[8px] flex items-center gap-1 mt-0.5">
                    <span className="line-through">312 MB</span>
                    <span className="text-acidGreen font-bold">18 MB</span>
                  </div>
                </div>
              </div>

              {/* Compressed label */}
              <div className="px-2 py-0.5 rounded bg-green-50 border border-green-200 text-[8px] font-mono text-acidGreen z-10">
                -94.2%
              </div>

              {/* Progress Sweep */}
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-electricBlue/10 to-transparent pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* CARD 2: Subtitle Burner */}
        <div className="bg-white border border-[#E5E5E2] rounded-3xl p-6 flex flex-col justify-between min-h-[300px] hover:shadow-lg transition-shadow duration-300 group hover-trigger" data-cursor-text="Subtitle">
          <div>
            <div className="w-10 h-10 rounded-xl bg-warmBg flex items-center justify-center text-charcoal mb-4">
              <Type className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-charcoal">Styled Captions</h3>
            <p className="font-sans text-xs text-secondaryText mt-2">
              Whisper-driven voice transcription burned directly into frames with customizable styles.
            </p>
          </div>

          {/* Mini UI Workspace */}
          <div className="mt-6 border border-[#E5E5E2] rounded-2xl p-4 bg-warmBg flex items-center justify-center h-28 relative overflow-hidden">
            <div className="w-full h-full rounded-xl bg-charcoal border border-[#2A2A2A] p-2 flex flex-col justify-end relative">
              
              {/* Fake visual player grid */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <div className="w-16 h-16 rounded-full border-2 border-white border-dashed animate-spin" />
              </div>

              {/* Subtitles pulsing word by word */}
              <div className="z-10 text-center w-full pb-1">
                <span className="bg-black/85 text-[9px] font-display text-white border border-white/10 px-2 py-1 rounded inline-block shadow-md">
                  {activeCycle % 3 === 0 && "Let's trim this segment..."}
                  {activeCycle % 3 === 1 && "And speed it up..."}
                  {activeCycle % 3 === 2 && "Directly inside the chat!"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: Video-to-GIF Conversion */}
        <div className="bg-white border border-[#E5E5E2] rounded-3xl p-6 flex flex-col justify-between min-h-[300px] hover:shadow-lg transition-shadow duration-300 group hover-trigger" data-cursor-text="GIF Loop">
          <div>
            <div className="w-10 h-10 rounded-xl bg-warmBg flex items-center justify-center text-charcoal mb-4">
              <FileVideo className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-charcoal">Video to GIF</h3>
            <p className="font-sans text-xs text-secondaryText mt-2">
              Export frames as dynamic, highly-optimized GIFs with custom frame-skipping and resolution scaling.
            </p>
          </div>

          {/* Mini UI Workspace */}
          <div className="mt-6 border border-[#E5E5E2] rounded-2xl p-4 bg-warmBg flex items-center justify-center h-28 relative overflow-hidden">
            <div className="w-full flex items-center justify-center gap-3">
              {/* Source MP4 icon */}
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E5E2] flex flex-col items-center justify-center shadow-sm">
                <span className="font-mono text-[9px] text-secondaryText">MP4</span>
                <span className="font-mono text-[8px] text-red-400 font-bold mt-0.5">30 FPS</span>
              </div>

              {/* Arrow transition */}
              <div className="flex flex-col items-center">
                <RefreshCw className="w-4 h-4 text-electricBlue animate-spin" />
              </div>

              {/* Target GIF Loop card */}
              <div className="w-16 h-16 rounded-xl bg-charcoal border border-[#2A2A2A] flex flex-col items-center justify-center relative overflow-hidden shadow-md">
                {/* Loop badge */}
                <div className="absolute top-1 left-1 bg-acidGreen text-black text-[6px] font-mono px-1 rounded">
                  LOOP
                </div>
                <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center mb-1 mt-1">
                  <span className="font-display text-[9px] text-white font-bold">GIF</span>
                </div>
                <div className="text-[7px] text-white/40 font-mono">1.2 MB</div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: Convert Format Chain */}
        <div className="bg-white border border-[#E5E5E2] rounded-3xl p-6 flex flex-col justify-between min-h-[300px] hover:shadow-lg transition-shadow duration-300 group hover-trigger" data-cursor-text="Convert">
          <div>
            <div className="w-10 h-10 rounded-xl bg-warmBg flex items-center justify-center text-charcoal mb-4">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-charcoal">Format Transcoding</h3>
            <p className="font-sans text-xs text-secondaryText mt-2">
              Transform any media container instantly. Supports MP4, MOV, WebM, MP3, WAV, FLAC, and AVI.
            </p>
          </div>

          {/* Mini UI Workspace */}
          <div className="mt-6 border border-[#E5E5E2] rounded-2xl p-4 bg-warmBg flex flex-col justify-center h-28 relative overflow-hidden">
            {/* Conversion sequence indicator */}
            <div className="flex justify-between items-center gap-1.5 px-1.5 font-mono text-[9px] text-secondaryText">
              <span className={activeCycle % 4 === 0 ? "text-electricBlue font-bold scale-110" : ""}>.MOV</span>
              <span>→</span>
              <span className={activeCycle % 4 === 1 ? "text-electricBlue font-bold scale-110" : ""}>.MP4</span>
              <span>→</span>
              <span className={activeCycle % 4 === 2 ? "text-electricBlue font-bold scale-110" : ""}>.WEBM</span>
              <span>→</span>
              <span className={activeCycle % 4 === 3 ? "text-electricBlue font-bold scale-110" : ""}>.MP3</span>
            </div>

            {/* Transcode progress bar */}
            <div className="w-full bg-white rounded-full h-1.5 mt-4 border border-[#E5E5E2] overflow-hidden">
              <motion.div
                key={activeCycle % 4}
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1 }}
                className="h-full bg-electricBlue"
              />
            </div>
          </div>
        </div>

        {/* CARD 5: Trim Timeline */}
        <div className="bg-white border border-[#E5E5E2] rounded-3xl p-6 flex flex-col justify-between min-h-[300px] hover:shadow-lg transition-shadow duration-300 group hover-trigger" data-cursor-text="Trim">
          <div>
            <div className="w-10 h-10 rounded-xl bg-warmBg flex items-center justify-center text-charcoal mb-4">
              <Scissors className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-charcoal">Smart Trimming</h3>
            <p className="font-sans text-xs text-secondaryText mt-2">
              Isolate key timestamps. Trim down to milliseconds using frames or standard time codes.
            </p>
          </div>

          {/* Mini UI Workspace */}
          <div className="mt-6 border border-[#E5E5E2] rounded-2xl p-4 bg-warmBg flex flex-col justify-center h-28 relative overflow-hidden">
            {/* Timeline with boundaries shrinking */}
            <div className="w-full h-6 bg-white border border-[#E5E5E2] rounded-lg relative overflow-hidden flex items-center">
              
              {/* Left trim bracket */}
              <motion.div
                animate={{ left: ["5%", "25%", "5%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 bottom-0 w-2.5 bg-electricBlue cursor-ew-resize rounded-l z-10 flex items-center justify-center"
              >
                <div className="w-0.5 h-3 bg-white" />
              </motion.div>

              {/* Trimmed content region */}
              <motion.div
                animate={{ left: ["5%", "25%", "5%"], right: ["5%", "20%", "5%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 bottom-0 bg-blue-50/70 border-y-2 border-electricBlue pointer-events-none"
              />

              {/* Right trim bracket */}
              <motion.div
                animate={{ right: ["5%", "20%", "5%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-0 bottom-0 w-2.5 bg-electricBlue cursor-ew-resize rounded-r z-10 flex items-center justify-center"
              >
                <div className="w-0.5 h-3 bg-white" />
              </motion.div>

              <span className="w-full text-center text-[8px] font-mono text-electricBlue font-bold z-0">
                0:15 - 0:45
              </span>
            </div>
          </div>
        </div>

        {/* CARD 6: Audio Cleaner */}
        <div className="bg-white border border-[#E5E5E2] rounded-3xl p-6 flex flex-col justify-between min-h-[300px] hover:shadow-lg transition-shadow duration-300 group hover-trigger" data-cursor-text="Clean Audio">
          <div>
            <div className="w-10 h-10 rounded-xl bg-warmBg flex items-center justify-center text-charcoal mb-4">
              <Volume2 className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-lg text-charcoal">Audio Normalization</h3>
            <p className="font-sans text-xs text-secondaryText mt-2">
              Apply decibel matching, noise gates, voice isolations, and clear background hums.
            </p>
          </div>

          {/* Mini UI Workspace */}
          <div className="mt-6 border border-[#E5E5E2] rounded-2xl p-4 bg-warmBg flex items-center justify-center h-28 relative overflow-hidden">
            {/* Waveform split (Noisy vs Clean) */}
            <div className="w-full flex items-center justify-between gap-[2px] px-2 h-14 relative bg-white border border-[#E5E5E2] rounded-xl overflow-hidden">
              
              {/* Left half - Spikey red noise */}
              <div className="w-1/2 flex items-center justify-around gap-[1.5px] opacity-40">
                <div className="w-0.5 h-10 bg-red-400" />
                <div className="w-0.5 h-5 bg-red-400" />
                <div className="w-0.5 h-12 bg-red-400" />
                <div className="w-0.5 h-8 bg-red-400" />
                <div className="w-0.5 h-14 bg-red-400" />
                <div className="w-0.5 h-6 bg-red-400" />
                <div className="w-0.5 h-10 bg-red-400" />
              </div>

              {/* Divider scan-bar */}
              <motion.div
                animate={{ left: ["0%", "100%", "0%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 bottom-0 w-0.5 bg-electricBlue shadow-lg shadow-electricBlue z-10"
              />

              {/* Right half - Clean green sine waves */}
              <div className="w-1/2 flex items-center justify-around gap-[1.5px] opacity-80">
                <div className="w-0.5 h-6 bg-acidGreen" />
                <div className="w-0.5 h-4 bg-acidGreen" />
                <div className="w-0.5 h-7 bg-acidGreen" />
                <div className="w-0.5 h-5 bg-acidGreen" />
                <div className="w-0.5 h-8 bg-acidGreen" />
                <div className="w-0.5 h-6 bg-acidGreen" />
                <div className="w-0.5 h-7 bg-acidGreen" />
              </div>

              {/* Status Labels */}
              <div className="absolute top-1 left-2 font-mono text-[7px] text-red-500 bg-red-50 px-1 rounded border border-red-100">
                Noisy Audio
              </div>
              <div className="absolute top-1 right-2 font-mono text-[7px] text-acidGreen bg-green-50 px-1 rounded border border-green-100">
                Isolate & Gain
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
