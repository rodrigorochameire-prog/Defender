"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Download, ExternalLink, X, List, FileText, FileScan, Loader2, Highlighter } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { TIPO_LABELS } from "@/components/drive/SectionCard";
import { PdfViewerModal } from "@/components/drive/PdfViewerModal";
import { cn } from "@/lib/utils";

interface Props {
  driveFileId: string;
  processoId: number | null;
  onClose: () => void;
}

type SectionLite = {
  id: number;
  tipo: string;
  titulo: string;
  paginaInicio: number | null;
  paginaFim: number | null;
  textoExtraido: string | null;
  fileDriveId: string | null;
};

/**
 * Visualizador de autos do modal à esquerda. Abas PDF / Texto (OCR), índice de
 * atos (pula para a página no PDF), alternância App (proxy) / Drive (grifos e
 * comentários nativos), baixar e abrir no Drive.
 */
export function AutosModalViewer({ driveFileId, processoId, onClose }: Props) {
  const [view, setView] = useState<"pdf" | "texto">("pdf");
  const [source, setSource] = useState<"app" | "drive">("app");
  const [page, setPage] = useState<number | null>(null);
  const [showIndex, setShowIndex] = useState(false);
  const [grifarOpen, setGrifarOpen] = useState(false);

  // Resolve o id interno + nome do arquivo (necessário para grifos/anotações).
  const fileRef = trpc.drive.resolveByDriveId.useQuery(
    { driveFileId },
    { enabled: !!driveFileId },
  );
  const fileInterno = fileRef.data as { id: number; name: string } | null | undefined;

  const sectionsQ = trpc.drive.sectionsByProcesso.useQuery(
    { processoId: processoId ?? 0 },
    { enabled: !!processoId },
  );

  const sections: SectionLite[] = useMemo(
    () =>
      (((sectionsQ.data as any[]) ?? []) as SectionLite[])
        .filter((s) => s.fileDriveId === driveFileId)
        .sort((a, b) => (a.paginaInicio ?? 0) - (b.paginaInicio ?? 0)),
    [sectionsQ.data, driveFileId],
  );

  const comTexto = useMemo(
    () => sections.filter((s) => (s.textoExtraido ?? "").trim().length > 0),
    [sections],
  );
  const temTexto = comTexto.length > 0;

  const pdfSrc =
    source === "app"
      ? `/api/drive/proxy?fileId=${driveFileId}#${page ? `page=${page}&` : ""}view=FitH`
      : `https://drive.google.com/file/d/${driveFileId}/preview`;

  const irParaAto = (s: SectionLite) => {
    setSource("app"); // o pulo por página só funciona no visualizador do app
    setView("pdf");
    setPage(s.paginaInicio ?? 1);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/70 shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          {sections.length > 0 && (
            <button
              type="button"
              onClick={() => setShowIndex((v) => !v)}
              title="Índice de atos"
              className={cn(
                "inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium cursor-pointer transition-colors",
                showIndex
                  ? "bg-neutral-200/80 dark:bg-neutral-800 text-foreground"
                  : "text-neutral-500 hover:text-foreground hover:bg-neutral-200/70 dark:hover:bg-neutral-800",
              )}
            >
              <List className="w-3 h-3" /> Atos
              <span className="tabular-nums text-neutral-400">{sections.length}</span>
            </button>
          )}
          {/* Segmented PDF / Texto */}
          <div className="flex items-center rounded-md bg-neutral-200/60 dark:bg-neutral-800/60 p-0.5">
            <button
              type="button"
              onClick={() => setView("pdf")}
              className={cn(
                "inline-flex items-center gap-1 h-5 px-2 rounded text-[10px] font-medium cursor-pointer transition-colors",
                view === "pdf" ? "bg-white dark:bg-neutral-700 text-foreground shadow-sm" : "text-neutral-500 hover:text-foreground",
              )}
            >
              <FileText className="w-3 h-3" /> PDF
            </button>
            <button
              type="button"
              onClick={() => setView("texto")}
              title={temTexto ? "Texto extraído (OCR) — pesquisável com Ctrl+F" : "Texto ainda não extraído"}
              className={cn(
                "inline-flex items-center gap-1 h-5 px-2 rounded text-[10px] font-medium cursor-pointer transition-colors",
                view === "texto" ? "bg-white dark:bg-neutral-700 text-foreground shadow-sm" : "text-neutral-500 hover:text-foreground",
              )}
            >
              <FileScan className="w-3 h-3" /> Texto
            </button>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            disabled={!fileInterno}
            onClick={() => fileInterno && setGrifarOpen(true)}
            title="Grifar / anotar (grifos, sublinhado, notas)"
            className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-[10px] font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default"
          >
            <Highlighter className="w-3 h-3" /> Grifar
          </button>
          {view === "pdf" && (
            <button
              type="button"
              onClick={() => setSource((s) => (s === "app" ? "drive" : "app"))}
              title={source === "app"
                ? "Vendo pelo app (rápido). Trocar para o Drive (grifos e comentários)."
                : "Vendo pelo Drive (grifos/comentários). Trocar para o app."}
              className="inline-flex items-center gap-1 h-6 px-2 rounded-md hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-[10px] font-medium text-neutral-500 hover:text-foreground cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" />{source === "app" ? "App" : "Drive"}
            </button>
          )}
          <a
            href={`/api/drive/proxy?fileId=${driveFileId}&download=1`}
            title="Baixar"
            className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-500 hover:text-foreground cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
          <a
            href={`https://drive.google.com/file/d/${driveFileId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir no Drive (grifos, comentários)"
            className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-500 hover:text-foreground cursor-pointer transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            className="inline-flex items-center justify-center w-6 h-6 rounded-md hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-500 hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Corpo: índice (opcional) + visualizador */}
      <div className="flex-1 flex min-h-0">
        {showIndex && sections.length > 0 && (
          <div className="w-[220px] shrink-0 border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto bg-neutral-50/60 dark:bg-neutral-900/40">
            <div className="p-1.5 space-y-0.5">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => irParaAto(s)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-md hover:bg-white dark:hover:bg-neutral-800/60 cursor-pointer transition-colors",
                    page != null && s.paginaInicio === page && "bg-white dark:bg-neutral-800/60 ring-1 ring-emerald-400/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 truncate">
                      {TIPO_LABELS[s.tipo] ?? s.tipo}
                    </span>
                    <span className="text-[9px] text-neutral-400 tabular-nums shrink-0">p.{s.paginaInicio ?? "?"}</span>
                  </div>
                  <p className="text-[10px] text-neutral-600 dark:text-neutral-300 line-clamp-2 mt-0.5">{s.titulo}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0 min-h-0 bg-neutral-100 dark:bg-neutral-900">
          {view === "pdf" ? (
            <iframe
              key={`${driveFileId}:${source}:${page ?? ""}`}
              src={pdfSrc}
              className="w-full h-full border-0"
              title="Autos"
              {...(source === "drive" ? { sandbox: "allow-scripts allow-same-origin allow-popups allow-forms" } : {})}
            />
          ) : (
            <div className="h-full overflow-y-auto px-4 py-3 bg-white dark:bg-neutral-950">
              {sectionsQ.isLoading ? (
                <div className="flex items-center justify-center h-full text-neutral-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : !temTexto ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-neutral-400">
                  <FileScan className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                  <p className="text-xs">Texto ainda não extraído para este documento.</p>
                  <p className="text-[10px]">A extração/OCR roda no enriquecimento; volte em instantes.</p>
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <p className="text-[10px] text-neutral-400 italic">Texto extraído (OCR quando escaneado). Pesquise com Ctrl+F.</p>
                  {comTexto.map((s) => (
                    <div key={s.id} className="space-y-1">
                      <div className="flex items-center gap-2 sticky top-0 bg-white dark:bg-neutral-950 py-1">
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          {TIPO_LABELS[s.tipo] ?? s.tipo}
                        </span>
                        <span className="text-[10px] text-neutral-400">· {s.titulo}</span>
                        <span className="text-[9px] text-neutral-400 tabular-nums ml-auto">p.{s.paginaInicio ?? "?"}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                        {s.textoExtraido}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ferramenta completa de grifos/anotações (mesma usada na sistematização) */}
      {grifarOpen && fileInterno && (
        <PdfViewerModal
          isOpen={grifarOpen}
          onClose={() => setGrifarOpen(false)}
          fileId={fileInterno.id}
          fileName={fileInterno.name}
          pdfUrl={`/api/drive/proxy?fileId=${driveFileId}`}
        />
      )}
    </div>
  );
}
