"use client";

import { useMemo } from "react";
import { MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

const MS_DIA = 86_400_000;

function relativo(d: Date): string {
  const dias = Math.floor((Date.now() - d.getTime()) / MS_DIA);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias <= 30) return `há ${dias}d`;
  const meses = Math.floor(dias / 30);
  return `há ${meses}m`;
}

/**
 * Chip "último contato" — busca o atendimento mais recente do assistido e mostra
 * quando foi. Sinaliza em âmbar quando faz mais de 30 dias (assistido "frio").
 */
export function UltimoContato({ assistidoId }: { assistidoId: number }) {
  const { data } = trpc.atendimentos.list.useQuery(
    { assistidoId, limit: 5 },
    { staleTime: 60_000 },
  );

  const ultimo = useMemo(() => {
    const items = (data?.items ?? []) as Array<{ atendimento?: { dataRegistro?: string | Date | null; tipo?: string | null } }>;
    let melhor: Date | null = null;
    let tipo: string | null = null;
    for (const it of items) {
      const raw = it.atendimento?.dataRegistro;
      if (!raw) continue;
      const dt = new Date(raw);
      if (Number.isNaN(dt.getTime())) continue;
      if (!melhor || dt > melhor) {
        melhor = dt;
        tipo = it.atendimento?.tipo ?? null;
      }
    }
    return melhor ? { data: melhor, tipo } : null;
  }, [data]);

  if (!ultimo) return null;
  const dias = Math.floor((Date.now() - ultimo.data.getTime()) / MS_DIA);
  const frio = dias > 30;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10.5px] ${frio ? "text-amber-600 dark:text-amber-400" : "text-neutral-500 dark:text-neutral-400"}`}
      title={ultimo.data.toLocaleString("pt-BR")}
    >
      <MessageSquare className="h-3 w-3" />
      último contato {relativo(ultimo.data)}
    </span>
  );
}
