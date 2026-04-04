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
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[500px]"
              title={fileName}
            >
              {fileName}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {fileTypeLabel && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                  {fileTypeLabel}
                </span>
              )}
              {fileSize && (
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Abrir no Drive
        </a>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 shrink-0"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Full-size preview */}
      <div className="flex-1 p-3 min-h-0">
        <div className="w-full h-full rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 relative">
          {/* Loading spinner */}
          {iframeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-xs text-neutral-400 dark:text-neutral-500">Carregando preview...</span>
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
