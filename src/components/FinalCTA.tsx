import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { useMutation } from "convex/react";
import { api, convexEnabled } from "../lib/convexApi";

export default function FinalCTA() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const joinWaitlist = useMutation(api.waitlist.join);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    const celebrate = () =>
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.8 }, colors: ["#2563EB", "#84CC16", "#F97316", "#111111"] });

    try {
      if (!convexEnabled) throw new Error("convex-not-configured");
      const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 6000));
      await Promise.race([joinWaitlist({ email, source: "final-cta" }), timeout]);
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

  return (
    <section
      id="waitlist-form-section"
      className="w-full py-20 bg-white relative overflow-hidden border-t border-[#E5E5E2]"
    >
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-radial-gradient from-warmBg/70 to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 md:px-12 relative z-10 text-center flex flex-col items-center">
        
        {/* Massive Headline */}
        <div className="max-w-3xl mb-12">
          <h2 className="font-display font-bold text-4xl sm:text-6xl md:text-8xl tracking-tight text-charcoal leading-none">
            The last media editor <br />
            <span className="text-secondaryText">you'll ever need</span> <br />
            might just be <span className="underline decoration-electricBlue decoration-4">a chat.</span>
          </h2>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md mt-6">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.form
                key="waitlist-form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="relative flex flex-col sm:flex-row items-stretch gap-2.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex-1 px-5 py-4 rounded-2xl bg-warmBg border border-[#E5E5E2] font-sans text-sm text-charcoal outline-none focus:border-electricBlue transition-colors focus:bg-white placeholder-[#888885]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-4 rounded-2xl bg-charcoal text-white hover:bg-electricBlue transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2 hover-trigger shadow-sm disabled:opacity-50"
                    data-cursor-text="Submit"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign up</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Validation errors */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="flex items-center gap-1.5 text-red-500 font-mono text-xs justify-center"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Subtitle note */}
                <p className="font-mono text-[10px] text-secondaryText text-center tracking-wider uppercase pt-2">
                  No spam. Just early access. Your camera roll deserves better.
                </p>
              </motion.form>
            ) : (
              /* Success state */
              <motion.div
                key="success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-warmBg border border-green-200 p-6 md:p-8 rounded-3xl flex flex-col items-center text-center shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-acidGreen mb-4">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="font-display font-bold text-xl text-charcoal">🎉 Congratulations — you're in!</h4>
                <p className="font-sans text-xs text-secondaryText mt-2 leading-relaxed">
                  We saved <strong className="text-charcoal font-semibold">{email}</strong> and we'll email you the moment early access opens.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
