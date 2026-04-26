"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabDemandas({ casoId }: Props) {
  const { data = [], isLoading } = trpc.demandas.listByCaso.useQuery({ casoId });

  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-base font-semibold mb-3">Demandas ({data.length})</h3>
      {data.length === 0 && (
        <p className="text-xs italic text-neutral-400">Nenhuma demanda vinculada a este caso.</p>
      )}
      {data.map((d) => (
        <div key={d.id} className="rounded border px-3 py-2 text-sm">
          <div className="font-medium">{d.ato ?? `Demanda #${d.id}`}</div>
          <div className="text-xs text-neutral-500 mt-0.5 flex gap-2">
            <span>{d.status ?? "—"}</span>
            {d.substatus && <span>· {d.substatus}</span>}
            {d.prazo && (
              <span>· prazo {new Date(d.prazo).toLocaleDateString("pt-BR")}</span>
            )}
            {d.prioridade && <span>· {d.prioridade}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
