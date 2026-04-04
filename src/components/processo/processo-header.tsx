"use client";

import { Calendar, ArrowLeft, Pencil, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnaliseButton } from "@/app/(dashboard)/admin/assistidos/[id]/_components/analise-button";
import { PromptorioModal } from "@/app/(dashboard)/admin/assistidos/[id]/_components/promptorio-modal";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";
import { CasoBar } from "./caso-bar";

interface Assistido {
  id: number;
  nome: string;
  statusPrisional: string | null;
}

interface Audiencia {
  id: number;
  tipo: string;
  data: string;
}

interface ProcessoHeaderProps {
  id: number;
  numeroAutos: string;
  assistidos: Assistido[];
  atribuicao: string;
  vara: string | null;
  comarca: string | null;
  proximaAudiencia: Audiencia | null;
  classeProcessual: string | null;
  casoInfo?: { id: number; titulo: string } | null;
  processosVinculados?: {
    id: number;
    numeroAutos: string | null;
    tipoProcesso: string | null;
    isReferencia: boolean | null;
    assistidosNomes: string[];
  }[];
}

const PRESOS = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA", "DOMICILIAR", "MONITORADO"];

export function ProcessoHeader({
  id,
  numeroAutos,
  assistidos,
  atribuicao,
  vara,
  comarca,
  proximaAudiencia,
  classeProcessual,
  casoInfo,
  processosVinculados,
}: ProcessoHeaderProps) {
  const router = useRouter();
  const [promptorioOpen, setPromptorioOpen] = useState(false);

  const diasAteAudiencia = proximaAudiencia
    ? differenceInDays(new Date(proximaAudiencia.data), new Date())
    : null;

  const colors = getAtribuicaoColors(atribuicao) as Record<string, string>;
  const attrLabel = colors.shortLabel || colors.label || atribuicao;

  return (
    <>
      {/* Header card — elevated, same pattern as assistido */}
      <div className="mx-4 lg:mx-6 mt-3 px-5 pt-4 pb-3 rounded-xl bg-gradient-to-br from-[#222228] to-[#18181b] shadow-lg shadow-black/10 ring-1 ring-white/[0.04] overflow-hidden">

        {/* Row 1: Back + Número + Meta + Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-white/30 hover:text-white/70 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Line 1: Número + Atribuição + Classe */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1
                className="font-mono text-lg font-bold tracking-tight text-neutral-50 select-all hover:text-emerald-400 cursor-pointer transition-colors"
                title="Clique para selecionar"
              >
                {numeroAutos}
              </h1>
              <Link href={`/admin/processos/${id}/editar`}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/30 hover:text-white/80">
                  <Pencil className="h-3 w-3" />
                </Button>
              </Link>
              <span className="w-px h-4 bg-white/15" />
              <span className="text-[10px] px-2 py-0.5 rounded-[5px] font-medium bg-emerald-600 text-white">
                {attrLabel}
              </span>
              {classeProcessual && (
                <span className="text-xs text-white/40">{classeProcessual}</span>
              )}
            </div>

            {/* Line 2: Vara + Comarca + Assistidos */}
            <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
              {vara && <span className="text-white/40">{vara}</span>}
              {vara && comarca && <span className="w-px h-3 bg-white/15" />}
              {comarca && <span className="text-white/40">{comarca}</span>}
              <span className="w-px h-3 bg-white/15" />
              {assistidos.map((a) => {
                const preso = PRESOS.includes(a.statusPrisional ?? "");
                return (
                  <Link key={a.id} href={`/admin/assistidos/${a.id}`} className="inline-flex items-center gap-1 text-white/50 hover:text-white transition-colors">
                    <User className="w-3 h-3" />
                    <span className="font-medium">{a.nome}</span>
                    {preso && (
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Preso" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <AnaliseButton
              assistidoId={assistidos[0]?.id}
              processoId={id}
              atribuicao={atribuicao}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-white/80 border-white/20 bg-white/10 hover:bg-white/20 hover:text-white rounded-lg"
              onClick={() => setPromptorioOpen(true)}
            >
              Promptório
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Próxima audiência — inline compact */}
        {proximaAudiencia && diasAteAudiencia !== null && (
          <div className={cn(
            "flex items-center gap-2 mt-3 ml-8 text-xs",
            diasAteAudiencia < 3
              ? "text-rose-400"
              : diasAteAudiencia < 7
              ? "text-amber-400"
              : "text-white/40"
          )}>
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="font-semibold">{proximaAudiencia.tipo}</span>
            <span>
              {format(new Date(proximaAudiencia.data), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
            </span>
            <span className="opacity-60">
              ({diasAteAudiencia === 0 ? "hoje" : diasAteAudiencia === 1 ? "amanhã" : `em ${diasAteAudiencia} dias`})
            </span>
          </div>
        )}

        {/* CasoBar — linked processes */}
        {casoInfo && processosVinculados && processosVinculados.length > 0 && (
          <CasoBar
            casoTitulo={casoInfo.titulo}
            currentProcessoId={id}
            processos={processosVinculados}
          />
        )}
      </div>

      {/* Promptório Modal */}
      <PromptorioModal
        open={promptorioOpen}
        onOpenChange={setPromptorioOpen}
        assistidoNome={assistidos[0]?.nome ?? ""}
        processoNumero={numeroAutos}
        classeProcessual={classeProcessual ?? undefined}
        vara={vara ?? undefined}
        atribuicao={atribuicao}
        comarca={comarca ?? undefined}
      />
    </>
  );
}
