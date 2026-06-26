"use client";

/**
 * VarreduraTriggerModal — gatilho 1-clique da Varredura Nível 2 (leitura profunda
 * da triagem no PJe). Enfileira `criarVarreduraJob` (lane browser, skill
 * varredura-triagem), avisa por toast e acompanha o progresso por poll de
 * `statusVarredura`. Ao concluir, invalida o kanban de demandas. Espelha o
 * visual de IntimacoesImportModal. NÃO altera status das demandas — o worker só
 * enriquece ato/fase/motivo/registro/audiência.
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ATRIBUICOES = [
  { value: "VVD_CAMACARI", label: "Violência Doméstica (Camaçari)" },
  { value: "JURI_CAMACARI", label: "Júri" },
] as const;

type AtribValue = (typeof ATRIBUICOES)[number]["value"];

export function VarreduraTriggerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [selecionadas, setSelecionadas] = useState<AtribValue[]>([
    "VVD_CAMACARI",
  ]);
  const [since, setSince] = useState("");
  // jobId em poll após enfileirar — acompanha o progresso e invalida o kanban
  // quando a varredura conclui. Poll roda mesmo com o modal fechado.
  const [jobId, setJobId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelecionadas(["VVD_CAMACARI"]);
      setSince("");
    }
  }, [isOpen]);

  const criar = trpc.intimacoes.criarVarreduraJob.useMutation({
    onSuccess: (res) => {
      if (res?.existing) {
        toast.info("Já há uma análise de triagem em andamento");
      } else {
        toast.success("Análise iniciada", {
          description:
            "O daemon do navegador vai ler os autos — o kanban atualiza ao concluir.",
        });
      }
      const primeiro = res?.taskIds?.[0];
      if (typeof primeiro === "number") setJobId(primeiro);
      onClose();
    },
    onError: (e) => toast.error("Erro ao iniciar análise: " + e.message),
  });

  // Poll do status enquanto pendente/processando. Em React Query v5 o
  // refetchInterval recebe a query e lê o último dado de query.state.data.
  const { data: status } = trpc.intimacoes.statusVarredura.useQuery(
    { jobId: jobId ?? 0 },
    {
      enabled: jobId != null,
      refetchInterval: (query) => {
        const s = query.state.data?.status;
        return s === "pending" || s === "processing" ? 4000 : false;
      },
    },
  );

  // Reage à conclusão/falha do job: avisa e, em sucesso, invalida o kanban.
  useEffect(() => {
    if (jobId == null || !status) return;
    if (status.status === "completed") {
      toast.success("Análise da triagem concluída");
      utils.demandas.list.invalidate();
      setJobId(null);
    } else if (status.status === "failed") {
      toast.error("A análise da triagem falhou");
      setJobId(null);
    }
  }, [jobId, status, utils]);

  const toggle = (v: AtribValue) =>
    setSelecionadas((s) =>
      s.includes(v) ? s.filter((x) => x !== v) : [...s, v],
    );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md bg-white dark:bg-neutral-900">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
            Analisar triagem (leitura profunda)
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400 dark:text-neutral-500">
            Lê o corpo dos autos no PJe e preenche ato, fase, motivo e registros.
            Não altera o status das demandas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Atribuições */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Atribuição
            </p>
            {ATRIBUICOES.map((a) => (
              <label
                key={a.value}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selecionadas.includes(a.value)}
                  onChange={() => toggle(a.value)}
                  className="rounded"
                />
                {a.label}
              </label>
            ))}
          </div>

          {/* Início opcional (since) */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              A partir de (opcional)
            </span>
            <input
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              Sem data, analisa toda a triagem da atribuição.
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 px-4 text-sm border-neutral-300 dark:border-neutral-700 cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            disabled={selecionadas.length === 0 || criar.isPending}
            onClick={() =>
              criar.mutate({
                atribuicoes: selecionadas,
                since: since || undefined,
              })
            }
            className="h-9 px-4 text-sm bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 cursor-pointer"
          >
            {criar.isPending ? "Iniciando…" : "Analisar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
