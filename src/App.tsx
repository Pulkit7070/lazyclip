import { useEffect } from "react";
import CustomCursor from "./components/CustomCursor";
import PremiumBackground from "./components/PremiumBackground";
import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import LazyClipLogo from "./components/LazyClipLogo";
import Integrations from "./components/Integrations";
import ScrollCollapseSection from "./components/ScrollCollapseSection";
import PromptPlayground from "./components/PromptPlayground";
import MiniFeaturesGrid from "./components/MiniFeaturesGrid";
import FinalCTA from "./components/FinalCTA";
import { ArrowUpRight } from "lucide-react";

function App() {
  // Always start at the top on every page load/refresh
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return (
    <div className="relative min-h-screen selection:bg-electricBlue/15 selection:text-charcoal flex flex-col justify-between overflow-x-hidden">
      
      {/* 1. Ambient Noise Overlay & Custom Pointer */}
      <div className="noise-overlay" />
      <CustomCursor />
      <PremiumBackground />

      {/* 2. Top-level Header Navigation */}
      <Header />

      {/* 3. Main Page Layout Wrapper */}
      <main className="flex-1 w-full flex flex-col">
        
        {/* Hero Area */}
        <HeroSection />

        {/* Channels Integrations List */}
        <Integrations />

        {/* Scroll Collapse Windows Showcases */}
        <ScrollCollapseSection />

        {/* Commands Console Playground */}
        <PromptPlayground />

        {/* Interactive Features Matrix */}
        <MiniFeaturesGrid />

        {/* Bottom waitlist CTA */}
        <FinalCTA />

      </main>

      {/* 4. Editorial Minimalist Footer */}
      <footer className="w-full bg-white border-t border-[#E5E5E2] py-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Copyright details */}
          <div className="flex flex-col gap-1.5 items-center md:items-start text-center md:text-left">
            <div className="flex items-center gap-2">
              <LazyClipLogo className="w-5 h-5 text-charcoal" />
              <span className="font-display font-bold text-sm text-charcoal tracking-tight">
                lazyclip
              </span>
            </div>
            <span className="font-mono text-[10px] text-secondaryText">
              © {new Date().getFullYear()} lazyclip Inc. All rights reserved.
            </span>
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap justify-center gap-8 text-xs font-mono text-secondaryText">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-0.5 hover:text-charcoal transition-colors duration-200 hover-trigger"
              data-cursor-text="Code"
            >
              <span>GitHub</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-0.5 hover:text-charcoal transition-colors duration-200 hover-trigger"
              data-cursor-text="Follow"
            >
              <span>Twitter</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="#docs"
              className="flex items-center gap-0.5 hover:text-charcoal transition-colors duration-200 hover-trigger"
              data-cursor-text="Specs"
            >
              <span>Documentation</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="#privacy"
              className="hover:text-charcoal transition-colors duration-200 hover-trigger"
              data-cursor-text="Terms"
            >
              Privacy Policy
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
