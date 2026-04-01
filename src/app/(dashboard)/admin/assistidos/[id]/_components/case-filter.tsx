"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CaseInfo {
  id: number;
  foco?: string | null;
  processoReferencia?: {
    id: number;
    numeroAutos: string;
    classeProcessual?: string | null;
    atribuicao: string;
  } | null;
  associadosCount: number;
  color: string;
}

interface CaseFilterProps {
  cases: CaseInfo[];
  selectedCaseId: number | null;
  onSelectCase: (caseId: number) => void;
}

// ─── Dot color map ───────────────────────────────────────────────────────────

const DOT_COLORS: Record<string, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  blue: "bg-blue-500",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function CaseFilter({ cases, selectedCaseId, onSelectCase }: CaseFilterProps) {
  // Auto-select first case when none is selected
  useEffect(() => {
    if (selectedCaseId === null && cases.length > 0) {
      onSelectCase(cases[0].id);
    }
  }, [selectedCaseId, cases, onSelectCase]);

  // Render nothing if 0 or 1 case
  if (cases.length === 0) return null;

  return (
    <div className="px-6 lg:px-8 py-5 flex gap-3 overflow-x-auto">
      {cases.map((c) => {
        const selected = c.id === selectedCaseId;
        const ref = c.processoReferencia;
        const description = c.foco || ref?.classeProcessual || "Caso";

        return (
          <button
            key={c.id}
            onClick={() => onSelectCase(c.id)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150 shrink-0",
              selected
                ? "border-zinc-900 dark:border-zinc-400 bg-zinc-50 dark:bg-zinc-800/50"
                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
            )}
          >
            {/* Dot */}
            <div
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                DOT_COLORS[c.color] ?? "bg-zinc-400"
              )}
            />

            {/* Text content */}
            <div className="flex flex-col gap-0.5">
              {/* Type label */}
              {ref?.atribuicao && (
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">
                  {ref.atribuicao.replace(/_/g, " ")}
                </span>
              )}

              {/* Description */}
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                {description}
              </span>

              {/* Number line */}
              {ref?.numeroAutos && (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                  {ref.numeroAutos} · {c.associadosCount} associado{c.associadosCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
