import React, { useState } from "react";
import { ReflectionMode } from "../types";
import { Sparkles, Send, Lightbulb, FileText, Brain, RefreshCw, AlertTriangle } from "lucide-react";

interface ReflectionComposerProps {
  onSubmit: (title: string, prompt: string, mode: ReflectionMode, mood?: string) => Promise<void>;
  loading: boolean;
  statusMessage?: string;
}

const PROMPT_SUGGESTIONS = [
  "\"The Stoic response to unexpected volatility in my day...\"",
  "\"A complex architecture dilemma I must simplify without losing utility...\"",
  "\"Synthesis of recent readings and core principles to internalize...\"",
  "\"On the intrinsic value of uninterrupted deep work vs reactive noise...\"",
  "\"Three invariants I want to ground my decisions on this week...\"",
];

const MOODS = [
  { label: "Calm", emoji: "🌿" },
  { label: "Focused", emoji: "🎯" },
  { label: "Pensive", emoji: "💭" },
  { label: "Energized", emoji: "⚡" },
  { label: "Stoic", emoji: "🏛️" },
];

export const ReflectionComposer: React.FC<ReflectionComposerProps> = ({
  onSubmit,
  loading,
  statusMessage,
}) => {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<ReflectionMode>("reflect");
  const [selectedMood, setSelectedMood] = useState<string>("Focused");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLocalError(null);
    try {
      await onSubmit(title.trim(), prompt.trim(), mode, selectedMood);
      setTitle("");
      setPrompt("");
    } catch (err: any) {
      console.error("Composer submission error:", err);
      setLocalError(err?.message || "Failed to complete and save reflection. Your draft is preserved below.");
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    const cleaned = suggestion.replace(/^"|"$/g, "");
    if (!prompt) {
      setPrompt(cleaned);
    } else {
      setPrompt((prev) => `${prev}\n\n${cleaned}`);
    }
  };

  return (
    <div className="w-full rounded-sm border border-[#222222] bg-[#111111] p-6 sm:p-8 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xs sm:text-sm uppercase tracking-[0.25em] font-semibold text-[#E5E5E5]">
              Initiate Reflection
            </h2>
            <span className="border border-[#262626] bg-[#161616] px-2 py-0.5 text-[9px] uppercase tracking-widest text-[#C5A059] font-mono rounded-sm">
              Gemini 3.6 Flash
            </span>
          </div>
          <p className="text-xs font-serif italic text-[#888888] mt-1">
            Pen your inquiry, dilemma, or observations for contemplative analysis and synthesis.
          </p>
        </div>

        {/* Reflection Mode Toggle */}
        <div className="flex items-center rounded-sm bg-[#161616] border border-[#262626] p-1 self-start sm:self-auto">
          <button
            type="button"
            id="mode-reflect-btn"
            onClick={() => setMode("reflect")}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              mode === "reflect"
                ? "bg-[#222222] text-[#C5A059] border border-[#C5A059]/40 shadow-xs"
                : "text-[#888888] hover:text-[#CCC]"
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            <span>Reflect</span>
          </button>
          <button
            type="button"
            id="mode-summarize-btn"
            onClick={() => setMode("summarize")}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              mode === "summarize"
                ? "bg-[#222222] text-[#C5A059] border border-[#C5A059]/40 shadow-xs"
                : "text-[#888888] hover:text-[#CCC]"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Synthesize</span>
          </button>
          <button
            type="button"
            id="mode-brainstorm-btn"
            onClick={() => setMode("brainstorm")}
            className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              mode === "brainstorm"
                ? "bg-[#222222] text-[#C5A059] border border-[#C5A059]/40 shadow-xs"
                : "text-[#888888] hover:text-[#CCC]"
            }`}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            <span>Brainstorm</span>
          </button>
        </div>
      </div>

      {localError && (
        <div
          id="composer-error-alert"
          className="mt-5 flex items-start gap-2.5 rounded-sm border border-red-900/60 bg-red-950/20 p-4 text-xs text-red-400"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold uppercase tracking-wider text-[10px] text-red-300">Transaction Failed</p>
            <p className="mt-1">{localError}</p>
            <p className="mt-1.5 text-[11px] text-red-400/80 italic font-serif">
              Your written draft has been preserved in the input box below. You may retry committing anytime.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Optional Title Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="reflection-title-input" className="text-[10px] uppercase tracking-widest text-[#888888] font-medium">
              Entry Inscription <span className="text-[#555555]">(Optional)</span>
            </label>
          </div>
          <input
            id="reflection-title-input"
            type="text"
            placeholder="e.g., The Stoic response to volatility"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            maxLength={120}
            className="w-full rounded-sm border border-[#262626] bg-[#141414] px-4 py-3 text-sm font-serif text-[#E5E5E5] placeholder:text-[#555555] placeholder:italic focus:border-[#C5A059] focus:outline-none transition-all"
          />
        </div>

        {/* Reflection Body Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="reflection-body-input" className="text-[10px] uppercase tracking-widest text-[#888888] font-medium">
              Journal Content / Inquiry <span className="text-[#C5A059]">*</span>
            </label>
            <span className="text-[10px] font-mono text-[#555555]">
              {prompt.length} chars
            </span>
          </div>
          <textarea
            id="reflection-body-input"
            rows={6}
            required
            placeholder={
              mode === "summarize"
                ? "Inscribe notes, transcripts, or thoughts to extract core invariants and distilled executive takeaways..."
                : mode === "brainstorm"
                ? "Describe a bottleneck, concept, or target outcome to generate innovative pathways and pragmatic next steps..."
                : "\"I feel as though the complexity of my current architecture is outpacing my ability to reason about its side effects. How should I approach radical simplification without loss of utility?\""
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            className="w-full rounded-sm border border-[#262626] bg-[#141414] p-4 text-base font-serif italic text-[#D1D1D1] placeholder:text-[#444444] placeholder:italic focus:border-[#C5A059] focus:outline-none transition-all leading-relaxed resize-y"
          />
        </div>

        {/* Guided Starters */}
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-[0.2em] text-[#555555]">Philosophical Starters &amp; Prompts</p>
          <div className="flex flex-wrap gap-2">
            {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplySuggestion(suggestion)}
                disabled={loading}
                className="rounded-sm border border-[#262626] bg-[#161616] px-3 py-1 text-[11px] font-serif italic text-[#888888] hover:text-[#C5A059] hover:border-[#C5A059]/40 hover:bg-[#1A1A1A] transition-all cursor-pointer text-left"
              >
                + {suggestion.length > 44 ? `${suggestion.slice(0, 44)}...` : suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Mood Chips & Submission Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#262626]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-[#555555] mr-1">Disposition:</span>
            {MOODS.map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => setSelectedMood(m.label)}
                disabled={loading}
                className={`inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-xs transition-all cursor-pointer ${
                  selectedMood === m.label
                    ? "bg-[#C5A059] text-black font-semibold shadow-xs"
                    : "bg-[#161616] border border-[#262626] text-[#888888] hover:text-[#CCC]"
                }`}
              >
                <span>{m.emoji}</span>
                <span className="text-[10px] uppercase tracking-wider">{m.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {loading && statusMessage && (
              <span className="text-[10px] uppercase tracking-wider font-mono text-[#888888] flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#C5A059]" />
                <span>{statusMessage}</span>
              </span>
            )}
            <button
              id="submit-reflection-btn"
              type="submit"
              disabled={loading || !prompt.trim()}
              className="inline-flex items-center gap-2 rounded-sm border border-[#C5A059] bg-[#C5A059] hover:bg-transparent text-black hover:text-[#C5A059] px-6 py-3 text-[10px] uppercase tracking-[0.2em] font-bold shadow-lg transition-all duration-200 disabled:opacity-40 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Reflect with Gemini</span>
                  <Send className="h-3.5 w-3.5 ml-1 opacity-70" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
