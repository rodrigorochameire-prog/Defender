"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { MergePairCardLugar } from "@/components/lugares/merge-pair-card-lugar";

export default function MergeQueueLugares() {
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const { data, isLoading, refetch } = trpc.lugares.listDuplicates.useQuery({ limit, offset });

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;

  const items = data?.items ?? [];

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-lg font-semibold mb-4">Merge-queue · Lugares</h1>

      {items.length === 0 ? (
        <p className="italic text-neutral-400">Nenhum par candidato.</p>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <MergePairCardLugar
              key={`${p.aId}-${p.bId}`}
              aId={p.aId}
              bId={p.bId}
              aEndereco={p.aEndereco}
              bEndereco={p.bEndereco}
              onDone={() => refetch()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
