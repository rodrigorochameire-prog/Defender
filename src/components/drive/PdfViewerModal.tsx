// @ts-nocheck
"use client";

import { useState, useCallback, useRef, useEffect, useMemo, memo } from "react";
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
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
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
  ShieldCheck,
  Unlock,
  ClipboardList,
  MessageSquare,
  FileSearch,
  CalendarDays,
  MapPin,
  FileDown,
  ExternalLink,
  Link2,
  Check,
  SkipBack,
  SkipForward,
  FolderOpen,
  Highlighter,
  StickyNote,
  Trash2,
  Underline,
  Bookmark,
  Settings2,
  Pencil,
  Wand2,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeftRight,
  Zap,
  Brain,
  UserCircle,
  Eye,
  EyeOff,
  Siren,
  FileWarning,
  Fingerprint,
  Ban,
  UserCheck,
  Crosshair,
  ScanFace,
} from "lucide-react";
import { toast } from "sonner";
import { useProcessingQueue } from "@/contexts/processing-queue";
import { showProgressToast, updateProgressToast, completeProgressToast, failProgressToast } from "@/components/ui/progress-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { FileLinkDialog } from "./FileLinkDialog";
import { ImageCaptureDialog } from "./ImageCaptureDialog";

// ─── Section Type Config ───────────────────────────────────────────

const SECTION_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType; relevancia: string }
> = {
  // === CRITICO — vermelho/laranja escuro ===
  denuncia: {
    label: "Denúncia",
    color: "#ef4444",
    bgColor: "bg-red-500/10 text-red-500 border-red-500/20",
    icon: Gavel,
    relevancia: "critico",
  },
  sentenca: {
    label: "Sentença",
    color: "#8b5cf6",
    bgColor: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    icon: Scale,
    relevancia: "critico",
  },
  depoimento_vitima: {
    label: "Depoimento (Vítima)",
    color: "#dc2626",
    bgColor: "bg-red-600/10 text-red-600 border-red-600/20",
    icon: UserCircle,
    relevancia: "critico",
  },
  depoimento_testemunha: {
    label: "Depoimento (Testemunha)",
    color: "#2563eb",
    bgColor: "bg-blue-600/10 text-blue-600 border-blue-600/20",
    icon: Users,
    relevancia: "critico",
  },
  depoimento_investigado: {
    label: "Depoimento (Investigado)",
    color: "#d97706",
    bgColor: "bg-amber-600/10 text-amber-600 border-amber-600/20",
    icon: UserCheck,
    relevancia: "critico",
  },

  // === ALTO — amarelo/laranja ===
  decisao: {
    label: "Decisão",
    color: "#f59e0b",
    bgColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: ScrollText,
    relevancia: "alto",
  },
  pronuncia: {
    label: "Pronúncia",
    color: "#d97706",
    bgColor: "bg-amber-600/10 text-amber-600 border-amber-600/20",
    icon: Gavel,
    relevancia: "alto",
  },
  laudo_pericial: {
    label: "Laudo Pericial",
    color: "#ec4899",
    bgColor: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    icon: Microscope,
    relevancia: "alto",
  },
  laudo_necroscopico: {
    label: "Laudo Necroscópico",
    color: "#db2777",
    bgColor: "bg-pink-600/10 text-pink-600 border-pink-600/20",
    icon: Microscope,
    relevancia: "alto",
  },
  laudo_local: {
    label: "Laudo de Local",
    color: "#c026d3",
    bgColor: "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20",
    icon: MapPin,
    relevancia: "alto",
  },
  ata_audiencia: {
    label: "Ata de Audiência",
    color: "#4f46e5",
    bgColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    icon: CalendarDays,
    relevancia: "alto",
  },
  interrogatorio: {
    label: "Interrogatório",
    color: "#2563eb",
    bgColor: "bg-blue-600/10 text-blue-600 border-blue-600/20",
    icon: MessageSquare,
    relevancia: "alto",
  },
  alegacoes_mp: {
    label: "Alegações (MP)",
    color: "#e11d48",
    bgColor: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    icon: BookMarked,
    relevancia: "alto",
  },
  alegacoes_defesa: {
    label: "Alegações (Defesa)",
    color: "#059669",
    bgColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: BookMarked,
    relevancia: "alto",
  },
  resposta_acusacao: {
    label: "Resposta à Acusação",
    color: "#0d9488",
    bgColor: "bg-teal-600/10 text-teal-600 border-teal-600/20",
    icon: ShieldCheck,
    relevancia: "alto",
  },
  recurso: {
    label: "Recurso",
    color: "#14b8a6",
    bgColor: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    icon: BookOpen,
    relevancia: "alto",
  },
  habeas_corpus: {
    label: "Habeas Corpus",
    color: "#dc2626",
    bgColor: "bg-red-600/10 text-red-600 border-red-600/20",
    icon: Unlock,
    relevancia: "alto",
  },

  // === MEDIO — azul/verde ===
  boletim_ocorrencia: {
    label: "Boletim de Ocorrência",
    color: "#f97316",
    bgColor: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    icon: Siren,
    relevancia: "medio",
  },
  portaria_ip: {
    label: "Portaria do IP",
    color: "#475569",
    bgColor: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    icon: FileSearch,
    relevancia: "medio",
  },
  relatorio_policial: {
    label: "Relatório Policial",
    color: "#6366f1",
    bgColor: "bg-indigo-600/10 text-indigo-600 border-indigo-600/20",
    icon: Shield,
    relevancia: "medio",
  },
  auto_prisao: {
    label: "Auto de Prisão",
    color: "#b91c1c",
    bgColor: "bg-red-700/10 text-red-700 border-red-700/20",
    icon: Crosshair,
    relevancia: "medio",
  },
  certidao_relevante: {
    label: "Certidão",
    color: "#22c55e",
    bgColor: "bg-green-500/10 text-green-500 border-green-500/20",
    icon: FileCheck,
    relevancia: "medio",
  },
  diligencias_422: {
    label: "Diligências 422",
    color: "#ea580c",
    bgColor: "bg-orange-600/10 text-orange-600 border-orange-600/20",
    icon: ClipboardList,
    relevancia: "medio",
  },
  alegacoes: {
    label: "Alegações",
    color: "#06b6d4",
    bgColor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    icon: BookMarked,
    relevancia: "medio",
  },

  // === BAIXO — cinza ===
  documento_identidade: {
    label: "Documento/Identidade",
    color: "#a1a1aa",
    bgColor: "bg-neutral-400/10 text-neutral-400 border-neutral-400/20",
    icon: Fingerprint,
    relevancia: "baixo",
  },
  outros: {
    label: "Outros",
    color: "#71717a",
    bgColor: "bg-neutral-500/10 text-neutral-500 border-neutral-500/20",
    icon: HelpCircle,
    relevancia: "baixo",
  },

  // === OCULTO — burocracia ===
  burocracia: {
    label: "Burocracia",
    color: "#d4d4d8",
    bgColor: "bg-neutral-300/10 text-neutral-400 border-neutral-300/20",
    icon: Ban,
    relevancia: "oculto",
  },

  // === LEGADOS (backward compatibility) ===
  depoimento: {
    label: "Depoimento",
    color: "#3b82f6",
    bgColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: Users,
    relevancia: "critico",
  },
  laudo: {
    label: "Laudo",
    color: "#ec4899",
    bgColor: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    icon: Microscope,
    relevancia: "alto",
  },
  inquerito: {
    label: "Inquérito",
    color: "#f97316",
    bgColor: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    icon: Shield,
    relevancia: "medio",
  },
  termo_inquerito: {
    label: "Termo do Inquérito",
    color: "#475569",
    bgColor: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    icon: FileSearch,
    relevancia: "medio",
  },
  certidao: {
    label: "Certidão",
    color: "#22c55e",
    bgColor: "bg-green-500/10 text-green-500 border-green-500/20",
    icon: FileCheck,
    relevancia: "medio",
  },
};

function getSectionConfig(tipo: string) {
  return SECTION_TYPE_CONFIG[tipo] || SECTION_TYPE_CONFIG.outros;
}

// ─── Annotation Color System ────────────────────────────────────────

const ANNOTATION_COLORS = [
  { color: "yellow", label: "Fatos", hex: "#eab308", hexLight: "#fef9c3", hexMid: "#fde047" },
  { color: "red", label: "Contradições", hex: "#ef4444", hexLight: "#fee2e2", hexMid: "#fca5a5" },
  { color: "green", label: "Teses", hex: "#22c55e", hexLight: "#dcfce7", hexMid: "#86efac" },
  { color: "blue", label: "Referências", hex: "#3b82f6", hexLight: "#dbeafe", hexMid: "#93c5fd" },
  { color: "purple", label: "Outros", hex: "#a855f7", hexLight: "#f3e8ff", hexMid: "#d8b4fe" },
  { color: "pink", label: "Provas", hex: "#ec4899", hexLight: "#fce7f3", hexMid: "#f9a8d4" },
  { color: "teal", label: "Jurisprudência", hex: "#14b8a6", hexLight: "#ccfbf1", hexMid: "#5eead4" },
  { color: "indigo", label: "Procedimento", hex: "#6366f1", hexLight: "#e0e7ff", hexMid: "#a5b4fc" },
  { color: "orange", label: "Alertas", hex: "#f97316", hexLight: "#ffedd5", hexMid: "#fdba74" },
  { color: "cyan", label: "Contexto", hex: "#06b6d4", hexLight: "#cffafe", hexMid: "#67e8f9" },
] as const;

type AnnotationColorName = (typeof ANNOTATION_COLORS)[number]["color"];

const DEFAULT_COLOR_LABELS: Record<string, string> = Object.fromEntries(
  ANNOTATION_COLORS.map((c) => [c.color, c.label])
);

function getAnnotationColor(colorName: string, customLabels?: Record<string, string>) {
  const base = ANNOTATION_COLORS.find((c) => c.color === colorName) || ANNOTATION_COLORS[0];
  if (customLabels && customLabels[base.color]) {
    return { ...base, label: customLabels[base.color] };
  }
  return base;
}

function getAnnotationColorsWithLabels(customLabels?: Record<string, string>) {
  if (!customLabels) return ANNOTATION_COLORS;
  return ANNOTATION_COLORS.map((c) => ({
    ...c,
    label: customLabels[c.color] || c.label,
  }));
}

// ─── Highlight Rect Helpers ──────────────────────────────────────────

type Rect = { x: number; y: number; width: number; height: number };

/** Merge adjacent rects on the same line (within yTolerance of page height) */
function mergeAdjacentRects(rects: Rect[], yTolerance = 0.008): Rect[] {
  if (rects.length === 0) return [];
  // Sort by y then x
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: Rect[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    // Same line: y values within tolerance
    if (Math.abs(current.y - last.y) < yTolerance) {
      // Extend the last rect to cover both
      const newX = Math.min(last.x, current.x);
      const newRight = Math.max(last.x + last.width, current.x + current.width);
      const newY = Math.min(last.y, current.y);
      const newBottom = Math.max(last.y + last.height, current.y + current.height);
      merged[merged.length - 1] = {
        x: newX,
        y: newY,
        width: newRight - newX,
        height: newBottom - newY,
      };
    } else {
      merged.push(current);
    }
  }
  return merged;
}

/** Normalize posicao to array of rects (backward-compatible) */
function normalizeAnnotationRects(posicao: any): Rect[] {
  if (!posicao) return [];
  if (posicao.rects && Array.isArray(posicao.rects)) return posicao.rects;
  if (typeof posicao.x === "number") return [posicao];
  return [];
}

// ─── PDF Text Layer Styles ──────────────────────────────────────────

