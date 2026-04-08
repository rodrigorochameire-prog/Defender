"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Pause,
  XCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { PIPELINE_STEPS } from "@/lib/preparar-audiencia-pipeline";
import type { PipelineResult } from "@/lib/preparar-audiencia-pipeline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "levantamento" | "progresso" | "resultado";

type StatusPrep = "completo" | "parcial" | "pendente";

interface ProgressItem {
  audienciaId: number;
  assistidoNome: string;
  processoId?: number;
  status: "done" | "unchanged" | "current" | "waiting" | "failed" | "queued" | "no-docs";
  testemunhasCount?: number;
  newCount?: number;
  enrichedCount?: number;
  cleanedCount?: number;
  alertCount?: number;
  errorMessage?: string;
  /** When the mutation enqueued a worker job because analysis_data was empty. */
  jobQueued?: { id: number; created: boolean };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusIcon(status: StatusPrep) {
  switch (status) {
    case "completo":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "parcial":
      return <Clock className="h-4 w-4 text-amber-500" />;
    case "pendente":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
  }
}

function progressIcon(status: ProgressItem["status"]) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "unchanged":
      return <CheckCircle2 className="h-4 w-4 text-zinc-400" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-rose-500" />;
    case "queued":
      return <Sparkles className="h-4 w-4 text-violet-500" />;
    case "no-docs":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "current":
      return <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />;
    case "waiting":
      return <Clock className="h-4 w-4 text-zinc-400" />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PrepararAudienciasModal() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("levantamento");

