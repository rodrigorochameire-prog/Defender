"use client";

import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSkillTask } from "@/hooks/use-skill-task";

const ATRIB_COLORS: Record<string, { bg: string; hover: string; shadow: string }> = {
  JURI_CAMACARI: { bg: "bg-emerald-600", hover: "hover:bg-emerald-700", shadow: "hover:shadow-emerald-500/20" },
  JURI: { bg: "bg-emerald-600", hover: "hover:bg-emerald-700", shadow: "hover:shadow-emerald-500/20" },
  VVD_CAMACARI: { bg: "bg-amber-500", hover: "hover:bg-amber-600", shadow: "hover:shadow-amber-500/20" },
  VVD: { bg: "bg-amber-500", hover: "hover:bg-amber-600", shadow: "hover:shadow-amber-500/20" },
  EXECUCAO_PENAL: { bg: "bg-sky-600", hover: "hover:bg-sky-700", shadow: "hover:shadow-sky-500/20" },
  EXECUCAO: { bg: "bg-sky-600", hover: "hover:bg-sky-700", shadow: "hover:shadow-sky-500/20" },
  SUBSTITUICAO: { bg: "bg-neutral-700", hover: "hover:bg-neutral-800", shadow: "hover:shadow-neutral-500/20" },
};
const DEFAULT_COLOR = { bg: "bg-emerald-600", hover: "hover:bg-emerald-700", shadow: "hover:shadow-emerald-500/20" };

interface AnaliseButtonProps {
  assistidoId: number;
  processoId?: number;
  casoId?: number;
  atribuicao?: string;
  disabled?: boolean;
  onComplete?: () => void;
}

export function AnaliseButton({
  assistidoId,
  processoId,
  casoId,
  atribuicao,
  disabled,
  onComplete,
}: AnaliseButtonProps) {
  const colors = (atribuicao && ATRIB_COLORS[atribuicao]) || DEFAULT_COLOR;

  const { state, etapa, trigger, isSubmitting } = useSkillTask({
    onComplete: () => {
      toast.success("Análise concluída");
      onComplete?.();
    },
    onError: (msg) => {
      toast.error(`Erro na análise: ${msg}`);
    },
  });

  function handleClick() {
    if (state !== "idle") return;
    trigger({
      assistidoId,
      processoId,
      casoId,
      skill: "analise-assistido",
    });
  }

  if (state === "completed") {
    return (
      <Button
        disabled
        className="bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-2"
      >
        <CheckCircle2 className="w-4 h-4" />
        Concluído
      </Button>
    );
  }

  if (state === "pending" || state === "processing") {
    return (
      <div className="flex items-center gap-3">
        <Button
          disabled
          className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          Analisando...
        </Button>
        {etapa && (
          <span className="text-xs text-emerald-500">{etapa}</span>
        )}
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isSubmitting}
      className={cn(
        "text-white gap-1.5 shadow-sm hover:shadow-md transition-all duration-200 text-xs h-8 px-3",
        colors.bg, colors.hover, colors.shadow
      )}
    >
      {isSubmitting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-3.5 h-3.5" />
      )}
      Analisar
    </Button>
  );
}
