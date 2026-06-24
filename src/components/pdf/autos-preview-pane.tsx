"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Loader2, Maximize2, FileText, ChevronDown, RefreshCw } from "lucide-react";
import {
  DocumentPreviewDialog,
  type PreviewFile,
} from "@/components/agenda/registro-audiencia/shared/document-preview-dialog";
import { EmptyState } from "@/components/agenda/ds";

interface Props {
  /** Lista de PDFs disponíveis (ranqueada: o primeiro é o destaque). */
  files: PreviewFile[];
  /** driveFileId inicialmente selecionado (default: primeiro da lista). */
  initialId?: string | null;
  /** Página inicial para abrir no visualizador (deep-link via #page=N). */
  initialPage?: number;
  label?: string;
  className?: string;
  /** Altura do corpo do visualizador (default h-[60vh]). */
  bodyClassName?: string;
}

/**
 * Visualizador inline de PDF (autos) — Drive /preview no iframe (rápido, progressivo,
 * aguenta autos grandes), com seletor de documento, expandir (DocumentPreviewDialog),
 * baixar (proxy autenticado) e abrir no Drive. Mantém o defensor dentro da plataforma.
 */
export function AutosPreviewPane({
  files,
  initialId,
  initialPage,
  label = "Autos",
  className = "",
  bodyClassName = "h-[60vh]",
}: Props) {
  const usable = useMemo(
    () => files.filter((f) => !!f.driveFileId),
    [files],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialId ?? usable[0]?.driveFileId ?? null,
  );
  const [iframeLoading, setIframeLoading] = useState(true);
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  // "app" = proxy autenticado (renderiza inline sem login no Google); "drive" = Drive /preview (rápido).
  const [viewSource, setViewSource] = useState<"app" | "drive">("app");

  useEffect(() => {
    // Se a lista mudar e o selecionado sumir, volta para o primeiro.
    if (!usable.some((f) => f.driveFileId === selectedId)) {
      setSelectedId(usable[0]?.driveFileId ?? null);
    }
  }, [usable, selectedId]);

  // Reage quando o pai aponta outro documento (ex.: clicar um ato diferente).
  useEffect(() => {
    if (initialId) setSelectedId(initialId);
  }, [initialId]);

  useEffect(() => {
    setIframeLoading(true);
    // rede de segurança: o onLoad do visualizador nativo de PDF nem sempre dispara
    const t = setTimeout(() => setIframeLoading(false), 3500);
    return () => clearTimeout(t);
  }, [selectedId, viewSource, initialPage]);

  const selected = usable.find((f) => f.driveFileId === selectedId) ?? usable[0] ?? null;

  if (!selected) {
    return (
      <div className={`flex items-center justify-center ${bodyClassName} ${className}`}>
        <EmptyState
          icon={FileText}
          title="Nenhum PDF disponível"
          description="Não há autos ou documentos em PDF vinculados a este caso ainda."
          compact
        />
      </div>
    );
  }

  const fileId = selected.driveFileId!;
  const previewUrl =
    viewSource === "app"
      ? `/api/drive/proxy?fileId=${fileId}${initialPage ? `#page=${initialPage}` : ""}`
      : `https://drive.google.com/file/d/${fileId}/preview${initialPage ? `#page=${initialPage}` : ""}`;
  const driveUrl =
    selected.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`;

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/60 rounded-t-xl">
        <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        {usable.length > 1 ? (
          <div className="relative min-w-0 flex-1">
            <select
              value={fileId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full max-w-full appearance-none bg-transparent text-[11px] font-medium text-foreground pr-5 truncate focus:outline-none cursor-pointer"
              title={selected.name ?? undefined}
            >
              {usable.map((f) => (
                <option key={f.driveFileId} value={f.driveFileId!}>
                  {f.name ?? "Documento"}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
          </div>
        ) : (
          <span className="text-[11px] font-medium text-foreground truncate flex-1" title={selected.name ?? undefined}>
            {selected.name ?? label}
          </span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIframeLoading(true);
              setViewSource((s) => (s === "app" ? "drive" : "app"));
            }}
            title={
              viewSource === "app"
                ? "Vendo pelo app (sempre carrega). Trocar para o Drive (rápido)."
                : "Vendo pelo Drive. Trocar para o app (não exige login no Google)."
            }
            aria-label="Alternar fonte do preview"
            className="inline-flex items-center gap-1 h-7 px-1.5 rounded-md hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-[10px] font-medium text-neutral-500 hover:text-foreground cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            {viewSource === "app" ? "App" : "Drive"}
          </button>
          <button
            type="button"
            onClick={() => setFullscreenId(fileId)}
            title="Expandir (tela cheia)"
            aria-label="Expandir"
            className="w-7 h-7 rounded-md hover:bg-neutral-200/70 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-foreground cursor-pointer transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <a
            href={`/api/drive/proxy?fileId=${fileId}&download=1`}
            title="Baixar"
            aria-label="Baixar"
            className="w-7 h-7 rounded-md hover:bg-neutral-200/70 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-foreground cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir no Drive"
            aria-label="Abrir no Drive"
            className="w-7 h-7 rounded-md hover:bg-neutral-200/70 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-foreground cursor-pointer transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Visualizador */}
      <div className={`relative bg-neutral-100 dark:bg-neutral-900 rounded-b-xl overflow-hidden ${bodyClassName}`}>
        {iframeLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        )}
        <iframe
          key={`${fileId}:${initialPage ?? ""}:${viewSource}`}
          src={previewUrl}
          className="w-full h-full border-0"
          title={selected.name ?? "Visualização do PDF"}
          onLoad={() => setIframeLoading(false)}
          allow="autoplay"
        />
      </div>

      {fullscreenId && (
        <DocumentPreviewDialog
          driveFileId={fullscreenId}
          title={selected.name ?? "Documento"}
          mimeType={selected.mimeType}
          webViewLink={selected.webViewLink}
          fileSize={selected.fileSize != null ? String(selected.fileSize) : null}
          enrichmentStatus={selected.enrichmentStatus}
          list={usable}
          onNavigate={(f) => {
            setSelectedId(f.driveFileId);
            setFullscreenId(f.driveFileId);
          }}
          onClose={() => setFullscreenId(null)}
        />
      )}
    </div>
  );
}
