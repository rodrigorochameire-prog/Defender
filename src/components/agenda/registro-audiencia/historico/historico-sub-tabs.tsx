"use client";

import { cn } from "@/lib/utils";
import { CompletudeBadge } from "./completude-badge";
import { COMPLETUDE_TOTAL } from "./count-completude";

interface Props {
  active: "edicao" | "anteriores";
  anterioresCount: number;
  completudeCount: number;
  onChange: (tab: "edicao" | "anteriores") => void;
}

export function HistoricoSubTabs({ active, anterioresCount, completudeCount, onChange }: Props) {
  return (
    <div role="tablist" className="flex gap-0 border-b border-neutral-200 dark:border-neutral-800">
      <button
        type="button"
        role="tab"
        aria-selected={active === "edicao"}
        onClick={() => onChange("edicao")}
        className={cn(
          "px-3 py-1.5 text-[11px] font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5",
          active === "edicao"
            ? "border-foreground text-foreground"
            : "border-transparent text-neutral-500 hover:text-neutral-700"
        )}
      >
        Em edição
        <CompletudeBadge count={completudeCount} total={COMPLETUDE_TOTAL} />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "anteriores"}
        onClick={() => onChange("anteriores")}
        className={cn(
          "px-3 py-1.5 text-[11px] font-semibold border-b-2 cursor-pointer transition-colors",
          active === "anteriores"
            ? "border-foreground text-foreground"
            : "border-transparent text-neutral-500 hover:text-neutral-700"
        )}
      >
        Anteriores
        {anterioresCount > 0 && (
          <span className="ml-1 text-[9px] text-neutral-400 tabular-nums">{anterioresCount}</span>
        )}
      </button>
    </div>
  );
}
