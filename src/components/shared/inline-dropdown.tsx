"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Check, Search } from "lucide-react";

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
  /**
   * Layout das opções:
   * - "list" (default): coluna única, grupos empilhados.
   * - "grid": cada grupo vira uma coluna paralela.
   * - "accordion": mostra só os headers de grupo; clicar expande as opções
   *   inline. Bom pra dropdowns com muitas categorias em containers estreitos.
   */
  layout?: "list" | "grid" | "accordion";
}

export function InlineDropdown({
  value,
  displayValue,
  options,
  onChange,
  compact = false,
  activateOnDoubleClick = false,
  showEditIcon = false,
  layout = "list",
}: InlineDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [alignRight, setAlignRight] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Calcula a posição absoluta do painel a partir do bounding rect do trigger.
  // Usa useLayoutEffect pra medir DOM sincronamente após layout, evitando flicker.
  // Se o painel for escapar pela borda direita do viewport, alinha à direita.
  useLayoutEffect(() => {
    if (!isOpen || !ref.current) {
      setPosition(null);
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const DROPDOWN_MIN_WIDTH = 200;
    const VIEWPORT_PADDING = 16;
    const wouldOverflow = rect.left + DROPDOWN_MIN_WIDTH > window.innerWidth - VIEWPORT_PADDING;
    setAlignRight(wouldOverflow);
    setPosition({
      top: rect.bottom + 4,
      left: wouldOverflow ? rect.right - DROPDOWN_MIN_WIDTH : rect.left,
      width: Math.max(rect.width, DROPDOWN_MIN_WIDTH),
    });
  }, [isOpen]);

  // Click-outside: listen to both mousedown and touchstart for mobile.
  // Como o painel está em portal (document.body), também checa o portal element.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      const portalEl = document.querySelector("[data-inline-dropdown-portal='true']");
      if (portalEl?.contains(target)) return;
      setIsOpen(false);
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

  // Em modo accordion: ao abrir, expande só o grupo do valor selecionado
  // (ou nenhum se não houver). Ao filtrar, expande todos os grupos com match.
  useEffect(() => {
    if (!isOpen || layout !== "accordion") return;
    if (filterQuery) return;
    const selected = options.find((o) => o.value === value);
    setExpandedGroups(selected?.group ? new Set([selected.group]) : new Set());
  }, [isOpen, layout, value, options, filterQuery]);

  const groupedOptions = useMemo(() => options.reduce((acc, opt) => {
    const group = opt.group || "default";
    if (!acc[group]) acc[group] = [];
    acc[group].push(opt);
    return acc;
  }, {} as Record<string, InlineDropdownOption[]>), [options]);

  // Filtered options (flat list for keyboard navigation). Em accordion sem
  // filtro, considera só itens dos grupos expandidos pra alinhar com o que
  // está visível.
  const filteredFlat = useMemo(() => {
    const q = filterQuery.toLowerCase();
    const matchesQuery = (o: InlineDropdownOption) =>
      !q || o.label.toLowerCase().includes(q);
    if (layout === "accordion" && !q) {
      return options.filter((o) => o.group && expandedGroups.has(o.group));
    }
    return options.filter(matchesQuery);
  }, [options, filterQuery, layout, expandedGroups]);

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
        data-edit-trigger
        onClick={activateOnDoubleClick && !showEditIcon ? undefined : handleActivate}
        onDoubleClick={activateOnDoubleClick && !showEditIcon ? handleActivate : undefined}
        className={`flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors group/btn ${
          compact ? "px-1 py-0.5 -mx-1" : "px-1.5 py-0.5 -mx-1.5"
        }`}
      >
        {displayValue}
        <ChevronDown className={`w-3 h-3 text-neutral-400 transition-opacity ${
          showEditIcon ? "opacity-40 hover:opacity-100" : "opacity-0 group-hover/btn:opacity-100"
        }`} />
      </button>

      {isOpen && position && (() => {
        const isGrid = layout === "grid";
        const isAccordion = layout === "accordion";
        const groupCount = Object.keys(filteredGrouped).length;
        const gridMinWidth = isGrid ? Math.max(180, Math.min(groupCount, 4) * 180) : 200;
        const isGroupExpanded = (group: string) =>
          isAccordion && filterQuery ? true : expandedGroups.has(group);
        const toggleGroup = (group: string) => {
          setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(group)) next.delete(group);
            else next.add(group);
            return next;
          });
        };
        // alignRight é mantido via setAlignRight no useLayoutEffect — usado pra ajustar
        // o left no `position`. Marca como referenciado pra evitar warning de unused.
        void alignRight;
        return createPortal(
        <div
          data-inline-dropdown-portal="true"
          className="fixed z-[10000] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl max-w-[calc(100vw-2rem)] max-h-72 overflow-y-auto py-1"
          style={{
            top: position.top,
            left: position.left,
            minWidth: Math.max(position.width, gridMinWidth),
          }}
        >
          {/* Type-ahead indicator */}
          {filterQuery && (
            <div className="px-3 py-1.5 text-[10px] text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5 sticky top-0 bg-white dark:bg-neutral-900 z-10">
              <Search className="w-3 h-3" />
              <span className="font-medium text-neutral-600 dark:text-neutral-300">{filterQuery}</span>
            </div>
          )}

          {Object.keys(filteredGrouped).length === 0 && filterQuery && (
            <div className="px-3 py-2 text-[11px] text-neutral-400 italic">Nenhum resultado</div>
          )}

          <div
            className={isGrid ? "grid gap-x-1 px-1" : ""}
            style={isGrid ? { gridTemplateColumns: `repeat(${Math.min(groupCount, 4)}, minmax(0, 1fr))` } : undefined}
          >
            {Object.entries(filteredGrouped).map(([group, opts], gi) => {
              const expanded = isGroupExpanded(group);
              const showOpts = isAccordion ? expanded : true;
              const hasSelectedInGroup = opts.some((o) => o.value === value);
              return (
              <div
                key={group}
                className={isGrid ? "border-r border-neutral-100 dark:border-neutral-800 last:border-r-0 pr-1" : ""}
              >
                {!isGrid && !isAccordion && gi > 0 && <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />}
                {isAccordion && group !== "default" ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className={`w-full px-2.5 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors rounded-sm ${
                      expanded
                        ? "text-neutral-700 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-800/40"
                        : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                    }`}
                  >
                    <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
                    <span className="flex-1 text-left">{group}</span>
                    {hasSelectedInGroup && !expanded && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                    <span className="text-[9px] font-normal text-neutral-400">{opts.length}</span>
                  </button>
                ) : (
                  group !== "default" && (
                    <div className="px-3 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 sticky top-0 bg-white dark:bg-neutral-900">
                      {group}
                    </div>
                  )
                )}
                {showOpts && opts.map((opt) => {
                  flatIdx += 1;
                  const currentFlatIdx = flatIdx;
                  const isHighlighted = currentFlatIdx === highlightedIndex;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { onChange(opt.value); setIsOpen(false); }}
                      className={`w-full ${isGrid ? "px-2 py-1 text-[11px]" : isAccordion ? "px-3 pl-7 py-1.5 text-[12px]" : "px-3 py-1.5 text-[12px]"} text-left flex items-center gap-2 transition-colors rounded-sm ${
                        isHighlighted
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                          : opt.value === value
                            ? "bg-neutral-50 dark:bg-neutral-800/50 text-emerald-700 dark:text-emerald-300"
                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                      }`}
                    >
                      {opt.color && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                      )}
                      <span className="flex-1 truncate" title={opt.label}>{opt.label}</span>
                      {opt.value === value && <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              );
            })}
          </div>
        </div>,
        document.body,
        );
      })()}
    </div>
  );
}
