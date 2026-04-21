"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function CasoHubPage() {
  const params = useParams();
  const casoId = Number(params?.casoId);
  const { data: caso, isLoading } = trpc.casos.getCasoById.useQuery({ id: casoId }, { enabled: !isNaN(casoId) });

  if (isLoading) return <p className="p-6 italic text-neutral-400">Carregando…</p>;
  if (!caso) return <p className="p-6">Caso não encontrado.</p>;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-base font-semibold">{caso.titulo}</h2>
      {caso.teoriaFatos && (
        <section>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase">Teoria dos fatos</h3>
          <p className="text-sm mt-1 whitespace-pre-wrap">{caso.teoriaFatos}</p>
        </section>
      )}
      {caso.teoriaDireito && (
        <section>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase">Teoria do direito</h3>
          <p className="text-sm mt-1 whitespace-pre-wrap">{caso.teoriaDireito}</p>
        </section>
      )}
      {caso.foco && (
        <section>
          <h3 className="text-xs font-semibold text-neutral-500 uppercase">Foco</h3>
          <p className="text-sm mt-1">{caso.foco}</p>
        </section>
      )}
    </div>
  );
}
