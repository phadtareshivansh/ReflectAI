import React, { useState } from "react";
import Markdown from "react-markdown";
import {
  Sparkles,
  Calendar,
  Lock,
  ShieldCheck,
  TrendingUp,
  Tag,
  Compass,
  ArrowLeft,
  Check,
  RefreshCw,
  Archive,
} from "lucide-react";
import { WeeklyReflectionData, JournalInteraction } from "../types";

interface WeeklyReflectionViewProps {
  past7DaysEntries: JournalInteraction[];
  onGenerateWeeklySummary: () => Promise<void>;
  onSaveWeeklySummary: (data: WeeklyReflectionData) => Promise<void>;
  currentSummary: WeeklyReflectionData | null;
  savedSummaries: WeeklyReflectionData[];
  onSelectSavedSummary: (summary: WeeklyReflectionData) => void;
  onBack: () => void;
  loading: boolean;
  saving: boolean;
}

export const WeeklyReflectionView: React.FC<WeeklyReflectionViewProps> = ({
  past7DaysEntries,
  onGenerateWeeklySummary,
  onSaveWeeklySummary,
  currentSummary,
  savedSummaries,
  onSelectSavedSummary,
  onBack,
  loading,
  saving,
}) => {
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Date window formatting (past 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeLabel = `${sevenDaysAgo.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} – ${now.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const handleSave = async () => {
    if (!currentSummary) return;
    await onSaveWeeklySummary(currentSummary);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-300">
      {/* Navigation & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#262626] pb-5">
        <div className="flex items-center gap-3">
          <button
            id="back-to-journal-btn"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-sm border border-[#262626] bg-[#141414] px-3 py-1.5 text-xs text-[#AAAAAA] hover:text-[#E5E5E5] hover:border-[#444444] transition-all cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Inscription</span>
          </button>
          <div className="h-4 w-[1px] bg-[#262626]" />
          <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-[#C5A059]">
            <Compass className="h-3.5 w-3.5" />
            Memory & Pattern Engine
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#448844] border border-[#448844]/40 bg-[#448844]/10 px-2.5 py-1 rounded-sm">
            <ShieldCheck className="h-3 w-3" />
            <span>Per-Doc Owner Verified</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#C5A059] border border-[#C5A059]/40 bg-[#C5A059]/10 px-2.5 py-1 rounded-sm">
            <Lock className="h-3 w-3" />
            <span>AES-GCM-256</span>
          </span>
        </div>
      </div>

      {/* Overview & Trigger Card */}
      <div className="rounded-sm border border-[#262626] bg-[#141414] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-[#888888]">
              <Calendar className="h-3.5 w-3.5 text-[#C5A059]" />
              <span className="font-mono text-[#CCCCCC]">{dateRangeLabel}</span>
              <span>•</span>
              <span className="text-[#999999]">
                {past7DaysEntries.length} reflection{past7DaysEntries.length === 1 ? "" : "s"} in window (capped at 10)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif text-[#E5E5E5] tracking-tight">
              Weekly Dialectic Synthesis
            </h2>
            <p className="text-xs text-[#888888] leading-relaxed max-w-xl">
              Synthesizes recurring conceptual threads, emotional shifts, and cognitive milestones across your private entries from the last 7 days.
            </p>
          </div>

          <button
            id="generate-weekly-analysis-btn"
            onClick={onGenerateWeeklySummary}
            disabled={loading || past7DaysEntries.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#C5A059] px-5 py-2.5 text-xs font-medium tracking-wider uppercase text-[#0D0D0D] transition-all hover:bg-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer whitespace-nowrap"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Synthesizing Patterns...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generate Weekly Analysis</span>
              </>
            )}
          </button>
        </div>

        {past7DaysEntries.length === 0 && (
          <div className="rounded-sm border border-dashed border-[#333333] bg-[#0F0F0F] p-6 text-center space-y-2">
            <p className="text-xs text-[#AAAAAA]">
              No reflections recorded in the past 7 days.
            </p>
            <p className="text-[11px] text-[#666666]">
              Inscribe your first thought from the composer to begin establishing a continuous dialectic pattern.
            </p>
          </div>
        )}
      </div>

        {/* Analysis Loading Skeleton (Directive 12) */}
        {loading && (
          <div className="rounded-sm border border-[#262626] bg-[#141414] p-6 sm:p-8 space-y-6 animate-pulse">
            <div className="flex items-center justify-between border-b border-[#222222] pb-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-[#C5A059]/30 rounded-xs animate-spin" />
                <div className="h-3 w-48 bg-[#262626] rounded-xs" />
              </div>
              <div className="h-3 w-28 bg-[#222222] rounded-xs" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-28 bg-[#1a1a1a] rounded-sm p-4 space-y-3">
                <div className="h-3 w-32 bg-[#2a2a2a] rounded-xs" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-[#242424] rounded-xs" />
                  <div className="h-6 w-24 bg-[#242424] rounded-xs" />
                </div>
              </div>
              <div className="h-28 bg-[#1a1a1a] rounded-sm p-4 space-y-3">
                <div className="h-3 w-36 bg-[#2a2a2a] rounded-xs" />
                <div className="h-4 w-3/4 bg-[#242424] rounded-xs" />
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="h-3.5 w-full bg-[#1e1e1e] rounded-xs" />
              <div className="h-3.5 w-5/6 bg-[#1e1e1e] rounded-xs" />
              <div className="h-3.5 w-4/6 bg-[#1c1c1c] rounded-xs" />
            </div>
          </div>
        )}

        {/* Current Generated or Selected Summary */}
        {!loading && currentSummary && (
        <div className="space-y-6">
          {/* Key Metrics / Pattern Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recurring Themes */}
            <div className="rounded-sm border border-[#262626] bg-[#141414] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-[#C5A059]">
                <Tag className="h-3.5 w-3.5" />
                <span>Recurring Themes</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {currentSummary.recurringThemes.map((theme, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-sm border border-[#333333] bg-[#1A1A1A] px-2.5 py-1 text-xs text-[#E5E5E5] font-sans"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>

            {/* Emotional Tone & Mood Shift */}
            <div className="rounded-sm border border-[#262626] bg-[#141414] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-[#C5A059]">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Tone & Mood Trajectory</span>
              </div>
              <p className="text-xs text-[#E5E5E5] font-medium leading-snug">
                {currentSummary.toneShift}
              </p>
              {/* Mood breakdown */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-[#888888] font-mono">
                {Object.entries(currentSummary.moodDistribution || {}).map(([mood, count]) => (
                  <span key={mood} className="bg-[#1A1A1A] px-2 py-0.5 rounded-sm border border-[#2A2A2A]">
                    {mood}: <span className="text-[#C5A059] font-bold">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actionable Insight Callout */}
          {currentSummary.actionableInsight && (
            <div className="rounded-sm border border-[#C5A059]/30 bg-[#171510] p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-[#C5A059]">
                <Compass className="h-3.5 w-3.5" />
                <span>Weekly Actionable Compass</span>
              </div>
              <p className="text-sm text-[#E5E5E5] font-serif italic leading-relaxed">
                "{currentSummary.actionableInsight}"
              </p>
            </div>
          )}

          {/* Deep Markdown Synthesis */}
          <div className="rounded-sm border border-[#262626] bg-[#141414] p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#222222] pb-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#888888]">
                <Sparkles className="h-3.5 w-3.5 text-[#C5A059]" />
                <span>Comprehensive Cognitive Analysis</span>
              </div>
              <span className="text-[10px] font-mono text-[#666666]">
                Synthesized by {currentSummary.modelUsed}
              </span>
            </div>

            <div className="markdown-body text-sm text-[#CCCCCC] leading-relaxed space-y-3 font-serif">
              <Markdown>{currentSummary.synthesis}</Markdown>
            </div>

            {/* Save to Encrypted Vault Action */}
            <div className="flex items-center justify-between border-t border-[#222222] pt-5">
              <div className="flex items-center gap-2 text-[11px] text-[#777777]">
                <Lock className="h-3.5 w-3.5 text-[#C5A059]" />
                <span>Encrypted at rest with client AES-GCM before writing to Firestore</span>
              </div>

              <button
                id="save-weekly-summary-btn"
                onClick={handleSave}
                disabled={saving || savedSuccess}
                className="inline-flex items-center gap-2 rounded-sm border border-[#C5A059] bg-[#C5A059]/10 px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0D0D0D] transition-all disabled:opacity-50 cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Inscribed in Vault</span>
                  </>
                ) : saving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Encrypting & Storing...</span>
                  </>
                ) : (
                  <>
                    <Archive className="h-3.5 w-3.5" />
                    <span>Save to Encrypted Vault</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Unanalyzed Empty State (Directive 12: When entries exist but user hasn't run synthesis yet) */}
        {!loading && !currentSummary && past7DaysEntries.length > 0 && (
          <div className="rounded-sm border border-[#222222] bg-[#111111] p-8 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#161616] border border-[#2e2e2e] flex items-center justify-center text-[#C5A059]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-serif font-medium text-[#E5E5E5]">
                Ready for Weekly Pattern Synthesis
              </h3>
              <p className="text-xs font-serif italic text-[#888888] leading-relaxed">
                You have {past7DaysEntries.length} encrypted reflection{past7DaysEntries.length === 1 ? "" : "s"} from the last 7 days.
                Click "Generate Weekly Analysis" above to synthesize cognitive trajectories, emotional shifts, and recurring themes.
              </p>
            </div>
            <button
              onClick={onGenerateWeeklySummary}
              className="inline-flex items-center gap-2 rounded-sm bg-[#C5A059] px-4 py-2 text-xs font-mono uppercase tracking-wider text-black font-semibold hover:bg-[#D4AF37] transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Begin Synthesis</span>
            </button>
          </div>
        )}

      {/* Past Saved Weekly Summaries Archive */}
      {savedSummaries.length > 0 ? (
        <div className="rounded-sm border border-[#262626] bg-[#111111] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#E5E5E5] flex items-center gap-2">
              <Archive className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>Vault Archive: Prior Weekly Syntheses ({savedSummaries.length})</span>
            </h3>
            <span className="text-[10px] font-mono text-[#555555]">
              Decrypted client-side with vault key
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedSummaries.map((summary) => (
              <div
                key={summary.id}
                onClick={() => onSelectSavedSummary(summary)}
                className={`p-4 rounded-sm border transition-all cursor-pointer ${
                  currentSummary?.id === summary.id
                    ? "border-[#C5A059] bg-[#191919]"
                    : "border-[#262626] bg-[#141414] hover:border-[#444444]"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-[#888888] font-mono mb-1">
                  <span>
                    {new Date(summary.startDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    –{" "}
                    {new Date(summary.endDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-[#C5A059]">{summary.entryCount} entries</span>
                </div>
                <p className="text-xs font-medium text-[#E5E5E5] line-clamp-1 mb-2">
                  {summary.toneShift}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {summary.recurringThemes.slice(0, 2).map((t, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-[#1D1D1D] px-2 py-0.5 rounded-sm border border-[#2B2B2B] text-[#AAAAAA]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-sm border border-[#222222] bg-[#0E0E0E] p-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-widest text-[#666666]">
            <Archive className="h-3.5 w-3.5 text-[#555555]" />
            <span>Vault Archive: Prior Weekly Syntheses (0)</span>
          </div>
          <p className="text-[11px] font-serif italic text-[#777777]">
            No historical weekly analyses saved to your vault yet. When you generate and click "Save to Encrypted Vault", your synthesis records will be cataloged here.
          </p>
        </div>
      )}
    </div>
  );
};
