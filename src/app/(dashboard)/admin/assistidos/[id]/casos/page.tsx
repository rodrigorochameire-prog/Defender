"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Briefcase, Plus } from "lucide-react";

export default function CasosListPage() {
  const params = useParams();
  const assistidoId = Number(params?.id);
  const { data: casos = [], isLoading } = trpc.casos.getCasosDoAssistido.useQuery(
    { assistidoId }, { enabled: !isNaN(assistidoId) }
  );

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;

  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Casos ({casos.length})</h2>
        <Link
          href={`/admin/assistidos/${assistidoId}/casos/novo`}
          className="flex items-center gap-1 px-3 py-1.5 rounded border text-xs cursor-pointer hover:border-emerald-400"
        >
          <Plus className="w-3 h-3" /> Novo caso
        </Link>
      </div>
      {casos.length === 0 && <p className="italic text-neutral-400">Nenhum caso cadastrado.</p>}
      <div className="grid gap-2">
        {casos.map((c: any) => (
          <Link
            key={c.id}
            href={`/admin/assistidos/${assistidoId}/caso/${c.id}`}
            className="rounded border px-4 py-3 hover:border-emerald-400 flex items-start gap-3"
          >
            <Briefcase className="w-4 h-4 mt-0.5 text-neutral-500" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{c.titulo}</div>
              <div className="text-xs text-neutral-500 mt-0.5 flex gap-2 flex-wrap">
                <span>{c.status}</span>
                {c.fase && <span>· {c.fase}</span>}
                {c.prioridade && <span>· {c.prioridade}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
