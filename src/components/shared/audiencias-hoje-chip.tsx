"use client";

/**
 * AudienciasHojeChip — chip informativo no cabeçalho com as audiências de hoje.
 * Simétrico ao PrazosAlertChip: "X hoje" + a próxima no tooltip, link para a
 * página de Audiências. Some quando não há audiência hoje. Lê de
 * `audiencias.proximas`; lógica em `today-summary`.
 */

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { summarizeToday, type HearingLike } from "@/lib/audiencias/today-summary";

interface AudienciasHojeChipProps {
  className?: string;
}

export function AudienciasHojeChip({ className }: AudienciasHojeChipProps) {
  const { data } = trpc.audiencias.proximas.useQuery(
    { dias: 1 },
    { refetchOnWindowFocus: true, staleTime: 60_000 },
  );

  const s = summarizeToday(data as HearingLike[] | undefined, Date.now());
  if (s.count === 0) return null;

  return (
    <Link
      href="/admin/audiencias"
      title={s.proximaLabel ? `Próxima: ${s.proximaLabel}` : "Audiências de hoje"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition-colors",
        "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50",
        className,
      )}
    >
      <CalendarClock className="h-3.5 w-3.5 shrink-0" />
      <span>
        {s.count} hoje
      </span>
    </Link>
  );
}
