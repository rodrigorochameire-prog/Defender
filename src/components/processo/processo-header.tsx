"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";
import { CoworkActionGroup } from "@/components/shared/cowork-action-button";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  const diasAteAudiencia = proximaAudiencia
    ? differenceInDays(new Date(proximaAudiencia.data), new Date())
    : null;

  const atribuicaoLabel: Record<string, string> = {
    JURI_CAMACARI: "Tribunal do Júri",
    VVD_CAMACARI: "Violência Doméstica",
    EXECUCAO_PENAL: "Execução Penal",
    SUBSTITUICAO: "Substituição Criminal",
  };

  return (
    <div className="px-6 lg:px-8 pt-6 pb-5 border-b border-zinc-200/80 dark:border-zinc-800/50">
      {/* Número do processo */}
      <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-50">
        {numeroAutos}
      </h1>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {atribuicaoLabel[atribuicao] ?? atribuicao}
        </span>
        {vara && (
          <>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span className="text-sm text-zinc-400 dark:text-zinc-500">{vara}</span>
          </>
        )}
        {comarca && (
          <>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <span className="text-sm text-zinc-400 dark:text-zinc-500">{comarca}</span>
          </>
        )}
      </div>

      {/* Assistidos */}
      <div className="flex flex-wrap gap-2.5 mt-4">
        {assistidos.map((a) => {
          const preso = PRESOS.includes(a.statusPrisional ?? "");
          return (
            <Link key={a.id} href={`/admin/assistidos/${a.id}`}>
              <div className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all cursor-pointer",
                preso
                  ? "border-rose-200 dark:border-rose-800/50 bg-rose-50/30 dark:bg-rose-950/10 hover:border-rose-300"
                  : "border-zinc-200 dark:border-zinc-700/50 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm"
              )}>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{a.nome}</span>
                {preso && (
                  <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded-md">
                    PRESO
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Próxima audiência */}
      {proximaAudiencia && diasAteAudiencia !== null && (
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl mt-5 border",
          diasAteAudiencia < 3
            ? "bg-rose-50/50 dark:bg-rose-950/10 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/30"
            : diasAteAudiencia < 7
            ? "bg-amber-50/50 dark:bg-amber-950/10 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/30"
            : "bg-zinc-50 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-700/40"
        )}>
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">{proximaAudiencia.tipo}</span>
          <span className="text-sm">
            {format(new Date(proximaAudiencia.data), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
          </span>
          <span className="text-xs opacity-70">
            ({diasAteAudiencia === 0 ? "hoje" : diasAteAudiencia === 1 ? "amanhã" : `em ${diasAteAudiencia} dias`})
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2.5">
          Ações IA
        </p>
        <CoworkActionGroup
          assistidoNome={assistidos[0]?.nome ?? ""}
          numeroAutos={numeroAutos}
          processoId={id}
          classeProcessual={classeProcessual ?? ""}
          vara={vara ?? ""}
          atribuicao={atribuicao}
          drivePath=""
          actions={
            atribuicao === "JURI_CAMACARI"
              ? ["analise-autos", "gerar-peca", "preparar-audiencia"]
              : ["analise-autos", "gerar-peca", "preparar-audiencia"]
          }
        />
      </div>
    </div>
  );
}
