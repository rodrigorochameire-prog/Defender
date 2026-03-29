"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";
import { CoworkActionGroup } from "@/components/shared/cowork-action-button";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    <div className="px-8 pt-5 pb-5 border-b border-zinc-100 dark:border-zinc-800/50">
      {/* Número do processo + metadados numa linha */}
      <div className="flex items-baseline gap-3 mb-4">
        <h1 className="text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-50">
          {numeroAutos}
        </h1>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {atribuicaoLabel[atribuicao] ?? atribuicao}
          {vara ? ` · ${vara}` : ""}
        </span>
      </div>

      {/* Assistidos — chips grandes, clicáveis, sem badge "Solto" (só marca se Preso) */}
      <div className="flex flex-wrap gap-2.5 mb-5">
        {assistidos.map((a) => {
          const preso = PRESOS.includes(a.statusPrisional ?? "");
          return (
            <Link key={a.id} href={`/admin/assistidos/${a.id}`}>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                ${preso
                  ? "border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-950/10"
                  : "border-zinc-200 dark:border-zinc-700/50 hover:border-emerald-300 dark:hover:border-emerald-700"
                }
                hover:shadow-sm`}>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{a.nome}</span>
                {preso && (
                  <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                    PRESO
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Próxima audiência — só aparece se existir, destaque proporcional à urgência */}
      {proximaAudiencia && diasAteAudiencia !== null && (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-5 ${
          diasAteAudiencia < 3
            ? "bg-red-50 dark:bg-red-950/15 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-800/30"
            : diasAteAudiencia < 7
            ? "bg-amber-50 dark:bg-amber-950/15 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/30"
            : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
        }`}>
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{proximaAudiencia.tipo}</span>
          <span className="text-sm">
            {format(new Date(proximaAudiencia.data), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
          </span>
          <span className="text-xs opacity-60">
            ({diasAteAudiencia === 0 ? "hoje" : diasAteAudiencia === 1 ? "amanhã" : `em ${diasAteAudiencia} dias`})
          </span>
        </div>
      )}

      {/* Botões Cowork — compactos, só 3 principais */}
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
  );
}
