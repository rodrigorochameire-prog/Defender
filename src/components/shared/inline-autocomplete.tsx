"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, User, Briefcase } from "lucide-react";

interface AutocompleteOption {
  id: number;
  label: string;
  sublabel?: string;
}

interface InlineAutocompleteProps {
  value: string;
  valueId?: number | null;
  onSelect: (id: number, label: string) => void;
  onTextChange?: (text: string) => void;
  placeholder?: string;
  searchFn: (query: string) => AutocompleteOption[];
  onQueryChange?: (query: string) => void;
  isLoading?: boolean;
  icon?: "user" | "briefcase";
  className?: string;
  activateOnDoubleClick?: boolean;
}

export function InlineAutocomplete({
  value,
  valueId,
  onSelect,
  onTextChange,
  placeholder = "Buscar...",
  searchFn,
  onQueryChange,
  isLoading = false,
  icon = "user",
  className,
  activateOnDoubleClick = false,
}: InlineAutocompleteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // searchFn must be pure (no setState) — it just maps existing results
  const results = searchFn(query);
  const IconComp = icon === "user" ? User : Briefcase;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        setShowResults(false);
        setQuery("");
      }
    };
    if (isEditing) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  const startEditing = useCallback(() => {
    setQuery(value);
    setIsEditing(true);
    setShowResults(true);
  }, [value]);

  const handleSelect = useCallback((option: AutocompleteOption) => {
    onSelect(option.id, option.label);
    setIsEditing(false);
    setShowResults(false);
    setQuery("");
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsEditing(false);
      setShowResults(false);
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex] || results[0]);
      return;
    }
  }, [results, selectedIndex, handleSelect]);

  if (isEditing) {
    return (
      <div ref={containerRef} className="relative">
        <div className="flex items-center gap-1">
          <Search className="w-3 h-3 text-zinc-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              const q = e.target.value;
              setQuery(q);
              setShowResults(q.length >= 2);
              setSelectedIndex(0);
              onQueryChange?.(q);
            }}
            onKeyDown={handleKeyDown}
            className="w-full text-[11px] px-1.5 py-0.5 rounded border border-emerald-400 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
            placeholder={placeholder}
          />
          <button
            onClick={() => { setIsEditing(false); setShowResults(false); setQuery(""); }}
            className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <X className="w-3 h-3 text-zinc-400" />
          </button>
        </div>

        {showResults && query.length >= 2 && (
          <div className="absolute left-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-[60] min-w-[220px] max-h-48 overflow-y-auto py-1">
            {isLoading ? (
              <div className="px-3 py-2 text-[11px] text-zinc-400">Buscando...</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-zinc-400">Nenhum resultado</div>
            ) : (
              results.map((r, idx) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r)}
                  className={`w-full px-3 py-1.5 text-left text-[11px] flex items-center gap-2 text-zinc-700 dark:text-zinc-300 transition-colors ${
                    idx === selectedIndex
                      ? "bg-emerald-50 dark:bg-emerald-950/30"
                      : "hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  }`}
                >
                  <IconComp className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium truncate block">{r.label}</span>
                    {r.sublabel && (
                      <span className="text-[10px] text-zinc-400 truncate block">{r.sublabel}</span>
                    )}
                  </div>
                  {valueId === r.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
            {onTextChange && query.length >= 2 && (
              <div className="border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1">
                <button
                  onClick={() => {
                    onTextChange(query);
                    setIsEditing(false);
                    setShowResults(false);
                    setQuery("");
                  }}
                  className="w-full px-3 py-1.5 text-left text-[10px] text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Manter como texto: &quot;{query}&quot;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={activateOnDoubleClick ? undefined : startEditing}
      onDoubleClick={activateOnDoubleClick ? startEditing : undefined}
      className={className || "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors truncate flex items-center gap-1"}
    >
      {value ? (
        <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">{value}</span>
      ) : (
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">{placeholder}</span>
      )}
    </div>
  );
}
