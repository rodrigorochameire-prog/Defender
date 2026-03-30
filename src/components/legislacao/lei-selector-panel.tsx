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
  hideToggle?: boolean;
}

export function LeiSelectorPanel({
  selectedLeiId,
  onSelect,
  collapsed,
  onToggleCollapse,
  hideToggle = false,
}: LeiSelectorPanelProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-r border-zinc-200 dark:border-border transition-all duration-200",
        collapsed ? "w-10" : "w-44"
      )}
    >
      {/* Toggle button */}
      {!hideToggle && (
        <div className="flex items-center justify-end border-b border-zinc-200 dark:border-border p-1.5">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-muted transition-colors cursor-pointer"
            title={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        </div>
      )}

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
                            ? "bg-zinc-100 dark:bg-muted"
                            : "hover:bg-zinc-50 dark:hover:bg-card"
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
                      ? "bg-zinc-100 dark:bg-muted"
                      : "hover:bg-zinc-50 dark:hover:bg-card"
                  )}
                >
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none"
                    style={{
                      backgroundColor: `${lei.cor}18`,
                      color: lei.cor,
                    }}
                  >
                    {lei.nomeAbreviado}
                  </span>
                  <span className="truncate text-muted-foreground text-[10px]">
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
