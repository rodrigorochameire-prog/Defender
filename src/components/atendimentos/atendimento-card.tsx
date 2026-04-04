"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MessageCircle, User, Phone, Video, Mail, Shield, Mic,
  ChevronDown, ChevronUp, Pencil, FileText, FolderOpen, Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Tipo config ────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  whatsapp:        { icon: MessageCircle, color: "text-emerald-500",                              label: "WhatsApp" },
  presencial:      { icon: User,          color: "text-neutral-600 dark:text-neutral-400",        label: "Presencial" },
  telefone:        { icon: Phone,         color: "text-neutral-600 dark:text-neutral-400",        label: "Telefone" },
  videoconferencia:{ icon: Video,         color: "text-blue-500",                                 label: "Videoconferência" },
  email:           { icon: Mail,          color: "text-neutral-600 dark:text-neutral-400",        label: "Email" },
  visita_carceraria:{ icon: Shield,       color: "text-neutral-600 dark:text-neutral-400",        label: "Visita Carcerária" },
  plaud:           { icon: Mic,           color: "text-violet-500",                               label: "Plaud" },
};

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  realizado:      { label: "Realizado",       classes: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  agendado:       { label: "Agendado",        classes: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" },
  cancelado:      { label: "Cancelado",       classes: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500" },
  nao_compareceu: { label: "Não Compareceu",  classes: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" },
};

// ─── Interlocutor labels ─────────────────────────────────────────────────────

const INTERLOCUTOR_LABELS: Record<string, string> = {
  assistido:  "Assistido",
  familiar:   "Familiar",
  testemunha: "Testemunha",
  outro:      "Outro",
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface PontosChave {
  compromissos?: string[];
  informacoesRelevantes?: string[];
  duvidasPendentes?: string[];
  providenciasNecessarias?: string[];
}

interface AtendimentoCardProps {
  atendimento: {
    id: number;
    dataAtendimento: Date | string;
    tipo: string;
    assunto: string | null;
    resumo: string | null;
    duracao: number | null;
    status: string | null;
    interlocutor: string | null;
    pontosChave: PontosChave | null;
    plaudRecordingId: string | null;
    audioUrl: string | null;
    audioDriveFileId: string | null;
    transcricaoStatus: string | null;
    enrichmentStatus: string | null;
  };
  processoNumero?: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AtendimentoCard({
  atendimento,
  processoNumero,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: AtendimentoCardProps) {
  const data = new Date(atendimento.dataAtendimento);
  const tipoConfig = TIPO_CONFIG[atendimento.tipo] ?? TIPO_CONFIG.presencial;
  const TipoIcon = tipoConfig.icon;

  const statusConfig = atendimento.status ? STATUS_CONFIG[atendimento.status] : null;

  const interlocutorLabel = atendimento.interlocutor
    ? (INTERLOCUTOR_LABELS[atendimento.interlocutor] ?? atendimento.interlocutor)
    : null;

  // ── Pontos-chave: concatenar todos os arrays ──────────────────────────────
  const pk = atendimento.pontosChave;
  const pontosChaveItems: { text: string; isProvidencia: boolean }[] = [];
  if (pk) {
    (pk.compromissos ?? []).forEach((t) => pontosChaveItems.push({ text: t, isProvidencia: false }));
    (pk.informacoesRelevantes ?? []).forEach((t) => pontosChaveItems.push({ text: t, isProvidencia: false }));
    (pk.duvidasPendentes ?? []).forEach((t) => pontosChaveItems.push({ text: t, isProvidencia: false }));
    (pk.providenciasNecessarias ?? []).forEach((t) => pontosChaveItems.push({ text: t, isProvidencia: true }));
  }

  // ── Meta line ─────────────────────────────────────────────────────────────
  const hora = format(data, "HH:mm", { locale: ptBR });
  const metaParts: string[] = [hora];
  if (atendimento.duracao != null) metaParts.push(`${atendimento.duracao}min`);
  if (processoNumero) metaParts.push(`Proc. ${processoNumero}`);
  if (interlocutorLabel) metaParts.push(interlocutorLabel);

  const hasPlaud = Boolean(atendimento.plaudRecordingId);
  const hasTranscricao = atendimento.transcricaoStatus === "concluido" || atendimento.transcricaoStatus === "completed";
  const hasDrive = Boolean(atendimento.audioDriveFileId);

  return (
    <div
      className={cn(
        "bg-white dark:bg-neutral-900/50 rounded-lg transition-all duration-200",
        isExpanded
          ? "border border-neutral-900 dark:border-neutral-100"
          : "border border-neutral-200 dark:border-neutral-800",
      )}
    >
      {/* ── Compact header (always visible) ────────────────────────────────── */}
      <div
        className="px-3 py-2.5 cursor-pointer select-none"
        onClick={onToggle}
        role="button"
        aria-expanded={isExpanded}
      >
        {/* Row 1: icon · tipo — assunto · badges · chevron */}
        <div className="flex items-center gap-2">
          {/* Tipo icon */}
          <TipoIcon className={cn("w-3.5 h-3.5 shrink-0", tipoConfig.color)} />

          {/* Tipo — Assunto */}
          <span className="text-[11px] font-medium text-neutral-900 dark:text-neutral-100 flex-1 min-w-0 truncate">
            {tipoConfig.label}
            {atendimento.assunto ? (
              <span className="text-neutral-500 dark:text-neutral-400 font-normal"> — {atendimento.assunto}</span>
            ) : null}
          </span>

          {/* Badges */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Status badge */}
            {statusConfig && (
              <span className={cn("text-[9px] font-medium px-1.5 py-px rounded-full", statusConfig.classes)}>
                {statusConfig.label}
              </span>
            )}

            {/* Plaud badge */}
            {hasPlaud && (
              <span className="text-[9px] font-medium px-1.5 py-px rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                Plaud
              </span>
            )}

            {/* Transcrito badge */}
            {hasTranscricao && (
              <span className="text-[9px] font-medium px-1.5 py-px rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                Transcrito
              </span>
            )}

            {/* Drive badge */}
            {hasDrive && (
              <span className="text-[9px] font-medium px-1.5 py-px rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                Drive
              </span>
            )}

            {/* Chevron */}
            {isExpanded ? (
              <ChevronUp className="w-3 h-3 text-neutral-400 dark:text-neutral-500 ml-0.5" />
            ) : (
              <ChevronDown className="w-3 h-3 text-neutral-400 dark:text-neutral-500 ml-0.5" />
            )}
          </div>
        </div>

        {/* Row 2: meta */}
        {metaParts.length > 0 && (
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 pl-[22px]">
            {metaParts.join(" · ")}
          </p>
        )}
      </div>

      {/* ── Expanded section ────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="px-3 py-3 space-y-3">
            {/* Resumo */}
            {atendimento.resumo && (
              <div>
                <p className="text-[9px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-1">
                  Resumo
                </p>
                <p className="text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {atendimento.resumo}
                </p>
              </div>
            )}

            {/* Pontos-chave */}
            {pontosChaveItems.length > 0 && (
              <div>
                <p className="text-[9px] uppercase tracking-wider font-semibold text-neutral-400 dark:text-neutral-500 mb-1.5">
                  Pontos-chave
                </p>
                <div className="flex flex-wrap gap-1">
                  {pontosChaveItems.map((item, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full",
                        item.isProvidencia
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300",
                      )}
                    >
                      {item.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Actions row ─────────────────────────────────────────────────── */}
          <div className="border-t border-neutral-100 dark:border-neutral-800 px-2 py-1.5 flex items-center gap-1">
            {/* Editar */}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Editar
            </button>

            {/* Completo */}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded transition-colors"
            >
              <FileText className="w-3 h-3" />
              Completo
            </button>

            {/* Drive — só se audioDriveFileId existir */}
            {hasDrive && (
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded transition-colors"
              >
                <FolderOpen className="w-3 h-3" />
                Drive
              </button>
            )}

            {/* Spacer */}
            <span className="flex-1" />

            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
