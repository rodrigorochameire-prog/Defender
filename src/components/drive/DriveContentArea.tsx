"use client";

import { useMemo, useEffect } from "react";
import { useDriveContext } from "./DriveContext";
import { getAtribuicaoFolderId, getAtribuicaoByKey } from "./drive-constants";
import { trpc } from "@/lib/trpc/client";
import { DriveFilters } from "./DriveFilters";
import { DriveFileGrid } from "./DriveFileGrid";
import { DriveFileList } from "./DriveFileList";
import { DriveFileCompact } from "./DriveFileCompact";
import { DriveBatchActions } from "./DriveBatchActions";
import { DriveOverviewDashboard } from "./DriveOverviewDashboard";

// ─── Main Orchestrator ──────────────────────────────────────────────

export function DriveContentArea() {
  const ctx = useDriveContext();

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
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* ─── Filters Row ─── */}
      <div className="px-3 pt-2 pb-1 shrink-0">
        <DriveFilters />
      </div>

      {/* ─── File List / Grid / Compact ─── */}
      <div className="flex-1 overflow-y-auto p-3">
        {ctx.viewMode === "list" ? (
          <DriveFileList files={filteredFiles} isLoading={isLoading} />
        ) : ctx.viewMode === "grid" ? (
          <DriveFileGrid files={filteredFiles} isLoading={isLoading} />
        ) : (
          <DriveFileCompact files={filteredFiles} isLoading={isLoading} />
        )}
      </div>

      {/* ─── Batch Actions (floating) ─── */}
      <DriveBatchActions files={filteredFiles} />
    </div>
  );
}
