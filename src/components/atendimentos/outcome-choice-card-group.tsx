"use client";

// Desfecho do atendimento como CARDS de escolha (não radios crus) — Fase 4.
// Radiogroup acessível: cada opção é um <button role="radio">. Padrão Defender:
// base neutra, acento emerald no selecionado.

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DESFECHO_OPTIONS, type Desfecho, type DesfechoOption } from "./agendar-retorno-logic";

export function OutcomeChoiceCardGroup({
  value,
  onChange,
  options = DESFECHO_OPTIONS,
  className,
}: {
  value: Desfecho;
  onChange: (v: Desfecho) => void;
  options?: readonly DesfechoOption[];
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Desfecho do atendimento" className={cn("space-y-1.5", className)}>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-outcome-card={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50",
              selected
                ? "border-emerald-500/60 bg-emerald-50/70 dark:border-emerald-500/40 dark:bg-emerald-900/15"
                : "border-neutral-200/70 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30",
            )}
          >
            <span
              className={cn(
                "shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-full border transition-colors",
                selected
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-neutral-300 dark:border-neutral-600",
              )}
            >
              {selected && <Check className="w-2.5 h-2.5" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground/90 leading-tight">{o.label}</span>
              <span className="block text-[11px] text-muted-foreground leading-tight">{o.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
