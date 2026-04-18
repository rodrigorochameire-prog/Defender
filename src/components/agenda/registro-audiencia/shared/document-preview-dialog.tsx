"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DrivePreviewIframe } from "@/components/agenda/sheet/drive-preview-iframe";
import { X } from "lucide-react";

interface Props {
  driveFileId: string | null;
  title?: string;
  onClose: () => void;
}

export function DocumentPreviewDialog({ driveFileId, title = "Documento", onClose }: Props) {
  const open = !!driveFileId;
  const iframeHeight =
    typeof window !== "undefined" ? Math.floor(window.innerHeight * 0.9) : 720;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="!max-w-none w-[95vw] h-[95vh] flex flex-col p-0 gap-0 bg-white dark:bg-neutral-950 overflow-hidden"
        hideClose
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Visualização de documento do Drive em modo imersivo.
        </DialogDescription>
        <div className="bg-neutral-900 dark:bg-neutral-950 text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold truncate">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-7 h-7 rounded hover:bg-neutral-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 overflow-hidden p-2">
          {driveFileId && (
            <DrivePreviewIframe
              driveFileId={driveFileId}
              height={iframeHeight}
              title={title}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
