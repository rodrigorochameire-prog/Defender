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
        className="rounded-r-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] dark:shadow-black/20 px-3.5 py-2.5 group transition-shadow border-l-[3px] hover:shadow-md hover:shadow-black/[0.07]"
        style={{ borderLeftColor: `${tipoCfg?.color ?? "#a1a1aa"}70` }}
      >
      {/* Header: tipo+audio (esq) | data+ações (dir) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {tipoCfg && TipoIcon && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide"
              style={{ color: tipoCfg.color }}
            >
              <TipoIcon className="w-3 h-3" />
              {tipoCfg.shortLabel.toUpperCase()}
            </span>
          )}
          {prazoFormatted && (
            <span className="inline-flex items-center rounded px-1.5 py-px text-[10px] font-semibold tracking-wide text-amber-600 dark:text-amber-400">
              · {prazoFormatted}
            </span>
          )}
          {hasAudio && (
            <Mic className="w-3 h-3 text-neutral-300 dark:text-neutral-600" aria-label="Possui áudio" />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <time className="text-[10px] text-neutral-400 dark:text-neutral-500 tabular-nums">
            {format(data, "dd MMM · HH:mm", { locale: ptBR })}
          </time>
          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity flex gap-0.5">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(registro.id)}
                className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                title="Editar"
                aria-label="Editar registro"
              >
                <Edit3 className="w-3 h-3 text-neutral-400" />
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
                <Trash2 className="w-3 h-3 text-neutral-400 hover:text-red-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {registro.titulo && (
        <h4 className="mt-1.5 text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">
          {registro.titulo}
        </h4>
      )}

      {registro.audienciaId && (
        <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-cyan-600 dark:text-cyan-400">
          <CalendarCheck className="w-3 h-3" />
          Audiência agendada
        </div>
      )}

      {conteudo && (
        <div className="mt-1.5">
          <p
            ref={contentRef}
            className={cn(
              "text-[12.5px] text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap leading-[1.55]",
              !expanded && "line-clamp-3",
            )}
          >
            {conteudo}
          </p>
          {(hasOverflow || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-[10px] font-medium text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
            >
              {expanded ? "↑ menos" : "↓ mais"}
            </button>
          )}
        </div>
      )}

      {registro.autor?.name && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-[9px] text-neutral-400 dark:text-neutral-500 truncate">
            {autorIniciais}
          </span>
        </div>
      )}

        <AnexoList registroId={registro.id} />
      </div>
    </AnexoDropzone>
  );
}
