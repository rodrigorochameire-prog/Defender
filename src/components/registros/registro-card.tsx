"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Edit3, Trash2, Mic } from "lucide-react";
import { RegistroTipoChip } from "./registro-tipo-chip";
import { REGISTRO_TIPOS, type TipoRegistro } from "./registro-tipo-config";

export interface RegistroCardData {
  id: number;
  tipo: TipoRegistro;
  titulo?: string | null;
  conteudo: string | null;
  dataRegistro: Date | string;
  autor?: { id?: number; name: string | null; email?: string | null } | null;
  audioUrl?: string | null;
  transcricaoStatus?: string | null;
}

interface Props {
  registro: RegistroCardData;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function RegistroCard({ registro, onEdit, onDelete }: Props) {
  const data =
    typeof registro.dataRegistro === "string"
      ? new Date(registro.dataRegistro)
      : registro.dataRegistro;
  const hasAudio = !!registro.audioUrl;
  const tipoColor = REGISTRO_TIPOS[registro.tipo]?.color ?? "#a1a1aa";

  return (
    <div
      className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 border-l-[3px] px-3.5 py-3 space-y-1.5 group"
      style={{ borderLeftColor: tipoColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <RegistroTipoChip tipo={registro.tipo} />
          {hasAudio && (
            <Mic
              className="w-3 h-3 text-neutral-400"
              aria-label="Possui áudio"
            />
          )}
          <span className="text-[11px] text-neutral-500 dark:text-neutral-500">
            {format(data, "dd 'de' MMM, HH:mm", { locale: ptBR })}
          </span>
          {registro.autor?.name && (
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
              · {registro.autor.name}
            </span>
          )}
        </div>
        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex gap-0.5 shrink-0">
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

      {registro.titulo && (
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {registro.titulo}
        </h4>
      )}

      {registro.conteudo && (
        <p className="text-[13px] text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
          {registro.conteudo}
        </p>
      )}
    </div>
  );
}
