"use client";

import { Layers, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CriarCasoButtonProps {
  onCriar: () => void;
  isPending?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}

/**
 * CriarCasoButton — botão presentacional do CTA primário do cockpit.
 * Pura UI: a ligação com a mutação fica no container (CriarCasoFromProcessoButton).
 */
export function CriarCasoButton({
  onCriar,
  isPending,
  disabled,
  label = "Criar caso",
  className,
}: CriarCasoButtonProps) {
  return (
    <button
      type="button"
      onClick={onCriar}
      disabled={isPending || disabled}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium",
        "bg-emerald-600 text-white hover:bg-emerald-700 transition-colors",
        "cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      )}
    >
      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
