"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  driveFileId: string | null;
  title?: string;
  mimeType?: string | null;
  webViewLink?: string | null;
  fileSize?: string | null;
  onClose: () => void;
}

function formatBytes(bytes?: number | string | null): string | null {
  if (bytes === null || bytes === undefined || bytes === "") return null;
  const n = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (!Number.isFinite(n) || n <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let val = n;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function getFileTypeLabel(mime: string | null | undefined): string | null {
  if (!mime) return null;
  if (mime.startsWith("audio/")) return "Áudio";
  if (mime.startsWith("video/")) return "Vídeo";
  if (mime.startsWith("image/")) return "Imagem";
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("word") || mime.includes("document")) return "Documento";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "Planilha";
  return mime.split("/").pop()?.toUpperCase() ?? null;
}

export function DocumentPreviewDialog({
  driveFileId,
  title = "Documento",
  mimeType,
  webViewLink,
  fileSize,
  onClose,
}: Props) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const open = !!driveFileId;
  const mime = mimeType ?? "";
  const kind = mime.startsWith("audio/")
    ? "audio"
    : mime.startsWith("video/")
      ? "video"
      : "other";

  // Docs/PDFs: iframe direto do Google Drive (rápido, sem roundtrip no servidor)
  const drivePreviewUrl = driveFileId
    ? `https://drive.google.com/file/d/${driveFileId}/preview`
    : null;
  // Áudio/vídeo: via proxy local para suportar Range streaming + auth
  const streamUrl = driveFileId ? `/api/drive/proxy?fileId=${driveFileId}&stream=1` : null;
  const driveUrl =
    webViewLink ?? (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    setIframeLoading(true);
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const requestFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen();
    }
  };

  if (!open) return null;

  const fileTypeLabel = getFileTypeLabel(mime);
  const sizeLabel = formatBytes(fileSize ?? undefined);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p
              className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[500px]"
              title={title}
            >
              {title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {fileTypeLabel && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                  {fileTypeLabel}
                </span>
              )}
              {sizeLabel && (
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  {sizeLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <button
          type="button"
          onClick={requestFullscreen}
          title="Alternar tela cheia"
          aria-label="Tela cheia"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Tela cheia
        </button>

        {driveUrl && (
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir no Drive
          </a>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 shrink-0 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 min-h-0">
        <div className="w-full h-full rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 relative flex items-center justify-center">
          {kind === "audio" && streamUrl && (
            <div className="w-full max-w-2xl flex flex-col items-center gap-4 p-8">
              <div className="text-sm text-neutral-700 dark:text-neutral-300 text-center break-all max-w-full">
                {title}
              </div>
              <audio
                controls
                autoPlay
                preload="metadata"
                src={streamUrl}
                className="w-full"
              >
                Seu navegador não suporta áudio HTML5.
              </audio>
              <p className="text-[11px] text-neutral-500 text-center">
                Se o áudio não carregar, use "Abrir no Drive" para tocar na interface do Drive.
              </p>
            </div>
          )}

          {kind === "video" && streamUrl && (
            <video
              controls
              preload="metadata"
              src={streamUrl}
              className="max-w-full max-h-full rounded-lg bg-black"
            >
              Seu navegador não suporta vídeo HTML5.
            </video>
          )}

          {kind === "other" && drivePreviewUrl && (
            <>
              {iframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      Carregando preview...
                    </span>
                  </div>
                </div>
              )}
              <iframe
                src={drivePreviewUrl}
                className="w-full h-full border-0"
                title={title}
                loading="eager"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                onLoad={() => setIframeLoading(false)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
