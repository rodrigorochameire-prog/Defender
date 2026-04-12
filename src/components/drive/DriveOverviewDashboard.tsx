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

// Border-l color map — literal strings para Tailwind JIT
const BORDER_L_COLOR: Record<string, string> = {
  emerald: "border-l-emerald-500",
  amber: "border-l-amber-500",
  sky: "border-l-sky-500",
  rose: "border-l-rose-500",
  orange: "border-l-orange-500",
};

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
        "group bg-white dark:bg-neutral-900 rounded-xl shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden cursor-pointer text-left",
        "hover:shadow-md hover:shadow-black/[0.06] hover:border-neutral-300/80 dark:hover:border-neutral-700/60",
        "transition-all duration-200"
      )}
    >
      <div className={cn("px-4 py-3.5 border-l-[4px]", BORDER_L_COLOR[atribuicao.color] || "border-l-neutral-300")}>
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className={cn("h-3.5 w-3.5 shrink-0", atribuicao.iconClass)} />
          <span className="text-[13px] font-semibold text-foreground truncate">
            {atribuicao.label}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground tabular-nums truncate">
          {fileCount} arq. · {syncTimeStr} · {linkedPercent}%
        </p>
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
        "group bg-white dark:bg-neutral-900 rounded-xl shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden cursor-pointer text-left",
        "hover:shadow-md hover:shadow-black/[0.06] hover:border-neutral-300/80 dark:hover:border-neutral-700/60",
        "transition-all duration-200"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 border-l-[4px] border-l-neutral-300 dark:border-l-neutral-600">
        <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate">{folder.label}</p>
          <p className="text-[10px] text-muted-foreground tabular-nums">
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
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neutral-50/50 dark:bg-neutral-800/20 border border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-700/60 hover:bg-white dark:hover:bg-neutral-800/40 hover:shadow-sm transition-all duration-150 cursor-pointer"
    >
      <Icon className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
      <span className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 truncate flex-1">
        {file.name}
      </span>
      {atribuicaoLabel && (
        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-muted-foreground shrink-0">
          {atribuicaoLabel}
        </span>
      )}
      <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
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
      <div className="max-w-5xl mx-auto space-y-6 p-5 md:p-6">
        {/* Quality stats inline — integrado como texto, sem bar separada */}
        {(linkedPercent > 0 || enrichmentCounts.completed > 0) && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
            <span className="tabular-nums"><strong className="text-foreground">{linkedPercent}%</strong> vinculados</span>
            <span>·</span>
            <span className="tabular-nums"><strong className="text-foreground">{enrichmentCounts.completed}</strong> extraídos</span>
            {enrichmentCounts.failed > 0 && (
              <>
                <span>·</span>
                <span className="text-rose-500 tabular-nums"><strong>{enrichmentCounts.failed}</strong> falhas</span>
              </>
            )}
            <span>·</span>
            <span>{lastSyncStr}</span>
          </div>
        )}
        {/* --- Atribuicao Cards --- */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
            <h3 className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">Atribuições</h3>
            <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
            <h3 className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">Especiais</h3>
            <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
          </div>
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
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
              <h3 className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">Extração IA</h3>
              <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
            </div>
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden hover:shadow-md hover:border-neutral-300/80 dark:hover:border-neutral-700/60 transition-all duration-200 p-4">
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
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
            <h3 className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">Atividade Recente</h3>
            <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
          </div>
          {recentFiles && recentFiles.length > 0 ? (
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden hover:shadow-md hover:border-neutral-300/80 dark:hover:border-neutral-700/60 transition-all duration-200 p-3 space-y-1.5">
              {recentFiles.map((file) => (
                <RecentFileItem
                  key={file.id}
                  file={file}
                  atribuicaoLabel={folderToAtribuicao[file.driveFolderId] ?? null}
                />
              ))}
            </div>
          ) : !isLoadingStats ? (
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60">
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
