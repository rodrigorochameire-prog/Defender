"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PjeWizardStep = "configurar" | "colar" | "revisar" | "resultado";

export const PJE_WIZARD_STEPS: { key: PjeWizardStep; label: string }[] = [
  { key: "configurar", label: "Atribuição" },
  { key: "colar", label: "Colar texto" },
  { key: "revisar", label: "Revisar" },
  { key: "resultado", label: "Concluído" },
];

/**
 * Stepper compacto do wizard de importação do PJe (Fase 5.1).
 * Mostra as 4 etapas com a atual destacada e as anteriores marcadas como concluídas.
 * Puramente apresentacional — a etapa corrente vem do estado do modal.
 */
export function PjeWizardStepper({ current }: { current: PjeWizardStep }) {
  const currentIdx = PJE_WIZARD_STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center gap-1 mt-3" aria-label="Progresso da importação">
      {PJE_WIZARD_STEPS.map((step, i) => {
        const state = i < currentIdx ? "done" : i === currentIdx ? "active" : "todo";
        return (
          <li
            key={step.key}
            className="flex items-center gap-1.5"
            aria-current={state === "active" ? "step" : undefined}
          >
            <span
              className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-colors flex-shrink-0",
                state === "active" && "bg-blue-600 text-white",
                state === "done" && "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
                state === "todo" && "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500",
              )}
            >
              {state === "done" ? <Check className="w-3 h-3" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-[11px] font-medium hidden sm:inline whitespace-nowrap",
                state === "active"
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-400 dark:text-neutral-500",
              )}
            >
              {step.label}
            </span>
            {i < PJE_WIZARD_STEPS.length - 1 && (
              <span
                className={cn(
                  "w-4 sm:w-6 h-px mx-0.5 flex-shrink-0",
                  i < currentIdx ? "bg-blue-300 dark:bg-blue-800" : "bg-neutral-200 dark:bg-neutral-700",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
