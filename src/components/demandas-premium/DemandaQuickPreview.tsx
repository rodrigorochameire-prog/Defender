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
} from "lucide-react";
import { getStatusConfig, STATUS_GROUPS, DEMANDA_STATUS, type StatusGroup } from "@/config/demanda-status";
import { createPortal } from "react-dom";
import { getAtosPorAtribuicao } from "@/config/atos-por-atribuicao";
import { InlineDropdown } from "@/components/shared/inline-dropdown";
import { InlineDatePicker } from "@/components/shared/inline-date-picker";
import { EditableTextInline } from "@/components/shared/editable-text-inline";
import { AudioRecorderButton } from "@/components/shared/audio-recorder";
import { VoiceMemosButton } from "@/components/shared/voice-memos-button";
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
  estadoPrisional?: string;
  prioridade?: string;
  arquivado?: boolean;
  importBatchId?: string | null;
  ordemOriginal?: number | null;
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
  { key: "concluida", label: "Concluída", short: "Concl." },
];

function getStageIndex(group: StatusGroup): number {
  if (group === "arquivado") return PIPELINE_STAGES.length - 1; // maps to last stage
  return PIPELINE_STAGES.findIndex(s => s.key === group);
}

// ============================================
// AVATAR COMPONENT
// ============================================

