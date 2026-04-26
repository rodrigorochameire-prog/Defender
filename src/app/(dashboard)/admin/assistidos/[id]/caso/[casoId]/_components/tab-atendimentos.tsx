"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabAtendimentos({ casoId }: Props) {
  const { data = [], isLoading } = trpc.atendimentos.listByCaso.useQuery({ casoId });

  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-base font-semibold mb-3">Atendimentos ({data.length})</h3>
      {data.length === 0 && (
        <p className="text-xs italic text-neutral-400">Nenhum atendimento vinculado a este caso.</p>
      )}
      {data.map((a) => (
        <div key={a.id} className="rounded border px-3 py-2 text-sm">
          <div className="font-medium flex gap-2 items-center">
            <span>{new Date(a.dataAtendimento).toLocaleDateString("pt-BR")}</span>
            {a.tipo && <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">{a.tipo}</span>}
            {a.status && <span className="text-xs text-neutral-500">{a.status}</span>}
          </div>
          {a.assunto && (
            <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{a.assunto}</div>
          )}
          {a.resumo && (
            <p className="text-xs text-neutral-500 mt-1 line-clamp-3">{a.resumo}</p>
          )}
          {a.duracao && (
            <div className="text-xs text-neutral-400 mt-0.5">{a.duracao} min</div>
          )}
        </div>
      ))}
    </div>
  );
}
