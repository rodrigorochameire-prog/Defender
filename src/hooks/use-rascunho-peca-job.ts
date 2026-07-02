"use client";

/**
 * useRascunhoPecaJob — dispara o Rascunho Guiado de Peça (Fase 2c.2/B) de uma
 * demanda: enfileira a geração da peça (skill gerar-peca) na lane ai a partir
 * das linhas mestras informadas pelo defensor. Espelha o padrão de
 * useAnaliseProfundaJob (gatilho + poll de status + invalidação do kanban).
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export function useRascunhoPecaJob() {
  const utils = trpc.useUtils();
  const [demandaId, setDemandaId] = useState<number | null>(null);

  const criar = trpc.rascunhoPeca.criar.useMutation({
    onSuccess: (res) => {
      toast.success(res.existing ? "Rascunho de peça já em andamento." : "Rascunho de peça iniciado.");
    },
    onError: (e) => {
      toast.error(e.message);
      setDemandaId(null);
    },
  });

  const statusQuery = trpc.rascunhoPeca.status.useQuery(
    { demandaId: demandaId ?? 0 },
    {
      enabled: demandaId != null,
      refetchInterval: (q) => {
        const s = q.state.data?.status;
        return s === "rascunhando" ? 4000 : false;
      },
    },
  );

  useEffect(() => {
    const s = statusQuery.data?.status;
    if (s === "pronto") {
      toast.success("Rascunho de peça concluído.");
      void utils.demandas.list.invalidate();
      setDemandaId(null);
    } else if (s === "erro") {
      toast.error(statusQuery.data?.erro ?? "Falha ao gerar o rascunho de peça.");
      setDemandaId(null);
    }
  }, [statusQuery.data?.status, statusQuery.data?.erro, utils]);

  const iniciar = (id: number, linhasMestras: string) => {
    setDemandaId(id);
    criar.mutate({ demandaId: id, linhasMestras });
  };

  return {
    iniciar,
    status: statusQuery.data?.status ?? null,
    driveUrl: statusQuery.data?.driveUrl ?? null,
    isRunning: demandaId != null,
  };
}
