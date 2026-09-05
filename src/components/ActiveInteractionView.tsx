import React, { useState } from "react";
import { JournalInteraction, ChatMessage } from "../types";
import Markdown from "react-markdown";
import {
  Sparkles,
  Send,
  Trash2,
  Calendar,
  Layers,
  ArrowLeft,
  Copy,
  Check,
  Bot,
  User as UserIcon,
  ShieldCheck,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { detectPii } from "../lib/piiDetector";

interface ActiveInteractionViewProps {
  interaction: JournalInteraction;
  onSendFollowUp: (interactionId: string, message: string) => Promise<void>;
  onDelete: (interactionId: string) => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

export const ActiveInteractionView: React.FC<ActiveInteractionViewProps> = ({
  interaction,
  onSendFollowUp,
  onDelete,
  onBack,
  loading,
}) => {
  const [followUpText, setFollowUpText] = useState("");
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Section 13 Pre-Send PII check state
  const [piiWarningDismissed, setPiiWarningDismissed] = useState(false);
  const [showPiiBanner, setShowPiiBanner] = useState(false);

  const piiResult = detectPii(followUpText);

  const handleCopy = () => {
    const textToCopy = `# ${interaction.title || "Journal Reflection"}\n\n## Inquiry / Note\n${interaction.content}\n\n## Gemini Synthesis\n${interaction.geminiResponse}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeSendFollowUp = async () => {
    const text = followUpText.trim();
    setFollowUpText("");
    setShowPiiBanner(false);
    setPiiWarningDismissed(false);
    try {
      await onSendFollowUp(interaction.id, text);
    } catch (err) {
      console.error("Failed to append follow-up dialogue:", err);
      // Restore text if failed
      setFollowUpText(text);
    }
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpText.trim() || loading) return;

    if (piiResult.hasPii && !piiWarningDismissed) {
      setShowPiiBanner(true);
      return;
    }

    await executeSendFollowUp();
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you wish to expunge this reflection from your private archive? This operation is irreversible.")) {
      return;
    }
    try {
      setDeleting(true);
      await onDelete(interaction.id);
    } catch (err) {
      console.error("Failed to delete reflection:", err);
      setDeleting(false);
    }
  };

  const formattedDate = new Date(interaction.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="w-full space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-[#262626] pb-4">
        <button
          id="back-to-composer-btn"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-sm border border-[#262626] bg-[#111111] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] font-medium text-[#888888] hover:text-[#E5E5E5] hover:border-[#333333] transition-all cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            id="copy-reflection-btn"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-sm border border-[#262626] bg-[#111111] px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#888888] hover:text-[#C5A059] hover:border-[#C5A059]/30 transition-all cursor-pointer"
            title="Copy reflection to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Export</span>
              </>
            )}
          </button>

          <button
            id="delete-reflection-btn"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-sm border border-red-950/60 bg-red-950/20 px-3 py-1.5 text-[10px] uppercase tracking-wider text-red-400 hover:bg-red-950/40 hover:border-red-900 transition-all disabled:opacity-40 cursor-pointer"
            title="Expunge this entry"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{deleting ? "Purging..." : "Expunge"}</span>
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="rounded-sm border border-[#222222] bg-[#111111] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-widest text-[#555555] font-mono border-b border-[#222222] pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[#C5A059]" />
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-3">
            {interaction.mood && (
              <span className="border border-[#262626] bg-[#161616] px-2 py-0.5 text-[#888888] rounded-sm">
                Mood: {interaction.mood}
              </span>
            )}
            <span className="border border-[#262626] bg-[#161616] px-2 py-0.5 text-[#C5A059] rounded-sm">
              Mode: {interaction.mode}
            </span>
            <span className="inline-flex items-center gap-1 text-[#C5A059] font-mono">
              <ShieldCheck className="h-3.5 w-3.5" />
              AES-GCM-256
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mt-6">
          <h1 className="text-xl sm:text-2xl font-serif text-[#E5E5E5] leading-snug">
            {interaction.title || "Reflective Inscription"}
          </h1>
          {interaction.encryptionIv && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-[#777777] border border-[#222222] bg-[#161616] px-2 py-1 rounded-sm">
              <span>IV: {interaction.encryptionIv.slice(0, 8)}...</span>
            </span>
          )}
        </div>

        {/* User's Original Prompt / Entry */}
        <div className="mt-6 rounded-sm border border-[#262626] bg-[#141414] p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#888888] font-semibold mb-3">
            <UserIcon className="h-3.5 w-3.5 text-[#C5A059]" />
            <span>Original Inscription</span>
          </div>
          <p className="font-serif italic text-base text-[#D4D4D4] leading-relaxed whitespace-pre-wrap">
            "{interaction.content}"
          </p>
        </div>

        {/* Gemini's Synthesis Response */}
        <div className="mt-8 rounded-sm border border-[#C5A059]/30 bg-[#0E0E0E] p-6 sm:p-8 relative">
          <div className="flex items-center justify-between border-b border-[#262626] pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 border border-[#C5A059] rotate-45 flex items-center justify-center bg-[#C5A059]/10">
                <Sparkles className="h-3 w-3 text-[#C5A059] -rotate-45" />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#E5E5E5]">
                Gemini Synthesis
              </span>
            </div>

            <span className="border border-[#262626] bg-[#141414] px-2 py-0.5 text-[9px] uppercase tracking-widest text-[#C5A059] font-mono rounded-sm">
              Model: {interaction.modelUsed || "gemini-3.6-flash"}
            </span>
          </div>

          <div className="markdown-body">
            <Markdown>{interaction.geminiResponse}</Markdown>
          </div>
        </div>
      </div>

      {/* Multi-turn Chat Conversation History */}
      {interaction.messages && interaction.messages.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#888888] font-semibold pl-2">
            <Layers className="h-3.5 w-3.5 text-[#C5A059]" />
            <span>Continued Dialectic ({interaction.messages.length})</span>
          </div>

          <div className="space-y-4">
            {interaction.messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-sm border p-5 ${
                  msg.role === "assistant"
                    ? "border-[#262626] bg-[#0E0E0E]"
                    : "border-[#2A2A2A] bg-[#141414]"
                }`}
              >
                <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-[#555555] font-mono mb-2">
                  <div className="flex items-center gap-1.5">
                    {msg.role === "assistant" ? (
                      <>
                        <Bot className="h-3 w-3 text-[#C5A059]" />
                        <span className="text-[#C5A059]">Gemini</span>
                      </>
                    ) : (
                      <>
                        <UserIcon className="h-3 w-3 text-[#888888]" />
                        <span className="text-[#888888]">You</span>
                      </>
                    )}
                  </div>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>

                {msg.role === "assistant" ? (
                  <div className="markdown-body text-sm">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                ) : (
                  <p className="font-serif italic text-sm text-[#D4D4D4] leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </p>
                )}
              </div>
            ))}

            {/* Skeleton loader for in-flight assistant response (Directive 12) */}
            {loading && (
              <div className="rounded-sm border border-[#262626] bg-[#0E0E0E] p-5 space-y-3 animate-pulse">
                <div className="flex items-center justify-between text-[9px] uppercase tracking-widest font-mono">
                  <div className="flex items-center gap-1.5 text-[#C5A059]">
                    <Bot className="h-3 w-3 animate-spin" />
                    <span>Gemini is synthesizing continued dialectic...</span>
                  </div>
                  <div className="h-2.5 w-12 bg-[#222222] rounded-xs" />
                </div>
                <div className="space-y-2 pt-1">
                  <div className="h-3 w-3/4 bg-[#1e1e1e] rounded-xs" />
                  <div className="h-3 w-5/6 bg-[#1a1a1a] rounded-xs" />
                  <div className="h-3 w-2/3 bg-[#181818] rounded-xs" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* When no multi-turn messages exist yet but follow-up response is currently loading (Directive 12) */}
      {(!interaction.messages || interaction.messages.length === 0) && loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#888888] font-semibold pl-2">
            <Layers className="h-3.5 w-3.5 text-[#C5A059]" />
            <span>Continued Dialectic</span>
          </div>
          <div className="rounded-sm border border-[#262626] bg-[#0E0E0E] p-5 space-y-3 animate-pulse">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-widest font-mono">
              <div className="flex items-center gap-1.5 text-[#C5A059]">
                <Bot className="h-3 w-3 animate-spin" />
                <span>Gemini is synthesizing continued dialectic...</span>
              </div>
              <div className="h-2.5 w-12 bg-[#222222] rounded-xs" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-3 w-3/4 bg-[#1e1e1e] rounded-xs" />
              <div className="h-3 w-5/6 bg-[#1a1a1a] rounded-xs" />
            </div>
          </div>
        </div>
      )}

      {/* Follow-up input form */}
      <div className="rounded-sm border border-[#222222] bg-[#111111] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <label htmlFor="followup-input" className="text-[10px] uppercase tracking-widest text-[#888888] font-medium">
            Continue Dialectic with Gemini
          </label>
          <span className="text-[9px] font-mono text-[#555555]">
            Multi-turn conversation preserved in Firestore
          </span>
        </div>

        <form onSubmit={handleFollowUpSubmit} className="space-y-4">
          {/* Section 13 Pre-Send PII Advisory Warning Banner */}
          {showPiiBanner && piiResult.hasPii && (
            <div
              id="followup-pii-warning-banner"
              className="rounded-sm border border-amber-500/40 bg-amber-950/20 p-3.5 space-y-2.5"
            >
              <div className="flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-1 text-left flex-1">
                  <p className="text-xs font-serif font-medium text-amber-200">
                    Potential Personal Information Detected
                  </p>
                  <p className="text-[11px] font-serif text-[#C4C4C4] leading-relaxed">
                    Your message appears to contain sensitive contact identifiers (
                    <span className="font-mono text-amber-300 font-medium">
                      {piiResult.types.join(", ")}
                    </span>
                    : {piiResult.matches.map((m) => `"${m}"`).join(", ")}). This will be transmitted to the Gemini model for synthesis.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                <button
                  type="button"
                  id="btn-followup-pii-edit"
                  onClick={() => {
                    setShowPiiBanner(false);
                    const el = document.getElementById("followup-input");
                    if (el) el.focus();
                  }}
                  className="px-2.5 py-1 rounded-xs border border-[#333333] bg-[#1a1a1a] text-[11px] font-mono uppercase tracking-wider text-[#D4D4D4] hover:bg-[#252525] hover:text-white transition-colors cursor-pointer"
                >
                  Edit First
                </button>
                <button
                  type="button"
                  id="btn-followup-pii-send-anyway"
                  onClick={() => {
                    setPiiWarningDismissed(true);
                    executeSendFollowUp();
                  }}
                  className="px-3 py-1 rounded-xs border border-amber-500/60 bg-amber-500/20 text-[11px] font-mono uppercase tracking-wider text-amber-300 hover:bg-amber-500/30 transition-colors font-medium cursor-pointer"
                >
                  Send Anyway
                </button>
              </div>
            </div>
          )}

          <textarea
            id="followup-input"
            rows={3}
            placeholder="Ask a clarifying question, challenge an assumption, or request pragmatic action steps..."
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            disabled={loading}
            className="w-full rounded-sm border border-[#262626] bg-[#141414] p-4 text-sm font-serif italic text-[#D1D1D1] placeholder:text-[#444444] placeholder:italic focus:border-[#C5A059] focus:outline-none transition-all resize-y"
          />

          <div className="flex items-center justify-end gap-3">
            {loading && (
              <span className="text-[10px] uppercase tracking-wider font-mono text-[#888888] flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#C5A059]" />
                <span>Processing...</span>
              </span>
            )}
            <button
              id="send-followup-btn"
              type="submit"
              disabled={loading || !followUpText.trim()}
              className="inline-flex items-center gap-2 rounded-sm border border-[#C5A059] bg-[#C5A059] hover:bg-transparent text-black hover:text-[#C5A059] px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-bold transition-all disabled:opacity-40 cursor-pointer shadow-md"
            >
              <span>Transmit Response</span>
              <Send className="h-3 w-3" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
