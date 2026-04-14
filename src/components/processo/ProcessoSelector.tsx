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
    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 flex-wrap">
      {sorted.map((p) => {
        const active = p.id === selectedId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
              active
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200",
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
                  active ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-500",
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
