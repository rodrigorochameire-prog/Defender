"use client";

import { useState } from "react";
import { BookOpen, Check, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConcluirDialog } from "./concluir-dialog";
import { RedesignarDialog } from "./redesignar-dialog";
import { useAudienciaStatusActions } from "@/hooks/use-audiencia-status-actions";

interface Props {
  audienciaId: number | null;
  jaConcluida: boolean;
  onAbrirRegistroCompleto: () => void;
  onDuplicar?: () => void;
}

export function SheetActionFooter({ audienciaId, jaConcluida, onAbrirRegistroCompleto, onDuplicar }: Props) {
  const [quickNote, setQuickNote] = useState("");
  const [concluirOpen, setConcluirOpen] = useState(false);
  const [redesignarOpen, setRedesignarOpen] = useState(false);
  const actions = useAudienciaStatusActions(audienciaId);

  const submitNote = () => {
    if (!audienciaId || !quickNote.trim()) return;
    actions.addNote.mutate({ audienciaId, texto: quickNote.trim() });
    setQuickNote("");
  };

  return (
    <>
      <div className="sticky bottom-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200/40 dark:border-neutral-800/60 px-4 py-3 space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Anotação rápida…"
            value={quickNote}
            onChange={(e) => setQuickNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitNote()}
            disabled={!audienciaId || actions.addNote.isPending}
            className="text-xs h-8 rounded-lg"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            disabled={!quickNote.trim() || actions.addNote.isPending}
            onClick={submitNote}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-9 cursor-pointer"
            disabled={jaConcluida || !audienciaId}
            onClick={() => setConcluirOpen(true)}
          >
            <Check className="w-3.5 h-3.5 mr-1.5" /> Concluir
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-9 cursor-pointer"
            disabled={!audienciaId}
            onClick={() => setRedesignarOpen(true)}
          >
            ↷ Redesignar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-9 cursor-pointer"
            disabled={!audienciaId}
            onClick={onAbrirRegistroCompleto}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Registrar
          </Button>
          {onDuplicar && (
            <TooltipProvider delayDuration={250}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-9 px-3 cursor-pointer"
                    onClick={onDuplicar}
                    aria-label="Duplicar"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[11px]">
                  Duplicar
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <ConcluirDialog
        open={concluirOpen}
        onOpenChange={setConcluirOpen}
        isPending={actions.concluir.isPending}
        onConfirm={(resultado, observacao) => {
          if (!audienciaId) return;
          actions.concluir.mutate({ audienciaId, resultado, observacao }, {
            onSuccess: () => setConcluirOpen(false),
          });
        }}
      />
      <RedesignarDialog
        open={redesignarOpen}
        onOpenChange={setRedesignarOpen}
        isPending={actions.redesignar.isPending}
        onConfirm={(novaData, novoHorario, motivo) => {
          if (!audienciaId) return;
          actions.redesignar.mutate({ audienciaId, novaData, novoHorario, motivo }, {
            onSuccess: () => setRedesignarOpen(false),
          });
        }}
      />
    </>
  );
}
