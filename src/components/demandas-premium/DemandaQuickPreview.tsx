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
import { getStatusConfig, STATUS_GROUPS, DEMANDA_STATUS, PIPELINE_STAGES, getStageIndex, type StatusGroup } from "@/config/demanda-status";
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
// PIPELINE STEPPER (interactive, inline)
// ============================================

function PipelineStepper({
  currentStatus,
  statusGroup,
  onSelect,
}: {
  currentStatus: string;
  statusGroup: StatusGroup;
  onSelect: (status: string) => void;
}) {
  const currentStageIdx = getStageIndex(statusGroup);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  const normalizedCurrent = currentStatus.toLowerCase().replace(/\s+/g, "_");

  // Get substatus options for the expanded stage
  const expandedOptions = expandedStage !== null
    ? Object.entries(DEMANDA_STATUS)
        .filter(([, v]) => v.group === PIPELINE_STAGES[expandedStage].key)
        .map(([key, v]) => ({ key, ...v }))
    : [];

  const expandedColor = expandedStage !== null
    ? STATUS_GROUPS[PIPELINE_STAGES[expandedStage].key]?.color || "#A1A1AA"
    : "#A1A1AA";

  return (
    <div className="px-5 py-5 border-t border-zinc-100 dark:border-zinc-800/50">
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
          const isExpanded = expandedStage === i;
          const stageColor = STATUS_GROUPS[stage.key]?.color || "#A1A1AA";

          return (
            <button
              key={stage.key}
              onClick={() => setExpandedStage(expandedStage === i ? null : i)}
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
                      : isExpanded
                        ? "w-5 h-5 ring-2 ring-offset-1 dark:ring-offset-zinc-900"
                        : "w-4 h-4 group-hover/stage:w-5 group-hover/stage:h-5"
                }`}
                style={{
                  backgroundColor: isCompleted ? "#84CC9B" : isActive ? stageColor : isExpanded ? `${stageColor}80` : "#e4e4e7",
                  ['--tw-ring-color' as any]: (isActive || isExpanded) ? `${stageColor}40` : undefined,
                }}
              >
                {isCompleted && <Check className="w-3 h-3 text-white" />}
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              {/* Label */}
              <span
                className={`mt-1.5 text-[10px] font-medium whitespace-nowrap transition-colors ${
                  isActive || isExpanded ? "font-bold" : isCompleted ? "" : "text-zinc-400 dark:text-zinc-500"
                }`}
                style={{
                  color: isActive || isExpanded ? stageColor : isCompleted ? "#84CC9B" : undefined,
                }}
              >
                <span className="hidden sm:inline">{stage.label}</span>
                <span className="sm:hidden">{stage.short}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Inline substatus options (shown when a stage is clicked) */}
      {expandedStage !== null && (
        <div
          className="mt-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-700/40 overflow-hidden"
          style={{ animation: "fadeInDown 0.15s ease-out" }}
        >
          {/* Stage header */}
          <div
            className="px-3 py-2 flex items-center gap-2"
            style={{ borderBottom: `2px solid ${expandedColor}30` }}
          >
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: expandedColor }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: expandedColor }}>
              {PIPELINE_STAGES[expandedStage].label}
            </span>
          </div>
          {/* Options */}
          <div className="py-1">
            {expandedOptions.map((opt) => {
              const isCurrentOpt = opt.key === normalizedCurrent;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(opt.key);
                    setExpandedStage(null);
                  }}
                  className={`
                    w-full px-3 py-2 flex items-center gap-2.5 text-left
                    transition-colors duration-100 cursor-pointer
                    ${isCurrentOpt
                      ? "bg-emerald-50/80 dark:bg-emerald-950/20"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }
                  `}
                >
                  <span className="shrink-0" style={{ color: isCurrentOpt ? expandedColor : `${expandedColor}80` }}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span
                    className={`text-xs flex-1 ${
                      isCurrentOpt
                        ? "font-bold text-zinc-900 dark:text-zinc-100"
                        : "font-medium text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {opt.label}
                  </span>
                  {isCurrentOpt && (
                    <Check className="w-3.5 h-3.5 shrink-0" style={{ color: expandedColor }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
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
  const uploadFile = trpc.drive.uploadFile.useMutation();

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
            className="px-5 pt-5 pb-4"
            style={{
              background: `linear-gradient(180deg, ${atribuicaoColor}14 0%, transparent 100%)`,
            }}
          >
            <div className="flex items-start gap-3.5">
              <AssistidoAvatar
                nome={demanda.assistido}
                photoUrl={demanda.photoUrl}
                atribuicao={demanda.atribuicaoEnum || demanda.atribuicao}
                statusPrisional={demanda.estadoPrisional}
                showStatusDot={isPreso}
                size="xl"
              />
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-serif text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
                    {demanda.assistido}
                  </h2>
                  {/* Flags inline com nome */}
                  {isPreso && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 shrink-0">
                      <Lock className="w-2.5 h-2.5" /> Preso
                    </span>
                  )}
                  {isUrgente && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 shrink-0">
                      <Flame className="w-2.5 h-2.5" /> Urgente
                    </span>
                  )}
                </div>

                {/* Processo — chip copiável */}
                {processo && (
                  <button
                    className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 group/proc cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      copyToClipboard(processo.numero, "Processo copiado!");
                    }}
                    title="Copiar número do processo"
                  >
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 group-hover/proc:text-emerald-700 dark:group-hover/proc:text-emerald-400 transition-colors">{processo.numero}</span>
                    <Copy className="w-3 h-3 text-zinc-300 dark:text-zinc-600 group-hover/proc:text-emerald-500 transition-colors" />
                  </button>
                )}

                {/* Action links — underline on hover */}
                <div className="flex items-center gap-3 mt-2">
                  {demanda.assistidoId && (
                    <Link
                      href={`/admin/assistidos/${demanda.assistidoId}`}
                      className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:underline underline-offset-2 transition-colors"
                    >
                      Ver assistido
                    </Link>
                  )}
                  {demanda.processoId && (
                    <Link
                      href={`/admin/processos/${demanda.processoId}`}
                      className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:underline underline-offset-2 transition-colors"
                    >
                      Ver processo
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ===== PIPELINE STEPPER (interactive) ===== */}
          <PipelineStepper
            currentStatus={demanda.substatus || demanda.status}
            statusGroup={statusConfig.group}
            onSelect={(status) => onStatusChange(demanda.id, status)}
          />

          {/* ===== CARD SECTIONS ===== */}
          <div className="px-4 sm:px-5 pb-4 space-y-4">
            {/* Section label: AÇÃO */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Ação</span>
              <div className="flex-1 h-px bg-zinc-200/50 dark:bg-zinc-700/30" />
            </div>

            {/* Card 1: Prazo + Providências — unified with border */}
            <div className="rounded-xl bg-zinc-50/80 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-700/40 overflow-hidden">
              {/* Prazo row */}
              <div className="flex items-center justify-between px-3.5 sm:px-4 py-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Prazo</span>
                  <InlineDatePicker
                    value={demanda.prazo}
                    onChange={(isoDate) => onPrazoChange(demanda.id, isoDate)}
                    placeholder="Definir prazo"
                    showEditIcon
                  />
                </div>
                {prazoBadge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                    prazoBadge.cor === "red" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 animate-pulse" :
                    prazoBadge.cor === "amber" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                    prazoBadge.cor === "green" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                    {prazoBadge.texto}
                  </span>
                )}
              </div>
              {/* Divider */}
              <div className="border-t border-zinc-200/40 dark:border-zinc-700/30" />
              {/* Providências */}
              <div className="px-3.5 sm:px-4 pt-2.5 pb-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Providências</span>
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
                  className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 min-h-[64px] bg-white/60 dark:bg-zinc-900/40 rounded-lg p-2.5 transition-colors group/edit"
                  multiline
                />
                {/* Timestamp última edição */}
                {demanda.updatedAt && (
                  <div className="flex items-center gap-1 mt-1.5 px-1">
                    <Clock className="w-2.5 h-2.5 text-zinc-300 dark:text-zinc-600" />
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      Editado {new Date(demanda.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section label: CLASSIFICAÇÃO */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">Classificação</span>
              <div className="flex-1 h-px bg-zinc-200/50 dark:bg-zinc-700/30" />
            </div>

            {/* Detalhes — floating rows without card bg */}
            <div className="overflow-hidden divide-y divide-zinc-200/40 dark:divide-zinc-700/25">
              {/* Status row */}
              <div className="flex items-center px-3.5 sm:px-4 py-2.5 gap-3">
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${statusColor}18` }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium w-14 shrink-0">Status</span>
                <div className="flex-1 text-right">
                  <InlineDropdown
                    value={demanda.status}
                    compact
                    displayValue={
                      <span className="text-xs text-zinc-600 dark:text-zinc-300">
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
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium w-14 shrink-0">Atribuição</span>
                <div className="flex-1 text-right">
                  <InlineDropdown
                    value={demanda.atribuicao}
                    compact
                    displayValue={
                      <span className="text-xs text-zinc-600 dark:text-zinc-300">
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
                <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-700/40 flex items-center justify-center shrink-0">
                  <Scale className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium w-14 shrink-0">Ato</span>
                <div className="flex-1 text-right">
                  <InlineDropdown
                    value={demanda.ato}
                    compact
                    displayValue={
                      <span className="text-xs text-zinc-600 dark:text-zinc-300">
                        {demanda.ato || <span className="text-zinc-400 dark:text-zinc-500 italic">Selecionar</span>}
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
                className="w-full flex items-center gap-3 px-3.5 sm:px-4 py-2 text-[10px] text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100/50 dark:hover:bg-zinc-700/20 transition-colors cursor-pointer"
              >
                <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-700/40 flex items-center justify-center shrink-0">
                  {metadataOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </div>
                <span className="font-medium">Metadados</span>
              </button>
              {metadataOpen && (
                <>
                  {demanda.dataInclusao && (
                    <div className="flex items-center px-3.5 sm:px-4 py-2 gap-3">
                      <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-700/40 flex items-center justify-center shrink-0">
                        <Clock className="w-3 h-3 text-zinc-400" />
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium w-14 shrink-0">Importado</span>
                      <span className="flex-1 text-right text-xs text-zinc-500 dark:text-zinc-400">{new Date(demanda.dataInclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                  {demanda.estadoPrisional && (
                    <div className="flex items-center px-3.5 sm:px-4 py-2 gap-3">
                      <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-700/40 flex items-center justify-center shrink-0">
                        <Lock className="w-3 h-3 text-zinc-400" />
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium w-14 shrink-0">Prisional</span>
                      <span className="flex-1 text-right text-xs text-zinc-500 dark:text-zinc-400 capitalize">{demanda.estadoPrisional}</span>
                    </div>
                  )}
                  {processo?.tipo && (
                    <div className="flex items-center px-3.5 sm:px-4 py-2 gap-3">
                      <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-700/40 flex items-center justify-center shrink-0">
                        <FileText className="w-3 h-3 text-zinc-400" />
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium w-14 shrink-0">Tipo</span>
                      <span className="flex-1 text-right text-xs text-zinc-500 dark:text-zinc-400">{processo.tipo}</span>
                    </div>
                  )}
                  {demanda.importBatchId && (
                    <div className="flex items-center px-3.5 sm:px-4 py-2 gap-3">
                      <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-700/40 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-3 h-3 text-zinc-400" />
                      </div>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium w-14 shrink-0">Batch</span>
                      <span className="flex-1 text-right text-xs font-mono text-zinc-500 dark:text-zinc-400">{demanda.importBatchId.slice(0, 8)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ===== STICKY ACTIONS BOTTOM BAR ===== */}
        <div className="sticky bottom-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 px-5 py-2.5 flex items-center gap-2">
          <button
            onClick={() => { onStatusChange(demanda.id, "resolvido"); onOpenChange(false); }}
            className="flex-1 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Resolver
          </button>
          <button
            onClick={() => { onArchive(demanda.id); onOpenChange(false); }}
            className="h-8 px-3.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-500 dark:text-zinc-400 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5"
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
