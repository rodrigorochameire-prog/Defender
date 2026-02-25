"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import {
  DRIVE_ATRIBUICOES,
  SPECIAL_FOLDERS,
  getAtribuicaoFolderId,
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────

interface SyncFolder {
  id: number;
  driveFolderId: string;
  name: string;
  isActive: boolean;
  lastSyncAt: Date | null;
  syncToken: string | null;
  fileCount: number;
}

// ─── Stat Block ─────────────────────────────────────────────────────

function StatBlock({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
      <span className={cn("text-2xl font-bold tabular-nums", colorClass)}>
        {value}
      </span>
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
        {label}
      </span>
    </div>
  );
}

// ─── Atribuicao Card ────────────────────────────────────────────────

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
    if (!lastSyncAt) return "Nunca sincronizado";
    try {
      return formatDistanceToNow(new Date(lastSyncAt), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "Desconhecido";
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
        "bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 cursor-pointer text-left",
        "transition-all duration-200",
        atribuicao.hoverClass
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <span
          className={cn("h-2.5 w-2.5 rounded-full shrink-0", atribuicao.dotClass)}
        />
        <Icon className={cn("h-5 w-5", atribuicao.iconClass)} />
        <span className="text-sm font-medium text-zinc-200">
          {atribuicao.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs text-zinc-400">
            {fileCount} arquivo{fileCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-zinc-600" />
          <span className="text-[10px] text-zinc-500">{syncTimeStr}</span>
        </div>
      </div>
    </button>
  );
}

// ─── Special Folder Card ────────────────────────────────────────────

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
        "bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 cursor-pointer text-left",
        "transition-all duration-200",
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
          <p className="text-sm font-medium text-zinc-200">{folder.label}</p>
          <p className="text-xs text-zinc-500">
            {fileCount} arquivo{fileCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function DriveOverviewDashboard() {
  // Queries
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

  // Build file count map from syncFolders
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

  // Enrichment counts from statsDetailed
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

  // Linked vs unlinked
  const linkedPercent = useMemo(() => {
    if (!statsDetailed || !statsDetailed.total || statsDetailed.total === 0) return 0;
    return Math.round((statsDetailed.linked / statsDetailed.total) * 100);
  }, [statsDetailed]);

  // Last sync overall
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
      return "Desconhecido";
    }
  }, [syncFolders]);

  const isLoading = isLoadingSyncFolders || isLoadingStats;

  return (
    <div className="space-y-6 p-1">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Drive Hub</h2>
          <p className="text-xs text-zinc-500">
            {stats?.totalFiles ?? 0} documentos em{" "}
            {stats?.syncedFolders ?? 0} pastas sincronizadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-zinc-600" />
        </div>
      </div>

      {/* ─── Atribuicao Cards ─── */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Atribuicoes
        </h3>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <div className="h-5 w-5 rounded bg-zinc-700" />
                  <div className="h-4 w-20 rounded bg-zinc-700" />
                </div>
                <div className="h-3 w-full rounded bg-zinc-700/50" />
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

      {/* ─── Special Folders ─── */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
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

      {/* ─── Enrichment Stats ─── */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Extracao com IA
        </h3>
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
          {isLoadingStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg bg-zinc-700/30"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBlock
                  label="Extraidos"
                  value={enrichmentCounts.completed}
                  colorClass="text-emerald-400"
                />
                <StatBlock
                  label="Processando"
                  value={enrichmentCounts.processing}
                  colorClass="text-amber-400"
                />
                <StatBlock
                  label="Pendentes"
                  value={enrichmentCounts.pending}
                  colorClass="text-zinc-400"
                />
                <StatBlock
                  label="Falhas"
                  value={enrichmentCounts.failed}
                  colorClass="text-red-400"
                />
              </div>

              {enrichmentCounts.pending > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                    onClick={() => retryEnrichment.mutate({})}
                    disabled={retryEnrichment.isPending}
                  >
                    {retryEnrichment.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Processar {enrichmentCounts.pending} pendente
                    {enrichmentCounts.pending !== 1 ? "s" : ""}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Quick Stats Row ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total docs */}
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-zinc-700/30 flex items-center justify-center">
            <FileText className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-100 tabular-nums">
              {statsDetailed?.total ?? stats?.totalFiles ?? 0}
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Total de documentos
            </p>
          </div>
        </div>

        {/* Linked % */}
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Link2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-100 tabular-nums">
              {linkedPercent}%
            </p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Vinculados
            </p>
          </div>
        </div>

        {/* Last sync */}
        <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-zinc-700/30 flex items-center justify-center">
            <Clock className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-100">{lastSyncStr}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Ultima sincronizacao
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
