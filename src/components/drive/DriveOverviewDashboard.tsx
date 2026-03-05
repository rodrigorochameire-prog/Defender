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

// --- Atribuicao Card (with vinculação bar) ---

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
      return formatDistanceToNow(new Date(lastSyncAt), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "—";
    }
  }, [lastSyncAt]);

  const accentColorMap: Record<string, string> = {
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    orange: "bg-orange-500",
    violet: "bg-violet-500",
    cyan: "bg-cyan-500",
  };

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
        "group relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-4 cursor-pointer text-left",
        "transition-all duration-250 hover:shadow-lg hover:shadow-zinc-200/60 dark:hover:shadow-black/20 hover:-translate-y-0.5",
        "hover:border-zinc-300/80 dark:hover:border-zinc-700/80",
        atribuicao.hoverClass
      )}
    >
      {/* Top accent strip */}
      <div className={cn("absolute top-0 left-3 right-3 h-[2px] rounded-b-full opacity-40 group-hover:opacity-80 transition-opacity duration-200", accentColorMap[atribuicao.color] || "bg-zinc-300")} />

      {/* Header: icon + name + sync dot */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
          atribuicao.iconBgClass
        )}>
          <Icon className={cn("h-5 w-5", atribuicao.iconClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {atribuicao.label}
            </span>
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", atribuicao.dotClass)} />
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {fileCount} arquivo{fileCount !== 1 ? "s" : ""} · {syncTimeStr}
          </span>
        </div>
      </div>

      {/* Vinculação progress bar */}
      <div className="flex items-center gap-2.5" title={`${Math.round(linkedPercent * fileCount / 100)} de ${fileCount} vinculados (${linkedPercent}%)`}>
        <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              linkedPercent >= 80 ? "bg-emerald-500" : linkedPercent >= 40 ? "bg-amber-500" : linkedPercent >= 10 ? "bg-zinc-400" : "bg-red-400"
            )}
            style={{ width: `${Math.min(linkedPercent, 100)}%` }}
          />
        </div>
        <span className="text-[10px] font-medium tabular-nums text-zinc-500 dark:text-zinc-500 min-w-[3ch] text-right">
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
        "group bg-zinc-50/50 dark:bg-zinc-900/50 border border-dashed border-zinc-300/80 dark:border-zinc-700/60 rounded-xl p-4 cursor-pointer text-left",
        "transition-all duration-250 hover:shadow-lg hover:shadow-zinc-200/60 dark:hover:shadow-black/20 hover:-translate-y-0.5",
        "hover:border-zinc-400/80 dark:hover:border-zinc-600/80",
        folder.hoverClass
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
            folder.iconBgClass
          )}
        >
          <Icon className={cn("h-5 w-5", folder.iconClass)} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{folder.label}</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
            {fileCount} arquivo{fileCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </button>
  );
}

// --- Insight Card ---

function InsightCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: "emerald" | "amber" | "red" | "zinc";
}) {
  const colorClasses = {
    emerald: "border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5",
    amber: "border-amber-200/60 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5",
    red: "border-red-200/60 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5",
    zinc: "border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50",
  };
  const iconClasses = {
    emerald: "text-emerald-500 dark:text-emerald-400",
    amber: "text-amber-500 dark:text-amber-400",
    red: "text-red-500 dark:text-red-400",
    zinc: "text-zinc-400 dark:text-zinc-500",
  };
  const iconBgClasses = {
    emerald: "bg-emerald-100/80 dark:bg-emerald-500/10",
    amber: "bg-amber-100/80 dark:bg-amber-500/10",
    red: "bg-red-100/80 dark:bg-red-500/10",
    zinc: "bg-zinc-100/80 dark:bg-zinc-800/60",
  };

  return (
    <div className={cn("px-4 py-3 rounded-xl border flex items-center gap-3", colorClasses[color])}>
      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", iconBgClasses[color])}>
        <Icon className={cn("h-4 w-4", iconClasses[color])} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{value}</p>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
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
      return formatDistanceToNow(new Date(file.lastModifiedTime), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "";
    }
  }, [file.lastModifiedTime]);

  return (
    <a
      href={file.webViewLink ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
    >
      <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
      {(() => {
        const typeLabel = file.documentType || (file.mimeType?.includes('pdf') ? 'PDF' : file.mimeType?.includes('image') ? 'IMG' : file.mimeType?.includes('audio') ? 'AUDIO' : null);
        return typeLabel ? (
          <span className="text-[9px] font-semibold uppercase px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
            {typeLabel}
          </span>
        ) : null;
      })()}
      <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate flex-1 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
        {file.name}
      </span>
      {atribuicaoLabel && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
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

  const { data: stats } = trpc.drive.stats.useQuery(undefined, {
    staleTime: 30_000,
  });

  const { data: recentFiles } = trpc.drive.recentFiles.useQuery(
    { limit: 8 },
    { staleTime: 30_000 }
  );

  const { data: healthData } = trpc.drive.healthStatus.useQuery(undefined, {
    staleTime: 60_000,
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

  // Per-atribuição linked percent (client-side estimate)
  const atribuicaoLinkedPct = useMemo(() => {
    const map: Record<string, number> = {};
    if (!statsDetailed || !totalFiles) return map;
    // Simplified: use global linkedPercent as fallback for all
    for (const attr of DRIVE_ATRIBUICOES) {
      map[attr.key] = linkedPercent;
    }
    return map;
  }, [statsDetailed, totalFiles, linkedPercent]);

  // Map folderId → atribuição label for recent files
  const folderToAtribuicao = useMemo(() => {
    const map: Record<string, string> = {};
    for (const attr of DRIVE_ATRIBUICOES) {
      if (attr.folderId) map[attr.folderId] = attr.label;
    }
    for (const sf of SPECIAL_FOLDERS) {
      if (sf.folderId) map[sf.folderId] = sf.label;
    }
    return map;
  }, []);

  // Insights logic
  const insights = useMemo(() => {
    const items: { icon: React.ElementType; label: string; value: string; color: "emerald" | "amber" | "red" | "zinc" }[] = [];

    // Sync status
    if (healthData) {
      if (healthData.status === "healthy") {
        items.push({ icon: CheckCheck, label: "Sincronização", value: "Sync OK", color: "emerald" });
      } else if (healthData.status === "degraded") {
        items.push({ icon: Activity, label: "Sincronização", value: `${healthData.recentErrors} erros recentes`, color: "amber" });
      } else {
        items.push({ icon: AlertCircle, label: "Sincronização", value: "Sync com problemas", color: "red" });
      }
    }

    // Enrichment processed
    if (enrichmentCounts.completed > 0) {
      items.push({ icon: Sparkles, label: "Extraídos com IA", value: `${enrichmentCounts.completed} docs`, color: "emerald" });
    }

    // Pending enrichment
    if (enrichmentCounts.pending > 0) {
      items.push({ icon: Timer, label: "Pendentes de extração", value: `${enrichmentCounts.pending} docs`, color: "amber" });
    }

    // Failed enrichment
    if (enrichmentCounts.failed > 0) {
      items.push({ icon: XCircle, label: "Falhas na extração", value: `${enrichmentCounts.failed} docs`, color: "red" });
    }

    // Unlinked docs
    if (statsDetailed && statsDetailed.total > 0) {
      const unlinked = statsDetailed.total - statsDetailed.linked;
      if (unlinked > 0) {
        items.push({ icon: Link2, label: "Não vinculados", value: `${unlinked} docs`, color: "zinc" });
      }
    }

    // If everything is fine and no alerts
    if (items.length === 0) {
      items.push({ icon: CheckCheck, label: "Sistema", value: "Tudo em dia", color: "emerald" });
    }

    return items.slice(0, 3); // max 3
  }, [healthData, enrichmentCounts, statsDetailed]);

  const isLoading = isLoadingSyncFolders || isLoadingStats;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* --- Header Padrão Defender --- */}
      <div className="relative px-5 md:px-8 py-6 md:py-8 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-emerald-25/10 to-transparent dark:from-emerald-950/20 dark:via-emerald-950/5 pointer-events-none" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Icon + Title + Subtitle */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 dark:from-white dark:to-zinc-100 flex items-center justify-center shadow-lg shadow-zinc-900/10 dark:shadow-black/10 ring-4 ring-zinc-900/5 dark:ring-white/10">
              <HardDrive className="w-6 h-6 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h2 className="font-serif text-3xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                Drive Hub
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                Gestão de documentos e pastas sincronizadas
              </p>
            </div>
          </div>

          {/* Right: Stats + Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Inline stats */}
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

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs rounded-lg border-zinc-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                onClick={() => toast.info("Sincronização em desenvolvimento")}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Sincronizar
              </Button>
              <Button
                size="sm"
                className="h-8 px-3 text-xs rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
                onClick={() => toast.info("Upload em desenvolvimento")}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Upload
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-5 p-4 md:p-6">
        {/* --- Insights/Alerts Bar --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.map((insight, i) => (
            <InsightCard key={i} {...insight} />
          ))}
        </div>

        {/* --- Atribuicao Cards --- */}
        <div>
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
            Atribuições
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
                  <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800 mb-2" />
                  <div className="h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800" />
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
                    linkedPercent={atribuicaoLinkedPct[attr.key] ?? 0}
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

        {/* --- Enrichment with IA (reformed) --- */}
        <div>
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
            Extração com IA
          </h3>
          <div className="rounded-xl border-2 border-emerald-200/50 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-zinc-900 dark:to-zinc-900 p-5">
            {isLoadingStats ? (
              <div className="h-12 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            ) : (
              <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      Enriquecimento de Documentos
                    </span>
                  </div>
                  <span className="text-xs font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
                    {enrichedPercent}% processados
                  </span>
                </div>

                {/* Progress bar (larger) */}
                <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out",
                      enrichedPercent < 100 && "animate-pulse"
                    )}
                    style={{ width: `${enrichedPercent}%` }}
                  />
                </div>

                {/* Stats badges + button */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/60 dark:bg-emerald-500/10">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{enrichmentCounts.completed}</span>
                    <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60">extraídos</span>
                  </div>

                  {enrichmentCounts.processing > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/60 dark:bg-amber-500/10 animate-pulse">
                      <Timer className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-300">{enrichmentCounts.processing}</span>
                      <span className="text-[10px] text-amber-600/70 dark:text-amber-400/60">processando</span>
                    </div>
                  )}

                  {enrichmentCounts.pending > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100/60 dark:bg-zinc-800/60">
                      <AlertCircle className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                      <span className="text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">{enrichmentCounts.pending}</span>
                      <span className="text-[10px] text-zinc-500/70 dark:text-zinc-400/60">pendentes</span>
                    </div>
                  )}

                  {enrichmentCounts.failed > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-100/60 dark:bg-red-500/10">
                      <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      <span className="text-xs font-semibold tabular-nums text-red-700 dark:text-red-300">{enrichmentCounts.failed}</span>
                      <span className="text-[10px] text-red-600/70 dark:text-red-400/60">falhas</span>
                    </div>
                  )}

                  {/* Prominent Process button */}
                  {enrichmentCounts.pending > 0 && (
                    <Button
                      className="ml-auto h-9 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
                      onClick={() => retryEnrichment.mutate({})}
                      disabled={retryEnrichment.isPending}
                    >
                      {retryEnrichment.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Processar {enrichmentCounts.pending} pendentes
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- Recent Documents --- */}
        {recentFiles && recentFiles.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Atividade Recente
            </h3>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden">
              {recentFiles.map((file) => (
                <RecentFileItem
                  key={file.id}
                  file={file}
                  atribuicaoLabel={folderToAtribuicao[file.driveFolderId] ?? null}
                />
              ))}
            </div>
          </div>
        )}

        {(!recentFiles || recentFiles.length === 0) && !isLoadingStats && (
          <div>
            <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Atividade Recente
            </h3>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl">
              <div className="text-center py-8">
                <Clock className="h-6 w-6 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-400 dark:text-zinc-500">Nenhuma atividade recente</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
