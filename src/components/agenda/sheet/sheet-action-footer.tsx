"use client";

import { useRef, useState } from "react";
import { BookOpen, Check, Copy, Send, CalendarClock, Loader2, NotebookPen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConcluirDialog } from "./concluir-dialog";
import { RedesignarDialog, type RedesignarContexto } from "./redesignar-dialog";
import { RegistroEditor } from "@/components/registros/registro-editor";
import { useAudienciaStatusActions } from "@/hooks/use-audiencia-status-actions";
import { resolverVinculoRegistro } from "./footer-registro";
import type { AnotacaoAudienciaParsed } from "@/lib/agenda/parse-anotacao-audiencia";

interface Props {
  audienciaId: number | null;
  jaConcluida: boolean;
  /** Vínculos para o registro rápido (padrão Demandas). */
  assistidoId?: number | null;
  processoId?: number | null;
  /** Abre o RegistroAudienciaModal (registro COMPLETO — caminho profundo). */
  onAbrirRegistroCompleto: () => void;
  onDuplicar?: () => void;
  /** Chamado quando o parser detecta evento de audiência na nota recém-salva */
  onDeteccao?: (d: AnotacaoAudienciaParsed) => void;
  /** Contexto do evento p/ enriquecer o modal de redesignação (identidade + de→para). */
  redesignarContexto?: RedesignarContexto;
}

export function SheetActionFooter({
  audienciaId,
  jaConcluida,
  assistidoId,
  processoId,
  onAbrirRegistroCompleto,
  onDuplicar,
  onDeteccao,
  redesignarContexto,
}: Props) {
  const [quickNote, setQuickNote] = useState("");
  const [concluirOpen, setConcluirOpen] = useState(false);
  const [redesignarOpen, setRedesignarOpen] = useState(false);
  const [registroOpen, setRegistroOpen] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const actions = useAudienciaStatusActions(audienciaId);
  const concluirPending = actions.concluir.isPending || actions.aplicarEvento.isPending;
  const redesignarPending = actions.redesignar.isPending;

  const vinculo = resolverVinculoRegistro({ assistidoId, processoId, audienciaId });

  const submitNote = () => {
    if (!audienciaId || !quickNote.trim()) return;
    actions.addNote.mutate(
      { audienciaId, texto: quickNote.trim() },
      { onSuccess: (r) => { if (r.deteccao) onDeteccao?.(r.deteccao); } }
    );
    setQuickNote("");
    // Auto-grow reset
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const onNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envia; Shift+Enter quebra linha (mantém a nota multiline-friendly).
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitNote();
    }
  };

  return (
    <>
      <div className="sticky bottom-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-t border-neutral-200/40 dark:border-neutral-800/60 px-4 py-3 space-y-2.5">
        {/* Anotação rápida — vira anotação da audiência (anotacoes_rapidas).
            Multiline (Shift+Enter = nova linha); o parser de evento
            (redesignação/suspensão) continua rodando no submit. */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={taRef}
              placeholder="Anotar a audiência…  (Enter envia · Shift+Enter quebra linha)"
              value={quickNote}
              onChange={(e) => {
                setQuickNote(e.target.value);
                // auto-grow até ~5 linhas
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
              onKeyDown={onNoteKeyDown}
              disabled={!audienciaId || actions.addNote.isPending}
              rows={1}
              className="text-xs min-h-[2rem] py-1.5 pr-2 rounded-lg resize-none leading-relaxed"
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 shrink-0"
            disabled={!quickNote.trim() || actions.addNote.isPending}
            onClick={submitNote}
            aria-label="Salvar anotação"
          >
            {actions.addNote.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>

        {/* Registro inline (padrão Demandas) — vinculado a audiência↔processo↔assistido.
            Lightweight: o compositor só aparece quando o usuário aciona "Registrar". */}
        {registroOpen && vinculo.podeRegistrar && (
          <div className="space-y-1">
            <RegistroEditor
              assistidoId={vinculo.assistidoId}
              processoId={vinculo.processoId}
              audienciaId={vinculo.audienciaId}
              tipoDefault="anotacao"
              tiposPrimarios={[
                "anotacao",
                "ciencia",
                "diligencia",
                "providencia",
                "atendimento",
                "peticao",
              ]}
              onSaved={() => setRegistroOpen(false)}
              onCancel={() => setRegistroOpen(false)}
            />
            <button
              type="button"
              onClick={() => {
                setRegistroOpen(false);
                onAbrirRegistroCompleto();
              }}
              className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer px-1"
            >
              Abrir registro completo <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

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

          {/* Registrar: afford. leve abre o compositor inline (registro vinculado);
              sem vínculo de assistido, cai direto no modal completo. */}
          <Button
            size="sm"
            variant={jaConcluida ? "default" : "ghost"}
            className={`flex-1 text-xs h-9 cursor-pointer ${jaConcluida ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm" : ""}`}
            disabled={!audienciaId}
            onClick={() => {
              if (vinculo.podeRegistrar) {
                setRegistroOpen((v) => !v);
              } else {
                onAbrirRegistroCompleto();
              }
            }}
            aria-pressed={registroOpen}
          >
            {registroOpen ? (
              <NotebookPen className="w-3.5 h-3.5 mr-1.5" />
            ) : (
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            )}
            Registrar
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
        contexto={redesignarContexto}
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
