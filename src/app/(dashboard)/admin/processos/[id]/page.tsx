"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc/client";

export default function ProcessoPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const raw = sp?.get("raw") === "1";
  const id = Number(params?.id);

  const { data: processo, isLoading: loadingProc, error } = trpc.processos.getById.useQuery(
    { id }, { enabled: !isNaN(id), retry: false }
  );

  const { data: caso } = trpc.casos.getCasoById.useQuery(
    { id: processo?.casoId ?? 0 },
    { enabled: !!processo?.casoId && !raw },
  );

  useEffect(() => {
    if (raw || loadingProc || !processo) return;
    if (caso?.assistidoId && processo.casoId) {
      router.replace(`/admin/assistidos/${caso.assistidoId}/caso/${processo.casoId}/processo/${id}`);
    }
  }, [raw, loadingProc, processo, caso, id, router]);

  if (loadingProc) return <p className="p-6 italic text-neutral-400">Carregando…</p>;
  if (error || !processo) return <p className="p-6">Processo não encontrado.</p>;

  return (
    <div className="p-6 space-y-3 max-w-3xl">
      <h1 className="text-lg font-semibold">Processo #{id}</h1>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-neutral-500">Número</dt><dd className="font-mono">{processo.numeroAutos ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Área</dt><dd>{processo.area}</dd></div>
        <div><dt className="text-xs text-neutral-500">Vara</dt><dd>{processo.vara ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Parte contrária</dt><dd>{processo.parteContraria ?? "—"}</dd></div>
      </dl>
      {!raw && !processo.casoId && (
        <p className="text-xs italic text-amber-600">Processo sem caso vinculado — vista standalone.</p>
      )}
    </div>
  );
}
