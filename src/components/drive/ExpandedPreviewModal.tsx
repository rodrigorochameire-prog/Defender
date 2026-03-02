"use client";

import { X, Maximize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExpandedPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  webViewLink: string;
}

export function ExpandedPreviewModal({
  isOpen,
  onClose,
  fileName,
  webViewLink,
}: ExpandedPreviewModalProps) {
  if (!isOpen) return null;

  const previewUrl = webViewLink.replace("/view", "/preview");

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Maximize2 className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[500px]"
              title={fileName}
            >
              {fileName}
            </p>
          </div>
        </div>

        <div className="flex-1" />

        <a
          href={webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
        <div className="w-full h-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900">
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title={fileName}
          />
        </div>
      </div>
    </div>
  );
}
