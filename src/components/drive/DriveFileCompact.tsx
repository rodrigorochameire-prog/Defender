"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import {
  getFileIcon,
  formatFileSize,
} from "./drive-constants";
import { Checkbox } from "@/components/ui/checkbox";
import { FolderOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ──────────────────────────────────────────────────────────

interface DriveFile {
  id: number;
  driveFileId: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  isFolder: boolean;
  webViewLink: string | null;
  webContentLink?: string | null;
  thumbnailLink: string | null;
  enrichmentStatus: string | null;
  assistidoId: number | null;
  processoId: number | null;
  createdAt: Date;
  modifiedAt: Date | null;
  driveFolderId: string;
}

interface DriveFileCompactProps {
  files: DriveFile[];
  isLoading?: boolean;
}

// ─── Skeleton Row ───────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 animate-pulse">
      <div className="w-4 h-4 rounded bg-zinc-200/50 dark:bg-zinc-700/50" />
      <div className="flex-1 h-3 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-1/3" />
      <div className="h-3 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-12" />
      <div className="h-3 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-20" />
    </div>
  );
}

// ─── Compact File Row ───────────────────────────────────────────────

function CompactRow({ file }: { file: DriveFile }) {
  const ctx = useDriveContext();
  const isSelected = ctx.selectedFileIds.has(file.id);
  const Icon = file.isFolder ? FolderOpen : getFileIcon(file.mimeType);

  const dateStr = useMemo(() => {
    const d = file.modifiedAt || file.createdAt;
    if (!d) return "-";
    try {
      return formatDistanceToNow(new Date(d), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return "-";
    }
  }, [file.modifiedAt, file.createdAt]);

  const handleClick = () => {
    if (file.isFolder) {
      ctx.navigateToFolder(file.driveFileId, file.name);
    } else {
      ctx.openDetailPanel(file.id);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors duration-100",
        "border-b border-zinc-50 dark:border-zinc-800/30 last:border-0",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/60",
        file.isFolder && "bg-zinc-50/30 dark:bg-zinc-800/20",
        isSelected && "bg-emerald-50 dark:bg-emerald-500/10"
      )}
    >
      {/* Checkbox - only visible on hover or when selected */}
      <div
        className={cn(
          "transition-opacity duration-100",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={handleCheckboxClick}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => ctx.toggleFileSelection(file.id)}
          className="h-3.5 w-3.5 border-zinc-300 dark:border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
        />
      </div>

      {/* Icon (small) */}
      <Icon
        className={cn(
          "w-3.5 h-3.5 shrink-0",
          file.isFolder ? "text-emerald-600 dark:text-emerald-500" : "text-zinc-400 dark:text-zinc-500"
        )}
      />

      {/* Name */}
      <span className="text-xs text-zinc-800 dark:text-zinc-200 truncate flex-1" title={file.name}>
        {file.name}
      </span>

      {/* Size */}
      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0 w-14 text-right">
        {file.isFolder ? "-" : formatFileSize(file.size)}
      </span>

      {/* Date */}
      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0 w-24 text-right hidden sm:block">
        {dateStr}
      </span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function DriveFileCompact({ files, isLoading }: DriveFileCompactProps) {
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [files]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (sortedFiles.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-400 dark:text-zinc-500 text-sm">
        Nenhum arquivo encontrado
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
      {sortedFiles.map((file) => (
        <CompactRow key={file.id} file={file} />
      ))}
    </div>
  );
}
