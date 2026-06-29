"use client";

/**
 * useVarreduraJob — extração DRY do padrão de gatilho/poll da Varredura Nível 2
 * (leitura profunda da triagem no PJe), provado em VarreduraTriggerModal.
 * Dispara `criarVarreduraJob({ demandaIds })`, acompanha o progresso por poll de
 * `statusVarredura` e invalida o kanban (`demandas.list`) quando o daemon conclui.
 * Reusado pelo card de demanda e pela barra de seleção em massa.
 */

import { useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export function useVarreduraJob() {
  const utils = trpc.useUtils();
  const [jobId, setJobId] = useState<number | null>(null);

  const criar = trpc.intimacoes.criarVarreduraJob.useMutation({
    onSuccess: (res) => {
      if (res?.existing) {
        toast.info("Já há uma análise em andamento");
      } else {
        toast.success("Análise iniciada", {
          description: "O daemon vai ler os autos — o kanban atualiza ao concluir.",
        });
        const first = res?.taskIds?.[0];
        if (typeof first === "number") setJobId(first);
      }
    },
    onError: (e) => toast.error("Erro ao iniciar análise: " + e.message),
  });

  // Mesmo padrão do VarreduraTriggerModal: o `data` do useQuery dirige o efeito.
  const { data: status } = trpc.intimacoes.statusVarredura.useQuery(
    { jobId: jobId ?? 0 },
    {
      enabled: jobId != null,
      refetchInterval: (q) => {
        const s = q.state.data?.status;
        return s === "pending" || s === "processing" ? 4000 : false;
      },
    },
  );

  useEffect(() => {
    if (jobId == null || !status) return;
    if (status.status === "completed") {
      toast.success("Análise concluída");
      utils.demandas.list.invalidate();
      setJobId(null);
    } else if (status.status === "failed") {
      toast.error("A análise falhou");
      setJobId(null);
    }
  }, [jobId, status, utils]);

  const analisar = useCallback(
    (demandaIds: number[]) => criar.mutate({ demandaIds }),
    [criar],
  );

  return { analisar, isPending: criar.isPending, isRunning: jobId != null };
}
