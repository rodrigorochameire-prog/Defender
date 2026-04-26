"use client";

import { trpc } from "@/lib/trpc/client";
import { MarcosBlock } from "./marcos-block";
import { PrisoesBlock } from "./prisoes-block";
import { CautelaresBlock } from "./cautelares-block";

interface Props {
  processoId: number;
}

export function CronologiaTab({ processoId }: Props) {
  const { data, isLoading, refetch } = trpc.cronologia.getCronologiaCompleta.useQuery({ processoId });

  if (isLoading) return <p className="p-4 text-sm italic text-neutral-400">Carregando…</p>;

  const marcos = data?.marcos ?? [];
  const prisoes = data?.prisoes ?? [];
  const cautelares = data?.cautelares ?? [];

  return (
    <div className="p-4 space-y-6">
      <MarcosBlock processoId={processoId} marcos={marcos} onRefresh={refetch} />
      <PrisoesBlock processoId={processoId} prisoes={prisoes} onRefresh={refetch} />
      <CautelaresBlock processoId={processoId} cautelares={cautelares} onRefresh={refetch} />
    </div>
  );
}
