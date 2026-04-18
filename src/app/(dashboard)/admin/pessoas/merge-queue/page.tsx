"use client";

import { trpc } from "@/lib/trpc/client";
import { MergePairCard } from "@/components/pessoas";
import { toast } from "sonner";

export default function MergeQueuePage() {
  const { data, isLoading, refetch } = trpc.pessoas.suggestMerges.useQuery({ limit: 50 });
  const merge = trpc.pessoas.merge.useMutation({
    onSuccess: () => { toast.success("Mescladas"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const markDistinct = trpc.pessoas.markAsDistinct.useMutation({
    onSuccess: () => { toast.success("Marcadas como distintas"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // suggestMerges no modo global retorna rows com { a, b, nome }
  const pairs: Array<{ a: number; b: number; nome?: string }> = Array.isArray(data) ? (data as any) : ((data as any)?.rows ?? []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Fila de duplicatas</h1>
        <p className="text-xs text-neutral-500 mt-1">Pares de pessoas com mesmo nome normalizado — confirme</p>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Carregando…</p>}
      {!isLoading && pairs.length === 0 && (
        <p className="text-sm text-neutral-400 italic">Nenhuma duplicata sugerida.</p>
      )}

      <div className="space-y-4">
        {pairs.map((row) => (
          <PairLoader
            key={`${row.a}-${row.b}`}
            aId={row.a}
            bId={row.b}
            onMerge={(args) => merge.mutate({ ...args, reason: "merge manual via queue" })}
            onDistinct={(args) => markDistinct.mutate(args)}
          />
        ))}
      </div>
    </div>
  );
}

function PairLoader({
  aId,
  bId,
  onMerge,
  onDistinct,
}: {
  aId: number;
  bId: number;
  onMerge: (args: { fromId: number; intoId: number }) => void;
  onDistinct: (args: { pessoaAId: number; pessoaBId: number }) => void;
}) {
  const a = trpc.pessoas.getById.useQuery({ id: aId });
  const b = trpc.pessoas.getById.useQuery({ id: bId });
  if (!a.data || !b.data) {
    return <div className="text-xs text-neutral-400 italic">Carregando par…</div>;
  }
  return (
    <MergePairCard
      pair={{ a: a.data.pessoa, b: b.data.pessoa }}
      onMerge={onMerge}
      onDistinct={onDistinct}
    />
  );
}
