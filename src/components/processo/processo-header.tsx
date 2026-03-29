// src/components/processo/processo-header.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowLeft, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TYPO, COLORS, prisaoColor } from "@/lib/config/design-tokens";
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
  const router = useRouter();

  const diasAteAudiencia = proximaAudiencia
    ? differenceInDays(new Date(proximaAudiencia.data), new Date())
    : null;

  const audienciaUrgency =
    diasAteAudiencia !== null && diasAteAudiencia < 3 ? "ALTA" :
    diasAteAudiencia !== null && diasAteAudiencia < 7 ? "MEDIA" : "BAIXA";

  const atribuicaoLabel: Record<string, string> = {
    JURI_CAMACARI: "Júri",
    VVD_CAMACARI: "VVD",
    EXECUCAO_PENAL: "EP",
    SUBSTITUICAO: "Substituição",
  };

  return (
    <div className="px-6 pt-4 pb-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </button>

      {/* Número do processo */}
      <h1 className={`${TYPO.mono} text-xl`}>{numeroAutos}</h1>

      {/* Assistidos como chips */}
      <div className="flex flex-wrap gap-2">
        {assistidos.map((a) => {
          const preso = PRESOS.includes(a.statusPrisional ?? "");
          const colors = prisaoColor(preso);
          return (
            <Link key={a.id} href={`/admin/assistidos/${a.id}`}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border
                ${preso ? "border-red-200 dark:border-red-800" : "border-zinc-200 dark:border-zinc-700"}
                hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors`}>
                <span className="text-sm font-medium">{a.nome}</span>
                <Badge variant={preso ? "danger" : "success"} className="text-[10px]">
                  {preso ? "Preso" : "Solto"}
                </Badge>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Vara · Comarca · Atribuição */}
      <p className={TYPO.body + " text-muted-foreground"}>
        {atribuicaoLabel[atribuicao] ?? atribuicao}
        {vara ? ` · ${vara}` : ""}
        {comarca ? ` · ${comarca}` : ""}
      </p>

      {/* Próxima audiência */}
      {proximaAudiencia && diasAteAudiencia !== null && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          audienciaUrgency === "ALTA" ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400" :
          audienciaUrgency === "MEDIA" ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400" :
          "bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
        }`}>
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-medium">{proximaAudiencia.tipo}</span>
          <span className="text-sm">
            — {format(new Date(proximaAudiencia.data), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </span>
          <span className="text-xs text-muted-foreground">
            (em {diasAteAudiencia} dia{diasAteAudiencia !== 1 ? "s" : ""})
          </span>
        </div>
      )}

      {/* Botões Cowork */}
      <CoworkActionGroup
        assistidoNome={assistidos[0]?.nome ?? ""}
        numeroAutos={numeroAutos}
        classeProcessual={classeProcessual ?? ""}
        vara={vara ?? ""}
        atribuicao={atribuicao}
        drivePath=""
        actions={
          atribuicao === "JURI_CAMACARI"
            ? ["analise-autos", "gerar-peca", "preparar-audiencia", "analise-juri", "feedback-estagiario"]
            : ["analise-autos", "gerar-peca", "preparar-audiencia", "feedback-estagiario"]
        }
      />
    </div>
  );
}
