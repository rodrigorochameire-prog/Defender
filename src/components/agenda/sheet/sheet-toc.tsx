"use client";

import { useEffect, useRef } from "react";
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
  // Mantém a pill ativa sempre visível: quando o scroll-spy muda a seção,
  // rola horizontalmente a nav para revelá-la (essencial quando há overflow).
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    if (!activeId) return;
    pillRefs.current[activeId]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeId]);

  if (sections.length === 0) return null;
  return (
    <nav
      aria-label="Navegação do sheet"
      className="sticky top-0 z-[5] bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-3 py-1.5"
    >
      {/* scrollbar-none (utilitário real do projeto) + máscara nas bordas para
          sinalizar que há mais abas roláveis, sem expor a barra de rolagem. */}
      <div
        className="flex gap-1.5 overflow-x-auto scrollbar-none"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0, #000 22px, #000 calc(100% - 22px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0, #000 22px, #000 calc(100% - 22px), transparent 100%)",
        }}
      >
        {sections.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              ref={(el) => { pillRefs.current[s.id] = el; }}
              type="button"
              onClick={() => onJump(s.id)}
              className={cn(
                "shrink-0 px-2 py-1 rounded-md text-[11px] font-medium transition-colors duration-150 cursor-pointer flex items-center gap-1.5 motion-reduce:transition-none",
                active
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              )}
            >
              {s.label}
              {s.count !== undefined && s.count > 0 && (
                <span className={cn("text-[9px] tabular-nums", active ? "text-neutral-500 dark:text-neutral-400" : "text-neutral-300 dark:text-neutral-600")}>
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
