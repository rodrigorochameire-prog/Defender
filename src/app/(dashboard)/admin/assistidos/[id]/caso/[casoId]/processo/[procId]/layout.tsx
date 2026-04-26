"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NIVEL_3_TABS = [
  { key: "dados",       label: "Dados CNJ" },
  { key: "andamentos",  label: "Andamentos" },
  { key: "documentos",  label: "Documentos específicos" },
];

export default function ProcessoTecnicoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const assistidoId = Number(params?.id);
  const casoId = Number(params?.casoId);
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

  const base = `/admin/assistidos/${assistidoId}/caso/${casoId}/processo/${procId}`;
  const sub = pathname.replace(base, "").replace(/^\//, "").split("/")[0];
  const activeKey = sub === "" ? "dados" : sub;

  return (
    <div className="flex flex-col">
      {/* Header com toggle */}
      <div className="border-b px-6 py-2 bg-neutral-100 dark:bg-neutral-900 flex items-center gap-3 text-xs flex-wrap">
        <span className="font-mono">#{(processo as any)?.numeroAutos ?? procId}</span>
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

      {/* Tab-bar Nível 3 */}
      <nav className="border-b px-6 flex gap-1 bg-white dark:bg-neutral-950">
        {NIVEL_3_TABS.map((t) => {
          const href = t.key === "dados" ? base : `${base}/${t.key}`;
          const isActive = activeKey === t.key;
          return (
            <Link
              key={t.key}
              href={href}
              className={cn(
                "px-3 py-1.5 text-xs border-b-2",
                isActive ? "border-emerald-500 text-emerald-700 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-700",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
