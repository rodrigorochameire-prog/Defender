"use client";

import { trpc } from "@/lib/trpc/client";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

/**
 * Indicador de conflitos de sincronização — apenas quando há pelo menos 1
 * pendente. Pequeno e neutro: ícone + número, sem badge cheia, pra não
 * competir com sinais mais críticos da topbar.
 */
export function ConflictBadge() {
  const { data: count } = trpc.sync.conflictCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (!count || count === 0) return null;

  return (
    <Link
      href="/conflitos"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
      title={`${count} conflito${count > 1 ? "s" : ""} de sincronização`}
    >
      <AlertTriangle className="h-3 w-3 text-orange-500/80" />
      <span className="tabular-nums">{count}</span>
    </Link>
  );
}
