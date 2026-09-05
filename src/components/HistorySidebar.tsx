import React, { useState } from "react";
import { JournalInteraction, ReflectionMode } from "../types";
import { Search, Calendar, Brain, FileText, Lightbulb, ChevronRight, X, PenTool, Inbox, Download, ShieldCheck } from "lucide-react";

interface HistorySidebarProps {
  interactions: JournalInteraction[];
  selectedId: string | null;
  onSelect: (interaction: JournalInteraction) => void;
  onClose?: () => void;
  loading: boolean;
  onExport?: () => void;
  isExporting?: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  interactions,
  selectedId,
  onSelect,
  onClose,
  loading,
  onExport,
  isExporting = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<ReflectionMode | "all">("all");

  const filtered = interactions.filter((item) => {
    const matchesSearch =
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.content && item.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.geminiResponse && item.geminiResponse.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = selectedFilter === "all" || item.mode === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const getModeIcon = (mode: ReflectionMode) => {
    switch (mode) {
      case "reflect":
        return <Brain className="h-3 w-3 text-[#C5A059]" />;
      case "summarize":
        return <FileText className="h-3 w-3 text-[#77AABB]" />;
      case "brainstorm":
        return <Lightbulb className="h-3 w-3 text-[#DDAA55]" />;
      default:
        return <Brain className="h-3 w-3 text-[#C5A059]" />;
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-[#262626] bg-[#0D0D0D]">
      {/* Header */}
      <div className="border-b border-[#262626] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs uppercase tracking-[0.2em] font-semibold text-[#E5E5E5]">
              Archive Records
            </h3>
            <span className="border border-[#262626] bg-[#141414] px-1.5 py-0.2 text-[9px] font-mono text-[#C5A059] rounded-sm">
              {interactions.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onExport && interactions.length > 0 && (
              <button
                id="btn-export-vault-data"
                onClick={onExport}
                disabled={isExporting}
                title="Export decrypted vault records to local JSON (Gated by Session Freshness check)"
                className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-[#A0A0A0] hover:text-[#C5A059] border border-[#2A2A2A] hover:border-[#C5A059]/50 bg-[#141414] hover:bg-[#1A1A1A] px-2 py-0.5 rounded-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="h-3 w-3 text-[#C5A059]" />
                <span>{isExporting ? "Exporting..." : "Export"}</span>
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1 text-[#666666] hover:text-[#E5E5E5] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search input */}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555555]" />
          <input
            type="text"
            placeholder="Search reflections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-sm border border-[#262626] bg-[#141414] py-1.5 pl-8 pr-3 text-xs text-[#E5E5E5] placeholder:text-[#555555] focus:border-[#C5A059] focus:outline-none transition-all"
          />
        </div>

        {/* Mode filter chips */}
        <div className="mt-2.5 flex items-center gap-1.5">
          {(["all", "reflect", "summarize", "brainstorm"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`rounded-sm px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                selectedFilter === filter
                  ? "bg-[#C5A059] text-black font-bold"
                  : "bg-[#141414] border border-[#262626] text-[#777777] hover:text-[#CCC]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* List of interactions */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1A1A1A]">
        {loading ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-[#888888] font-mono">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#C5A059] border-t-transparent" />
              <span>Decrypting private archive...</span>
            </div>
            {/* Skeleton list items (Directive 12) */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 bg-[#121212] rounded-sm space-y-2.5 animate-pulse border border-[#1e1e1e]">
                <div className="flex items-center justify-between">
                  <div className="h-2.5 w-16 bg-[#262626] rounded-xs" />
                  <div className="h-2.5 w-12 bg-[#222222] rounded-xs" />
                </div>
                <div className="h-3.5 w-3/4 bg-[#262626] rounded-xs" />
                <div className="h-3 w-full bg-[#1c1c1c] rounded-xs" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-full bg-[#141414] border border-[#262626] flex items-center justify-center text-[#666666]">
              {searchQuery ? <Search className="w-4 h-4" /> : <Inbox className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-xs font-serif font-medium text-[#D4D4D4]">
                {searchQuery ? "No matching reflections" : "Archive is currently empty"}
              </p>
              <p className="text-[11px] font-serif italic text-[#777777] mt-1 leading-relaxed">
                {searchQuery
                  ? `No entries match "${searchQuery}". Try refining your keywords or filter.`
                  : "Begin your philosophical practice by writing your first inscription in the sanctuary."}
              </p>
            </div>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[10px] uppercase font-mono tracking-wider text-[#C5A059] hover:underline cursor-pointer pt-1"
              >
                Clear search query
              </button>
            ) : null}
          </div>
        ) : (
          filtered.map((item) => {
            const isSelected = selectedId === item.id;
            const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });

            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`w-full text-left p-4 transition-all duration-150 cursor-pointer block group ${
                  isSelected
                    ? "bg-[#161616] border-l-2 border-[#C5A059]"
                    : "hover:bg-[#121212] border-l-2 border-transparent"
                }`}
              >
                <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-[#555555] font-mono mb-1">
                  <div className="flex items-center gap-1.5">
                    {getModeIcon(item.mode)}
                    <span>{item.mode}</span>
                    {item.mood && (
                      <span className="text-[#777777]">· {item.mood}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" />
                    <span>{dateStr}</span>
                  </div>
                </div>

                <h4 className="text-xs font-serif font-medium text-[#E5E5E5] line-clamp-1 group-hover:text-[#C5A059] transition-colors">
                  {item.title || item.content.slice(0, 45)}
                </h4>

                <p className="mt-1 text-[11px] font-serif italic text-[#777777] line-clamp-2 leading-snug">
                  {item.content}
                </p>

                <div className="mt-2 flex items-center justify-between text-[9px] text-[#555555] font-mono">
                  <span>
                    {item.messages && item.messages.length > 0
                      ? `${item.messages.length + 1} turns`
                      : "1 turn"}
                  </span>
                  <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 text-[#555555] group-hover:text-[#C5A059]" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
