"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  FolderSearch,
  Zap,
  TriangleAlert,
  RefreshCw,
  Merge,
  UserPlus,
  Eye,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import Link from "next/link";

// ==========================================
// COLOR MAP
// ==========================================

const ATRIBUICAO_COLORS: Record<string, { bg: string; bar: string; text: string; label: string }> = {
  JURI_CAMACARI: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    bar: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "Juri",
  },
  VVD_CAMACARI: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    bar: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-400",
    label: "VVD",
  },
  EXECUCAO_PENAL: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    bar: "bg-blue-500",
    text: "text-blue-700 dark:text-blue-400",
    label: "Exec. Penal",
  },
  SUBSTITUICAO: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    bar: "bg-purple-500",
    text: "text-purple-700 dark:text-purple-400",
    label: "Substituicao",
  },
  SUBSTITUICAO_CIVEL: {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    bar: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
    label: "Subst. Civel",
  },
  GRUPO_JURI: {
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    bar: "bg-cyan-500",
    text: "text-cyan-700 dark:text-cyan-400",
    label: "Grupo Juri",
  },
};

function getAtribColor(key: string | null) {
  return ATRIBUICAO_COLORS[key || ""] || {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    bar: "bg-zinc-400",
    text: "text-zinc-600 dark:text-zinc-400",
    label: key || "Sem atribuicao",
  };
}

// ==========================================
// MAIN PAGE
// ==========================================

