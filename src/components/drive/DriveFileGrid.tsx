"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import {
  getFileIcon,
  formatFileSize,
  getEnrichmentBadge,
} from "./drive-constants";
import { Checkbox } from "@/components/ui/checkbox";
import { FolderOpen } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────

interface DriveFile {
  id: number;
  driveFileId: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  isFolder: boolean;
  webViewLink: string | null;
  thumbnailLink: string | null;
  enrichmentStatus: string | null;
  assistidoId: number | null;
  processoId: number | null;
  createdAt: Date;
  modifiedAt: Date | null;
  driveFolderId: string;
}

interface DriveFileGridProps {
  files: DriveFile[];
  isLoading?: boolean;
}

// ─── Skeleton Card ──────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 animate-pulse">
      <div className="flex items-center justify-center h-20 mb-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-700/50" />
      </div>
      <div className="h-4 bg-zinc-700/50 rounded w-3/4 mb-2" />
      <div className="flex items-center justify-between">
        <div className="h-3 bg-zinc-700/50 rounded w-1/3" />
        <div className="h-4 bg-zinc-700/50 rounded w-1/4" />
      </div>
    </div>
  );
}

// ─── File Card ──────────────────────────────────────────────────────

function FileGridCard({ file }: { file: DriveFile }) {
  const ctx = useDriveContext();
  const isSelected = ctx.selectedFileIds.has(file.id);
  const Icon = file.isFolder ? FolderOpen : getFileIcon(file.mimeType);
  const enrichment = getEnrichmentBadge(file.enrichmentStatus);
  const isImage = file.mimeType?.startsWith("image/");

  const handleClick = () => {
    if (file.isFolder) {
      ctx.navigateToFolder(file.driveFileId, file.name);
    } else {
      ctx.openDetailPanel(file.id);
    }
  };

  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    ctx.toggleFileSelection(file.id);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 cursor-pointer",
        "hover:border-emerald-500/30 hover:bg-emerald-500/5",
        "transition-all duration-200",
        isSelected && "border-emerald-500/50 bg-emerald-500/10"
      )}
    >
      {/* Checkbox */}
      <div
        className={cn(
          "absolute top-2 left-2 z-10 transition-opacity duration-150",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={handleCheckboxChange}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => ctx.toggleFileSelection(file.id)}
          className="h-4 w-4 border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
        />
      </div>

      {/* Icon / Thumbnail */}
      <div className="flex items-center justify-center h-20 mb-3">
        {isImage && file.thumbnailLink ? (
          <img
            src={file.thumbnailLink}
            alt={file.name}
            className="max-h-20 max-w-full object-contain rounded"
          />
        ) : (
          <Icon
            className={cn(
              "w-10 h-10",
              file.isFolder ? "text-emerald-500" : "text-zinc-400"
            )}
          />
        )}
      </div>

      {/* Name */}
      <p className="text-sm font-medium text-zinc-200 truncate" title={file.name}>
        {file.name}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-1.5 gap-2">
        {file.isFolder ? (
          <span className="text-xs text-zinc-500">Pasta</span>
        ) : (
          <span className="text-xs text-zinc-500">
            {formatFileSize(file.size)}
          </span>
        )}

        {!file.isFolder && enrichment.label && (
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full border shrink-0",
              enrichment.class
            )}
          >
            {enrichment.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function DriveFileGrid({ files, isLoading }: DriveFileGridProps) {
  const sortedFiles = useMemo(() => {
    // Folders first, then files
    return [...files].sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [files]);

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (sortedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FolderOpen className="w-12 h-12 text-zinc-600 mb-3" />
        <p className="text-sm text-zinc-400 font-medium">
          Nenhum arquivo nesta pasta
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Sincronize ou faca upload de arquivos para visualizar
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {sortedFiles.map((file) => (
        <FileGridCard key={file.id} file={file} />
      ))}
    </div>
  );
}
