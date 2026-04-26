"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabOficios({ casoId }: Props) {
  const { data = [], isLoading } = trpc.oficios.listByCaso.useQuery({ casoId });

  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-base font-semibold mb-3">Ofícios ({data.length})</h3>
      {data.length === 0 && (
        <p className="text-xs italic text-neutral-400">Nenhum ofício vinculado a este caso.</p>
      )}
      {data.map((o) => {
        const meta = o.metadata as Record<string, string> | null;
        const status = meta?.status ?? "—";
        const tipoOficio = meta?.tipoOficio;
        return (
          <div key={o.id} className="rounded border px-3 py-2 text-sm">
            <div className="font-medium">{o.titulo ?? o.modeloTitulo ?? `Ofício #${o.id}`}</div>
            <div className="text-xs text-neutral-500 mt-0.5 flex gap-2 flex-wrap">
              <span>{status}</span>
              {tipoOficio && <span>· {tipoOficio}</span>}
              {o.processoNumero && <span>· {o.processoNumero}</span>}
              {o.googleDocUrl && (
                <a
                  href={o.googleDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline"
                >
                  abrir
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
