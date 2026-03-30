"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Search,
  Upload,
  CheckCircle2,
  Users,
  FileText,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BatchProgressBar } from "./batch-progress-bar";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SolarProcessoStatus = "synced" | "stale" | "not_registered";
type AssistidoFilter = "todos" | "exportaveis" | "sem_cpf" | "exportados";
type AssistidoSolarStatus = "exported" | "sigad_only" | "no_cpf" | "unchecked";

interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  isActive: boolean;
}

interface ExportResult {
  assistidoId: number;
  nome?: string;
  campos_enriquecidos?: string[];
}

interface SyncPorNomeResult {
  numero_processo: string;
  descricao?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_PROGRESS: BatchProgress = {
  total: 0,
  completed: 0,
  failed: 0,
  isActive: false,
};

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function maskCpf(cpf: string | null): string {
  if (!cpf) return "---";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return digits.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "XXX.XXX.XXX-$4"
  );
}

function formatDateSafe(date: Date | string | null | undefined): string {
  if (!date) return "---";
  try {
    return format(new Date(date), "dd/MM/yy HH:mm", { locale: ptBR });
  } catch {
    return "---";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge Components
// ─────────────────────────────────────────────────────────────────────────────

function ProcessoStatusBadge({ status }: { status: SolarProcessoStatus }) {
  const config = {
    synced: {
      dot: "bg-emerald-500",
      text: "Sincronizado",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
    },
    stale: {
      dot: "bg-amber-500",
      text: "Desatualizado",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
    },
    not_registered: {
      dot: "bg-rose-500",
      text: "Não cadastrado",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400",
    },
  } as const;

  const c = config[status];

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 text-[11px] font-medium px-2 py-0.5", c.className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", c.dot)} />
      {c.text}
    </Badge>
  );
}

function AssistidoStatusBadge({ status }: { status: AssistidoSolarStatus }) {
  const config = {
    exported: {
      dot: "bg-emerald-500",
      text: "Exportado",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
    },
    sigad_only: {
      dot: "bg-amber-500",
      text: "No SIGAD",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
    },
    no_cpf: {
      dot: "bg-rose-500",
      text: "Sem CPF",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400",
    },
    unchecked: {
      dot: "bg-zinc-400",
      text: "Não verificado",
      className:
        "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400",
    },
  } as const;

  const c = config[status];

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 text-[11px] font-medium px-2 py-0.5", c.className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", c.dot)} />
      {c.text}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Summary Row
// ─────────────────────────────────────────────────────────────────────────────

interface KpiItem {
  label: string;
  value: number;
  color: string;
}

