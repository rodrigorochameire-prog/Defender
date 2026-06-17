// @ts-nocheck
"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Lock,
  Flame,
  ExternalLink,
  Copy,
  Check,
  Archive,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  Scale,
  User,
  Clock,
  X,
  Mail,
  ArrowRight,
  Sparkles,
  FolderOpen,
  Upload,
  History,
  Plus,
  CalendarPlus,
  Eye,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { iniciaisNome } from "@/lib/format/iniciais";
import { DemandaTimelineDrawer } from "@/components/demandas-premium/demanda-timeline-drawer";
import { getStatusConfig, STATUS_GROUPS, DEMANDA_STATUS, type StatusGroup } from "@/config/demanda-status";
import { getAtoOptionsAgrupados } from "@/config/atos-por-atribuicao";
import { InlineDropdown } from "@/components/shared/inline-dropdown";
import { InlineAutocomplete } from "@/components/shared/inline-autocomplete";
import { useSheetWidthResize } from "@/hooks/use-sheet-width-resize";
import { TIPO_PROCESSO_OPTIONS } from "@/config/tipos-processo";
import { STATUS_PRISIONAL_CONFIG, STATUS_PRISIONAL_OPTIONS, type StatusPrisional } from "./status-prisional-config";
import { InlineDatePicker } from "@/components/shared/inline-date-picker";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import { RegistrosTimeline } from "@/components/registros/registros-timeline";
import { RegistroEditor } from "@/components/registros/registro-editor";
import { RegistroComAutosDialog } from "@/components/registros/registro-com-autos-dialog";
import { IdentificacaoSecao } from "./sheet/secoes/IdentificacaoSecao";
import { CronologiaSecao } from "./sheet/secoes/CronologiaSecao";
import { AutosSecao } from "./sheet/secoes/AutosSecao";
import { CollapsibleSection } from "@/components/agenda/sheet/collapsible-section";
import { SheetToC } from "@/components/agenda/sheet/sheet-toc";
import { resolverManifesto, toToCSections, type SecaoId, type SecoesMap } from "./sheet/secoes-manifest";
import {
  DocumentPreviewDialog,
  type PreviewFile,
} from "@/components/agenda/registro-audiencia/shared/document-preview-dialog";
import { AutosModalViewer } from "@/components/agenda/sheet/autos-modal-viewer";
import { RecursosSecao } from "./sheet/secoes/RecursosSecao";
import { rankAutos } from "@/lib/autos-pick";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

interface Processo {
  tipo: string;
  numero: string;
}

interface Demanda {
  id: string;
  assistido: string;
  assistidoId?: number | null;
  processoId?: number | null;
  status: string;
  substatus?: string;
  prazo: string;
  data: string;
  dataInclusao?: string;
  processos: Processo[];
  ato: string;
  providencias: string;
  atribuicao: string;
  atribuicaoEnum?: string | null;
  estadoPrisional?: string;
  prioridade?: string;
  arquivado?: boolean;
  importBatchId?: string | null;
  ordemOriginal?: number | null;
  photoUrl?: string | null;
  updatedAt?: string | null;
}

interface DemandaQuickPreviewProps {
  demanda: Demanda | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: string) => void;
  onAtoChange: (id: string, ato: string) => void;
  onProvidenciasChange?: (id: string, providencias: string) => void;
  onPrazoChange: (id: string, prazo: string) => void;
  onAtribuicaoChange: (id: string, atribuicao: string) => void;
  /** Edita tipo de processo (badge AP/MPU/APF/...). Chamado direto no
   *  processo (não na demanda) — passa processoId resolvido pela view. */
  onTipoProcessoChange?: (id: string, tipo: string) => void;
  /** Edita o número do processo (texto livre — cola o CNJ real). Substitui o
   *  stub "SN-<timestamp>" que o importador grava quando o CNJ não veio. */
  onProcessoNumeroChange?: (id: string, numero: string) => void;
  /** Vincula a demanda a um processo já existente no banco (pelo seletor). */
  onVincularProcesso?: (id: string, processoId: number, numero: string) => void;
  /** Busca pura (sem setState) de processos para o autocomplete de vínculo. */
  searchProcessosFn?: (query: string) => { id: number; label: string; sublabel?: string }[];
  /** Dispara a query de busca de processos (debounced no pai). */
  onProcessoQueryChange?: (query: string) => void;
  /** Loading da busca de processos. */
  loadingProcessoSearch?: boolean;
  /** Edita nome do assistido vinculado. Útil pra corrigir placeholders
   *  ("⚠ A identificar...") e typos. Chamado direto no assistido. */
  onAssistidoNomeChange?: (id: string, nome: string) => void;
  /** Atualiza o status prisional do assistido vinculado à demanda */
  onStatusPrisionalChange?: (assistidoId: number, status: string) => void;
  /** Abre o AudienciaConfirmModal pré-populado com a demanda */
  onAgendarAudiencia?: (demandaId: string) => void;
  /** Quando true, abre o painel de novo registro logo na primeira renderização */
  initialNovoRegistro?: boolean;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate?: (direction: "prev" | "next") => void;
  copyToClipboard: (text: string, msg: string) => void;
  atribuicaoIcons: Record<string, React.ComponentType<{ className?: string }>>;
  currentIndex?: number;
  totalCount?: number;
}

// ============================================
// CONSTANTS
// ============================================

// Cores temáticas pra badge de tipo de processo. Hex puro — usado com
// alpha 1a (~10%) no bg e cor cheia no texto. Verde tons reservado pra
// incidentes defensivos (LP, HC) — sinaliza ato da defesa, não acusação.
const TIPO_PROCESSO_COLORS: Record<string, string> = {
  AP: "#dc2626",        // Ação Penal — vermelho (acusação formal)
  IP: "#f59e0b",        // Inquérito Policial — amber (investigação)
  APF: "#ea580c",       // Auto Prisão Flagrante — orange (urgência)
  CAUTELAR: "#7c3aed",  // Cautelar (acusação) — violet
  EP: "#2563eb",        // Execução Penal — blue
  MPU: "#db2777",       // Medida Protetiva de Urgência — rose
  ANPP: "#0891b2",      // Acordo Não Persecução Penal — cyan
  LP: "#16a34a",        // Liberdade Provisória / Revogação (defesa) — green
  PAP: "#0d9488",       // Produção Antecipada de Provas — teal
  HC: "#9333ea",        // Habeas Corpus — purple
  PPP: "#b91c1c",       // Prisão Preventiva — red dark
  OUTRO: "#71717a",     // Outro — gray neutro
};

const ATRIBUICAO_BORDER_COLORS: Record<string, string> = {
  "Tribunal do Júri": "#22c55e",
  "Grupo Especial do Júri": "#f97316",
  "Violência Doméstica": "#f59e0b",
  "Execução Penal": "#3b82f6",
  "Substituição Criminal": "#8b5cf6",
  "Curadoria Especial": "#71717a",
};

