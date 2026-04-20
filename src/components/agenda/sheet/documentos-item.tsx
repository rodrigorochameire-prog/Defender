"use client";

import { ChevronDown, ChevronRight, ExternalLink, Loader2, Maximize2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DrivePreviewIframe } from "./drive-preview-iframe";
import { cn } from "@/lib/utils";

export interface DriveFileLite {
  driveFileId: string;
  name: string;
  mimeType: string;
  fileSize?: number | null;
  lastModifiedTime?: Date | string | null;
  webViewLink?: string | null;
  enrichmentStatus?: string | null;
}

interface Props {
  file: DriveFileLite;
  isOpen: boolean;
  onToggle: () => void;
  onExpand?: (file: DriveFileLite) => void;
}

function iconFor(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.startsWith("video/")) return "🎥";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  return "📎";
}

function formatSize(bytes?: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function DocumentosItem({ file, isOpen, onToggle, onExpand }: Props) {
  const dataStr = file.lastModifiedTime
    ? format(new Date(file.lastModifiedTime), "dd/MMM", { locale: ptBR })
    : "";
  return (
    <div className={cn(
      "rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden",
      isOpen && "bg-white dark:bg-neutral-900/50"
    )}>
      <div className="flex items-center gap-1 px-3 py-2 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
        <button
          type="button"
          aria-label={file.name}
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
        >
          <span className="text-base">{iconFor(file.mimeType)}</span>
          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 flex-1 min-w-0 truncate">
            {file.name}
          </span>
          {file.enrichmentStatus === "completed" && (
            <Sparkles className="w-3 h-3 text-emerald-500 flex-shrink-0" aria-label="Extraído" />
          )}
          {file.enrichmentStatus === "processing" && (
            <Loader2 className="w-3 h-3 text-amber-500 animate-spin flex-shrink-0" aria-label="Processando" />
          )}
          {dataStr && <span className="text-[10px] text-neutral-400 tabular-nums">{dataStr}</span>}
          {isOpen
            ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            : <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />}
        </button>
        {onExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpand(file);
            }}
            aria-label="Expandir visualização"
            title="Expandir em tela cheia"
            className="w-6 h-6 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer flex-shrink-0"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-neutral-100 dark:border-neutral-800/40 pt-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-500">
            <div className="flex items-center gap-2">
              <span>{file.mimeType}</span>
              {file.fileSize && <span>· {formatSize(file.fileSize)}</span>}
            </div>
            {onExpand && (
              <button
                type="button"
                onClick={() => onExpand(file)}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer"
              >
                <Maximize2 className="w-2.5 h-2.5" /> Expandir
              </button>
            )}
          </div>
          <DrivePreviewIframe driveFileId={file.driveFileId} />
          <div className="flex gap-1.5">
            {file.webViewLink && (
              <a
                href={file.webViewLink}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer"
              >
                <ExternalLink className="w-2.5 h-2.5" /> Abrir no Drive
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
