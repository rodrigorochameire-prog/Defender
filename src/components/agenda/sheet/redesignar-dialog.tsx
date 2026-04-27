"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (novaData: string, novoHorario: string, motivo: string) => void;
  isPending: boolean;
}

export function RedesignarDialog({ open, onOpenChange, onConfirm, isPending }: Props) {
  const [novaData, setNovaData] = useState("");
  const [novoHorario, setNovoHorario] = useState("");
  const [motivo, setMotivo] = useState("");
  const podeConfirmar = novaData.length === 10 && novoHorario.length >= 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Redesignar audiência</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs" htmlFor="data">Nova data</Label>
              <Input
                id="data"
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="hora">Horário</Label>
              <Input
                id="hora"
                type="time"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs" htmlFor="motivo">Motivo (opcional)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
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
            onClick={() => onConfirm(novaData, novoHorario, motivo)}
            disabled={!podeConfirmar || isPending}
          >
            {isPending ? "Salvando…" : "Redesignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
