"use client";

import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ProcessoTab } from "@/components/processo/ProcessoTab";

interface Props {
  casoId: number;
  assistidoId: number;
}

/**
 * Aba "Processos" do caso (Nível 2). Reaproveita o ProcessoTab (índice de peças
 * + preview), escopado aos processos deste caso.
 */
export function TabProcessos({ casoId, assistidoId }: Props) {
  const { data: procs = [], isLoading } = trpc.processos.listByCaso.useQuery({ casoId });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const processos = procs.map((p) => ({
    id: p.id,
    numeroAutos: p.numeroAutos ?? null,
    tipoProcesso: p.tipoProcesso ?? null,
    isReferencia: p.isReferencia ?? null,
  }));

  return <ProcessoTab assistidoId={assistidoId} processos={processos} />;
}
