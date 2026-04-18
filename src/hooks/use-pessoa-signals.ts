"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import type { IntelSignal } from "@/lib/pessoas/compute-dot-level";

/**
 * Hook batch-lookup de IntelSignals por pessoaId.
 * Cliente agrupa todos os chips de uma página em uma única query.
 * Cache tRPC per-session.
 */
export function usePessoaSignals(pessoaIds: Array<number | null | undefined>): {
  getSignal: (id: number | null | undefined) => IntelSignal | null;
  isLoading: boolean;
} {
  const uniqueIds = useMemo(() => {
    return Array.from(new Set(pessoaIds.filter((id): id is number => typeof id === "number")));
  }, [pessoaIds]);

  const { data, isLoading } = trpc.pessoas.getBatchSignals.useQuery(
    { pessoaIds: uniqueIds },
    { enabled: uniqueIds.length > 0, staleTime: 5 * 60 * 1000 },
  );

  const map = useMemo(() => {
    const m = new Map<number, IntelSignal>();
    for (const s of data ?? []) m.set(s.pessoaId, s as IntelSignal);
    return m;
  }, [data]);

  return {
    getSignal: (id) => (typeof id === "number" ? map.get(id) ?? null : null),
    isLoading,
  };
}
