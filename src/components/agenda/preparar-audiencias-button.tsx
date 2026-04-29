"use client";

import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { prepararAudienciasActions } from "@/hooks/use-preparar-audiencias";

interface Props {
  variant?: "dark" | "light";
  className?: string;
}

/**
 * Botão de gatilho do modal "Preparar Audiências".
 *
 * Estado é compartilhado via `usePrepararAudiencias` (hook em
 * `@/hooks/use-preparar-audiencias`). O modal vive em outro lugar da árvore
 * (PrepararAudienciasModal) e ouve a mesma store.
 */
export function PrepararAudienciasButton({ variant = "light", className }: Props) {
  return (
    <button
      onClick={() => prepararAudienciasActions.open()}
      title="Preparar Audiências"
      className={cn(
        "h-8 px-2.5 rounded-xl flex items-center gap-1.5 text-[11px] font-semibold transition-all duration-150 cursor-pointer shrink-0",
        variant === "dark"
          ? "bg-white/[0.08] text-white/80 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white"
          : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50",
        className,
      )}
    >
      <Target className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Preparar</span>
    </button>
  );
}
