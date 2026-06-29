"use client";

import { useState } from "react";
import { Pencil, Paperclip } from "lucide-react";
import { RegistroEditor } from "./registro-editor";
import type { TipoRegistro } from "./registro-tipo-config";
import { cn } from "@/lib/utils";

export type RegistroComposerProps = {
  scope: {
    assistidoId: number;
    processoId?: number;
    demandaId?: number;
    audienciaId?: number;
  };
  /** Tipo selecionado por padrão no editor. Padrão: "ciencia". */
  tipoDefault?: TipoRegistro;
  /** Encaminhado ao RegistroEditor para controlar os tipos mostrados inline. */
  tiposPrimarios?: TipoRegistro[];
  /** Allowlist estrita de tipos selecionáveis (ex.: aba de audiência). */
  tiposPermitidos?: TipoRegistro[];
  /**
   * Quando fornecido, exibe um botão "Abrir autos" na barra colapsada que
   * chama este callback sem abrir o editor (a surface pai controla o diálogo).
   */
  onAbrirAutos?: () => void;
  /** Borbulhado do RegistroEditor.onSaved — o painel usa para refazer a lista. */
  onSaved?: () => void;
};

/**
 * Barra de composição persistente do painel de Registros.
 *
 * - Colapsada: mostra "Adicionar registro…" + opcional "Abrir autos".
 * - Expandida: monta o <RegistroEditor> inline (sem reimplementar o formulário).
 */
export function RegistroComposer({
  scope,
  tipoDefault = "ciencia",
  tiposPrimarios,
  tiposPermitidos,
  onAbrirAutos,
  onSaved,
}: RegistroComposerProps) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <RegistroEditor
        assistidoId={scope.assistidoId}
        processoId={scope.processoId}
        demandaId={scope.demandaId}
        audienciaId={scope.audienciaId}
        tipoDefault={tipoDefault}
        tiposPrimarios={tiposPrimarios}
        tiposPermitidos={tiposPermitidos}
        onSaved={() => {
          setOpen(false);
          onSaved?.();
        }}
        onCancel={() => setOpen(false)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl",
        "bg-neutral-50 dark:bg-neutral-900/50",
        "ring-1 ring-neutral-200 dark:ring-neutral-800",
      )}
    >
      {/* Clickable affordance that expands the inline editor */}
      <button
        type="button"
        aria-label="Adicionar registro…"
        aria-expanded={false}
        onClick={() => setOpen(true)}
        className={cn(
          "flex flex-1 items-center gap-2 text-sm",
          "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
          "transition-colors cursor-pointer",
        )}
      >
        <Pencil className="w-3.5 h-3.5 shrink-0" />
        <span>Adicionar registro…</span>
      </button>

      {/* Optional: open-autos affordance — does NOT open the editor */}
      {onAbrirAutos && (
        <button
          type="button"
          aria-label="Abrir autos"
          onClick={onAbrirAutos}
          className={cn(
            "flex items-center gap-1 text-xs",
            "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
            "transition-colors px-1.5 py-0.5 rounded",
            "hover:bg-neutral-100 dark:hover:bg-neutral-800",
          )}
        >
          <Paperclip className="w-3.5 h-3.5 shrink-0" />
          <span>Abrir autos</span>
        </button>
      )}
    </div>
  );
}
