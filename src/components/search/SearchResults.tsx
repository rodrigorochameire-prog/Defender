"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, User, Search } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────

export interface SearchResult {
  id: number;
  file_id: number;
  assistido_id: number | null;
  chunk_index: number;
  chunk_text: string;
  metadata: Record<string, unknown>;
  semantic_similarity: number;
  text_similarity: number;
  combined_score: number;
  fileName?: string | null;
  assistidoNome?: string | null;
}

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading: boolean;
  onSelectResult?: (result: SearchResult) => void;
}

// ── Score Badge ────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const variant =
    score >= 0.7 ? "success" : score >= 0.5 ? "warning" : "default";

  return (
    <Badge variant={variant} className="tabular-nums text-[10px] shrink-0">
      {pct}%
    </Badge>
  );
}

// ── Highlight Match ────────────────────────────────────────────

function highlightText(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;

  // Split query into individual words for multi-word highlighting
  const words = query
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (words.length === 0) return text;

  const regex = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="bg-emerald-200/40 dark:bg-emerald-700/30 text-inherit rounded-sm px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// ── Truncate text ──────────────────────────────────────────────

function truncateChunk(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

// ── Main Component ─────────────────────────────────────────────

export function SearchResults({
  results,
  query,
  isLoading,
  onSelectResult,
}: SearchResultsProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 animate-pulse"
          >
            <div className="h-3 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700 mb-2" />
            <div className="h-2 w-full rounded bg-zinc-100 dark:bg-zinc-800 mb-1" />
            <div className="h-2 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-zinc-500 dark:text-zinc-400">
        <Search className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Nenhum resultado encontrado</p>
        <p className="text-xs mt-1 text-zinc-400 dark:text-zinc-500">
          Tente termos diferentes ou mais gerais
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <div className="space-y-1.5 p-1">
        {results.map((result) => (
          <button
            key={`${result.file_id}-${result.chunk_index}`}
            type="button"
            onClick={() => onSelectResult?.(result)}
            className={cn(
              "w-full text-left rounded-lg border p-3",
              "border-zinc-200 dark:border-zinc-800",
              "bg-white dark:bg-zinc-900/50",
              "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
              "hover:border-emerald-300 dark:hover:border-emerald-800",
              "transition-colors duration-150",
              "cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500",
              "group"
            )}
          >
            {/* Header: file name + score */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {result.fileName || `Arquivo #${result.file_id}`}
                </span>
              </div>
              <ScoreBadge score={result.combined_score} />
            </div>

            {/* Chunk text with highlighting */}
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
              {highlightText(truncateChunk(result.chunk_text, 300), query)}
            </p>

            {/* Footer: assistido info */}
            {result.assistidoNome && (
              <div className="flex items-center gap-1 mt-1.5">
                <User className="h-3 w-3 text-zinc-400" />
                <span className="text-[10px] text-zinc-500 dark:text-zinc-500">
                  {result.assistidoNome}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
