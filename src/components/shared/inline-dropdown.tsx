"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

interface InlineDropdownOption {
  value: string;
  label: string;
  color?: string;
  group?: string;
}

interface InlineDropdownProps {
  value: string;
  displayValue: React.ReactNode;
  options: InlineDropdownOption[];
  onChange: (value: string) => void;
  compact?: boolean;
  activateOnDoubleClick?: boolean;
  /** Show a persistent edit icon (ChevronDown) that opens dropdown on single click */
  showEditIcon?: boolean;
}

export function InlineDropdown({
  value,
  displayValue,
  options,
  onChange,
  compact = false,
  activateOnDoubleClick = false,
  showEditIcon = false,
}: InlineDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside: listen to both mousedown and touchstart for mobile
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside, { passive: true });
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Reset filter + highlight when closing
  useEffect(() => {
    if (!isOpen) {
      setFilterQuery("");
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  const groupedOptions = useMemo(() => options.reduce((acc, opt) => {
    const group = opt.group || "default";
    if (!acc[group]) acc[group] = [];
    acc[group].push(opt);
    return acc;
  }, {} as Record<string, InlineDropdownOption[]>), [options]);

  // Filtered options (flat list for keyboard navigation)
  const filteredFlat = useMemo(() => {
    if (!filterQuery) return options;
    const q = filterQuery.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, filterQuery]);

  // Filtered grouped options for rendering
  const filteredGrouped = useMemo(() => {
    if (!filterQuery) return groupedOptions;
    const q = filterQuery.toLowerCase();
    const result: Record<string, InlineDropdownOption[]> = {};
    for (const [group, opts] of Object.entries(groupedOptions)) {
      const filtered = opts.filter(o => o.label.toLowerCase().includes(q));
      if (filtered.length > 0) result[group] = filtered;
    }
    return result;
  }, [groupedOptions, filterQuery]);

  // Type-ahead keyboard handler when dropdown is open
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, filteredFlat.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0 && highlightedIndex < filteredFlat.length) {
        e.preventDefault();
        onChange(filteredFlat[highlightedIndex].value);
        setIsOpen(false);
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setFilterQuery(prev => prev.slice(0, -1));
        setHighlightedIndex(-1);
        return;
      }
      // Only capture single printable characters (not modifier combos)
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setFilterQuery(prev => prev + e.key);
        setHighlightedIndex(0);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, highlightedIndex, filteredFlat, onChange]);

  const handleActivate = () => setIsOpen(!isOpen);

  // Track flat index for highlighting
  let flatIdx = -1;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={activateOnDoubleClick && !showEditIcon ? undefined : handleActivate}
        onDoubleClick={activateOnDoubleClick && !showEditIcon ? handleActivate : undefined}
        className={`flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors group/btn ${
          compact ? "px-1 py-0.5 -mx-1" : "px-1.5 py-0.5 -mx-1.5"
        }`}
      >
        {displayValue}
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-opacity ${
          showEditIcon ? "opacity-40 hover:opacity-100" : "opacity-0 group-hover/btn:opacity-100"
        }`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 min-w-[180px] max-w-[calc(100vw-2rem)] max-h-64 overflow-y-auto py-1">
          {/* Type-ahead indicator */}
          {filterQuery && (
            <div className="px-3 py-1.5 text-[10px] text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5 sticky top-0 bg-white dark:bg-zinc-900">
              <Search className="w-3 h-3" />
              <span className="font-medium text-zinc-600 dark:text-zinc-300">{filterQuery}</span>
            </div>
          )}

          {Object.keys(filteredGrouped).length === 0 && filterQuery && (
            <div className="px-3 py-2 text-[11px] text-zinc-400 italic">Nenhum resultado</div>
          )}

          {Object.entries(filteredGrouped).map(([group, opts], gi) => (
            <div key={group}>
              {gi > 0 && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}
              {opts.map((opt) => {
                flatIdx++;
                const currentFlatIdx = flatIdx;
                const isHighlighted = currentFlatIdx === highlightedIndex;
                return (
                  <button
                    key={opt.value}
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 transition-colors ${
                      isHighlighted
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                        : opt.value === value
                          ? "bg-zinc-50 dark:bg-zinc-800/50 text-emerald-700 dark:text-emerald-300"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {opt.color && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                    )}
                    <span className="flex-1">{opt.label}</span>
                    {opt.value === value && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
