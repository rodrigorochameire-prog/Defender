"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MOTIVO_LABELS, type MotivoNaoRealizacao } from "@/lib/agenda/parse-anotacao-audiencia";

type Resultado = "sentenciado" | "instrucao_encerrada" | "outra";

/** Desfecho do diálogo: realizada segue o fluxo clássico (marcarConcluida);
 *  não realizada vira evento estruturado (aplicarEventoAudiencia). */
export type ConclusaoAudiencia =
  | { realizada: true; resultado: Resultado; observacao: string }
  | { realizada: false; motivo: MotivoNaoRealizacao; observacao: string; novaData: string | null; novaHora: string | null };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (c: ConclusaoAudiencia) => void;
  isPending: boolean;
}

export function ConcluirDialog({ open, onOpenChange, onConfirm, isPending }: Props) {
  const [realizada, setRealizada] = useState(true);
  const [resultado, setResultado] = useState<Resultado>("instrucao_encerrada");
  const [observacao, setObservacao] = useState("");
  const [motivo, setMotivo] = useState<MotivoNaoRealizacao>("ausencia_vitima");
  const [temNovaData, setTemNovaData] = useState(false);
  const [novaData, setNovaData] = useState("");
  const [novaHora, setNovaHora] = useState("");

  const confirmar = () => {
    if (realizada) {
      onConfirm({ realizada: true, resultado, observacao });
    } else {
      onConfirm({
        realizada: false,
        motivo,
        observacao,
        novaData: temNovaData && novaData ? novaData : null,
        novaHora: temNovaData && novaData ? novaHora || "00:00" : null,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Concluir audiência</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">A audiência foi realizada?</Label>
            <RadioGroup
              value={realizada ? "sim" : "nao"}
              onValueChange={(v) => setRealizada(v === "sim")}
              className="mt-1.5 flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sim" id="rz1" />
                <Label htmlFor="rz1" className="text-xs cursor-pointer">Sim</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="nao" id="rz2" />
                <Label htmlFor="rz2" className="text-xs cursor-pointer">Não (redesignada/suspensa)</Label>
              </div>
            </RadioGroup>
          </div>

          {realizada ? (
            <div>
              <Label className="text-xs">Resultado</Label>
              <RadioGroup value={resultado} onValueChange={(v) => setResultado(v as Resultado)} className="mt-1.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="sentenciado" id="r1" />
                  <Label htmlFor="r1" className="text-xs cursor-pointer">Sentenciado</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="instrucao_encerrada" id="r2" />
                  <Label htmlFor="r2" className="text-xs cursor-pointer">Instrução encerrada</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="outra" id="r3" />
                  <Label htmlFor="r3" className="text-xs cursor-pointer">Outra</Label>
                </div>
              </RadioGroup>
            </div>
          ) : (
            <>
              <div>
                <Label className="text-xs" htmlFor="motivo-nr">Motivo</Label>
                <select
                  id="motivo-nr"
                  className="mt-1 block w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value as MotivoNaoRealizacao)}
                >
                  {Object.entries(MOTIVO_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Já saiu com nova data?</Label>
                <RadioGroup
                  value={temNovaData ? "sim" : "nao"}
                  onValueChange={(v) => setTemNovaData(v === "sim")}
                  className="mt-1.5 flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="nao" id="nd1" />
                    <Label htmlFor="nd1" className="text-xs cursor-pointer">Não — cartório designará</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="sim" id="nd2" />
                    <Label htmlFor="nd2" className="text-xs cursor-pointer">Sim</Label>
                  </div>
                </RadioGroup>
              </div>
              {temNovaData && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs" htmlFor="nova-data">Nova data</Label>
                    <Input id="nova-data" type="date" className="mt-1 h-8 text-xs" value={novaData} onChange={(e) => setNovaData(e.target.value)} />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs" htmlFor="nova-hora">Hora</Label>
                    <Input id="nova-hora" type="time" className="mt-1 h-8 text-xs" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <Label className="text-xs" htmlFor="obs">Observação (opcional)</Label>
            <Textarea
              id="obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              className="mt-1 text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className={realizada ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-600 hover:bg-amber-700 text-white"}
            onClick={confirmar}
            disabled={isPending || (!realizada && temNovaData && !novaData)}
          >
            {isPending ? "Salvando…" : realizada ? "Confirmar conclusão" : "Registrar não realização"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
