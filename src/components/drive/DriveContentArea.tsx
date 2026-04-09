"use client";

import { useMemo, useEffect, useState } from "react";
import { useDriveContext } from "./DriveContext";
import { getAtribuicaoFolderId, getAtribuicaoByKey } from "./drive-constants";
import { trpc } from "@/lib/trpc/client";
import { DriveFilters } from "./DriveFilters";
import { DriveFileGrid } from "./DriveFileGrid";
import { DriveFileList } from "./DriveFileList";
import { DriveFileCompact } from "./DriveFileCompact";
import { DriveBatchActions } from "./DriveBatchActions";
import { DriveOverviewDashboard } from "./DriveOverviewDashboard";
import { Button } from "@/components/ui/button";
import { Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";

// ─── Main Orchestrator ──────────────────────────────────────────────

const AUDIO_VIDEO_MIMES = ["audio/", "video/", "application/ogg"];

export function DriveContentArea() {
  const ctx = useDriveContext();
  const utils = trpc.useUtils();
  const [isTranscribingAll, setIsTranscribingAll] = useState(false);

  // Determine active folder: explicit selection takes priority, then atribuicao
  const activeFolderId =
    ctx.selectedFolderId || getAtribuicaoFolderId(ctx.selectedAtribuicao);

  // The root sync folder ID stays constant during subfolder navigation
  const rootFolderId = ctx.rootSyncFolderId || activeFolderId;

  // Are we inside a subfolder? (breadcrumb > 1 means we navigated deeper)
  const isInSubfolder =
    ctx.breadcrumbPath.length > 1 &&
    activeFolderId !== rootFolderId;

  // Query files for active folder (tRPC deduplicates identical queries)
  const { data, isLoading } = trpc.drive.files.useQuery(
    {
      folderId: rootFolderId!,
      limit: 500,
      // At root: parentFileId = null; in subfolder: use parentDriveFileId
      ...(isInSubfolder
        ? { parentDriveFileId: activeFolderId! }
        : { parentFileId: null }),
      search: ctx.searchQuery || undefined,
    },
    { enabled: !!rootFolderId }
  );

  // Apply local filters (type, date range, enrichment status)
  const filteredFiles = useMemo(() => {
    if (!data?.files) return [];
    let files = [...data.files];

    // ── Type filter ──
    if (ctx.filters.type) {
      const typeMap: Record<string, string[]> = {
        pdf: ["application/pdf"],
        image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
        audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4"],
        folder: ["application/vnd.google-apps.folder"],
        document: [
          "application/vnd.google-apps.document",
          "application/vnd.google-apps.spreadsheet",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
      };
      const mimeTypes = typeMap[ctx.filters.type] || [];
      files = files.filter((f) =>
        mimeTypes.some((mt) => f.mimeType?.includes(mt))
      );
    }

    // ── Date range filter ──
    if (ctx.filters.dateRange) {
      const now = new Date();
      const cutoff = new Date();
      if (ctx.filters.dateRange === "today") {
        cutoff.setHours(0, 0, 0, 0);
      } else if (ctx.filters.dateRange === "week") {
        cutoff.setDate(now.getDate() - 7);
      } else if (ctx.filters.dateRange === "month") {
        cutoff.setMonth(now.getMonth() - 1);
      }
      files = files.filter((f) => {
        const d = f.lastModifiedTime || f.updatedAt || f.createdAt;
        return d && new Date(d) >= cutoff;
      });
    }

    // ── Enrichment status filter ──
    if (ctx.filters.enrichmentStatus) {
      files = files.filter(
        (f) => f.enrichmentStatus === ctx.filters.enrichmentStatus
      );
    }

    return files;
  }, [data?.files, ctx.filters]);

  // Count pending audio/video files in the current view (pre-filter, raw data)
  const pendingMediaCount = useMemo(() => {
    if (!data?.files) return 0;
    return data.files.filter((f) => {
      const isMedia = AUDIO_VIDEO_MIMES.some((m) => f.mimeType?.startsWith(m));
      const isPending =
        f.enrichmentStatus !== "completed" && f.enrichmentStatus !== "processing";
      return isMedia && isPending && !f.isFolder;
    }).length;
  }, [data?.files]);

  const transcribeAll = trpc.drive.transcribeAll.useMutation({
    onSuccess: (result) => {
      setIsTranscribingAll(false);
      if (result.enqueued === 0) {
        toast.info("Nenhum arquivo de áudio/vídeo pendente encontrado.");
      } else {
        toast.success(
          `${result.enqueued} arquivo${result.enqueued !== 1 ? "s" : ""} enfileirado${result.enqueued !== 1 ? "s" : ""} para transcrição.${result.skipped > 0 ? ` (${result.skipped} ignorado${result.skipped !== 1 ? "s" : ""})` : ""}`,
        );
        utils.drive.files.invalidate();
      }
    },
    onError: (error) => {
      setIsTranscribingAll(false);
      toast.error(`Erro ao iniciar transcrição em batch: ${error.message}`);
    },
  });

  const handleTranscribeAll = () => {
    if (!rootFolderId) return;
    setIsTranscribingAll(true);
    transcribeAll.mutate({
      folderId: rootFolderId,
      ...(isInSubfolder ? { parentDriveFileId: activeFolderId! } : {}),
    });
  };

  // Set initial breadcrumb when atribuicao is selected but breadcrumb is empty
  useEffect(() => {
    if (
      ctx.selectedAtribuicao &&
      ctx.breadcrumbPath.length === 0 &&
      activeFolderId &&
      !ctx.selectedFolderId
    ) {
      const atrib = getAtribuicaoByKey(ctx.selectedAtribuicao);
      if (atrib) {
        ctx.navigateToFolder(atrib.folderId, atrib.label);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.selectedAtribuicao]);

  // Show overview dashboard if no folder selected
  if (!activeFolderId) {
    return <DriveOverviewDashboard />;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Filters Row + Transcrever Todos */}
      <div className="px-4 pt-3 pb-2 shrink-0 flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <DriveFilters />
        </div>
        {pendingMediaCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs shrink-0 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
            onClick={handleTranscribeAll}
            disabled={isTranscribingAll}
          >
            {isTranscribingAll ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Mic className="h-3.5 w-3.5 mr-1.5" />
            )}
            Transcrever Todos
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium leading-none">
              {pendingMediaCount}
            </span>
          </Button>
        )}
      </div>

      {/* File List / Grid / Compact */}
      <div className="flex-1 overflow-y-auto p-4">
        {ctx.viewMode === "list" ? (
          <DriveFileList files={filteredFiles as any[]} isLoading={isLoading} />
        ) : ctx.viewMode === "grid" ? (
          <DriveFileGrid files={filteredFiles as any[]} isLoading={isLoading} />
        ) : (
          <DriveFileCompact files={filteredFiles as any[]} isLoading={isLoading} />
        )}
      </div>

      {/* Footer */}
      <div className="h-9 px-4 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-950 shrink-0">
        <span className="text-[10px] text-zinc-400">
          {filteredFiles.length} arquivo{filteredFiles.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Batch Actions (floating) */}
      <DriveBatchActions files={filteredFiles as any[]} />
    </div>
  );
}
