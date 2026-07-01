"use client";

/**
 * useAnaliseProfundaJob — dispara a Análise Profunda (Fase 2c) de uma demanda:
 * baixa os autos via CDP e enfileira a análise completa na lane ai. Espelha o
 * padrão de useVarreduraJob (gatilho + poll de status + invalidação do kanban).
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export function useAnaliseProfundaJob() {
  const utils = trpc.useUtils();
  const [demandaId, setDemandaId] = useState<number | null>(null);

  const criar = trpc.analiseProfunda.criar.useMutation({
    onSuccess: (res) => {
      setDemandaId((prev) => prev ?? null);
      toast.success(res.existing ? "Análise profunda já em andamento." : "Análise profunda iniciada.");
    },
    onError: (e) => toast.error(e.message),
  });

  const statusQuery = trpc.analiseProfunda.status.useQuery(
    { demandaId: demandaId ?? 0 },
    {
      enabled: demandaId != null,
      refetchInterval: (q) => {
        const s = q.state.data?.status;
        return s === "baixando_autos" || s === "analisando" ? 4000 : false;
      },
    },
  );

  useEffect(() => {
    const s = statusQuery.data?.status;
    if (s === "concluida") {
      toast.success("Análise profunda concluída.");
      void utils.demandas.list.invalidate();
      setDemandaId(null);
    } else if (s === "erro") {
      toast.error(statusQuery.data?.erro ?? "Falha na análise profunda.");
      setDemandaId(null);
    }
  }, [statusQuery.data?.status, statusQuery.data?.erro, utils]);

  const iniciar = (id: number) => {
    setDemandaId(id);
    criar.mutate({ demandaId: id });
  };

  return {
    iniciar,
    status: statusQuery.data?.status ?? null,
    isRunning: demandaId != null,
  };
}
