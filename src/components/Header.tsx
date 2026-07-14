import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import LazyClipLogo from "./LazyClipLogo";

export default function Header() {
  return (
    <header className="w-full py-4 px-6 md:px-12 flex justify-between items-center max-w-7xl mx-auto">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 hover-trigger" data-cursor-text="Home">
        <LazyClipLogo className="w-12 h-12 text-charcoal" />
        <span className="font-display font-bold text-3xl tracking-tight text-charcoal">
          lazyclip
        </span>
      </Link>

      {/* Right Side - Actions */}
      <div className="flex items-center gap-5 sm:gap-6">
        <a
          href="https://t.me/Lazy_clip_bot"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline text-sm font-semibold text-charcoal hover:text-electricBlue transition-colors hover-trigger"
          data-cursor-text="Telegram"
        >
          Try on Telegram
        </a>
        <Link to="/pricing" className="hidden sm:inline text-sm font-semibold text-charcoal hover:text-electricBlue transition-colors hover-trigger">
          Pricing
        </Link>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="hidden sm:inline text-sm font-semibold text-charcoal hover:text-electricBlue transition-colors hover-trigger">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="group flex items-center gap-1.5 rounded-xl bg-charcoal text-white px-4 py-2 text-sm font-semibold hover:bg-electricBlue transition-colors hover-trigger" data-cursor-text="Join">
              Sign up
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </SignUpButton>
        </SignedOut>

        <SignedIn>
          <Link to="/create" className="group flex items-center gap-1.5 rounded-xl bg-charcoal text-white px-4 py-2 text-sm font-semibold hover:bg-electricBlue transition-colors hover-trigger">
            Dashboard
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </header>
  );
}