export default function EnrichmentDashboardPage() {
  const [batchScope, setBatchScope] = useState<string>("all_pending");
  const [batchAtribuicao, setBatchAtribuicao] = useState<string>("");
  const [detectDryRun, setDetectDryRun] = useState(true);

  const stats = trpc.enrichment.globalStats.useQuery(undefined, {
    staleTime: 30_000,
  });

  const detectMutation = trpc.drive.detectNewFolders.useMutation({
    onSuccess: (data) => {
      if (data.dryRun) {
        toast.success(`${data.orphanCount} pastas orfas encontradas`);
      } else {
        const created = data.results.filter((r: { action: string }) => r.action === "created" || r.action === "created_pending").length;
        const linked = data.results.filter((r: { action: string }) => r.action === "linked").length;
        toast.success(`${created} assistidos criados, ${linked} vinculados`);
        stats.refetch();
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const batchMutation = trpc.enrichment.batchProcess.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.queued} arquivos enfileirados para processamento`);
    },
    onError: (err) => toast.error(err.message),
  });

  const resolveMutation = trpc.enrichment.resolvePendente.useMutation({
    onSuccess: (data) => {
      if (data.action === "confirmed") {
        toast.success("Assistido confirmado como novo");
      } else {
        toast.success(`Mesclado com assistido #${data.mergedInto}`);
      }
      stats.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const fileStats = stats.data?.files;
  const byAtribuicao = stats.data?.byAtribuicao || [];
  const pendentes = stats.data?.pendentesRevisao || [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/settings" className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Enrichment Dashboard
          </h1>
          <p className="text-sm text-zinc-500">
            Processamento de documentos e reverse sync Drive
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Arquivos"
            value={fileStats?.total || 0}
            icon={<FileText className="h-4 w-4" />}
            color="zinc"
          />
          <StatCard
            label="Enriquecidos"
            value={fileStats?.enriched || 0}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="emerald"
          />
          <StatCard
            label="Processando"
            value={fileStats?.processing || 0}
            icon={<Loader2 className="h-4 w-4 animate-spin" />}
            color="amber"
          />
          <StatCard
            label="Falhas"
            value={fileStats?.failed || 0}
            icon={<XCircle className="h-4 w-4" />}
            color="red"
          />
        </div>
      )}

      {/* Pendentes Revisao */}
      {pendentes.length > 0 && (
        <Card className="p-4 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-3">
            <TriangleAlert className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Pendentes Revisao ({pendentes.length})
            </h2>
          </div>
          <div className="space-y-2">
            {pendentes.map((p) => {
              const dup = p.duplicataSugerida as { assistidoId: number; nome: string; confidence: number } | null;
              const color = getAtribColor(p.atribuicaoPrimaria);
              return (
                <div key={p.id} className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {p.nome}
                      </span>
                      <Badge variant="outline" className={cn("text-xs", color.text)}>
                        {color.label}
                      </Badge>
                    </div>
                    {dup && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Possivel duplicata de &ldquo;{dup.nome}&rdquo; (ID {dup.assistidoId}, {Math.round(dup.confidence * 100)}%)
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => resolveMutation.mutate({ assistidoId: p.id, action: "confirm_new" })}
                      disabled={resolveMutation.isPending}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Confirmar Novo
                    </Button>
                    {dup && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => resolveMutation.mutate({
                          assistidoId: p.id,
                          action: "merge",
                          mergeTargetId: dup.assistidoId,
                        })}
                        disabled={resolveMutation.isPending}
                      >
                        <Merge className="h-3 w-3 mr-1" />
                        Mesclar
                      </Button>
                    )}
                    <Link href={`/admin/assistidos/${p.id}`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Batch Processing */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Processamento em Batch
        </h2>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Escopo</label>
            <Select value={batchScope} onValueChange={setBatchScope}>
              <SelectTrigger className="w-48 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_pending">Todos pendentes</SelectItem>
                <SelectItem value="by_atribuicao">Por atribuicao</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {batchScope === "by_atribuicao" && (
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Atribuicao</label>
              <Select value={batchAtribuicao} onValueChange={setBatchAtribuicao}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JURI_CAMACARI">Juri</SelectItem>
                  <SelectItem value="VVD_CAMACARI">VVD</SelectItem>
                  <SelectItem value="EXECUCAO_PENAL">Exec. Penal</SelectItem>
                  <SelectItem value="SUBSTITUICAO">Substituicao</SelectItem>
                  <SelectItem value="GRUPO_JURI">Grupo Juri</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            size="sm"
            onClick={() => batchMutation.mutate({
              scope: batchScope as "all_pending" | "by_atribuicao",
              atribuicao: batchScope === "by_atribuicao" ? batchAtribuicao : undefined,
              onlyNew: true,
            })}
            disabled={batchMutation.isPending || (batchScope === "by_atribuicao" && !batchAtribuicao)}
          >
            {batchMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-1" />
            )}
            Processar Batch
          </Button>
        </div>
      </Card>

      {/* Detect New Folders (Reverse Sync) */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Detectar Pastas Novas (Reverse Sync)
        </h2>
        <p className="text-xs text-zinc-500 mb-3">
          Escaneia as pastas de atribuicao no Drive e cria assistidos para pastas orfas.
        </p>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDetectDryRun(true);
              detectMutation.mutate({ dryRun: true });
            }}
            disabled={detectMutation.isPending}
          >
            {detectMutation.isPending && detectDryRun ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FolderSearch className="h-4 w-4 mr-1" />
            )}
            Preview
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setDetectDryRun(false);
              detectMutation.mutate({ dryRun: false });
            }}
            disabled={detectMutation.isPending}
          >
            {detectMutation.isPending && !detectDryRun ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-1" />
            )}
            Executar Sync
          </Button>
        </div>

        {/* Preview Results */}
        {detectMutation.data?.dryRun && detectMutation.data.orphans.length > 0 && (
          <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
            <p className="text-xs text-zinc-500 mb-2">
              {detectMutation.data.orphanCount} pastas orfas encontradas:
            </p>
            {detectMutation.data.orphans.map((o) => {
              const color = getAtribColor(
                o.atribuicao === "JURI" ? "JURI_CAMACARI" :
                o.atribuicao === "VVD" ? "VVD_CAMACARI" :
                o.atribuicao === "EP" ? "EXECUCAO_PENAL" :
                o.atribuicao
              );
              return (
                <div key={o.folderId} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-zinc-50 dark:bg-zinc-800/50">
                  <Badge variant="outline" className={cn("text-xs shrink-0", color.text)}>
                    {color.label}
                  </Badge>
                  <span className="text-zinc-700 dark:text-zinc-300 truncate">{o.folderName}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Execution Results */}
        {detectMutation.data && !detectMutation.data.dryRun && detectMutation.data.results.length > 0 && (
          <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
            <p className="text-xs text-zinc-500 mb-2">
              Resultados:
            </p>
            {detectMutation.data.results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-zinc-50 dark:bg-zinc-800/50">
                {r.action === "created" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                {r.action === "created_pending" && <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                {r.action === "linked" && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                {r.action === "skipped" && <XCircle className="h-3.5 w-3.5 text-zinc-400 shrink-0" />}
                {r.action === "error" && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                <span className="text-zinc-700 dark:text-zinc-300 truncate">
                  {(r as Record<string, unknown>).folderName as string || (r as Record<string, unknown>).assistidoNome as string || "Unknown"}
                </span>
                <Badge variant="outline" className="text-xs ml-auto shrink-0">
                  {r.action}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Status by Atribuicao */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Status por Atribuicao
          </h2>
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => stats.refetch()}
            disabled={stats.isRefetching}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", stats.isRefetching && "animate-spin")} />
          </Button>
        </div>
        {stats.isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 rounded" />
            ))}
          </div>
        ) : byAtribuicao.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum dado disponivel</p>
        ) : (
          <div className="space-y-2.5">
            {byAtribuicao.map((item) => {
              const color = getAtribColor(item.atribuicao);
              const pct = item.totalFiles > 0
                ? Math.round((item.enriched / item.totalFiles) * 100)
                : 0;

              return (
                <div key={item.atribuicao} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn("font-medium", color.text)}>
                      {color.label}
                    </span>
                    <span className="text-zinc-500 text-xs tabular-nums">
                      {pct}% ({item.enriched}/{item.totalFiles})
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", color.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ==========================================
// COMPONENTS
// ==========================================

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "zinc" | "emerald" | "amber" | "red";
}) {
  const colorMap = {
    zinc: "text-zinc-600 dark:text-zinc-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={colorMap[color]}>{icon}</span>
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
        {value.toLocaleString("pt-BR")}
      </p>
    </Card>
  );
}
