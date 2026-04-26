"use client";

import { trpc } from "@/lib/trpc/client";
import { PessoaChip } from "@/components/pessoas";

interface Props { casoId: number; }

export function TabPessoas({ casoId }: Props) {
  const { data = [], isLoading } = trpc.pessoas.getParticipacoesDoCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  const list = data as any[];

  // Group by papel
  const byPapel = new Map<string, any[]>();
  for (const p of list) {
    const arr = byPapel.get(p.papel) ?? [];
    arr.push(p);
    byPapel.set(p.papel, arr);
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-base font-semibold mb-3">Pessoas do caso ({list.length})</h3>
      {list.length === 0 && <p className="text-xs italic text-neutral-400">Nenhuma pessoa vinculada.</p>}
      {[...byPapel.entries()].map(([papel, items]) => (
        <section key={papel}>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">{papel.replace(/-/g, " ")}</h4>
          <div className="flex flex-wrap gap-2">
            {items.map((p: any) => (
              <PessoaChip
                key={p.id}
                pessoaId={p.pessoaId}
                nome={p.pessoaNome ?? `#${p.pessoaId}`}
                papel={p.papel}
                size="sm"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
