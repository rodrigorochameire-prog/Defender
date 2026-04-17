"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar, Gavel, MapPin, UserCheck, UserX, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoBlock, DepoenteCard } from "../shared/depoente-card";
import { statusTone, TONE_BG } from "./status-tone";
import type { RegistroAudienciaData } from "../types";

interface Props {
  registro: RegistroAudienciaData & {
    historicoId?: string;
    dataRegistro?: string;
    horarioInicio?: string;
    local?: string;
  };
  statusAudiencia?: string;
  variant: "preview" | "saved";
}

export function RegistroPreviewCard({ registro, statusAudiencia, variant }: Props) {
  const tone = statusTone({
    realizada: registro.realizada,
    status: statusAudiencia,
    resultado: registro.resultado,
  });

  const wrapperClass = variant === "preview"
    ? "bg-emerald-50/50 border-2 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800"
    : "bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80";

  const presente = registro.assistidoCompareceu;

  return (
    <div className={cn("rounded-xl overflow-hidden", wrapperClass)}>
      <div className="bg-neutral-50/50 dark:bg-neutral-900/50 p-3 border-b border-neutral-200/80 dark:border-neutral-800/80 flex items-center gap-2 flex-wrap">
        {variant === "preview" && (
          <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0">EM EDIÇÃO</Badge>
        )}
        {registro.dataRealizacao && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(registro.dataRealizacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        )}
        {registro.horarioInicio && (
          <span className="text-[11px] text-neutral-500">às {registro.horarioInicio}</span>
        )}
        <Badge className={cn("ml-auto text-[10px]", TONE_BG[tone.tone])}>{tone.label}</Badge>
      </div>

      <div className="p-4 space-y-3">
        {registro.local && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
            <MapPin className="w-3.5 h-3.5" />
            {registro.local}
          </div>
        )}

        {registro.resultado && (
          <InfoBlock icon={Gavel} label="Resultado" borderColor="border-l-neutral-400 dark:border-l-neutral-600">
            <Badge variant="outline" className="text-xs capitalize mt-1">{registro.resultado}</Badge>
          </InfoBlock>
        )}

        {registro.motivoNaoRealizacao && (
          <InfoBlock icon={AlertTriangle} label="Motivo da não realização" borderColor="border-l-amber-500">
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{registro.motivoNaoRealizacao}</p>
          </InfoBlock>
        )}

        {registro.dataRedesignacao && (
          <InfoBlock icon={Calendar} label="Audiência Redesignada" borderColor="border-l-neutral-400">
            {registro.motivoRedesignacao && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                <span className="font-semibold">Motivo:</span> {registro.motivoRedesignacao}
              </p>
            )}
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-semibold">Nova data:</span>
              {new Date(registro.dataRedesignacao).toLocaleDateString("pt-BR")}
              {registro.horarioRedesignacao && ` às ${registro.horarioRedesignacao}`}
            </div>
          </InfoBlock>
        )}

        <InfoBlock icon={Users} label="Presença do Assistido" borderColor="border-l-neutral-400">
          <Badge
            className={
              presente
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 mt-1"
                : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 mt-1"
            }
          >
            {presente ? (
              <><UserCheck className="w-3 h-3 mr-1" />Presente</>
            ) : (
              <><UserX className="w-3 h-3 mr-1" />Ausente</>
            )}
          </Badge>
        </InfoBlock>

        {(registro.depoentes?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Depoentes ({registro.depoentes.length})
            </Label>
            {registro.depoentes.map((dep: any) => (
              <DepoenteCard key={dep.id || dep.nome} dep={dep} />
            ))}
          </div>
        )}

        {(registro.manifestacaoMP || registro.manifestacaoDefesa || registro.decisaoJuiz) && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Manifestações e Decisões</Label>
            {registro.manifestacaoMP && (
              <InfoBlock icon={Gavel} label="Ministério Público" borderColor="border-l-rose-400">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{registro.manifestacaoMP}</p>
              </InfoBlock>
            )}
            {registro.manifestacaoDefesa && (
              <InfoBlock icon={Gavel} label="Defesa" borderColor="border-l-emerald-500">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{registro.manifestacaoDefesa}</p>
              </InfoBlock>
            )}
            {registro.decisaoJuiz && (
              <InfoBlock icon={Gavel} label="Decisão Judicial" borderColor="border-l-blue-500">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{registro.decisaoJuiz}</p>
              </InfoBlock>
            )}
          </div>
        )}

        {registro.encaminhamentos && (
          <InfoBlock icon={Gavel} label="Encaminhamentos" borderColor="border-l-neutral-400">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">{registro.encaminhamentos}</p>
          </InfoBlock>
        )}

        {registro.anotacoesGerais && (
          <InfoBlock icon={Gavel} label="Anotações" borderColor="border-l-neutral-400">
            <p className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{registro.anotacoesGerais}</p>
          </InfoBlock>
        )}
      </div>
    </div>
  );
}