function KpiSummaryRow({ items }: { items: KpiItem[] }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-base font-semibold tabular-nums",
              item.color
            )}
          >
            {item.value}
          </span>
          <span className="text-xs text-muted-foreground">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────

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
      <Icon className="h-10 w-10 text-muted-foreground/50 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">
        {title}
      </p>
      <p className="text-xs text-muted-foreground/50 mt-1 max-w-xs">
        {description}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function SolarBatchOperations() {
  // ── Sync Processos state ────────────────────────────────────────────────
  const [searchProcessosInput, setSearchProcessosInput] = useState("");
  const searchProcessos = useDebounce(searchProcessosInput, 500);
  const [selectedProcessos, setSelectedProcessos] = useState<Set<number>>(
    new Set()
  );
  const [syncProgress, setSyncProgress] =
    useState<BatchProgress>(INITIAL_PROGRESS);

  // Search by name
  const [nomeBusca, setNomeBusca] = useState("");
  const [nomeBuscaResults, setNomeBuscaResults] = useState<
    SyncPorNomeResult[] | null
  >(null);

  // ── Export SIGAD state ──────────────────────────────────────────────────
  const [searchAssistidosInput, setSearchAssistidosInput] = useState("");
  const searchAssistidos = useDebounce(searchAssistidosInput, 500);
  const [filterAssistidos, setFilterAssistidos] =
    useState<AssistidoFilter>("todos");
  const [selectedAssistidos, setSelectedAssistidos] = useState<Set<number>>(
    new Set()
  );
  const [exportProgress, setExportProgress] =
    useState<BatchProgress>(INITIAL_PROGRESS);
  const [exportResults, setExportResults] = useState<ExportResult[] | null>(
    null
  );

  // ── Queries ─────────────────────────────────────────────────────────────
  const {
    data: processos = [],
    isLoading: isLoadingProcessos,
    refetch: refetchProcessos,
  } = trpc.solar.processosParaSolar.useQuery(
    { search: searchProcessos },
    { staleTime: 30_000 }
  );

  const {
    data: assistidos = [],
    isLoading: isLoadingAssistidos,
    refetch: refetchAssistidos,
  } = trpc.solar.assistidosParaSolar.useQuery(
    { search: searchAssistidos, filter: filterAssistidos },
    { staleTime: 30_000 }
  );

  // ── Mutations ───────────────────────────────────────────────────────────
  const syncBatchMutation = trpc.solar.syncBatch.useMutation();
  const exportBatchMutation = trpc.solar.exportarBatch.useMutation();
  const syncPorNomeMutation = trpc.solar.syncPorNome.useMutation();

  // ── Processos KPIs ──────────────────────────────────────────────────────
  const processosKpis = useMemo(() => {
    const total = processos.length;
    const synced = processos.filter((p) => p.solarStatus === "synced").length;
    const stale = processos.filter((p) => p.solarStatus === "stale").length;
    const notRegistered = processos.filter(
      (p) => p.solarStatus === "not_registered"
    ).length;
    return { total, synced, stale, notRegistered };
  }, [processos]);

  // ── Assistidos KPIs ─────────────────────────────────────────────────────
  const assistidosKpis = useMemo(() => {
    const total = assistidos.length;
    const exported = assistidos.filter(
      (a) => a.solarStatus === "exported"
    ).length;
    const exportable = assistidos.filter(
      (a) => a.solarStatus === "sigad_only"
    ).length;
    const noCpf = assistidos.filter(
      (a) => a.solarStatus === "no_cpf"
    ).length;
    return { total, exported, exportable, noCpf };
  }, [assistidos]);

  // ── Selection helpers: Processos ────────────────────────────────────────
  const toggleProcesso = useCallback((id: number) => {
    setSelectedProcessos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAllProcessos = useCallback(() => {
    setSelectedProcessos((prev) => {
      if (prev.size === processos.length && processos.length > 0) {
        return new Set();
      }
      return new Set(processos.map((p) => p.id));
    });
  }, [processos]);

  // ── Selection helpers: Assistidos ───────────────────────────────────────
  const selectableAssistidos = useMemo(
    () => assistidos.filter((a) => a.solarStatus !== "no_cpf"),
    [assistidos]
  );

  const toggleAssistido = useCallback((id: number) => {
    setSelectedAssistidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAllAssistidos = useCallback(() => {
    setSelectedAssistidos((prev) => {
      if (
        prev.size === selectableAssistidos.length &&
        selectableAssistidos.length > 0
      ) {
        return new Set();
      }
      return new Set(selectableAssistidos.map((a) => a.id));
    });
  }, [selectableAssistidos]);

  // ── Batch sync handler ──────────────────────────────────────────────────
  async function handleBatchSync() {
    const ids = [...selectedProcessos];
    if (ids.length === 0) return;

    setSyncProgress({
      total: ids.length,
      completed: 0,
      failed: 0,
      isActive: true,
    });

    try {
      const result = await syncBatchMutation.mutateAsync({
        processoIds: ids,
        downloadPdfs: true,
      });
      setSyncProgress({
        total: result.total,
        completed: result.succeeded,
        failed: result.failed,
        isActive: false,
      });
      toast.success(
        `Sync completo: ${result.succeeded} de ${result.total}`
      );
      setSelectedProcessos(new Set());
      void refetchProcessos();
    } catch {
      setSyncProgress((prev) => ({
        ...prev,
        isActive: false,
        failed: prev.total - prev.completed,
      }));
      toast.error("Erro no sync batch");
    }
  }

  // ── Batch export handler ────────────────────────────────────────────────
  async function handleBatchExport() {
    const ids = [...selectedAssistidos];
    if (ids.length === 0) return;

    setExportProgress({
      total: ids.length,
      completed: 0,
      failed: 0,
      isActive: true,
    });

    try {
      const result = await exportBatchMutation.mutateAsync({
        assistidoIds: ids,
      });
      setExportProgress({
        total: result.total,
        completed: result.succeeded,
        failed: result.failed,
        isActive: false,
      });
      setExportResults(
        result.results.filter(
          (r) =>
            r.success &&
            r.campos_enriquecidos &&
            r.campos_enriquecidos.length > 0
        )
      );
      toast.success(
        `Export completo: ${result.succeeded} de ${result.total}`
      );
      setSelectedAssistidos(new Set());
      void refetchAssistidos();
    } catch {
      setExportProgress((prev) => ({
        ...prev,
        isActive: false,
        failed: prev.total - prev.completed,
      }));
      toast.error("Erro no export batch");
    }
  }

  // ── Search by defensor name ─────────────────────────────────────────────
  async function handleSyncPorNome() {
    if (!nomeBusca.trim()) return;

    try {
      const result = await syncPorNomeMutation.mutateAsync({
        nome: nomeBusca.trim(),
      });
      if (result.success) {
        setNomeBuscaResults(result.processos as any);
        toast.success(
          `${result.processos_encontrados} processo(s) encontrado(s)`
        );
      } else {
        setNomeBuscaResults([]);
        toast.error(result.errors?.[0] ?? "Erro ao buscar processos");
      }
    } catch {
      toast.error("Erro ao buscar processos por nome");
    }
  }

  // ── Clear selection when data changes ───────────────────────────────────
  useEffect(() => {
    setSelectedProcessos(new Set());
  }, [searchProcessos]);

  useEffect(() => {
    setSelectedAssistidos(new Set());
  }, [searchAssistidos, filterAssistidos]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Tabs defaultValue="sync-processos" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="sync-processos" className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Sync Processos
        </TabsTrigger>
        <TabsTrigger value="export-sigad" className="gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          Export SIGAD
        </TabsTrigger>
      </TabsList>

      {/* ─── Tab 1: Sync Processos ─────────────────────────────────────── */}
      <TabsContent value="sync-processos" className="space-y-4">
        {/* Search + KPIs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou assistido..."
              value={searchProcessosInput}
              onChange={(e) => setSearchProcessosInput(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <KpiSummaryRow
            items={[
              {
                label: "Total",
                value: processosKpis.total,
                color: "text-foreground/80",
              },
              {
                label: "Sincronizados",
                value: processosKpis.synced,
                color: "text-emerald-600 dark:text-emerald-400",
              },
              {
                label: "Desatualizados",
                value: processosKpis.stale,
                color: "text-amber-600 dark:text-amber-400",
              },
              {
                label: "Não cadastrados",
                value: processosKpis.notRegistered,
                color: "text-rose-600 dark:text-rose-400",
              },
            ]}
          />
        </div>

        {/* Batch action bar */}
        {selectedProcessos.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800 dark:bg-emerald-950/20">
            <span className="text-sm text-emerald-700 dark:text-emerald-300 tabular-nums">
              {selectedProcessos.size} selecionado
              {selectedProcessos.size !== 1 ? "s" : ""}
            </span>
            <Button
              size="sm"
              onClick={handleBatchSync}
              disabled={syncBatchMutation.isPending}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {syncBatchMutation.isPending ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1.5" />
              )}
              Sincronizar {selectedProcessos.size} selecionado
              {selectedProcessos.size !== 1 ? "s" : ""}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProcessos(new Set())}
              className="h-7 text-xs text-muted-foreground"
            >
              Limpar
            </Button>
          </div>
        )}

        {/* Sync progress bar */}
        {syncProgress.total > 0 && (
          <BatchProgressBar
            total={syncProgress.total}
            completed={syncProgress.completed}
            failed={syncProgress.failed}
            isActive={syncProgress.isActive}
            label="Sincronizando processos com o Solar"
          />
        )}

        {/* Table */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            {isLoadingProcessos ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
              </div>
            ) : processos.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nenhum processo encontrado"
                description="Tente alterar os termos de busca ou verifique a conexão com o Solar."
              />
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          processos.length > 0 &&
                          selectedProcessos.size === processos.length
                        }
                        onCheckedChange={toggleAllProcessos}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Processo</TableHead>
                    <TableHead>Assistido</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Comarca/Vara
                    </TableHead>
                    <TableHead>Status Solar</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processos.map((p) => (
                    <TableRow
                      key={p.id}
                      data-state={
                        selectedProcessos.has(p.id) ? "selected" : undefined
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedProcessos.has(p.id)}
                          onCheckedChange={() => toggleProcesso(p.id)}
                          aria-label={`Selecionar processo ${p.numeroAutos ?? p.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-foreground/80">
                          {p.numeroAutos ?? "---"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground/80">
                          {p.assistidoNome ?? "---"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">
                            {p.comarca ?? "---"}
                          </span>
                          {p.vara && (
                            <span className="text-[11px] text-muted-foreground/50">
                              {p.vara}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ProcessoStatusBadge status={p.solarStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await syncBatchMutation.mutateAsync({
                                processoIds: [p.id],
                                downloadPdfs: true,
                              });
                              toast.success("Processo sincronizado");
                              void refetchProcessos();
                            } catch {
                              toast.error("Erro ao sincronizar processo");
                            }
                          }}
                          disabled={syncBatchMutation.isPending}
                          className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Sync
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Search by defensor name ──────────────────────────────────── */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground/80 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Buscar processos por nome do defensor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do defensor..."
                value={nomeBusca}
                onChange={(e) => setNomeBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSyncPorNome();
                }}
                className="h-9 text-sm"
              />
              <Button
                size="sm"
                onClick={handleSyncPorNome}
                disabled={
                  syncPorNomeMutation.isPending || !nomeBusca.trim()
                }
                className="h-9 text-xs shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {syncPorNomeMutation.isPending ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Search className="h-3 w-3 mr-1.5" />
                )}
                Buscar no Solar
              </Button>
            </div>

            {/* Results */}
            {nomeBuscaResults !== null && (
              <div className="rounded-lg border border-border overflow-hidden">
                {nomeBuscaResults.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhum processo encontrado para esse nome.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Processo</TableHead>
                        <TableHead>Descrição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nomeBuscaResults.map((r, i) => (
                        <TableRow key={`${r.numero_processo}-${i}`}>
                          <TableCell>
                            <span className="font-mono text-xs text-foreground/80">
                              {r.numero_processo}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {r.descricao ?? "---"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Tab 2: Export SIGAD ────────────────────────────────────────── */}
      <TabsContent value="export-sigad" className="space-y-4">
        {/* Filter pills + search + KPIs */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { key: "todos", label: "Todos" },
                  { key: "exportaveis", label: "Exportáveis" },
                  { key: "sem_cpf", label: "Sem CPF" },
                  { key: "exportados", label: "Exportados" },
                ] as const
              ).map((f) => (
                <Button
                  key={f.key}
                  variant={filterAssistidos === f.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterAssistidos(f.key)}
                  className={cn(
                    "h-7 text-xs rounded-full",
                    filterAssistidos === f.key &&
                      "bg-emerald-600 hover:bg-emerald-700 text-white"
                  )}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchAssistidosInput}
                onChange={(e) => setSearchAssistidosInput(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* KPIs */}
          <KpiSummaryRow
            items={[
              {
                label: "Total",
                value: assistidosKpis.total,
                color: "text-foreground/80",
              },
              {
                label: "Exportados",
                value: assistidosKpis.exported,
                color: "text-emerald-600 dark:text-emerald-400",
              },
              {
                label: "Exportáveis",
                value: assistidosKpis.exportable,
                color: "text-amber-600 dark:text-amber-400",
              },
              {
                label: "Sem CPF",
                value: assistidosKpis.noCpf,
                color: "text-rose-600 dark:text-rose-400",
              },
            ]}
          />
        </div>

        {/* Batch action bar */}
        {selectedAssistidos.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800 dark:bg-emerald-950/20">
            <span className="text-sm text-emerald-700 dark:text-emerald-300 tabular-nums">
              {selectedAssistidos.size} selecionado
              {selectedAssistidos.size !== 1 ? "s" : ""}
            </span>
            <Button
              size="sm"
              onClick={handleBatchExport}
              disabled={exportBatchMutation.isPending}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {exportBatchMutation.isPending ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-3 w-3 mr-1.5" />
              )}
              Exportar {selectedAssistidos.size} selecionado
              {selectedAssistidos.size !== 1 ? "s" : ""}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedAssistidos(new Set())}
              className="h-7 text-xs text-muted-foreground"
            >
              Limpar
            </Button>
          </div>
        )}

        {/* Export progress bar */}
        {exportProgress.total > 0 && (
          <BatchProgressBar
            total={exportProgress.total}
            completed={exportProgress.completed}
            failed={exportProgress.failed}
            isActive={exportProgress.isActive}
            label="Exportando assistidos via SIGAD"
          />
        )}

        {/* Export results: enriched fields */}
        {exportResults !== null && exportResults.length > 0 && (
          <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Campos enriquecidos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {exportResults.map((r) => (
                <div
                  key={r.assistidoId}
                  className="flex items-center gap-2 flex-wrap"
                >
                  <span className="text-xs font-medium text-foreground/80">
                    {r.nome ?? `ID ${r.assistidoId}`}:
                  </span>
                  {r.campos_enriquecidos?.map((campo) => (
                    <Badge
                      key={campo}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    >
                      {campo}
                    </Badge>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            {isLoadingAssistidos ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
              </div>
            ) : assistidos.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum assistido encontrado"
                description="Tente alterar os filtros ou termos de busca."
              />
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          selectableAssistidos.length > 0 &&
                          selectedAssistidos.size ===
                            selectableAssistidos.length
                        }
                        onCheckedChange={toggleAllAssistidos}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead className="hidden md:table-cell">
                      SIGAD ID
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Exportado em
                    </TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assistidos.map((a) => {
                    const isNoCpf = a.solarStatus === "no_cpf";
                    return (
                      <TableRow
                        key={a.id}
                        data-state={
                          selectedAssistidos.has(a.id)
                            ? "selected"
                            : undefined
                        }
                        className={cn(isNoCpf && "opacity-60")}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedAssistidos.has(a.id)}
                            onCheckedChange={() => toggleAssistido(a.id)}
                            disabled={isNoCpf}
                            aria-label={`Selecionar assistido ${a.nome ?? a.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground/80">
                            {a.nome ?? "---"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground tabular-nums">
                            {maskCpf(a.cpf)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="font-mono text-xs text-muted-foreground">
                            {a.sigadId ?? "---"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <AssistidoStatusBadge status={a.solarStatus} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {formatDateSafe(a.solarExportadoEm)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                const result =
                                  await exportBatchMutation.mutateAsync({
                                    assistidoIds: [a.id],
                                  });
                                const r = result.results[0];
                                if (r?.success) {
                                  toast.success(
                                    r.ja_existia_solar
                                      ? "Assistido ja existia no Solar"
                                      : "Assistido exportado com sucesso"
                                  );
                                } else {
                                  toast.error(
                                    r?.error ?? "Erro ao exportar"
                                  );
                                }
                                void refetchAssistidos();
                              } catch {
                                toast.error("Erro ao exportar assistido");
                              }
                            }}
                            disabled={
                              isNoCpf || exportBatchMutation.isPending
                            }
                            className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
                          >
                            <Upload className="h-3 w-3" />
                            Exportar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
