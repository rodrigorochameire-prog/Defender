"use client";

import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export interface ToCSection {
  id: string;
  label: string;
  count?: number;
}

interface Props {
  sections: ToCSection[];
  activeId?: string;
  onJump: (id: string) => void;
}

/**
 * Navegação de seções do sheet — um único dropdown compacto (gatilho mostra a
 * seção ativa + chevron). Substitui a antiga linha de pills para reduzir a
 * poluição no topo. O scroll-spy (IntersectionObserver no sheet) continua
 * ditando `activeId`, que reflete tanto no rótulo do gatilho quanto no item
 * marcado do menu (check emerald). O scroll/âncora continua via `onJump`.
 */
export function SheetToC({ sections, activeId, onJump }: Props) {
  if (sections.length === 0) return null;

  const active = sections.find((s) => s.id === activeId);
  const triggerLabel = active?.label ?? sections[0]!.label;

  return (
    <nav
      aria-label="Navegação do sheet"
      className="sticky top-0 z-[5] bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-3 py-1.5"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Ir para seção"
            className="inline-flex items-center gap-1.5 max-w-full px-2 py-1 rounded-md text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-700 motion-reduce:transition-none data-[state=open]:bg-neutral-100 dark:data-[state=open]:bg-neutral-800/60"
          >
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown className="w-3 h-3 shrink-0 opacity-60" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="min-w-[200px] max-h-[50vh] overflow-y-auto p-1 rounded-lg"
        >
          {sections.map((s) => {
            const isActive = s.id === activeId;
            return (
              <DropdownMenuItem
                key={s.id}
                onSelect={() => onJump(s.id)}
                className={cn(
                  "flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-md text-[11px] font-medium cursor-pointer",
                  isActive
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-500 dark:text-neutral-400"
                )}
              >
                <span className="flex w-3.5 shrink-0 items-center justify-center" aria-hidden>
                  {isActive && <Check className="w-3 h-3 text-emerald-500" />}
                </span>
                <span className="flex-1 truncate">{s.label}</span>
                {s.count !== undefined && s.count > 0 && (
                  <span
                    className={cn(
                      "text-[9px] tabular-nums shrink-0",
                      isActive
                        ? "text-neutral-500 dark:text-neutral-400"
                        : "text-neutral-300 dark:text-neutral-600"
                    )}
                  >
                    {s.count}
                  </span>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
