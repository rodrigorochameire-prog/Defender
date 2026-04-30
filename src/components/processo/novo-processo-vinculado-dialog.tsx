"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { TIPOS_INCIDENTAIS, TIPOS_PROCESSO, type TipoProcessoIncidental } from "@/lib/processos/tipos";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processoOrigemId: number;
  /** Quando fornecido, transfere a demanda para o processo recém-criado. */
  moverDemandaId?: number;
}

export function NovoProcessoVinculadoDialog({
  open,
  onOpenChange,
  processoOrigemId,
  moverDemandaId,
}: Props) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [numeroAutos, setNumeroAutos] = useState("");
  const [tipo, setTipo] = useState<TipoProcessoIncidental>("REVOGACAO");
  const [assunto, setAssunto] = useState("");

  const create = trpc.processos.criarVinculado.useMutation({
    onSuccess: (novoProc) => {
      utils.processos.vinculados.invalidate();
      utils.processos.getById.invalidate();
      utils.processos.list.invalidate();
      utils.demandas.invalidate();
      toast.success(
        moverDemandaId
          ? "Demanda movida para autos apartados"
          : "Processo vinculado criado",
      );
      onOpenChange(false);
      setNumeroAutos("");
      setAssunto("");
      router.push(`/admin/processos/${novoProc.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const isMover = !!moverDemandaId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isMover ? "Mover para autos apartados" : "Novo processo vinculado"}
          </DialogTitle>
          <DialogDescription>
            {isMover
              ? "Cria um processo apartado vinculado ao principal e move a demanda para ele."
              : "Cadastra um processo incidental (revogação, HC, recurso, MPU…) vinculado ao principal por meio do mesmo caso."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="numero-autos">Número dos autos</Label>
            <Input
              id="numero-autos"
              value={numeroAutos}
              onChange={(e) => setNumeroAutos(e.target.value)}
              placeholder="0000000-00.0000.0.00.0000"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tipo-processo">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoProcessoIncidental)}>
              <SelectTrigger id="tipo-processo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_INCIDENTAIS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPOS_PROCESSO[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assunto">Assunto (opcional)</Label>
            <Input
              id="assunto"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Pedido de revogação da prisão preventiva"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!numeroAutos.trim() || create.isPending}
            onClick={() =>
              create.mutate({
                processoOrigemId,
                numeroAutos: numeroAutos.trim(),
                tipoProcesso: tipo,
                assunto: assunto.trim() || undefined,
                moverDemandaId,
              })
            }
          >
            {create.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isMover ? (
              "Mover"
            ) : (
              "Criar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
