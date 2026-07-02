"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Check, AlertCircle, Circle, FileText, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  computeProduzirPecaState,
  type StageState,
  type AnaliseStatus,
  type RascunhoStatus,
} from "./produzir-peca-state";

interface ProduzirPecaModalProps {
  demandaId: number | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

function StageIcon({ state }: { state: StageState }) {
  if (state === "ativo") return <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />;
  if (state === "feito") return <Check className="w-4 h-4 text-emerald-500" />;
  if (state === "erro") return <AlertCircle className="w-4 h-4 text-rose-500" />;
  return <Circle className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />;
}

export function ProduzirPecaModal({ demandaId, open, onOpenChange }: ProduzirPecaModalProps) {
  const utils = trpc.useUtils();
  const [linhasMestras, setLinhasMestras] = useState("");
  const [orchestrating, setOrchestrating] = useState(false);
  // Trava anti-duplo-disparo por execução (o efeito roda a cada poll).
  const fired = useRef({ analise: false, rascunho: false });

  const enabled = open && demandaId != null;

  const analiseQ = trpc.analiseProfunda.status.useQuery(
    { demandaId: demandaId ?? 0 },
    { enabled, refetchInterval: () => (open ? 4000 : false) },
  );
  const rascunhoQ = trpc.rascunhoPeca.status.useQuery(
    { demandaId: demandaId ?? 0 },
    { enabled, refetchInterval: () => (open ? 4000 : false) },
  );

  const analise = (analiseQ.data?.status ?? null) as AnaliseStatus;
  const rascunho = (rascunhoQ.data?.status ?? null) as RascunhoStatus;
  const driveUrl = rascunhoQ.data?.driveUrl ?? null;

  const criarAnalise = trpc.analiseProfunda.criar.useMutation({
    onSuccess: () => void utils.analiseProfunda.status.invalidate({ demandaId: demandaId ?? 0 }),
    onError: (e) => {
      toast.error(e.message);
      setOrchestrating(false);
    },
  });
  const criarRascunho = trpc.rascunhoPeca.criar.useMutation({
    onSuccess: () => void utils.rascunhoPeca.status.invalidate({ demandaId: demandaId ?? 0 }),
    onError: (e) => {
      toast.error(e.message);
      setOrchestrating(false);
    },
  });

  const st = computeProduzirPecaState(analise, rascunho, { orchestrating });

  // Orquestração: dispara o próximo estágio quando o anterior conclui.
  useEffect(() => {
    if (!enabled || !orchestrating || demandaId == null) return;
    if (st.nextAction === "iniciar-analise" && !fired.current.analise && !criarAnalise.isPending) {
      fired.current.analise = true;
      criarAnalise.mutate({ demandaId });
    } else if (st.nextAction === "iniciar-rascunho" && !fired.current.rascunho && !criarRascunho.isPending) {
      fired.current.rascunho = true;
      criarRascunho.mutate({ demandaId, linhasMestras });
    } else if (st.done) {
      if (orchestrating) {
        setOrchestrating(false);
        void utils.demandas.list.invalidate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.nextAction, st.done, enabled, orchestrating, demandaId]);

  // Reset ao trocar de demanda / reabrir.
  useEffect(() => {
    if (!open) {
      setOrchestrating(false);
      fired.current = { analise: false, rascunho: false };
      setLinhasMestras("");
    }
  }, [open]);

  const handleProduzir = () => {
    if (demandaId == null) return;
    fired.current = { analise: false, rascunho: false };
    setOrchestrating(true);
  };

  const handleRetry = (stage: "analise" | "rascunho") => {
    if (demandaId == null) return;
    setOrchestrating(true);
    if (stage === "analise") {
      fired.current.analise = true;
      criarAnalise.mutate({ demandaId });
    } else {
      fired.current.rascunho = true;
      criarRascunho.mutate({ demandaId, linhasMestras });
    }
  };

  const iniciado = orchestrating || st.running || analise != null || rascunho != null;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Produzir peça
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Baixa os autos, roda a análise completa e gera o rascunho da peça no timbre DPE — de uma tacada.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="px-4 pb-2 space-y-4">
          {/* Linhas mestras */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Linhas mestras da peça
            </label>
            <textarea
              value={linhasMestras}
              onChange={(e) => setLinhasMestras(e.target.value)}
              disabled={iniciado}
              rows={3}
              placeholder="Direção estratégica: teses a priorizar, nulidades, pedidos… (opcional)"
              className="mt-1 w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60"
            />
          </div>

          {/* Stepper */}
          <div className="space-y-2">
            {st.stages.map((stage) => (
              <div key={stage.key} className="flex items-center gap-2.5">
                <StageIcon state={stage.state} />
                <span
                  className={cn(
                    "text-sm",
                    stage.state === "feito" && "text-neutral-500 dark:text-neutral-400",
                    stage.state === "ativo" && "text-neutral-900 dark:text-neutral-100 font-medium",
                    stage.state === "pendente" && "text-neutral-400 dark:text-neutral-500",
                    stage.state === "erro" && "text-rose-600 dark:text-rose-400 font-medium",
                  )}
                >
                  {stage.label}
                </span>
                {stage.state === "erro" && (stage.key === "analise" || stage.key === "rascunho") && (
                  <button
                    type="button"
                    onClick={() => handleRetry(stage.key as "analise" | "rascunho")}
                    className="ml-auto text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Tentar novamente
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Resultado */}
          {st.done && driveUrl && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 transition-colors"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="flex-1">Abrir rascunho (.docx) no Drive</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60" />
            </a>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-neutral-100 dark:border-neutral-800">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {st.done ? "Fechar" : "Cancelar"}
          </Button>
          {st.done ? (
            <Button size="sm" variant="outline" onClick={handleProduzir} disabled={st.running}>
              Rascunhar de novo
            </Button>
          ) : (
            <Button size="sm" onClick={handleProduzir} disabled={st.running || orchestrating}>
              {st.running || orchestrating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Produzindo…
                </>
              ) : (
                "Produzir"
              )}
            </Button>
          )}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
