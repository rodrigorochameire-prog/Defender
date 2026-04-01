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
      <div className="mx-4 lg:mx-6 mt-4 px-5 pt-5 pb-4 rounded-xl bg-gradient-to-br from-[#1c1c20] to-[#111113] shadow-lg shadow-black/10 overflow-hidden">

        {/* Row 1: Back + Número + Meta + Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Line 1: Número + Atribuição + Classe */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1
                className="font-mono text-lg font-bold tracking-tight text-zinc-50 select-all hover:text-emerald-400 cursor-pointer transition-colors"
                title="Clique para selecionar"
              >
                {numeroAutos}
              </h1>
              <Link href={`/admin/processos/${id}/editar`}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-500 hover:text-emerald-400">
                  <Pencil className="h-3 w-3" />
                </Button>
              </Link>
              <span className="w-px h-4 bg-zinc-200/70 dark:bg-zinc-700/70" />
              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-white/10 text-zinc-300">
                {attrLabel}
              </span>
              {classeProcessual && (
                <span className="text-xs text-zinc-500">{classeProcessual}</span>
              )}
            </div>

            {/* Line 2: Vara + Comarca + Assistidos */}
            <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
              {vara && <span className="text-zinc-500">{vara}</span>}
              {vara && comarca && <span className="w-px h-3 bg-zinc-700" />}
              {comarca && <span className="text-zinc-500">{comarca}</span>}
              <span className="w-px h-3 bg-zinc-700" />
              {assistidos.map((a) => {
                const preso = PRESOS.includes(a.statusPrisional ?? "");
                return (
                  <Link key={a.id} href={`/admin/assistidos/${a.id}`} className="inline-flex items-center gap-1 text-zinc-400 hover:text-emerald-400 transition-colors">
                    <User className="w-3 h-3" />
                    <span className="font-medium">{a.nome}</span>
                    {preso && (
                      <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" title="Preso" />
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
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-zinc-400 border-zinc-600 bg-white/5 hover:bg-white/10 hover:text-zinc-200 rounded-xl"
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
              ? "text-rose-600 dark:text-rose-400"
              : diasAteAudiencia < 7
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground"
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
