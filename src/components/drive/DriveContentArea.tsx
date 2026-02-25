"use client";

import { useMemo, useEffect } from "react";
import { useDriveContext } from "./DriveContext";
import { getAtribuicaoFolderId, getAtribuicaoByKey } from "./drive-constants";
import { trpc } from "@/lib/trpc/client";
import { DriveBreadcrumbs } from "./DriveBreadcrumbs";
import { DriveFilters } from "./DriveFilters";
import { DriveFileGrid } from "./DriveFileGrid";
import { DriveFileList } from "./DriveFileList";
import { DriveBatchActions } from "./DriveBatchActions";
import { DriveOverviewDashboard } from "./DriveOverviewDashboard";

// ─── Main Orchestrator ──────────────────────────────────────────────

export function DriveContentArea() {
  const ctx = useDriveContext();

  // Determine active folder: explicit selection takes priority, then atribuicao
  const activeFolderId =
    ctx.selectedFolderId || getAtribuicaoFolderId(ctx.selectedAtribuicao);

  // Query files for active folder (tRPC deduplicates identical queries)
  const { data, isLoading } = trpc.drive.files.useQuery(
    {
      folderId: activeFolderId!,
      parentFileId: null,
      search: ctx.searchQuery || undefined,
    },
    { enabled: !!activeFolderId }
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
  // (e.g. when user clicks an atribuicao card on the overview dashboard)
  useEffect(() => {
    if (
      ctx.selectedAtribuicao &&
      ctx.breadcrumbPath.length === 0 &&
      activeFolderId &&
      !ctx.selectedFolderId
    ) {
      const atrib = getAtribuicaoByKey(ctx.selectedAtribuicao);
      if (atrib) {
        // Push the atribuicao root as the first breadcrumb entry
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
      {/* ─── Breadcrumbs ─── */}
      <DriveBreadcrumbs />

      {/* ─── Filters Row ─── */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <DriveFilters />
      </div>

      {/* ─── File List / Grid ─── */}
      <div className="flex-1 overflow-y-auto p-4">
        {ctx.viewMode === "grid" ? (
          <DriveFileGrid files={filteredFiles} isLoading={isLoading} />
        ) : (
          <DriveFileList files={filteredFiles} isLoading={isLoading} />
        )}
      </div>

      {/* ─── Batch Actions (floating) ─── */}
      <DriveBatchActions />
    </div>
  );
}
