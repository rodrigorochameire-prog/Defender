"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function DocumentosEspecificosPage() {
  const params = useParams();
  const procId = Number(params?.procId);

  const { data, isLoading } = trpc.documents.byProcesso.useQuery(
    { processoId: procId },
    { enabled: !isNaN(procId) }
  );

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;
  const list = (data as any[]) ?? [];

  return (
    <div className="p-6 space-y-2">
      <h2 className="text-base font-semibold mb-3">Documentos deste autos ({list.length})</h2>
      {list.length === 0 && (
        <p className="text-xs italic text-neutral-400">Nenhum documento vinculado a este processo específico.</p>
      )}
      {list.map((d: any) => (
        <a
          key={d.id}
          href={d.fileUrl ?? d.url ?? d.googleDocUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="block rounded border px-3 py-2 text-sm hover:border-emerald-400"
        >
          <div className="font-medium">{d.titulo ?? d.fileName ?? d.nome ?? `Doc #${d.id}`}</div>
          <div className="text-xs text-neutral-500 mt-0.5">{d.categoria ?? d.tipoPeca ?? d.tipo ?? ""}</div>
        </a>
      ))}
    </div>
  );
}
