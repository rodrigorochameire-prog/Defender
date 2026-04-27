"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type Resultado = "sentenciado" | "instrucao_encerrada" | "outra";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (resultado: Resultado, observacao: string) => void;
  isPending: boolean;
}

export function ConcluirDialog({ open, onOpenChange, onConfirm, isPending }: Props) {
  const [resultado, setResultado] = useState<Resultado>("instrucao_encerrada");
  const [observacao, setObservacao] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Concluir audiência</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
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
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={() => onConfirm(resultado, observacao)}
            disabled={isPending}
          >
            {isPending ? "Salvando…" : "Confirmar conclusão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
