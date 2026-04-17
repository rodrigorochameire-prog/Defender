"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DrivePreviewIframe } from "./drive-preview-iframe";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driveFileId: string;
  title: string;
}

export function VideoModal({ open, onOpenChange, driveFileId, title }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw] w-[80vw] h-[80vh] p-0">
        <DialogHeader className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <DialogTitle className="text-sm truncate">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 p-4 overflow-hidden">
          <DrivePreviewIframe driveFileId={driveFileId} title={title} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
