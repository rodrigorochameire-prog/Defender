"use client";

import { cn } from "@/lib/utils";
import { AREA_LABELS, type AreaMae } from "./areas-mae";

interface Props {
  /** Áreas com conteúdo (modos vazios não entram). */
  areas: AreaMae[];
  active: AreaMae;
  onChange: (area: AreaMae) => void;
  /** Nº de seções por área — mostrado como contador discreto. */
  counts?: Partial<Record<AreaMae, number>>;
}

/**
 * Navegação por modos de trabalho do workspace do evento (spec §D).
 * Tira o event-detail-sheet do scroll monolítico: cada aba é uma área-mãe
 * (Resumo/Estratégia/Prova oral/Documentos/Execução). Sóbrio, com underline
 * emerald no ativo (cor = exceção/foco). Rola na horizontal no mobile.
 */
export function AreaTabs({ areas, active, onChange, counts }: Props) {
  if (areas.length <= 1) return null;
  return (
    <div
      role="tablist"
      aria-label="Modos de trabalho"
      className="flex items-stretch gap-1 overflow-x-auto no-scrollbar border-b border-neutral-200 dark:border-neutral-800 px-2"
    >
      {areas.map((area) => {
        const isActive = area === active;
        const count = counts?.[area];
        return (
          <button
            key={area}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(area)}
            className={cn(
              "relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[12px] font-medium transition-colors duration-150 cursor-pointer outline-none",
              "border-b-2 -mb-px focus-visible:ring-2 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-700 rounded-t-sm motion-reduce:transition-none",
              isActive
                ? "border-emerald-500 text-neutral-900 dark:text-neutral-100"
                : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
            )}
          >
            {AREA_LABELS[area]}
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  "text-[9px] tabular-nums rounded-full px-1.5 py-px",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
