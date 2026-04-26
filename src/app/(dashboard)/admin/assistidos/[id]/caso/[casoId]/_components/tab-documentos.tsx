"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabDocumentos({ casoId }: Props) {
  const { data, isLoading } = trpc.documents.listByCaso.useQuery({ casoId });

  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;

  const list = data ?? [];

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-base font-semibold mb-3">Documentos ({list.length})</h3>
      {list.length === 0 && (
        <p className="text-xs italic text-neutral-400">Nenhum documento vinculado a este caso.</p>
      )}
      {list.map((d) => (
        <a
          key={d.id}
          href={d.fileUrl ?? "#"}
          target={d.fileUrl ? "_blank" : undefined}
          rel="noreferrer"
          className="block rounded border px-3 py-2 text-sm hover:border-emerald-400"
        >
          <div className="font-medium">{d.titulo ?? d.fileName ?? `Doc #${d.id}`}</div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {d.categoria ?? ""}{d.tipoPeca ? ` · ${d.tipoPeca}` : ""}
          </div>
        </a>
      ))}
    </div>
  );
}
