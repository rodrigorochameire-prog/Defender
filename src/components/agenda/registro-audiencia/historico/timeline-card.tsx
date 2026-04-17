"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusTone, TONE_BG, TONE_BORDER } from "./status-tone";
import { RegistroPreviewCard } from "./registro-preview-card";
import type { RegistroAudienciaData } from "../types";

interface Props {
  registro: RegistroAudienciaData & { historicoId?: string; horarioInicio?: string };
  isOpen: boolean;
  onToggle: () => void;
}

function highlightFor(r: Props["registro"]): string {
  if (r.resultado === "redesignada" && r.motivoRedesignacao) return `Motivo: ${r.motivoRedesignacao}`;
  if (r.resultado === "suspensa" && r.motivoNaoRealizacao) return `Motivo: ${r.motivoNaoRealizacao}`;
  if (r.realizada && r.resultado) {
    const n = r.depoentes?.length ?? 0;
    const ouvidos = r.depoentes?.filter((d: any) => d.presente || d.jaOuvido === "ambos").length ?? 0;
    return `${r.resultado} · ${n} depoente${n !== 1 ? "s" : ""}${ouvidos ? ` (${ouvidos} ouvidos)` : ""}`;
  }
  return "";
}

export function TimelineCard({ registro, isOpen, onToggle }: Props) {
  const tone = statusTone({
    realizada: registro.realizada,
    resultado: registro.resultado,
  });
  const highlight = highlightFor(registro);
  const dataStr = registro.dataRealizacao
    ? new Date(registro.dataRealizacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <div className={cn(
      "rounded-lg bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-200/60 dark:border-neutral-800/60 border-l-[3px] overflow-hidden",
      TONE_BORDER[tone.tone],
      isOpen && "bg-white dark:bg-neutral-900"
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            {dataStr}
            {registro.horarioInicio && <span className="text-neutral-400 font-normal">{registro.horarioInicio}</span>}
          </div>
          {highlight && (
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">{highlight}</div>
          )}
        </div>
        <Badge className={cn("text-[9px] px-1.5 py-0", TONE_BG[tone.tone])}>{tone.label}</Badge>
        {isOpen
          ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          : <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />}
      </button>
      {isOpen && (
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
          <RegistroPreviewCard registro={registro as any} statusAudiencia={undefined} variant="saved" />
        </div>
      )}
    </div>
  );
}
