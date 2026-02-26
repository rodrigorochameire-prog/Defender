// @ts-nocheck
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { trpc } from "@/lib/trpc/client";

// ─── Dynamic import of react-pdf (client-only, no SSR) ────────────
// react-pdf accesses DOMMatrix at import time, which doesn't exist in Node.js.
// We must lazy-load both the components and the worker setup.
const ReactPdfDocument = dynamic(
  () => import("react-pdf").then((mod) => {
    // Setup worker once when module loads
    mod.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
    return { default: mod.Document };
  }),
  { ssr: false }
);
const ReactPdfPage = dynamic(
  () => import("react-pdf").then((mod) => ({ default: mod.Page })),
  { ssr: false }
);
import { cn } from "@/lib/utils";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  BookOpen,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Gavel,
  Scale,
  Users,
  ScrollText,
  FileCheck,
  Microscope,
  Shield,
  BookMarked,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";

// ─── Section Type Config ───────────────────────────────────────────

const SECTION_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  denuncia: {
    label: "Denúncia",
    color: "#ef4444",
    bgColor: "bg-red-500/10 text-red-500 border-red-500/20",
    icon: Gavel,
  },
  sentenca: {
    label: "Sentença",
    color: "#8b5cf6",
    bgColor: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    icon: Scale,
  },
  decisao: {
    label: "Decisão",
    color: "#f59e0b",
    bgColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: ScrollText,
  },
  depoimento: {
    label: "Depoimento",
    color: "#3b82f6",
    bgColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: Users,
  },
  alegacoes: {
    label: "Alegações",
    color: "#06b6d4",
    bgColor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    icon: BookMarked,
  },
  certidao: {
    label: "Certidão",
    color: "#22c55e",
    bgColor: "bg-green-500/10 text-green-500 border-green-500/20",
    icon: FileCheck,
  },
  laudo: {
    label: "Laudo",
    color: "#ec4899",
    bgColor: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    icon: Microscope,
  },
  inquerito: {
    label: "Inquérito",
    color: "#f97316",
    bgColor: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    icon: Shield,
  },
  recurso: {
    label: "Recurso",
    color: "#14b8a6",
    bgColor: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    icon: BookOpen,
  },
  outros: {
    label: "Outros",
    color: "#71717a",
    bgColor: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
    icon: HelpCircle,
  },
};

function getSectionConfig(tipo: string) {
  return SECTION_TYPE_CONFIG[tipo] || SECTION_TYPE_CONFIG.outros;
}

// ─── Types ─────────────────────────────────────────────────────────

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: number; // DB id from drive_files
  fileName: string;
  pdfUrl: string; // Google Drive webContentLink or preview URL
}

interface DocumentSection {
  id: number;
  tipo: string;
  titulo: string;
  paginaInicio: number;
  paginaFim: number;
  resumo: string | null;
  confianca: number | null;
  metadata: {
    partesmencionadas?: string[];
    datasExtraidas?: string[];
    artigosLei?: string[];
    juiz?: string;
    promotor?: string;
  } | null;
}

// ─── Section Index Panel ───────────────────────────────────────────