const PDF_TEXT_LAYER_STYLES = `
  .react-pdf__Page__textContent.textLayer span {
    color: transparent !important;
  }
  .react-pdf__Page__textContent.textLayer span::selection {
    background: rgba(52, 211, 153, 0.35);
    color: transparent !important;
  }
  .react-pdf__Page__textContent.textLayer span::-moz-selection {
    background: rgba(52, 211, 153, 0.35);
    color: transparent !important;
  }
  .pdf-highlight-mode .react-pdf__Page__textContent.textLayer span::selection {
    background: rgba(252, 211, 77, 0.45);
  }
  .pdf-highlight-mode .react-pdf__Page__textContent.textLayer span::-moz-selection {
    background: rgba(252, 211, 77, 0.45);
  }
  .pdf-underline-mode .react-pdf__Page__textContent.textLayer span::selection {
    background: rgba(52, 211, 153, 0.35);
  }
  .pdf-underline-mode .react-pdf__Page__textContent.textLayer span::-moz-selection {
    background: rgba(52, 211, 153, 0.35);
  }
`;

// ─── Types ─────────────────────────────────────────────────────────

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: number; // DB id from drive_files
  fileName: string;
  pdfUrl: string; // Google Drive webContentLink or preview URL
  siblingFiles?: { id: number; name: string; pdfUrl: string }[];
  onFileChange?: (fileId: number) => void;
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

// ─── Section Group Definitions (mirror pdf-classifier.ts) ──────────

const SECTION_GROUP_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; tipos: readonly string[] }
> = {
  depoimentos: { label: "Depoimentos e Interrogatórios", icon: Users, color: "#3b82f6", tipos: ["depoimento_vitima", "depoimento_testemunha", "depoimento_investigado", "interrogatorio"] },
  laudos: { label: "Laudos e Perícias", icon: Microscope, color: "#ec4899", tipos: ["laudo_pericial", "laudo_necroscopico", "laudo_local"] },
  decisoes: { label: "Decisões Judiciais", icon: Gavel, color: "#8b5cf6", tipos: ["decisao", "sentenca", "pronuncia"] },
  defesa: { label: "Manifestações da Defesa", icon: ShieldCheck, color: "#10b981", tipos: ["alegacoes_defesa", "resposta_acusacao", "recurso", "habeas_corpus"] },
  mp: { label: "Manifestações do MP", icon: BookMarked, color: "#ef4444", tipos: ["denuncia", "alegacoes_mp", "alegacoes"] },
  investigacao: { label: "Investigação Policial", icon: Shield, color: "#f97316", tipos: ["relatorio_policial", "portaria_ip", "auto_prisao", "boletim_ocorrencia", "diligencias_422"] },
  audiencias: { label: "Audiências", icon: CalendarDays, color: "#4f46e5", tipos: ["ata_audiencia"] },
  documentos: { label: "Documentos e Certidões", icon: FileCheck, color: "#22c55e", tipos: ["certidao_relevante", "documento_identidade"] },
  outros: { label: "Outros", icon: HelpCircle, color: "#71717a", tipos: ["outros"] },
  burocracia: { label: "Burocracia", icon: Ban, color: "#d4d4d8", tipos: ["burocracia"] },
};

// Group order for display
const SECTION_GROUP_ORDER = [
  "depoimentos", "laudos", "decisoes", "defesa", "mp",
  "investigacao", "audiencias", "documentos", "outros", "burocracia",
];

function getGroupForTipo(tipo: string): string {
  for (const [groupKey, group] of Object.entries(SECTION_GROUP_CONFIG)) {
    if (group.tipos.includes(tipo)) return groupKey;
  }
  return "outros";
}

