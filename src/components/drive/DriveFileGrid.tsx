"use client";

import { useState, useMemo } from "react";
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
import { FolderOpen, MoreVertical, ExternalLink, Pencil, FolderInput, Download, Trash2 } from "lucide-react";
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

interface DriveFileGridProps {
  files: DriveFile[];
  isLoading?: boolean;
}

// ─── Skeleton Card ──────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-zinc-200/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-lg p-3 animate-pulse">
      <div className="flex items-center justify-center h-14 sm:h-20 mb-2 sm:mb-3">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-zinc-200/50 dark:bg-zinc-700/50" />
      </div>
      <div className="h-4 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-3/4 mb-2" />
      <div className="flex items-center justify-between">
        <div className="h-3 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-1/3" />
        <div className="h-4 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-1/4" />
      </div>
    </div>
  );
}

// ─── File Card ──────────────────────────────────────────────────────

function FileGridCard({ file }: { file: DriveFile }) {
  const ctx = useDriveContext();
  const utils = trpc.useUtils();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const isSelected = ctx.selectedFileIds.has(file.id);
  const Icon = file.isFolder ? FolderOpen : getFileIcon(file.mimeType);
  const enrichment = getEnrichmentBadge(file.enrichmentStatus);
  const isImage = file.mimeType?.startsWith("image/");

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

  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    ctx.toggleFileSelection(file.id);
  };

  const handleDelete = () => {
    const confirmed = window.confirm(`Excluir "${file.name}"? Esta acao nao pode ser desfeita.`);
    if (confirmed) {
      deleteFile.mutate({ fileId: file.driveFileId });
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-lg p-3 cursor-pointer",
        "hover:border-emerald-200 dark:hover:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-black/20",
        "transition-all duration-200",
        isSelected && "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10"
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
          className="h-4 w-4 border-zinc-300 dark:border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
        />
      </div>

      {/* Context Menu (files only) */}
      {!file.isFolder && (
        <div
          className={cn(
            "absolute top-2 right-2 z-10 transition-opacity duration-150",
            "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
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
        </div>
      )}

      {/* Icon / Thumbnail */}
      <div className="flex items-center justify-center h-14 sm:h-20 mb-2 sm:mb-3">
        {isImage && file.thumbnailLink ? (
          <img
            src={file.thumbnailLink}
            alt={file.name}
            className="max-h-14 sm:max-h-20 max-w-full object-contain rounded"
          />
        ) : (
          <Icon
            className={cn(
              "w-8 h-8 sm:w-10 sm:h-10",
              file.isFolder ? "text-emerald-600 dark:text-emerald-500" : "text-zinc-400 dark:text-zinc-400"
            )}
          />
        )}
      </div>

      {/* Name */}
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate" title={file.name}>
        {file.name}
      </p>

      {/* Bottom row */}
      <div className="flex items-center justify-between mt-1.5 gap-2">
        {file.isFolder ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-500">Pasta</span>
        ) : (
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (sortedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center">
        <FolderOpen className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          Nenhum arquivo nesta pasta
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
          Sincronize ou faca upload de arquivos para visualizar
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
      {sortedFiles.map((file) => (
        <FileGridCard key={file.id} file={file} />
      ))}
    </div>
  );
}
