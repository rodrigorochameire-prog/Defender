"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Loader2, Mic, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { PessoaAvatar } from "@/components/shared/pessoa-avatar";
import { secoesPorTipo } from "@/lib/agenda/secao-classificada";
import type { Segmento } from "@/lib/agenda/transcript-sync";
import { VincularAudioPopover } from "./vincular-audio-popover";
import { TranscriptPlayer } from "./transcript-player";
import { GravarDepoimento } from "./gravar-depoimento";

export interface DepoenteV2 {
  id?: number;
  nome: string;
  tipo?: "ACUSACAO" | "DEFESA" | "COMUM" | "INFORMANTE" | "PERITO" | "VITIMA";
  status?: "ARROLADA" | "INTIMADA" | "OUVIDA" | "DESISTIDA" | "NAO_LOCALIZADA" | "CARTA_PRECATORIA";
  lado?: string;
  qualidade?: string;
  papel?: string;
  versaoDelegacia?: string | null;
  versaoJuizo?: string | null;
  sinteseJuizo?: string | null;
  perguntasSugeridas?: string | null;
  ouvidoEm?: Date | string | null;
  redesignadoPara?: string | null;
  audioDriveFileId?: string | null;
  certidaoComunicacao?: string | null;
}

interface Props {
  depoente: DepoenteV2;
  isOpen: boolean;
  onToggle: () => void;
  variant: "sheet" | "modal";
  onMarcarOuvido: (id: number, sintese?: string) => void;
  onRedesignar: (id: number) => void;
  onAdicionarPergunta: (id: number) => void;
  onAbrirAudio?: (id: number) => void;
  assistidoId?: number | null;
  /** Processo do depoente — habilita o deep-link ao termo do IP (seção classificada). */
  processoId?: number | null;
  /** Rosto capturado da pessoa (data URL) — vira avatar do depoente. */
  avatarUrl?: string | null;
}

function ladoOf(d: DepoenteV2): "acusacao" | "defesa" | "neutro" {
  if (d.lado === "acusacao" || d.tipo === "ACUSACAO" || d.tipo === "VITIMA") return "acusacao";
  if (d.lado === "defesa" || d.tipo === "DEFESA") return "defesa";
  return "neutro";
}

function statusLabel(s?: string): { text: string; tone: "emerald" | "amber" | "neutral" } {
  switch (s) {
    case "OUVIDA": return { text: "Ouvido", tone: "emerald" };
    case "DESISTIDA":
    case "NAO_LOCALIZADA": return { text: "Redesignado", tone: "amber" };
    default: return { text: "Pendente", tone: "neutral" };
  }
}

function qualidadeLabel(d: DepoenteV2): string | null {
  if (d.qualidade) return d.qualidade;
  if (d.tipo === "VITIMA") return "Vítima";
  if (d.tipo === "ACUSACAO") return "Acusação";
  if (d.tipo === "DEFESA") return "Defesa";
  if (d.tipo === "INFORMANTE") return "Informante";
  if (d.tipo === "PERITO") return "Perito";
  if (d.tipo === "COMUM") return "Testemunha";
  return null;
}

function intimacaoLabel(status?: string): { text: string; color: string } | null {
  switch (status) {
    case "INTIMADA":        return { text: "Intimada",                        color: "text-emerald-600 dark:text-emerald-400" };
    case "ARROLADA":        return { text: "Não intimada",                    color: "text-rose-600 dark:text-rose-400" };
    case "NAO_LOCALIZADA":  return { text: "Não intimada — não localizada",   color: "text-rose-600 dark:text-rose-400" };
    case "CARTA_PRECATORIA":return { text: "Carta precatória expedida",       color: "text-amber-600 dark:text-amber-400" };
    case "DESISTIDA":       return { text: "Desistência comunicada",          color: "text-neutral-400 dark:text-neutral-500" };
    default:                return null;
  }
}