  // Progress state
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);

  // Result state
  const [results, setResults] = useState<PipelineResult[]>([]);

  // --- Data from real tRPC endpoint ---
  const { data: audiencias, isLoading, refetch: refetchStatus } =
    trpc.audiencias.statusPreparacao.useQuery(
      { diasAntecedencia: 8 },
      { enabled: open },
    );
  const prepararMutation = trpc.audiencias.prepararAudiencia.useMutation();
  const enqueuePjeDownload = trpc.pje.enqueueDownload.useMutation();

  const pendentes = audiencias?.filter((a) => a.statusPrep !== "completo") ?? [];
  const totalPendentes = pendentes.length;

  // IDs de processos que estão com status "no-docs" na lista de progresso
  const processoIdsMissing = useMemo(
    () =>
      progressItems
        .filter((p) => p.status === "no-docs")
        .map((p) => p.processoId)
        .filter((id): id is number => typeof id === "number"),
    [progressItems],
  );

  const pjeJobsQuery = trpc.pje.listJobsForProcessos.useQuery(
    { processoIds: processoIdsMissing },
    {
      enabled: processoIdsMissing.length > 0,
      refetchInterval: 20_000,
    },
  );

  const pjeJobsByProcesso = useMemo(() => {
    const map = new Map<number, { status: string; error: string | null }>();
    for (const job of pjeJobsQuery.data ?? []) {
      map.set(job.processoId, { status: job.status, error: job.error });
    }
    return map;
  }, [pjeJobsQuery.data]);

  // ---------------------------------------------------------------------------
  // Auto-refresh polling: when there are queued jobs from the previous run,
  // poll statusPreparacao every 30s to detect when the worker has finished.
  // Once a queued audience flips to hasAnalysis === true, auto-trigger a
  // re-prepare for it so the user doesn't have to keep clicking.
  // ---------------------------------------------------------------------------
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const [autoRefreshTick, setAutoRefreshTick] = useState(0);
  const autoTriggeredIds = useRef<Set<number>>(new Set());

  const queuedAudienciaIds = progressItems
    .filter((p) => p.status === "queued")
    .map((p) => p.audienciaId);
  const hasQueued = queuedAudienciaIds.length > 0 && phase === "resultado";

  useEffect(() => {
    if (!hasQueued) return;
    setAutoRefreshing(true);
    const interval = setInterval(() => {
      setAutoRefreshTick((t) => t + 1);
      refetchStatus();
    }, 30_000);
    return () => {
      clearInterval(interval);
      setAutoRefreshing(false);
    };
  }, [hasQueued, refetchStatus]);

  // When the refetched status shows a queued audience now has analysis,
  // auto-trigger prepararAudiencia and update its row in place.
  useEffect(() => {
    if (!hasQueued || !audiencias) return;

    const readyToProcess = queuedAudienciaIds.filter((id) => {
      if (autoTriggeredIds.current.has(id)) return false;
      const aud = audiencias.find((a) => a.id === id);
      return aud?.hasAnalysis === true;
    });

    if (readyToProcess.length === 0) return;

    (async () => {
      for (const id of readyToProcess) {
        autoTriggeredIds.current.add(id);
        try {
          const result = await prepararMutation.mutateAsync({ audienciaId: id });
          if (result.jobQueued) {
            // Worker re-enqueued (rare race) — leave as queued
            continue;
          }
          const newCount = result.testemunhas.filter(
            (t) => t.status === "ARROLADA",
          ).length;
          const enrichedCount = result.testemunhas.filter(
            (t) => t.status === "ENRIQUECIDA",
          ).length;
          const cleanedCount = result.cleanedCount ?? 0;
          const naoIntimadas = result.testemunhas.filter(
            (t) => t.status === "ARROLADA" || t.status === "NAO_LOCALIZADA",
          );
          setProgressItems((prev) =>
            prev.map((item) =>
              item.audienciaId === id
                ? {
                    ...item,
                    status:
                      newCount + enrichedCount + cleanedCount > 0
                        ? "done"
                        : "unchanged",
                    testemunhasCount: result.testemunhas.length,
                    newCount,
                    enrichedCount,
                    cleanedCount,
                    alertCount: naoIntimadas.length,
                    jobQueued: undefined,
                  }
                : item,
            ),
          );

          // ── Toast: aviso de sucesso quando o auto-refresh dispara
          // (a UI atualiza silenciosamente, então o toast garante que o
          // defensor perceba que algo aconteceu)
          if (newCount + enrichedCount + cleanedCount > 0) {
            const parts: string[] = [];
            if (newCount) parts.push(`${newCount} nova${newCount > 1 ? "s" : ""}`);
            if (enrichedCount) parts.push(`${enrichedCount} enriquec.`);
            if (cleanedCount) parts.push(`${cleanedCount} limpa${cleanedCount > 1 ? "s" : ""}`);
            toast.success(
              `${result.assistidoNome}: ${parts.join(" · ")}`,
            );
          }
        } catch (err) {
          setProgressItems((prev) =>
            prev.map((item) =>
              item.audienciaId === id
                ? {
                    ...item,
                    status: "failed",
                    errorMessage:
                      err instanceof Error ? err.message : "Erro desconhecido",
                  }
                : item,
            ),
          );
        }
      }
    })();
  }, [autoRefreshTick, audiencias, hasQueued, queuedAudienciaIds, prepararMutation]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleOpen(value: boolean) {
    setOpen(value);
    if (value) {
      setPhase("levantamento");
      setIsRunning(false);
      setCurrentIndex(0);
      setCurrentStepIndex(0);
      setProgressItems([]);
      setResults([]);
    }
  }

  async function handlePrepararTodos() {
    setPhase("progresso");
    setIsRunning(true);
    setResults([]);

    const items: ProgressItem[] = pendentes.map((a, i) => ({
      audienciaId: a.id,
      assistidoNome: a.assistidoNome,
      processoId: a.processoId ?? undefined,
      status: i === 0 ? ("current" as const) : ("waiting" as const),
    }));
    setProgressItems(items);
    setCurrentIndex(0);
    setCurrentStepIndex(0);

    const newResults: PipelineResult[] = [];

    for (let i = 0; i < pendentes.length; i++) {
      setCurrentIndex(i);
      const aud = pendentes[i];

      // Update progress items to reflect current
      setProgressItems((prev) =>
        prev.map((item, idx) => ({
          ...item,
          status: idx < i ? "done" as const : idx === i ? "current" as const : "waiting" as const,
        }))
      );

      try {
        // Steps 1-3 are external (PJe + Mac Mini) — skip to step 4
        setCurrentStepIndex(3); // "Identificando testemunhas"

        const result = await prepararMutation.mutateAsync({
          audienciaId: aud.id,
        });

        // ── Documents missing: worker rodou recente mas produziu 0 deps,
        // provavelmente pasta do Drive vazia. Não re-enfileirar (loop) —
        // marcar como "no-docs" para o usuário tomar ação manual.
        if (result.documentsMissing) {
          newResults.push({
            audienciaId: aud.id,
            assistidoNome: result.assistidoNome,
            success: true,
            testemunhas: [],
            naoIntimadas: [],
          });
          setProgressItems((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: "no-docs" as const,
                    cleanedCount: result.cleanedCount ?? 0,
                  }
                : item
            )
          );
          setResults([...newResults]);
          continue;
        }

        // ── Step D: when the mutation enqueued a worker job (no analysis
        // yet), surface it as "queued" — not done, not failed.
        if (result.jobQueued) {
          newResults.push({
            audienciaId: aud.id,
            assistidoNome: result.assistidoNome,
            success: true,
            testemunhas: [],
            naoIntimadas: [],
          });

          setProgressItems((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: "queued" as const,
                    jobQueued: {
                      id: result.jobQueued!.id,
                      created: result.jobQueued!.created,
                    },
                  }
                : item
            )
          );

          setResults([...newResults]);
          continue;
        }

        setCurrentStepIndex(4); // "Verificando intimação"

        const naoIntimadas = result.testemunhas
          .filter((t) => t.status === "ARROLADA" || t.status === "NAO_LOCALIZADA")
          .map((t) => ({ nome: t.nome, status: t.status }));

        const newCount = result.testemunhas.filter(
          (t) => t.status === "ARROLADA"
        ).length;
        const enrichedCount = result.testemunhas.filter(
          (t) => t.status === "ENRIQUECIDA"
        ).length;
        const cleanedCount = result.cleanedCount ?? 0;
        const changed = newCount + enrichedCount + cleanedCount > 0;

        newResults.push({
          audienciaId: aud.id,
          assistidoNome: result.assistidoNome,
          success: true,
          testemunhas: result.testemunhas,
          naoIntimadas,
        });

        // Distinguish "done" (real work happened) from "unchanged"
        // (mutation ran but every depoente was already saved with full data)
        // so the user can see at a glance which audiências need attention.
        setProgressItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: changed ? ("done" as const) : ("unchanged" as const),
                  testemunhasCount: result.testemunhas.length,
                  newCount,
                  enrichedCount,
                  cleanedCount,
                  alertCount: naoIntimadas.length,
                }
              : item
          )
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erro desconhecido";

        newResults.push({
          audienciaId: aud.id,
          assistidoNome: aud.assistidoNome,
          success: false,
          error: errorMessage,
          testemunhas: [],
          naoIntimadas: [],
        });

        // Mark as failed (distinct from done) so the UI can render the error
        setProgressItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, status: "failed" as const, errorMessage }
              : item
          )
        );
      }

      setResults([...newResults]);
    }

    setIsRunning(false);
    setPhase("resultado");
  }

  function handlePause() {
    setIsRunning(false);
  }

  function handleCancel() {
    setIsRunning(false);
    setPhase("levantamento");
  }

  function handleClose() {
    setOpen(false);
  }

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------

  const currentAudiencia = progressItems[currentIndex];
  const progressPercent =
    progressItems.length > 0
      ? Math.round(
          ((currentIndex * PIPELINE_STEPS.length + currentStepIndex) /
            (progressItems.length * PIPELINE_STEPS.length)) *
            100,
        )
      : 0;

  // Collect all naoIntimadas from results
  const allNaoIntimadas = results.flatMap((r) =>
    r.naoIntimadas.map((t) => ({
      ...t,
      assistidoNome: r.assistidoNome,
    })),
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        size="sm"
        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        onClick={() => handleOpen(true)}
      >
        <Target className="mr-1.5 h-4 w-4" />
        <span className="text-xs">Preparar Audiências</span>
        {totalPendentes > 0 && (
          <Badge
            variant="secondary"
            className="ml-1.5 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0"
          >
            {totalPendentes}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Preparar Audiências
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              {phase === "levantamento" &&
                "Verifique as audiências pendentes e inicie a preparação."}
              {phase === "progresso" && "Preparação em andamento..."}
              {phase === "resultado" && "Preparação concluída."}
            </DialogDescription>
          </DialogHeader>

          {/* ================================================================ */}
          {/* Phase 1 — Levantamento                                          */}
          {/* ================================================================ */}
          {phase === "levantamento" && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-xs text-zinc-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando audiências...
                </div>
              ) : !audiencias || audiencias.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-xs text-zinc-400">
                  Nenhuma audiência nos próximos 8 dias.
                </div>
              ) : (
              <div className="max-h-80 overflow-y-auto rounded border border-zinc-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-50">
                    <tr className="border-b border-zinc-200">
                      <th className="px-3 py-2 text-left text-zinc-500 font-medium">
                        #
                      </th>
                      <th className="px-3 py-2 text-left text-zinc-500 font-medium">
                        Assistido
                      </th>
                      <th className="px-3 py-2 text-left text-zinc-500 font-medium">
                        Data
                      </th>
                      <th className="px-3 py-2 text-left text-zinc-500 font-medium">
                        Tipo
                      </th>
                      <th className="px-3 py-2 text-left text-zinc-500 font-medium">
                        Status Prep
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {audiencias.map((a, i) => (
                      <tr
                        key={a.id}
                        className={cn(
                          "border-b border-zinc-100",
                          i % 2 === 0 ? "bg-white" : "bg-zinc-50/50",
                        )}
                      >
                        <td className="px-3 py-2 text-zinc-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-zinc-700">
                          {a.assistidoNome}
                        </td>
                        <td className="px-3 py-2 text-zinc-500">
                          {new Date(a.dataAudiencia).toLocaleDateString(
                            "pt-BR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                            },
                          )}
                        </td>
                        <td className="px-3 py-2 text-zinc-500">{a.tipo}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {statusIcon(a.statusPrep)}
                            <span
                              className={cn(
                                "capitalize",
                                a.statusPrep === "completo" &&
                                  "text-emerald-600",
                                a.statusPrep === "parcial" && "text-amber-600",
                                a.statusPrep === "pendente" && "text-red-600",
                              )}
                            >
                              {a.statusPrep}
                            </span>
                            {a.naoIntimadas > 0 && (
                              <Badge
                                variant="outline"
                                className="ml-1 text-[10px] px-1 py-0 border-red-300 text-red-600"
                              >
                                {a.naoIntimadas} sem intimação
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}

              {/* Bottom bar */}
              <div className="flex items-center justify-between rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Requer sessão PJe ativa no Chrome</span>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  disabled={totalPendentes === 0}
                  onClick={handlePrepararTodos}
                >
                  Preparar {totalPendentes} Pendente
                  {totalPendentes !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* Phase 2 — Progresso                                             */}
          {/* ================================================================ */}
          {phase === "progresso" && (
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    Etapa {currentStepIndex + 1}/{PIPELINE_STEPS.length}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              {/* Current audiência */}
              {currentAudiencia && (
                <div className="text-sm font-medium text-zinc-700">
                  {currentAudiencia.assistidoNome}
                  <span className="ml-2 text-xs font-normal text-zinc-400">
                    {PIPELINE_STEPS[currentStepIndex]?.label}
                  </span>
                </div>
              )}

              {/* Step labels */}
              <div className="flex gap-1">
                {PIPELINE_STEPS.map((step, i) => (
                  <div
                    key={step.key}
                    className={cn(
                      "flex-1 rounded px-2 py-1 text-[10px] text-center",
                      i < currentStepIndex && "bg-emerald-100 text-emerald-700",
                      i === currentStepIndex &&
                        "bg-emerald-500 text-white font-medium",
                      i > currentStepIndex && "bg-zinc-100 text-zinc-400",
                    )}
                  >
                    {step.label}
                  </div>
                ))}
              </div>

              {/* List of pendentes with status */}
              <div className="max-h-80 overflow-y-auto space-y-1">
                {progressItems.map((item) => (
                  <div
                    key={item.audienciaId}
                    className={cn(
                      "flex items-start justify-between rounded px-3 py-1.5 text-xs gap-3",
                      item.status === "current" && "bg-emerald-50",
                      item.status === "done" && "bg-zinc-50",
                      item.status === "unchanged" && "bg-zinc-50/50",
                      item.status === "failed" && "bg-rose-50",
                      item.status === "queued" && "bg-violet-50",
                      item.status === "no-docs" && "bg-amber-50",
                      item.status === "waiting" && "bg-white",
                    )}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className="pt-0.5 shrink-0">{progressIcon(item.status)}</div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "truncate",
                            item.status === "current"
                              ? "text-zinc-700 font-medium"
                              : item.status === "failed"
                                ? "text-rose-700 font-medium"
                                : "text-zinc-500",
                          )}
                        >
                          {item.assistidoNome}
                        </div>
                        {item.status === "failed" && item.errorMessage && (
                          <div className="text-[10px] text-rose-600 mt-0.5 truncate">
                            {item.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                    {(item.status === "done" || item.status === "unchanged") && (
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 shrink-0">
                        {item.testemunhasCount !== undefined && (
                          <span>{item.testemunhasCount} testemunhas</span>
                        )}
                        {item.newCount !== undefined && item.newCount > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 border-emerald-400 text-emerald-700"
                          >
                            +{item.newCount} nova{item.newCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {item.enrichedCount !== undefined && item.enrichedCount > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 border-emerald-300 text-emerald-600"
                          >
                            +{item.enrichedCount} enriquec.
                          </Badge>
                        )}
                        {item.cleanedCount !== undefined && item.cleanedCount > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 border-sky-300 text-sky-600"
                          >
                            ♻ {item.cleanedCount} limpa{item.cleanedCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {item.status === "unchanged" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 border-zinc-300 text-zinc-500"
                          >
                            sem mudanças
                          </Badge>
                        )}
                        {item.alertCount !== undefined && item.alertCount > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 border-amber-300 text-amber-600"
                          >
                            {item.alertCount} alerta{item.alertCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    )}
                    {item.status === "failed" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 border-rose-300 text-rose-600 shrink-0"
                      >
                        falhou
                      </Badge>
                    )}
                    {item.status === "queued" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 border-violet-300 text-violet-600 shrink-0"
                      >
                        {item.jobQueued?.created ? "fila criada" : "fila já existe"}
                      </Badge>
                    )}
                    {item.status === "no-docs" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 border-amber-300 text-amber-700 shrink-0"
                      >
                        sem PDFs
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handlePause}
                  disabled={!isRunning}
                >
                  <Pause className="mr-1 h-3.5 w-3.5" />
                  Pausar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleCancel}
                >
                  <XCircle className="mr-1 h-3.5 w-3.5" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* Phase 3 — Resultado                                             */}
          {/* ================================================================ */}
          {phase === "resultado" && (
            <div className="space-y-4">
              {/* Summary */}
              {(() => {
                const queuedItems = progressItems.filter((p) => p.status === "queued");
                const unchangedItems = progressItems.filter((p) => p.status === "unchanged");
                const noDocsItems = progressItems.filter((p) => p.status === "no-docs");
                const failed = results.filter((r) => !r.success);
                const preparedItems = progressItems.filter((p) => p.status === "done");
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm flex-wrap">
                      {preparedItems.length > 0 && (
                        <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          {preparedItems.length} preparada
                          {preparedItems.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {unchangedItems.length > 0 && (
                        <span className="flex items-center gap-1.5 text-zinc-600 font-medium">
                          <CheckCircle2 className="h-5 w-5 text-zinc-400" />
                          {unchangedItems.length} sem mudanças
                        </span>
                      )}
                      {queuedItems.length > 0 && (
                        <span className="flex items-center gap-1.5 text-violet-700 font-medium">
                          <Sparkles className="h-5 w-5 text-violet-500" />
                          {queuedItems.length} em fila
                        </span>
                      )}
                      {noDocsItems.length > 0 && (
                        <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          {noDocsItems.length} sem PDFs
                        </span>
                      )}
                      {failed.length > 0 && (
                        <span className="flex items-center gap-1.5 text-rose-700 font-medium">
                          <XCircle className="h-5 w-5 text-rose-500" />
                          {failed.length} falhou
                          {failed.length !== 1 ? "ram" : ""}
                        </span>
                      )}
                    </div>

                    {unchangedItems.length > 0 && preparedItems.length === 0 && queuedItems.length === 0 && (
                      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-[10px] text-zinc-600 italic">
                          Nada foi alterado nesta execução. As testemunhas já estavam todas
                          salvas com os campos enriquecidos. Para regenerar a análise (e
                          obter perguntas/pontos novos), enfileire um job novo no worker.
                        </p>
                      </div>
                    )}

                    {queuedItems.length > 0 && (
                      <div className="rounded-md border border-violet-200 bg-violet-50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
                            <Sparkles className="h-3.5 w-3.5" />
                            Análises enfileiradas no worker
                          </div>
                          {autoRefreshing && (
                            <div className="flex items-center gap-1 text-[10px] text-violet-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Auto-refresh ativo (30s)
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          {queuedItems.map((q) => (
                            <div
                              key={q.audienciaId}
                              className="text-xs text-violet-800 bg-violet-100/50 rounded px-2 py-1"
                            >
                              <div className="font-medium">{q.assistidoNome}</div>
                              <div className="text-[10px] text-violet-600 mt-0.5">
                                {q.jobQueued?.created
                                  ? `Job #${q.jobQueued.id} criado · `
                                  : `Job #${q.jobQueued?.id} já estava em fila · `}
                                Worker do Mac Mini vai processar e popular a análise.
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-violet-600 italic">
                          Pode deixar este modal aberto. Quando o worker terminar cada análise,
                          a extração de depoentes acontece automaticamente — não precisa clicar
                          de novo.
                        </p>
                      </div>
                    )}

                    {noDocsItems.length > 0 && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Audiências sem documentos no Drive
                        </div>
                        <div className="space-y-1">
                          {noDocsItems.map((q) => {
                            const job = q.processoId != null ? pjeJobsByProcesso.get(q.processoId) : undefined;
                            const status = job?.status;
                            return (
                              <div
                                key={q.audienciaId}
                                className="flex items-center justify-between gap-2 text-xs text-amber-800 bg-amber-100/50 rounded px-2 py-1.5"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{q.assistidoNome}</div>
                                  {status && (
                                    <div className="text-[10px] text-amber-700">
                                      {status === "pending" && "Na fila de download..."}
                                      {status === "running" && "Baixando do PJe..."}
                                      {status === "completed" && "Baixado — análise em fila"}
                                      {status === "skipped" && "PDF já existe"}
                                      {status === "failed" && `Falhou: ${(job?.error ?? "erro").slice(0, 80)}`}
                                    </div>
                                  )}
                                </div>
                                {q.processoId != null && !status && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const res = await enqueuePjeDownload.mutateAsync({
                                        processoId: q.processoId!,
                                      });
                                      if (res.status === "queued") {
                                        toast.success(`Download enfileirado (job #${res.jobId})`);
                                        pjeJobsQuery.refetch();
                                      } else if (res.status === "already_queued") {
                                        toast.info("Já está na fila");
                                        pjeJobsQuery.refetch();
                                      } else if (res.status === "unsupported_atribuicao") {
                                        toast.error(`Atribuição não suportada em V1: ${res.atribuicao}`);
                                      } else {
                                        toast.error("Processo não encontrado");
                                      }
                                    }}
                                    disabled={enqueuePjeDownload.isPending}
                                    className="shrink-0 text-[10px] px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                                  >
                                    Baixar do PJe
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-amber-600 italic">
                          Disponível para Júri e VVD Camaçari. O worker baixa os autos do PJe e
                          dispara a análise automaticamente em seguida.
                        </p>
                      </div>
                    )}

                    {failed.length > 0 && (
                      <div className="rounded-md border border-rose-200 bg-rose-50 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-rose-700">
                          <XCircle className="h-3.5 w-3.5" />
                          Audiências que falharam
                        </div>
                        <div className="space-y-1">
                          {failed.map((r) => (
                            <div
                              key={r.audienciaId}
                              className="text-xs text-rose-800 bg-rose-100/50 rounded px-2 py-1"
                            >
                              <div className="font-medium">{r.assistidoNome}</div>
                              {r.error && (
                                <div className="text-[10px] text-rose-600 mt-0.5">
                                  {r.error}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-rose-600 italic">
                          Ação sugerida: rodar a análise (skill <code>preparar-audiencia</code>) no
                          Cowork antes de re-tentar essas audiências.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Alert box for naoIntimadas */}
              {allNaoIntimadas.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Testemunhas NÃO intimadas
                  </div>
                  <div className="space-y-1">
                    {allNaoIntimadas.map((t, i) => (
                      <div
                        key={`${t.assistidoNome}-${t.nome}-${i}`}
                        className="flex items-center justify-between text-xs text-amber-800 bg-amber-100/50 rounded px-2 py-1"
                      >
                        <div>
                          <span className="font-medium">{t.nome}</span>
                          <span className="text-amber-600 ml-1.5">
                            ({t.assistidoNome})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-amber-600">
                          <span>{t.status}</span>
                          {t.movimentacao && <span>• {t.movimentacao}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-600 italic">
                    Ação sugerida: requerer intimação urgente
                  </p>
                </div>
              )}

              {/* Close button */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  onClick={handleClose}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
