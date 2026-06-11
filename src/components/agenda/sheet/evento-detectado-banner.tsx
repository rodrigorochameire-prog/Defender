"use client";

import { useState } from "react";
import { CalendarClock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EVENTO_LABELS,
  MOTIVO_LABELS,
  type AnotacaoAudienciaParsed,
  type MotivoNaoRealizacao,
} from "@/lib/agenda/parse-anotacao-audiencia";

interface Props {
  deteccao: AnotacaoAudienciaParsed;
  isPending: boolean;
  onAplicar: (d: AnotacaoAudienciaParsed) => void;
  onDescartar: () => void;
}

/**
 * Banner âmbar exibido na seção de anotações rápidas quando o parser detecta
 * evento de não realização (redesignada/suspensa/adiada/cancelada). Nada é
 * aplicado sem o clique em Aplicar; motivo e nova data são editáveis antes.
 */
export function EventoDetectadoBanner({ deteccao, isPending, onAplicar, onDescartar }: Props) {
  const [motivo, setMotivo] = useState<MotivoNaoRealizacao>(deteccao.motivo);
  const [novaData, setNovaData] = useState(deteccao.novaData ?? "");
  const [novaHora, setNovaHora] = useState(deteccao.novaHora ?? "");

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 px-3 py-2 space-y-2">
      <div className="flex items-start gap-2">
        <CalendarClock className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" />
        <p className="flex-1 text-xs text-amber-800 dark:text-amber-200">
          Detectado: <strong>{EVENTO_LABELS[deteccao.evento]}</strong>
          {" — "}
          {MOTIVO_LABELS[motivo]}
          {novaData
            ? ` — nova data ${novaData.split("-").reverse().join("/")}${novaHora ? ` às ${novaHora}` : ""}`
            : " — sem nova data (cartório designará)"}
        </p>
        <button
          type="button"
          aria-label="Descartar detecção"
          className="text-amber-500 hover:text-amber-700 p-0.5 cursor-pointer"
          onClick={onDescartar}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label className="text-[10px]">Motivo</Label>
          <select
            className="block h-7 rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-neutral-900 px-2 text-xs"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value as MotivoNaoRealizacao)}
          >
            {Object.entries(MOTIVO_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-[10px]">Nova data (se já houver)</Label>
          <Input
            type="date"
            className="h-7 w-32 text-xs"
            value={novaData}
            onChange={(e) => setNovaData(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[10px]">Hora</Label>
          <Input
            type="time"
            className="h-7 w-20 text-xs"
            value={novaHora}
            onChange={(e) => setNovaHora(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          className="h-7 bg-amber-600 hover:bg-amber-700 text-white"
          disabled={isPending}
          onClick={() =>
            onAplicar({
              ...deteccao,
              motivo,
              novaData: novaData || null,
              novaHora: novaData ? novaHora || "00:00" : null,
            })
          }
        >
          {isPending ? "Aplicando…" : "Aplicar"}
        </Button>
      </div>
    </div>
  );
}