function CertidaoExpander({ teor }: { teor: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] font-medium text-neutral-500 hover:text-emerald-600 dark:text-neutral-400 cursor-pointer"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        <FileText className="h-3 w-3" />
        {open ? "Ocultar certidão de comunicação" : "Ver certidão de comunicação"}
      </button>
      {open && (
        <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded ring-1 ring-neutral-200 p-2 text-[10.5px] leading-relaxed text-neutral-600 dark:text-neutral-400 dark:ring-neutral-800">
          {teor}
        </p>
      )}
    </div>
  );
}

const TRANSC_STATUS: Record<string, { label: string; tone: string; spin?: boolean }> = {
  pending: { label: "Transcrição na fila", tone: "text-amber-600", spin: true },
  processing: { label: "Transcrevendo…", tone: "text-amber-600", spin: true },
  completed: { label: "Transcrição pronta", tone: "text-emerald-600" },
  failed: { label: "Falha na transcrição", tone: "text-rose-600" },
};

export function DepoenteCardV2({ depoente, isOpen, onToggle, onMarcarOuvido, onRedesignar, onAdicionarPergunta, onAbrirAudio, assistidoId, processoId, avatarUrl }: Props) {
  const lado = ladoOf(depoente);
  const status = statusLabel(depoente.status);
  const ouvidoEmJuizo = depoente.status === "OUVIDA";
  const [gravando, setGravando] = useState(false);

  // Mídia gravada do depoimento em juízo (áudio + transcrição segmentada).
  // Só busca quando o card está expandido; faz polling leve enquanto o daemon
  // transcreve (pending/processing).
  const utils = trpc.useUtils();
  const { data: midia } = trpc.audiencias.getDepoenteMidia.useQuery(
    { depoenteId: depoente.id ?? 0 },
    {
      enabled: isOpen && depoente.id != null,
      refetchInterval: (q) => {
        const s = q.state.data?.transcricaoStatus;
        return s === "pending" || s === "processing" ? 15_000 : false;
      },
    },
  );
  const transcStatus = midia?.transcricaoStatus ? TRANSC_STATUS[midia.transcricaoStatus] : null;
  const audioDepoimento = midia?.audioDriveFileId ?? null;
  const segments = (midia?.segments ?? []) as Segmento[];

  // Termo do IP/delegacia: melhor seção classificada do tipo termo/depoimento.
  const { data: sections } = trpc.drive.sectionsByProcesso.useQuery(
    { processoId: processoId ?? 0 },
    { enabled: isOpen && typeof processoId === "number" && processoId > 0 },
  );
  const termoIp = secoesPorTipo(sections ?? [], ["termo", "depoimento", "interrogatorio", "oitiva"])[0] ?? null;
  const termoIpHref =
    termoIp?.fileWebViewLink && (depoente.versaoDelegacia || termoIp.textoExtraido)
      ? `${termoIp.fileWebViewLink}${termoIp.paginaInicio ? `#page=${termoIp.paginaInicio}` : ""}`
      : null;

  const topBarColor = {
    acusacao: "bg-rose-300/70",
    defesa: "bg-emerald-300/70",
    neutro: "bg-neutral-200",
  }[lado];

  const papelParaAvatar = { acusacao: "ACUSACAO", defesa: "DEFESA", neutro: undefined }[lado] as string | undefined;
  const statusClasses = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    neutral: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  }[status.tone];

  return (
    <div
      data-lado={lado}
      className="border border-neutral-200/60 dark:border-neutral-700/60 overflow-hidden"
    >
      {/* Semantic top bar */}
      <div className={cn("h-[3px] w-full", topBarColor)} />
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20"
      >
        <PessoaAvatar nome={depoente.nome} photoUrl={avatarUrl} papel={papelParaAvatar} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate">
            {depoente.nome}
          </div>
          {qualidadeLabel(depoente) && (
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {qualidadeLabel(depoente)}
            </div>
          )}
        </div>
        <Badge className={cn("text-[9px] px-1.5 py-0", statusClasses)}>{status.text}</Badge>
        {isOpen
          ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          : <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
        }
      </button>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-neutral-100 dark:border-neutral-800/40 pt-2.5 space-y-2.5">
          {/* Intimação status */}
          {(() => {
            const intim = intimacaoLabel(depoente.status);
            return (intim || depoente.certidaoComunicacao) ? (
              <div>
                {intim && <p className={cn("text-[10px] font-medium leading-snug", intim.color)}>{intim.text}</p>}
                {depoente.certidaoComunicacao && (
                  <CertidaoExpander teor={depoente.certidaoComunicacao} />
                )}
              </div>
            ) : null;
          })()}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="text-[9px] font-semibold text-neutral-400 tracking-wide">
                🏛 DELEGACIA
              </div>
              {termoIpHref && (
                <a
                  href={termoIpHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[9px] font-medium text-neutral-500 hover:text-emerald-600 cursor-pointer"
                >
                  <ExternalLink className="h-2.5 w-2.5" /> ver termo (IP)
                </a>
              )}
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {depoente.versaoDelegacia ?? <span className="italic text-neutral-300">vazio</span>}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="text-[9px] font-semibold text-neutral-400 tracking-wide">
                ⚖ EM JUÍZO
              </div>
              {transcStatus && (
                <span className={cn("inline-flex items-center gap-1 text-[9px] font-medium", transcStatus.tone)}>
                  {transcStatus.spin && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                  {transcStatus.label}
                </span>
              )}
            </div>
            {audioDepoimento ? (
              <TranscriptPlayer
                driveFileId={audioDepoimento}
                segments={segments}
                transcricao={midia?.transcricao ?? null}
              />
            ) : (() => {
              const ouvidoJuizo = depoente.sinteseJuizo ?? depoente.versaoJuizo ?? null;
              return ouvidoJuizo ? (
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">{ouvidoJuizo}</p>
              ) : (
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 italic leading-relaxed">
                  Ainda não ouvido em juízo — preparar inquirição.
                </p>
              );
            })()}
          </div>
          {depoente.perguntasSugeridas && (
            <div>
              <div className="text-[9px] font-semibold text-emerald-600/80 dark:text-emerald-500/70 tracking-wide mb-0.5">
                🎯 {(depoente.sinteseJuizo ?? depoente.versaoJuizo) ? "PERGUNTAS PREPARADAS" : "IDEIAS PARA INQUIRIÇÃO"}
              </div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-relaxed">
                {depoente.perguntasSugeridas}
              </p>
            </div>
          )}

          {/* Gravar depoimento — somente para depoentes ainda não ouvidos em juízo
              e sem áudio gravado (gravar é para NOVAS gravações; vincular áudio
              pré-existente do Drive segue no popover abaixo). */}
          {!ouvidoEmJuizo && !audioDepoimento && depoente.id != null && (
            <div>
              {gravando ? (
                <GravarDepoimento
                  depoenteId={depoente.id}
                  onUploaded={() => {
                    setGravando(false);
                    if (depoente.id != null)
                      utils.audiencias.getDepoenteMidia.invalidate({ depoenteId: depoente.id });
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setGravando(true)}
                  className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-emerald-400 cursor-pointer"
                >
                  <Mic className="h-3 w-3 text-rose-500" /> Gravar depoimento
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-dashed border-neutral-100 dark:border-neutral-800/40">
            {depoente.status !== "OUVIDA" && (
              <button
                type="button"
                onClick={() => depoente.id != null && onMarcarOuvido(depoente.id, undefined)}
                className="text-[10px] font-medium px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 cursor-pointer"
              >
                ✓ Marcar ouvido
              </button>
            )}
            <button
              type="button"
              onClick={() => depoente.id != null && onRedesignar(depoente.id)}
              className="text-[10px] font-medium px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer"
            >
              ↷ Redesignar
            </button>
            <button
              type="button"
              onClick={() => depoente.id != null && onAdicionarPergunta(depoente.id)}
              className="text-[10px] font-medium px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer"
            >
              + Pergunta
            </button>
            {depoente.id != null && assistidoId && (
              <VincularAudioPopover
                depoenteId={depoente.id}
                currentAudioId={depoente.audioDriveFileId ?? null}
                assistidoId={assistidoId}
              />
            )}
            {depoente.audioDriveFileId && onAbrirAudio && (
              <button
                type="button"
                onClick={() => depoente.id != null && onAbrirAudio(depoente.id)}
                className="text-[10px] font-medium px-2 py-1 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer"
              >
                ▶ Áudio
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