function SectionIndexPanel({
  sections,
  currentPage,
  onNavigate,
  isLoading,
  searchQuery,
  onSearchChange,
  selectedSectionId,
  onSelectSection,
  onExtract,
  extractingId,
  hideBurocracia,
  onToggleHideBurocracia,
  batchSelectMode,
  onToggleBatchSelect,
  selectedSectionIds,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onBatchExport,
  isBatchExporting,
}: {
  sections: DocumentSection[];
  currentPage: number;
  onNavigate: (page: number) => void;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSectionId: number | null;
  onSelectSection: (section: DocumentSection) => void;
  onExtract?: (sectionId: number) => void;
  extractingId?: number | null;
  hideBurocracia?: boolean;
  onToggleHideBurocracia?: () => void;
  batchSelectMode?: boolean;
  onToggleBatchSelect?: () => void;
  selectedSectionIds?: Set<number>;
  onToggleSelection?: (sectionId: number) => void;
  onSelectAll?: (sectionIds: number[]) => void;
  onClearSelection?: () => void;
  onBatchExport?: () => void;
  isBatchExporting?: boolean;
}) {
  // Count burocracia sections
  const burocraciaCount = useMemo(
    () => sections.filter((s) => getSectionConfig(s.tipo).relevancia === "oculto").length,
    [sections]
  );

  // Filter out burocracia if hidden
  const visibleSections = useMemo(() => {
    if (!hideBurocracia) return sections;
    return sections.filter((s) => getSectionConfig(s.tipo).relevancia !== "oculto");
  }, [sections, hideBurocracia]);

  // Filter by search (from visible)
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return visibleSections;
    const q = searchQuery.toLowerCase();
    return visibleSections.filter(
      (s) =>
        s.titulo.toLowerCase().includes(q) ||
        s.resumo?.toLowerCase().includes(q) ||
        getSectionConfig(s.tipo).label.toLowerCase().includes(q)
    );
  }, [visibleSections, searchQuery]);

  // Group sections by semantic group
  const groupedByGroup = useMemo(() => {
    const map = new Map<string, DocumentSection[]>();
    for (const s of filteredSections) {
      const groupKey = getGroupForTipo(s.tipo);
      const existing = map.get(groupKey) || [];
      existing.push(s);
      map.set(groupKey, existing);
    }
    return map;
  }, [filteredSections]);

  // Determine which section the current page falls into
  const activeSectionId = useMemo(() => {
    for (let i = sections.length - 1; i >= 0; i--) {
      if (currentPage >= sections[i].paginaInicio) return sections[i].id;
    }
    return null;
  }, [sections, currentPage]);

  // Auto-determine which group has the active section
  const activeGroup = useMemo(() => {
    if (!activeSectionId) return null;
    const activeSection = sections.find((s) => s.id === activeSectionId);
    return activeSection ? getGroupForTipo(activeSection.tipo) : null;
  }, [activeSectionId, sections]);

  // Expanded groups state — auto-expand active group
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Active filter chip (null = show all)
  const [filterGroup, setFilterGroup] = useState<string | null>(null);

  // Auto-expand active group
  useEffect(() => {
    if (activeGroup && !expandedGroups.has(activeGroup)) {
      setExpandedGroups((prev) => new Set([...prev, activeGroup]));
    }
  }, [activeGroup]);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  // Visible groups for rendering
  const visibleGroupOrder = useMemo(() => {
    if (filterGroup) return [filterGroup];
    return SECTION_GROUP_ORDER.filter((g) => {
      if (g === "burocracia" && hideBurocracia) return false;
      return groupedByGroup.has(g);
    });
  }, [filterGroup, groupedByGroup, hideBurocracia]);

  // Group counts for chips (from all sections, not filtered)
  const allGroupCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of visibleSections) {
      const groupKey = getGroupForTipo(s.tipo);
      map.set(groupKey, (map.get(groupKey) || 0) + 1);
    }
    return map;
  }, [visibleSections]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-neutral-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs">Carregando índice...</span>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
        <FileText className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Nenhuma peça processual identificada
        </p>
        <p className="text-[10px] text-neutral-300 dark:text-neutral-600">
          O pipeline de IA ainda não processou este PDF
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar peça..."
            className="h-7 pl-7 text-xs bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
          />
        </div>
      </div>

      {/* Batch select toolbar */}
      {onToggleBatchSelect && (
        <div className="px-3 py-1 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
          <button
            onClick={onToggleBatchSelect}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded border transition-colors",
              batchSelectMode
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                : "bg-neutral-50 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300"
            )}
          >
            {batchSelectMode ? "Cancelar" : "Selecionar"}
          </button>
          {batchSelectMode && (
            <>
              <button
                onClick={() => {
                  const allIds = filteredSections.filter((s) => getSectionConfig(s.tipo).relevancia !== "oculto").map((s) => s.id);
                  onSelectAll?.(allIds);
                }}
                className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                Todas
              </button>
              <button
                onClick={onClearSelection}
                className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                Limpar
              </button>
              {(selectedSectionIds?.size || 0) > 0 && (
                <button
                  onClick={onBatchExport}
                  disabled={isBatchExporting}
                  className="ml-auto text-[10px] px-2 py-0.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {isBatchExporting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <FileDown className="w-3 h-3" />
                  )}
                  Exportar {selectedSectionIds?.size}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Quick filter chips */}
      <div className="px-2 py-1.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setFilterGroup(null)}
          className={cn(
            "text-[9px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors flex-shrink-0",
            !filterGroup
              ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-transparent"
              : "bg-neutral-50 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
          )}
        >
          Todos {sections.length - burocraciaCount}
        </button>
        {SECTION_GROUP_ORDER.filter(
          (g) => g !== "burocracia" && (allGroupCounts.get(g) || 0) > 0
        ).map((groupKey) => {
          const config = SECTION_GROUP_CONFIG[groupKey];
          const count = allGroupCounts.get(groupKey) || 0;
          const isActive = filterGroup === groupKey;
          return (
            <button
              key={groupKey}
              onClick={() => setFilterGroup(isActive ? null : groupKey)}
              className={cn(
                "text-[9px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors flex-shrink-0",
                isActive
                  ? "text-white border-transparent"
                  : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
              )}
              style={isActive ? { backgroundColor: config.color } : { color: config.color }}
            >
              {config.label.split(" ")[0]} {count}
            </button>
          );
        })}
      </div>

      {/* Burocracia filter toggle */}
      {burocraciaCount > 0 && onToggleHideBurocracia && !filterGroup && (
        <button
          onClick={onToggleHideBurocracia}
          className={cn(
            "px-3 py-1 border-b text-[10px] flex items-center gap-1.5 transition-colors w-full",
            hideBurocracia
              ? "bg-neutral-50 dark:bg-neutral-800/30 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 border-neutral-100 dark:border-neutral-800"
              : "bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/20"
          )}
        >
          {hideBurocracia ? (
            <>
              <EyeOff className="w-3 h-3" />
              <span>{burocraciaCount} burocracia oculta</span>
              <span className="text-neutral-300 dark:text-neutral-600 ml-auto">mostrar</span>
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" />
              <span>{burocraciaCount} burocracia visível</span>
              <span className="text-neutral-300 dark:text-neutral-600 ml-auto">ocultar</span>
            </>
          )}
        </button>
      )}

      {/* Grouped sections list with accordion */}
      <div className="flex-1 overflow-y-auto">
        {visibleGroupOrder.map((groupKey) => {
          const config = SECTION_GROUP_CONFIG[groupKey];
          if (!config) return null;
          const groupSections = groupedByGroup.get(groupKey) || [];
          if (groupSections.length === 0) return null;

          const GroupIcon = config.icon;
          const isExpanded = expandedGroups.has(groupKey) || !!filterGroup;

          return (
            <div key={groupKey}>
              {/* Group header — accordion toggle */}
              <button
                onClick={() => !filterGroup && toggleGroup(groupKey)}
                className={cn(
                  "w-full text-left px-3 py-1.5 flex items-center gap-2 border-b transition-colors",
                  "bg-neutral-50/80 dark:bg-neutral-800/40 border-neutral-100 dark:border-neutral-800",
                  !filterGroup && "hover:bg-neutral-100 dark:hover:bg-neutral-800/60 cursor-pointer"
                )}
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${config.color}15` }}
                >
                  <GroupIcon className="w-2.5 h-2.5" style={{ color: config.color }} />
                </div>
                <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 flex-1 truncate uppercase tracking-wider">
                  {config.label}
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 font-mono border-neutral-200 dark:border-neutral-700"
                  style={{ color: config.color }}
                >
                  {groupSections.length}
                </Badge>
                {!filterGroup && (
                  isExpanded
                    ? <ChevronUp className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                    : <ChevronDown className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                )}
              </button>

              {/* Group sections — collapsible */}
              {isExpanded && groupSections.map((section) => {
                const sConfig = getSectionConfig(section.tipo);
                const SIcon = sConfig.icon;
                const isActive = activeSectionId === section.id;
                const isSelected = selectedSectionId === section.id;
                const isBatchSelected = selectedSectionIds?.has(section.id);

                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      if (batchSelectMode) {
                        onToggleSelection?.(section.id);
                      } else {
                        onNavigate(section.paginaInicio);
                        onSelectSection(section);
                      }
                    }}
                    className={cn(
                      "w-full text-left pl-6 pr-3 py-1.5 border-b border-neutral-100 dark:border-neutral-800 transition-colors group",
                      isActive && !batchSelectMode
                        ? "bg-neutral-100 dark:bg-neutral-800/80"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40",
                      isSelected && !batchSelectMode && "ring-1 ring-inset ring-emerald-500/30",
                      isBatchSelected && "bg-emerald-50/50 dark:bg-emerald-950/20"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {/* Batch select checkbox */}
                      {batchSelectMode && (
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                          isBatchSelected
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-neutral-300 dark:border-neutral-600"
                        )}>
                          {isBatchSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      )}
                      {!batchSelectMode && (
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: `${sConfig.color}15` }}
                        >
                          <SIcon className="w-2.5 h-2.5" style={{ color: sConfig.color }} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate leading-tight">
                          {section.titulo}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-neutral-400 font-mono">
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
                                    : "text-neutral-400"
                              )}
                            >
                              {section.confianca}%
                            </span>
                          )}
                        </div>
                      </div>

                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
                      )}

                      <button
                        type="button"
                        title="Extrair como PDF separado"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExtract?.(section.id);
                        }}
                        disabled={extractingId === section.id}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex-shrink-0"
                      >
                        {extractingId === section.id ? (
                          <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />
                        ) : (
                          <FileDown className="w-3 h-3 text-neutral-400 hover:text-emerald-500" />
                        )}
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>
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
    <div className="border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex-1 text-left">
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
          <ChevronDown className="w-3 h-3 text-neutral-400" />
        ) : (
          <ChevronUp className="w-3 h-3 text-neutral-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* Title + page range */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {section.titulo}
            </p>
            <span className="text-[10px] text-neutral-400 font-mono">
              pg {section.paginaInicio}–{section.paginaFim}
            </span>
          </div>

          {/* Summary */}
          {section.resumo && (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
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
                  className="text-[9px] px-1.5 py-0 h-4 bg-neutral-500/5 text-neutral-500 border-neutral-500/20"
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

// ─── Files Panel ──────────────────────────────────────────────────

function FilesPanel({
  files,
  currentFileId,
  onSelectFile,
}: {
  files: { id: number; name: string; pdfUrl: string }[];
  currentFileId: number;
  onSelectFile: (id: number) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return files;
    return files.filter((f) =>
      f.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [files, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar arquivo..."
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((file) => (
          <button
            key={file.id}
            type="button"
            onClick={() => onSelectFile(file.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-left border-b border-neutral-100 dark:border-neutral-800 transition-colors group",
              file.id === currentFileId
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-l-2 border-l-emerald-500"
                : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span
              className={cn(
                "text-[11px] truncate",
                file.id === currentFileId
                  ? "font-medium text-emerald-700 dark:text-emerald-400"
                  : "text-neutral-600 dark:text-neutral-400"
              )}
            >
              {file.name}
            </span>
            {file.id === currentFileId && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-6 text-xs text-neutral-400">
            Nenhum arquivo encontrado
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Annotations Panel ──────────────────────────────────────────────

function AnnotationsPanel({
  annotations,
  onNavigate,
  onDelete,
}: {
  annotations: any[];
  onNavigate: (page: number) => void;
  onDelete: (id: number) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<number, typeof annotations>();
    for (const a of annotations) {
      const page = a.pagina;
      if (!map.has(page)) map.set(page, []);
      map.get(page)!.push(a);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [annotations]);

  // Use centralized ANNOTATION_COLORS for all color lookups

  // Helper for relative time
  const relativeTime = (date: string | Date | undefined) => {
    if (!date) return "";
    const now = Date.now();
    const then = new Date(date).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d`;
  };

  if (annotations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10 flex items-center justify-center mb-3">
          <Highlighter className="w-6 h-6 text-amber-400 dark:text-amber-500" />
        </div>
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Nenhuma anotacao</p>
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 leading-relaxed">
          Use <span className="font-medium text-amber-500">Grifo</span>,{" "}
          <span className="font-medium text-emerald-500">Sublinhado</span> ou{" "}
          <span className="font-medium text-blue-500">Nota</span> para anotar
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {grouped.map(([page, items]) => (
        <div key={page}>
          <div className="px-3 py-1.5 bg-gradient-to-r from-neutral-50 to-neutral-100/50 dark:from-neutral-800/40 dark:to-neutral-800/20 border-b border-neutral-100 dark:border-neutral-800 sticky top-0 z-10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-neutral-400" />
              <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 tracking-wide uppercase">
                Pagina {page}
              </span>
              <span className="text-[9px] text-neutral-400 dark:text-neutral-500 ml-auto">
                {items.length} {items.length === 1 ? "item" : "itens"}
              </span>
            </div>
          </div>
          {items.map((a: any) => {
            const aColor = getAnnotationColor(a.cor);
            const IconComp = a.tipo === "highlight" ? Highlighter : a.tipo === "underline" ? Underline : StickyNote;
            const tipoLabel = a.tipo === "highlight" ? "Grifo" : a.tipo === "underline" ? "Sublinhado" : "Nota";
            const hasSelectedText = a.tipo === "highlight" || a.tipo === "underline";
            return (
              <div
                key={a.id}
                onClick={() => onNavigate(a.pagina)}
                className={cn(
                  "flex items-start gap-2.5 px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800",
                  "border-l-[3px] cursor-pointer group",
                  "hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50",
                  "hover:translate-x-0.5 transition-all duration-200",
                )}
                style={{ borderLeftColor: aColor.hex }}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${aColor.hex}18` }}
                  >
                    <IconComp className="w-3 h-3" style={{ color: aColor.hex }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  {hasSelectedText ? (
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-300 line-clamp-2 italic leading-relaxed">
                      <span className="text-neutral-400 dark:text-neutral-500 not-italic">&ldquo;</span>
                      {a.textoSelecionado}
                      <span className="text-neutral-400 dark:text-neutral-500 not-italic">&rdquo;</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                      {a.texto}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${aColor.hex}15`, color: aColor.hex }}
                    >
                      {tipoLabel}
                    </span>
                    <span className="text-[9px] text-neutral-400 dark:text-neutral-500">
                      {aColor.label}
                    </span>
                    {a.createdAt && (
                      <span className="text-[9px] text-neutral-300 dark:text-neutral-600 ml-auto">
                        {relativeTime(a.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(a.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Color Settings Dialog ─────────────────────────────────────────

function ColorSettingsDialog({
  isOpen,
  onClose,
  customLabels,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  customLabels: Record<string, string>;
  onSave: (labels: Record<string, string>) => void;
}) {
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setLabels({ ...DEFAULT_COLOR_LABELS, ...customLabels });
    }
  }, [isOpen, customLabels]);

  const handleSave = () => {
    onSave(labels);
    onClose();
  };

  const handleReset = () => {
    setLabels({ ...DEFAULT_COLOR_LABELS });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-neutral-500" />
            Categorias de Cor
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2 max-h-[50vh] overflow-y-auto">
          {ANNOTATION_COLORS.map((c) => (
            <div key={c.color} className="flex items-center gap-2.5">
              <div
                className="w-6 h-6 rounded-md flex-shrink-0 shadow-sm"
                style={{
                  backgroundColor: c.hexLight,
                  border: `1.5px solid ${c.hexMid}`,
                }}
              />
              <Input
                value={labels[c.color] || ""}
                onChange={(e) => setLabels((prev) => ({ ...prev, [c.color]: e.target.value }))}
                placeholder={c.label}
                className="h-8 text-xs flex-1"
              />
            </div>
          ))}
        </div>
        <DialogFooter className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-neutral-500"
            onClick={handleReset}
          >
            Restaurar padrao
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bookmarks Panel ───────────────────────────────────────────────

function BookmarksPanel({
  annotations,
  currentPage,
  onNavigate,
  onDelete,
  onUpdateLabel,
}: {
  annotations: any[];
  currentPage: number;
  onNavigate: (page: number) => void;
  onDelete: (id: number) => void;
  onUpdateLabel: (id: number, texto: string) => void;
}) {
  const bookmarks = useMemo(() => {
    return annotations
      .filter((a) => a.tipo === "bookmark")
      .sort((a, b) => a.pagina - b.pagina);
  }, [annotations]);

  const [editingId, setEditingId] = useState<number | null>(null);

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10 flex items-center justify-center mb-3">
          <Bookmark className="w-6 h-6 text-amber-400 dark:text-amber-500" />
        </div>
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Nenhum marcador</p>
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 leading-relaxed">
          Pressione <kbd className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-[9px]">B</kbd> para marcar paginas importantes
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-3 py-1.5 border-b border-neutral-100 dark:border-neutral-800 bg-gradient-to-r from-neutral-50 to-neutral-100/50 dark:from-neutral-800/40 dark:to-neutral-800/20">
        <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 tracking-wide uppercase">
          {bookmarks.length} {bookmarks.length === 1 ? "marcador" : "marcadores"}
        </span>
      </div>
      {bookmarks.map((bk) => {
        const isActive = bk.pagina === currentPage;
        const isEditing = editingId === bk.id;
        return (
          <div
            key={bk.id}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 cursor-pointer group transition-all duration-200",
              isActive
                ? "bg-amber-50/60 dark:bg-amber-900/10 border-l-[3px] border-l-amber-500"
                : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border-l-[3px] border-l-transparent hover:border-l-neutral-300 dark:hover:border-l-neutral-600"
            )}
            onClick={() => onNavigate(bk.pagina)}
          >
            <Bookmark
              className={cn(
                "w-4 h-4 flex-shrink-0 transition-colors",
                isActive ? "text-amber-500 fill-amber-500" : "text-neutral-400 group-hover:text-amber-400"
              )}
            />
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  autoFocus
                  defaultValue={bk.texto || ""}
                  placeholder="Descricao do marcador..."
                  className="h-6 text-[11px] px-1.5"
                  onBlur={(e) => {
                    onUpdateLabel(bk.id, e.target.value.trim());
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onUpdateLabel(bk.id, (e.target as HTMLInputElement).value.trim());
                      setEditingId(null);
                    }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <p className={cn(
                    "text-[11px] font-medium leading-tight",
                    isActive ? "text-amber-700 dark:text-amber-400" : "text-neutral-600 dark:text-neutral-300"
                  )}>
                    {bk.texto || `Pagina ${bk.pagina}`}
                  </p>
                  <span className="text-[9px] text-neutral-400 font-mono">pg {bk.pagina}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(bk.id);
                }}
                className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <Pencil className="w-3 h-3 text-neutral-400" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(bk.id);
                }}
                className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Caso Panel (Sistematização / HITL Review) ───────────────────

function CasoPanel({
  sections,
  currentPage,
  onNavigate,
  onApprove,
  onReject,
  onExtractApproved,
  reviewProgress,
  isApproving,
  isExtracting,
}: {
  sections: any[];
  currentPage: number;
  onNavigate: (page: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onExtractApproved: () => void;
  reviewProgress?: { total: number; approved: number; rejected: number; pending: number; reviewed: number; percentReviewed: number };
  isApproving: boolean;
  isExtracting: boolean;
}) {
  const [expandedFicha, setExpandedFicha] = useState<number | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <Check className="w-3.5 h-3.5 text-emerald-500" />;
      case "rejected": return <X className="w-3.5 h-3.5 text-red-500" />;
      case "needs_review": return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      default: return <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "approved": return "border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10";
      case "rejected": return "border-l-red-500 bg-red-50/30 dark:bg-red-900/10 opacity-60";
      case "needs_review": return "border-l-amber-500 bg-amber-50/30 dark:bg-amber-900/10";
      default: return "border-l-neutral-300 dark:border-l-neutral-600 hover:border-l-emerald-400";
    }
  };

  const getConfiancaColor = (confianca: number) => {
    if (confianca >= 80) return "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20";
    if (confianca >= 50) return "text-amber-500 bg-amber-50 dark:bg-amber-900/20";
    return "text-red-500 bg-red-50 dark:bg-red-900/20";
  };

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/10 flex items-center justify-center mb-3">
          <Sparkles className="w-6 h-6 text-violet-400 dark:text-violet-500" />
        </div>
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Nenhuma seção classificada</p>
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 leading-relaxed">
          O pipeline de IA classificará as peças processuais automaticamente
        </p>
      </div>
    );
  }

  const approvedCount = reviewProgress?.approved || 0;
  const totalCount = reviewProgress?.total || sections.length;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 bg-gradient-to-r from-neutral-50 to-neutral-100/50 dark:from-neutral-800/40 dark:to-neutral-800/20">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 tracking-wide uppercase">
            Revisão do Caso
          </span>
          <span className="text-[10px] font-mono text-neutral-400">
            {reviewProgress?.reviewed || 0}/{totalCount}
          </span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 to-emerald-400"
            style={{ width: `${reviewProgress?.percentReviewed || 0}%` }}
          />
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[9px] text-emerald-500 flex items-center gap-0.5">
            <Check className="w-2.5 h-2.5" /> {approvedCount}
          </span>
          <span className="text-[9px] text-red-400 flex items-center gap-0.5">
            <X className="w-2.5 h-2.5" /> {reviewProgress?.rejected || 0}
          </span>
          <span className="text-[9px] text-neutral-400 flex items-center gap-0.5">
            pendente: {reviewProgress?.pending || 0}
          </span>
        </div>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => {
          const config = getSectionConfig(section.tipo);
          const Icon = config.icon;
          const status = section.reviewStatus || "pending";
          const isActivePage = currentPage >= section.paginaInicio && currentPage <= section.paginaFim;
          const hasFicha = section.fichaData && Object.keys(section.fichaData).length > 0;
          const isExpanded = expandedFicha === section.id;

          return (
            <div key={section.id}>
              <div
                className={cn(
                  "flex items-start gap-2 px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 cursor-pointer group transition-all duration-200 border-l-[3px]",
                  getStatusBg(status),
                  isActivePage && status === "pending" && "bg-violet-50/40 dark:bg-violet-900/10"
                )}
                onClick={() => onNavigate(section.paginaInicio)}
              >
                {/* Status indicator */}
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(status)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3 flex-shrink-0" style={{ color: config.color }} />
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-md border",
                      config.bgColor
                    )}>
                      {config.label}
                    </span>
                    {section.confianca != null && (
                      <span className={cn(
                        "text-[8px] font-mono px-1 py-0.5 rounded",
                        getConfiancaColor(section.confianca)
                      )}>
                        {section.confianca}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-600 dark:text-neutral-300 mt-0.5 line-clamp-2 leading-snug">
                    {section.titulo}
                  </p>
                  <span className="text-[8px] text-neutral-400 font-mono">
                    pg {section.paginaInicio}{section.paginaFim !== section.paginaInicio ? `-${section.paginaFim}` : ""}
                  </span>
                </div>

                {/* Actions */}
                {status === "pending" && (
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onApprove(section.id); }}
                      disabled={isApproving}
                      className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 transition-colors"
                      title="Aprovar"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onReject(section.id); }}
                      disabled={isApproving}
                      className="p-1 rounded-md bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                      title="Rejeitar"
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                )}

                {/* Ficha indicator */}
                {hasFicha && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedFicha(isExpanded ? null : section.id);
                    }}
                    className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex-shrink-0"
                    title="Ver Ficha"
                  >
                    <FileSearch className="w-3.5 h-3.5 text-violet-500" />
                  </button>
                )}
              </div>

              {/* Expanded ficha preview */}
              {isExpanded && hasFicha && (
                <div className="px-4 py-3 bg-violet-50/50 dark:bg-violet-900/10 border-b border-violet-200 dark:border-violet-800/30">
                  <div className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Ficha — {config.label}
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(section.fichaData).map(([key, value]) => {
                      if (key === "_type" || key === "_version") return null;
                      const displayKey = key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/_/g, " ")
                        .toLowerCase()
                        .replace(/^\w/, (c: string) => c.toUpperCase());

                      return (
                        <div key={key} className="flex gap-2">
                          <span className="text-[9px] font-medium text-violet-500 dark:text-violet-400 flex-shrink-0 w-20 text-right">
                            {displayKey}:
                          </span>
                          <span className="text-[9px] text-neutral-600 dark:text-neutral-300">
                            {Array.isArray(value)
                              ? (value as string[]).join(", ")
                              : typeof value === "object" && value !== null
                                ? JSON.stringify(value, null, 0)
                                : String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      {approvedCount > 0 && (
        <div className="border-t border-neutral-200 dark:border-neutral-700 p-2 space-y-1.5 bg-neutral-50 dark:bg-neutral-900">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-[10px] h-7 gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
            onClick={onExtractApproved}
            disabled={isExtracting}
          >
            {isExtracting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <FileDown className="w-3 h-3" />
            )}
            Extrair {approvedCount} Aprovados ao Drive
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Memoized Highlight Overlay ─────────────────────────────────────
// Extracted to prevent all overlays re-rendering when any annotation changes

const HighlightOverlay = memo(function HighlightOverlay({
  annotation,
  resolvedColors,
  customColorLabels,
  onUpdateColor,
  onUpdateNote,
  onDelete,
}: {
  annotation: any;
  resolvedColors: typeof ANNOTATION_COLORS;
  customColorLabels?: Record<string, string>;
  onUpdateColor: (id: number, cor: string) => void;
  onUpdateNote: (id: number, texto: string | undefined) => void;
  onDelete: (id: number) => void;
}) {
  const hlColor = getAnnotationColor(annotation.cor, customColorLabels);
  const rects = normalizeAnnotationRects(annotation.posicao);
  const isUnderline = annotation.tipo === "underline";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="contents">
          {rects.map((rect, i) => (
            <div
              key={`${annotation.id}-rect-${i}`}
              className="absolute pointer-events-auto cursor-pointer z-[5] hover:opacity-60 transition-opacity duration-200"
              style={isUnderline ? {
                left: `${rect.x * 100}%`,
                top: `${(rect.y + rect.height - 0.003) * 100}%`,
                width: `${rect.width * 100}%`,
                height: `${0.003 * 100}%`,
                backgroundColor: hlColor.hex,
                opacity: 0.65,
                borderRadius: "1px",
              } : {
                left: `${rect.x * 100}%`,
                top: `${rect.y * 100}%`,
                width: `${rect.width * 100}%`,
                height: `${rect.height * 100}%`,
                backgroundColor: hlColor.hexLight,
                opacity: 0.55,
                borderRadius: "2px",
                mixBlendMode: "multiply" as const,
              }}
            />
          ))}
        </div>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-2.5 z-[60]">
        {/* Selected text preview */}
        {annotation.textoSelecionado && (
          <p className="text-[11px] italic text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-2 leading-relaxed">
            &ldquo;{annotation.textoSelecionado}&rdquo;
          </p>
        )}
        {/* Color picker — soft pastel squares */}
        <div className="flex flex-wrap gap-1 mb-2">
          {resolvedColors.map((c) => (
            <button
              key={c.color}
              onClick={() => onUpdateColor(annotation.id, c.color)}
              className="relative"
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-md transition-all",
                  annotation.cor === c.color
                    ? "ring-1.5 ring-offset-1 ring-offset-white dark:ring-offset-neutral-800 scale-110"
                    : "hover:scale-110"
                )}
                style={{
                  backgroundColor: c.hexLight,
                  border: `1.5px solid ${c.hexMid}`,
                  ...(annotation.cor === c.color ? { ringColor: c.hexMid } : {}),
                }}
              />
              {annotation.cor === c.color && (
                <Check className="absolute inset-0 m-auto w-2.5 h-2.5 drop-shadow-sm" style={{ color: c.hex }} />
              )}
            </button>
          ))}
        </div>
        {/* Note textarea */}
        <Textarea
          placeholder="Adicionar nota..."
          defaultValue={annotation.texto || ""}
          onBlur={(e) => {
            const val = e.target.value.trim();
            if (val !== (annotation.texto || "")) {
              onUpdateNote(annotation.id, val || undefined);
            }
          }}
          className="text-xs h-16 mb-2 resize-none"
        />
        {/* Actions */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-neutral-400 flex-1">
            {getAnnotationColor(annotation.cor, customColorLabels).label} &middot; {isUnderline ? "Sublinhado" : "Grifo"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => onDelete(annotation.id)}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Excluir
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
});

// ─── Memoized Note Indicator ────────────────────────────────────────

const NoteIndicator = memo(function NoteIndicator({
  note,
  customColorLabels,
  onDelete,
}: {
  note: any;
  customColorLabels?: Record<string, string>;
  onDelete: (id: number) => void;
}) {
  const noteColor = getAnnotationColor(note.cor, customColorLabels);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="absolute z-10 cursor-pointer group"
          style={{
            left: `${(note.posicao?.x || 0) * 100}%`,
            top: `${(note.posicao?.y || 0) * 100}%`,
          }}
        >
          {/* Pulsing ring */}
          <div
            className="absolute inset-0 w-7 h-7 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: noteColor.hex }}
          />

          {/* Main pin */}
          <div
            className="relative w-7 h-7 rounded-full flex items-center justify-center drop-shadow-md border-2 border-white dark:border-neutral-800 transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: noteColor.hex }}
          >
            <StickyNote className="w-3.5 h-3.5 text-white drop-shadow-sm" />
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
              style={{ backgroundColor: noteColor.hex }}
            />
          </div>

          {/* Note preview on hover */}
          <div className="absolute left-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 px-2.5 py-1.5 max-w-[180px]">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: noteColor.hex }} />
                <span className="text-[8px] font-medium" style={{ color: noteColor.hex }}>
                  {noteColor.label}
                </span>
              </div>
              <p className="text-[10px] text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                {note.texto}
              </p>
            </div>
          </div>

          {/* Delete button on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center shadow-md hover:bg-red-600 hover:scale-110"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[220px] px-3 py-2">
        <p className="text-xs leading-relaxed">{note.texto}</p>
      </TooltipContent>
    </Tooltip>
  );
});

// ─── Main PdfViewerModal ───────────────────────────────────────────

export function PdfViewerModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  pdfUrl,
  siblingFiles,
  onFileChange,
}: PdfViewerModalProps) {
  // State
  const { addJob, updateJob: updateQueueJob, completeJob, failJob } = useProcessingQueue();
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [showIndex, setShowIndex] = useState(true);
  const [indexSearch, setIndexSearch] = useState("");
  const [selectedSection, setSelectedSection] = useState<ReactPdfDocumentSection | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"sections" | "files" | "annotations" | "bookmarks" | "caso">("files");
  const [viewMode, setViewMode] = useState<"custom" | "fit-width">("fit-width");
  const [fitWidthScale, setFitWidthScale] = useState(1.0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deepProcessingProgress, setDeepProcessingProgress] = useState<{
    phase: "extracting" | "classifying" | "done";
    processedChunks: number;
    totalChunks: number;
    sectionsFound: number;
  } | null>(null);
  const deepProcessingRef = useRef(false); // prevents duplicate loops
  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const selectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Image capture mode
  const [isCaptureMode, setIsCaptureMode] = useState(false);
  const [captureStart, setCaptureStart] = useState<{ x: number; y: number } | null>(null);
  const [captureRect, setCaptureRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCaptureDialog, setShowCaptureDialog] = useState(false);

  // Reset state when fileId changes (file navigation)
  const prevFileIdRef = useRef(fileId);
  useEffect(() => {
    if (prevFileIdRef.current !== fileId) {
      prevFileIdRef.current = fileId;
      setCurrentPage(1);
      setNumPages(0);
      setPdfError(null);
      setSelectedSection(null);
      setIndexSearch("");
      setAnnotationMode("none");
      setScale(1.0);
    }
  }, [fileId]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setPdfError(null);
    }
  }, [isOpen]);

  // Escape key to cancel capture mode
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isCaptureMode) {
        setIsCaptureMode(false);
        setCaptureStart(null);
        setCaptureRect(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isCaptureMode]);

  // Section filter: hide burocracia by default
  const [hideBurocracia, setHideBurocracia] = useState(true);

  // Annotation mode
  const [annotationMode, setAnnotationMode] = useState<"none" | "highlight" | "underline" | "note">("none");
  const [selectedColor, setSelectedColor] = useState<string>("yellow");
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  // File metadata for linking
  const { data: fileMetadata } = trpc.drive.getFileById.useQuery(
    { id: fileId },
    { enabled: isOpen && fileId > 0 }
  );

  // Custom color labels from user settings
  const { data: userSettingsData } = trpc.settings.get.useQuery(undefined, { enabled: isOpen });
  const saveSettings = trpc.settings.save.useMutation({
    onSuccess: () => toast.success("Categorias salvas"),
  });
  const customColorLabels = (userSettingsData as any)?.annotationColorLabels as Record<string, string> | undefined;
  const resolvedColors = useMemo(() => getAnnotationColorsWithLabels(customColorLabels), [customColorLabels]);

  const handleSaveColorLabels = useCallback((labels: Record<string, string>) => {
    saveSettings.mutate({ annotationColorLabels: labels } as any);
  }, [saveSettings]);

  // tRPC utilities for optimistic updates
  const utils = trpc.useUtils();

  // Fetch annotations for current file
  const { data: annotations, refetch: refetchAnnotations } = trpc.annotations.listByFile.useQuery(
    { driveFileId: fileId },
    { enabled: isOpen }
  );

  // Create annotation mutation — optimistic update
  const createAnnotation = trpc.annotations.create.useMutation({
    onMutate: async (newAnnotation) => {
      await utils.annotations.listByFile.cancel({ driveFileId: fileId });
      const prev = utils.annotations.listByFile.getData({ driveFileId: fileId });
      utils.annotations.listByFile.setData({ driveFileId: fileId }, (old: any) => {
        if (!old) return old;
        return [...old, {
          ...newAnnotation,
          id: -(Date.now()),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }];
      });
      return { prev };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.prev) {
        utils.annotations.listByFile.setData({ driveFileId: fileId }, context.prev);
      }
    },
    onSettled: () => {
      utils.annotations.listByFile.invalidate({ driveFileId: fileId });
    },
    // No toast — grifo e silencioso, feedback visual ja e o proprio highlight
  });

  // Update annotation mutation — optimistic update
  const updateAnnotation = trpc.annotations.update.useMutation({
    onMutate: async (updated) => {
      await utils.annotations.listByFile.cancel({ driveFileId: fileId });
      const prev = utils.annotations.listByFile.getData({ driveFileId: fileId });
      utils.annotations.listByFile.setData({ driveFileId: fileId }, (old: any) => {
        if (!old) return old;
        return old.map((a: any) => a.id === updated.id ? { ...a, ...updated } : a);
      });
      return { prev };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.prev) {
        utils.annotations.listByFile.setData({ driveFileId: fileId }, context.prev);
      }
    },
    onSettled: () => {
      utils.annotations.listByFile.invalidate({ driveFileId: fileId });
    },
  });

  // Delete annotation mutation — optimistic update
  const deleteAnnotation = trpc.annotations.delete.useMutation({
    onMutate: async (deleted) => {
      await utils.annotations.listByFile.cancel({ driveFileId: fileId });
      const prev = utils.annotations.listByFile.getData({ driveFileId: fileId });
      utils.annotations.listByFile.setData({ driveFileId: fileId }, (old: any) => {
        if (!old) return old;
        return old.filter((a: any) => a.id !== deleted.id);
      });
      return { prev };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.prev) {
        utils.annotations.listByFile.setData({ driveFileId: fileId }, context.prev);
      }
    },
    onSettled: () => {
      utils.annotations.listByFile.invalidate({ driveFileId: fileId });
    },
    onSuccess: () => {
      toast.success("Anotacao removida");
    },
  });

  // ─── Processing: Simple Mode (< 5MB) ─────────────────────────
  const classifyJobId = `classify-${fileId}`;
  const triggerClassification = trpc.documentSections.triggerClassification.useMutation({
    onMutate: () => {
      addJob({ id: classifyJobId, type: "classification", label: fileName, status: "running", progress: -1, detail: "Classificando seções..." });
      showProgressToast({ id: classifyJobId, type: "classification", label: fileName, progress: -1, detail: "Classificando seções..." });
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      const count = data && "sectionsFound" in data ? (data as { sectionsFound?: number }).sectionsFound : 0;
      const summary = `${count || 0} seções encontradas`;
      completeJob(classifyJobId, summary);
      completeProgressToast(classifyJobId, `${fileName} — ${summary}`);
      utils.documentSections.listByFile.invalidate({ driveFileId: fileId });
      setSidebarTab("sections");
    },
    onError: (err) => {
      setIsProcessing(false);
      const isTimeout = err.message?.includes("504") || err.message?.includes("timeout") || err.message?.includes("TIMEOUT") || err.message?.includes("Gateway");
      if (isTimeout) {
        failJob(classifyJobId, "Timeout — use modo profundo");
        failProgressToast(classifyJobId, "Arquivo grande demais. Use o modo Profundo.");
      } else {
        failJob(classifyJobId, err.message);
        failProgressToast(classifyJobId, err.message);
      }
    },
  });

  // ─── Processing: Deep Mode (> 5MB, multi-step) ─────────────
  const startDeepProcessing = trpc.documentSections.startDeepProcessing.useMutation();
  const processNextChunks = trpc.documentSections.processNextChunks.useMutation();

  const deepJobId = `deep-classify-${fileId}`;
  const runDeepProcessingLoop = useCallback(async () => {
    if (deepProcessingRef.current) return; // already running
    deepProcessingRef.current = true;

    try {
      // Step 1: Extract text
      setDeepProcessingProgress({ phase: "extracting", processedChunks: 0, totalChunks: 0, sectionsFound: 0 });
      addJob({ id: deepJobId, type: "classification", label: fileName, status: "running", progress: 5, detail: "Extraindo texto..." });
      showProgressToast({ id: deepJobId, type: "classification", label: fileName, progress: 5, detail: "Extraindo texto..." });

      const extraction = await startDeepProcessing.mutateAsync({ driveFileId: fileId });
      if (!extraction.success) throw new Error("Falha na extração");

      // Step 2: Classify chunks in batches
      let processedChunks = 0;
      let sectionsFound = 0;
      const totalChunks = extraction.totalChunks;
      setDeepProcessingProgress({ phase: "classifying", processedChunks: 0, totalChunks, sectionsFound: 0 });

      while (processedChunks < totalChunks) {
        const batch = await processNextChunks.mutateAsync({
          driveFileId: fileId,
          batchSize: 1,
        });

        processedChunks = batch.processedChunks;
        sectionsFound += batch.newSections;

        const pct = Math.round((processedChunks / totalChunks) * 100);
        const detail = `Bloco ${processedChunks}/${totalChunks} · ${sectionsFound} seções`;

        setDeepProcessingProgress({
          phase: batch.isComplete ? "done" : "classifying",
          processedChunks,
          totalChunks,
          sectionsFound,
        });

        // Update toast and queue with real progress
        updateQueueJob(deepJobId, { progress: pct, detail });
        updateProgressToast(deepJobId, { type: "classification", label: fileName, progress: pct, detail });

        // Refresh sections sidebar progressively
        utils.documentSections.listByFile.invalidate({ driveFileId: fileId });

        if (batch.isComplete) break;
      }

      const summary = `${sectionsFound} seções em ${extraction.totalPages} páginas`;
      completeJob(deepJobId, summary);
      completeProgressToast(deepJobId, `${fileName} — ${summary}`);
      setSidebarTab("sections");
    } catch (err: any) {
      failJob(deepJobId, err.message);
      failProgressToast(deepJobId, err.message);
    } finally {
      setIsProcessing(false);
      setDeepProcessingProgress(null);
      deepProcessingRef.current = false;
    }
  }, [fileId, fileName, startDeepProcessing, processNextChunks, utils, addJob, updateQueueJob, completeJob, failJob, deepJobId]);

  // Smart mode: auto-detect based on file size AND page count
  const fileSizeBytes = fileMetadata?.fileSize || 0;
  const isLargeBySize = fileSizeBytes > 5 * 1024 * 1024; // > 5MB
  const isLargeByPages = (numPages || 0) > 50; // > 50 pages
  const isLargeFile = isLargeBySize || isLargeByPages;

  const handleProcessFile = useCallback((mode?: "simple" | "deep") => {
    // Auto-detect: use deep mode for large files unless explicitly set to simple
    const useDeep = mode === "deep" || (mode !== "simple" && isLargeFile);
    setIsProcessing(true);

    if (useDeep) {
      toast.info(
        `Modo profundo: processando ${numPages || "?"} páginas em blocos...`,
        { duration: 4000 }
      );
      runDeepProcessingLoop();
    } else {
      toast.info("Processando documento...", { duration: 3000 });
      triggerClassification.mutate({ driveFileId: fileId });
    }
  }, [triggerClassification, fileId, isLargeFile, numPages, runDeepProcessingLoop]);

  // Stable callbacks for memoized HighlightOverlay
  const handleUpdateColor = useCallback((id: number, cor: string) => {
    updateAnnotation.mutate({ id, cor });
  }, [updateAnnotation]);

  const handleUpdateNote = useCallback((id: number, texto: string | undefined) => {
    updateAnnotation.mutate({ id, texto });
  }, [updateAnnotation]);

  const handleDeleteAnnotation = useCallback((id: number) => {
    deleteAnnotation.mutate({ id });
  }, [deleteAnnotation]);

  // File navigation within siblings
  const currentFileIndex = useMemo(() => {
    if (!siblingFiles?.length) return -1;
    return siblingFiles.findIndex((f) => f.id === fileId);
  }, [siblingFiles, fileId]);

  const hasPrevFile = currentFileIndex > 0;
  const hasNextFile = siblingFiles ? currentFileIndex < siblingFiles.length - 1 : false;

  const goToPrevFile = useCallback(() => {
    if (hasPrevFile && siblingFiles && onFileChange) {
      onFileChange(siblingFiles[currentFileIndex - 1].id);
    }
  }, [hasPrevFile, siblingFiles, currentFileIndex, onFileChange]);

  const goToNextFile = useCallback(() => {
    if (hasNextFile && siblingFiles && onFileChange) {
      onFileChange(siblingFiles[currentFileIndex + 1].id);
    }
  }, [hasNextFile, siblingFiles, currentFileIndex, onFileChange]);

  // Extract section to separate PDF
  const [extractingId, setExtractingId] = useState<number | null>(null);
  const [extractResult, setExtractResult] = useState<{
    fileName: string;
    webViewLink: string;
    pageCount: number;
  } | null>(null);

  const extractMutation = trpc.documentSections.extractSectionToPdf.useMutation({
    onSuccess: (data) => {
      setExtractingId(null);
      setExtractResult({
        fileName: data.fileName,
        webViewLink: data.webViewLink,
        pageCount: data.pageCount,
      });
      toast.success(`Peça extraída: ${data.fileName}`);
    },
    onError: (err) => {
      setExtractingId(null);
      toast.error(`Erro ao extrair: ${err.message}`);
    },
  });

  const handleExtract = useCallback((sectionId: number) => {
    setExtractingId(sectionId);
    extractMutation.mutate({ sectionId });
  }, [extractMutation]);

  // ─── Batch selection & export ───────────────────────────────
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<number>>(new Set());

  const toggleSectionSelection = useCallback((sectionId: number) => {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const selectAllVisibleSections = useCallback((sectionIds: number[]) => {
    setSelectedSectionIds(new Set(sectionIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSectionIds(new Set());
  }, []);

  const [isBatchExporting, setIsBatchExporting] = useState(false);

  // Load sections from DB
  const { data: sections, isLoading: sectionsLoading, refetch: refetchSections } =
    trpc.documentSections.listByFile.useQuery(
      { driveFileId: fileId },
      { enabled: isOpen && fileId > 0 }
    );

  // Review progress for Caso panel
  const { data: reviewProgress, refetch: refetchProgress } =
    trpc.documentSections.getReviewProgress.useQuery(
      { driveFileId: fileId },
      { enabled: isOpen && fileId > 0 }
    );

  const handleBatchExport = useCallback(async () => {
    if (selectedSectionIds.size === 0 || !sections || !pdfUrl) return;

    setIsBatchExporting(true);
    try {
      // 1. Fetch the PDF bytes
      const response = await fetch(pdfUrl);
      const pdfBytes = await response.arrayBuffer();

      // 2. Dynamic imports for pdf-lib and jszip
      const { PDFDocument } = await import("pdf-lib");
      const sourcePdf = await PDFDocument.load(pdfBytes);

      const selectedSections = sections.filter((s) => selectedSectionIds.has(s.id));

      if (selectedSections.length === 1) {
        // Single section — download directly
        const section = selectedSections[0];
        const newPdf = await PDFDocument.create();
        const startIdx = section.paginaInicio - 1; // 0-based
        const endIdx = Math.min(section.paginaFim, sourcePdf.getPageCount());
        const pageIndices = Array.from(
          { length: endIdx - startIdx },
          (_, i) => startIdx + i
        );
        const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach((page) => newPdf.addPage(page));
        const pdfBytesOut = await newPdf.save();

        const blob = new Blob([pdfBytesOut], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const safeName = section.titulo.replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, "").trim().slice(0, 60);
        a.download = `${section.tipo}_${safeName}_pg${section.paginaInicio}-${section.paginaFim}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF exportado!");
      } else {
        // Multiple sections — zip
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        for (const section of selectedSections) {
          const newPdf = await PDFDocument.create();
          const startIdx = section.paginaInicio - 1;
          const endIdx = Math.min(section.paginaFim, sourcePdf.getPageCount());
          const pageIndices = Array.from(
            { length: endIdx - startIdx },
            (_, i) => startIdx + i
          );
          const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
          copiedPages.forEach((page) => newPdf.addPage(page));
          const pdfBytesOut = await newPdf.save();

          const safeName = section.titulo.replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, "").trim().slice(0, 60);
          const pdfName = `${section.tipo}_${safeName}_pg${section.paginaInicio}-${section.paginaFim}.pdf`;
          zip.file(pdfName, pdfBytesOut);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `secoes_${selectedSections.length}_pecas.zip`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`${selectedSections.length} peças exportadas!`);
      }

      setBatchSelectMode(false);
      setSelectedSectionIds(new Set());
    } catch (error) {
      console.error("[batch-export] Error:", error);
      toast.error("Erro ao exportar: " + (error instanceof Error ? error.message : "Erro desconhecido"));
    } finally {
      setIsBatchExporting(false);
    }
  }, [selectedSectionIds, sections, pdfUrl]);

  // Approval mutations
  const approveSection = trpc.documentSections.approveSection.useMutation({
    onSuccess: (data) => {
      refetchSections();
      refetchProgress();
      const hasFicha = data?.fichaData && Object.keys(data.fichaData as Record<string, unknown>).length > 0;
      toast.success(hasFicha ? "Seção aprovada — ficha gerada!" : "Seção aprovada");
    },
    onError: () => toast.error("Erro ao aprovar seção"),
  });

  const rejectSection = trpc.documentSections.rejectSection.useMutation({
    onSuccess: () => {
      refetchSections();
      refetchProgress();
      toast.success("Seção rejeitada");
    },
    onError: () => toast.error("Erro ao rejeitar seção"),
  });

  const extractApproved = trpc.documentSections.extractApprovedToDrive.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.extracted} peças extraídas ao Drive`);
      refetchSections();
    },
    onError: () => toast.error("Erro ao extrair peças"),
  });

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
  const zoomIn = useCallback(() => {
    setViewMode("custom");
    setScale((s) => Math.min(s + 0.25, 3.0));
  }, []);
  const zoomOut = useCallback(() => {
    setViewMode("custom");
    setScale((s) => Math.max(s - 0.25, 0.5));
  }, []);

  // Effective scale (respects fit-to-width mode)
  const effectiveScale = viewMode === "fit-width" ? fitWidthScale : scale;

  // Calculate fit-to-width scale when container or sidebar changes
  useEffect(() => {
    if (!isOpen || viewMode !== "fit-width") return;
    const calculateFitWidth = () => {
      const container = pageContainerRef.current;
      if (!container) return;
      // PDF default width is ~612px (US Letter). Subtract padding (32px each side)
      const availableWidth = container.clientWidth - 64;
      const pdfDefaultWidth = 612; // standard PDF page width in points
      const newScale = Math.max(0.5, Math.min(2.5, availableWidth / pdfDefaultWidth));
      setFitWidthScale(newScale);
    };
    calculateFitWidth();
    const observer = new ResizeObserver(calculateFitWidth);
    if (pageContainerRef.current) observer.observe(pageContainerRef.current);
    return () => observer.disconnect();
  }, [isOpen, viewMode, showIndex]);

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
        return;
      }
      // Alt+Arrow: Navigate between files
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevFile();
        return;
      }
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        goToNextFile();
        return;
      }
      // F key: Toggle sidebar between files and sections tabs
      if (e.key === "f" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "INPUT") {
        setSidebarTab((t) => t === "files" ? "sections" : "files");
        if (!showIndex) setShowIndex(true);
        return;
      }
      // P key: Trigger process file
      if (e.key === "p" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        if (!isProcessing) handleProcessFile();
        return;
      }
      // W key: Toggle fit-to-width
      if (e.key === "w" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setViewMode((m) => m === "fit-width" ? "custom" : "fit-width");
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prevPage();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextPage();
      } else if (e.key === "Home") {
        e.preventDefault();
        goToPage(1);
      } else if (e.key === "End") {
        e.preventDefault();
        goToPage(numPages);
      } else if (e.key === "PageUp") {
        e.preventDefault();
        goToPage(currentPage - 5);
      } else if (e.key === "PageDown") {
        e.preventDefault();
        goToPage(currentPage + 5);
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
      } else if (e.key === "a" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "INPUT") {
        setAnnotationMode((m) => m !== "none" ? "none" : "highlight");
      } else if (e.key === "l" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setShowLinkDialog(true);
      } else if (e.key === "b" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "INPUT") {
        // Toggle bookmark on current page
        e.preventDefault();
        const existingBookmark = annotations?.find(
          (a) => a.pagina === currentPage && a.tipo === "bookmark"
        );
        if (existingBookmark) {
          deleteAnnotation.mutate({ id: existingBookmark.id });
        } else {
          createAnnotation.mutate({
            driveFileId: fileId,
            tipo: "bookmark",
            pagina: currentPage,
            cor: "yellow",
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose, prevPage, nextPage, zoomIn, zoomOut, goToPrevFile, goToNextFile, goToPage, numPages, showIndex, annotations, currentPage, fileId, createAnnotation, deleteAnnotation, isProcessing, handleProcessFile]);

  // Section markers for current page
  const currentPageSections = useMemo(() => {
    if (!sections) return [];
    return sections.filter(
      (s) => currentPage >= s.paginaInicio && currentPage <= s.paginaFim
    );
  }, [sections, currentPage]);

  // Click handler for note annotations
  const handlePageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (annotationMode !== "note") return;

    // Calculate position relative to the PDF page canvas (not the container)
    const pageEl = pageContainerRef.current?.querySelector(".react-pdf__Page__canvas") as HTMLCanvasElement
      || pageContainerRef.current?.querySelector(".react-pdf__Page");
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const noteText = prompt("Adicionar nota:");
    if (!noteText?.trim()) return;

    createAnnotation.mutate({
      driveFileId: fileId,
      tipo: "note",
      pagina: currentPage,
      cor: selectedColor as AnnotationColorName,
      texto: noteText.trim(),
      posicao: { x, y, width: 0.02, height: 0.02 },
    });
  }, [annotationMode, fileId, currentPage, selectedColor, createAnnotation]);

  // Text selection handler for highlight/underline annotations (debounced)
  const handleTextSelection = useCallback(() => {
    if (annotationMode !== "highlight" && annotationMode !== "underline") return;

    // Debounce: cancel previous pending selection
    if (selectionDebounceRef.current) {
      clearTimeout(selectionDebounceRef.current);
    }

    selectionDebounceRef.current = setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) return;

      const selectedText = selection.toString().trim();
      if (selectedText.length < 3) return;
      _createHighlight(selection, selectedText);
    }, 150);
  }, [annotationMode, fileId, currentPage, selectedColor, createAnnotation]);

  // Actual highlight creation (extracted for debounce)
  const _createHighlight = useCallback((selection: Selection, selectedText: string) => {

    // Capture per-line rects for precise multi-rect overlay
    // Coordinates are relative to the .react-pdf__Page canvas element
    let posicao: { rects: Rect[] } | undefined;
    try {
      const range = selection.getRangeAt(0);
      const clientRects = range.getClientRects();
      // Find the actual page canvas — overlays are positioned relative to this element's parent wrapper
      const pageEl = pageContainerRef.current?.querySelector(".react-pdf__Page__canvas") as HTMLCanvasElement
        || pageContainerRef.current?.querySelector(".react-pdf__Page");
      if (pageEl && clientRects.length > 0) {
        const pageRect = pageEl.getBoundingClientRect();
        const rawRects: Rect[] = [];

        for (let i = 0; i < clientRects.length; i++) {
          const r = clientRects[i];
          // Skip tiny rects (whitespace artifacts)
          if (r.width < 2 || r.height < 2) continue;
          // Clamp all values between 0 and 1 (relative to page)
          const x = Math.max(0, Math.min(1, (r.left - pageRect.left) / pageRect.width));
          const y = Math.max(0, Math.min(1, (r.top - pageRect.top) / pageRect.height));
          const w = Math.max(0, Math.min(1 - x, r.width / pageRect.width));
          const h = Math.max(0, Math.min(1 - y, r.height / pageRect.height));
          if (w > 0.001 && h > 0.001) {
            rawRects.push({ x, y, width: w, height: h });
          }
        }

        const merged = mergeAdjacentRects(rawRects);
        if (merged.length > 0) {
          posicao = { rects: merged };
        }
      }
    } catch {
      // Highlight still saves without visual overlay
    }

    createAnnotation.mutate({
      driveFileId: fileId,
      tipo: annotationMode, // "highlight" or "underline"
      pagina: currentPage,
      cor: selectedColor as AnnotationColorName,
      textoSelecionado: selectedText,
      posicao,
    });

    selection.removeAllRanges();
  }, [annotationMode, fileId, currentPage, selectedColor, createAnnotation]);

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      <style dangerouslySetInnerHTML={{ __html: PDF_TEXT_LAYER_STYLES }} />
      <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
        <div
          ref={containerRef}
          className={cn(
            "w-full h-full bg-white dark:bg-neutral-900 flex flex-col relative",
            annotationMode === "highlight" && "pdf-highlight-mode",
            annotationMode === "underline" && "pdf-underline-mode"
          )}
        >
          {/* ── Top Bar — Enlarged & Enhanced ── */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 flex-shrink-0">
            {/* Left: Toggle index */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowIndex(!showIndex)}
                >
                  <BookOpen
                    className={cn(
                      "h-4.5 w-4.5",
                      showIndex
                        ? "text-emerald-500"
                        : "text-neutral-400 dark:text-neutral-500"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {showIndex ? "Ocultar indice (I)" : "Mostrar indice (I)"}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* File navigation arrows */}
            {siblingFiles && siblingFiles.length > 1 && (
              <div className="flex items-center gap-0.5 mr-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={goToPrevFile}
                      disabled={!hasPrevFile}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Arquivo anterior (Alt+&#x2190;)</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={goToNextFile}
                      disabled={!hasNextFile}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Proximo arquivo (Alt+&#x2192;)</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-[10px] text-neutral-400 font-mono mx-0.5">
                  {currentFileIndex + 1}/{siblingFiles.length}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">
                {fileName}
              </p>
            </div>

            {/* Center: Page navigation — larger */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => goToPage(1)} disabled={currentPage <= 1}>
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p className="text-xs">Primeira pagina (Home)</p></TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={prevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </Button>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={numPages}
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                  className="w-14 h-8 text-sm text-center bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-sm text-neutral-400 font-mono">/ {numPages}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={nextPage}
                disabled={currentPage >= numPages}
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => goToPage(numPages)} disabled={currentPage >= numPages}>
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p className="text-xs">Ultima pagina (End)</p></TooltipContent>
              </Tooltip>
            </div>

            <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-1" />

            {/* Right: Actions — Enlarged buttons with more options */}
            <div className="flex items-center gap-1">
              {/* Process File button with mode dropdown */}
              <div className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-r-none",
                        isProcessing && "animate-pulse",
                        sections && sections.length > 0 && "text-violet-500"
                      )}
                      onClick={() => handleProcessFile()}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-4.5 w-4.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">
                      {isProcessing
                        ? deepProcessingProgress
                          ? `Profundo: ${deepProcessingProgress.processedChunks}/${deepProcessingProgress.totalChunks} blocos`
                          : "Processando..."
                        : isLargeFile
                          ? "Processar profundo (P)"
                          : "Processar rápido (P)"}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-5 rounded-l-none px-0"
                      disabled={isProcessing}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => handleProcessFile("simple")} disabled={isProcessing}>
                      <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                      <div>
                        <div className="font-medium">Rápido</div>
                        <div className="text-xs text-neutral-500">Arquivos até 5MB (~100 pgs)</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleProcessFile("deep")} disabled={isProcessing}>
                      <Brain className="h-4 w-4 mr-2 text-violet-500" />
                      <div>
                        <div className="font-medium">Profundo</div>
                        <div className="text-xs text-neutral-500">Até 100MB — sem limite de tempo</div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Deep processing progress bar */}
              {deepProcessingProgress && (
                <div className="flex items-center gap-2 min-w-[140px]">
                  <div className="flex-1 min-w-[80px]">
                    <Progress
                      value={
                        deepProcessingProgress.phase === "extracting"
                          ? 5
                          : deepProcessingProgress.totalChunks > 0
                            ? Math.round((deepProcessingProgress.processedChunks / deepProcessingProgress.totalChunks) * 100)
                            : 0
                      }
                      className="h-2"
                    />
                  </div>
                  <span className="text-[10px] text-neutral-500 whitespace-nowrap">
                    {deepProcessingProgress.phase === "extracting"
                      ? "Extraindo..."
                      : `${deepProcessingProgress.processedChunks}/${deepProcessingProgress.totalChunks}`}
                    {deepProcessingProgress.sectionsFound > 0 && (
                      <> · {deepProcessingProgress.sectionsFound} seções</>
                    )}
                  </span>
                </div>
              )}

              {/* Link file to entity */}
              {(() => {
                const isLinked = !!(fileMetadata?.assistidoId || fileMetadata?.processoId);
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8", isLinked && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600")}
                        onClick={() => setShowLinkDialog(true)}
                      >
                        <Link2 className="h-4.5 w-4.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">{isLinked ? "Vinculado (L)" : "Vincular (L)"}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })()}

              {/* Annotation toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", annotationMode !== "none" && "bg-amber-100 dark:bg-amber-900/30 text-amber-600")}
                    onClick={() => setAnnotationMode(annotationMode !== "none" ? "none" : "highlight")}
                  >
                    <Highlighter className="h-4.5 w-4.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Anotar (A)</p>
                </TooltipContent>
              </Tooltip>

              {/* Bookmark toggle */}
              {(() => {
                const hasBookmark = annotations?.some(
                  (a) => a.pagina === currentPage && a.tipo === "bookmark"
                );
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-8 w-8", hasBookmark && "bg-amber-100 dark:bg-amber-900/30 text-amber-600")}
                        onClick={() => {
                          const existing = annotations?.find(
                            (a) => a.pagina === currentPage && a.tipo === "bookmark"
                          );
                          if (existing) {
                            deleteAnnotation.mutate({ id: existing.id });
                          } else {
                            createAnnotation.mutate({
                              driveFileId: fileId,
                              tipo: "bookmark",
                              pagina: currentPage,
                              cor: "yellow",
                            });
                          }
                        }}
                      >
                        <Bookmark className={cn("h-4.5 w-4.5", hasBookmark && "fill-current")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">{hasBookmark ? "Remover marcador (B)" : "Marcar pagina (B)"}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })()}

              <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />

              {/* Current page section badges */}
              {currentPageSections.length > 0 && (
                <div className="hidden md:flex items-center gap-1 mr-1">
                  {currentPageSections.map((s) => {
                    const config = getSectionConfig(s.tipo);
                    const Icon = config.icon;
                    return (
                      <Tooltip key={s.id}>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-2 py-0.5 h-5 cursor-pointer",
                              config.bgColor
                            )}
                            onClick={() => setSelectedSection(s)}
                          >
                            <Icon className="w-3 h-3 mr-0.5" />
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

              <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />

              {/* Fit-to-width toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8", viewMode === "fit-width" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600")}
                    onClick={() => setViewMode((m) => m === "fit-width" ? "custom" : "fit-width")}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{viewMode === "fit-width" ? "Zoom manual (W)" : "Ajustar largura (W)"}</p>
                </TooltipContent>
              </Tooltip>

              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut}>
                <ZoomOut className="h-4.5 w-4.5 text-neutral-500" />
              </Button>
              <span className="text-[11px] text-neutral-400 w-10 text-center font-mono">
                {Math.round(effectiveScale * 100)}%
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn}>
                <ZoomIn className="h-4.5 w-4.5 text-neutral-500" />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8",
                      isCaptureMode && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    )}
                    onClick={() => setIsCaptureMode(!isCaptureMode)}
                  >
                    <ScanFace className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{isCaptureMode ? "Cancelar captura" : "Capturar imagem"}</p>
                </TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4.5 w-4.5 text-neutral-500" />
                ) : (
                  <Maximize2 className="h-4.5 w-4.5 text-neutral-500" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="h-4.5 w-4.5 text-neutral-500" />
              </Button>
            </div>
          </div>

          {/* ── Floating Annotation Toolbar ── */}
          {annotationMode !== "none" && (
            <div className="flex flex-col flex-shrink-0">
              {/* Main toolbar — redesigned larger */}
              <div className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-200/80 dark:border-neutral-700/80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md">
                {/* Mode toggle - pill design (larger) */}
                <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 shadow-inner">
                  <button
                    onClick={() => setAnnotationMode("highlight")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200",
                      annotationMode === "highlight"
                        ? "bg-white dark:bg-neutral-700 text-amber-600 dark:text-amber-400 shadow-md"
                        : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                  >
                    <Highlighter className="w-4 h-4" />
                    Grifo
                  </button>
                  <button
                    onClick={() => setAnnotationMode("underline")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200",
                      annotationMode === "underline"
                        ? "bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-md"
                        : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                  >
                    <Underline className="w-4 h-4" />
                    Sublinhado
                  </button>
                  <button
                    onClick={() => setAnnotationMode("note")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200",
                      annotationMode === "note"
                        ? "bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-md"
                        : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    )}
                  >
                    <StickyNote className="w-4 h-4" />
                    Nota
                  </button>
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />

                {/* Color picker — soft pastel dots matching actual highlight colors */}
                <div className="flex items-center gap-1">
                  {resolvedColors.map((c) => (
                    <Tooltip key={c.color}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSelectedColor(c.color)}
                          className="relative group p-0.5"
                        >
                          <div
                            className={cn(
                              "w-5 h-5 rounded-md transition-all duration-150",
                              selectedColor === c.color
                                ? "ring-1.5 ring-offset-1 ring-offset-white dark:ring-offset-neutral-900 shadow-sm"
                                : "hover:scale-110"
                            )}
                            style={{
                              backgroundColor: c.hexLight,
                              border: `1.5px solid ${c.hexMid}`,
                              ...(selectedColor === c.color ? { ringColor: c.hexMid } : {}),
                            }}
                          />
                          {selectedColor === c.color && (
                            <Check className="absolute inset-0 m-auto w-2.5 h-2.5 drop-shadow-sm" style={{ color: c.hex }} />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-[10px] py-1 px-2.5 font-medium">
                        {c.label}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />

                {/* Active color label + settings */}
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3.5 h-3.5 rounded shadow-sm"
                    style={{
                      backgroundColor: getAnnotationColor(selectedColor, customColorLabels).hexLight,
                      border: `1.5px solid ${getAnnotationColor(selectedColor, customColorLabels).hexMid}`,
                    }}
                  />
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    {getAnnotationColor(selectedColor, customColorLabels).label}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowColorSettings(true)}
                        className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px]">Editar categorias</TooltipContent>
                  </Tooltip>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Annotation count badge */}
                {(annotations?.length || 0) > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    <Highlighter className="w-3 h-3" />
                    {annotations?.filter((a: any) => a.tipo !== "bookmark").length}
                  </div>
                )}

                {/* Close annotation mode */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
                  onClick={() => setAnnotationMode("none")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Instruction hint bar */}
              <div className={cn(
                "px-4 py-1 text-[10px] text-center border-b font-medium",
                annotationMode === "highlight"
                  ? "bg-amber-50/60 dark:bg-amber-950/20 text-amber-600/80 dark:text-amber-400/70 border-amber-100 dark:border-amber-900/20"
                  : annotationMode === "underline"
                    ? "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-600/80 dark:text-emerald-400/70 border-emerald-100 dark:border-emerald-900/20"
                    : "bg-blue-50/60 dark:bg-blue-950/20 text-blue-600/80 dark:text-blue-400/70 border-blue-100 dark:border-blue-900/20"
              )}>
                {annotationMode === "highlight"
                  ? "Selecione texto na pagina para criar um grifo"
                  : annotationMode === "underline"
                    ? "Selecione texto na pagina para sublinhar"
                    : "Clique na pagina para adicionar uma nota"}
              </div>
            </div>
          )}

          {/* ── Main Content ── */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar (left) — Sections or Files tab */}
            {showIndex && (
              <div className="w-72 border-r border-neutral-200 dark:border-neutral-700 flex-shrink-0 bg-white dark:bg-neutral-900 overflow-hidden flex flex-col">
                {/* Tab Header — icon-based compact design for 5 tabs */}
                <div className="flex border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
                  {([
                    { key: "files" as const, icon: FolderOpen, label: "Arquivos", activeColor: "emerald", count: siblingFiles?.length },
                    { key: "sections" as const, icon: BookMarked, label: "Seções", activeColor: "emerald", count: undefined },
                    { key: "annotations" as const, icon: Highlighter, label: "Notas", activeColor: "amber", count: annotations?.filter((a: any) => a.tipo !== "bookmark").length },
                    { key: "bookmarks" as const, icon: Bookmark, label: "Marcadores", activeColor: "amber", count: annotations?.filter((a: any) => a.tipo === "bookmark").length },
                    { key: "caso" as const, icon: Sparkles, label: "Caso", activeColor: "violet", count: reviewProgress && reviewProgress.total > 0 ? reviewProgress.approved : undefined },
                  ]).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = sidebarTab === tab.key;
                    const colorClasses = {
                      emerald: isActive ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500" : "",
                      amber: isActive ? "text-amber-600 dark:text-amber-400 border-b-2 border-amber-500" : "",
                      violet: isActive ? "text-violet-600 dark:text-violet-400 border-b-2 border-violet-500" : "",
                    };
                    return (
                      <Tooltip key={tab.key}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setSidebarTab(tab.key)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-1 px-1 py-2.5 text-[10px] font-medium transition-colors relative",
                              isActive
                                ? colorClasses[tab.activeColor as keyof typeof colorClasses]
                                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline truncate">{tab.label}</span>
                            {tab.count != null && tab.count > 0 && (
                              <span className={cn(
                                "min-w-[14px] h-[14px] flex items-center justify-center text-[8px] font-bold rounded-full leading-none",
                                isActive
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500"
                              )}>
                                {tab.count}
                              </span>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-[10px]">
                          {tab.label}
                          {tab.count != null && tab.count > 0 ? ` (${tab.count})` : ""}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Tab Content */}
                {sidebarTab === "files" ? (
                  <FilesPanel
                    files={siblingFiles || []}
                    currentFileId={fileId}
                    onSelectFile={(id) => onFileChange?.(id)}
                  />
                ) : sidebarTab === "sections" ? (
                  <SectionIndexPanel
                    sections={(sections as DocumentSection[]) || []}
                    currentPage={currentPage}
                    onNavigate={goToPage}
                    isLoading={sectionsLoading}
                    searchQuery={indexSearch}
                    onSearchChange={setIndexSearch}
                    selectedSectionId={selectedSection?.id ?? null}
                    onSelectSection={setSelectedSection}
                    onExtract={handleExtract}
                    extractingId={extractingId}
                    hideBurocracia={hideBurocracia}
                    onToggleHideBurocracia={() => setHideBurocracia((prev) => !prev)}
                    batchSelectMode={batchSelectMode}
                    onToggleBatchSelect={() => {
                      setBatchSelectMode(!batchSelectMode);
                      if (batchSelectMode) setSelectedSectionIds(new Set());
                    }}
                    selectedSectionIds={selectedSectionIds}
                    onToggleSelection={toggleSectionSelection}
                    onSelectAll={selectAllVisibleSections}
                    onClearSelection={clearSelection}
                    onBatchExport={handleBatchExport}
                    isBatchExporting={isBatchExporting}
                  />
                ) : sidebarTab === "annotations" ? (
                  <AnnotationsPanel
                    annotations={(annotations || []).filter((a: any) => a.tipo !== "bookmark")}
                    onNavigate={goToPage}
                    onDelete={(id) => deleteAnnotation.mutate({ id })}
                  />
                ) : sidebarTab === "bookmarks" ? (
                  <BookmarksPanel
                    annotations={annotations || []}
                    currentPage={currentPage}
                    onNavigate={goToPage}
                    onDelete={(id) => deleteAnnotation.mutate({ id })}
                    onUpdateLabel={(id, texto) => updateAnnotation.mutate({ id, texto: texto || undefined })}
                  />
                ) : (
                  <CasoPanel
                    sections={(sections as any[]) || []}
                    currentPage={currentPage}
                    onNavigate={goToPage}
                    onApprove={(id) => approveSection.mutate({ id })}
                    onReject={(id) => rejectSection.mutate({ id })}
                    onExtractApproved={() => extractApproved.mutate({ driveFileId: fileId })}
                    reviewProgress={reviewProgress}
                    isApproving={approveSection.isPending || rejectSection.isPending}
                    isExtracting={extractApproved.isPending}
                  />
                )}
              </div>
            )}

            {/* PDF Viewer (center) */}
            <div
              ref={pageContainerRef}
              className={cn(
                "flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-950 flex justify-center",
                annotationMode === "note" && "cursor-crosshair"
              )}
              onMouseUp={annotationMode === "highlight" || annotationMode === "underline" ? handleTextSelection : undefined}
            >
              {pdfError || !pdfUrl ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                  <AlertCircle className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {pdfError || "URL do arquivo não disponível"}
                  </p>
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-500 hover:text-emerald-400 underline"
                    >
                      Abrir no Google Drive
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-4" onClick={handlePageClick}>
                  <ReactPdfDocument
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                      <div className="flex items-center justify-center h-96 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                        <span className="text-sm text-neutral-400">
                          Carregando PDF...
                        </span>
                      </div>
                    }
                  >
                    {/* Wrapper relative ao redor da página para posicionar overlays corretamente */}
                    <div className="relative inline-block">
                    <ReactPdfPage
                      pageNumber={currentPage}
                      scale={effectiveScale}
                      className="shadow-lg"
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                      loading={
                        <div className="flex items-center justify-center h-96">
                          <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
                        </div>
                      }
                    />

                  {/* Highlight + Underline overlays for current page — memoized */}
                  {annotations
                    ?.filter((a) => a.pagina === currentPage && (a.tipo === "highlight" || a.tipo === "underline") && a.posicao)
                    .map((hl) => (
                      <HighlightOverlay
                        key={`hl-overlay-${hl.id}`}
                        annotation={hl}
                        resolvedColors={resolvedColors}
                        customColorLabels={customColorLabels}
                        onUpdateColor={handleUpdateColor}
                        onUpdateNote={handleUpdateNote}
                        onDelete={handleDeleteAnnotation}
                      />
                    ))}

                  {/* Note indicators for current page — memoized */}
                  {annotations?.filter((a) => a.pagina === currentPage && a.tipo === "note").map((note) => (
                    <NoteIndicator
                      key={note.id}
                      note={note}
                      customColorLabels={customColorLabels}
                      onDelete={handleDeleteAnnotation}
                    />
                  ))}

                  {/* Image capture overlay */}
                  {isCaptureMode && (
                    <div
                      className="absolute inset-0 z-50"
                      style={{ cursor: "crosshair" }}
                      onMouseDown={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setCaptureStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                        setCaptureRect(null);
                      }}
                      onMouseMove={(e) => {
                        if (!captureStart) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = Math.min(captureStart.x, e.clientX - rect.left);
                        const y = Math.min(captureStart.y, e.clientY - rect.top);
                        const w = Math.abs(e.clientX - rect.left - captureStart.x);
                        const h = Math.abs(e.clientY - rect.top - captureStart.y);
                        setCaptureRect({ x, y, w, h });
                      }}
                      onMouseUp={() => {
                        if (captureRect && captureRect.w > 10 && captureRect.h > 10) {
                          // Find the canvas element within this relative wrapper
                          const pageCanvas = pageContainerRef.current?.querySelector(".react-pdf__Page__canvas") as HTMLCanvasElement;
                          if (pageCanvas) {
                            const canvasRect = pageCanvas.getBoundingClientRect();
                            const parentRect = pageCanvas.parentElement?.getBoundingClientRect();
                            if (parentRect) {
                              // Calculate canvas-relative coordinates
                              const scaleX = pageCanvas.width / canvasRect.width;
                              const scaleY = pageCanvas.height / canvasRect.height;
                              const offsetX = canvasRect.left - parentRect.left;
                              const offsetY = canvasRect.top - parentRect.top;

                              const tempCanvas = document.createElement("canvas");
                              const ctx = tempCanvas.getContext("2d")!;
                              const maxSize = 400;
                              const srcX = (captureRect.x - offsetX) * scaleX;
                              const srcY = (captureRect.y - offsetY) * scaleY;
                              const srcW = captureRect.w * scaleX;
                              const srcH = captureRect.h * scaleY;
                              const capScale = Math.min(maxSize / srcW, maxSize / srcH, 1);
                              tempCanvas.width = Math.round(srcW * capScale);
                              tempCanvas.height = Math.round(srcH * capScale);
                              ctx.drawImage(pageCanvas, srcX, srcY, srcW, srcH, 0, 0, tempCanvas.width, tempCanvas.height);

                              let dataUrl = tempCanvas.toDataURL("image/jpeg", 0.85);
                              // If > 100KB, reduce quality
                              if (dataUrl.length > 133333) {
                                dataUrl = tempCanvas.toDataURL("image/jpeg", 0.7);
                              }
                              setCapturedImage(dataUrl);
                              setShowCaptureDialog(true);
                            }
                          }
                        }
                        setCaptureStart(null);
                        setCaptureRect(null);
                        setIsCaptureMode(false);
                      }}
                    >
                      {/* Selection rectangle */}
                      {captureRect && (
                        <div
                          className="absolute border-2 border-dashed border-emerald-500 bg-emerald-500/10 rounded"
                          style={{
                            left: captureRect.x,
                            top: captureRect.y,
                            width: captureRect.w,
                            height: captureRect.h,
                          }}
                        />
                      )}
                    </div>
                  )}
                    </div>{/* Close relative wrapper around page + overlays */}
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

          {/* ── Extract Result Notification ── */}
          {extractResult && (
            <div className="absolute bottom-4 right-4 z-50 bg-white dark:bg-neutral-900 border border-emerald-300 dark:border-emerald-700 rounded-lg shadow-xl p-4 max-w-sm animate-in slide-in-from-bottom-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Peça extraída!</p>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">{extractResult.fileName}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{extractResult.pageCount} página(s)</p>
                  <div className="flex gap-2 mt-3">
                    <a
                      href={extractResult.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Abrir
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(extractResult.webViewLink);
                        toast.success("Link copiado!");
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <Link2 className="w-3 h-3" />
                      Copiar link
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setExtractResult(null)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Color Settings Dialog */}
      <ColorSettingsDialog
        isOpen={showColorSettings}
        onClose={() => setShowColorSettings(false)}
        customLabels={customColorLabels || {}}
        onSave={handleSaveColorLabels}
      />

      {/* File Link Dialog */}
      <FileLinkDialog
        isOpen={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        fileId={fileId}
        fileName={fileName}
        currentAssistidoId={fileMetadata?.assistidoId}
        currentProcessoId={fileMetadata?.processoId}
      />

      {/* Image Capture Dialog */}
      {capturedImage && (
        <ImageCaptureDialog
          isOpen={showCaptureDialog}
          onClose={() => {
            setShowCaptureDialog(false);
            setCapturedImage(null);
          }}
          imageDataUrl={capturedImage}
          processoId={fileMetadata?.processoId}
          assistidoId={fileMetadata?.assistidoId}
        />
      )}
    </TooltipProvider>
  );
}

// ─── Export section config for reuse ───────────────────────────────

export { SECTION_TYPE_CONFIG, getSectionConfig };
export type { DocumentSection };
