"use client";

import { trpc } from "@/lib/trpc/client";

interface Props { casoId: number; }

export function TabInstitutos({ casoId }: Props) {
  const { data: procs = [], isLoading } = trpc.processos.listByCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  const list = procs as any[];
  const procRef = list.find((p) => p.isReferencia) ?? list[0];
  if (!procRef) {
    return <p className="p-4 italic text-neutral-400">Nenhum processo no caso.</p>;
  }
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-base font-semibold">Institutos (ANPP, SURSIS, SUSPROC)</h3>
      <p className="text-sm text-neutral-500">
        Processo referência: <strong>#{procRef.id}</strong> ({procRef.area}).
      </p>
      <p className="text-xs italic text-neutral-400">
        Edição de institutos vive na vista técnica do processo.
      </p>
      <a
        href={`/admin/processos/${procRef.id}?raw=1`}
        className="inline-block px-3 py-1.5 rounded border text-xs cursor-pointer hover:border-emerald-400"
      >
        Abrir vista técnica →
      </a>
    </div>
  );
}
