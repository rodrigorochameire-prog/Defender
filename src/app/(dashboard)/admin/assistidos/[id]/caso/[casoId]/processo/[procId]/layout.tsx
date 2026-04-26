"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export default function ProcessoTecnicoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const procId = Number(params?.procId);

  const { data: processo, refetch } = trpc.processos.getById.useQuery(
    { id: procId }, { enabled: !isNaN(procId) }
  );

  const utils = trpc.useUtils();
  const setRefMut = trpc.casos.setReferenciaProcesso.useMutation({
    onSuccess: () => {
      toast.success("Processo marcado como referência");
      refetch();
      utils?.processos?.listByCaso?.invalidate?.();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col">
      <div className="border-b px-6 py-2 bg-neutral-100 dark:bg-neutral-900 flex items-center gap-3 text-xs flex-wrap">
        <span className="font-mono">
          #{(processo as any)?.numeroAutos ?? procId}
        </span>
        <span className="text-neutral-500">·</span>
        <span>{processo?.area ?? "—"}</span>
        <span className="text-neutral-500">·</span>
        {(processo as any)?.isReferencia ? (
          <span className="font-medium text-emerald-700 dark:text-emerald-400">★ referência do caso</span>
        ) : (
          <button
            type="button"
            onClick={() => setRefMut.mutate({ processoId: procId })}
            disabled={setRefMut.isPending}
            className="px-2 py-0.5 rounded border text-[10px] cursor-pointer hover:border-emerald-400"
          >
            {setRefMut.isPending ? "Marcando…" : "Marcar como referência"}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
