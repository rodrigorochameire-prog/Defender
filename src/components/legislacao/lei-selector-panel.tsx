"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LEGISLACOES } from "@/config/legislacao";

interface LeiSelectorPanelProps {
  selectedLeiId: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function LeiSelectorPanel({
  selectedLeiId,
  onSelect,
  collapsed,
  onToggleCollapse,
}: LeiSelectorPanelProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 transition-all duration-200",
        collapsed ? "w-10" : "w-44"
      )}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-end border-b border-zinc-200 dark:border-zinc-800 p-1.5">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title={collapsed ? "Expandir" : "Recolher"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-zinc-400" />
          )}
        </button>
      </div>

      {/* Law list */}
      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-0.5">
          <TooltipProvider delayDuration={300}>
            {LEGISLACOES.map((lei) => {
              const isSelected = lei.id === selectedLeiId;
              if (collapsed) {
                return (
                  <Tooltip key={lei.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onSelect(lei.id)}
                        className={cn(
                          "flex w-full items-center justify-center rounded-md p-1.5 transition-colors cursor-pointer",
                          isSelected
                            ? "bg-zinc-100 dark:bg-zinc-800"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        )}
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full shrink-0",
                            isSelected && "ring-2 ring-offset-1"
                          )}
                          style={{
                            backgroundColor: lei.cor,
                            // @ts-expect-error ring-color via inline style
                            "--tw-ring-color": lei.cor,
                          }}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      {lei.nomeAbreviado} — {lei.nome}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <button
                  key={lei.id}
                  type="button"
                  onClick={() => onSelect(lei.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors cursor-pointer",
                    isSelected
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: lei.cor }}
                  />
                  <span
                    className="font-semibold shrink-0 text-[11px]"
                    style={{ color: isSelected ? lei.cor : undefined }}
                  >
                    {lei.nomeAbreviado}
                  </span>
                  <span className="truncate text-zinc-500 dark:text-zinc-400 text-[10px]">
                    {lei.nome}
                  </span>
                </button>
              );
            })}
          </TooltipProvider>
        </div>
      </ScrollArea>
    </div>
  );
}