const ATRIBUICAO_OPTIONS = [
  { value: "Tribunal do Júri", label: "Tribunal do Júri" },
  { value: "Grupo Especial do Júri", label: "Grupo Especial do Júri" },
  { value: "Violência Doméstica", label: "Violência Doméstica" },
  { value: "Execução Penal", label: "Execução Penal" },
  { value: "Substituição Criminal", label: "Substituição Criminal" },
  { value: "Curadoria Especial", label: "Curadoria Especial" },
];

// Pipeline stages for progress bar (mapped from status groups)
const PIPELINE_STAGES: { key: StatusGroup; label: string; short: string }[] = [
  { key: "triagem", label: "Triagem", short: "Triagem" },
  { key: "preparacao", label: "Preparação", short: "Prep." },
  { key: "diligencias", label: "Diligências", short: "Dilig." },
  { key: "saida", label: "Saída", short: "Saída" },
  { key: "acompanhar", label: "Acompanhar", short: "Acomp." },
  { key: "concluida", label: "Concluída", short: "Concl." },
];

function getStageIndex(group: StatusGroup): number {
  if (group === "arquivado") return PIPELINE_STAGES.length - 1; // maps to last stage
  return PIPELINE_STAGES.findIndex(s => s.key === group);
}

// ============================================
// AVATAR (uses shared AssistidoAvatar)
// ============================================

// ============================================
// OFÍCIO SUGERIDO — CLIENT-SIDE MAPPING
// ============================================

const TIPO_OFICIO_LABELS: Record<string, string> = {
  requisitorio: "Requisitório",
  comunicacao: "Comunicação",
  encaminhamento: "Encaminhamento",
  solicitacao_providencias: "Solic. Providências",
  pedido_informacao: "Pedido de Informação",
  manifestacao: "Manifestação",
};

function sugerirOficio(ato: string, providencias: string): { tipoOficio: string; tipoLabel: string } | null {
  const a = (ato || "").toLowerCase().trim();
  const p = (providencias || "").toLowerCase().trim();

  // Manifestações processuais
  if (
    a.includes("resposta à acusação") ||
    a.includes("alegações finais") ||
    a.includes("memoriais") ||
    a.includes("contestação") ||
    a.includes("embargos de declaração") ||
    a.includes("manifestação contra")
  ) {
    return { tipoOficio: "manifestacao", tipoLabel: "Manifestação" };
  }
  // Ofícios explícitos e requisições
  if (
    a.includes("ofício") ||
    a.includes("oficiar") ||
    p.includes("oficiar") ||
    p.includes("requisitar") ||
    p.includes("solicitar documento") ||
    p.includes("solicitar prontuário")
  ) {
    return { tipoOficio: "requisitorio", tipoLabel: "Requisitório" };
  }
  // Diligências
  if (
    a.includes("diligência") ||
    a.includes("designação") ||
    a.includes("transferência") ||
    a.includes("requerimento") ||
    p.includes("diligência") ||
    p.includes("providência")
  ) {
    return { tipoOficio: "solicitacao_providencias", tipoLabel: "Solic. Providências" };
  }
  // Pedidos de informação
  if (
    a.includes("pedido de informação") ||
    p.includes("informação") ||
    p.includes("certidão") ||
    a.includes("quesitos")
  ) {
    return { tipoOficio: "pedido_informacao", tipoLabel: "Pedido de Informação" };
  }
  // Encaminhamento
  if (a.includes("encaminhar") || p.includes("encaminhar") || a.includes("prosseguimento do feito")) {
    return { tipoOficio: "encaminhamento", tipoLabel: "Encaminhamento" };
  }
  // Ciência — only if providências demand action
  if (a.includes("ciência")) {
    if (p.includes("oficiar") || p.includes("solicitar") || p.includes("requisitar")) {
      return { tipoOficio: "requisitorio", tipoLabel: "Requisitório" };
    }
    return null;
  }
  // Comunicação genérica
  if (
    a.includes("atualização de endereço") ||
    a.includes("juntada de documentos") ||
    a.includes("petição intermediária") ||
    a.includes("testemunhas") ||
    a.includes("rol de testemunhas")
  ) {
    return { tipoOficio: "comunicacao", tipoLabel: "Comunicação" };
  }
  // Fallback: se tem providências substanciais
  if (p && p.length > 10) {
    return { tipoOficio: "comunicacao", tipoLabel: "Comunicação" };
  }

  return null;
}

// ============================================
// STAGE SUBSTATUS POPOVER
// ============================================

