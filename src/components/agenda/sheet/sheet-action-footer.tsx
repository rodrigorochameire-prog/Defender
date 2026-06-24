"use client";

import { useState } from "react";
import { BookOpen, Check, Copy, Send, CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConcluirDialog } from "./concluir-dialog";
import { RedesignarDialog } from "./redesignar-dialog";
import { useAudienciaStatusActions } from "@/hooks/use-audiencia-status-actions";
import type { AnotacaoAudienciaParsed } from "@/lib/agenda/parse-anotacao-audiencia";

interface Props {
  audienciaId: number | null;
  jaConcluida: boolean;
  onAbrirRegistroCompleto: () => void;
  onDuplicar?: () => void;
  /** Chamado quando o parser detecta evento de audiência na nota recém-salva */
  onDeteccao?: (d: AnotacaoAudienciaParsed) => void;
}

export function SheetActionFooter({ audienciaId, jaConcluida, onAbrirRegistroCompleto, onDuplicar, onDeteccao }: Props) {
  const [quickNote, setQuickNote] = useState("");
  const [concluirOpen, setConcluirOpen] = useState(false);
  const [redesignarOpen, setRedesignarOpen] = useState(false);
  const actions = useAudienciaStatusActions(audienciaId);
  const concluirPending = actions.concluir.isPending || actions.aplicarEvento.isPending;
  const redesignarPending = actions.redesignar.isPending;

  const submitNote = () => {
    if (!audienciaId || !quickNote.trim()) return;
    actions.addNote.mutate(
      { audienciaId, texto: quickNote.trim() },
      { onSuccess: (r) => { if (r.deteccao) onDeteccao?.(r.deteccao); } }
    );
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

        {/* Ações — hierarquia: Concluir é a ação primária (dominante);
            Redesignar e Registrar são secundárias; Duplicar é terciária (ícone).
            Já concluída → Concluir vira um selo de estado e Registrar ganha foco. */}
        <div className="flex items-center gap-1.5">
          {jaConcluida ? (
            <div
              className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium select-none"
              title="Audiência concluída"
            >
              <Check className="w-3.5 h-3.5" /> Concluída
            </div>
          ) : (
            <Button
              size="sm"
              className="flex-[1.6] bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium h-9 shadow-sm cursor-pointer"
              disabled={!audienciaId || concluirPending}
              onClick={() => setConcluirOpen(true)}
            >
              {concluirPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 mr-1.5" />
              )}
              Concluir
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-9 cursor-pointer"
            disabled={!audienciaId || redesignarPending}
            onClick={() => setRedesignarOpen(true)}
          >
            {redesignarPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <CalendarClock className="w-3.5 h-3.5 mr-1.5" />
            )}
            Redesignar
          </Button>

          <Button
            size="sm"
            variant={jaConcluida ? "default" : "ghost"}
            className={`flex-1 text-xs h-9 cursor-pointer ${jaConcluida ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm" : ""}`}
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
                    variant="ghost"
                    className="text-xs h-9 px-2.5 cursor-pointer text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
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
        isPending={actions.concluir.isPending || actions.aplicarEvento.isPending}
        onConfirm={(c) => {
          if (!audienciaId) return;
          if (c.realizada) {
            actions.concluir.mutate(
              { audienciaId, resultado: c.resultado, observacao: c.observacao },
              { onSuccess: () => setConcluirOpen(false) }
            );
          } else {
            actions.aplicarEvento.mutate(
              {
                audienciaId,
                evento: "redesignada",
                motivo: c.motivo,
                motivoDetalhe: c.observacao || undefined,
                ...(c.novaData
                  ? { novaData: c.novaData, novaHora: c.novaHora ?? "00:00" }
                  : {}),
              },
              { onSuccess: () => setConcluirOpen(false) }
            );
          }
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
