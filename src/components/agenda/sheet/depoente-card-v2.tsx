"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface DepoenteV2 {
  id?: number;
  nome: string;
  tipo?: "ACUSACAO" | "DEFESA" | "COMUM" | "INFORMANTE" | "PERITO" | "VITIMA";
  status?: "ARROLADA" | "INTIMADA" | "OUVIDA" | "DESISTIDA" | "NAO_LOCALIZADA" | "CARTA_PRECATORIA";
  lado?: string;
  qualidade?: string;
  papel?: string;
  versaoDelegacia?: string | null;
  versaoJuizo?: string | null;
  sinteseJuizo?: string | null;
  perguntasSugeridas?: string | null;
  ouvidoEm?: Date | string | null;
  redesignadoPara?: string | null;
  audioDriveFileId?: string | null;
}

interface Props {
  depoente: DepoenteV2;
  isOpen: boolean;
  onToggle: () => void;
  variant: "sheet" | "modal";
  onMarcarOuvido: (id: number, sintese?: string) => void;
  onRedesignar: (id: number) => void;
  onAdicionarPergunta: (id: number) => void;
  onAbrirAudio?: (id: number) => void;
}

function ladoOf(d: DepoenteV2): "acusacao" | "defesa" | "neutro" {
  if (d.lado === "acusacao" || d.tipo === "ACUSACAO" || d.tipo === "VITIMA") return "acusacao";
  if (d.lado === "defesa" || d.tipo === "DEFESA") return "defesa";
  return "neutro";
}

function statusLabel(s?: string): { text: string; tone: "emerald" | "amber" | "neutral" } {
  switch (s) {
    case "OUVIDA": return { text: "Ouvido", tone: "emerald" };
    case "DESISTIDA":
    case "NAO_LOCALIZADA": return { text: "Redesignado", tone: "amber" };
    default: return { text: "Pendente", tone: "neutral" };
  }
}

function qualidadeLabel(d: DepoenteV2): string | null {
  if (d.qualidade) return d.qualidade;
  if (d.tipo === "VITIMA") return "Vítima";
  if (d.tipo === "ACUSACAO") return "Acusação";
  if (d.tipo === "DEFESA") return "Defesa";
  if (d.tipo === "INFORMANTE") return "Informante";
  if (d.tipo === "PERITO") return "Perito";
  if (d.tipo === "COMUM") return "Testemunha";
  return null;
}

export function DepoenteCardV2({ depoente, isOpen, onToggle, onMarcarOuvido, onRedesignar, onAdicionarPergunta, onAbrirAudio }: Props) {
  const lado = ladoOf(depoente);
  const status = statusLabel(depoente.status);
  const ladoBorder = {
    acusacao: "border-l-rose-300/70",
    defesa: "border-l-emerald-300/70",
    neutro: "border-l-neutral-200",
  }[lado];
  const statusClasses = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    neutral: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  }[status.tone];

  return (
    <div
      data-lado={lado}
      className={cn(
        "rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 border-l-[3px] overflow-hidden",
        ladoBorder
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate">
            {depoente.nome}
          </div>
          {qualidadeLabel(depoente) && (
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {qualidadeLabel(depoente)}
            </div>
          )}
        </div>
        <Badge className={cn("text-[9px] px-1.5 py-0", statusClasses)}>{status.text}</Badge>
        {isOpen
          ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          : <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
        }
      </button>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-neutral-100 dark:border-neutral-800/40 pt-2.5 space-y-2.5">
          <div>
            <div className="text-[9px] font-semibold text-neutral-400 tracking-wide mb-0.5">
              🏛 DELEGACIA
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {depoente.versaoDelegacia ?? <span className="italic text-neutral-300">vazio</span>}
            </p>
          </div>
          <div>
            <div className="text-[9px] font-semibold text-neutral-400 tracking-wide mb-0.5">
              ⚖ EM JUÍZO
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {depoente.sinteseJuizo ?? depoente.versaoJuizo ?? <span className="italic text-neutral-300">vazio</span>}
            </p>
          </div>
          {depoente.perguntasSugeridas && (
            <div>
              <div className="text-[9px] font-semibold text-neutral-400 tracking-wide mb-0.5">
                🎯 PERGUNTAS PREPARADAS
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed">
                {depoente.perguntasSugeridas}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-dashed border-neutral-100 dark:border-neutral-800/40">
            {depoente.status !== "OUVIDA" && (
              <button
                type="button"
                onClick={() => depoente.id != null && onMarcarOuvido(depoente.id, undefined)}
                className="text-[10px] font-medium px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 cursor-pointer"
              >
                ✓ Marcar ouvido
              </button>
            )}
            <button
              type="button"
              onClick={() => depoente.id != null && onRedesignar(depoente.id)}
              className="text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer"
            >
              ↷ Redesignar
            </button>
            <button
              type="button"
              onClick={() => depoente.id != null && onAdicionarPergunta(depoente.id)}
              className="text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer"
            >
              + Pergunta
            </button>
            {depoente.audioDriveFileId && onAbrirAudio && (
              <button
                type="button"
                onClick={() => depoente.id != null && onAbrirAudio(depoente.id)}
                className="text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer"
              >
                ▶ Áudio
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
