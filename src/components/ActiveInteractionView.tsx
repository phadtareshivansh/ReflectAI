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
} from "lucide-react";

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

  const handleCopy = () => {
    const textToCopy = `# ${interaction.title || "Journal Reflection"}\n\n## Inquiry / Note\n${interaction.content}\n\n## Gemini Synthesis\n${interaction.geminiResponse}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpText.trim() || loading) return;
    const text = followUpText.trim();
    setFollowUpText("");
    try {
      await onSendFollowUp(interaction.id, text);
    } catch (err) {
      console.error("Failed to append follow-up dialogue:", err);
      // Restore text if failed
      setFollowUpText(text);
    }
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
