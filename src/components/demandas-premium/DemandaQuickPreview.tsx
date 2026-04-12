// @ts-nocheck
"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
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
  AlertCircle,
  Mail,
  ArrowRight,
  Sparkles,
  FolderOpen,
  Loader2,
  Upload,
  File,
  Image,
  FileSpreadsheet,
} from "lucide-react";
import { getStatusConfig, STATUS_GROUPS, DEMANDA_STATUS, type StatusGroup } from "@/config/demanda-status";
import { getAtosPorAtribuicao } from "@/config/atos-por-atribuicao";
import { InlineDropdown } from "@/components/shared/inline-dropdown";
import { InlineDatePicker } from "@/components/shared/inline-date-picker";
import { EditableTextInline } from "@/components/shared/editable-text-inline";
import { AudioRecorderButton } from "@/components/shared/audio-recorder";
import { VoiceMemosButton } from "@/components/shared/voice-memos-button";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
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
  onProvidenciasChange: (id: string, providencias: string) => void;
  onPrazoChange: (id: string, prazo: string) => void;
  onAtribuicaoChange: (id: string, atribuicao: string) => void;
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

  // Position: centered below the node, flip above if no room below
  const popoverWidth = 160;
  const estimatedHeight = options.length * 28 + 40; // ~28px per option + header
  const left = Math.max(8, Math.min(
    anchorRect.left + anchorRect.width / 2 - popoverWidth / 2,
    window.innerWidth - popoverWidth - 8
  ));
  const fitsBelow = anchorRect.bottom + 8 + estimatedHeight < window.innerHeight - 8;
  const top = fitsBelow
    ? anchorRect.bottom + 8
    : anchorRect.top - estimatedHeight - 8;

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
  onProvidenciasChange,
  onPrazoChange,
  onAtribuicaoChange,
  onArchive,
  onDelete,
  onNavigate,
  copyToClipboard,
  atribuicaoIcons,
  currentIndex,
  totalCount,
}: DemandaQuickPreviewProps) {
  const [metadataOpen, setMetadataOpen] = useState(true);
  const [docsOpen, setDocsOpen] = useState(false);
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

  // Próxima audiência do processo
  const { data: audienciasProximas } = trpc.audiencias.list.useQuery(
    { apenasProximas: true },
    { enabled: !!demanda?.processoId && open }
  );
  const proximaAudiencia = audienciasProximas?.find(
    (a: any) => a.processoId === demanda?.processoId || a.processo?.id === demanda?.processoId
  );

  // Close popover when demanda changes or sheet closes
  useEffect(() => {
    setActiveStagePopover(null);
  }, [demanda?.id, open]);

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

  // Upload audio to assistido's Drive folder
  const handleAudioUpload = useCallback(
    async (fileOrBlob: File | Blob, mimeTypeOrName?: string) => {
      if (!demanda?.assistidoId) return;

      try {
        // Get assistido's driveFolderId
        const isFile = fileOrBlob instanceof File;
        const fileName = isFile
          ? (fileOrBlob as File).name
          : `gravacao-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-")}.webm`;
        const mimeType = isFile
          ? (fileOrBlob as File).type || "audio/mp4"
          : mimeTypeOrName || "audio/webm";

        // Convert to base64
        const arrayBuffer = await fileOrBlob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        // We need the assistido's folder — fetch it
        const res = await fetch(
          `/api/trpc/assistidos.getById?batch=1&input=${encodeURIComponent(
            JSON.stringify({ "0": { json: { id: demanda.assistidoId } } })
          )}`
        );
        const data = await res.json();
        const folderId = data?.[0]?.result?.data?.json?.driveFolderId;

        if (!folderId) {
          toast.info("Audio transcrito", {
            description: "Assistido sem pasta no Drive — audio nao foi salvo.",
          });
          return;
        }

        await uploadFile.mutateAsync({
          folderId,
          fileName,
          mimeType,
          fileBase64: `data:${mimeType};base64,${base64}`,
          description: `Audio gravado via OMBUDS — Demanda ${demanda.id}`,
        });

        toast.success("Audio salvo no Drive", {
          description: `${fileName} vinculado ao assistido.`,
        });
      } catch (err) {
        console.error("[DemandaQuickPreview] Upload audio error:", err);
        // Don't show error toast — transcription already succeeded
      }
    },
    [demanda?.assistidoId, demanda?.id, uploadFile]
  );

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

  const atoOptions = getAtosPorAtribuicao(demanda.atribuicao)
    .filter((a) => a.value !== "Todos")
    .map((a) => ({ value: a.value, label: a.label }));

  const processo = demanda.processos?.[0];
  const prazoBadge = calcularPrazoBadge(demanda.prazo);
  const currentStageIdx = getStageIndex(statusConfig.group);
  const oficioSugerido = sugerirOficio(demanda.ato, demanda.providencias);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:w-[480px] md:w-[560px] max-w-full p-0 flex flex-col [&>button:first-of-type]:hidden rounded-l-2xl sm:rounded-l-none shadow-2xl border-l-0 outline-none bg-[#f7f7f7] dark:bg-neutral-950"
        onPointerDownOutside={(e) => {
          const target = (e as any).detail?.originalEvent?.target as HTMLElement ?? e.target as HTMLElement;
          if (
            target?.closest?.('[data-radix-popper-content-wrapper]') ||
            target?.closest?.('[data-radix-select-content]') ||
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
            target?.closest?.('[role="listbox"]') ||
            target?.closest?.('[role="option"]') ||
            target?.closest?.('[cmdk-root]')
          ) {
            e.preventDefault();
          }
        }}
      >
        {/* ===== STICKY NAV HEADER — Padrão Defender sheet bar ===== */}
        <div className="sticky top-0 z-10 bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/40 dark:border-neutral-800/60 px-4 py-2.5 flex items-center justify-between">
          <SheetHeader className="p-0 space-y-0">
            <SheetTitle className="text-[13px] font-semibold text-foreground tracking-tight">
              Demanda
            </SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-1">
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate("prev")}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-800 ring-1 ring-neutral-200/60 dark:ring-neutral-800/60 hover:ring-neutral-300 dark:hover:ring-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-all duration-150 cursor-pointer flex items-center justify-center"
                  title="Anterior (↑)"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                {currentIndex != null && totalCount != null && (
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums min-w-[40px] text-center">
                    {currentIndex + 1}/{totalCount}
                  </span>
                )}
                <button
                  onClick={() => onNavigate("next")}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-neutral-800 ring-1 ring-neutral-200/60 dark:ring-neutral-800/60 hover:ring-neutral-300 dark:hover:ring-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-all duration-150 cursor-pointer flex items-center justify-center"
                  title="Próximo (↓)"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-all duration-150 cursor-pointer flex items-center justify-center ml-1"
              title="Fechar (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex-1 overflow-y-auto">
          {/* ===== HERO HEADER — cinza claro com texto escuro ===== */}
          <div className="mx-3 mt-3 mb-4 px-4 py-4 rounded-xl bg-neutral-300/60 dark:bg-neutral-800/60 border border-neutral-300/40 dark:border-neutral-700/40 shadow-sm shadow-black/[0.03]">
            <div className="flex items-start gap-3.5">
              {/* Avatar com ring de atribuição */}
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-neutral-700 flex items-center justify-center shrink-0" style={{ boxShadow: `0 0 0 2.5px ${atribuicaoColor}` }}>
                <span className="text-sm font-semibold text-neutral-500 dark:text-neutral-300">
                  {(demanda.assistido || "").split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 leading-tight truncate">
                    {demanda.assistido}
                  </h2>
                  {isPreso && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 shrink-0">
                      <Lock className="w-2.5 h-2.5" /> Preso
                    </span>
                  )}
                  {isUrgente && (
                    <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  )}
                </div>

                {/* Processo — chip */}
                {processo && (
                  <button
                    className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-lg bg-neutral-200/60 dark:bg-neutral-700/60 hover:bg-neutral-200 dark:hover:bg-neutral-700 group/proc cursor-pointer transition-all duration-150"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      copyToClipboard(processo.numero, "Processo copiado!");
                    }}
                    title="Copiar número do processo"
                  >
                    <span className="font-mono text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400 group-hover/proc:text-neutral-700 dark:group-hover/proc:text-neutral-200 transition-colors">{processo.numero}</span>
                    <Copy className="w-2.5 h-2.5 text-neutral-400 group-hover/proc:text-neutral-600 transition-colors" />
                  </button>
                )}

                {/* Action links */}
                <div className="flex items-center gap-3 mt-2">
                  {demanda.assistidoId && (
                    <Link
                      href={`/admin/assistidos/${demanda.assistidoId}`}
                      className="text-[10px] font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    >
                      Ver assistido →
                    </Link>
                  )}
                  {demanda.processoId && (
                    <Link
                      href={`/admin/processos/${demanda.processoId}`}
                      className="text-[10px] font-medium text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    >
                      Ver processo →
                    </Link>
                  )}
                </div>
              </div>
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
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full transition-all duration-500 bg-neutral-300 dark:bg-neutral-600"
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
                    className={`relative z-10 flex flex-col items-center cursor-pointer group/stage transition-all ${
                      i === 0 ? "" : "flex-1"
                    }`}
                    title={`${stage.label} — clique para escolher substatus`}
                    style={{ minWidth: i === 0 ? "auto" : undefined }}
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
                    {/* Label — neutral for completed, colored only for current */}
                    <span
                      className={`mt-1.5 text-[10px] font-medium whitespace-nowrap transition-colors ${
                        isActive || isPopoverOpen ? "font-bold" : "text-neutral-400 dark:text-neutral-500"
                      }`}
                      style={{
                        color: isActive || isPopoverOpen ? stageColor : undefined,
                      }}
                    >
                      <span className="hidden sm:inline">{stage.label}</span>
                      <span className="sm:hidden">{stage.short}</span>
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
            {/* Section divider: Ação */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
              <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">Ação</span>
              <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
            </div>

            {/* Card 1: Providências */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden hover:shadow-md hover:border-neutral-300/80 dark:hover:border-neutral-700/60 focus-within:shadow-md focus-within:border-neutral-300/80 transition-all duration-200">
              {/* Providências */}
              <div className="px-3.5 sm:px-4 pt-2.5 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-foreground font-semibold">Providências</span>
                  <div className="flex items-center gap-0.5">
                    <AudioRecorderButton
                      compact
                      onTranscriptReady={(text) => {
                        const current = demanda.providencias || "";
                        onProvidenciasChange(demanda.id, current ? `${current}\n\n${text}` : text);
                      }}
                      onAudioBlob={(blob, mimeType) => handleAudioUpload(blob, mimeType)}
                    />
                    <VoiceMemosButton
                      compact
                      onTranscriptReady={(text) => {
                        const current = demanda.providencias || "";
                        onProvidenciasChange(demanda.id, current ? `${current}\n\n${text}` : text);
                      }}
                      onAudioFile={(file) => handleAudioUpload(file)}
                      assistidoId={demanda.assistidoId}
                      processoId={demanda.processoId}
                    />
                  </div>
                </div>
                <EditableTextInline
                  value={demanda.providencias || ""}
                  onSave={(v) => onProvidenciasChange(demanda.id, v)}
                  placeholder="O que precisa ser feito?"
                  className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/30 min-h-[44px] bg-neutral-50/60 dark:bg-neutral-800/20 rounded-lg px-2.5 py-2 border border-neutral-200/30 dark:border-neutral-800/40 focus-within:border-neutral-300/60 dark:focus-within:border-neutral-800/60 transition-all group/edit text-[12px] leading-relaxed"
                  multiline
                />
                {/* Timestamp última edição */}
                {demanda.updatedAt && (
                  <div className="flex items-center gap-1 mt-1.5 px-1">
                    <Clock className="w-2.5 h-2.5 text-neutral-300 dark:text-neutral-600" />
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      Editado {new Date(demanda.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section divider: Classificação */}
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
              <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">Classificação</span>
              <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
            </div>

            {/* Detalhes — card v5 com border-l-4 */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden divide-y divide-neutral-200/40 dark:divide-neutral-800/40">
              {/* Status row */}
              <div className="flex items-center px-3.5 sm:px-4 py-2.5 gap-3">
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${statusColor}18` }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Status</span>
                <div className="flex-1 text-right">
                  <InlineDropdown
                    value={demanda.status}
                    compact
                    displayValue={
                      <span className="text-xs text-neutral-600 dark:text-neutral-300">
                        {statusConfig.label}
                      </span>
                    }
                    options={statusOptions}
                    onChange={(v) => onStatusChange(demanda.id, v)}
                  />
                </div>
              </div>
              {/* Atribuição row */}
              <div className="flex items-center px-3.5 sm:px-4 py-2.5 gap-3">
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${atribuicaoColor}18` }}>
                  <AtribuicaoIcon className="w-3 h-3" style={{ color: atribuicaoColor }} />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Atribuição</span>
                <div className="flex-1 text-right">
                  <InlineDropdown
                    value={demanda.atribuicao}
                    compact
                    displayValue={
                      <span className="text-xs text-neutral-600 dark:text-neutral-300">
                        {demanda.atribuicao}
                      </span>
                    }
                    options={ATRIBUICAO_OPTIONS}
                    onChange={(v) => onAtribuicaoChange(demanda.id, v)}
                  />
                </div>
              </div>
              {/* Ato row */}
              <div className="flex items-center px-3.5 sm:px-4 py-2.5 gap-3">
                <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                  <Scale className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Ato</span>
                <div className="flex-1 text-right">
                  <InlineDropdown
                    value={demanda.ato}
                    compact
                    displayValue={
                      <span className="text-xs text-neutral-600 dark:text-neutral-300">
                        {demanda.ato || <span className="text-neutral-400 dark:text-neutral-500 italic">Selecionar</span>}
                      </span>
                    }
                    options={atoOptions}
                    onChange={(v) => onAtoChange(demanda.id, v)}
                  />
                </div>
              </div>

              {/* Metadados — collapsible */}
              <button
                onClick={() => setMetadataOpen(!metadataOpen)}
                className="w-full flex items-center gap-3 px-3.5 sm:px-4 py-2 text-[10px] text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100/50 dark:hover:bg-neutral-700/20 transition-colors cursor-pointer"
              >
                <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                  {metadataOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </div>
                <span className="font-medium">Metadados</span>
              </button>
              {metadataOpen && (
                <>
                  {demanda.dataInclusao && (
                    <div className="flex items-center px-3.5 sm:px-4 py-2 gap-3">
                      <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                        <Clock className="w-3 h-3 text-neutral-400" />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Importado</span>
                      <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400">{new Date(demanda.dataInclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                  {demanda.estadoPrisional && (
                    <div className="flex items-center px-3.5 sm:px-4 py-2 gap-3">
                      <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                        <Lock className="w-3 h-3 text-neutral-400" />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Prisional</span>
                      <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400 capitalize">{demanda.estadoPrisional}</span>
                    </div>
                  )}
                  {processo?.tipo && (
                    <div className="flex items-center px-3.5 sm:px-4 py-2 gap-3">
                      <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                        <FileText className="w-3 h-3 text-neutral-400" />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Tipo</span>
                      <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400">{processo.tipo}</span>
                    </div>
                  )}
                  {demanda.importBatchId && (
                    <div className="flex items-center px-3.5 sm:px-4 py-2 gap-3">
                      <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-3 h-3 text-neutral-400" />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Batch</span>
                      <span className="flex-1 text-right text-xs font-mono text-neutral-500 dark:text-neutral-400">{demanda.importBatchId.slice(0, 8)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ===== OFÍCIO SUGERIDO ===== */}
            {oficioSugerido && (
              <>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
                  <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">Ofício</span>
                  <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
                </div>

                <div className="rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/40 dark:border-emerald-800/20 overflow-hidden">
                  <div className="px-3.5 sm:px-4 py-3">
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

            {/* ===== DOCUMENTOS (Drive) ===== */}
            <div className="rounded-xl border border-neutral-200/60 dark:border-neutral-700/40 overflow-hidden">
              {/* Collapsible header */}
              <button
                onClick={() => setDocsOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3.5 sm:px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
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
                            <div key={f.id} className="flex items-center gap-2 px-3.5 sm:px-4 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors group/file">
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
                      <div className="px-3.5 sm:px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800/60">
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
          <div className="mx-4 mb-3 rounded-xl border border-neutral-200/60 dark:border-neutral-700/40 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[10px] text-neutral-400 tracking-wider font-medium">Próxima Audiência</span>
            </div>
            <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {new Date(proximaAudiencia.dataHora).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
              {proximaAudiencia.horario ? ` · ${proximaAudiencia.horario}` : ""}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {proximaAudiencia.tipo}
              {proximaAudiencia.local ? ` · ${proximaAudiencia.local}` : ""}
            </p>
          </div>
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
      </SheetContent>
    </Sheet>
  );
}
