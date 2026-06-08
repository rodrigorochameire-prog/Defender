"use client";

import { trpc } from "@/lib/trpc/client";
import { MedidasVigentesPanel } from "@/components/mpu/medidas-vigentes-panel";

interface Props { casoId: number; }

export function TabMpu({ casoId }: Props) {
  const { data: procs = [], isLoading } = trpc.processos.listByCaso.useQuery({ casoId });
  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  const list = procs as any[];
  const procRef = list.find((p) => p.isReferencia) ?? list[0];
  if (!procRef) {
    return <p className="p-4 italic text-neutral-400">Nenhum processo no caso.</p>;
  }
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Medidas protetivas (MPU)</h3>
        <a
          href={`/admin/processos/${procRef.id}?raw=1`}
          className="text-xs text-neutral-500 underline-offset-2 hover:underline"
        >
          Vista técnica →
        </a>
      </div>
      <MedidasVigentesPanel processoId={procRef.id} />
    </div>
  );
}
