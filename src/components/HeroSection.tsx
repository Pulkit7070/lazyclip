import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { useMutation } from "convex/react";
import InteractiveWorkspace from "./InteractiveWorkspace";
import { api, convexEnabled } from "../lib/convexApi";

export default function HeroSection() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [arrowHovered, setArrowHovered] = useState(false);
  const joinWaitlist = useMutation(api.waitlist.join);

  // Swapping Words array
  const swapWords = ["MEDIA", "VIDEO", "AUDIO", "REELS", "SHORTS", "CONTENT"];
  const [wordIndex, setWordIndex] = useState(0);

  // Subtitle prompts for typewriter effect
  const prompts = [
    "Just ask.",
    "Trim this video.",
    "Make it viral.",
    "Generate captions.",
    "Convert to mp3.",
    "Make Telegram sticker."
  ];
  const [promptIndex, setPromptIndex] = useState(0);
  const [displayedPrompt, setDisplayedPrompt] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Swapping word effect
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % swapWords.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Typewriter prompt subtitle effect
  useEffect(() => {
    let timer: number;
    const currentFullText = prompts[promptIndex];

    const handleType = () => {
      if (!isDeleting) {
        setDisplayedPrompt((prev) => currentFullText.substring(0, prev.length + 1));
        if (displayedPrompt === currentFullText) {
          timer = window.setTimeout(() => setIsDeleting(true), 2200); // Pause before deleting
        } else {
          timer = window.setTimeout(handleType, 80);
        }
      } else {
        setDisplayedPrompt((prev) => currentFullText.substring(0, prev.length - 1));
        if (displayedPrompt === "") {
          setIsDeleting(false);
          setPromptIndex((prev) => (prev + 1) % prompts.length);
        } else {
          timer = window.setTimeout(handleType, 40);
        }
      }
    };

    timer = window.setTimeout(handleType, isDeleting ? 40 : 80);
    return () => clearTimeout(timer);
  }, [displayedPrompt, isDeleting, promptIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    const celebrate = () =>
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#2563EB", "#84CC16", "#F97316", "#111111"] });

    try {
      if (!convexEnabled) throw new Error("convex-not-configured");
      const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 6000));
      await Promise.race([joinWaitlist({ email, source: "hero" }), timeout]);
    } catch {
      const waitlist = JSON.parse(localStorage.getItem("lazyclip_waitlist") || "[]");
      if (!waitlist.includes(email)) {
        waitlist.push(email);
        localStorage.setItem("lazyclip_waitlist", JSON.stringify(waitlist));
      }
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
      celebrate();
      setTimeout(() => { window.location.assign("/create"); }, 1800);
    }
  };

  // Entrance variants matching Apple Keynote style
  const slideUpVariant = {
    hidden: { y: 60, opacity: 0 },
    visible: (delay: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        delay,
        ease: [0.16, 1, 0.3, 1] as const, // Apple-like easeOutExpo
      },
    }),
  };

  const springVariant = {
    hidden: { scale: 0.75, opacity: 0, y: 40 },
    visible: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 160,
        damping: 14,
        delay: 1.8,
      },
    },
  };

  const maskRevealVariant = {
    hidden: { width: 0, opacity: 0 },
    visible: {
      width: "auto",
      opacity: 1,
      transition: {
        duration: 0.9,
        delay: 2.5,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <section className="w-full pt-4 pb-12 lg:py-0 px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center lg:h-[calc(100vh-80px)] lg:min-h-[500px] relative select-none">
      
      {/* LEFT SIDE: Copy & Waitlist Input */}
      <div className="lg:col-span-6 flex flex-col justify-center pt-2 z-10">
        
        {/* Introducing badge */}
        <div className="flex items-center gap-2 mb-3 self-start">
          <span className="px-3 py-1 rounded-full border border-charcoal/10 bg-white font-mono text-[10px] text-charcoal font-bold tracking-widest uppercase shadow-sm">
            Introducing lazyclip
          </span>
        </div>

        {/* Highly Dynamic Keynote Headline — 3 lines */}
        <h1 className="font-display font-extrabold text-[52px] sm:text-[64px] md:text-[72px] lg:text-[64px] xl:text-[76px] text-charcoal leading-[0.9] tracking-[-0.05em] uppercase flex flex-col">
          
          {/* Line 1: YOUR [SWAPPING WORD] — always one line */}
          <motion.div
            variants={slideUpVariant}
            initial="hidden"
            animate="visible"
            custom={0.0}
            className="flex items-baseline gap-3 whitespace-nowrap"
          >
            <span>YOUR</span>
            <span className="relative inline-block h-[1.1em] overflow-hidden min-w-[5.5em]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIndex}
                  initial={{ y: "80%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-80%", opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute left-0 bottom-0 text-electricBlue font-mono font-black tracking-tighter"
                >
                  {swapWords[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.div>

          {/* Line 2: EDITOR */}
          <motion.span
            variants={slideUpVariant}
            initial="hidden"
            animate="visible"
            custom={0.5}
            className="block"
          >
            EDITOR
          </motion.span>

          {/* Line 3: LIVES IN CHAT. */}
          <motion.div
            variants={springVariant}
            initial="hidden"
            animate="visible"
            className="flex items-baseline gap-3"
          >
            <span>LIVES</span>
            <motion.span
              variants={maskRevealVariant}
              initial="hidden"
              animate="visible"
              className="whitespace-nowrap underline decoration-[#2563EB]/40 decoration-4 md:decoration-8"
            >
              IN CHAT.
            </motion.span>
          </motion.div>

        </h1>

        {/* Animated Subtitle / Typewriter Prompt */}
        <div className="mt-4 min-h-[40px] max-w-lg">
          <p className="font-mono text-sm md:text-base text-secondaryText leading-relaxed flex items-center gap-1">
            <span className="opacity-50 font-sans">Chat edit:</span>
            <span className="text-charcoal font-semibold">{displayedPrompt}</span>
            <span className="w-1.5 h-4.5 bg-electricBlue animate-pulse" />
          </p>
        </div>

        {/* Waitlist submission form */}
        <div className="mt-5 w-full max-w-md">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.form
                key="hero-waitlist-form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="relative flex flex-col sm:flex-row items-stretch gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3.5 rounded-2xl bg-white border border-[#E5E5E2] font-sans text-sm text-charcoal outline-none focus:border-electricBlue transition-colors placeholder-[#888885] shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    onMouseEnter={() => setArrowHovered(true)}
                    onMouseLeave={() => setArrowHovered(false)}
                    className="px-6 py-3.5 rounded-2xl bg-charcoal text-white hover:bg-electricBlue transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2 hover-trigger shadow-sm disabled:opacity-50 relative overflow-hidden group cursor-pointer"
                    data-cursor-text="Get Access"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign up</span>
                        <div className="relative w-4 h-4 overflow-hidden flex items-center justify-center">
                          <motion.div
                            animate={arrowHovered ? { x: [0, 16, -16, 0] } : {}}
                            transition={{ duration: 0.45, ease: "easeInOut" }}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </motion.div>
                        </div>
                      </>
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex items-center gap-1.5 text-red-500 font-mono text-[10px] px-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="font-mono text-[9px] text-[#888885] tracking-wider uppercase pl-1.5 pt-1">
                  No spam. Just early access.
                </p>
              </motion.form>
            ) : (
              <motion.div
                key="hero-success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-green-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-acidGreen flex-shrink-0">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-charcoal">🎉 Congratulations — you're in!</h4>
                  <p className="font-sans text-[11px] text-secondaryText mt-0.5">
                    We'll email <span className="text-charcoal font-medium">{email}</span> the moment early access opens.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Try the live bot immediately */}
          <a
            href="https://t.me/Lazy_clip_bot"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-electricBlue hover:opacity-80 transition-opacity hover-trigger self-start"
            data-cursor-text="Telegram"
          >
            or try it now on Telegram →
          </a>
        </div>

      </div>

      {/* RIGHT SIDE: iPhone 16 Pro Mockup with LazyClip Loop */}
      <div className="lg:col-span-6 w-full flex justify-center items-center">
        <InteractiveWorkspace />
      </div>

    </section>
  );
}
