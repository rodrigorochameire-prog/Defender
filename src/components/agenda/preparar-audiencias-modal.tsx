"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  status: "done" | "current" | "waiting";
  testemunhasCount?: number;
  alertCount?: number;
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

function progressIcon(status: "done" | "current" | "waiting") {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
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
  const { data: audiencias, isLoading } = trpc.audiencias.statusPreparacao.useQuery(
    { diasAntecedencia: 8 },
    { enabled: open }
  );
  const prepararMutation = trpc.audiencias.prepararAudiencia.useMutation();

  const pendentes = audiencias?.filter((a) => a.statusPrep !== "completo") ?? [];
  const totalPendentes = pendentes.length;

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

        setCurrentStepIndex(4); // "Verificando intimação"

        const naoIntimadas = result.testemunhas
          .filter((t) => t.status === "ARROLADA" || t.status === "NAO_LOCALIZADA")
          .map((t) => ({ nome: t.nome, status: t.status }));

        newResults.push({
          audienciaId: aud.id,
          assistidoNome: result.assistidoNome,
          success: true,
          testemunhas: result.testemunhas,
          naoIntimadas,
        });

        // Update progress item with counts
        setProgressItems((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: "done" as const,
                  testemunhasCount: result.testemunhas.length,
                  alertCount: naoIntimadas.length,
                }
              : item
          )
        );
      } catch (error) {
        newResults.push({
          audienciaId: aud.id,
          assistidoNome: aud.assistidoNome,
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
          testemunhas: [],
          naoIntimadas: [],
        });

        // Mark as done (with error) in progress
        setProgressItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "done" as const } : item
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
                      "flex items-center justify-between rounded px-3 py-1.5 text-xs",
                      item.status === "current" && "bg-emerald-50",
                      item.status === "done" && "bg-zinc-50",
                      item.status === "waiting" && "bg-white",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {progressIcon(item.status)}
                      <span
                        className={cn(
                          item.status === "current"
                            ? "text-zinc-700 font-medium"
                            : "text-zinc-500",
                        )}
                      >
                        {item.assistidoNome}
                      </span>
                    </div>
                    {item.status === "done" && (
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                        {item.testemunhasCount !== undefined && (
                          <span>{item.testemunhasCount} testemunhas</span>
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
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="font-medium text-zinc-700">
                  {results.length} audiência{results.length !== 1 ? "s" : ""}{" "}
                  preparada{results.length !== 1 ? "s" : ""}
                </span>
              </div>

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
