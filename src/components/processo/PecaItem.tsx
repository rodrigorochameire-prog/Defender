"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_DOT: Record<string, string> = {
  critico: "bg-red-500",
  alto: "bg-orange-500",
  medio: "bg-blue-500",
  baixo: "bg-neutral-400",
};

const TIPO_TO_TIER_LOCAL: Record<string, string> = {
  denuncia: "critico", sentenca: "critico", depoimento_vitima: "critico",
  depoimento_testemunha: "critico", depoimento_investigado: "critico",
  decisao: "alto", pronuncia: "alto", laudo_pericial: "alto",
  laudo_necroscopico: "alto", laudo_toxicologico: "alto", laudo_balistico: "alto",
  laudo_medico_legal: "alto", laudo_psiquiatrico: "alto", pericia_digital: "alto",
  ata_audiencia: "alto", interrogatorio: "alto", alegacoes_mp: "alto",
  alegacoes_defesa: "alto", resposta_acusacao: "alto", recurso: "alto",
  habeas_corpus: "alto",
};

export interface PecaItemData {
  id: number;
  tipo: string;
  titulo: string;
  paginaInicio: number;
  paginaFim: number;
  confianca: number | null;
  reviewStatus: string | null;
}

interface PecaItemProps {
  peca: PecaItemData;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}

export function PecaItem({ peca, active, onClick, compact }: PecaItemProps) {
  const tier = TIPO_TO_TIER_LOCAL[peca.tipo] || "baixo";
  const pageRange = peca.paginaInicio === peca.paginaFim
    ? `p. ${peca.paginaInicio}`
    : `pp. ${peca.paginaInicio}-${peca.paginaFim}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors",
        active
          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", active ? "bg-white" : TIER_DOT[tier])} />
      <span className={cn("text-sm truncate flex-1", compact && "text-xs")}>
        {peca.titulo}
      </span>
      {peca.reviewStatus === "approved" && (
        <CheckCircle2 className={cn("w-3 h-3 shrink-0", active ? "text-emerald-200" : "text-emerald-500")} />
      )}
      {peca.reviewStatus === "rejected" && (
        <XCircle className={cn("w-3 h-3 shrink-0", active ? "text-red-200" : "text-red-400")} />
      )}
      <span className={cn(
        "text-[10px] font-mono shrink-0 ml-auto",
        active ? "text-white/50" : "text-neutral-400",
      )}>
        {pageRange}
      </span>
    </button>
  );
}
