"use client";

import { cn } from "@/lib/utils";
import { LayoutGrid, List, Activity } from "lucide-react";
import { ProcessingQueuePanel } from "@/components/drive/ProcessingQueuePanel";
import { useProcessingQueue } from "@/contexts/processing-queue";

export interface FilterSectionAssistidosProps {
  selectedAtribuicao: string;
  setSelectedAtribuicao: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  selectedComarca: string;
  setSelectedComarca: (value: string) => void;
  comarcas: string[];
  sortBy: string;
  setSortBy: (value: string) => void;
  groupBy: string;
  setGroupBy: (value: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (value: "grid" | "list") => void;
}

const SORT_OPTIONS = [
  { id: "nome", label: "Nome" },
  { id: "prioridade", label: "Prioridade" },
  { id: "prazo", label: "Prazo" },
] as const;

export function FilterSectionAssistidos({
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
}: FilterSectionAssistidosProps) {
  const { activeCount } = useProcessingQueue();

  return (
    <div className="flex items-center justify-between">
      {/* Sort pill group */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-zinc-400 mr-0.5">Ordenar:</span>
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 cursor-pointer",
                sortBy === opt.id
                  ? "bg-zinc-700 dark:bg-zinc-300 text-white dark:text-zinc-900 shadow-sm"
                  : "text-zinc-400 dark:text-zinc-500"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right side: processing queue + view toggle */}
      <div className="flex items-center gap-2">
        <ProcessingQueuePanel>
          <button
            className={cn(
              "h-7 w-7 inline-flex items-center justify-center gap-1 rounded-md transition-colors",
              activeCount > 0
                ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
            title="Fila de processamento"
          >
            <Activity className={cn("h-3.5 w-3.5", activeCount > 0 && "animate-pulse")} />
            {activeCount > 0 && (
              <span className="text-[10px] font-medium">{activeCount}</span>
            )}
          </button>
        </ProcessingQueuePanel>

        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 cursor-pointer",
              viewMode === "grid"
                ? "bg-zinc-700 dark:bg-zinc-300 text-white dark:text-zinc-900 shadow-sm"
                : "text-zinc-400 dark:text-zinc-500"
            )}
            title="Grade"
          >
            <LayoutGrid className="w-[15px] h-[15px]" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 cursor-pointer",
              viewMode === "list"
                ? "bg-zinc-700 dark:bg-zinc-300 text-white dark:text-zinc-900 shadow-sm"
                : "text-zinc-400 dark:text-zinc-500"
            )}
            title="Lista"
          >
            <List className="w-[15px] h-[15px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
