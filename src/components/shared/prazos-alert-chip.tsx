"use client";

/**
 * PrazosAlertChip — alerta proativo de prazos no cabeçalho. Mostra, de forma
 * compacta e sempre visível, quantos prazos estão vencidos / vencendo hoje, e
 * sinaliza réu preso com prazo vencido (o caso mais grave). Some quando não há
 * urgência. Lê de `prazos.estatisticasPrazos`; lógica em `alert-summary`.
 */

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { summarizePrazos, type PrazosTone } from "@/lib/prazos/alert-summary";

const TONE: Record<PrazosTone, string> = {
  danger:
    "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/50",
  warning:
    "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50",
  muted:
    "bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700",
};

interface PrazosAlertChipProps {
  className?: string;
}

export function PrazosAlertChip({ className }: PrazosAlertChipProps) {
  const { data } = trpc.prazos.estatisticasPrazos.useQuery(undefined, {
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  const m = summarizePrazos(data);
  // Só aparece quando há algo a fazer (vencidos/hoje) ou réu preso vencido.
  if (!m.hasUrgent && m.reuPresoVencido === 0) return null;

  return (
    <Link
      href="/admin/demandas"
      title="Prazos que exigem atenção — abrir Demandas"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors",
        TONE[m.tone],
        className,
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>{m.label || "Prazos"}</span>
      {m.reuPresoVencido > 0 && (
        <span className="rounded-full bg-rose-600/90 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white">
          réu preso {m.reuPresoVencido}
        </span>
      )}
    </Link>
  );
}
