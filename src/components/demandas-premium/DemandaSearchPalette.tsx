"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, CornerDownLeft, User, Briefcase, FolderOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchEntities, type SearchEntity, type EntityKind } from "@/lib/search/entity-search";

const KIND_META: Record<EntityKind, { label: string; icon: typeof User; tone: string }> = {
  assistido: { label: "Assistido", icon: User, tone: "text-blue-600 dark:text-blue-400" },
  processo: { label: "Processo", icon: Briefcase, tone: "text-amber-600 dark:text-amber-400" },
  caso: { label: "Caso", icon: FolderOpen, tone: "text-emerald-600 dark:text-emerald-400" },
  demanda: { label: "Demanda", icon: FileText, tone: "text-neutral-500 dark:text-neutral-400" },
  audiencia: { label: "Audiência", icon: FileText, tone: "text-purple-600 dark:text-purple-400" },
};

/**
 * Paleta de busca global cross-entity (cmd+K / "/"): busca em demandas, assistidos e
 * casos; ao escolher, navega para a entidade. Ranking em entity-search.ts (testado).
 * Ver docs/specs/busca-cross-entity.md.
 */
export function DemandaSearchPalette({
  open,
  entities,
  onClose,
  onSelect,
}: {
  open: boolean;
  entities: SearchEntity[];
  onClose: () => void;
  onSelect: (entity: SearchEntity) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchEntities(entities, query, 24), [entities, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open || typeof document === "undefined") return null;

  const choose = (i: number) => {
    const hit = results[i];
    if (hit) onSelect(hit.entity);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[min(640px,92vw)] rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 h-12 border-b border-neutral-100 dark:border-neutral-800">
          <Search className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar assistido, processo ou demanda…"
            className="flex-1 bg-transparent text-sm outline-none text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400"
          />
          <kbd className="text-[10px] text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-1">
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-neutral-400">
              Nada encontrado para “{query}”.
            </div>
          )}
          {results.map((hit, i) => {
            const e = hit.entity;
            const meta = KIND_META[e.kind];
            const Icon = meta.icon;
            return (
              <button
                key={`${e.kind}-${e.id}`}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer",
                  i === active ? "bg-emerald-50 dark:bg-emerald-950/30" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", meta.tone)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                    {e.label || "—"}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate">
                    {[meta.label, e.numero, e.sublabel].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {i === active && <CornerDownLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
