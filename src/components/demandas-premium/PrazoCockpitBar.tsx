"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, CalendarClock, CalendarRange, CircleDashed } from "lucide-react";
import { buildPrazoCockpit, type PrazoKey, type PrazoTone } from "./prazo-cockpit";

const ICON: Record<PrazoKey, typeof AlertTriangle> = {
  atrasados: AlertTriangle,
  hoje: CalendarClock,
  semana: CalendarRange,
  sem_prazo: CircleDashed,
};

// Tom inativo (com contagem > 0) e tom ativo (filtro ligado).
const TONE: Record<PrazoTone, { idle: string; active: string; zero: string }> = {
  danger: {
    idle: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 ring-red-200 dark:ring-red-900/50 hover:bg-red-100",
    active: "text-white bg-red-600 ring-red-600 hover:bg-red-600",
    zero: "text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-900 ring-neutral-200 dark:ring-neutral-800",
  },
  warn: {
    idle: "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 ring-amber-200 dark:ring-amber-900/50 hover:bg-amber-100",
    active: "text-white bg-amber-500 ring-amber-500 hover:bg-amber-500",
    zero: "text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-900 ring-neutral-200 dark:ring-neutral-800",
  },
  neutral: {
    idle: "text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 ring-blue-200 dark:ring-blue-900/50 hover:bg-blue-100",
    active: "text-white bg-blue-600 ring-blue-600 hover:bg-blue-600",
    zero: "text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-900 ring-neutral-200 dark:ring-neutral-800",
  },
  muted: {
    idle: "text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800/60 ring-neutral-200 dark:ring-neutral-700 hover:bg-neutral-200",
    active: "text-white bg-neutral-600 ring-neutral-600 hover:bg-neutral-600",
    zero: "text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-900 ring-neutral-200 dark:ring-neutral-800",
  },
};

/**
 * Cockpit de prazos: chips fixos e clicáveis (Atrasados/Hoje/Semana/Sem prazo) com
 * contagem sempre à vista. Clicar alterna o filtro de prazo (mesmo `togglePill`).
 * Lógica em prazo-cockpit.ts (testada). Ver docs/specs/cockpit-prazos.md.
 */
export function PrazoCockpitBar({
  counts,
  activeFilters,
  onToggle,
}: {
  counts: Partial<Record<string, number>>;
  activeFilters: Set<string> | string[];
  onToggle: (key: PrazoKey) => void;
}) {
  const { chips, totalEmRisco, hasUrgencia } = buildPrazoCockpit(counts, activeFilters);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={cn(
          "text-[11px] font-semibold tracking-wide uppercase",
          hasUrgencia ? "text-red-600 dark:text-red-400" : "text-neutral-400",
        )}
        title="Prazos que exigem ação imediata (atrasados + vencem hoje)"
      >
        {hasUrgencia ? `${totalEmRisco} exige${totalEmRisco === 1 ? "" : "m"} ação` : "Prazos em dia"}
      </span>
      <div className="flex items-center gap-1.5">
        {chips.map((chip) => {
          const Icon = ICON[chip.key];
          const tone = TONE[chip.tone];
          const cls = chip.active ? tone.active : chip.count > 0 ? tone.idle : tone.zero;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onToggle(chip.key)}
              aria-pressed={chip.active}
              title={`${chip.label}: ${chip.count}${chip.active ? " (filtro ativo — clique para remover)" : ""}`}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 pl-2 pr-2.5 rounded-lg ring-1 ring-inset text-[11px] font-medium transition-colors cursor-pointer",
                cls,
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{chip.label}</span>
              <span className="tabular-nums font-semibold">{chip.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
