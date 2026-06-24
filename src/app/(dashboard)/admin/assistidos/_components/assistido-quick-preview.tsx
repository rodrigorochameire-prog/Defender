"use client";

import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronUp, ChevronDown } from "lucide-react";
import { ATRIBUICAO_OPTIONS, SOLID_COLOR_MAP } from "@/lib/config/atribuicoes";
import type { AssistidoUI } from "./assistido-types";
import { AssistidoPreviewPanel } from "./assistido-preview-panel";

/* ─── Props ─── */
export interface AssistidoQuickPreviewProps {
  assistido: AssistidoUI | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex?: number;
  totalCount?: number;
  /** @deprecated edição de nota migrou para o perfil; mantido por compat. */
  onUpdateNotes?: (assistidoId: number, notes: string) => void;
}

/**
 * Shell lateral (Sheet) do preview master-detail: header de navegação + atalhos
 * de teclado. O conteúdo (4 blocos: Resumo / Atividade / Pendências / Ações) vive
 * em <AssistidoPreviewPanel/>, alimentado pelo estado canônico do assistido.
 */
export function AssistidoQuickPreview({
  assistido,
  onClose,
  onNext,
  onPrev,
  currentIndex,
  totalCount,
}: AssistidoQuickPreviewProps) {
  // Navegação por teclado — antes de qualquer early return (regras de Hooks).
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!assistido) return;
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        onPrev?.();
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        onNext?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [assistido, onPrev, onNext]);

  if (!assistido) return null;

  const atribuicoes = assistido.atribuicoes || assistido.areas || [];
  const primaryAttr =
    atribuicoes.length > 0
      ? (() => {
          const norm = atribuicoes[0].toUpperCase().replace(/_/g, " ");
          const opt = ATRIBUICAO_OPTIONS.find(
            (o) =>
              o.value.toUpperCase() === norm ||
              o.label.toUpperCase().includes(norm) ||
              norm.includes(o.value.toUpperCase()),
          );
          return opt?.value || null;
        })()
      : null;
  const accentColor = primaryAttr ? SOLID_COLOR_MAP[primaryAttr] || "#6b7280" : "#6b7280";

  return (
    <Sheet open={!!assistido} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[480px] md:w-[560px] p-0 flex flex-col gap-0 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl"
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        {/* Header — índice + navegação */}
        <SheetHeader className="px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
                {currentIndex !== undefined && totalCount ? `${currentIndex + 1} / ${totalCount}` : "Assistido"}
              </SheetTitle>
              <span className="text-[10px] text-neutral-300 dark:text-neutral-600">|</span>
              <span className="text-[10px] text-neutral-300 dark:text-neutral-600">&uarr;&darr; navegar</span>
            </div>
            <div className="flex items-center gap-0.5">
              {onPrev && (
                <button
                  onClick={onPrev}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                  title="Anterior (↑)"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              )}
              {onNext && (
                <button
                  onClick={onNext}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                  title="Próximo (↓)"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Corpo — 4 blocos */}
        <div className="flex-1 min-h-0">
          <AssistidoPreviewPanel key={assistido.id} assistido={assistido} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
