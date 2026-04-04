"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import {
  getFileIcon,
  formatFileSize,
  DRIVE_ATRIBUICOES,
} from "./drive-constants";
import { FolderOpen } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ──────────────────────────────────────────────────────────

interface DriveFile {
  id: number;
  driveFileId: string;
  name: string;
  mimeType: string | null;
  fileSize: number | null;
  isFolder: boolean;
  webViewLink: string | null;
  webContentLink?: string | null;
  thumbnailLink: string | null;
  enrichmentStatus: string | null;
  assistidoId: number | null;
  processoId: number | null;
  createdAt: Date;
  lastModifiedTime: Date | null;
  driveFolderId: string;
}

interface DriveFileCompactProps {
  files: DriveFile[];
  isLoading?: boolean;
}

// ─── Skeleton Row ───────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-1.5 px-2 h-6 animate-pulse">
      <div className="w-3.5 h-3.5 rounded bg-neutral-200/50 dark:bg-neutral-700/50" />
      <div className="flex-1 h-2.5 bg-neutral-200/50 dark:bg-neutral-700/50 rounded w-1/3" />
      <div className="h-2.5 bg-neutral-200/50 dark:bg-neutral-700/50 rounded w-10" />
    </div>
  );
}

// ─── Ultra-Dense Row (24px) ─────────────────────────────────────────

function CompactRow({ file }: { file: DriveFile }) {
  const ctx = useDriveContext();
  const Icon = file.isFolder ? FolderOpen : getFileIcon(file.mimeType);
  const atribuicao = DRIVE_ATRIBUICOES.find((a) => a.folderId === file.driveFolderId);

  const meta = useMemo(() => {
    if (file.isFolder) return "";
    const parts: string[] = [];
    if (file.fileSize) parts.push(formatFileSize(file.fileSize));
    const d = file.lastModifiedTime || file.createdAt;
    if (d) {
      try { parts.push(formatDistanceToNow(new Date(d), { addSuffix: false, locale: ptBR })); }
      catch { /* skip */ }
    }
    return parts.join(" · ");
  }, [file]);

  const handleClick = () => {
    if (file.isFolder) ctx.navigateToFolder(file.driveFileId, file.name);
    else ctx.openDetailPanel(file.id);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 px-2 h-6 cursor-pointer transition-colors duration-100",
        "hover:bg-neutral-50 dark:hover:bg-neutral-800/60",
        file.isFolder && "font-medium"
      )}
    >
      {/* Atribuicao dot or spacer */}
      {atribuicao ? (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", atribuicao.dotClass)} />
      ) : (
        <span className="w-1.5 shrink-0" />
      )}

      {/* Icon */}
      <Icon className={cn(
        "w-3 h-3 shrink-0",
        file.isFolder ? "text-emerald-600 dark:text-emerald-500" : "text-neutral-400 dark:text-neutral-500"
      )} />

      {/* Name */}
      <span className="text-[11px] text-neutral-800 dark:text-neutral-200 truncate flex-1" title={file.name}>
        {file.name}
      </span>

      {/* Inline metadata */}
      {meta && (
        <span className="text-[9px] text-neutral-400 dark:text-neutral-600 shrink-0 tabular-nums">
          {meta}
        </span>
      )}
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
      <div className="rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden bg-white dark:bg-neutral-900">
        {Array.from({ length: 16 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (sortedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-2" />
        <p className="text-[12px] text-neutral-500 font-medium">Nenhum arquivo</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden bg-white dark:bg-neutral-900 divide-y divide-neutral-100/50 dark:divide-neutral-800/30">
      {sortedFiles.map((file) => (
        <CompactRow key={file.id} file={file} />
      ))}
    </div>
  );
}
