"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

interface Props {
  currentUserId: number;
  role: string;
}

export function TriagemList({ currentUserId, role }: Props) {
  const isAdmin = role === "admin" || role === "servidor";
  const utils = trpc.useUtils();

  const { data: demandas, isLoading } = trpc.demandas.list.useQuery(
    {
      status: "5_TRIAGEM",
      defensorId: isAdmin ? undefined : currentUserId,
      limit: 200,
    },
    { staleTime: 5_000 },
  );

  const update = trpc.demandas.update.useMutation({
    onSuccess: () => {
      utils.demandas.list.invalidate();
      toast.success("Demanda atualizada");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="text-sm text-neutral-500 py-8 text-center">Carregando…</div>;
  }
  if (!demandas || demandas.length === 0) {
    return (
      <div className="text-sm text-neutral-400 py-12 text-center border border-dashed rounded">
        Nenhuma demanda em triagem.
      </div>
    );
  }

  return (
    <div className="border rounded-lg divide-y bg-white dark:bg-neutral-900">
      {demandas.map((d: any) => (
        <div
          key={d.id}
          className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
        >
          <div className="min-w-0 flex-1 mr-4">
            <Link
              href={`/admin/demandas/${d.id}`}
              className="text-sm font-medium hover:text-emerald-600 truncate block"
            >
              {d.ato || "Sem ato"}
            </Link>
            <div className="text-xs text-neutral-500 mt-0.5 flex gap-2">
              {d.prazo && <span>prazo: {new Date(d.prazo).toLocaleDateString("pt-BR")}</span>}
              {d.prioridade && d.prioridade !== "NORMAL" && (
                <span className="text-amber-600">{d.prioridade}</span>
              )}
              {d.reuPreso && <span className="text-red-600">réu preso</span>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="default"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({
                  id: d.id,
                  status: "2_ATENDER",
                })
              }
            >
              Assumir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={update.isPending}
              onClick={() =>
                update.mutate({
                  id: d.id,
                  status: "ARQUIVADO",
                })
              }
            >
              Arquivar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
