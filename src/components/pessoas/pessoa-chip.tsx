"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";

type PapelColor = "neutral" | "rose" | "indigo" | "violet" | "emerald" | "amber" | "slate" | "cyan";

const PAPEL_COLOR_MAP: Record<string, PapelColor> = {
  juiz: "neutral",
  desembargador: "neutral",
  "servidor-cartorio": "neutral",
  "oficial-justica": "neutral",
  "analista-judiciario": "neutral",
  promotor: "rose",
  procurador: "rose",
  "autoridade-policial": "indigo",
  "policial-militar": "indigo",
  "policial-civil": "indigo",
  "policial-federal": "indigo",
  "guarda-municipal": "indigo",
  "agente-penitenciario": "indigo",
  "perito-criminal": "violet",
  "perito-medico": "violet",
  "medico-legista": "violet",
  "medico-assistente": "violet",
  "psicologo-forense": "violet",
  "psiquiatra-forense": "violet",
  "assistente-social": "violet",
  "tradutor-interprete": "violet",
  testemunha: "emerald",
  "testemunha-defesa": "emerald",
  informante: "emerald",
  vitima: "amber",
  "co-reu": "slate",
  "advogado-parte-contraria": "cyan",
};

const COLOR_CLASSES: Record<PapelColor, string> = {
  neutral: "bg-neutral-50 border-neutral-200 text-neutral-700 dark:bg-neutral-900/40 dark:border-neutral-700 dark:text-neutral-300",
  rose: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-400",
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-400",
  violet: "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/30 dark:border-violet-900 dark:text-violet-400",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400",
  amber: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400",
  slate: "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-300",
  cyan: "bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-950/30 dark:border-cyan-900 dark:text-cyan-400",
};

export interface PessoaChipProps {
  pessoaId?: number;
  nome?: string;
  papel?: string;
  size?: "xs" | "sm" | "md";
  clickable?: boolean;
  onClick?: (resolved: { id?: number; nome: string }) => void;
  className?: string;
}

/**
 * Chip silencioso (Fase I-A). Renderiza nome + ícone + cor por papel.
 * Fase I-B adiciona dot de sinalização de inteligência.
 */
export function PessoaChip({
  pessoaId,
  nome,
  papel,
  size = "sm",
  clickable = true,
  onClick,
  className,
}: PessoaChipProps) {
  const color = papel ? PAPEL_COLOR_MAP[papel] ?? "neutral" : "neutral";
  const sizeClass =
    size === "xs" ? "text-[10px] px-1.5 py-0.5" : size === "md" ? "text-xs px-2.5 py-1" : "text-[11px] px-2 py-0.5";

  const resolved = { id: pessoaId, nome: nome ?? "(sem nome)" };

  const handleClick = () => {
    if (onClick) onClick(resolved);
  };

  const baseClass = cn(
    "inline-flex items-center gap-1 rounded-md border font-medium",
    COLOR_CLASSES[color],
    sizeClass,
    clickable && "cursor-pointer hover:border-neutral-400 transition-colors",
    className,
  );

  const content = (
    <>
      <User className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      <span className="truncate max-w-[200px]">{nome ?? "(sem nome)"}</span>
      {papel && <span className="text-[9px] opacity-70">{papel.replace(/-/g, " ")}</span>}
    </>
  );

  if (clickable) {
    return (
      <button type="button" onClick={handleClick} className={baseClass}>
        {content}
      </button>
    );
  }

  return <span className={baseClass}>{content}</span>;
}
