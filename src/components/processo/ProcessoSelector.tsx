"use client";

import { cn } from "@/lib/utils";

interface ProcessoBasicData {
  id: number;
  numeroAutos: string | null;
  tipoProcesso: string | null;
  isReferencia: boolean | null;
}

interface ProcessoSelectorProps {
  processos: ProcessoBasicData[];
  selectedId: number;
  onSelect: (id: number) => void;
}

export function ProcessoSelector({ processos, selectedId, onSelect }: ProcessoSelectorProps) {
  if (processos.length <= 1) return null;

  const sorted = [...processos].sort((a, b) => {
    if (a.isReferencia && !b.isReferencia) return -1;
    if (!a.isReferencia && b.isReferencia) return 1;
    return (a.tipoProcesso ?? "").localeCompare(b.tipoProcesso ?? "");
  });

  return (
    <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 flex-wrap">
      {sorted.map((p) => {
        const active = p.id === selectedId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
              active
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200",
            )}
          >
            {p.isReferencia && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            )}
            <span>{p.tipoProcesso || "Processo"}</span>
            {p.numeroAutos && (
              <span
                className={cn(
                  "font-mono text-[10px]",
                  active ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-400 dark:text-neutral-500",
                )}
              >
                {p.numeroAutos}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
