"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Loader2, Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MedidaMpuCard } from "./medida-mpu-card";
import {
  MEDIDA_MPU,
  STATUS_MEDIDA,
  STATUS_MEDIDA_LABEL,
  rotuloMedida,
  type StatusMedida,
} from "@/lib/mpu/medidas-taxonomia";

type Props =
  | { processoId: number; processoVvdId?: undefined; readOnly?: boolean }
  | { processoVvdId: number; processoId?: undefined; readOnly?: boolean };

export function MedidasVigentesPanel(props: Props) {
  const readOnly = props.readOnly ?? false;
  const queryInput =
    "processoVvdId" in props && props.processoVvdId != null
      ? { processoVvdId: props.processoVvdId }
      : { processoId: (props as { processoId: number }).processoId };

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.mpu.listMedidas.useQuery(queryInput);

  const setStatus = trpc.mpu.setStatusMedida.useMutation({
    onSuccess: () => {
      utils.mpu.listMedidas.invalidate();
      toast.success("Status atualizado");
    },
    onError: (e) => toast.error(e.message),
  });
  const addManual = trpc.mpu.addMedidaManual.useMutation({
    onSuccess: () => {
      utils.mpu.listMedidas.invalidate();
      toast.success("Medida adicionada");
      setAddOpen(false);
      setNovoCodigo("");
      setNovaDistancia("");
    },
    onError: (e) => toast.error(e.message),
  });

  const [addOpen, setAddOpen] = useState(false);
  const [novoCodigo, setNovoCodigo] = useState<string>("");
  const [novaDistancia, setNovaDistancia] = useState<string>("");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando medidas…
      </div>
    );
  }

  const medidas = data?.medidas ?? [];
  const processoVvdId = data?.processoVvdId ?? null;

  const submitManual = () => {
    if (!processoVvdId || !novoCodigo) return;
    addManual.mutate({
      processoVvdId,
      codigo: novoCodigo,
      distanciaMetros: novaDistancia ? Number(novaDistancia) : undefined,
    });
  };

  if (medidas.length === 0) {
    // No sheet (readOnly) o empty state segue o padrão enxuto das demais seções
    // (texto itálico cinza, alinhado à esquerda) em vez da caixa tracejada, que
    // destoava. Nas telas de gestão (read-write) a caixa + botão "Adicionar" fica.
    if (readOnly) {
      return (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
          Nenhuma medida estruturada. Gere pela Ciência de MPU.
        </p>
      );
    }
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
        <Scale className="mx-auto mb-1 h-5 w-5 opacity-50" />
        Nenhuma medida estruturada. Gere pela Ciência de MPU ou adicione manualmente.
        {!readOnly && processoVvdId && (
          <div className="mt-2">
            <AddButton onClick={() => setAddOpen(true)} />
          </div>
        )}
        {!readOnly && (
          <AddDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            codigo={novoCodigo}
            setCodigo={setNovoCodigo}
            distancia={novaDistancia}
            setDistancia={setNovaDistancia}
            pending={addManual.isPending}
            onSubmit={submitManual}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {medidas.map((m) => (
          <MedidaMpuCard
            key={m.id}
            medida={m}
            actions={
              readOnly ? undefined : (
                <Select
                  value={m.status ?? "ativa"}
                  onValueChange={(status) =>
                    setStatus.mutate({ id: m.id, status: status as StatusMedida })
                  }
                >
                  <SelectTrigger className="h-7 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(STATUS_MEDIDA).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {STATUS_MEDIDA_LABEL[s as StatusMedida]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }
          />
        ))}
      </div>
      {!readOnly && processoVvdId && (
        <>
          <AddButton onClick={() => setAddOpen(true)} />
          <AddDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            codigo={novoCodigo}
            setCodigo={setNovoCodigo}
            distancia={novaDistancia}
            setDistancia={setNovaDistancia}
            pending={addManual.isPending}
            onSubmit={submitManual}
          />
        </>
      )}
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={onClick}>
      <Plus className="h-3.5 w-3.5" /> Adicionar medida
    </Button>
  );
}

function AddDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  codigo: string;
  setCodigo: (v: string) => void;
  distancia: string;
  setDistancia: (v: string) => void;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-sm space-y-3">
        <h3 className="text-sm font-semibold">Adicionar medida manual</h3>
        <div className="space-y-1">
          <Label className="text-xs">Medida</Label>
          <Select value={props.codigo} onValueChange={props.setCodigo}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(MEDIDA_MPU).map((c) => (
                <SelectItem key={c} value={c} className="text-sm">
                  {rotuloMedida(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Distância (m) — opcional</Label>
          <Input
            type="number"
            value={props.distancia}
            onChange={(e) => props.setDistancia(e.target.value)}
            placeholder="ex.: 300"
          />
        </div>
        <Button
          size="sm"
          disabled={!props.codigo || props.pending}
          onClick={props.onSubmit}
          className="w-full"
        >
          {props.pending ? "Salvando…" : "Adicionar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
