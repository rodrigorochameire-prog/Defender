"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import {
  getFileIcon,
  formatFileSize,
  getEnrichmentBadge,
} from "./drive-constants";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderOpen, ChevronUp, ChevronDown, MoreVertical, ExternalLink, Pencil, FolderInput, Download, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { MoveFileModal } from "./MoveFileModal";

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

interface DriveFileListProps {
  files: DriveFile[];
  isLoading?: boolean;
}

type SortKey = "name" | "size" | "date";
type SortDir = "asc" | "desc";

// ─── Skeleton Row ───────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-4 h-4 rounded bg-zinc-200/50 dark:bg-zinc-700/50" />
      <div className="w-8 h-8 rounded bg-zinc-200/50 dark:bg-zinc-700/50" />
      <div className="flex-1 h-4 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-1/3" />
      <div className="h-3 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-16" />
      <div className="h-3 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-24" />
      <div className="h-4 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-16" />
    </div>
  );
}

// ─── Sort Header Cell ───────────────────────────────────────────────

function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentSort === sortKey;

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        "flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors duration-150",
        isActive ? "text-zinc-900 dark:text-zinc-200" : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
        className
      )}
    >
      {label}
      {isActive && (
        currentDir === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      )}
    </button>
  );
}

// ─── File Row ───────────────────────────────────────────────────────

function FileRow({ file }: { file: DriveFile }) {
  const ctx = useDriveContext();
  const utils = trpc.useUtils();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const isSelected = ctx.selectedFileIds.has(file.id);
  const Icon = file.isFolder ? FolderOpen : getFileIcon(file.mimeType);
  const enrichment = getEnrichmentBadge(file.enrichmentStatus);

  const deleteFile = trpc.drive.deleteFile.useMutation({
    onSuccess: () => {
      toast.success("Arquivo excluido com sucesso");
      utils.drive.files.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir arquivo");
    },
  });

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

  const handleDelete = () => {
    const confirmed = window.confirm(`Excluir "${file.name}"? Esta acao nao pode ser desfeita.`);
    if (confirmed) {
      deleteFile.mutate({ fileId: file.driveFileId });
    }
  };

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

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors duration-150",
        "border-b border-zinc-100 dark:border-zinc-800/50 last:border-0",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
        file.isFolder && "bg-zinc-50/50 dark:bg-zinc-800/30",
        isSelected && "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/10"
      )}
    >
      {/* Checkbox */}
      <div onClick={handleCheckboxClick}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => ctx.toggleFileSelection(file.id)}
          className="h-4 w-4 border-zinc-300 dark:border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
        />
      </div>

      {/* Icon in container */}
      <div className={cn(
        "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
        file.isFolder
          ? "bg-emerald-50 dark:bg-emerald-500/10"
          : "bg-zinc-100 dark:bg-zinc-800"
      )}>
        <Icon
          className={cn(
            "w-4 h-4",
            file.isFolder ? "text-emerald-600 dark:text-emerald-500" : "text-zinc-400 dark:text-zinc-400"
          )}
        />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-zinc-900 dark:text-zinc-200 truncate" title={file.name}>
          {file.name}
        </p>
      </div>

      {/* Size */}
      <div className="w-20 text-right shrink-0">
        <span className="text-xs text-zinc-500">
          {file.isFolder ? "-" : formatFileSize(file.size)}
        </span>
      </div>

      {/* Modified date */}
      <div className="w-32 text-right shrink-0 hidden sm:block">
        <span className="text-xs text-zinc-500">{dateStr}</span>
      </div>

      {/* Enrichment */}
      <div className="w-24 text-right shrink-0">
        {!file.isFolder && enrichment.label ? (
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full border inline-block",
              enrichment.class
            )}
          >
            {enrichment.label}
          </span>
        ) : (
          <span className="text-xs text-zinc-400 dark:text-zinc-600">-</span>
        )}
      </div>

      {/* Actions */}
      <div className="w-8 shrink-0 flex justify-center" onClick={(e) => e.stopPropagation()}>
        {!file.isFolder ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">
                <MoreVertical className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer"
                onClick={() => {
                  if (file.webViewLink) window.open(file.webViewLink, "_blank");
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer"
                onClick={() => ctx.openDetailPanel(file.id)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer"
                onClick={() => setShowMoveModal(true)}
              >
                <FolderInput className="h-3.5 w-3.5" />
                Mover para...
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer"
                onClick={() => {
                  const link = file.webContentLink || file.webViewLink;
                  if (link) window.open(link, "_blank");
                }}
              >
                <Download className="h-3.5 w-3.5" />
                Baixar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="w-7" />
        )}
      </div>

      {/* Move File Modal */}
      {!file.isFolder && (
        <MoveFileModal
          open={showMoveModal}
          onOpenChange={setShowMoveModal}
          fileIds={[file.id]}
          driveFileIds={[file.driveFileId]}
          fileNames={[file.name]}
          onSuccess={() => utils.drive.files.invalidate()}
        />
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export function DriveFileList({ files, isLoading }: DriveFileListProps) {
  const ctx = useDriveContext();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const sortedFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => {
      // Folders always first
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "size":
          cmp = (a.size || 0) - (b.size || 0);
          break;
        case "date": {
          const da = new Date(a.modifiedAt || a.createdAt).getTime();
          const db = new Date(b.modifiedAt || b.createdAt).getTime();
          cmp = da - db;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [files, sortKey, sortDir]);

  // Check all / none
  const allSelected =
    files.length > 0 &&
    files.every((f) => ctx.selectedFileIds.has(f.id));

  const handleSelectAll = () => {
    if (allSelected) {
      ctx.clearSelection();
    } else {
      ctx.selectAllFiles(files.map((f) => f.id));
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-4" />
          <div className="w-5" />
          <div className="flex-1 h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (sortedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FolderOpen className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          Nenhum arquivo nesta pasta
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Sincronize ou faca upload de arquivos para visualizar
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Table Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 sticky top-0 z-10">
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className="h-4 w-4 border-zinc-300 dark:border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
          />
        </div>
        <div className="w-8" /> {/* icon spacer */}
        <div className="flex-1">
          <SortHeader
            label="Nome"
            sortKey="name"
            currentSort={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
          />
        </div>
        <div className="w-20 text-right">
          <SortHeader
            label="Tamanho"
            sortKey="size"
            currentSort={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
            className="justify-end"
          />
        </div>
        <div className="w-32 text-right hidden sm:block">
          <SortHeader
            label="Modificado"
            sortKey="date"
            currentSort={sortKey}
            currentDir={sortDir}
            onSort={handleSort}
            className="justify-end"
          />
        </div>
        <div className="w-24 text-right">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Enrichment
          </span>
        </div>
        <div className="w-8" /> {/* actions spacer */}
      </div>

      {/* Rows */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {sortedFiles.map((file) => (
          <FileRow key={file.id} file={file} />
        ))}
      </div>
    </div>
  );
}
