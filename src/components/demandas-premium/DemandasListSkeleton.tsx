"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton da lista de demandas (Fase 7.1) — espelha a anatomia do card
 * (avatar + identidade + status, providências, rodapé de ações) enquanto a
 * query carrega. Antes a lista não tinha estado de carregamento (pop-in seco).
 */
export function DemandasListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      aria-busy="true"
      aria-label="Carregando demandas"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          data-testid="demanda-skeleton-card"
          className="rounded-xl ring-1 ring-neutral-200/70 dark:ring-neutral-800 p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-lg flex-shrink-0" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
