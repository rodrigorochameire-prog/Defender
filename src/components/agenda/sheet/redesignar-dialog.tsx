"use client";

import { useState } from "react";
import { ArrowRight, CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PriorityBadge, StickyActionFooter } from "@/components/agenda/ds";

/** Contexto opcional do evento — quando presente, dá identidade e consequência à ação. */
export interface RedesignarContexto {
  /** Sigla/rótulo do ato (ex.: "AIJ", "Plenário"). */
  tipoLabel?: string;
  assistidoNome?: string;
  /** Data atual do ato — YYYY-MM-DD. */
  dataAtual?: string;
  /** Horário atual — HH:mm. */
  horaAtual?: string;
  prioridade?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (novaData: string, novoHorario: string, motivo: string) => void;
  isPending: boolean;
  contexto?: RedesignarContexto;
}

/** YYYY-MM-DD → DD/MM/YYYY (sem timezone). Vazio se inválido. */
function formatBR(iso?: string): string {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

export function RedesignarDialog({ open, onOpenChange, onConfirm, isPending, contexto }: Props) {
  const [novaData, setNovaData] = useState("");
  const [novoHorario, setNovoHorario] = useState("");
  const [motivo, setMotivo] = useState("");
  const podeConfirmar = novaData.length === 10 && novoHorario.length >= 4;

  const temIdentidade = Boolean(contexto?.tipoLabel || contexto?.assistidoNome);
  const dataAtualBR = formatBR(contexto?.dataAtual);
  const mostrarResumo = Boolean(dataAtualBR && podeConfirmar);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header — título + identidade do evento */}
        <DialogHeader className="px-5 pt-5 pb-4 space-y-2 text-left">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 shrink-0">
              <CalendarClock className="w-4 h-4" />
            </span>
            <DialogTitle className="text-base font-semibold">Redesignar audiência</DialogTitle>
          </div>
          {temIdentidade && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground pl-9">
              {contexto?.tipoLabel && (
                <span className="font-semibold text-foreground/80">{contexto.tipoLabel}</span>
              )}
              {contexto?.assistidoNome && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="truncate max-w-[180px]">{contexto.assistidoNome}</span>
                </>
              )}
              {(dataAtualBR || contexto?.horaAtual) && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="font-mono tabular-nums">
                    {dataAtualBR} {contexto?.horaAtual}
                  </span>
                </>
              )}
              <PriorityBadge prioridade={contexto?.prioridade ?? null} className="ml-0.5" />
            </div>
          )}
        </DialogHeader>

        {/* Corpo */}
        <div className="px-5 pb-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" htmlFor="redesignar-data">Nova data</Label>
              <Input
                id="redesignar-data"
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium" htmlFor="redesignar-hora">Novo horário</Label>
              <Input
                id="redesignar-hora"
                type="time"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Resumo de → para — torna a consequência perceptível */}
          {mostrarResumo && (
            <div
              data-testid="redesignar-resumo"
              className="flex items-center gap-2.5 rounded-lg border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2.5 text-xs"
            >
              <span className="font-mono tabular-nums text-muted-foreground line-through decoration-muted-foreground/40">
                {dataAtualBR} {contexto?.horaAtual}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-mono tabular-nums font-semibold text-foreground">
                {formatBR(novaData)} {novoHorario}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium" htmlFor="redesignar-motivo">Motivo (opcional)</Label>
            <Textarea
              id="redesignar-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              placeholder="Ex.: ausência de testemunha, conflito de pauta…"
              className="text-sm resize-none"
            />
          </div>
        </div>

        <StickyActionFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm(novaData, novoHorario, motivo)}
            disabled={!podeConfirmar || isPending}
          >
            {isPending ? "Salvando…" : "Redesignar audiência"}
          </Button>
        </StickyActionFooter>
      </DialogContent>
    </Dialog>
  );
}
