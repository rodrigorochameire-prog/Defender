"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
  PlayCircle,
  RefreshCw,
  StickyNote,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AnotacaoTipo = "nota" | "providencia" | "lembrete" | "atendimento";

interface Anotacao {
  id: number;
  conteudo: string;
  tipo: string | null;
  createdAt: Date;
  assistidoId: number | null;
  processoId: number | null;
  assistido: { id: number; nome: string | null } | null;
  processo: { id: number; numeroAutos: string | null } | null;
}

interface AssistidoGroup {
  assistidoId: number;
  assistidoNome: string;
  anotacoes: Anotacao[];
}

interface SyncDetalhe {
  anotacao_id: number;
  status: "created" | "skipped" | "failed" | "dry_run";
  solar_fase_id?: string | null;
  error?: string | null;
  reason?: string | null;
}

interface SyncResult {
  success: boolean;
  fases_criadas: number;
  fases_skipped: number;
  fases_falhadas: number;
  total: number;
  dry_run: boolean;
  erros: string[];
  detalhes: SyncDetalhe[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TIPO_BADGE_CONFIG: Record<
  AnotacaoTipo,
  { label: string; className: string }
> = {
  nota: {
    label: "nota",
    className:
      "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400",
  },
  providencia: {
    label: "providencia",
    className:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400",
  },
  lembrete: {
    label: "lembrete",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  },
  atendimento: {
    label: "atendimento",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400",
  },
};

const SYNC_STATUS_CONFIG: Record<
  SyncDetalhe["status"],
  { label: string; icon: React.ElementType; className: string }
> = {
  created: {
    label: "Criada",
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
  skipped: {
    label: "Ignorada",
    icon: AlertTriangle,
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  },
  failed: {
    label: "Falhou",
    icon: XCircle,
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400",
  },
  dry_run: {
    label: "Simulado",
    icon: PlayCircle,
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400",
  },
};

const MAX_TEXTO_CHARS = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDateSafe(date: Date | string | null | undefined): string {
  if (!date) return "---";
  try {
    return format(new Date(date), "dd/MM/yy", { locale: ptBR });
  } catch {
    return "---";
  }
}

function getTipoBadge(tipo: string | null) {
  const key = (tipo ?? "nota") as AnotacaoTipo;
  return TIPO_BADGE_CONFIG[key] ?? TIPO_BADGE_CONFIG.nota;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: string | null }) {
  const config = getTipoBadge(tipo);
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium px-1.5 py-0 shrink-0", config.className)}
    >
      {config.label}
    </Badge>
  );
}

function SyncStatusBadge({ status }: { status: SyncDetalhe["status"] }) {
  const config = SYNC_STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 text-[10px] font-medium px-1.5 py-0", config.className)}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" />
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs">
        {description}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function SolarSyncFases() {
  // ── Annotation selection state ──────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedAssistidos, setExpandedAssistidos] = useState<Set<number>>(
    new Set()
  );

  // ── Dry-run results ────────────────────────────────────────────────────
  const [dryRunResult, setDryRunResult] = useState<SyncResult | null>(null);
  const [lastSyncAssistidoId, setLastSyncAssistidoId] = useState<number | null>(
    null
  );

  // ── Quick note form ────────────────────────────────────────────────────
  const [atendimentoId, setAtendimentoId] = useState("");
  const [textoNota, setTextoNota] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────
  const {
    data: grupos = [],
    isLoading,
    refetch,
  } = trpc.solar.anotacoesPendentes.useQuery(undefined, {
    staleTime: 30_000,
  });

  // ── Mutations ──────────────────────────────────────────────────────────
  const syncMutation = trpc.solar.sincronizarComSolar.useMutation();
  const criarAnotacaoMutation = trpc.solar.criarAnotacao.useMutation();

  // ── Derived data ───────────────────────────────────────────────────────
  const totalAssistidos = grupos.length;
  const totalAnotacoes = useMemo(
    () => grupos.reduce((sum, g) => sum + g.anotacoes.length, 0),
    [grupos]
  );

  const allAnotacaoIds = useMemo(
    () => new Set(grupos.flatMap((g) => g.anotacoes.map((a) => a.id))),
    [grupos]
  );

  // ── Selection helpers ──────────────────────────────────────────────────
  function toggleAnnotation(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAssistidoGroup(assistidoId: number, anotacoes: Anotacao[]) {
    const ids = anotacoes.map((a) => a.id);
    const allSelected = ids.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === allAnotacaoIds.size && allAnotacaoIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allAnotacaoIds));
    }
  }

  function toggleExpanded(assistidoId: number) {
    setExpandedAssistidos((prev) => {
      const next = new Set(prev);
      if (next.has(assistidoId)) {
        next.delete(assistidoId);
      } else {
        next.add(assistidoId);
      }
      return next;
    });
  }

  // ── Determine which assistidoId to sync ────────────────────────────────
  // Find the unique assistidoId(s) for selected annotations
  const selectedAssistidoIds = useMemo(() => {
    const ids = new Set<number>();
    for (const grupo of grupos) {
      for (const a of grupo.anotacoes) {
        if (selectedIds.has(a.id)) {
          ids.add(grupo.assistidoId);
        }
      }
    }
    return ids;
  }, [grupos, selectedIds]);

  // ── Sync handlers ──────────────────────────────────────────────────────
  async function handleDryRun() {
    if (selectedIds.size === 0 || selectedAssistidoIds.size === 0) return;

    // Sync per assistido -- we use the first selected assistido for now
    // (for multi-assistido we iterate)
    const anotacaoIdsArr = [...selectedIds];

    // Group selected annotations by assistido
    const byAssistido = new Map<number, number[]>();
    for (const grupo of grupos) {
      for (const a of grupo.anotacoes) {
        if (selectedIds.has(a.id)) {
          if (!byAssistido.has(grupo.assistidoId)) {
            byAssistido.set(grupo.assistidoId, []);
          }
          byAssistido.get(grupo.assistidoId)!.push(a.id);
        }
      }
    }

    // For simplicity in the preview, run dry-run for the first assistido
    // In production, you could iterate all
    const firstAssistidoId = [...byAssistido.keys()][0];
    if (!firstAssistidoId) return;

    setLastSyncAssistidoId(firstAssistidoId);

    try {
      const result = await syncMutation.mutateAsync({
        assistidoId: firstAssistidoId,
        modo: "fase",
        dryRun: true,
        anotacaoIds: byAssistido.get(firstAssistidoId),
      });
      setDryRunResult(result);
    } catch {
      toast.error("Erro ao simular sincronização");
    }
  }

  async function handleSync(dryRun: boolean) {
    if (selectedIds.size === 0 || selectedAssistidoIds.size === 0) return;

    // Group selected annotations by assistido
    const byAssistido = new Map<number, number[]>();
    for (const grupo of grupos) {
      for (const a of grupo.anotacoes) {
        if (selectedIds.has(a.id)) {
          if (!byAssistido.has(grupo.assistidoId)) {
            byAssistido.set(grupo.assistidoId, []);
          }
          byAssistido.get(grupo.assistidoId)!.push(a.id);
        }
      }
    }

    let totalCriadas = 0;
    let totalSkipped = 0;
    let totalFalhadas = 0;
    let errors: string[] = [];

    try {
      for (const [assistidoId, ids] of byAssistido) {
        const result = await syncMutation.mutateAsync({
          assistidoId,
          modo: "fase",
          dryRun,
          anotacaoIds: ids,
        });
        totalCriadas += result.fases_criadas;
        totalSkipped += result.fases_skipped;
        totalFalhadas += result.fases_falhadas;
        errors = [...errors, ...result.erros];
      }

      if (!dryRun) {
        toast.success(
          `Sync completo: ${totalCriadas} fase(s) criada(s), ${totalSkipped} ignorada(s)`
        );
        setSelectedIds(new Set());
        setDryRunResult(null);
        setLastSyncAssistidoId(null);
        void refetch();
      }
    } catch {
      toast.error("Erro ao sincronizar com o Solar");
    }
  }

  async function handleConfirmSync() {
    if (!lastSyncAssistidoId) return;

    // Re-run with dryRun=false using same selection
    const byAssistido = new Map<number, number[]>();
    for (const grupo of grupos) {
      for (const a of grupo.anotacoes) {
        if (selectedIds.has(a.id)) {
          if (!byAssistido.has(grupo.assistidoId)) {
            byAssistido.set(grupo.assistidoId, []);
          }
          byAssistido.get(grupo.assistidoId)!.push(a.id);
        }
      }
    }

    try {
      let totalCriadas = 0;
      for (const [assistidoId, ids] of byAssistido) {
        const result = await syncMutation.mutateAsync({
          assistidoId,
          modo: "fase",
          dryRun: false,
          anotacaoIds: ids,
        });
        totalCriadas += result.fases_criadas;
      }

      toast.success(`${totalCriadas} fase(s) criada(s) no Solar`);
      setSelectedIds(new Set());
      setDryRunResult(null);
      setLastSyncAssistidoId(null);
      void refetch();
    } catch {
      toast.error("Erro ao confirmar sincronização");
    }
  }

  // ── Quick note handler ─────────────────────────────────────────────────
  async function handleCriarAnotacao() {
    if (!atendimentoId.trim() || !textoNota.trim()) return;

    try {
      const result = await criarAnotacaoMutation.mutateAsync({
        atendimentoId: atendimentoId.trim(),
        texto: textoNota.trim(),
        qualificacaoId: 302,
        dryRun: false,
      });

      if (result.success) {
        toast.success("Anotacao enviada ao Solar");
        setAtendimentoId("");
        setTextoNota("");
      } else {
        toast.error(result.message || "Erro ao criar anotação");
      }
    } catch {
      toast.error("Erro ao enviar anotação ao Solar");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr,380px] gap-4">
      {/* ─── Left Panel: Anotacoes Pendentes ────────────────────────────── */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              Anotações Pendentes de Sync
            </h2>
            {totalAnotacoes > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] font-medium px-1.5 py-0 tabular-nums shrink-0 border-zinc-300 dark:border-zinc-600"
              >
                {totalAssistidos} assistido{totalAssistidos !== 1 ? "s" : ""},{" "}
                {totalAnotacoes} anotaç{totalAnotacoes !== 1 ? "ões" : "ão"}
              </Badge>
            )}
          </div>

          {/* Select all toggle */}
          {totalAnotacoes > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectAll}
              className="h-7 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {selectedIds.size === allAnotacaoIds.size && allAnotacaoIds.size > 0
                ? "Desmarcar todas"
                : "Selecionar todas"}
            </Button>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && grupos.length === 0 && (
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardContent className="p-0">
              <EmptyState
                icon={StickyNote}
                title="Nenhuma anotação pendente"
                description="Todas as anotações já foram sincronizadas com o Solar, ou não há anotações cadastradas."
              />
            </CardContent>
          </Card>
        )}

        {/* Grouped annotations */}
        {!isLoading && grupos.length > 0 && (
          <div className="space-y-2">
            {(grupos as AssistidoGroup[]).map((grupo) => {
              const isExpanded = expandedAssistidos.has(grupo.assistidoId);
              const groupIds = grupo.anotacoes.map((a) => a.id);
              const allGroupSelected = groupIds.every((id) =>
                selectedIds.has(id)
              );
              const someGroupSelected =
                !allGroupSelected &&
                groupIds.some((id) => selectedIds.has(id));

              return (
                <Card
                  key={grupo.assistidoId}
                  className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden"
                >
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(grupo.assistidoId)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
                    )}

                    <div
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAssistidoGroup(grupo.assistidoId, grupo.anotacoes);
                      }}
                    >
                      <Checkbox
                        checked={allGroupSelected}
                        className={cn(
                          someGroupSelected && "opacity-60"
                        )}
                        aria-label={`Selecionar todas de ${grupo.assistidoNome}`}
                      />
                    </div>

                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                      {grupo.assistidoNome}
                    </span>

                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium px-1.5 py-0 tabular-nums shrink-0 border-zinc-300 dark:border-zinc-600"
                    >
                      {grupo.anotacoes.length}
                    </Badge>
                  </button>

                  {/* Annotation list */}
                  {isExpanded && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                      {grupo.anotacoes.map((anotacao) => (
                        <div
                          key={anotacao.id}
                          className={cn(
                            "flex items-start gap-3 px-4 py-2.5 transition-colors",
                            selectedIds.has(anotacao.id) &&
                              "bg-emerald-50/50 dark:bg-emerald-950/10"
                          )}
                        >
                          <div className="pt-0.5 shrink-0">
                            <Checkbox
                              checked={selectedIds.has(anotacao.id)}
                              onCheckedChange={() =>
                                toggleAnnotation(anotacao.id)
                              }
                              aria-label={`Selecionar anotação ${anotacao.id}`}
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Top row: type badge + process number + date */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <TipoBadge tipo={anotacao.tipo} />

                              {anotacao.processo?.numeroAutos && (
                                <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                  {anotacao.processo.numeroAutos}
                                </span>
                              )}

                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums ml-auto shrink-0">
                                {formatDateSafe(anotacao.createdAt)}
                              </span>
                            </div>

                            {/* Content (truncated 2 lines) */}
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                              {anotacao.conteudo}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ── Action bar ────────────────────────────────────────────────── */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800 dark:bg-emerald-950/20">
            <span className="text-sm text-emerald-700 dark:text-emerald-300 tabular-nums">
              {selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}
            </span>

            <Button
              size="sm"
              variant="outline"
              onClick={handleDryRun}
              disabled={syncMutation.isPending}
              className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              {syncMutation.isPending && !dryRunResult ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <PlayCircle className="h-3 w-3" />
              )}
              Simular (dry-run)
            </Button>

            <Button
              size="sm"
              onClick={() => handleSync(false)}
              disabled={syncMutation.isPending}
              className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Sincronizar
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedIds(new Set());
                setDryRunResult(null);
              }}
              className="h-7 text-xs text-zinc-500"
            >
              Limpar
            </Button>
          </div>
        )}

        {/* ── Dry-run preview ───────────────────────────────────────────── */}
        {dryRunResult && (
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <PlayCircle className="h-4 w-4" />
                Preview (dry-run)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Summary KPIs */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {dryRunResult.fases_criadas}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {dryRunResult.fases_criadas === 1
                      ? "será criada"
                      : "serão criadas"}
                  </span>
                </div>
                {dryRunResult.fases_skipped > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {dryRunResult.fases_skipped}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {dryRunResult.fases_skipped === 1
                        ? "será ignorada"
                        : "serão ignoradas"}
                    </span>
                  </div>
                )}
                {dryRunResult.fases_falhadas > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                      {dryRunResult.fases_falhadas}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {dryRunResult.fases_falhadas === 1
                        ? "falhará"
                        : "falharão"}
                    </span>
                  </div>
                )}
              </div>

              {/* Detail per annotation */}
              {dryRunResult.detalhes.length > 0 && (
                <div className="space-y-1.5">
                  {dryRunResult.detalhes.map((detalhe) => (
                    <div
                      key={detalhe.anotacao_id}
                      className="flex items-center gap-2 text-xs"
                    >
                      <SyncStatusBadge status={detalhe.status} />
                      <span className="text-zinc-600 dark:text-zinc-400 tabular-nums font-mono">
                        #{detalhe.anotacao_id}
                      </span>
                      {detalhe.reason && (
                        <span className="text-zinc-400 dark:text-zinc-500 truncate">
                          {detalhe.reason}
                        </span>
                      )}
                      {detalhe.error && (
                        <span className="text-rose-500 dark:text-rose-400 truncate">
                          {detalhe.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Errors */}
              {dryRunResult.erros.length > 0 && (
                <div className="rounded-md bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 px-3 py-2 space-y-1">
                  {dryRunResult.erros.map((err, i) => (
                    <p
                      key={i}
                      className="text-xs text-rose-600 dark:text-rose-400"
                    >
                      {err}
                    </p>
                  ))}
                </div>
              )}

              {/* Confirm button */}
              <Button
                size="sm"
                onClick={handleConfirmSync}
                disabled={
                  syncMutation.isPending || dryRunResult.fases_criadas === 0
                }
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {syncMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                Confirmar Sync Real
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Right Panel: Anotacao Rapida ───────────────────────────────── */}
      <div>
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <Send className="h-4 w-4" />
              Anotação Rápida
            </CardTitle>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Envie uma anotação diretamente ao histórico de um atendimento no
              Solar.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Atendimento ID */}
            <div className="space-y-1.5">
              <label
                htmlFor="atendimento-id"
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                Atendimento ID
              </label>
              <Input
                id="atendimento-id"
                placeholder="Ex: 12345"
                value={atendimentoId}
                onChange={(e) => setAtendimentoId(e.target.value)}
                className="h-9 text-sm font-mono"
              />
            </div>

            {/* Texto */}
            <div className="space-y-1.5">
              <label
                htmlFor="texto-nota"
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                Texto
              </label>
              <textarea
                id="texto-nota"
                placeholder="Conteúdo da anotação..."
                value={textoNota}
                onChange={(e) =>
                  setTextoNota(e.target.value.slice(0, MAX_TEXTO_CHARS))
                }
                rows={5}
                className="flex min-h-[80px] w-full rounded-lg border-2 border-input bg-background px-4 py-2 text-sm shadow-sm transition-all duration-200 placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 hover:border-border/80 resize-none"
              />
              <p className="text-right text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                {textoNota.length}/{MAX_TEXTO_CHARS}
              </p>
            </div>

            {/* Submit */}
            <Button
              size="sm"
              onClick={handleCriarAnotacao}
              disabled={
                criarAnotacaoMutation.isPending ||
                !atendimentoId.trim() ||
                !textoNota.trim()
              }
              className="w-full h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {criarAnotacaoMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Enviar ao Solar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
