"use client";

import { useState, useMemo, useCallback } from "react";
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

interface DriveFileListProps {
  files: DriveFile[];
  isLoading?: boolean;
}

type SortKey = "name" | "type" | "size" | "date" | "status";
type SortDir = "asc" | "desc";

// ─── Helpers ────────────────────────────────────────────────────────

function getFileTypeLabel(mimeType: string | null, isFolder: boolean): string {
  if (isFolder) return "Pasta";
  if (!mimeType) return "Arquivo";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("image")) return "Imagem";
  if (mimeType.includes("audio")) return "Audio";
  if (mimeType.includes("video")) return "Video";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "Planilha";
  if (mimeType.includes("document") || mimeType.includes("word")) return "Doc";
  if (mimeType.includes("text/markdown") || mimeType.includes("text/plain")) return "Texto";
  return "Arquivo";
}

function getAtribuicaoForFolder(folderId: string) {
  return DRIVE_ATRIBUICOES.find((a) => a.folderId === folderId) ?? null;
}

// ─── Skeleton Row ───────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2.5 px-3 h-11 animate-pulse">
      <div className="w-3.5 h-3.5 rounded bg-zinc-200/50 dark:bg-zinc-700/50" />
      <div className="w-7 h-7 rounded-md bg-zinc-200/50 dark:bg-zinc-700/50" />
      <div className="flex-1 space-y-1">
        <div className="h-3 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-1/3" />
        <div className="h-2.5 bg-zinc-200/50 dark:bg-zinc-700/50 rounded w-1/4" />
      </div>
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
        "flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors duration-150",
        isActive ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400",
        className
      )}
    >
      {label}
      {isActive && (
        currentDir === "asc" ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
      )}
    </button>
  );
}

// ─── Column widths (shared between header and rows) ─────────────────
const COL = {
  type: "w-[72px] shrink-0",
  size: "w-[80px] shrink-0",
  date: "w-[88px] shrink-0",
  status: "w-[88px] shrink-0",
} as const;

// ─── File Row with Columns ──────────────────────────────────────────

function FileRow({ file }: { file: DriveFile }) {
  const ctx = useDriveContext();
  const utils = trpc.useUtils();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const isSelected = ctx.selectedFileIds.has(file.id);
  const Icon = file.isFolder ? FolderOpen : getFileIcon(file.mimeType);
  const enrichment = getEnrichmentBadge(file.enrichmentStatus);
  const atribuicao = getAtribuicaoForFolder(file.driveFolderId);

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
    try {
      return formatDistanceToNow(new Date(d), { addSuffix: false, locale: ptBR });
    } catch {
      return "";
    }
  }, [file.lastModifiedTime, file.createdAt]);

  const typeLabel = getFileTypeLabel(file.mimeType, file.isFolder);

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-2.5 px-3 h-10 cursor-pointer transition-colors duration-150",
        "border-b border-zinc-100/80 dark:border-zinc-800/40 last:border-0",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
        file.isFolder && "bg-zinc-50/30 dark:bg-zinc-800/20",
        isSelected && "bg-emerald-50/80 dark:bg-emerald-500/8 border-emerald-100 dark:border-emerald-500/10",
      )}
    >
      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => ctx.toggleFileSelection(file.id)}
          className="h-3.5 w-3.5 border-zinc-300 dark:border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
        />
      </div>

      {/* Icon with atribuicao dot */}
      <div className="relative shrink-0">
        <div className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center",
          file.isFolder ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-zinc-100 dark:bg-zinc-800",
        )}>
          <Icon className={cn(
            "w-3.5 h-3.5",
            file.isFolder ? "text-emerald-600 dark:text-emerald-500" : "text-zinc-400",
          )} />
        </div>
        {atribuicao && (
          <span className={cn("absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-1 ring-white dark:ring-zinc-900", atribuicao.dotClass)} />
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-zinc-800 dark:text-zinc-200 truncate leading-tight" title={file.name}>
          {file.name}
        </p>
      </div>

      {/* Type */}
      <span className={cn(COL.type, "text-[11px] text-zinc-400 dark:text-zinc-500 truncate")}>
        {typeLabel}
      </span>

      {/* Size */}
      <span className={cn(COL.size, "text-[11px] text-zinc-400 dark:text-zinc-500 truncate tabular-nums")}>
        {!file.isFolder && file.fileSize ? formatFileSize(file.fileSize) : "—"}
      </span>

      {/* Date */}
      <span className={cn(COL.date, "text-[11px] text-zinc-400 dark:text-zinc-500 truncate")}>
        {dateStr || "—"}
      </span>

      {/* Status / Enrichment */}
      <div className={cn(COL.status)}>
        {!file.isFolder && enrichment.label ? (
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border", enrichment.class)}>
            {enrichment.label}
          </span>
        ) : (
          <span className="text-[11px] text-zinc-300 dark:text-zinc-700">—</span>
        )}
      </div>

      {/* Actions */}
      <div className="w-7 shrink-0 flex justify-center" onClick={(e) => e.stopPropagation()}>
        {!file.isFolder ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-6 w-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">
                <MoreVertical className="h-3.5 w-3.5 text-zinc-400" />
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
        ) : (
          <div className="w-6" />
        )}
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

export function DriveFileList({ files, isLoading }: DriveFileListProps) {
  const ctx = useDriveContext();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      else { setSortKey(key); setSortDir("asc"); }
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
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "type": cmp = (a.mimeType || "").localeCompare(b.mimeType || ""); break;
        case "size": cmp = (a.size || 0) - (b.size || 0); break;
        case "date": {
          const da = new Date(a.modifiedAt || a.createdAt).getTime();
          const db = new Date(b.modifiedAt || b.createdAt).getTime();
          cmp = da - db;
          break;
        }
        case "status": cmp = (a.enrichmentStatus || "").localeCompare(b.enrichmentStatus || ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [files, sortKey, sortDir]);

  const allSelected = files.length > 0 && files.every((f) => ctx.selectedFileIds.has(f.id));

  const handleSelectAll = () => {
    if (allSelected) ctx.clearSelection();
    else ctx.selectAllFiles(files.map((f) => f.id));
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2.5 px-3 py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/40">
          <div className="w-3.5" /><div className="w-7" />
          <div className="flex-1 h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
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
    <div>
      {/* Table Header */}
      <div className="flex items-center gap-2.5 px-3 py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/30 sticky top-0 z-10">
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className="h-3.5 w-3.5 border-zinc-300 dark:border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
          />
        </div>
        <div className="w-7" />
        <div className="flex-1 min-w-0">
          <SortHeader label="Nome" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
        </div>
        <SortHeader label="Tipo" sortKey="type" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className={COL.type} />
        <SortHeader label="Tamanho" sortKey="size" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className={COL.size} />
        <SortHeader label="Data" sortKey="date" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className={COL.date} />
        <SortHeader label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className={COL.status} />
        <div className="w-7" />
      </div>

      {/* Rows */}
      {sortedFiles.map((file) => (
        <FileRow key={file.id} file={file} />
      ))}
    </div>
  );
}
