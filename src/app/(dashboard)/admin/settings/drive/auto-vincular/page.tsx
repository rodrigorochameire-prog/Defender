"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link2,
  Search,
  Users,
  FolderOpen,
  X,
  RefreshCw,
  HardDrive,
  Percent,
  Eye,
  Zap,
  FolderPlus,
  Plus,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import Link from "next/link";

// ==========================================
// COLOR MAP FOR ATRIBUICOES
// ==========================================

const ATRIBUICAO_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  JURI: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  VVD: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
  },
  EP: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    bar: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
  },
  SUBSTITUICAO: {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    bar: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
  },
  GRUPO_JURI: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    bar: "bg-orange-500",
    text: "text-orange-700 dark:text-orange-400",
  },
};

function getAtribuicaoColor(key: string) {
  return ATRIBUICAO_COLORS[key] || ATRIBUICAO_COLORS.SUBSTITUICAO;
}

function getRateColor(rate: number) {
  if (rate >= 80) return "bg-emerald-500";
  if (rate >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

// ==========================================
// MATCH TYPE LABELS
// ==========================================

const MATCH_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  exact: { label: "exato", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
  first_last: { label: "nome/sobrenome", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  contains: { label: "contido", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300" },
  fuzzy: { label: "fuzzy", color: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300" },
  none: { label: "-", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function DriveSyncDashboardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [createMissing, setCreateMissing] = useState(false);
  const [showPreviewResults, setShowPreviewResults] = useState(false);

  // Dashboard data
  const {
    data: dashboard,
    isLoading: loadingDashboard,
    refetch: refetchDashboard,
  } = trpc.drive.syncDashboard.useQuery();

  // Assistidos list for manual linking
  const {
    data: assistidosData,
    isLoading: loadingAssistidos,
    refetch: refetchAssistidos,
  } = trpc.assistidos.list.useQuery({ limit: 100 });

  // Smart sync mutation
  const smartSyncMutation = trpc.drive.smartSync.useMutation({
    onSuccess: (result) => {
      if (result.dryRun) {
        setShowPreviewResults(true);
        toast.success("Preview concluido!");
      } else {
        toast.success(
          `Sync executado: ${result.executed?.linked || 0} vinculados, ${result.executed?.created || 0} criados`
        );
        setShowPreviewResults(false);
        refetchDashboard();
        refetchAssistidos();
      }
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Derived data
  const assistidosSemVinculo = useMemo(() => {
    if (!assistidosData) return [];
    return assistidosData.filter((a) => !a.driveFolderId);
  }, [assistidosData]);

  const filteredAssistidos = useMemo(() => {
    if (!searchTerm.trim()) return assistidosSemVinculo;
    const term = searchTerm.toLowerCase();
    return assistidosSemVinculo.filter((a) => a.nome.toLowerCase().includes(term));
  }, [assistidosSemVinculo, searchTerm]);

  // Smart sync results helpers
  const syncResults = smartSyncMutation.data;
  const linkActions = syncResults?.actions.filter((a) => a.action === "link") || [];
  const createActions = syncResults?.actions.filter((a) => a.action === "create") || [];
  const noAtribActions = syncResults?.actions.filter((a) => a.action === "no_atribuicao") || [];

  const handlePreview = () => {
    smartSyncMutation.mutate({ dryRun: true, createMissing });
  };

  const handleExecute = () => {
    smartSyncMutation.mutate({ dryRun: false, createMissing });
  };

  return (
    <div className="space-y-6">
      {/* ========== HEADER ========== */}
      <div className="flex items-center gap-4">
        <Link href="/admin/settings/drive">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Drive Sync Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Sincronize pastas do Drive com assistidos do banco de dados
          </p>
        </div>
      </div>

      {/* ========== STATS OVERVIEW ========== */}
      {loadingDashboard ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : dashboard ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Assistidos */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.totals.totalAssistidos}</p>
                <p className="text-xs text-muted-foreground">Total assistidos</p>
              </div>
            </div>
          </Card>

          {/* Vinculados */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.totals.linked}</p>
                <p className="text-xs text-muted-foreground">Vinculados</p>
              </div>
            </div>
          </Card>

          {/* Pendentes */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.totals.unlinked}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </Card>

          {/* Taxa de vinculacao */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Percent className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.totals.linkRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de vinculacao</p>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* ========== BREAKDOWN POR ATRIBUICAO ========== */}
      {loadingDashboard ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : dashboard ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-base">Breakdown por Atribuicao</h3>
              <p className="text-sm text-muted-foreground">
                Status de vinculacao por area de atuacao
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => refetchDashboard()}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar dados</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="space-y-4">
            {dashboard.byAtribuicao.map((item) => {
              const total = item.linked + item.unlinked;
              const rate = total > 0 ? Math.round((item.linked / total) * 100) : 0;
              const colors = getAtribuicaoColor(item.key);
              const barColor = getRateColor(rate);

              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.label}</span>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0", colors.text)}
                      >
                        <HardDrive className="w-3 h-3 mr-1" />
                        {item.driveFolders} pastas
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-mono text-xs">
                        {item.linked}/{total}
                      </span>
                      <span className="text-xs font-medium">{rate}%</span>
                    </div>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        barColor
                      )}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {/* ========== SMART SYNC PANEL ========== */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Sync Inteligente</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Escaneia todas as pastas do Drive e vincula automaticamente por nome
              </p>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <Checkbox
                  checked={createMissing}
                  onCheckedChange={(checked) => setCreateMissing(!!checked)}
                />
                <span className="text-sm text-muted-foreground">
                  Criar pastas para assistidos sem match
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={smartSyncMutation.isPending}
              className="gap-2"
            >
              {smartSyncMutation.isPending && smartSyncMutation.variables?.dryRun ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Preview
            </Button>
            <Button
              onClick={handleExecute}
              disabled={smartSyncMutation.isPending}
              className="gap-2"
            >
              {smartSyncMutation.isPending && !smartSyncMutation.variables?.dryRun ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Executar
            </Button>
          </div>
        </div>

        {/* Smart Sync Results */}
        {showPreviewResults && syncResults && (
          <div className="mt-6 space-y-4">
            {/* Stats summary */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary" className="gap-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Link2 className="w-3 h-3" />
                {syncResults.stats.willLink} vinculos
              </Badge>
              <Badge variant="secondary" className="gap-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                <Plus className="w-3 h-3" />
                {syncResults.stats.willCreate} criacoes
              </Badge>
              <Badge variant="secondary" className="gap-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                <TriangleAlert className="w-3 h-3" />
                {syncResults.stats.noAtribuicao} sem atribuicao
              </Badge>
            </div>

            {/* Results list */}
            <div className="rounded-lg border overflow-hidden max-h-[420px] overflow-y-auto">
              {/* Link actions */}
              {linkActions.map((action, i) => (
                <div
                  key={`link-${i}`}
                  className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 bg-emerald-50/50 dark:bg-emerald-950/20"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">
                      {action.assistidoNome}
                    </span>
                    <span className="text-xs text-muted-foreground truncate block">
                      {action.folderName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        MATCH_TYPE_LABELS[action.matchType]?.color
                      )}
                    >
                      {Math.round(action.confidence * 100)}% {MATCH_TYPE_LABELS[action.matchType]?.label}
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Create actions */}
              {createActions.map((action, i) => (
                <div
                  key={`create-${i}`}
                  className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 bg-blue-50/50 dark:bg-blue-950/20"
                >
                  <FolderPlus className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">
                      {action.assistidoNome}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Criar pasta em {action.atribuicao}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400">
                    criar
                  </Badge>
                </div>
              ))}

              {/* No atribuicao actions */}
              {noAtribActions.map((action, i) => (
                <div
                  key={`noatrib-${i}`}
                  className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 bg-amber-50/50 dark:bg-amber-950/20"
                >
                  <TriangleAlert className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">
                      {action.assistidoNome}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Atribuicao: {action.atribuicao}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400">
                    sem atribuicao
                  </Badge>
                </div>
              ))}

              {/* Empty state */}
              {syncResults.actions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma acao pendente. Todos os assistidos ja estao vinculados.
                </div>
              )}
            </div>

            {/* Executed results */}
            {syncResults.executed && (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium text-sm">Sync executado com sucesso</span>
                </div>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{syncResults.executed.linked} vinculados</span>
                  <span>{syncResults.executed.created} criados</span>
                  {syncResults.executed.errors > 0 && (
                    <span className="text-rose-600">{syncResults.executed.errors} erros</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ========== MANUAL LINK SECTION ========== */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-base">Vinculacao Manual</h3>
            <p className="text-sm text-muted-foreground">
              {assistidosSemVinculo.length} assistido(s) sem vinculo ao Drive
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchAssistidos()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar assistido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        {loadingAssistidos ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredAssistidos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? (
              <>Nenhum assistido encontrado para &ldquo;{searchTerm}&rdquo;</>
            ) : (
              <>
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                <p className="font-medium">Todos os assistidos estao vinculados!</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredAssistidos.map((assistido) => (
              <AssistidoRow key={assistido.id} assistido={assistido} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ==========================================
// ASSISTIDO ROW COMPONENT (Manual Linking)
// ==========================================

interface AssistidoRowProps {
  assistido: {
    id: number;
    nome: string;
    cpf?: string | null;
    statusPrisional?: string | null;
  };
}

function AssistidoRow({ assistido }: AssistidoRowProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const utils = trpc.useUtils();

  // Fetch folder suggestions
  const { data: suggestions, isLoading: loadingSuggestions } =
    trpc.drive.suggestFoldersForAssistido.useQuery(
      { assistidoId: assistido.id },
      { enabled: showSuggestions }
    );

  // Link mutation
  const linkMutation = trpc.drive.linkAssistidoToFolder.useMutation({
    onSuccess: () => {
      toast.success(`${assistido.nome} vinculado com sucesso!`);
      setShowSuggestions(false);
      utils.assistidos.list.invalidate();
      utils.drive.syncDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleLink = (folderId: string) => {
    linkMutation.mutate({ assistidoId: assistido.id, folderId });
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    CADEIA_PUBLICA: {
      label: "Preso",
      color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    },
    PENITENCIARIA: {
      label: "Preso",
      color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    },
    COP: {
      label: "Preso",
      color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    },
    HOSPITAL_CUSTODIA: {
      label: "Preso",
      color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    },
    MONITORADO: {
      label: "Monitorado",
      color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
    DOMICILIAR: {
      label: "Domiciliar",
      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    },
    SOLTO: {
      label: "Solto",
      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
  };

  const status = statusConfig[assistido.statusPrisional || "SOLTO"] || statusConfig.SOLTO;

  return (
    <div className="border rounded-lg">
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{assistido.nome}</span>
            <Badge variant="secondary" className={cn("text-xs", status.color)}>
              {status.label}
            </Badge>
          </div>
          {assistido.cpf && (
            <p className="text-xs text-muted-foreground font-mono">{assistido.cpf}</p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="gap-2 cursor-pointer"
        >
          <FolderOpen className="w-4 h-4" />
          {showSuggestions ? "Ocultar" : "Sugestoes"}
        </Button>
      </div>

      {/* Folder suggestions */}
      {showSuggestions && (
        <div className="border-t p-3 bg-muted/30">
          {loadingSuggestions ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Buscando sugestoes...
            </div>
          ) : suggestions && suggestions.suggestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                Pastas sugeridas (clique para vincular):
              </p>
              {suggestions.suggestions.map((folder, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors",
                    "hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:border-emerald-800"
                  )}
                  onClick={() => handleLink(folder.id)}
                >
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        folder.similarity >= 0.9 &&
                          "bg-emerald-100 text-emerald-700 border-emerald-200",
                        folder.similarity >= 0.8 &&
                          folder.similarity < 0.9 &&
                          "bg-blue-100 text-blue-700 border-blue-200",
                        folder.similarity < 0.8 &&
                          "bg-amber-100 text-amber-700 border-amber-200"
                      )}
                    >
                      {Math.round(folder.similarity * 100)}% match
                    </Badge>
                    {linkMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <X className="w-4 h-4" />
              Nenhuma pasta similar encontrada
            </div>
          )}
        </div>
      )}
    </div>
  );
}