function StageSubstatusPopover({
  stage,
  anchorRect,
  currentStatus,
  onSelect,
  onClose,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  anchorRect: DOMRect;
  currentStatus: string;
  onSelect: (status: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const stageColor = STATUS_GROUPS[stage.key]?.color || "#A1A1AA";

  // Get substatus options for this group
  const options = Object.entries(DEMANDA_STATUS)
    .filter(([, v]) => v.group === stage.key)
    .map(([key, v]) => ({ key, ...v }));

  // Close on click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close from the same click
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 10);
    return () => { clearTimeout(timer); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Position: centered below the node, flip above if near bottom
  const popoverWidth = 160;
  const estimatedHeight = options.length * 32 + 48;
  const left = Math.max(8, Math.min(
    anchorRect.left + anchorRect.width / 2 - popoverWidth / 2,
    window.innerWidth - popoverWidth - 8
  ));
  // Force above if anchor is in the lower 40% of viewport
  const fitsBelow = anchorRect.top < window.innerHeight * 0.6
    && anchorRect.bottom + 8 + estimatedHeight < window.innerHeight - 16;
  const top = fitsBelow
    ? anchorRect.bottom + 8
    : Math.max(8, anchorRect.top - estimatedHeight - 8);

  // Normalize current status for comparison
  const normalizedCurrent = currentStatus.toLowerCase().replace(/\s+/g, "_");

  return (
    <div
      ref={ref}
      className={`fixed z-[9999] max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden animate-in fade-in duration-150 ${fitsBelow ? "slide-in-from-top-1" : "slide-in-from-bottom-1"}`}
      style={{ top, left, width: popoverWidth }}
    >
      {/* Header with stage color accent */}
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{ borderBottom: `2px solid ${stageColor}30` }}
      >
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stageColor }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: stageColor }}>
          {stage.label}
        </span>
      </div>

      {/* Options */}
      <div className="py-1">
        {options.map((opt) => {
          const isActive = opt.key === normalizedCurrent;
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(opt.key);
              }}
              className={`
                w-full px-3 py-1.5 flex items-center gap-2 text-left
                transition-colors duration-100 cursor-pointer
                ${isActive
                  ? "bg-emerald-50/80 dark:bg-emerald-950/20"
                  : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                }
              `}
            >
              <Icon
                className="w-3 h-3 shrink-0"
                style={{ color: isActive ? stageColor : `${stageColor}80` }}
              />
              <span
                className={`text-xs flex-1 truncate ${
                  isActive
                    ? "font-semibold text-neutral-900 dark:text-neutral-100"
                    : "font-medium text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {opt.label}
              </span>
              {isActive && (
                <Check className="w-3 h-3 shrink-0" style={{ color: stageColor }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

const DEMANDAS_SECOES_KEY = "demandas-sheet-sections-open";

export function DemandaQuickPreview({
  demanda,
  open,
  onOpenChange,
  onStatusChange,
  onAtoChange,
  onPrazoChange,
  onAtribuicaoChange,
  onTipoProcessoChange,
  onProcessoNumeroChange,
  onVincularProcesso,
  searchProcessosFn,
  onProcessoQueryChange,
  loadingProcessoSearch,
  onAssistidoNomeChange,
  onStatusPrisionalChange,
  onAgendarAudiencia,
  initialNovoRegistro,
  onArchive,
  onDelete,
  onNavigate,
  copyToClipboard,
  atribuicaoIcons,
  currentIndex,
  totalCount,
}: DemandaQuickPreviewProps) {
  const [openMap, setOpenMap] = useState<Record<SecaoId, boolean>>(() => {
    let persisted: Record<string, boolean> = {};
    try { persisted = JSON.parse(localStorage.getItem(DEMANDAS_SECOES_KEY) || "{}"); } catch { /* ignore */ }
    const def = (id: SecaoId, fallback: boolean) =>
      persisted[id] !== undefined ? persisted[id] : fallback;
    return {
      registros: def("registros", true),
      "proxima-audiencia": def("proxima-audiencia", true),
      identificacao: def("identificacao", false),
      cronologia: def("cronologia", false),
      oficio: def("oficio", false),
      autos: def("autos", false),
      recursos: def("recursos", false),
    };
  });

  const setSecaoOpen = useCallback((id: SecaoId, open: boolean) => {
    setOpenMap((prev) => {
      const next = { ...prev, [id]: open };
      try { localStorage.setItem(DEMANDAS_SECOES_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSecao, setActiveSecao] = useState<string | undefined>();

  const handleJump = useCallback((id: string) => {
    setSecaoOpen(id as SecaoId, true);
    requestAnimationFrame(() => {
      scrollRef.current
        ?.querySelector(`[data-section-id="${id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [setSecaoOpen]);

  const [timelineOpen, setTimelineOpen] = useState(false);
  const [novoRegistroOpen, setNovoRegistroOpen] = useState(!!initialNovoRegistro);
  // Modal "ler os autos lado a lado" — agora é OPT-IN explícito (não abre mais
  // junto do "Adicionar registro", que é o editor enxuto inline).
  const [registroComAutosOpen, setRegistroComAutosOpen] = useState(false);

  // Quando o preview é aberto pelo atalho "Adicionar registro" no card,
  // expande o painel de registro automaticamente.
  useEffect(() => {
    if (open && initialNovoRegistro) setNovoRegistroOpen(true);
  }, [open, initialNovoRegistro]);
  const [activeStagePopover, setActiveStagePopover] = useState<number | null>(null);
  const stageRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [stageRect, setStageRect] = useState<DOMRect | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const uploadFile = trpc.drive.uploadFile.useMutation();

  // Drive folder query — only loads when docs panel is open
  const {
    data: driveFolder,
    isLoading: driveFolderLoading,
    refetch: refetchDriveFolder,
  } = trpc.drive.getDemandaFolder.useQuery(
    { demandaId: demanda?.id ?? "" },
    { enabled: openMap.autos && !!demanda?.id, staleTime: 30_000 }
  );

  const createDriveFolder = trpc.drive.createDemandaFolder.useMutation({
    onSuccess: () => { void refetchDriveFolder(); },
  });

  // Próxima audiência do processo — query dedicada que ignora canceladas e
  // realizadas (a antiga list+find mostrava audiência cancelada por
  // redesignação como se ainda estivesse de pé)
  const { data: proximaAudiencia, refetch: refetchAudiencias } =
    trpc.audiencias.proximaAgendada.useQuery(
      { processoId: demanda?.processoId ?? 0 },
      { enabled: !!demanda?.processoId && open }
    );

  // Pasta do assistido no Drive — onde ficam PDFs de análise + mídias.
  // Query lightweight (só driveFolderId), só corre quando o sheet está aberto.
  const { data: assistidoDrive } = trpc.assistidos.getDriveFolder.useQuery(
    { id: demanda?.assistidoId ?? 0 },
    { enabled: !!demanda?.assistidoId && open },
  );
  const driveFolderUrl = assistidoDrive?.driveFolderId
    ? `https://drive.google.com/drive/folders/${assistidoDrive.driveFolderId}`
    : null;

  // Mídias do assistido (áudios/vídeos) — strip de thumbnails inline.
  const { data: midiasData } = trpc.drive.midiasByAssistido.useQuery(
    { assistidoId: demanda?.assistidoId ?? 0 },
    { enabled: !!demanda?.assistidoId && open },
  );
  const midiasFlat: any[] = useMemo(() => {
    if (!midiasData) return [];
    const fromGroups = (midiasData.processos ?? []).flatMap((g: any) => g.files);
    return [...fromGroups, ...(midiasData.ungrouped ?? [])];
  }, [midiasData]);

  // PDFs do assistido — todos os arquivos PDF na pasta.
  const { data: allFiles } = trpc.drive.filesByAssistido.useQuery(
    { assistidoId: demanda?.assistidoId ?? 0 },
    { enabled: !!demanda?.assistidoId && open },
  );
  const pdfFiles: any[] = useMemo(() => {
    if (!allFiles) return [];
    return (allFiles as any[]).filter((f) => f.mimeType === "application/pdf");
  }, [allFiles]);

  // Autos do processo (PDFs vinculados ao processo) — fonte preferida para o destaque.
  const { data: autosFilesData } = trpc.drive.filesByProcesso.useQuery(
    { processoId: demanda?.processoId ?? 0 },
    { enabled: !!demanda?.processoId && open },
  );

  // Autos agrupados por processo (deste processo / correlacionados / outros) —
  // fonte primária para ordenação quando há processoId.
  const { data: autosAgrupados } = trpc.drive.autosDoProcesso.useQuery(
    { processoId: demanda?.processoId ?? 0, assistidoId: demanda?.assistidoId ?? undefined },
    { enabled: !!demanda?.processoId && open },
  );

  // Lista única de PDFs para visualização inline (autos do processo primeiro,
  // depois PDFs do assistido), de-duplicada e ranqueada (autos no topo).
  const previewFiles: PreviewFile[] = useMemo(() => {
    const toPF = (f: any): PreviewFile => ({
      driveFileId: f.driveFileId,
      name: f.name,
      mimeType: f.mimeType,
      webViewLink: f.webViewLink,
      fileSize: f.fileSize,
      enrichmentStatus: f.enrichmentStatus,
    });
    if (autosAgrupados) {
      const ordered = [
        ...autosAgrupados.desteProcesso,
        ...autosAgrupados.correlacionados.flatMap((g: any) => g.files),
        ...autosAgrupados.outros,
      ];
      const seen = new Set<string>();
      const dedup = ordered.filter((f: any) => f.driveFileId && !seen.has(f.driveFileId) && seen.add(f.driveFileId));
      return dedup.map(toPF);
    }
    // fallback atual (autosFilesData + pdfFiles + rankAutos) permanece
    const autos = ((autosFilesData as any[]) ?? []).filter(
      (f) => f.mimeType === "application/pdf",
    );
    const merged = [...autos, ...pdfFiles];
    const seen = new Set<string>();
    const dedup: any[] = [];
    for (const f of merged) {
      if (f.driveFileId && !seen.has(f.driveFileId)) {
        seen.add(f.driveFileId);
        dedup.push(f);
      }
    }
    return rankAutos(dedup).map(toPF);
  }, [autosAgrupados, autosFilesData, pdfFiles]);

  const primaryAutos = previewFiles[0] ?? null;
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  // Doca à esquerda: PDF dos autos ancorado ao lado do conteúdo (sheet segue ativo).
  const [docaAutos, setDocaAutos] = useState<{ fileId: string; page?: number } | null>(null);
  // Largura ajustável do sheet enquanto a doca de autos está aberta — alça de
  // arraste na borda esquerda, persistida, duplo-clique reseta. Mesmo hook do
  // sheet da Agenda (evita o full-screen que "desregulava" a largura).
  const {
    sheetW,
    dragging: draggingDivider,
    startDrag: startDividerDrag,
    reset: resetSheetW,
    pct: pctSheetW,
    isMobile: sheetIsMobile,
  } = useSheetWidthResize({ storageKey: "ombuds_demanda_doca_split_v1", defaultRatio: 0.42 });
  const previewSelected = useMemo(
    () => previewFiles.find((f) => f.driveFileId === previewFileId) ?? null,
    [previewFiles, previewFileId],
  );

  // Close popover / recolhe a doca quando demanda muda ou o sheet fecha
  useEffect(() => {
    setActiveStagePopover(null);
    setDocaAutos(null);
  }, [demanda?.id, open]);

  // Atalhos de teclado quando o sheet está aberto:
  //   n          → abrir editor de novo registro (se ainda não está aberto)
  //   Cmd/Ctrl+K → focar campo de busca dentro do Registros
  // Esc/↑/↓ continuam tratados pelos handlers existentes do Sheet.
  // Ignoramos quando o foco está em input/textarea pra não atrapalhar digitação.
  useEffect(() => {
    if (!open || !demanda) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      );

      if (!inField && e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (demanda.assistidoId && !novoRegistroOpen) {
          e.preventDefault();
          setNovoRegistroOpen(true);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        const input = document.querySelector<HTMLInputElement>(
          'input[data-registros-search="true"]',
        );
        if (input) {
          e.preventDefault();
          input.focus();
          input.select();
          return;
        }
        // Busca colapsada: clica na lupa pra expandir; o useEffect interno foca o input
        const trigger = document.querySelector<HTMLButtonElement>(
          'button[data-registros-search-trigger="true"]',
        );
        if (trigger) {
          e.preventDefault();
          trigger.click();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, demanda, novoRegistroOpen]);

  // Scroll-spy — destaca na ToC a seção visível mais ao topo do scroll.
  // Reanexa o observer quando o sheet (re)abre ou a demanda muda (as seções
  // [data-section-id] mudam junto). Consulta o DOM ao vivo, então pega as
  // CollapsibleSections renderizadas pelo manifesto.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    let io: IntersectionObserver | null = null;
    const attach = () => {
      io?.disconnect();
      const els = root.querySelectorAll<HTMLElement>("[data-section-id]");
      if (!els.length) return;
      io = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          const first = visible[0]?.target.getAttribute("data-section-id");
          if (first) setActiveSecao(first);
        },
        { root, rootMargin: "-10% 0px -70% 0px", threshold: 0 }
      );
      els.forEach((el) => io!.observe(el));
    };
    attach();
    const mo = new MutationObserver(() => attach());
    mo.observe(root, { childList: true, subtree: true });
    return () => { io?.disconnect(); mo.disconnect(); };
  }, [open, demanda?.id]);

  // Handle file uploads to the demanda's Drive folder
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length || !driveFolder?.folderId) return;

      // Reset input so same file can be re-selected
      e.target.value = "";

      for (const file of files) {
        const fileName = file.name;
        setUploadingFiles((prev) => [...prev, fileName]);
        try {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );
          await uploadFile.mutateAsync({
            folderId: driveFolder.folderId,
            fileName,
            mimeType: file.type || "application/octet-stream",
            fileBase64: `data:${file.type || "application/octet-stream"};base64,${base64}`,
            description: `Enviado via OMBUDS — Demanda ${demanda?.id}`,
          });
          toast.success(`${fileName} enviado`, { description: "Arquivo salvo na pasta do Drive." });
          void refetchDriveFolder();
        } catch (err) {
          console.error("[DemandaQuickPreview] Upload error:", err);
          toast.error(`Erro ao enviar ${fileName}`);
        } finally {
          setUploadingFiles((prev) => prev.filter((n) => n !== fileName));
        }
      }
    },
    [driveFolder?.folderId, demanda?.id, uploadFile, refetchDriveFolder]
  );

  // Task 6 (registros tipados): handleAudioUpload removido junto com o textarea de
  // Providências. Áudios agora são tratados pela timeline de registros (tipo=atendimento)
  // através do RegistroEditor, que oferece o fluxo unificado de áudio + Plaud.

  if (!demanda) return null;

  const statusConfig = getStatusConfig(demanda.status);
  const statusColor = STATUS_GROUPS[statusConfig.group]?.color || "#A1A1AA";
  const atribuicaoColor = ATRIBUICAO_BORDER_COLORS[demanda.atribuicao] || "#71717a";
  const AtribuicaoIcon = atribuicaoIcons[demanda.atribuicao] || Scale;
  const isPreso = demanda.estadoPrisional === "preso";
  const isUrgente = demanda.prioridade === "URGENTE" || demanda.prioridade === "REU_PRESO";

  const statusOptions = Object.entries(DEMANDA_STATUS).map(([k, v]) => ({
    value: k,
    label: v.label,
    color: STATUS_GROUPS[v.group].color,
    group: v.group,
  }));

  // Atos categorizados/ordenados — fonte única em atos-por-atribuicao.ts,
  // compartilhada com os cards do kanban.
  const atoOptions = getAtoOptionsAgrupados(demanda.atribuicao);

  const processo = demanda.processos?.[0];
  // Stub do importador (SN-<timestamp>) ou vazio: tratamos como "sem número"
  // — escondemos o stub e oferecemos adicionar/colar o CNJ ou vincular.
  const isProcStub = !processo?.numero || /^SN-/i.test(processo.numero);
  const currentStageIdx = getStageIndex(statusConfig.group);
  const oficioSugerido = sugerirOficio(demanda.ato, demanda.providencias);

  // ============================================
  // MANIFESTO — corpo do sheet dirigido por seções colapsáveis
  // ============================================
  const recursosCount = (midiasFlat?.length ?? 0) + (pdfFiles?.length ?? 0);

  const secoesMap: SecoesMap = {
    registros: {
      label: "Registros",
      temDado: true,
      node: demanda.assistidoId ? (
        <div className="space-y-3">
          {!novoRegistroOpen && (
            <div className="flex items-center justify-end gap-1">
              {/* Opt-in: registrar lendo os autos lado a lado (modal). Só quando há PDFs. */}
              {previewFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRegistroComAutosOpen(true)}
                  title="Registrar lendo os autos lado a lado"
                  aria-label="Registrar com autos"
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer p-1 md:px-2 md:py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Com autos</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setNovoRegistroOpen(true)}
                title="Adicionar registro (n)"
                aria-label="Adicionar registro"
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer p-1 -mr-1 md:px-2 md:py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Adicionar</span>
              </button>
            </div>
          )}
          {/* "Adicionar" abre o editor enxuto inline (sem PDF). Ler os autos lado a
              lado é opt-in pelo botão "Com autos" → RegistroComAutosDialog abaixo. */}
          {novoRegistroOpen && (
            <RegistroEditor
              assistidoId={demanda.assistidoId}
              processoId={demanda.processoId ?? undefined}
              demandaId={Number(demanda.id)}
              tipoDefault="ciencia"
              tiposPrimarios={[
                "ciencia",
                "providencia",
                "diligencia",
                "atendimento",
                "delegacao",
                "anotacao",
                "peticao",
              ]}
              onSaved={() => {
                setNovoRegistroOpen(false);
                refetchAudiencias();
              }}
              onCancel={() => setNovoRegistroOpen(false)}
            />
          )}
          <RegistrosTimeline
            assistidoId={demanda.assistidoId}
            processoId={demanda.processoId ?? undefined}
            demandaId={Number(demanda.id)}
            emptyHint="Sem registros nesta demanda."
          />
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground italic">
          Vincule um assistido para registrar providências e atendimentos.
        </div>
      ),
    },
    "proxima-audiencia": {
      label: "Próxima audiência",
      temDado: !!proximaAudiencia,
      node: proximaAudiencia ? (
        <ProximaAudienciaBlock
          audiencia={proximaAudiencia}
          onChanged={() => refetchAudiencias()}
        />
      ) : null,
    },
    identificacao: {
      label: "Identificação",
      temDado: true,
      node: (
        <IdentificacaoSecao
          demanda={demanda}
          onAtribuicaoChange={onAtribuicaoChange}
          onTipoProcessoChange={onTipoProcessoChange}
          onAssistidoNomeChange={onAssistidoNomeChange}
          onStatusPrisionalChange={onStatusPrisionalChange}
          atribuicaoIcons={atribuicaoIcons}
        />
      ),
    },
    cronologia: {
      label: "Cronologia & Prazo",
      temDado: true,
      node: <CronologiaSecao demanda={demanda} onPrazoChange={onPrazoChange} />,
    },
    oficio: {
      label: "Ofício sugerido",
      temDado: !!oficioSugerido,
      node: oficioSugerido ? (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <Mail className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Com base no ato &ldquo;{demanda.ato}&rdquo;
            </span>
            <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
              {oficioSugerido.tipoLabel}
            </span>
          </div>
          <Link
            href={`/admin/oficios/novo?demandaId=${demanda.id}${demanda.assistidoId ? `&assistidoId=${demanda.assistidoId}` : ""}${demanda.processoId ? `&processoId=${demanda.processoId}` : ""}&tipo=${oficioSugerido.tipoOficio}`}
            className="ml-7 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors group/oficio cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            Gerar Ofício
            <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover/oficio:opacity-100 group-hover/oficio:translate-x-0 transition-all" />
          </Link>
        </div>
      ) : null,
    },
    autos: {
      label: "Autos & Documentos",
      temDado: previewFiles.length > 0 || !!demanda.processoId || !!demanda.assistidoId,
      count: previewFiles.length || undefined,
      node: (
        <AutosSecao
          processoId={demanda.processoId}
          assistidoId={demanda.assistidoId}
          primaryAutos={primaryAutos}
          previewFiles={previewFiles}
          driveFolder={driveFolder}
          driveFolderLoading={driveFolderLoading}
          uploadingFiles={uploadingFiles}
          createDriveFolderPending={createDriveFolder.isPending}
          onOpenDoca={(fileId, page) => setDocaAutos({ fileId, page })}
          onOpenPreview={setPreviewFileId}
          onUploadFiles={handleFileUpload}
          onCreateDriveFolder={() => createDriveFolder.mutate({ demandaId: demanda.id })}
        />
      ),
    },
    recursos: {
      label: "Recursos",
      temDado: recursosCount > 0,
      count: recursosCount || undefined,
      node: (
        <RecursosSecao
          midiasFlat={midiasFlat}
          pdfFiles={pdfFiles}
          driveFolderUrl={driveFolderUrl}
          onOpenPreview={(fileId) => setDocaAutos({ fileId })}
        />
      ),
    },
  };

  const manifesto = resolverManifesto();
  const visibleSections = manifesto.filter((id) => secoesMap[id].temDado);
  const tocSections = toToCSections(manifesto, secoesMap);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "max-w-full p-0 flex flex-col [&>button:first-of-type]:hidden rounded-l-2xl sm:rounded-l-none border-l-0 outline-none shadow-2xl bg-[#f7f7f7] dark:bg-neutral-950",
          // Docado: o sheet vira a coluna de conteúdo com largura ajustável (sheetW
          // inline) e o PDF dos autos ancora à esquerda até a borda do sheet.
          // sm:max-w-none anula o sm:max-w-sm da variante (senão clampa em 384px).
          docaAutos
            ? cn("w-full max-w-none sm:max-w-none", !draggingDivider && "transition-[width] duration-300 ease-out")
            : "w-full sm:w-[600px] md:w-[780px] lg:w-[920px] xl:w-[1040px]",
        )}
        style={docaAutos && !sheetIsMobile ? { width: sheetW } : undefined}
        onPointerDownOutside={(e) => {
          const target = (e as any).detail?.originalEvent?.target as HTMLElement ?? e.target as HTMLElement;
          if (
            target?.closest?.('[data-radix-popper-content-wrapper]') ||
            target?.closest?.('[data-radix-select-content]') ||
            target?.closest?.('[data-inline-dropdown-portal]') ||
            target?.closest?.('[role="listbox"]') ||
            target?.closest?.('[role="option"]') ||
            target?.closest?.('[cmdk-root]')
          ) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = (e as any).detail?.originalEvent?.target as HTMLElement ?? e.target as HTMLElement;
          if (
            target?.closest?.('[data-radix-popper-content-wrapper]') ||
            target?.closest?.('[data-radix-select-content]') ||
            target?.closest?.('[data-inline-dropdown-portal]') ||
            target?.closest?.('[role="listbox"]') ||
            target?.closest?.('[role="option"]') ||
            target?.closest?.('[cmdk-root]')
          ) {
            e.preventDefault();
          }
        }}
      >
        {/* ===== DOCA À ESQUERDA — PDF dos autos ancorado da borda esquerda até o
            sheet (right: sheetW). O sheet mantém sua largura (ajustável) e segue
            ativo. Padrão idêntico ao sheet da Agenda. ===== */}
        {docaAutos && (
          <div
            className="hidden sm:flex flex-col fixed inset-y-0 left-0 z-50 overflow-hidden border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-2xl animate-in fade-in slide-in-from-left-6 duration-300 ease-out"
            style={{ right: sheetIsMobile ? 0 : sheetW }}
          >
            {/* Leitor rico (PdfViewerModal embedded) — grifos/sublinhados/notas
                persistidos por defensor, índice de atos e navegação entre PDFs.
                Mesmo componente usado pelo sheet da Agenda. O próprio viewer traz
                o header e o botão de fechar (onClose recolhe a doca). */}
            <AutosModalViewer
              driveFileId={docaAutos.fileId}
              processoId={typeof demanda.processoId === "number" ? demanda.processoId : null}
              onClose={() => setDocaAutos(null)}
            />
          </div>
        )}

        {/* Alça de largura — borda esquerda do sheet. Arraste p/ ajustar, duplo-
            clique reseta, o valor fica salvo. Só aparece no modo doca. */}
        {docaAutos && (
          <>
            <div
              onPointerDown={startDividerDrag}
              onDoubleClick={resetSheetW}
              title="Arraste para ajustar a largura · duplo-clique reseta · fica salvo"
              className="hidden sm:flex absolute inset-y-0 left-0 -ml-1.5 w-3 z-[60] cursor-col-resize items-center justify-center group/resize"
            >
              <div
                className={cn(
                  "h-14 w-1 rounded-full transition-all",
                  draggingDivider
                    ? "bg-emerald-500 w-1.5"
                    : "bg-neutral-300/70 dark:bg-neutral-700 group-hover/resize:bg-emerald-400 group-hover/resize:h-20",
                )}
              />
            </div>
            {draggingDivider && (
              <div className="hidden sm:block absolute top-3 left-3 z-[61] px-2 py-1 rounded-md bg-neutral-900 text-white text-[10px] font-semibold tabular-nums shadow-lg pointer-events-none">
                {Math.round(sheetW)}px · {pctSheetW}%
              </div>
            )}
          </>
        )}

        <div className="flex-1 flex min-h-0">
          {/* ===== CONTEÚDO DO SHEET (preservado integralmente) ===== */}
          <div className="flex flex-col min-h-0 min-w-0 flex-1">
        {/* ===== NAV HEADER — claro + faixa fina da atribuição (idêntico ao
            event-detail-sheet da agenda). O peso visual vira acento da paleta,
            não bloco preto. ===== */}
        <div className="h-1 w-full shrink-0 transition-colors duration-300" style={{ backgroundColor: atribuicaoColor }} aria-hidden />
        <div className="bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5 flex items-center justify-between">
          <SheetHeader className="p-0 min-w-0 flex-1">
            <SheetTitle className="text-[13px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
              {demanda.assistido ? (
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-neutral-400 dark:text-neutral-500 font-normal shrink-0">
                    {demanda.ato || "Demanda"} ·
                  </span>
                  <span className="truncate">{demanda.assistido}</span>
                </span>
              ) : (
                demanda.ato || "Demanda"
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-1">
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate("prev")}
                  className="w-7 h-7 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center"
                  title="Anterior (↑)"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                {currentIndex != null && totalCount != null && (
                  <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 tabular-nums min-w-[40px] text-center">
                    {currentIndex + 1}/{totalCount}
                  </span>
                )}
                <button
                  onClick={() => onNavigate("next")}
                  className="w-7 h-7 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center"
                  title="Próximo (↓)"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center cursor-pointer ml-1 transition-colors"
              title="Fechar (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {/* ===== HERO CARD — ring neutro + shadow sutil. Identidade da
              atribuição vive no avatar colorido (substitui o border-l). ===== */}
          <div className="mx-3 mt-3 mb-4 px-4 py-3.5 rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm">
            <div className="flex items-start gap-3">
              {/* Avatar colorido — única fonte de identidade visual da atribuição. */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300"
                style={{
                  backgroundColor: `${atribuicaoColor}14`,
                  boxShadow: `inset 0 0 0 1px ${atribuicaoColor}40`,
                }}
              >
                <span className="text-sm font-semibold" style={{ color: atribuicaoColor }}>
                  {iniciaisNome(demanda.assistido || "")}
                </span>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                {/* Linha 1: Nome + flags (preso/urgente) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 leading-tight truncate">
                    {demanda.assistido}
                  </h2>
                  {isPreso && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
                      <Lock className="w-2.5 h-2.5" /> Preso
                    </span>
                  )}
                  {isUrgente && (
                    <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  )}
                </div>

                {/* Linha 2 — duas pills editáveis: ATO + STATUS.
                    Atribuição migrou para baixo do avatar (coluna esquerda),
                    deixando esta linha mais limpa e sem risco de wrap. */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <InlineDropdown
                    value={demanda.ato}
                    compact
                    displayValue={
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors hover:brightness-95"
                        style={{
                          backgroundColor: `${atribuicaoColor}14`,
                          color: atribuicaoColor,
                          boxShadow: `inset 0 0 0 1px ${atribuicaoColor}26`,
                        }}
                        title={demanda.ato || "Selecionar ato"}
                      >
                        <span className="truncate max-w-[200px]">
                          {demanda.ato || <span className="opacity-60 italic">Definir ato</span>}
                        </span>
                      </span>
                    }
                    options={atoOptions}
                    onChange={(v) => onAtoChange(demanda.id, v)}
                    layout="accordion"
                  />
                  <InlineDropdown
                    value={demanda.status}
                    compact
                    displayValue={
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100/80 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/60 transition-colors"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: statusColor }}
                        />
                        {statusConfig.label}
                      </span>
                    }
                    options={statusOptions}
                    onChange={(v) => onStatusChange(demanda.id, v)}
                  />
                </div>

                {/* Linha 3 — processo. Número real = chip copiável (tipo cinza +
                    CNJ). Stub do importador (SN-...) = escondido; no lugar, um
                    chip "Adicionar nº do processo" que abre o editor inline
                    (texto livre p/ colar o CNJ, ou buscar e vincular a um
                    processo existente). */}
                {(processo || (onProcessoNumeroChange && searchProcessosFn)) && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {!isProcStub && processo && (
                      <button
                        className="inline-flex items-center gap-1.5 px-1 py-0.5 -ml-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800/60 group/proc cursor-pointer transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          copyToClipboard(processo.numero, "Processo copiado!");
                        }}
                        title={`Copiar número${processo.tipo ? ` (${processo.tipo})` : ""}`}
                      >
                        {processo.tipo && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                            {processo.tipo}
                          </span>
                        )}
                        <span className="font-mono text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400 group-hover/proc:text-neutral-700 dark:group-hover/proc:text-neutral-200 transition-colors">{processo.numero}</span>
                        <Copy className="w-2.5 h-2.5 text-neutral-400 group-hover/proc:text-neutral-600 transition-colors" />
                      </button>
                    )}
                    {onProcessoNumeroChange && searchProcessosFn ? (
                      <InlineAutocomplete
                        value=""
                        valueId={demanda.processoId ?? undefined}
                        placeholder={isProcStub ? "Adicionar nº do processo" : "Editar / vincular"}
                        searchFn={searchProcessosFn}
                        onQueryChange={onProcessoQueryChange}
                        isLoading={loadingProcessoSearch}
                        onSelect={(pid, numero) => onVincularProcesso?.(demanda.id, pid, numero)}
                        onTextChange={(t) => onProcessoNumeroChange(demanda.id, t)}
                        icon="briefcase"
                        className={cn(
                          "cursor-pointer rounded-md px-1.5 py-0.5 -ml-1 inline-flex items-center gap-1 transition-colors text-[11px]",
                          isProcStub
                            ? "border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                            : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
                        )}
                      />
                    ) : (
                      isProcStub && (
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 italic">sem número</span>
                      )
                    )}
                  </div>
                )}
              </div>
              {/* Coluna direita: ícones de navegação (Assistido/Drive/Processo).
                  Atribuição voltou pra ser o 3º pill na linha 2 — não compete
                  com as ações de navegação aqui e abre o dropdown sem cortar. */}
              {(demanda.assistidoId || driveFolderUrl) && (
              <div className="flex flex-col items-center gap-0.5 shrink-0 -mr-1">
                {(demanda.substatus || demanda.status || "").toLowerCase() !== "ciencia" && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onStatusChange(demanda.id, "ciencia"); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Dar ciência (move para status Ciência)"
                    aria-label="Dar ciência"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                {demanda.assistidoId && (
                  <Link
                    href={`/admin/assistidos/${demanda.assistidoId}`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    title="Ver assistido"
                  >
                    <User className="w-3.5 h-3.5" />
                  </Link>
                )}
                  {driveFolderUrl && (
                    <a
                      href={driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Abrir pasta no Drive (análises, mídias)"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </a>
                  )}
              </div>
              )}
            </div>
          </div>

          {/* ===== PIPELINE STEPPER ===== */}
          <div className="px-5 pb-4 pt-1">
            {/* Track + nodes */}
            <div className="relative flex items-center">
              {/* Background track */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-neutral-200 dark:bg-neutral-700/60 rounded-full" />
              {/* Filled track (neutral — only current stage has color) */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full transition-all duration-500 bg-[#c8c8cc] dark:bg-neutral-600"
                style={{
                  width: currentStageIdx >= 0 ? `${(currentStageIdx / (PIPELINE_STAGES.length - 1)) * 100}%` : "0%",
                }}
              />
              {/* Stage nodes */}
              {PIPELINE_STAGES.map((stage, i) => {
                const isActive = i === currentStageIdx;
                const isCompleted = i < currentStageIdx;
                const isPopoverOpen = activeStagePopover === i;
                const stageColor = STATUS_GROUPS[stage.key]?.color || "#A1A1AA";

                return (
                  <button
                    key={stage.key}
                    ref={(el) => { stageRefs.current[i] = el; }}
                    onClick={() => {
                      if (activeStagePopover === i) {
                        setActiveStagePopover(null);
                        return;
                      }
                      const rect = stageRefs.current[i]?.getBoundingClientRect();
                      if (rect) {
                        setStageRect(rect);
                        setActiveStagePopover(i);
                      }
                    }}
                    className={`relative z-10 flex flex-col items-center cursor-pointer group/stage transition-all min-w-0 ${
                      i === 0 ? "" : "flex-1"
                    }`}
                    title={`${stage.label} — clique para escolher substatus`}
                  >
                    {/* Node */}
                    <div
                      className={`flex items-center justify-center rounded-full transition-all duration-300 ${
                        isActive
                          ? "w-6 h-6 ring-2 ring-offset-2 dark:ring-offset-neutral-900"
                          : isCompleted
                            ? "w-5 h-5"
                            : isPopoverOpen
                              ? "w-5 h-5 ring-2 ring-offset-1 dark:ring-offset-neutral-900"
                              : "w-4 h-4 group-hover/stage:w-5 group-hover/stage:h-5"
                      }`}
                      style={{
                        backgroundColor: isActive ? stageColor : isCompleted ? "#a1a1aa" : isPopoverOpen ? `${stageColor}80` : "#e4e4e7",
                        ['--tw-ring-color' as any]: (isActive || isPopoverOpen) ? `${stageColor}40` : undefined,
                      }}
                    >
                      {isCompleted && <Check className="w-3 h-3 text-white/80" />}
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    {/* Label — truncate com ellipsis e tooltip nativo no title acima */}
                    <span
                      className={`mt-1.5 text-[10px] font-medium leading-tight max-w-full px-0.5 text-center truncate transition-colors ${
                        isActive || isPopoverOpen ? "font-bold" : "text-neutral-400 dark:text-neutral-500"
                      }`}
                      style={{
                        color: isActive || isPopoverOpen ? stageColor : undefined,
                      }}
                    >
                      <span className="hidden md:inline">{stage.label}</span>
                      <span className="md:hidden">{stage.short}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Stage substatus popover */}
            {activeStagePopover !== null && stageRect && (
              <StageSubstatusPopover
                stage={PIPELINE_STAGES[activeStagePopover]}
                anchorRect={stageRect}
                currentStatus={demanda.substatus || demanda.status}
                onSelect={(status) => {
                  onStatusChange(demanda.id, status);
                  setActiveStagePopover(null);
                }}
                onClose={() => setActiveStagePopover(null)}
              />
            )}
          </div>

          {/* ===== ToC STICKY — gruda no topo do scroll quando hero+pipeline
              passam; scroll-spy destaca a seção visível, clique pula-e-abre. ===== */}
          <SheetToC sections={tocSections} activeId={activeSecao} onJump={handleJump} />

          {/* ===== CARD SECTIONS — corpo dirigido pelo manifesto ===== */}
          <div className="px-4 sm:px-5 pb-4 space-y-3">
            {visibleSections.map((id) => (
              <CollapsibleSection
                key={id}
                id={id}
                label={secoesMap[id].label}
                count={secoesMap[id].count}
                storageKey={DEMANDAS_SECOES_KEY}
                open={openMap[id]}
                onOpenChange={(o) => setSecaoOpen(id, o)}
              >
                {secoesMap[id].node}
              </CollapsibleSection>
            ))}

            {/* ===== AÇÕES RÁPIDAS (fixo — não colapsável) ===== */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden">
              <div className="flex divide-x divide-neutral-200/40 dark:divide-neutral-800/40">
                {onAgendarAudiencia && (
                  <button
                    type="button"
                    onClick={() => onAgendarAudiencia(demanda.id)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    Agendar audiência
                  </button>
                )}
                {onPrazoChange && (
                  <button
                    type="button"
                    onClick={() => {
                      // Foca no InlineDatePicker do Prazo via querySelector
                      const wrapper = document.querySelector<HTMLElement>(
                        `[data-prazo-trigger='${demanda.id}']`
                      );
                      const btn = wrapper?.querySelector<HTMLButtonElement>("button[data-edit-trigger]")
                        ?? wrapper?.querySelector<HTMLButtonElement>("button");
                      btn?.click();
                    }}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    Adicionar prazo
                  </button>
                )}
                {processo?.numeroAutos && (
                  <button
                    type="button"
                    onClick={() => {
                      const cnj = processo.numeroAutos!;
                      navigator.clipboard.writeText(cnj).then(
                        () => toast.success("CNJ copiado", {
                          description: "Cole (Cmd+V) no campo de busca do PJe.",
                          duration: 4000,
                        }),
                        () => toast.info("Abrindo PJe", {
                          description: `Buscar pelo CNJ: ${cnj}`,
                          duration: 5000,
                        }),
                      );
                      window.open(
                        "https://pje.tjba.jus.br/pje/ConsultaProcesso/listView.seam",
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:text-purple-700 dark:hover:text-purple-400 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir no PJe
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== STICKY ACTIONS BOTTOM BAR ===== */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200/40 dark:border-neutral-800/60 px-5 py-2.5 flex items-center gap-2">
          <button
            onClick={() => { onStatusChange(demanda.id, "resolvido"); onOpenChange(false); }}
            className="flex-1 h-8 rounded-xl bg-emerald-500 text-white shadow-sm text-[11px] font-semibold hover:bg-emerald-600 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Resolver
          </button>
          <button
            onClick={() => setTimelineOpen(true)}
            title="Histórico"
            className="h-8 w-8 rounded-xl ring-1 ring-neutral-200/60 dark:ring-neutral-800/60 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-150 cursor-pointer flex items-center justify-center"
          >
            <History className="w-3 h-3" />
          </button>
          <button
            onClick={() => { onArchive(demanda.id); onOpenChange(false); }}
            className="h-8 px-3.5 rounded-xl bg-white/[0.08] text-neutral-500 dark:text-neutral-400 ring-1 ring-neutral-200/60 dark:ring-neutral-800/60 text-[11px] font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-150 cursor-pointer flex items-center gap-1.5"
          >
            <Archive className="w-3 h-3" />
            Arquivar
          </button>
          <button
            onClick={() => { onDelete(demanda.id); onOpenChange(false); }}
            className="h-8 w-8 rounded-xl ring-1 ring-neutral-200/60 dark:ring-neutral-800/60 text-neutral-400 hover:text-rose-500 hover:ring-rose-200 dark:hover:ring-rose-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-150 cursor-pointer flex items-center justify-center"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Visualizador inline de PDF (autos + PDFs do assistido) — sem sair da plataforma */}
        <DocumentPreviewDialog
          driveFileId={previewFileId}
          title={previewSelected?.name ?? "Documento"}
          mimeType={previewSelected?.mimeType}
          webViewLink={previewSelected?.webViewLink}
          fileSize={previewSelected?.fileSize != null ? String(previewSelected.fileSize) : null}
          enrichmentStatus={previewSelected?.enrichmentStatus}
          list={previewFiles}
          onNavigate={(f) => setPreviewFileId(f.driveFileId)}
          onClose={() => setPreviewFileId(null)}
        />

        {/* Registro lendo os autos (split view) — OPT-IN pelo botão "Com autos". */}
        {demanda.assistidoId && previewFiles.length > 0 && (
          <RegistroComAutosDialog
            open={registroComAutosOpen}
            onOpenChange={setRegistroComAutosOpen}
            assistidoId={demanda.assistidoId}
            processoId={demanda.processoId ?? undefined}
            demandaId={Number(demanda.id)}
            tipoDefault="ciencia"
            tiposPrimarios={[
              "ciencia",
              "providencia",
              "diligencia",
              "atendimento",
              "delegacao",
              "anotacao",
              "peticao",
            ]}
            files={previewFiles}
            onSaved={() => {
              refetchAudiencias();
            }}
          />
        )}
          </div>
        </div>
      </SheetContent>
      <DemandaTimelineDrawer
        isOpen={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        demandaId={typeof demanda.id === "string" ? parseInt(demanda.id, 10) : demanda.id}
        assistidoNome={demanda.assistido}
      />
    </Sheet>
  );
}

/**
 * Bloco "Próxima Audiência" com edição/exclusão inline — quando o parsing da
 * ciência erra (hora 00:00, tipo trocado) ou a audiência caiu, o defensor
 * corrige aqui mesmo, sem sair do sheet.
 */
function ProximaAudienciaBlock({
  audiencia,
  onChanged,
}: {
  audiencia: {
    id: number;
    dataAudiencia: Date | string;
    horario: string | null;
    tipo: string | null;
    local: string | null;
  };
  onChanged: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const dt = new Date(audiencia.dataAudiencia);
  // Componentes locais de Camaçari (UTC-3) — `horario` é a fonte da verdade
  const dataLocal = dt.toLocaleDateString("en-CA", { timeZone: "America/Bahia" });
  const horaLocal =
    audiencia.horario ??
    dt.toLocaleTimeString("pt-BR", { timeZone: "America/Bahia", hour: "2-digit", minute: "2-digit" });

  const [data, setData] = useState(dataLocal);
  const [hora, setHora] = useState(horaLocal);
  const [tipo, setTipo] = useState(audiencia.tipo ?? "");
  const [local, setLocal] = useState(audiencia.local ?? "");

  const updateMut = trpc.audiencias.update.useMutation({
    onSuccess: () => {
      setEditando(false);
      onChanged();
    },
  });
  const deleteMut = trpc.audiencias.delete.useMutation({
    onSuccess: () => onChanged(),
  });

  const inputCls =
    "w-full bg-neutral-50 dark:bg-neutral-800/40 rounded-md text-xs px-2 py-1.5 outline-none border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 text-neutral-700 dark:text-neutral-300";

  return (
    <div className="group">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => {
              if (!editando) {
                setData(dataLocal);
                setHora(horaLocal);
                setTipo(audiencia.tipo ?? "");
                setLocal(audiencia.local ?? "");
              }
              setEditando((v) => !v);
            }}
            title={editando ? "Cancelar edição" : "Editar audiência"}
            aria-label={editando ? "Cancelar edição" : "Editar audiência"}
            className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            {editando ? (
              <X className="w-3 h-3 text-neutral-400" />
            ) : (
              <Pencil className="w-3 h-3 text-neutral-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Excluir esta audiência? O evento do calendário também será removido.")) {
                deleteMut.mutate({ id: audiencia.id });
              }
            }}
            title="Excluir audiência"
            aria-label="Excluir audiência"
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
          >
            <Trash2 className="w-3 h-3 text-neutral-400 hover:text-red-500" />
          </button>
        </div>
      </div>

      {editando ? (
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={cn(inputCls, "flex-1")}
            />
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className={cn(inputCls, "w-24")}
            />
          </div>
          <input
            type="text"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Tipo (ex.: Audiência de Justificação)"
            className={inputCls}
          />
          <input
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Local / vara"
            className={inputCls}
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={updateMut.isPending || !data}
              onClick={() =>
                updateMut.mutate({
                  id: audiencia.id,
                  dataAudiencia: `${data}T${hora || "00:00"}:00-03:00`,
                  horario: hora || undefined,
                  tipo: tipo.trim() || undefined,
                  local: local.trim() || undefined,
                })
              }
              className="text-[11px] px-2.5 py-1 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {updateMut.isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            {dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "America/Bahia" })}
            {audiencia.horario ? ` · ${audiencia.horario}` : ""}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
            {audiencia.tipo}
            {audiencia.local ? ` · ${audiencia.local}` : ""}
          </p>
        </>
      )}
    </div>
  );
}
