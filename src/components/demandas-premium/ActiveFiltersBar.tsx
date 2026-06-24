"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterChip } from "./active-filters";

interface Props {
  chips: FilterChip[];
  onClear: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

/**
 * Barra de filtros ativos (Fase 2): chips discretos com X por filtro + "Limpar
 * tudo". Torna o estado filtrado da tela compreensível e limpável num lance.
 * Pura/controlada → testável. Não renderiza nada quando não há filtros.
 */
export function ActiveFiltersBar({ chips, onClear, onClearAll, className }: Props) {
  if (chips.length === 0) return null;
  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)} aria-label="Filtros ativos">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onClear(c.key)}
          title={`Remover filtro: ${c.label}`}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer motion-reduce:transition-none"
        >
          <span className="truncate max-w-[160px]">{c.label}</span>
          <X className="w-3 h-3 opacity-60" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] font-medium text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer motion-reduce:transition-none"
        >
          Limpar tudo
        </button>
      )}
    </div>
  );
}
