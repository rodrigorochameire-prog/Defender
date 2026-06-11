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
  ChevronRight,
  Scale,
  Calendar,
  FileText,
  User,
  Briefcase,
  Clock,
  X,
  Mail,
  ArrowRight,
  Sparkles,
  FolderOpen,
  Loader2,
  Upload,
  File,
  Image,
  FileSpreadsheet,
  History,
  Mic,
  Video,
  FileSignature,
  Plus,
  CheckSquare,
  Building2,
  CalendarPlus,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DemandaTimelineDrawer } from "@/components/demandas-premium/demanda-timeline-drawer";
import { getStatusConfig, STATUS_GROUPS, DEMANDA_STATUS, type StatusGroup } from "@/config/demanda-status";
import { getAtoOptionsAgrupados } from "@/config/atos-por-atribuicao";
import { InlineDropdown } from "@/components/shared/inline-dropdown";
import { TIPO_PROCESSO_OPTIONS } from "@/config/tipos-processo";
import { STATUS_PRISIONAL_CONFIG, STATUS_PRISIONAL_OPTIONS, type StatusPrisional } from "./status-prisional-config";
import { InlineDatePicker } from "@/components/shared/inline-date-picker";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import { RegistrosTimeline } from "@/components/registros/registros-timeline";
import { RegistroEditor } from "@/components/registros/registro-editor";
import { RegistroComAutosDialog } from "@/components/registros/registro-com-autos-dialog";
import {
  DocumentPreviewDialog,
  type PreviewFile,
} from "@/components/agenda/registro-audiencia/shared/document-preview-dialog";
import { AutosPreviewPane } from "@/components/pdf/autos-preview-pane";
import { SectionsViewer } from "@/components/drive/SectionsViewer";
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
// PRAZO BADGE
// ============================================

function calcularPrazoBadge(prazoStr: string): { texto: string; cor: "red" | "amber" | "green" | "gray" | "none" } | null {
  if (!prazoStr) return null;
  try {
    const parts = prazoStr.split("/").map(Number);
    if (parts.length < 3) return null;
    const [dia, mes, ano] = parts;
    const fullYear = ano < 100 ? 2000 + ano : ano;
    const prazo = new Date(fullYear, mes - 1, dia);
    prazo.setHours(0, 0, 0, 0);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diff = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { texto: `${Math.abs(diff)}d vencido`, cor: "red" };
    if (diff === 0) return { texto: "Hoje", cor: "red" };
    if (diff <= 3) return { texto: `${diff}d`, cor: "amber" };
    if (diff <= 7) return { texto: `${diff}d`, cor: "green" };
    return { texto: `${diff}d`, cor: "gray" };
  } catch {
    return null;
  }
}

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