function Avatar({ name, color, size = 48 }: { name: string; color: string; size?: number }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold select-none flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.38,
      }}
    >
      {initials || "?"}
    </div>
  );
}

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

  // Position: centered below the node
  const popoverWidth = 160;
  const left = Math.max(8, Math.min(
    anchorRect.left + anchorRect.width / 2 - popoverWidth / 2,
    window.innerWidth - popoverWidth - 8
  ));
  const top = anchorRect.bottom + 8;

  // Normalize current status for comparison
  const normalizedCurrent = currentStatus.toLowerCase().replace(/\s+/g, "_");

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
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
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                }
              `}
            >
              <Icon
                className="w-3 h-3 shrink-0"
                style={{ color: isActive ? stageColor : `${stageColor}80` }}
              />
              <span
                className={`text-[11px] flex-1 truncate ${
                  isActive
                    ? "font-semibold text-zinc-900 dark:text-zinc-100"
                    : "font-medium text-zinc-600 dark:text-zinc-400"
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
    </div>,
    document.body
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
  const [activeStagePopover, setActiveStagePopover] = useState<number | null>(null);
  const stageRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [stageRect, setStageRect] = useState<DOMRect | null>(null);
  const uploadFile = trpc.drive.uploadFile.useMutation();

  // Close popover when demanda changes or sheet closes
  useEffect(() => {
    setActiveStagePopover(null);
  }, [demanda?.id, open]);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[calc(100vw-3rem)] sm:w-[420px] md:w-[460px] max-w-full p-0 flex flex-col [&>button:first-of-type]:hidden rounded-l-2xl sm:rounded-l-none shadow-2xl" style={{ borderLeft: `3px solid ${atribuicaoColor}` }}>
        {/* ===== STICKY NAV HEADER ===== */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 px-4 py-2.5 flex items-center justify-between">
          <SheetHeader className="p-0 space-y-0">
            <SheetTitle className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
              Demanda
            </SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-1">
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate("prev")}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                  title="Anterior (↑)"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                {currentIndex != null && totalCount != null && (
                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 tabular-nums min-w-[40px] text-center">
                    {currentIndex + 1}/{totalCount}
                  </span>
                )}
                <button
                  onClick={() => onNavigate("next")}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                  title="Próximo (↓)"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </>
            )}
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer ml-1"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex-1 overflow-y-auto">
          {/* ===== HERO HEADER with gradient ===== */}
          <div
            className="px-5 pt-4 pb-3"
            style={{
              background: `linear-gradient(180deg, ${atribuicaoColor}08 0%, transparent 100%)`,
            }}
          >
            <div className="flex items-start gap-3">
              <Avatar name={demanda.assistido} color={atribuicaoColor} size={44} />
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                    {demanda.assistido}
                  </h2>
                  {/* Flags inline com nome */}
                  {isPreso && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 shrink-0">
                      <Lock className="w-2.5 h-2.5" /> Preso
                    </span>
                  )}
                  {isUrgente && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 shrink-0">
                      <Flame className="w-2.5 h-2.5" /> Urgente
                    </span>
                  )}
                </div>

                {/* Processo number inline */}
                {processo && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">{processo.numero}</span>
                    <button
                      onClick={() => copyToClipboard(processo.numero, "Processo copiado!")}
                      className="p-0.5 rounded hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                    >
                      <Copy className="w-2.5 h-2.5 text-zinc-300 dark:text-zinc-600" />
                    </button>
                  </div>
                )}

                {/* Action links — compact icon buttons */}
                <div className="flex items-center gap-2 mt-2">
                  {demanda.assistidoId && (
                    <Link
                      href={`/admin/assistidos/${demanda.assistidoId}`}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
                    >
                      <User className="w-3 h-3" />
                      Ver assistido <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </Link>
                  )}
                  {demanda.processoId && (
                    <Link
                      href={`/admin/processos/${demanda.processoId}`}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
                    >
                      <Briefcase className="w-3 h-3" />
                      Ver processo <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ===== PIPELINE STEPPER ===== */}
          <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/50">
            {/* Track + nodes */}
            <div className="relative flex items-center">
              {/* Background track */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-zinc-200 dark:bg-zinc-700/60 rounded-full" />
              {/* Filled track */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full transition-all duration-500"
                style={{
                  width: currentStageIdx >= 0 ? `${(currentStageIdx / (PIPELINE_STAGES.length - 1)) * 100}%` : "0%",
                  backgroundColor: "#84CC9B",
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
                          ? "w-6 h-6 ring-2 ring-offset-2 dark:ring-offset-zinc-900"
                          : isCompleted
                            ? "w-5 h-5"
                            : isPopoverOpen
                              ? "w-5 h-5 ring-2 ring-offset-1 dark:ring-offset-zinc-900"
                              : "w-4 h-4 group-hover/stage:w-5 group-hover/stage:h-5"
                      }`}
                      style={{
                        backgroundColor: isCompleted ? "#84CC9B" : isActive ? stageColor : isPopoverOpen ? `${stageColor}80` : "#e4e4e7",
                        ringColor: (isActive || isPopoverOpen) ? `${stageColor}40` : undefined,
                      }}
                    >
                      {isCompleted && <Check className="w-3 h-3 text-white" />}
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    {/* Label */}
                    <span
                      className={`mt-1.5 text-[8px] sm:text-[9px] font-medium whitespace-nowrap transition-colors ${
                        isActive || isPopoverOpen ? "font-bold" : isCompleted ? "" : "text-zinc-400 dark:text-zinc-500"
                      }`}
                      style={{
                        color: isActive || isPopoverOpen ? stageColor : isCompleted ? "#84CC9B" : undefined,
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
          <div className="px-4 sm:px-5 pb-4 space-y-2.5">
            {/* Card 1: Classificação — 3-row grid */}
            <div className="rounded-xl bg-zinc-50/80 dark:bg-zinc-800/30 p-3.5 sm:p-4">
              <p className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold mb-3">Classificação</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {/* Status */}
                <div>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium mb-1">Status</p>
                  <InlineDropdown
                    value={demanda.status}
                    compact
                    displayValue={
                      <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: statusColor }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
                        {statusConfig.label}
                      </div>
                    }
                    options={statusOptions}
                    onChange={(v) => onStatusChange(demanda.id, v)}
                  />
                </div>
                {/* Atribuição */}
                <div>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium mb-1">Atribuição</p>
                  <InlineDropdown
                    value={demanda.atribuicao}
                    compact
                    displayValue={
                      <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: atribuicaoColor }}>
                        <AtribuicaoIcon className="w-3.5 h-3.5 shrink-0" />
                        {demanda.atribuicao}
                      </div>
                    }
                    options={ATRIBUICAO_OPTIONS}
                    onChange={(v) => onAtribuicaoChange(demanda.id, v)}
                  />
                </div>
                {/* Ato — full width */}
                <div className="col-span-2">
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium mb-1">Ato / Tipo</p>
                  <InlineDropdown
                    value={demanda.ato}
                    compact
                    displayValue={
                      <span className="text-[13px] text-zinc-800 dark:text-zinc-200 font-semibold">
                        {demanda.ato || <span className="text-zinc-400 dark:text-zinc-500 italic font-normal">Selecionar ato</span>}
                      </span>
                    }
                    options={atoOptions}
                    onChange={(v) => onAtoChange(demanda.id, v)}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Prazo & Providências */}
            <div className="rounded-xl bg-zinc-50/80 dark:bg-zinc-800/30 p-3.5 sm:p-4">
              <p className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold mb-3">Prazo & Providências</p>
              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <InlineDatePicker
                    value={demanda.prazo}
                    onChange={(isoDate) => onPrazoChange(demanda.id, isoDate)}
                    placeholder="Definir prazo"
                    showEditIcon
                  />
                  {prazoBadge && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                      prazoBadge.cor === "red" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 animate-pulse" :
                      prazoBadge.cor === "amber" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                      prazoBadge.cor === "green" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                      "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {prazoBadge.texto}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">Providências</p>
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
                  placeholder="Clique para adicionar providências..."
                  className="text-sm text-zinc-700 dark:text-zinc-300 min-h-[80px] bg-white dark:bg-zinc-900 rounded-lg p-2 border border-zinc-200/50 dark:border-zinc-700/50"
                  multiline
                />
              </div>
            </div>

            {/* Card 3: Metadados (collapsible) */}
            <div className="rounded-xl bg-zinc-50/80 dark:bg-zinc-800/30 overflow-hidden">
              <button
                onClick={() => setMetadataOpen(!metadataOpen)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-bold hover:bg-zinc-100/50 dark:hover:bg-zinc-700/30 transition-colors cursor-pointer"
              >
                {metadataOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Metadados
              </button>
              {metadataOpen && (
                <div className="px-4 pb-3 space-y-2">
                  {demanda.dataInclusao && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span>Importado em {new Date(demanda.dataInclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                  {demanda.estadoPrisional && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <Lock className="w-3 h-3 flex-shrink-0" />
                      <span>Estado prisional: {demanda.estadoPrisional}</span>
                    </div>
                  )}
                  {processo?.tipo && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span>Tipo: {processo.tipo}</span>
                    </div>
                  )}
                  {demanda.importBatchId && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>Batch: {demanda.importBatchId.slice(0, 8)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== STICKY ACTIONS BOTTOM BAR ===== */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 px-5 py-2.5 flex items-center gap-2">
          <button
            onClick={() => { onStatusChange(demanda.id, "resolvido"); onOpenChange(false); }}
            className="flex-1 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Resolver
          </button>
          <button
            onClick={() => { onArchive(demanda.id); onOpenChange(false); }}
            className="h-8 px-3.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-500 dark:text-zinc-400 text-[11px] font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Archive className="w-3 h-3" />
            Arquivar
          </button>
          <button
            onClick={() => { onDelete(demanda.id); onOpenChange(false); }}
            className="h-8 w-8 rounded-lg border border-rose-200/80 dark:border-rose-800/40 text-rose-400 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer flex items-center justify-center"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
