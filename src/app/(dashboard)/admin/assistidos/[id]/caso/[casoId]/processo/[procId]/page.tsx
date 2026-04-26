"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function ProcessoTecnicoPage() {
  const params = useParams();
  const procId = Number(params?.procId);
  const { data: processo, isLoading } = trpc.processos.getById.useQuery(
    { id: procId }, { enabled: !isNaN(procId) }
  );

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;
  if (!processo) return <p className="p-6">Processo não encontrado.</p>;
  const p = processo as any;

  return (
    <div className="p-6 space-y-3">
      <h2 className="text-base font-semibold">Dados técnicos</h2>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-neutral-500">Número</dt><dd className="font-mono">{p.numeroAutos ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Área</dt><dd>{processo.area}</dd></div>
        <div><dt className="text-xs text-neutral-500">Vara</dt><dd>{p.vara ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Parte contrária</dt><dd>{p.parteContraria ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Classe</dt><dd>{p.classe ?? "—"}</dd></div>
        <div><dt className="text-xs text-neutral-500">Status</dt><dd>{p.status ?? "—"}</dd></div>
      </dl>
      <p className="text-xs italic text-neutral-400 mt-3">
        Abas técnicas (Andamentos, Documentos específicos) entram em X-γ Task 12.
      </p>
    </div>
  );
}
