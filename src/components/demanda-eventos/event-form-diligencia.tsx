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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import {
  DILIGENCIA_SUBTIPOS,
} from "@/lib/db/schema/demanda-eventos";
import { toast } from "sonner";

const SUBTIPO_LABEL: Record<(typeof DILIGENCIA_SUBTIPOS)[number], string> = {
  peticao: "Petição",
  contato_cartorio: "Cartório",
  contato_orgao: "Órgão",
  juntada: "Juntada",
  recurso: "Recurso",
  outro: "Outro",
};

interface Props {
  demandaId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventFormDiligencia({ demandaId, open, onOpenChange }: Props) {
  const [subtipo, setSubtipo] = useState<(typeof DILIGENCIA_SUBTIPOS)[number]>("peticao");
  const [status, setStatus] = useState<"feita" | "pendente">("feita");
  const [resumo, setResumo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");

  const utils = trpc.useUtils();
  const mut = trpc.demandaEventos.create.useMutation({
    onSuccess: () => {
      toast.success("Diligência registrada");
      utils.demandaEventos.list.invalidate({ demandaId });
      utils.demandaEventos.lastByDemandaIds.invalidate();
      utils.demandaEventos.pendentesByDemandaIds.invalidate();
      onOpenChange(false);
      // reset
      setResumo("");
      setDescricao("");
      setPrazo("");
      setStatus("feita");
      setSubtipo("peticao");
    },
    onError: (e) => toast.error(e.message),
  });

  const submitDisabled =
    !resumo.trim() ||
    (status === "pendente" && !prazo) ||
    mut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova diligência</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground">Tipo</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {DILIGENCIA_SUBTIPOS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubtipo(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    subtipo === s
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "border-neutral-300 dark:border-neutral-700 hover:border-emerald-500"
                  }`}
                >
                  {SUBTIPO_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setStatus("feita")}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  status === "feita"
                    ? "bg-emerald-600 text-white"
                    : "border border-neutral-300 dark:border-neutral-700"
                }`}
              >
                Já feita
              </button>
              <button
                type="button"
                onClick={() => setStatus("pendente")}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  status === "pendente"
                    ? "bg-amber-600 text-white"
                    : "border border-neutral-300 dark:border-neutral-700"
                }`}
              >
                A fazer
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Resumo</label>
            <Input
              maxLength={140}
              placeholder="Ex.: Petição de revogação protocolada"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              className="mt-1"
            />
            <span className="text-[10px] text-muted-foreground">{resumo.length}/140</span>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Descrição (opcional)</label>
            <Textarea
              placeholder="Detalhes adicionais"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {status === "pendente" && (
            <div>
              <label className="text-xs text-muted-foreground">Prazo</label>
              <Input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={submitDisabled}
            onClick={() =>
              mut.mutate({
                demandaId,
                tipo: "diligencia",
                subtipo,
                status,
                resumo: resumo.trim(),
                descricao: descricao.trim() || undefined,
                prazo: status === "pendente" ? prazo : undefined,
              })
            }
          >
            {mut.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
