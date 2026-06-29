"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit3, Trash2, Mic, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { REGISTRO_TIPOS, type TipoRegistro } from "./registro-tipo-config";
import { AnexoList } from "./anexos/anexo-list";
import { AnexoDropzone } from "./anexos/anexo-dropzone";
import { useAnexoUpload } from "./anexos/use-anexo-upload";

/**
 * Local guard — never calls format() on an invalid date.
 * Parses YYYY-MM-DD as a LOCAL date (not UTC midnight) to avoid timezone
 * drift: new Date("2026-07-11") → UTC midnight → Jul 10 in UTC-3 locales.
 */
const fmtPrazo = (s: string | null | undefined): string | null => {
  if (!s) return null;
  const parts = s.split("-");
  if (parts.length !== 3) return null;
  const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
  return isNaN(d.getTime()) ? null : format(d, "dd/MM");
};

export interface RegistroCardData {
  id: number;
  tipo: TipoRegistro;
  status?: string | null;
  prazo?: string | null; // YYYY-MM-DD — optional deadline field
  titulo?: string | null;
  conteudo: string | null;
  dataRegistro: Date | string;
  autor?: { id?: number; name: string | null; email?: string | null } | null;
  audioUrl?: string | null;
  transcricaoStatus?: string | null;
  audienciaId?: number | null;
}

interface Props {
  registro: RegistroCardData;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  /** When true and registro.prazo is set, renders a small amber prazo chip (dd/MM). */
  showPrazo?: boolean;
}

export function RegistroCard({ registro, onEdit, onDelete, showPrazo }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const data =
    typeof registro.dataRegistro === "string"
      ? new Date(registro.dataRegistro)
      : registro.dataRegistro;
  const hasAudio = !!registro.audioUrl;
  const tipoCfg = REGISTRO_TIPOS[registro.tipo];
  const TipoIcon = tipoCfg?.Icon;
  const prazoFormatted = showPrazo ? fmtPrazo(registro.prazo) : null;

  const conteudo = registro.conteudo ?? "";

  const utils = trpc.useUtils();
  const { upload } = useAnexoUpload(() =>
    utils.registros.anexos.list.invalidate({ registroId: registro.id }),
  );

  // Detecta overflow comparando scrollHeight (altura real) vs clientHeight
  // (altura visível com line-clamp). Se scrollHeight > clientHeight, há
  // texto cortado e a "Ver mais" deve aparecer. Reavaliamos quando o
  // conteúdo muda ou quando o card é redimensionado.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const check = () => {
      // Só mede no estado colapsado — quando expandido não há clamp.
      if (!expanded) {
        setHasOverflow(el.scrollHeight > el.clientHeight + 1);
      }
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [conteudo, expanded]);

  const autorIniciais = (registro.autor?.name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <AnexoDropzone onFiles={(files) => upload(registro.id, files)}>
      <div
        className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/60 dark:ring-neutral-800/70 px-3.5 py-2.5 group transition-colors border-l-2 hover:ring-neutral-300/70 dark:hover:ring-neutral-700/70"
        style={{ borderLeftColor: `${tipoCfg?.color ?? "#a1a1aa"}33` }}
      >
      {/* Header: tipo+audio (esq) | data+ações (dir) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Tipo badge: full label + colored bg/text per design spec §3 */}
          {tipoCfg && TipoIcon && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                tipoCfg.bg,
                tipoCfg.text,
              )}
            >
              <TipoIcon className="w-3 h-3" />
              {tipoCfg.label}
            </span>
          )}
          {prazoFormatted && (
            <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
              {prazoFormatted}
            </span>
          )}
          {hasAudio && (
            <Mic
              className="w-3 h-3 text-neutral-400"
              aria-label="Possui áudio"
            />
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <time className="text-[10.5px] text-neutral-500 dark:text-neutral-400 tabular-nums">
            {format(data, "dd 'de' MMM · HH:mm", { locale: ptBR })}
          </time>
          {/* Ações: hover-reveal no desktop; sempre visíveis em telas de toque
              (sem hover não há como descobri-las — era impossível editar/excluir no iPad) */}
          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity flex gap-0.5">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(registro.id)}
                className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                title="Editar"
                aria-label="Editar registro"
              >
                <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(registro.id)}
                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                title="Excluir"
                aria-label="Excluir registro"
              >
                <Trash2 className="w-3.5 h-3.5 text-neutral-400 hover:text-red-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {registro.titulo && (
        <h4 className="mt-1.5 text-[13px] font-semibold text-neutral-900 dark:text-neutral-100 leading-snug truncate">
          {registro.titulo}
        </h4>
      )}

      {registro.audienciaId && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-cyan-50 dark:bg-cyan-900/20 px-2 py-1 text-[11px] font-medium text-cyan-700 dark:text-cyan-300 ring-1 ring-inset ring-cyan-500/20">
          <CalendarCheck className="w-3 h-3" />
          Audiência agendada automaticamente
        </div>
      )}

      {conteudo && (
        <div className="mt-1.5">
          <p
            ref={contentRef}
            className={cn(
              "text-[13px] text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed",
              !expanded && "line-clamp-2",
            )}
          >
            {conteudo}
          </p>
          {(hasOverflow || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
            >
              {expanded ? "Ver menos" : "Ver mais"}
            </button>
          )}
        </div>
      )}

      {/* Footer: autor — discreto, com iniciais como avatar mini */}
      {registro.autor?.name && (
        <div className="mt-2 pt-1.5 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800"
            aria-hidden
          >
            {autorIniciais || "?"}
          </span>
          <span className="text-[10.5px] text-neutral-500 dark:text-neutral-400 truncate">
            {registro.autor.name}
          </span>
        </div>
      )}

        <AnexoList registroId={registro.id} />
      </div>
    </AnexoDropzone>
  );
}
