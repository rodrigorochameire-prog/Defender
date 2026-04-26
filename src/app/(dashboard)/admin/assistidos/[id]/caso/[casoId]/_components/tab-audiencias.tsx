"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabAudiencias({ casoId }: Props) {
  const { data = [], isLoading } = trpc.audiencias.listByCaso.useQuery({ casoId });

  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;

  const list = data;

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-base font-semibold mb-3">Audiências ({list.length})</h3>
      {list.length === 0 && (
        <p className="text-xs italic text-neutral-400">Nenhuma audiência agendada.</p>
      )}
      {list.map((a) => (
        <div key={a.id} className="rounded border px-3 py-2 text-sm">
          <div className="font-medium">{a.titulo ?? a.tipo ?? `Audiência #${a.id}`}</div>
          <div className="text-xs text-neutral-500 mt-0.5 flex gap-2">
            <span>
              {a.dataHora
                ? new Date(a.dataHora).toLocaleString("pt-BR")
                : "—"}
            </span>
            <span>· {a.status ?? "agendada"}</span>
            {a.local && <span>· {a.local}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
