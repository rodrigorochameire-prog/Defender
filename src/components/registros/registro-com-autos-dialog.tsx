"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { RegistroEditor } from "@/components/registros/registro-editor";
import { AutosPreviewPane } from "@/components/pdf/autos-preview-pane";
import type { PreviewFile } from "@/components/agenda/registro-audiencia/shared/document-preview-dialog";
import type { TipoRegistro } from "@/components/registros/registro-tipo-config";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistidoId: number;
  processoId?: number;
  demandaId?: number;
  tipoDefault: TipoRegistro;
  tiposPrimarios?: TipoRegistro[];
  /** PDFs disponíveis (ranqueados — o primeiro é o destaque dos autos). */
  files: PreviewFile[];
  initialFileId?: string | null;
  onSaved?: () => void;
}

/**
 * Modal de novo registro em split view: autos do processo à esquerda,
 * editor de registro à direita. Permite ler os autos e registrar sem sair.
 */
export function RegistroComAutosDialog({
  open,
  onOpenChange,
  assistidoId,
  processoId,
  demandaId,
  tipoDefault,
  tiposPrimarios,
  files,
  initialFileId,
  onSaved,
}: Props) {
  const [showPdf, setShowPdf] = useState(true);
  const hasPdf = files.some((f) => !!f.driveFileId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-none w-[96vw] h-[92vh] p-0 gap-0 flex flex-col overflow-hidden bg-[#f7f7f7] dark:bg-neutral-950 [&>button:last-of-type]:hidden"
      >
        <DialogTitle className="sr-only">Novo registro</DialogTitle>
        <DialogDescription className="sr-only">
          Criar um registro lendo os autos do processo lado a lado.
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Novo registro</h2>
            {hasPdf && (
              <button
                type="button"
                onClick={() => setShowPdf((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                title={showPdf ? "Ocultar autos" : "Mostrar autos"}
              >
                {showPdf ? (
                  <PanelLeftClose className="w-3.5 h-3.5" />
                ) : (
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                )}
                {showPdf ? "Ocultar autos" : "Mostrar autos"}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-foreground cursor-pointer transition-colors shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Corpo: autos | editor */}
        <div className="flex-1 flex min-h-0">
          {hasPdf && showPdf && (
            <div className="hidden md:flex flex-col min-w-0 flex-1 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <AutosPreviewPane
                files={files}
                initialId={initialFileId}
                className="flex-1 min-h-0"
                bodyClassName="flex-1 min-h-0"
              />
            </div>
          )}

          <div
            className={`flex flex-col min-h-0 overflow-y-auto ${
              hasPdf && showPdf ? "w-full md:w-[460px] md:shrink-0" : "w-full"
            }`}
          >
            <div className="p-3">
              <RegistroEditor
                assistidoId={assistidoId}
                processoId={processoId}
                demandaId={demandaId}
                tipoDefault={tipoDefault}
                tiposPrimarios={tiposPrimarios}
                onSaved={() => {
                  onSaved?.();
                  onOpenChange(false);
                }}
                onCancel={() => onOpenChange(false)}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
