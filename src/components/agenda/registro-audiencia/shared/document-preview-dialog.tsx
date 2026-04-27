"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Columns,
  Download,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  Maximize2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface PreviewFile {
  driveFileId: string;
  name?: string | null;
  mimeType?: string | null;
  webViewLink?: string | null;
  fileSize?: number | string | null;
  enrichmentStatus?: string | null;
}

interface Props {
  driveFileId: string | null;
  title?: string;
  mimeType?: string | null;
  webViewLink?: string | null;
  fileSize?: string | null;
  enrichmentStatus?: string | null;
  transcricao?: string | null;
  list?: PreviewFile[];
  onNavigate?: (file: PreviewFile) => void;
  onCompare?: () => void;
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
  enrichmentStatus,
  transcricao,
  list,
  onNavigate,
  onCompare,
  onClose,
}: Props) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const open = !!driveFileId;
  const mime = mimeType ?? "";
  const kind = mime.startsWith("audio/")
    ? "audio"
    : mime.startsWith("video/")
      ? "video"
      : "other";

  const currentIndex = useMemo(() => {
    if (!list || !driveFileId) return -1;
    return list.findIndex((f) => f.driveFileId === driveFileId);
  }, [list, driveFileId]);
  const hasNav = !!(list && list.length > 1 && currentIndex >= 0 && onNavigate);
  const canPrev = hasNav && currentIndex > 0;
  const canNext = hasNav && currentIndex < (list?.length ?? 0) - 1;

  const drivePreviewUrl = driveFileId
    ? `https://drive.google.com/file/d/${driveFileId}/preview`
    : null;
  const streamUrl = driveFileId ? `/api/drive/proxy?fileId=${driveFileId}&stream=1` : null;
  const driveUrl =
    webViewLink ?? (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : null);

  const goPrev = useCallback(() => {
    if (!canPrev || !list || !onNavigate) return;
    onNavigate(list[currentIndex - 1]);
  }, [canPrev, list, currentIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (!canNext || !list || !onNavigate) return;
    onNavigate(list[currentIndex + 1]);
  }, [canNext, list, currentIndex, onNavigate]);

  const requestFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen();
    }
  }, []);

  const downloadFile = useCallback(() => {
    if (!driveFileId) return;
    const url = `/api/drive/proxy?fileId=${driveFileId}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = title || "documento";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [driveFileId, title]);

  const copyLink = useCallback(async () => {
    if (!driveUrl) return;
    try {
      await navigator.clipboard.writeText(driveUrl);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }, [driveUrl]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignora se o foco está num input/textarea/editable
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        requestFullscreen();
        return;
      }
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        downloadFile();
      }
    },
    [onClose, goPrev, goNext, requestFullscreen, downloadFile],
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
              {enrichmentStatus === "completed" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  Extraído
                </span>
              )}
              {enrichmentStatus === "processing" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Processando IA
                </span>
              )}
              {hasNav && (
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                  {currentIndex + 1} / {list?.length}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {hasNav && (
          <div className="flex items-center gap-0.5 mr-1">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canPrev}
              title="Anterior (←)"
              aria-label="Anterior"
              className="w-8 h-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              title="Próximo (→)"
              aria-label="Próximo"
              className="w-8 h-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {onCompare && kind === "other" && (
          <button
            type="button"
            onClick={onCompare}
            title="Comparar com outro documento"
            aria-label="Comparar"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <Columns className="w-3.5 h-3.5" />
            Comparar
          </button>
        )}

        {driveFileId && (
          <button
            type="button"
            onClick={downloadFile}
            title="Baixar arquivo (D)"
            aria-label="Download"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        )}

        {driveUrl && (
          <button
            type="button"
            onClick={copyLink}
            title="Copiar link do Drive"
            aria-label="Copiar link"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <LinkIcon className="w-3.5 h-3.5" />}
            {copied ? "Copiado" : "Copiar link"}
          </button>
        )}

        <button
          type="button"
          onClick={requestFullscreen}
          title="Tela cheia (F)"
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
          title="Fechar (Esc)"
          className="h-8 w-8 text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 shrink-0 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 min-h-0">
        <div className="w-full h-full rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 relative flex items-center justify-center">
          {kind === "audio" && streamUrl && (
            <div className="w-full max-w-3xl flex flex-col items-center gap-4 p-6 max-h-full overflow-y-auto">
              <div className="text-sm text-neutral-700 dark:text-neutral-300 text-center break-all max-w-full">
                {title}
              </div>
              <audio
                key={streamUrl}
                controls
                autoPlay
                preload="metadata"
                src={streamUrl}
                className="w-full"
              >
                Seu navegador não suporta áudio HTML5.
              </audio>
              {transcricao ? (
                <div className="w-full mt-2 rounded-lg bg-white dark:bg-neutral-950 ring-1 ring-neutral-200 dark:ring-neutral-800 p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Transcrição / Resumo
                    </span>
                  </div>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {transcricao}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 text-center">
                  Se o áudio não carregar, use &ldquo;Abrir no Drive&rdquo; para tocar na interface do Drive.
                </p>
              )}
            </div>
          )}

          {kind === "video" && streamUrl && (
            <video
              key={streamUrl}
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
                key={drivePreviewUrl}
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

        {/* Thumbnail strip para galeria de imagens */}
        {mime.startsWith("image/") && list && list.length > 1 && onNavigate && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 px-1">
            {list
              .filter((f) => (f.mimeType ?? "").startsWith("image/"))
              .map((f) => {
                const isActive = f.driveFileId === driveFileId;
                const thumbUrl = `https://drive.google.com/thumbnail?id=${f.driveFileId}&sz=w160`;
                return (
                  <button
                    key={f.driveFileId}
                    type="button"
                    onClick={() => onNavigate(f)}
                    title={f.name ?? ""}
                    className={`relative flex-shrink-0 w-20 h-16 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                      isActive
                        ? "border-emerald-500 ring-2 ring-emerald-500/30"
                        : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400"
                    }`}
                  >
                    <img
                      src={thumbUrl}
                      alt={f.name ?? ""}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
