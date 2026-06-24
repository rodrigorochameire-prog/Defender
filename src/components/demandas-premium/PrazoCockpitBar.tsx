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
// Cor = sinal (Fase 2.2): no estado inativo o chip é NEUTRO e a cor vive só no
// ícone + contagem; o preenchimento colorido fica reservado pro filtro ATIVO.
// Deixa a barra calma e premium, sem competir com a lista.
const TONE: Record<PrazoTone, { signal: string; active: string }> = {
  danger: { signal: "text-red-600 dark:text-red-400", active: "text-white bg-red-600 ring-red-600 hover:bg-red-600" },
  warn: { signal: "text-amber-600 dark:text-amber-400", active: "text-white bg-amber-500 ring-amber-500 hover:bg-amber-500" },
  neutral: { signal: "text-blue-600 dark:text-blue-400", active: "text-white bg-blue-600 ring-blue-600 hover:bg-blue-600" },
  muted: { signal: "text-neutral-500 dark:text-neutral-400", active: "text-white bg-neutral-600 ring-neutral-600 hover:bg-neutral-600" },
};
const IDLE_CHIP = "bg-neutral-50 dark:bg-neutral-900 ring-neutral-200/80 dark:ring-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800";
const ZERO_CHIP = "bg-transparent ring-neutral-200/60 dark:ring-neutral-800/60 text-neutral-400 dark:text-neutral-600";

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
          const isZero = chip.count === 0;
          const chipCls = chip.active ? tone.active : isZero ? ZERO_CHIP : IDLE_CHIP;
          // No inativo, a cor vive só no ícone+contagem (o sinal); ativo é branco.
          const signalCls = chip.active ? "" : isZero ? "opacity-50" : tone.signal;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onToggle(chip.key)}
              aria-pressed={chip.active}
              title={`${chip.label}: ${chip.count}${chip.active ? " (filtro ativo — clique para remover)" : ""}`}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 pl-2 pr-2.5 rounded-lg ring-1 ring-inset text-[11px] font-medium transition-colors cursor-pointer motion-reduce:transition-none",
                chipCls,
              )}
            >
              <Icon className={cn("w-3.5 h-3.5 shrink-0", signalCls)} />
              <span>{chip.label}</span>
              <span className={cn("tabular-nums font-semibold", signalCls)}>{chip.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
