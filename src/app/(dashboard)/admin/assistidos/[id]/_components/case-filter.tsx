"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

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

// ─── Color config ───────────────────────────────────────────────────────────

const COLOR_CONFIG: Record<string, { dot: string; iconBg: string; iconText: string; activeBorder: string }> = {
  emerald: {
    dot: "bg-emerald-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-900/20",
    iconText: "text-emerald-600 dark:text-emerald-400",
    activeBorder: "border-emerald-300 dark:border-emerald-700",
  },
  amber: {
    dot: "bg-amber-500",
    iconBg: "bg-amber-50 dark:bg-amber-900/20",
    iconText: "text-amber-600 dark:text-amber-400",
    activeBorder: "border-amber-300 dark:border-amber-700",
  },
  rose: {
    dot: "bg-rose-500",
    iconBg: "bg-rose-50 dark:bg-rose-900/20",
    iconText: "text-rose-600 dark:text-rose-400",
    activeBorder: "border-rose-300 dark:border-rose-700",
  },
  blue: {
    dot: "bg-blue-500",
    iconBg: "bg-blue-50 dark:bg-blue-900/20",
    iconText: "text-blue-600 dark:text-blue-400",
    activeBorder: "border-blue-300 dark:border-blue-700",
  },
};

const DEFAULT_CONFIG = {
  dot: "bg-zinc-400",
  iconBg: "bg-zinc-100 dark:bg-zinc-800",
  iconText: "text-zinc-500 dark:text-zinc-400",
  activeBorder: "border-zinc-400 dark:border-zinc-500",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function CaseFilter({ cases, selectedCaseId, onSelectCase }: CaseFilterProps) {
  // Auto-select first case when none is selected
  useEffect(() => {
    if (selectedCaseId === null && cases.length > 0) {
      onSelectCase(cases[0].id);
    }
  }, [selectedCaseId, cases, onSelectCase]);

  if (cases.length === 0) return null;

  return (
    <div className="px-6 lg:px-8 py-4 flex gap-3 overflow-x-auto">
      {cases.map((c) => {
        const selected = c.id === selectedCaseId;
        const ref = c.processoReferencia;
        const description = c.foco || ref?.classeProcessual || "Caso";
        const colors = COLOR_CONFIG[c.color] ?? DEFAULT_CONFIG;

        return (
          <button
            key={c.id}
            onClick={() => onSelectCase(c.id)}
            className={cn(
              "flex items-center gap-3.5 px-4 py-3.5 rounded-xl border text-left transition-all duration-150 shrink-0",
              selected
                ? "bg-white dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-600 shadow-sm"
                : "border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/30 dark:bg-zinc-900/30 hover:bg-white dark:hover:bg-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm"
            )}
          >
            {/* Icon with colored background */}
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", colors.iconBg)}>
              <FileText className={cn("w-4 h-4", colors.iconText)} />
            </div>

            {/* Text content */}
            <div className="flex flex-col gap-0.5">
              {/* Type label */}
              {ref?.atribuicao && (
                <span className={cn(
                  "text-[10px] uppercase tracking-wider font-semibold",
                  selected ? colors.iconText : "text-zinc-400 dark:text-zinc-500"
                )}>
                  {ref.atribuicao.replace(/_/g, " ")}
                </span>
              )}

              {/* Description */}
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {description}
              </span>

              {/* Number line */}
              {ref?.numeroAutos && (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                  {ref.numeroAutos}
                  {c.associadosCount > 0 && (
                    <> · {c.associadosCount} associado{c.associadosCount !== 1 ? "s" : ""}</>
                  )}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
