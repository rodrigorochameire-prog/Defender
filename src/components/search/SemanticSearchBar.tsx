"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Search, X, Brain } from "lucide-react";
import { SearchResults, type SearchResult } from "./SearchResults";

// ── Debounce hook ──────────────────────────────────────────────

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// ── Props ──────────────────────────────────────────────────────

interface SemanticSearchBarProps {
  /** Filter results to a specific assistido */
  assistidoId?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Called when a result is selected */
  onSelectResult?: (result: SearchResult) => void;
  /** Additional className for the container */
  className?: string;
}

// ── Component ──────────────────────────────────────────────────

export function SemanticSearchBar({
  assistidoId,
  placeholder = "Buscar em depoimentos...",
  onSelectResult,
  className,
}: SemanticSearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounced(query, 300);
  const hasQuery = debouncedQuery.length >= 2;

  // tRPC mutation for search
  const searchMutation = trpc.search.documentSearch.useMutation();

  // Trigger search when debounced query changes
  useEffect(() => {
    if (hasQuery) {
      searchMutation.mutate({
        query: debouncedQuery,
        assistidoId,
        threshold: 0.3,
        limit: 20,
      });
      setOpen(true);
    } else {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, assistidoId]);

  const results = (searchMutation.data?.results ?? []) as SearchResult[];

  const handleClear = useCallback(() => {
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }, []);

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      onSelectResult?.(result);
    },
    [onSelectResult]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    },
    []
  );

  return (
    <Popover open={open && hasQuery} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full max-w-md", className)}>
          {/* Search icon */}
          <Brain className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />

          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => hasQuery && setOpen(true)}
            placeholder={placeholder}
            className={cn(
              "pl-9 pr-8 h-9",
              "bg-background",
              "border-border",
              "placeholder:text-muted-foreground/50",
              "focus:border-emerald-400 dark:focus:border-emerald-700",
              "focus:ring-1 focus:ring-emerald-400/20 dark:focus:ring-emerald-700/20",
              "text-sm transition-colors",
            )}
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5 text-neutral-400" />
            </button>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={4}
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[280px] sm:min-w-[360px] max-w-[480px] p-0",
          "bg-background",
          "border-border",
          "shadow-lg",
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-muted-foreground">
              Busca semantica
            </span>
          </div>
          {results.length > 0 && (
            <span className="text-[10px] text-neutral-400 tabular-nums">
              {results.length} resultado{results.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Results */}
        <SearchResults
          results={results}
          query={debouncedQuery}
          isLoading={searchMutation.isPending}
          onSelectResult={handleSelectResult}
        />
      </PopoverContent>
    </Popover>
  );
}
