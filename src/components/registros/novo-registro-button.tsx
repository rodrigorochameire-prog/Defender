"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <Button
      onClick={() => setOpen(true)}
      variant="outline"
      size="sm"
      className="w-full justify-center gap-1.5 h-9 border-dashed text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
    >
      <Plus className="w-3.5 h-3.5" />
      {props.label ?? "Novo registro"}
    </Button>
  );
}
