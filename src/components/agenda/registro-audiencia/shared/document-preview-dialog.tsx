"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DrivePreviewIframe } from "@/components/agenda/sheet/drive-preview-iframe";
import { ExternalLink, Maximize2, X } from "lucide-react";

interface Props {
  driveFileId: string | null;
  title?: string;
  mimeType?: string | null;
  webViewLink?: string | null;
  onClose: () => void;
}

function driveStreamUrl(driveFileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
}

function driveViewUrl(driveFileId: string): string {
  return `https://drive.google.com/file/d/${driveFileId}/view`;
}

export function DocumentPreviewDialog({
  driveFileId,
  title = "Documento",
  mimeType,
  webViewLink,
  onClose,
}: Props) {
  const open = !!driveFileId;
  const contentRef = useRef<HTMLDivElement>(null);

  const iframeHeight =
    typeof window !== "undefined" ? Math.floor(window.innerHeight * 0.85) : 720;

  const mime = mimeType ?? "";
  const kind = mime.startsWith("audio/") ? "audio" : mime.startsWith("video/") ? "video" : "other";

  const openExternal = () => {
    if (!driveFileId) return;
    const url = webViewLink || driveViewUrl(driveFileId);
    window.open(url, "_blank", "noopener");
  };

  const requestFullscreen = () => {
    const el = contentRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen();
    }
  };

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

        <div className="bg-neutral-900 dark:bg-neutral-950 text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0 gap-3">
          <span className="text-sm font-semibold truncate flex-1">{title}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={requestFullscreen}
              aria-label="Tela cheia"
              title="Tela cheia"
              className="w-7 h-7 rounded hover:bg-neutral-800 flex items-center justify-center cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            {driveFileId && (
              <button
                type="button"
                onClick={openExternal}
                aria-label="Abrir no Drive"
                title="Abrir no Drive em nova aba"
                className="w-7 h-7 rounded hover:bg-neutral-800 flex items-center justify-center cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              title="Fechar"
              className="w-7 h-7 rounded hover:bg-neutral-800 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={contentRef}
          className="flex-1 bg-neutral-100 dark:bg-neutral-900 overflow-hidden flex items-center justify-center p-4"
        >
          {driveFileId && kind === "audio" && (
            <div className="w-full max-w-2xl flex flex-col items-center gap-4">
              <div className="text-sm text-neutral-700 dark:text-neutral-300 text-center truncate max-w-full px-4">
                {title}
              </div>
              <audio
                controls
                autoPlay
                preload="metadata"
                src={driveStreamUrl(driveFileId)}
                className="w-full"
              >
                Seu navegador não suporta áudio HTML5.
              </audio>
              <p className="text-xs text-neutral-500 text-center">
                Se o áudio não carregar, use o botão "Abrir no Drive".
              </p>
            </div>
          )}

          {driveFileId && kind === "video" && (
            <video
              controls
              preload="metadata"
              src={driveStreamUrl(driveFileId)}
              className="max-w-full max-h-full rounded-lg bg-black"
            >
              Seu navegador não suporta vídeo HTML5.
            </video>
          )}

          {driveFileId && kind === "other" && (
            <div className="w-full h-full">
              <DrivePreviewIframe driveFileId={driveFileId} height={iframeHeight} title={title} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
