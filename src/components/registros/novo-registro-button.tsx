"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { RegistroEditor } from "./registro-editor";
import type { TipoRegistro } from "./registro-tipo-config";

interface Props {
  assistidoId: number;
  processoId?: number;
  demandaId?: number;
  audienciaId?: number;
  tipoDefault: TipoRegistro;
  tiposPermitidos?: TipoRegistro[];
  label?: string;
}

export function NovoRegistroButton(props: Props) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <RegistroEditor
        {...props}
        onSaved={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer px-2 py-1 -ml-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
    >
      <Plus className="w-3.5 h-3.5" />
      {props.label ?? "Novo registro"}
    </button>
  );
}
