"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import {
  DRIVE_ATRIBUICOES,
  SPECIAL_FOLDERS,
} from "./drive-constants";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  HardDrive,
  Sparkles,
  Clock,
  Link2,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Timer,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// --- Types ---

interface SyncFolder {
  id: number;
  driveFolderId: string;
  name: string;
  isActive: boolean;
  lastSyncAt: Date | null;
  syncToken: string | null;
  fileCount: number;
}

// --- Atribuicao Card (compact, refined) ---

function AtribuicaoCard({
  atribuicao,
  fileCount,
  lastSyncAt,
}: {
  atribuicao: (typeof DRIVE_ATRIBUICOES)[number];
  fileCount: number;
  lastSyncAt: Date | null;
}) {
  const ctx = useDriveContext();
  const Icon = atribuicao.icon;

  const syncTimeStr = useMemo(() => {
    if (!lastSyncAt) return "Nunca";
    try {
      return formatDistanceToNow(new Date(lastSyncAt), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "—";
    }
  }, [lastSyncAt]);

  const handleClick = () => {
    ctx.setSelectedAtribuicao(atribuicao.key);
    if (atribuicao.folderId) {
      ctx.navigateToFolder(atribuicao.folderId, atribuicao.label);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 cursor-pointer text-left",
        "transition-all duration-200 hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-black/20 hover:-translate-y-0.5",
        atribuicao.hoverClass
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <span
          className={cn("h-2 w-2 rounded-full shrink-0", atribuicao.dotClass)}
        />
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", atribuicao.iconBgClass)}>
          <Icon className={cn("h-4 w-4", atribuicao.iconClass)} />
        </div>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
          {atribuicao.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {fileCount} arquivo{fileCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-zinc-400 dark:text-zinc-600" />
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{syncTimeStr}</span>
        </div>
      </div>
    </button>
  );
}

// --- Special Folder Card ---

function SpecialFolderCard({
  folder,
  fileCount,
}: {
  folder: (typeof SPECIAL_FOLDERS)[number];
  fileCount: number;
}) {
  const ctx = useDriveContext();
  const Icon = folder.icon;

  const handleClick = () => {
    ctx.setSelectedAtribuicao(null);
    if (folder.folderId) {
      ctx.navigateToFolder(folder.folderId, folder.label);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 cursor-pointer text-left",
        "transition-all duration-200 hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-black/20 hover:-translate-y-0.5",
        folder.hoverClass
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center",
            folder.iconBgClass
          )}
        >
          <Icon className={cn("h-5 w-5", folder.iconClass)} />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{folder.label}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {fileCount} arquivo{fileCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </button>
  );
}

// --- Main Component ---

export function DriveOverviewDashboard() {
  const { data: syncFolders, isLoading: isLoadingSyncFolders } =
    trpc.drive.syncFolders.useQuery(undefined, { staleTime: 30_000 });

  const { data: statsDetailed, isLoading: isLoadingStats } =
    trpc.drive.statsDetailed.useQuery({}, { staleTime: 30_000 });

  const { data: stats } = trpc.drive.stats.useQuery(undefined, {
    staleTime: 30_000,
  });

  const retryEnrichment = trpc.drive.retryEnrichment.useMutation({
    onSuccess: () => {
      toast.success("Processamento de pendentes iniciado");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao processar pendentes");
    },
  });

  const folderCountMap = useMemo(() => {
    const map: Record<string, { fileCount: number; lastSyncAt: Date | null }> =
      {};
    if (!syncFolders) return map;
    for (const sf of syncFolders as SyncFolder[]) {
      map[sf.driveFolderId] = {
        fileCount: sf.fileCount,
        lastSyncAt: sf.lastSyncAt,
      };
    }
    return map;
  }, [syncFolders]);

  const enrichmentCounts = useMemo(() => {
    if (!statsDetailed?.byEnrichment) {
      return { completed: 0, processing: 0, pending: 0, failed: 0 };
    }
    const counts = { completed: 0, processing: 0, pending: 0, failed: 0 };
    for (const item of statsDetailed.byEnrichment) {
      const status = item.enrichmentStatus as keyof typeof counts;
      if (status in counts) {
        counts[status] = item.count;
      }
    }
    return counts;
  }, [statsDetailed]);

  const totalFiles = statsDetailed?.total ?? stats?.totalFiles ?? 0;
  const linkedPercent = useMemo(() => {
    if (!statsDetailed || !statsDetailed.total || statsDetailed.total === 0) return 0;
    return Math.round((statsDetailed.linked / statsDetailed.total) * 100);
  }, [statsDetailed]);

  const enrichedPercent = useMemo(() => {
    if (!totalFiles || totalFiles === 0) return 0;
    return Math.round((enrichmentCounts.completed / totalFiles) * 100);
  }, [totalFiles, enrichmentCounts.completed]);

  const lastSyncStr = useMemo(() => {
    if (!syncFolders || (syncFolders as SyncFolder[]).length === 0)
      return "Nunca";
    const sorted = (syncFolders as SyncFolder[])
      .filter((f) => f.lastSyncAt)
      .sort(
        (a, b) =>
          new Date(b.lastSyncAt!).getTime() -
          new Date(a.lastSyncAt!).getTime()
      );
    if (sorted.length === 0) return "Nunca";
    try {
      return formatDistanceToNow(new Date(sorted[0].lastSyncAt!), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "—";
    }
  }, [syncFolders]);

  const isLoading = isLoadingSyncFolders || isLoadingStats;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
        {/* --- Header + Inline Stats --- */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
              <HardDrive className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Drive Hub
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {stats?.syncedFolders ?? 0} pastas sincronizadas
              </p>
            </div>
          </div>

          {/* Inline stats — subtle, no big cards */}
          <div className="flex items-center gap-3 sm:gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{totalFiles}</span>
              <span className="text-zinc-400 dark:text-zinc-500 text-xs">docs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{linkedPercent}%</span>
              <span className="text-zinc-400 dark:text-zinc-500 text-xs">vinculados</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{lastSyncStr}</span>
            </div>
          </div>
        </div>

        {/* --- Atribuicao Cards --- */}
        <div>
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
            Atribuicoes
          </h3>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 animate-pulse"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-2 w-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                    <div className="h-4 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                  <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DRIVE_ATRIBUICOES.map((attr) => {
                const data = folderCountMap[attr.folderId];
                return (
                  <AtribuicaoCard
                    key={attr.key}
                    atribuicao={attr}
                    fileCount={data?.fileCount ?? 0}
                    lastSyncAt={data?.lastSyncAt ?? null}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* --- Special Folders --- */}
        <div>
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
            Pastas Especiais
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SPECIAL_FOLDERS.map((sf) => {
              const data = folderCountMap[sf.folderId];
              return (
                <SpecialFolderCard
                  key={sf.key}
                  folder={sf}
                  fileCount={data?.fileCount ?? 0}
                />
              );
            })}
          </div>
        </div>

        {/* --- Enrichment: Inline compact --- */}
        <div>
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
            Extracao com IA
          </h3>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4">
            {isLoadingStats ? (
              <div className="h-8 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            ) : (
              <div className="space-y-3">
                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${enrichedPercent}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-zinc-600 dark:text-zinc-300 min-w-[3ch] text-right">
                    {enrichedPercent}%
                  </span>
                </div>

                {/* Inline counters */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{enrichmentCounts.completed}</span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">extraidos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                    <span className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{enrichmentCounts.processing}</span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">processando</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                    <span className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{enrichmentCounts.pending}</span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">pendentes</span>
                  </div>
                  {enrichmentCounts.failed > 0 && (
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                      <span className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{enrichmentCounts.failed}</span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">falhas</span>
                    </div>
                  )}

                  {/* Retry button inline */}
                  {enrichmentCounts.pending > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 rounded-lg ml-auto"
                      onClick={() => retryEnrichment.mutate({})}
                      disabled={retryEnrichment.isPending}
                    >
                      {retryEnrichment.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3 mr-1" />
                      )}
                      Processar {enrichmentCounts.pending}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