export function DemandaQuickPreview({
  demanda,
  open,
  onOpenChange,
  onStatusChange,
  onAtoChange,
  onPrazoChange,
  onAtribuicaoChange,
  onTipoProcessoChange,
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
  const [docsOpen, setDocsOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [novoRegistroOpen, setNovoRegistroOpen] = useState(!!initialNovoRegistro);

  // Quando o preview é aberto pelo atalho "Adicionar registro" no card,
  // expande o painel de registro automaticamente.
  useEffect(() => {
    if (open && initialNovoRegistro) setNovoRegistroOpen(true);
  }, [open, initialNovoRegistro]);
  // Edição inline do nome do assistido. Abre quando o usuário clica na row;
  // commit no Enter/blur, cancel no Esc.
  const [editingAssistidoNome, setEditingAssistidoNome] = useState(false);
  const [assistidoDraft, setAssistidoDraft] = useState("");
  const [activeStagePopover, setActiveStagePopover] = useState<number | null>(null);
  const stageRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [stageRect, setStageRect] = useState<DOMRect | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const uploadFile = trpc.drive.uploadFile.useMutation();

  // Drive folder query — only loads when docs panel is open
  const {
    data: driveFolder,
    isLoading: driveFolderLoading,
    refetch: refetchDriveFolder,
  } = trpc.drive.getDemandaFolder.useQuery(
    { demandaId: demanda?.id ?? "" },
    { enabled: docsOpen && !!demanda?.id, staleTime: 30_000 }
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

  // Helper: icon component based on MIME type
  function DriveFileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
    if (mimeType.startsWith("image/")) return <Image className={className} />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
      return <FileSpreadsheet className={className} />;
    return <File className={className} />;
  }

  // Helper: human-readable file size
  function formatBytes(bytes: number | null): string {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

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
  const prazoBadge = calcularPrazoBadge(demanda.prazo);
  const currentStageIdx = getStageIndex(statusConfig.group);
  const oficioSugerido = sugerirOficio(demanda.ato, demanda.providencias);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "max-w-full p-0 flex flex-col [&>button:first-of-type]:hidden rounded-l-2xl sm:rounded-l-none border-l-0 outline-none",
          // Docado: container transparente em tela cheia; o sheet visível é a coluna
          // de conteúdo (1040px à direita) e o PDF é a coluna à esquerda.
          docaAutos
            ? "w-full sm:w-screen sm:max-w-none bg-transparent shadow-none"
            : "w-full sm:w-[600px] md:w-[780px] lg:w-[920px] xl:w-[1040px] shadow-2xl bg-[#f7f7f7] dark:bg-neutral-950",
        )}
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
        <div className="flex-1 flex min-h-0">
          {/* ===== DOCA À ESQUERDA — PDF dos autos ancorado; o sheet segue ativo ===== */}
          {docaAutos && (
            <div className="hidden sm:flex flex-col min-w-0 flex-1 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <div className="flex items-center justify-between px-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
                <span className="text-[11px] font-medium text-neutral-500">Autos</span>
                <button
                  type="button"
                  onClick={() => setDocaAutos(null)}
                  className="text-[11px] text-neutral-500 hover:text-foreground cursor-pointer px-2 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Recolher ⇥
                </button>
              </div>
              <AutosPreviewPane
                files={[{ driveFileId: docaAutos.fileId }]}
                initialId={docaAutos.fileId}
                initialPage={docaAutos.page}
                className="flex-1 min-h-0"
                bodyClassName="flex-1 min-h-0"
              />
            </div>
          )}
          {/* ===== COLUNA DIREITA — conteúdo do sheet (preservado integralmente) ===== */}
          <div className={cn("flex flex-col min-h-0 min-w-0", docaAutos ? "w-full sm:w-[600px] md:w-[780px] lg:w-[920px] xl:w-[1040px] sm:shrink-0 bg-[#f7f7f7] dark:bg-neutral-950 shadow-2xl" : "flex-1")}>
        {/* ===== NAV HEADER — Padrão charcoal (idêntico ao event-detail-sheet) ===== */}
        <div className="bg-neutral-900 dark:bg-neutral-950 text-white backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
          <SheetHeader className="p-0 min-w-0 flex-1">
            <SheetTitle className="text-[13px] font-semibold tracking-tight text-white truncate">
              {demanda.assistido ? (
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-white/50 font-normal shrink-0">
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
                  className="w-7 h-7 rounded-lg hover:bg-neutral-800 text-white/70 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                  title="Anterior (↑)"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                {currentIndex != null && totalCount != null && (
                  <span className="text-[10px] font-mono text-white/60 tabular-nums min-w-[40px] text-center">
                    {currentIndex + 1}/{totalCount}
                  </span>
                )}
                <button
                  onClick={() => onNavigate("next")}
                  className="w-7 h-7 rounded-lg hover:bg-neutral-800 text-white/70 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                  title="Próximo (↓)"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 rounded-lg hover:bg-neutral-800 flex items-center justify-center cursor-pointer ml-1"
              title="Fechar (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex-1 overflow-y-auto">
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
                  {(demanda.assistido || "").split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase()}
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

                {/* Linha 3 — processo (chip de cópia) discreto, sem destaque
                    visual competindo com pills. Tipo (AP/MPU/IP/etc) como
                    label cinza inline antes do número. */}
                {processo && (
                  <div className="flex items-center mt-2 flex-wrap">
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

          {/* ===== CARD SECTIONS ===== */}
          <div className="px-4 sm:px-5 pb-4 space-y-3">
            {/* Card 1: Registros (Task 6 — registros tipados) */}
            {demanda.assistidoId ? (
              <div className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 overflow-hidden">
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-neutral-700 dark:text-neutral-300 font-medium">Registros</span>
                    {!novoRegistroOpen && (
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
                    )}
                  </div>
                  {/* Sem PDFs: editor inline. Com PDFs: modal split-view (autos | editor), abaixo. */}
                  {novoRegistroOpen && previewFiles.length === 0 && (
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
              </div>
            ) : (
              <div className="rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden">
                <div className="px-4 py-3 text-[11px] text-muted-foreground italic">
                  Vincule um assistido para registrar providências e atendimentos.
                </div>
              </div>
            )}

            {/* ===== DETALHES — 3 BLOCOS ===== */}
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-1 pt-1">
              Detalhes
            </h3>

            {/* Bloco A — Identificação */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden divide-y divide-neutral-200/40 dark:divide-neutral-800/40">
              {/* Assistido row — editável inline. Útil pra corrigir
                  placeholders ("⚠ A identificar — <cnj>") gerados pelo
                  importer quando o polo passivo veio em sigilo, e pra
                  ajustar typos. Click → input → Enter/blur salva, Esc
                  cancela. */}
              {demanda.assistidoId && onAssistidoNomeChange && (
                <div className="flex items-center px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <User className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Assistido</span>
                  <div className="flex-1 flex items-center justify-end min-w-0">
                    {editingAssistidoNome ? (
                      <input
                        autoFocus
                        type="text"
                        value={assistidoDraft}
                        onChange={(e) => setAssistidoDraft(e.target.value)}
                        onBlur={() => {
                          const trimmed = assistidoDraft.trim();
                          if (trimmed && trimmed !== demanda.assistido && demanda.assistidoId) {
                            onAssistidoNomeChange(String(demanda.assistidoId), trimmed);
                          }
                          setEditingAssistidoNome(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          if (e.key === "Escape") {
                            setAssistidoDraft(demanda.assistido || "");
                            setEditingAssistidoNome(false);
                          }
                        }}
                        className="text-xs text-right text-neutral-700 dark:text-neutral-200 bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:border-neutral-500 outline-none w-full px-1"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAssistidoDraft(demanda.assistido || "");
                          setEditingAssistidoNome(true);
                        }}
                        className={cn(
                          "text-xs hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors text-right truncate cursor-pointer",
                          (demanda.assistido || "").startsWith("⚠")
                            ? "text-amber-600 dark:text-amber-400 italic"
                            : "text-neutral-700 dark:text-neutral-300"
                        )}
                        title="Clique para editar"
                      >
                        {demanda.assistido || "—"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Atribuição row — editável via dropdown. Migrou do header
                  pra cá pra deixar a hero card mais limpa, mantendo a edição
                  acessível e a área visível em metadata. */}
              <div className="flex items-center px-4 py-2.5 gap-3">
                <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                  <AtribuicaoIcon className="w-3 h-3" style={{ color: atribuicaoColor }} />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Atribuição</span>
                <div className="flex-1 flex items-center justify-end">
                  <InlineDropdown
                    value={demanda.atribuicao}
                    compact
                    displayValue={
                      <span className="text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                        {demanda.atribuicao}
                      </span>
                    }
                    options={ATRIBUICAO_OPTIONS}
                    onChange={(v) => onAtribuicaoChange(demanda.id, v)}
                  />
                </div>
              </div>

              {/* Tipo do processo (AP/MPU/APF/...) — editável via
                  dropdown. Útil pra corrigir importações que vieram com
                  tipo errado (ex.: APF inserido como MPU pelo importer
                  VVD legacy). Update vai direto no processo, não na
                  demanda. */}
              {processo && onTipoProcessoChange && demanda.processoId && (
                <div className="flex items-center px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <FileText className="w-3 h-3 text-neutral-400" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Tipo</span>
                  <div className="flex-1 flex items-center justify-end">
                    <InlineDropdown
                      value={processo.tipo || ""}
                      compact
                      displayValue={
                        <span className="text-xs text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                          {processo.tipo || "—"}
                        </span>
                      }
                      options={TIPO_PROCESSO_OPTIONS}
                      onChange={(v) => onTipoProcessoChange(String(demanda.processoId), v)}
                    />
                  </div>
                </div>
              )}
              {/* Fallback read-only se a view não passar o handler */}
              {processo?.tipo && !onTipoProcessoChange && (
                <div className="flex items-center px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <FileText className="w-3 h-3 text-neutral-400" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Tipo</span>
                  <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400">{processo.tipo}</span>
                </div>
              )}

              {/* Status prisional — editável via InlineDropdown.
                  Atualiza assistidos.statusPrisional via mutation. */}
              {demanda.assistidoId && onStatusPrisionalChange && (
                <div className="flex items-center px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Lock className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Prisional</span>
                  <div className="flex-1 flex items-center justify-end">
                    <InlineDropdown
                      value={demanda.estadoPrisional?.toUpperCase() || "SOLTO"}
                      compact
                      displayValue={
                        <span className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded transition-colors",
                          STATUS_PRISIONAL_CONFIG[(demanda.estadoPrisional?.toUpperCase() || "SOLTO") as StatusPrisional]?.bg,
                          STATUS_PRISIONAL_CONFIG[(demanda.estadoPrisional?.toUpperCase() || "SOLTO") as StatusPrisional]?.color,
                        )}>
                          {STATUS_PRISIONAL_CONFIG[(demanda.estadoPrisional?.toUpperCase() || "SOLTO") as StatusPrisional]?.label || "Solto"}
                        </span>
                      }
                      options={STATUS_PRISIONAL_OPTIONS}
                      onChange={(v) => onStatusPrisionalChange(demanda.assistidoId!, v)}
                    />
                  </div>
                </div>
              )}

              {/* Vara/órgão julgador — novo */}
              {processo?.vara && (
                <div className="flex items-center px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Building2 className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Vara</span>
                  <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400">
                    {processo.vara}
                  </span>
                </div>
              )}
            </div>

            {/* Bloco B — Cronologia */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden divide-y divide-neutral-200/40 dark:divide-neutral-800/40">
              {/* Expedição da intimação — data em que foi expedida no PJe.
                  data_intimacao = expedicao + 10 dias (Lei 11.419/2006).
                  Mostra formato relativo ("há 3 dias") com tooltip da data exata. */}
              {demanda.data && (
                <div className="flex items-center px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Calendar className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Expedição</span>
                  <span
                    className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400 tabular-nums cursor-help"
                    title={demanda.data}
                  >
                    {(() => {
                      try {
                        const [d, m, y] = demanda.data.split("/").map(Number);
                        const date = new Date(y, m - 1, d);
                        if (isNaN(date.getTime())) return demanda.data;
                        const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
                        if (diff === 0) return "Hoje";
                        if (diff === 1) return "Ontem";
                        if (diff < 30) return `há ${diff} dias`;
                        if (diff < 365) return `há ${Math.floor(diff / 30)} mes${Math.floor(diff / 30) > 1 ? "es" : ""}`;
                        return `há ${Math.floor(diff / 365)} ano${Math.floor(diff / 365) > 1 ? "s" : ""}`;
                      } catch {
                        return demanda.data;
                      }
                    })()}
                  </span>
                </div>
              )}

              {/* Prazo row — editável + badge calculado */}
              <div className="flex items-center px-4 py-2.5 gap-3">
                <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Prazo</span>
                <div className="flex-1 flex items-center justify-end gap-2" data-prazo-trigger={demanda.id}>
                  {prazoBadge && prazoBadge.cor !== "none" && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums",
                        prazoBadge.cor === "red" && "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
                        prazoBadge.cor === "amber" && "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
                        prazoBadge.cor === "green" && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
                        prazoBadge.cor === "gray" && "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
                      )}
                    >
                      {prazoBadge.texto}
                    </span>
                  )}
                  <InlineDatePicker
                    value={demanda.prazo}
                    onChange={(v) => onPrazoChange(demanda.id, v)}
                  />
                </div>
              </div>

              {/* Importado — quando a demanda entrou no banco */}
              {demanda.dataInclusao && (
                <div className="flex items-center px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Calendar className="w-3 h-3 text-neutral-400" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Importado</span>
                  <span
                    className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400 tabular-nums cursor-help"
                    title={(() => {
                      try {
                        const d = new Date(demanda.dataInclusao);
                        if (isNaN(d.getTime())) return demanda.dataInclusao;
                        return d.toLocaleString("pt-BR");
                      } catch {
                        return demanda.dataInclusao;
                      }
                    })()}
                  >
                    {(() => {
                      try {
                        const d = new Date(demanda.dataInclusao);
                        if (isNaN(d.getTime())) return demanda.dataInclusao;
                        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
                          + " · " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                      } catch {
                        return demanda.dataInclusao;
                      }
                    })()}
                  </span>
                </div>
              )}

              {/* Atualizado — quando foi a última modificação */}
              {demanda.updatedAt && (
                <div className="flex items-center px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <History className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Atualizado</span>
                  <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                    {(() => {
                      try {
                        const d = new Date(demanda.updatedAt);
                        const hoje = new Date();
                        const diffDays = Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays === 0) return `Hoje · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                        if (diffDays === 1) return `Ontem · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                        if (diffDays < 7) return `${diffDays} dias atrás`;
                        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
                      } catch {
                        return "—";
                      }
                    })()}
                  </span>
                </div>
              )}

              {/* Providências preview — o que tem que ser feito (se houver) */}
              {demanda.providencias && (
                <div className="flex items-start px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckSquare className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0 mt-0.5">Providências</span>
                  <p className="flex-1 text-right text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-2" title={demanda.providencias}>
                    {demanda.providencias}
                  </p>
                </div>
              )}
            </div>

            {/* Bloco C — Ações rápidas */}
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

            {/* ===== OFÍCIO SUGERIDO ===== */}
            {oficioSugerido && (
              <>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-1 pt-1">
                  Ofício
                </h3>

                <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/40 dark:border-emerald-800/20 overflow-hidden">
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <Mail className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                        Ofício sugerido
                      </span>
                      <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                        {oficioSugerido.tipoLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 ml-7 mb-2.5">
                      Com base no ato &ldquo;{demanda.ato}&rdquo;
                    </p>
                    <Link
                      href={`/admin/oficios/novo?demandaId=${demanda.id}${demanda.assistidoId ? `&assistidoId=${demanda.assistidoId}` : ""}${demanda.processoId ? `&processoId=${demanda.processoId}` : ""}&tipo=${oficioSugerido.tipoOficio}`}
                      className="ml-7 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors group/oficio cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      Gerar Ofício
                      <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover/oficio:opacity-100 group-hover/oficio:translate-x-0 transition-all" />
                    </Link>
                  </div>
                </div>
              </>
            )}

            {/* ===== AUTOS EM DESTAQUE — visualização inline (sem sair da plataforma) ===== */}
            {primaryAutos && (
              <div className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDocaAutos({ fileId: primaryAutos.driveFileId })}
                  className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer text-left group/autos"
                >
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center ring-1 ring-sky-100 dark:ring-sky-900/40">
                    <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold text-foreground">Ver autos</span>
                    <span className="block text-[11px] text-neutral-500 dark:text-neutral-400 truncate" title={primaryAutos.name ?? undefined}>
                      {primaryAutos.name ?? "Documento do processo"}
                      {previewFiles.length > 1 && (
                        <span className="text-neutral-400"> · +{previewFiles.length - 1} doc{previewFiles.length - 1 > 1 ? "s" : ""}</span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 opacity-0 group-hover/autos:opacity-100 transition-opacity">
                    Abrir <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>
            )}

            {/* ===== ATOS — seções dos autos por tipo (clique doca o PDF na página) ===== */}
            {demanda.processoId && (
              <>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-1 pt-1">
                  Atos
                </h3>
                <div className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 px-3.5 py-2.5">
                  <SectionsViewer
                    processoId={demanda.processoId}
                    assistidoId={demanda.assistidoId ?? 0}
                    onOpenSection={(s) => {
                      if (s.fileDriveId) setDocaAutos({ fileId: s.fileDriveId, page: s.paginaInicio });
                    }}
                  />
                </div>
              </>
            )}

            {/* ===== RECURSOS DO ASSISTIDO — mídias + PDFs do Drive (compact) ===== */}
            {demanda.assistidoId && (midiasFlat.length > 0 || pdfFiles.length > 0) && (
              <>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-1 pt-1">
                  Recursos
                </h3>

                <div className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 px-3.5 py-2.5 space-y-2">
                  {/* Mídias strip — áudios e vídeos */}
                  {midiasFlat.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                          Mídias
                          <span className="ml-1.5 text-neutral-400 font-normal normal-case">{midiasFlat.length}</span>
                        </span>
                        {driveFolderUrl && (
                          <a
                            href={driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                          >
                            Drive →
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {midiasFlat.slice(0, 8).map((m: any) => {
                          const isAudio = (m.mimeType || "").startsWith("audio/");
                          const Icon = isAudio ? Mic : Video;
                          return (
                            <a
                              key={m.id}
                              href={m.webViewLink || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 max-w-[160px] transition-colors"
                              title={m.name || (isAudio ? "Áudio" : "Vídeo")}
                            >
                              <Icon className={`w-3 h-3 shrink-0 ${isAudio ? "text-amber-600 dark:text-amber-400" : "text-purple-600 dark:text-purple-400"}`} />
                              <span className="text-[10px] text-neutral-700 dark:text-neutral-300 truncate">
                                {m.name || (isAudio ? "Áudio" : "Vídeo")}
                              </span>
                              {m.hasAnalysis && (
                                <span className="shrink-0 w-1 h-1 rounded-full bg-emerald-500" title="Analisado" />
                              )}
                            </a>
                          );
                        })}
                        {midiasFlat.length > 8 && driveFolderUrl && (
                          <a
                            href={driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 text-[10px] text-neutral-500 transition-colors"
                          >
                            +{midiasFlat.length - 8}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PDFs strip — wrap chips compactos com fallback se sem nome */}
                  {pdfFiles.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide">
                          PDFs
                          <span className="ml-1.5 text-neutral-400 font-normal normal-case">{pdfFiles.length}</span>
                        </span>
                        {driveFolderUrl && (
                          <a
                            href={driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                          >
                            Drive →
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pdfFiles.slice(0, 8).map((f: any, idx: number) => {
                          const nameLower = (f.name || "").toLowerCase();
                          const isAnalise =
                            nameLower.includes("análise") ||
                            nameLower.includes("analise") ||
                            nameLower.includes("relatório") ||
                            nameLower.includes("relatorio");
                          const Icon = isAnalise ? FileSignature : FileText;
                          const displayName = f.name || `PDF ${idx + 1}`;
                          const canPreview = !!f.driveFileId;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canPreview) setDocaAutos({ fileId: f.driveFileId });
                                else if (f.webViewLink) window.open(f.webViewLink, "_blank");
                              }}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md max-w-[160px] transition-colors cursor-pointer ${
                                isAnalise
                                  ? "bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/30"
                                  : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                              }`}
                              title={`${displayName} — abrir aqui`}
                            >
                              <Icon className={`w-3 h-3 shrink-0 ${isAnalise ? "text-sky-600 dark:text-sky-400" : "text-neutral-400"}`} />
                              <span className={`text-[10px] truncate ${isAnalise ? "text-sky-700 dark:text-sky-300 font-medium" : "text-neutral-700 dark:text-neutral-300"}`}>
                                {displayName}
                              </span>
                            </button>
                          );
                        })}
                        {pdfFiles.length > 8 && driveFolderUrl && (
                          <a
                            href={driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 text-[10px] text-neutral-500 transition-colors"
                          >
                            +{pdfFiles.length - 8}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ===== DOCUMENTOS (Drive) ===== */}
            <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-700/40 overflow-hidden">
              {/* Collapsible header */}
              <button
                onClick={() => setDocsOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-neutral-400 shrink-0" />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Documentos</span>
                {driveFolder?.files && driveFolder.files.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/40">
                    {driveFolder.files.length}
                  </span>
                )}
                {driveFolder?.folderUrl && (
                  <a
                    href={driveFolder.folderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    title="Abrir pasta no Drive"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <div className="ml-auto">
                  {docsOpen ? (
                    <ChevronDown className="w-3 h-3 text-neutral-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-neutral-400" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {docsOpen && (
                <div className="border-t border-neutral-200/40 dark:border-neutral-700/30">
                  {/* Loading state */}
                  {driveFolderLoading && (
                    <div className="flex items-center justify-center gap-2 py-5 text-neutral-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Carregando...</span>
                    </div>
                  )}

                  {/* Drive not configured */}
                  {!driveFolderLoading && driveFolder && !driveFolder.configured && (
                    <div className="px-4 py-4 text-center">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Google Drive não configurado</p>
                      <a
                        href="/admin/settings/drive"
                        className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Configurar Drive
                      </a>
                    </div>
                  )}

                  {/* No folder exists yet */}
                  {!driveFolderLoading && driveFolder?.configured && !driveFolder.folderId && (
                    <div className="px-4 py-4 text-center">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                        Nenhuma pasta vinculada a esta demanda
                      </p>
                      <button
                        onClick={() => createDriveFolder.mutate({ demandaId: demanda.id })}
                        disabled={createDriveFolder.isPending}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {createDriveFolder.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FolderOpen className="w-3.5 h-3.5" />
                        )}
                        Criar pasta no Drive
                      </button>
                    </div>
                  )}

                  {/* File list */}
                  {!driveFolderLoading && driveFolder?.configured && driveFolder.folderId && (
                    <>
                      {driveFolder.files.length === 0 ? (
                        <div className="px-4 py-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
                          Nenhum arquivo na pasta
                        </div>
                      ) : (
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                          {driveFolder.files.map((f) => (
                            <div key={f.id} className="flex items-center gap-2 px-4 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors group/file">
                              <DriveFileIcon mimeType={f.mimeType} className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              <span className="text-xs text-neutral-700 dark:text-neutral-300 flex-1 truncate" title={f.name}>
                                {f.name}
                              </span>
                              {f.size !== null && (
                                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0">
                                  {formatBytes(f.size)}
                                </span>
                              )}
                              {f.webViewLink && (
                                <a
                                  href={f.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="opacity-0 group-hover/file:opacity-100 transition-opacity text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                  title="Abrir no Drive"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload area */}
                      <div className="px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800/60">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.heic,.webp"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFiles.length > 0}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 text-xs text-neutral-500 dark:text-neutral-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 dark:hover:border-emerald-600 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {uploadingFiles.length > 0 ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Enviando {uploadingFiles.length} arquivo{uploadingFiles.length > 1 ? "s" : ""}...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              Enviar documento
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== PRÓXIMA AUDIÊNCIA ===== */}
        {proximaAudiencia && (
          <ProximaAudienciaBlock
            audiencia={proximaAudiencia}
            onChanged={() => refetchAudiencias()}
          />
        )}

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

        {/* Novo registro lendo os autos (split view) — quando há PDFs no caso */}
        {demanda.assistidoId && previewFiles.length > 0 && (
          <RegistroComAutosDialog
            open={novoRegistroOpen}
            onOpenChange={setNovoRegistroOpen}
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
    <div className="mx-4 mb-3 rounded-xl border border-neutral-200/60 dark:border-neutral-700/40 px-3.5 py-2.5 group">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
        <span className="text-[10px] text-neutral-400 tracking-wider font-medium">Próxima Audiência</span>
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
