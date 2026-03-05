"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Maximize2, ExternalLink, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getFileTypeLabel } from "./drive-constants";

interface ExpandedPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  webViewLink: string;
  driveFileId?: string;
  mimeType?: string | null;
  fileSize?: string | null;
  enrichmentStatus?: string | null;
}

export function ExpandedPreviewModal({
  isOpen,
  onClose,
  fileName,
  webViewLink,
  driveFileId,
  mimeType,
  fileSize,
  enrichmentStatus,
}: ExpandedPreviewModalProps) {
  const [iframeLoading, setIframeLoading] = useState(true);

  // Escape key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setIframeLoading(true);
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // Use proxy for PDFs (avoids Google CSP frame-ancestors block)
  const previewUrl = driveFileId
    ? `/api/drive/proxy?fileId=${driveFileId}`
    : webViewLink.replace("/view", "/preview");

  const fileTypeLabel = getFileTypeLabel(mimeType ?? null);

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[500px]"
              title={fileName}
            >
              {fileName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {fileTypeLabel && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  {fileTypeLabel}
                </span>
              )}
              {fileSize && (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  {fileSize}
                </span>
              )}
              {enrichmentStatus === "completed" && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  Extraido
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <a
          href={webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Abrir no Drive
        </a>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 shrink-0"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Full-size preview */}
      <div className="flex-1 p-3 min-h-0">
        <div className="w-full h-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 relative">
          {/* Loading spinner */}
          {iframeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-xs text-zinc-400 dark:text-zinc-500">Carregando preview...</span>
              </div>
            </div>
          )}
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={fileName}
            onLoad={() => setIframeLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}
