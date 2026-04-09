"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import {
  formatFileSize,
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
import { FolderOpen, ChevronUp, ChevronDown, MoreVertical, ExternalLink, Pencil, FolderInput, Download, Trash2, Lightbulb } from "lucide-react";
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

function getFileFormatIcon(mimeType: string | null, name: string): { label: string; bgClass: string; textClass: string; fontSize: string } {
  if (!mimeType) return { label: "?", bgClass: "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700/50", textClass: "text-zinc-500 dark:text-zinc-400", fontSize: "text-[10px]" };
  if (mimeType.includes("pdf")) return { label: "PDF", bgClass: "bg-red-50 dark:bg-red-950/40 border-red-200/80 dark:border-red-900/30", textClass: "text-red-500 dark:text-red-400", fontSize: "text-[10px]" };
  if (mimeType.includes("image")) return { label: "IMG", bgClass: "bg-violet-50 dark:bg-violet-950/40 border-violet-200/80 dark:border-violet-900/30", textClass: "text-violet-500 dark:text-violet-400", fontSize: "text-[10px]" };
  if (mimeType.includes("audio")) return { label: "MP3", bgClass: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-900/30", textClass: "text-cyan-500 dark:text-cyan-400", fontSize: "text-[10px]" };
  if (mimeType.includes("video")) return { label: "VID", bgClass: "bg-pink-50 dark:bg-pink-950/40 border-pink-200/80 dark:border-pink-900/30", textClass: "text-pink-500 dark:text-pink-400", fontSize: "text-[10px]" };
  if (mimeType.includes("document") || mimeType.includes("word") || mimeType.includes("msword")) return { label: "DOC", bgClass: "bg-blue-50 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-900/30", textClass: "text-blue-500 dark:text-blue-400", fontSize: "text-[10px]" };
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return { label: "XLS", bgClass: "bg-green-50 dark:bg-green-950/40 border-green-200/80 dark:border-green-900/30", textClass: "text-green-500 dark:text-green-400", fontSize: "text-[10px]" };
  if (mimeType === "text/markdown" || name.endsWith(".md")) return { label: "MD", bgClass: "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700/50", textClass: "text-zinc-500 dark:text-zinc-400", fontSize: "text-[10px]" };
  if (mimeType.includes("json") || name.endsWith(".json")) return { label: "JSON", bgClass: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/30", textClass: "text-amber-600 dark:text-amber-400", fontSize: "text-[9px]" };
  return { label: "FILE", bgClass: "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700/50", textClass: "text-zinc-500 dark:text-zinc-400", fontSize: "text-[9px]" };
}

function isAIFile(name: string, enrichmentStatus: string | null): boolean {
  return name.includes("_analise_ia") || name.includes("_ia.json") || (name.includes("Relatorio") && name.includes("analise"));
}

// ─── Skeleton Row ───────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 animate-pulse">
      <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded w-2/5" />
        <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded w-1/4" />
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

// ─── File Row ──────────────────────────────────────────────────────

function getAttrColor(atrib: string | null) {
  const a = DRIVE_ATRIBUICOES.find((x) => x.key === atrib);
  const c = a?.color ?? "emerald";
  const map: Record<string, { bg: string; icon: string }> = {
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/30", icon: "text-emerald-500" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/30", icon: "text-amber-500" },
    sky: { bg: "bg-sky-50 dark:bg-sky-950/40 border-sky-200/80 dark:border-sky-900/30", icon: "text-sky-500" },
    rose: { bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/30", icon: "text-rose-500" },
    orange: { bg: "bg-orange-50 dark:bg-orange-950/40 border-orange-200/80 dark:border-orange-900/30", icon: "text-orange-500" },
  };
  return map[c] ?? map.emerald;
}

function FileRow({ file }: { file: DriveFile }) {
  const ctx = useDriveContext();
  const utils = trpc.useUtils();
  const [showMoveModal, setShowMoveModal] = useState(false);
  const isSelected = ctx.selectedFileIds.has(file.id);
  const formatIcon = file.isFolder ? null : getFileFormatIcon(file.mimeType, file.name);
  const isIA = !file.isFolder && isAIFile(file.name, file.enrichmentStatus);

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
      const date = new Date(d);
      return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
    } catch {
      return "";
    }
  }, [file.lastModifiedTime, file.createdAt]);

  const typeLabel = getFileTypeLabel(file.mimeType, file.isFolder);
  const sizeStr = !file.isFolder && file.fileSize ? formatFileSize(file.fileSize) : "";
  const subtitle = [typeLabel !== "Pasta" ? typeLabel : null, sizeStr, dateStr].filter(Boolean).join(" · ");

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors",
        "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30",
        isSelected && "bg-emerald-50/60 dark:bg-emerald-950/10",
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

      {/* Format icon */}
      <div className="shrink-0">
        {file.isFolder ? (
          <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center", getAttrColor(ctx.selectedAtribuicao).bg)}>
            <FolderOpen className={cn("w-4 h-4", getAttrColor(ctx.selectedAtribuicao).icon)} />
          </div>
        ) : formatIcon ? (
          <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center", formatIcon.bgClass)}>
            <span className={cn("font-bold", formatIcon.textClass, formatIcon.fontSize)}>{formatIcon.label}</span>
          </div>
        ) : null}
      </div>

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 truncate" title={file.name}>
          {file.name}
        </p>
        {subtitle && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Status indicator: dot or IA badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isIA ? (
          <>
            <Lightbulb className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] text-zinc-400">IA</span>
          </>
        ) : !file.isFolder && file.enrichmentStatus === "completed" ? (
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Enriquecido" />
        ) : !file.isFolder && (file.enrichmentStatus === "pending" || file.enrichmentStatus === "processing") ? (
          <span className={cn("w-2 h-2 rounded-full bg-amber-500", file.enrichmentStatus === "processing" && "animate-pulse")} title={file.enrichmentStatus === "processing" ? "Processando" : "Pendente"} />
        ) : null}
      </div>

      {/* Actions menu (hover only) */}
      <div className="w-7 shrink-0 flex justify-center" onClick={(e) => e.stopPropagation()}>
        {!file.isFolder ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-white/60 dark:hover:bg-zinc-800 transition-all">
                <MoreVertical className="h-4 w-4 text-zinc-400" />
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
        case "size": cmp = (a.fileSize || 0) - (b.fileSize || 0); break;
        case "date": {
          const da = new Date(a.lastModifiedTime || a.createdAt).getTime();
          const db = new Date(b.lastModifiedTime || b.createdAt).getTime();
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
      <div className="bg-white dark:bg-zinc-900/40 rounded-xl border border-zinc-200/80 dark:border-zinc-800/50 divide-y divide-zinc-100 dark:divide-zinc-800/40 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
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
      {/* Sort header row */}
      <div className="flex items-center gap-3 px-3 py-1.5 mb-1">
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className="h-3.5 w-3.5 border-zinc-300 dark:border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
          />
        </div>
        <div className="w-9" />
        <div className="flex-1 min-w-0">
          <SortHeader label="Nome" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
        </div>
        <SortHeader label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-16 shrink-0" />
        <div className="w-7" />
      </div>

      {/* Card wrapper with all file rows */}
      <div className="bg-white dark:bg-zinc-900/40 rounded-xl border border-zinc-200/80 dark:border-zinc-800/50 divide-y divide-zinc-100 dark:divide-zinc-800/40 overflow-hidden">
        {sortedFiles.map((file) => (
          <FileRow key={file.id} file={file} />
        ))}
      </div>
    </div>
  );
}
