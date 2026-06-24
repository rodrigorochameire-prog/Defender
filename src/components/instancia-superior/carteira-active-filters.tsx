// ─── Filtros ativos da carteira (chips removíveis) ────────────────────────
import { X } from "lucide-react";

export type FilterChipItem = { id: string; label: string; onRemove: () => void };

export function CarteiraActiveFilters({ chips, onClearAll }: { chips: FilterChipItem[]; onClearAll: () => void }) {
  if (!chips.length) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">Filtros</span>
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={c.onRemove}
          title={`Remover filtro: ${c.label}`}
          className="group inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 pl-2 pr-1.5 py-0.5 text-[11px] text-foreground/80 hover:border-red-300 dark:hover:border-red-500/40 transition-colors cursor-pointer"
        >
          <span>{c.label}</span>
          <X className="w-3 h-3 text-muted-foreground/50 group-hover:text-red-500 transition-colors" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline cursor-pointer ml-0.5"
        >
          Limpar tudo
        </button>
      )}
    </div>
  );
}
