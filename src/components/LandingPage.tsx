import React, { useState } from "react";
import { Lock, BrainCircuit, BookText, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

interface LandingPageProps {
  onSignIn: () => Promise<void>;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await onSignIn();
    } catch (err: any) {
      console.error("Sign-in failed:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        setErrorMessage("Sign-in was cancelled. Please click the button to try again.");
      } else if (err?.code === "auth/popup-blocked") {
        setErrorMessage("The sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else {
        setErrorMessage(err?.message || "Failed to sign in with Google. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5] flex flex-col justify-between selection:bg-[#C5A059]/30 selection:text-[#C5A059]">
      {/* Top Banner */}
      <header className="h-16 border-b border-[#262626] flex items-center justify-between px-6 sm:px-8 bg-[#0D0D0D]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#C5A059] rotate-45 flex items-center justify-center shrink-0">
            <div className="w-2 h-2 bg-[#C5A059]"></div>
          </div>
          <h1 className="text-base sm:text-lg tracking-[0.3em] uppercase font-light text-[#E5E5E5]">
            Aether <span className="font-bold text-[#C5A059]">Reflect</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[9px] uppercase tracking-widest text-[#448844] flex items-center gap-1.5 font-mono border border-[#448844]/30 px-2.5 py-1 rounded-sm bg-[#448844]/10">
            <span className="w-1.5 h-1.5 bg-[#448844] rounded-full animate-pulse"></span>
            Firestore Isolated
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-sm border border-[#262626] bg-[#111111] px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] text-[#C5A059] mb-8">
          <BrainCircuit className="h-3.5 w-3.5 text-[#C5A059]" />
          <span>Gemini 3.6 Flash · Cloud Firestore Archive</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-normal text-[#E5E5E5] max-w-2xl leading-tight">
          Your private sanctuary for thoughtful reflections &amp; philosophical inquiries
        </h1>

        <p className="mt-6 max-w-xl font-serif italic text-base sm:text-lg text-[#888888] leading-relaxed">
          Record your inner thoughts, synthesize complex mental models, and converse with Gemini for stoic perspectives, structured summaries, and creative pathways.
        </p>

        {/* Error notification if sign-in failed */}
        {errorMessage && (
          <div
            id="auth-error-banner"
            className="mt-6 flex items-start gap-2.5 rounded-sm border border-red-900/60 bg-red-950/30 p-4 text-left text-xs text-red-400 max-w-md w-full"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold uppercase tracking-wider text-[10px] text-red-300">Authentication Alert</p>
              <p className="mt-1 text-red-400/90">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Sign In CTA Button */}
        <div className="mt-10 flex flex-col items-center gap-3 w-full max-w-sm">
          <button
            id="google-signin-btn"
            onClick={handleSignIn}
            disabled={loading}
            className="group relative flex w-full items-center justify-center gap-3 rounded-sm border border-[#C5A059] bg-[#141414] px-6 py-3.5 text-[11px] uppercase tracking-[0.2em] font-bold text-[#E5E5E5] hover:bg-[#C5A059] hover:text-black transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-xl"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C5A059] border-t-transparent" />
                <span className="tracking-widest">Authenticating...</span>
              </div>
            ) : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#C5A059"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#8C6B3F"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#C5A059"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#D4AF37"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Enter Archive with Google</span>
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1 text-[#C5A059] group-hover:text-black" />
              </>
            )}
          </button>
          <p className="text-[10px] uppercase tracking-wider text-[#555555]">
            Federated Google Identity · Zero Stored Passwords
          </p>
        </div>

        {/* Feature Cards / Threat Modeling Transparency */}
        <div className="mt-14 grid w-full grid-cols-1 gap-4 sm:grid-cols-3 text-left">
          <div className="rounded-sm border border-[#222222] bg-[#111111] p-6 shadow-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#1A1A1A] border border-[#2A2A2A] text-[#C5A059] mb-4">
              <Lock className="h-4 w-4" />
            </div>
            <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#E5E5E5]">Strict Isolation</h3>
            <p className="mt-2 text-xs font-serif italic text-[#888888] leading-relaxed">
              Every thought captured here is encrypted per user-instance. Your Firestore collection is locked strictly to your unique UID.
            </p>
          </div>

          <div className="rounded-sm border border-[#222222] bg-[#111111] p-6 shadow-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#1A1A1A] border border-[#2A2A2A] text-[#C5A059] mb-4">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#E5E5E5]">Gemini 3.6 Flash</h3>
            <p className="mt-2 text-xs font-serif italic text-[#888888] leading-relaxed">
              State-of-the-art reflective reasoning with built-in multi-tier fallback ladder across Flash and Flash-Lite models.
            </p>
          </div>

          <div className="rounded-sm border border-[#222222] bg-[#111111] p-6 shadow-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#1A1A1A] border border-[#2A2A2A] text-[#C5A059] mb-4">
              <BookText className="h-4 w-4" />
            </div>
            <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#E5E5E5]">Multi-Turn Dialog</h3>
            <p className="mt-2 text-xs font-serif italic text-[#888888] leading-relaxed">
              Maintain an uninterrupted dialectic with Gemini within any reflection to dissect thoughts deeper or form action steps.
            </p>
          </div>
        </div>

        {/* Security Checklist summary */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[10px] uppercase tracking-widest text-[#555555]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#448844]" />
            <span>Zero Hardcoded Secrets</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#448844]" />
            <span>Input Sanitization &amp; Defense</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#448844]" />
            <span>TLS 1.3 · End-to-End Synced</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#262626] bg-[#0D0D0D] py-4 text-center text-[10px] uppercase tracking-widest text-[#555555]">
        <p>Aether Reflect · Google AI Studio &amp; Cloud Firestore</p>
      </footer>
    </div>
  );
};
