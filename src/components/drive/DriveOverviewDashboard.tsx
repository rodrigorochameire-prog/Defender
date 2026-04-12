"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import {
  DRIVE_ATRIBUICOES,
  SPECIAL_FOLDERS,
  getFileIcon,
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

// --- Atribuicao Card (clean zinc) ---

function AtribuicaoCard({
  atribuicao,
  fileCount,
  lastSyncAt,
  linkedPercent,
}: {
  atribuicao: (typeof DRIVE_ATRIBUICOES)[number];
  fileCount: number;
  lastSyncAt: Date | null;
  linkedPercent: number;
}) {
  const ctx = useDriveContext();
  const Icon = atribuicao.icon;

  const syncTimeStr = useMemo(() => {
    if (!lastSyncAt) return "Nunca";
    try {
      return formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true, locale: ptBR });
    } catch {
      return "-";
    }
  }, [lastSyncAt]);

  return (
    <button
      onClick={() => {
        ctx.setSelectedAtribuicao(atribuicao.key);
        if (atribuicao.folderId) ctx.navigateToFolder(atribuicao.folderId, atribuicao.label);
      }}
      className={cn(
        "group bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-3.5 cursor-pointer text-left",
        "transition-all duration-200",
        "hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm hover:shadow-neutral-200/50 dark:hover:shadow-black/20"
      )}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {atribuicao.label}
            </span>
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", atribuicao.dotClass)} />
          </div>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
            {fileCount} arquivo{fileCount !== 1 ? "s" : ""} · {syncTimeStr}
          </span>
        </div>
      </div>

      {/* Vinculação bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-neutral-400 dark:bg-neutral-600 transition-all duration-500"
            style={{ width: `${Math.min(linkedPercent, 100)}%` }}
          />
        </div>
        <span className="text-[10px] font-medium tabular-nums text-neutral-400 min-w-[3ch] text-right">
          {linkedPercent}%
        </span>
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

  return (
    <button
      onClick={() => {
        ctx.setSelectedAtribuicao(null);
        if (folder.folderId) ctx.navigateToFolder(folder.folderId, folder.label);
      }}
      className={cn(
        "group bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-3.5 cursor-pointer text-left",
        "transition-all duration-200",
        "hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm hover:shadow-neutral-200/50 dark:hover:shadow-black/20"
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{folder.label}</p>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums">
            {fileCount} arquivo{fileCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </button>
  );
}

// --- Recent File Item ---

function RecentFileItem({
  file,
  atribuicaoLabel,
}: {
  file: {
    id: number;
    name: string;
    mimeType: string | null;
    webViewLink: string | null;
    lastModifiedTime: Date | null;
    enrichmentStatus: string | null;
    documentType: string | null;
    driveFolderId: string;
  };
  atribuicaoLabel: string | null;
}) {
  const Icon = getFileIcon(file.mimeType);
  const timeStr = useMemo(() => {
    if (!file.lastModifiedTime) return "";
    try {
      return formatDistanceToNow(new Date(file.lastModifiedTime), { addSuffix: true, locale: ptBR });
    } catch {
      return "";
    }
  }, [file.lastModifiedTime]);

  return (
    <a
      href={file.webViewLink ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-150 group cursor-pointer"
    >
      <Icon className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
      <span className="text-xs text-neutral-700 dark:text-neutral-300 truncate flex-1 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors">
        {file.name}
      </span>
      {atribuicaoLabel && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 shrink-0">
          {atribuicaoLabel}
        </span>
      )}
      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0 tabular-nums">
        {timeStr}
      </span>
    </a>
  );
}

// --- Main Component ---

export function DriveOverviewDashboard() {
  const { data: syncFolders, isLoading: isLoadingSyncFolders } =
    trpc.drive.syncFolders.useQuery(undefined, { staleTime: 30_000 });

  const { data: statsDetailed, isLoading: isLoadingStats } =
    trpc.drive.statsDetailed.useQuery({}, { staleTime: 30_000 });

  const { data: stats } = trpc.drive.stats.useQuery(undefined, { staleTime: 30_000 });

  const { data: recentFiles } = trpc.drive.recentFiles.useQuery(
    { limit: 4 },
    { staleTime: 30_000 }
  );

  const retryEnrichment = trpc.drive.retryEnrichment.useMutation({
    onSuccess: () => toast.success("Processamento iniciado"),
    onError: (error) => toast.error(error.message || "Erro ao processar"),
  });

  const folderCountMap = useMemo(() => {
    const map: Record<string, { fileCount: number; lastSyncAt: Date | null }> = {};
    if (!syncFolders) return map;
    for (const sf of syncFolders as SyncFolder[]) {
      map[sf.driveFolderId] = { fileCount: sf.fileCount, lastSyncAt: sf.lastSyncAt };
    }
    return map;
  }, [syncFolders]);

  const enrichmentCounts = useMemo(() => {
    if (!statsDetailed?.byEnrichment) return { completed: 0, processing: 0, pending: 0, failed: 0 };
    const counts = { completed: 0, processing: 0, pending: 0, failed: 0 };
    for (const item of statsDetailed.byEnrichment) {
      const status = item.enrichmentStatus as keyof typeof counts;
      if (status in counts) counts[status] = item.count;
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
    if (!syncFolders || (syncFolders as SyncFolder[]).length === 0) return "Nunca";
    const sorted = (syncFolders as SyncFolder[])
      .filter((f) => f.lastSyncAt)
      .sort((a, b) => new Date(b.lastSyncAt!).getTime() - new Date(a.lastSyncAt!).getTime());
    if (sorted.length === 0) return "Nunca";
    try {
      return formatDistanceToNow(new Date(sorted[0].lastSyncAt!), { addSuffix: true, locale: ptBR });
    } catch {
      return "-";
    }
  }, [syncFolders]);

  const atribuicaoLinkedPct = useMemo(() => {
    const map: Record<string, number> = {};
    if (!statsDetailed || !totalFiles) return map;
    for (const attr of DRIVE_ATRIBUICOES) map[attr.key] = linkedPercent;
    return map;
  }, [statsDetailed, totalFiles, linkedPercent]);

  const folderToAtribuicao = useMemo(() => {
    const map: Record<string, string> = {};
    for (const attr of DRIVE_ATRIBUICOES) if (attr.folderId) map[attr.folderId] = attr.label;
    for (const sf of SPECIAL_FOLDERS) if (sf.folderId) map[sf.folderId] = sf.label;
    return map;
  }, []);

  const isLoading = isLoadingSyncFolders || isLoadingStats;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Quality strip — stats únicas (vinc, extraídos, falhas) + ação enrichment.
          O título "Drive" + stats brutas já vivem no CollapsiblePageHeader acima. */}
      {(linkedPercent > 0 ||
        enrichmentCounts.completed > 0 ||
        enrichmentCounts.failed > 0 ||
        enrichmentCounts.pending > 0) && (
        <div className="flex items-center gap-3 px-5 md:px-6 py-2.5 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-neutral-50/60 dark:bg-neutral-900/30 shrink-0">
          <span className="text-[9px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500 font-semibold">
            Qualidade
          </span>
          <div className="w-px h-3 bg-neutral-200 dark:bg-neutral-800 shrink-0" />
          <div className="flex items-center gap-2.5 text-[10px] text-neutral-500 dark:text-neutral-400 min-w-0 flex-1 overflow-x-auto scrollbar-none">
            <span className="shrink-0">
              <strong className="text-neutral-900 dark:text-neutral-100 font-mono tabular-nums">
                {linkedPercent}%
              </strong>{" "}
              vinculados
            </span>
            <span className="shrink-0">·</span>
            <span className="shrink-0">
              <strong className="text-neutral-900 dark:text-neutral-100 font-mono tabular-nums">
                {enrichmentCounts.completed}
              </strong>{" "}
              extraídos
            </span>
            {enrichmentCounts.failed > 0 && (
              <>
                <span className="shrink-0">·</span>
                <span className="text-rose-500 shrink-0">
                  <strong className="font-mono tabular-nums">{enrichmentCounts.failed}</strong>{" "}
                  falhas
                </span>
              </>
            )}
            <span className="shrink-0">·</span>
            <span className="shrink-0 text-neutral-400 dark:text-neutral-500">{lastSyncStr}</span>
          </div>

          {enrichmentCounts.pending > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs rounded-lg border-neutral-200/80 dark:border-neutral-700/50 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
              onClick={() => retryEnrichment.mutate({})}
              disabled={retryEnrichment.isPending}
            >
              {retryEnrichment.isPending ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 mr-1.5" />
              )}
              Processar {enrichmentCounts.pending}
            </Button>
          )}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6 p-5 md:p-6">
        {/* --- Atribuicao Cards --- */}
        <div>
          <h3 className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
            Atribuições
          </h3>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-3.5 animate-pulse">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800" />
                    <div className="h-3 w-16 rounded bg-neutral-100 dark:bg-neutral-800" />
                  </div>
                  <div className="h-1 w-full rounded-full bg-neutral-100 dark:bg-neutral-800" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {DRIVE_ATRIBUICOES.map((attr) => {
                const data = folderCountMap[attr.folderId];
                return (
                  <AtribuicaoCard
                    key={attr.key}
                    atribuicao={attr}
                    fileCount={data?.fileCount ?? 0}
                    lastSyncAt={data?.lastSyncAt ?? null}
                    linkedPercent={atribuicaoLinkedPct[attr.key] ?? 0}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* --- Special Folders --- */}
        <div>
          <h3 className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
            Especiais
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SPECIAL_FOLDERS.map((sf) => {
              const data = folderCountMap[sf.folderId];
              return <SpecialFolderCard key={sf.key} folder={sf} fileCount={data?.fileCount ?? 0} />;
            })}
          </div>
        </div>

        {/* --- Enrichment Progress (inline) --- */}
        {enrichedPercent > 0 && (
          <div>
            <h3 className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
              Extração IA
            </h3>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Enriquecimento</span>
                </div>
                <span className="text-[10px] font-medium tabular-nums text-neutral-400">{enrichedPercent}%</span>
              </div>

              <div className="h-1 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden mb-2.5">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                  style={{ width: `${enrichedPercent}%` }}
                />
              </div>

              <div className="flex items-center gap-3 text-[10px] text-neutral-500 dark:text-neutral-400">
                <span className="tabular-nums">{enrichmentCounts.completed} extraídos</span>
                {enrichmentCounts.processing > 0 && (
                  <span className="tabular-nums text-amber-600 dark:text-amber-400">{enrichmentCounts.processing} processando</span>
                )}
                {enrichmentCounts.pending > 0 && (
                  <span className="tabular-nums">{enrichmentCounts.pending} pendentes</span>
                )}
                {enrichmentCounts.failed > 0 && (
                  <span className="tabular-nums text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                    <XCircle className="h-3 w-3" />
                    {enrichmentCounts.failed}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- Recent Activity --- */}
        <div>
          <h3 className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Atividade Recente
          </h3>
          {recentFiles && recentFiles.length > 0 ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl divide-y divide-neutral-100 dark:divide-neutral-800/50 overflow-hidden">
              {recentFiles.map((file) => (
                <RecentFileItem
                  key={file.id}
                  file={file}
                  atribuicaoLabel={folderToAtribuicao[file.driveFolderId] ?? null}
                />
              ))}
            </div>
          ) : !isLoadingStats ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl">
              <div className="text-center py-8">
                <Clock className="h-5 w-5 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-xs text-neutral-400">Nenhuma atividade recente</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
