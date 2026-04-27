"use client";

import { cn } from "@/lib/utils";

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

export function SheetToC({ sections, activeId, onJump }: Props) {
  if (sections.length === 0) return null;
  return (
    <nav
      aria-label="Navegação do sheet"
      className="sticky top-0 z-[5] bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/40 dark:border-neutral-800/60 px-3 py-2"
    >
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {sections.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onJump(s.id)}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-150 cursor-pointer flex items-center gap-1.5 motion-reduce:transition-none",
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
              )}
            >
              {s.label}
              {s.count !== undefined && s.count > 0 && (
                <span className={cn("text-[9px] tabular-nums", active ? "text-background/80" : "text-neutral-400")}>
                  {s.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
