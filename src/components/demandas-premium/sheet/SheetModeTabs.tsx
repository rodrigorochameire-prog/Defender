"use client";

import { cn } from "@/lib/utils";

export interface SheetModeTab {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  modes: SheetModeTab[];
  active: string;
  onChange: (key: string) => void;
}

/**
 * Navegação interna do sheet por MODOS (Registros/Dados/Autos/Produção).
 * Segmented control discreto e premium: aba ativa = card branco com ring+shadow,
 * inativas mudas. Substitui a ToC scroll-spy. Puro/controlado → testável.
 */
export function SheetModeTabs({ modes, active, onChange }: Props) {
  if (modes.length === 0) return null;
  return (
    <nav
      role="tablist"
      aria-label="Modos da demanda"
      className="sticky top-0 z-[5] bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-3 py-1.5"
    >
      <div className="flex gap-1">
        {modes.map((m) => {
          const isActive = m.key === active;
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(m.key)}
              className={cn(
                "flex-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors duration-150 cursor-pointer flex items-center justify-center gap-1.5 motion-reduce:transition-none",
                isActive
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm ring-1 ring-neutral-200/70 dark:ring-neutral-700"
                  : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200",
              )}
            >
              {m.label}
              {m.count !== undefined && m.count > 0 && (
                <span
                  className={cn(
                    "text-[9px] tabular-nums",
                    isActive ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-300 dark:text-neutral-600",
                  )}
                >
                  {m.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
