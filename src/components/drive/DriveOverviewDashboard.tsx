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
  CheckCircle2,
  AlertCircle,
  Timer,
  XCircle,
  RefreshCw,
  Upload,
  Activity,
  CheckCheck,
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

// --- Atribuicao Card (compact) ---

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

  const accentColorMap: Record<string, string> = {
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    orange: "bg-orange-500",
  };

  return (
    <button
      onClick={() => {
        ctx.setSelectedAtribuicao(atribuicao.key);
        if (atribuicao.folderId) ctx.navigateToFolder(atribuicao.folderId, atribuicao.label);
      }}
      className={cn(
        "group relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg p-3 cursor-pointer text-left",
        "transition-all duration-200 hover:border-zinc-300/80 dark:hover:border-zinc-700/80",
        atribuicao.hoverClass
      )}
    >
      {/* Top accent */}
      <div className={cn("absolute top-0 left-2 right-2 h-[2px] rounded-b-full opacity-30 group-hover:opacity-70 transition-opacity", accentColorMap[atribuicao.color] || "bg-zinc-300")} />

      <div className="flex items-center gap-2.5 mb-2">
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
          atribuicao.iconBgClass
        )}>
          <Icon className={cn("h-4 w-4", atribuicao.iconClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {atribuicao.label}
            </span>
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", atribuicao.dotClass)} />
          </div>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {fileCount} arquivo{fileCount !== 1 ? "s" : ""} · {syncTimeStr}
          </span>
        </div>
      </div>

      {/* Vinculação bar */}
      <div className="flex items-center gap-2" title={`${Math.round(linkedPercent * fileCount / 100)}/${fileCount} vinculados`}>
        <div className="flex-1 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              linkedPercent >= 80 ? "bg-emerald-500" : linkedPercent >= 40 ? "bg-amber-500" : linkedPercent >= 10 ? "bg-zinc-400" : "bg-red-400"
            )}
            style={{ width: `${Math.min(linkedPercent, 100)}%` }}
          />
        </div>
        <span className="text-[9px] font-medium tabular-nums text-zinc-400 min-w-[3ch] text-right">
          {linkedPercent}%
        </span>
      </div>
    </button>
  );
}

// --- Special Folder Card (compact) ---

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
        "group bg-zinc-50/50 dark:bg-zinc-900/50 border border-dashed border-zinc-200/60 dark:border-zinc-700/40 rounded-lg p-3 cursor-pointer text-left",
        "transition-all duration-200 hover:border-zinc-400/60 dark:hover:border-zinc-600/60",
        folder.hoverClass
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", folder.iconBgClass)}>
          <Icon className={cn("h-4 w-4", folder.iconClass)} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">{folder.label}</p>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">
            {fileCount} arquivo{fileCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </button>
  );
}