function SectionIndexPanel({
  sections,
  currentPage,
  onNavigate,
  isLoading,
  searchQuery,
  onSearchChange,
  selectedSectionId,
  onSelectSection,
}: {
  sections: DocumentSection[];
  currentPage: number;
  onNavigate: (page: number) => void;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSectionId: number | null;
  onSelectSection: (section: DocumentSection) => void;
}) {
  // Group sections by tipo
  const grouped = useMemo(() => {
    const map = new Map<string, DocumentSection[]>();
    for (const s of sections) {
      const existing = map.get(s.tipo) || [];
      existing.push(s);
      map.set(s.tipo, existing);
    }
    return map;
  }, [sections]);

  // Filter by search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) =>
        s.titulo.toLowerCase().includes(q) ||
        s.resumo?.toLowerCase().includes(q) ||
        getSectionConfig(s.tipo).label.toLowerCase().includes(q)
    );
  }, [sections, searchQuery]);

  // Determine which section the current page falls into
  const activeSectionId = useMemo(() => {
    for (let i = sections.length - 1; i >= 0; i--) {
      if (currentPage >= sections[i].paginaInicio) return sections[i].id;
    }
    return null;
  }, [sections, currentPage]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs">Carregando índice...</span>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
        <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Nenhuma peça processual identificada
        </p>
        <p className="text-[10px] text-zinc-300 dark:text-zinc-600">
          O pipeline de IA ainda não processou este PDF
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar peça..."
            className="h-7 pl-7 text-xs bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-1 flex-wrap">
        {Array.from(grouped.entries()).map(([tipo, items]) => {
          const config = getSectionConfig(tipo);
          return (
            <Badge
              key={tipo}
              variant="outline"
              className={cn("text-[9px] px-1.5 py-0 h-4 font-medium", config.bgColor)}
            >
              {items.length} {config.label}
            </Badge>
          );
        })}
      </div>

      {/* Sections list */}
      <div className="flex-1 overflow-y-auto">
        {filteredSections.map((section) => {
          const config = getSectionConfig(section.tipo);
          const Icon = config.icon;
          const isActive = activeSectionId === section.id;
          const isSelected = selectedSectionId === section.id;

          return (
            <button
              key={section.id}
              onClick={() => {
                onNavigate(section.paginaInicio);
                onSelectSection(section);
              }}
              className={cn(
                "w-full text-left px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 transition-colors group",
                isActive
                  ? "bg-zinc-100 dark:bg-zinc-800/80"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
                isSelected && "ring-1 ring-inset ring-emerald-500/30"
              )}
            >
              <div className="flex items-start gap-2">
                {/* Type icon with color */}
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${config.color}15` }}
                >
                  <Icon className="w-3 h-3" style={{ color: config.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate leading-tight">
                    {section.titulo}
                  </p>

                  {/* Page range + confidence */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] text-zinc-400 font-mono">
                      pg {section.paginaInicio}
                      {section.paginaFim !== section.paginaInicio &&
                        `–${section.paginaFim}`}
                    </span>
                    {section.confianca != null && section.confianca > 0 && (
                      <span
                        className={cn(
                          "text-[9px] font-mono",
                          section.confianca >= 80
                            ? "text-emerald-500"
                            : section.confianca >= 50
                              ? "text-amber-500"
                              : "text-zinc-400"
                        )}
                      >
                        {section.confianca}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section Detail Footer ─────────────────────────────────────────

function SectionDetailFooter({
  section,
  onClose,
}: {
  section: DocumentSection | null;
  onClose: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!section) return null;

  const config = getSectionConfig(section.tipo);
  const Icon = config.icon;
  const meta = section.metadata;

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex-1 text-left">
          Resumo IA
        </span>
        <Badge
          variant="outline"
          className={cn("text-[9px] px-1.5 py-0 h-4", config.bgColor)}
        >
          <Icon className="w-2.5 h-2.5 mr-0.5" />
          {config.label}
        </Badge>
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-zinc-400" />
        ) : (
          <ChevronUp className="w-3 h-3 text-zinc-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* Title + page range */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {section.titulo}
            </p>
            <span className="text-[10px] text-zinc-400 font-mono">
              pg {section.paginaInicio}–{section.paginaFim}
            </span>
          </div>

          {/* Summary */}
          {section.resumo && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {section.resumo}
            </p>
          )}

          {/* Metadata chips */}
          {meta && (
            <div className="flex flex-wrap gap-1">
              {meta.artigosLei?.map((art) => (
                <Badge
                  key={art}
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20"
                >
                  {art}
                </Badge>
              ))}
              {meta.juiz && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 bg-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20"
                >
                  Juiz: {meta.juiz}
                </Badge>
              )}
              {meta.promotor && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20"
                >
                  MP: {meta.promotor}
                </Badge>
              )}
              {meta.partesmencionadas?.slice(0, 3).map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20"
                >
                  {p}
                </Badge>
              ))}
              {meta.datasExtraidas?.slice(0, 2).map((d) => (
                <Badge
                  key={d}
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 bg-zinc-500/5 text-zinc-500 border-zinc-500/20"
                >
                  {d}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main PdfViewerModal ───────────────────────────────────────────

export function PdfViewerModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  pdfUrl,
}: PdfViewerModalProps) {
  // State
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [showIndex, setShowIndex] = useState(true);
  const [indexSearch, setIndexSearch] = useState("");
  const [selectedSection, setSelectedSection] = useState<ReactPdfDocumentSection | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Load sections from DB
  const { data: sections, isLoading: sectionsLoading } =
    trpc.documentSections.listByFile.useQuery(
      { driveFileId: fileId },
      { enabled: isOpen && fileId > 0 }
    );

  // PDF load handlers
  const onDocumentLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      setPdfError(null);
    },
    []
  );

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error("[PdfViewer] Load error:", error);
    setPdfError("Não foi possível carregar o PDF. Tente abrir no Google Drive.");
  }, []);

  // Navigation
  const goToPage = useCallback(
    (page: number) => {
      const target = Math.max(1, Math.min(page, numPages));
      setCurrentPage(target);
      // Scroll the page container to top when navigating
      pageContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [numPages]
  );

  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);
  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);

  // Zoom
  const zoomIn = useCallback(() => setScale((s) => Math.min(s + 0.25, 3.0)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(s - 0.25, 0.5)), []);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prevPage();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextPage();
      } else if (e.key === "+" || (e.key === "=" && e.metaKey)) {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" && e.metaKey) {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "i" && !e.metaKey && !e.ctrlKey) {
        // Only toggle index if not typing in an input
        if (document.activeElement?.tagName !== "INPUT") {
          setShowIndex((v) => !v);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, prevPage, nextPage, zoomIn, zoomOut]);

  // Section markers for current page
  const currentPageSections = useMemo(() => {
    if (!sections) return [];
    return sections.filter(
      (s) => currentPage >= s.paginaInicio && currentPage <= s.paginaFim
    );
  }, [sections, currentPage]);

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
        <div
          ref={containerRef}
          className="w-full h-full bg-white dark:bg-zinc-900 flex flex-col"
        >
          {/* ── Top Bar ── */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 flex-shrink-0">
            {/* Left: Toggle index + file name */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowIndex(!showIndex)}
                >
                  <BookOpen
                    className={cn(
                      "h-4 w-4",
                      showIndex
                        ? "text-emerald-500"
                        : "text-zinc-400 dark:text-zinc-500"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {showIndex ? "Ocultar índice (I)" : "Mostrar índice (I)"}
                </p>
              </TooltipContent>
            </Tooltip>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                {fileName}
              </p>
            </div>

            {/* Center: Page navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={prevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={numPages}
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                  className="w-12 h-7 text-xs text-center bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-zinc-400">/ {numPages}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={nextPage}
                disabled={currentPage >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Right: Zoom + Fullscreen + Close */}
            <div className="flex items-center gap-0.5">
              {/* Current page section badges */}
              {currentPageSections.length > 0 && (
                <div className="hidden md:flex items-center gap-1 mr-2">
                  {currentPageSections.map((s) => {
                    const config = getSectionConfig(s.tipo);
                    const Icon = config.icon;
                    return (
                      <Tooltip key={s.id}>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1.5 py-0 h-4 cursor-pointer",
                              config.bgColor
                            )}
                            onClick={() => setSelectedSection(s)}
                          >
                            <Icon className="w-2.5 h-2.5 mr-0.5" />
                            {config.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs max-w-[200px]">{s.titulo}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              )}

              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4 text-zinc-500" />
              </Button>
              <span className="text-[10px] text-zinc-400 w-8 text-center font-mono">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4 text-zinc-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4 text-zinc-500" />
                ) : (
                  <Maximize2 className="h-4 w-4 text-zinc-500" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
              >
                <X className="h-4 w-4 text-zinc-500" />
              </Button>
            </div>
          </div>

          {/* ── Main Content ── */}
          <div className="flex-1 flex overflow-hidden">
            {/* Section Index Panel (left) */}
            {showIndex && (
              <div className="w-64 border-r border-zinc-200 dark:border-zinc-700 flex-shrink-0 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
                <SectionIndexPanel
                  sections={(sections as DocumentSection[]) || []}
                  currentPage={currentPage}
                  onNavigate={goToPage}
                  isLoading={sectionsLoading}
                  searchQuery={indexSearch}
                  onSearchChange={setIndexSearch}
                  selectedSectionId={selectedSection?.id ?? null}
                  onSelectSection={setSelectedSection}
                />
              </div>
            )}

            {/* PDF Viewer (center) */}
            <div
              ref={pageContainerRef}
              className="flex-1 overflow-auto bg-zinc-100 dark:bg-zinc-950 flex justify-center"
            >
              {pdfError ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                  <AlertCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {pdfError}
                  </p>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-500 hover:text-emerald-400 underline"
                  >
                    Abrir no Google Drive
                  </a>
                </div>
              ) : (
                <div className="p-4">
                  <ReactPdfDocument
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex items-center justify-center h-96 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                        <span className="text-sm text-zinc-400">
                          Carregando PDF...
                        </span>
                      </div>
                    }
                  >
                    <ReactPdfPage
                      pageNumber={currentPage}
                      scale={scale}
                      className="shadow-lg"
                      loading={
                        <div className="flex items-center justify-center h-96">
                          <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
                        </div>
                      }
                    />
                  </ReactPdfDocument>
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom: Section Detail Footer ── */}
          <SectionDetailFooter
            section={selectedSection}
            onClose={() => setSelectedSection(null)}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Export section config for reuse ───────────────────────────────

export { SECTION_TYPE_CONFIG, getSectionConfig };
export type { DocumentSection };
