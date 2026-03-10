"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import {
  getFileIcon,
  formatFileSize,
  getEnrichmentBadge,
  DRIVE_ATRIBUICOES,
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

interface DriveFileGridProps {
  files: DriveFile[];
  isLoading?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getFileTypeShort(mimeType: string | null): string {
  if (!mimeType) return "";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("image")) return "IMG";
  if (mimeType.includes("audio")) return "MP3";
  if (mimeType.includes("video")) return "MP4";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "XLS";
  if (mimeType.includes("document") || mimeType.includes("word")) return "DOC";
  if (mimeType.includes("markdown") || mimeType.includes("text/plain")) return "TXT";
  return "";
}

// ─── Skeleton Card ──────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/40 dark:border-zinc-700/40 rounded-lg overflow-hidden animate-pulse">
      <div className="h-24 sm:h-28 bg-zinc-200/30 dark:bg-zinc-700/30" />
      <div className="p-2">
        <div className="h-3 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-3/4 mb-1" />
        <div className="h-2.5 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-1/3" />
      </div>
    </div>
  );
}

// ─── File Card ──────────────────────────────────────────────────────

function FileGridCard({ file }: { file: DriveFile }) {
  const ctx = useDriveContext();
  const utils = trpc.useUtils();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isSelected = ctx.selectedFileIds.has(file.id);
  const Icon = file.isFolder ? FolderOpen : getFileIcon(file.mimeType);
  const enrichment = getEnrichmentBadge(file.enrichmentStatus);
  const typeShort = getFileTypeShort(file.mimeType);
  const hasThumbnail = !file.isFolder && file.thumbnailLink && !imgError;
  const atribuicao = DRIVE_ATRIBUICOES.find((a) => a.folderId === file.driveFolderId);

  const deleteFile = trpc.drive.deleteFile.useMutation({
    onSuccess: () => { toast.success("Arquivo excluido"); utils.drive.files.invalidate(); },
    onError: (error) => { toast.error(error.message || "Erro ao excluir"); },
  });

  const handleClick = () => {
    if (file.isFolder) ctx.navigateToFolder(file.driveFileId, file.name);
    else ctx.openDetailPanel(file.id);
  };

  const handleDelete = () => {
    if (window.confirm(`Excluir "${file.name}"?`)) {
      deleteFile.mutate({ fileId: file.driveFileId });
    }
  };

  const dateStr = useMemo(() => {
    const d = file.lastModifiedTime || file.createdAt;
    if (!d) return "";
    try { return formatDistanceToNow(new Date(d), { addSuffix: false, locale: ptBR }); }
    catch { return ""; }
  }, [file.lastModifiedTime, file.createdAt]);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-lg overflow-hidden cursor-pointer",
        "hover:border-emerald-200 dark:hover:border-emerald-500/30 hover:bg-emerald-50/20 dark:hover:bg-emerald-500/5",
        "transition-colors duration-200",
        isSelected && "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/80 dark:bg-emerald-500/10"
      )}
    >
      {/* Checkbox - top left */}
      <div
        className={cn(
          "absolute top-1.5 left-1.5 z-10 transition-opacity duration-150",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => { e.stopPropagation(); ctx.toggleFileSelection(file.id); }}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => ctx.toggleFileSelection(file.id)}
          className="h-4 w-4 border-zinc-300 dark:border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm"
        />
      </div>

      {/* Context Menu - top right */}
      {!file.isFolder && (
        <div
          className={cn(
            "absolute top-1.5 right-1.5 z-10 transition-opacity duration-150",
            "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-6 w-6 flex items-center justify-center rounded-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                <MoreVertical className="h-3.5 w-3.5 text-zinc-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="text-[11px] gap-2 cursor-pointer" onClick={() => { if (file.webViewLink) window.open(file.webViewLink, "_blank"); }}>
                <ExternalLink className="h-3 w-3" /> Abrir
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[11px] gap-2 cursor-pointer" onClick={() => ctx.openDetailPanel(file.id)}>
                <Pencil className="h-3 w-3" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[11px] gap-2 cursor-pointer" onClick={() => setShowMoveModal(true)}>
                <FolderInput className="h-3 w-3" /> Mover
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[11px] gap-2 cursor-pointer" onClick={() => { const link = file.webContentLink || file.webViewLink; if (link) window.open(link, "_blank"); }}>
                <Download className="h-3 w-3" /> Baixar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-[11px] gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-500/10" onClick={handleDelete}>
                <Trash2 className="h-3 w-3" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Preview area */}
      <div className={cn(
        "relative h-24 sm:h-28 flex items-center justify-center",
        hasThumbnail ? "bg-zinc-50 dark:bg-zinc-800/50" : file.isFolder ? "bg-emerald-50/50 dark:bg-emerald-500/5" : "bg-zinc-50 dark:bg-zinc-800/30"
      )}>
        {hasThumbnail ? (
          <img
            src={file.thumbnailLink!}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Icon className={cn(
            "w-8 h-8",
            file.isFolder ? "text-emerald-500/60 dark:text-emerald-500/40" : "text-zinc-300 dark:text-zinc-600"
          )} />
        )}

        {/* Type badge - bottom right of preview */}
        {!file.isFolder && typeShort && (
          <span className="absolute bottom-1 right-1 text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-black/60 text-white leading-none">
            {typeShort}
          </span>
        )}

        {/* Atribuicao dot - bottom left */}
        {atribuicao && (
          <span className={cn("absolute bottom-1.5 left-1.5 h-2 w-2 rounded-full ring-1 ring-white dark:ring-zinc-900", atribuicao.dotClass)} />
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate leading-tight" title={file.name}>
          {file.name}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {file.isFolder ? "Pasta" : [formatFileSize(file.fileSize), dateStr].filter(Boolean).join(" · ")}
          </span>
          {!file.isFolder && enrichment.label && (
            <span className={cn("text-[8px] px-1 py-0.5 rounded-full border shrink-0", enrichment.class)}>
              {enrichment.label}
            </span>
          )}
        </div>
      </div>

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
    return [...files].sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [files]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
        {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (sortedFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mb-2" />
        <p className="text-[12px] text-zinc-500 font-medium">Nenhum arquivo nesta pasta</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">Sincronize ou faca upload</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
      {sortedFiles.map((file) => (
        <FileGridCard key={file.id} file={file} />
      ))}
    </div>
  );
}
