"use client";

import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
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
}

interface Props {
  file: DriveFileLite;
  isOpen: boolean;
  onToggle: () => void;
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

export function DocumentosItem({ file, isOpen, onToggle }: Props) {
  const dataStr = file.lastModifiedTime
    ? format(new Date(file.lastModifiedTime), "dd/MMM", { locale: ptBR })
    : "";
  return (
    <div className={cn(
      "rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden",
      isOpen && "bg-white dark:bg-neutral-900/50"
    )}>
      <button
        type="button"
        aria-label={file.name}
        onClick={onToggle}
        className="w-full text-left flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20"
      >
        <span className="text-base">{iconFor(file.mimeType)}</span>
        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 flex-1 min-w-0 truncate">
          {file.name}
        </span>
        {dataStr && <span className="text-[10px] text-neutral-400 tabular-nums">{dataStr}</span>}
        {isOpen
          ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          : <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />}
      </button>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-neutral-100 dark:border-neutral-800/40 pt-2.5 space-y-2">
          <div className="flex items-center gap-2 text-[10px] text-neutral-500">
            <span>{file.mimeType}</span>
            {file.fileSize && <span>· {formatSize(file.fileSize)}</span>}
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
