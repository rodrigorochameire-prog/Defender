"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface Props {
  demandaId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventFormObservacao({ demandaId, open, onOpenChange }: Props) {
  const [texto, setTexto] = useState("");

  const utils = trpc.useUtils();
  const mut = trpc.demandaEventos.create.useMutation({
    onSuccess: () => {
      toast.success("Observação registrada");
      utils.demandaEventos.list.invalidate({ demandaId });
      utils.demandaEventos.lastByDemandaIds.invalidate();
      onOpenChange(false);
      setTexto("");
    },
    onError: (e) => toast.error(e.message),
  });

  const submitDisabled = !texto.trim() || mut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Observação</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <Textarea
            placeholder="Anotação livre — fica vinculada a esta demanda"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            maxLength={2000}
            autoFocus
          />
          <span className="text-[10px] text-muted-foreground">
            {texto.length}/2000
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={submitDisabled}
            onClick={() => {
              const trimmed = texto.trim();
              mut.mutate({
                demandaId,
                tipo: "observacao",
                resumo: trimmed.slice(0, 140),
                descricao: trimmed.length > 140 ? trimmed : undefined,
              });
            }}
          >
            {mut.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