// --- Recent File Item (compact) ---

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
      className="flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
    >
      <Icon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
      {(() => {
        const typeLabel = file.documentType || (file.mimeType?.includes('pdf') ? 'PDF' : file.mimeType?.includes('image') ? 'IMG' : file.mimeType?.includes('audio') ? 'AUDIO' : null);
        return typeLabel ? (
          <span className="text-[8px] font-semibold uppercase px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
            {typeLabel}
          </span>
        ) : null;
      })()}
      <span className="text-[12px] text-zinc-700 dark:text-zinc-300 truncate flex-1 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
        {file.name}
      </span>
      {atribuicaoLabel && (
        <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
          {atribuicaoLabel}
        </span>
      )}
      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 tabular-nums">
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
    { limit: 6 },
    { staleTime: 30_000 }
  );

  const { data: healthData } = trpc.drive.healthStatus.useQuery(undefined, { staleTime: 60_000 });

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
      {/* --- Compact Header --- */}
      <div className="flex items-center gap-4 px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200/60 dark:border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 dark:from-white dark:to-zinc-100 flex items-center justify-center shadow-sm ring-2 ring-zinc-900/5 dark:ring-white/10 shrink-0">
            <HardDrive className="w-4 h-4 text-white dark:text-zinc-900" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Drive Hub
            </h2>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              Gestao de documentos
            </p>
          </div>
        </div>

        {/* Inline stats */}
        <div className="hidden sm:flex items-center gap-3 text-[12px] ml-auto">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-zinc-400" />
            <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">{totalFiles}</span>
            <span className="text-zinc-400 text-[10px]">docs</span>
          </div>
          <div className="flex items-center gap-1">
            <Link2 className="h-3 w-3 text-emerald-500" />
            <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">{linkedPercent}%</span>
            <span className="text-zinc-400 text-[10px]">vinc.</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-zinc-400" />
            <span className="text-[10px] text-zinc-400">{lastSyncStr}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[11px] rounded-md border-zinc-200/80 dark:border-zinc-700/50 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400"
            onClick={() => toast.info("Sincronizacao em desenvolvimento")}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync
          </Button>
          <Button
            size="sm"
            className="h-7 px-2.5 text-[11px] rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
            onClick={() => toast.info("Upload em desenvolvimento")}
          >
            <Upload className="h-3 w-3 mr-1" />
            Upload
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-4 p-4 md:p-5">
        {/* --- Insights Bar (horizontal) --- */}
        <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-lg bg-zinc-50/80 dark:bg-zinc-900/50 border border-zinc-200/40 dark:border-zinc-800/40">
          {/* Sync status */}
          {healthData && (
            <div className="flex items-center gap-1.5 text-[11px]">
              {healthData.status === "healthy" ? (
                <><CheckCheck className="h-3 w-3 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400 font-medium">Sync OK</span></>
              ) : healthData.status === "degraded" ? (
                <><Activity className="h-3 w-3 text-amber-500" /><span className="text-amber-600 dark:text-amber-400 font-medium">{healthData.recentErrors} erros</span></>
              ) : (
                <><AlertCircle className="h-3 w-3 text-red-500" /><span className="text-red-600 dark:text-red-400 font-medium">Problemas</span></>
              )}
            </div>
          )}

          <div className="h-3 w-px bg-zinc-200/60 dark:bg-zinc-700/40" />

          {/* Enrichment stats */}
          {enrichmentCounts.completed > 0 && (
            <div className="flex items-center gap-1 text-[11px]">
              <Sparkles className="h-3 w-3 text-emerald-500" />
              <span className="font-medium tabular-nums text-zinc-600 dark:text-zinc-400">{enrichmentCounts.completed}</span>
              <span className="text-zinc-400 text-[10px]">extraidos</span>
            </div>
          )}

          {enrichmentCounts.pending > 0 && (
            <>
              <div className="h-3 w-px bg-zinc-200/60 dark:bg-zinc-700/40" />
              <div className="flex items-center gap-1 text-[11px]">
                <Timer className="h-3 w-3 text-amber-500" />
                <span className="font-medium tabular-nums text-zinc-600 dark:text-zinc-400">{enrichmentCounts.pending}</span>
                <span className="text-zinc-400 text-[10px]">pendentes</span>
              </div>
            </>
          )}

          {enrichmentCounts.failed > 0 && (
            <>
              <div className="h-3 w-px bg-zinc-200/60 dark:bg-zinc-700/40" />
              <div className="flex items-center gap-1 text-[11px]">
                <XCircle className="h-3 w-3 text-red-500" />
                <span className="font-medium tabular-nums text-zinc-600 dark:text-zinc-400">{enrichmentCounts.failed}</span>
                <span className="text-zinc-400 text-[10px]">falhas</span>
              </div>
            </>
          )}

          {statsDetailed && statsDetailed.total > 0 && (statsDetailed.total - statsDetailed.linked) > 0 && (
            <>
              <div className="h-3 w-px bg-zinc-200/60 dark:bg-zinc-700/40" />
              <div className="flex items-center gap-1 text-[11px]">
                <Link2 className="h-3 w-3 text-zinc-400" />
                <span className="font-medium tabular-nums text-zinc-600 dark:text-zinc-400">{statsDetailed.total - statsDetailed.linked}</span>
                <span className="text-zinc-400 text-[10px]">nao vinc.</span>
              </div>
            </>
          )}

          {/* Process button */}
          {enrichmentCounts.pending > 0 && (
            <Button
              size="sm"
              className="ml-auto h-6 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
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

        {/* --- Atribuicao Cards (5 cols) --- */}
        <div>
          <h3 className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Atribuicoes
          </h3>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg p-3 animate-pulse">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                    <div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                  <div className="h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
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
          <h3 className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Especiais
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SPECIAL_FOLDERS.map((sf) => {
              const data = folderCountMap[sf.folderId];
              return <SpecialFolderCard key={sf.key} folder={sf} fileCount={data?.fileCount ?? 0} />;
            })}
          </div>
        </div>

        {/* --- Enrichment Progress (compact) --- */}
        <div>
          <h3 className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Extracao IA
          </h3>
          <div className="rounded-lg border border-emerald-200/40 dark:border-emerald-500/15 bg-emerald-50/30 dark:bg-emerald-950/10 p-3">
            {isLoadingStats ? (
              <div className="h-8 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300">Enriquecimento</span>
                  </div>
                  <span className="text-[10px] font-medium tabular-nums text-zinc-400">{enrichedPercent}%</span>
                </div>

                <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out",
                      enrichedPercent < 100 && "animate-pulse"
                    )}
                    style={{ width: `${enrichedPercent}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100/50 dark:bg-emerald-500/10">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{enrichmentCounts.completed}</span>
                  </span>
                  {enrichmentCounts.processing > 0 && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100/50 dark:bg-amber-500/10 animate-pulse">
                      <Timer className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">{enrichmentCounts.processing}</span>
                    </span>
                  )}
                  {enrichmentCounts.pending > 0 && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-100/50 dark:bg-zinc-800/50">
                      <AlertCircle className="h-3 w-3 text-zinc-400" />
                      <span className="font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">{enrichmentCounts.pending}</span>
                    </span>
                  )}
                  {enrichmentCounts.failed > 0 && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100/50 dark:bg-red-500/10">
                      <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                      <span className="font-semibold tabular-nums text-red-700 dark:text-red-300">{enrichmentCounts.failed}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- Recent Activity (compact) --- */}
        <div>
          <h3 className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            Atividade Recente
          </h3>
          {recentFiles && recentFiles.length > 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg divide-y divide-zinc-100 dark:divide-zinc-800/50 overflow-hidden">
              {recentFiles.map((file) => (
                <RecentFileItem
                  key={file.id}
                  file={file}
                  atribuicaoLabel={folderToAtribuicao[file.driveFolderId] ?? null}
                />
              ))}
            </div>
          ) : !isLoadingStats ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg">
              <div className="text-center py-6">
                <Clock className="h-5 w-5 text-zinc-300 dark:text-zinc-600 mx-auto mb-1.5" />
                <p className="text-[11px] text-zinc-400">Nenhuma atividade recente</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
