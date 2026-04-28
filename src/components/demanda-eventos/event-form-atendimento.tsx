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
import { toast } from "sonner";

const TIPOS = [
  { value: "presencial", label: "Presencial" },
  { value: "telefone", label: "Telefone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
] as const;

const INTERLOCUTORES = [
  { value: "assistido", label: "Assistido" },
  { value: "familiar", label: "Familiar" },
  { value: "testemunha", label: "Testemunha" },
  { value: "outro", label: "Outro" },
] as const;

interface Props {
  demandaId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function nowDatetimeLocal(): string {
  // YYYY-MM-DDTHH:MM in local timezone (input[type=datetime-local] format)
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventFormAtendimento({ demandaId, open, onOpenChange }: Props) {
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["value"]>("telefone");
  const [interlocutor, setInterlocutor] =
    useState<(typeof INTERLOCUTORES)[number]["value"]>("assistido");
  const [dataAtendimento, setDataAtendimento] = useState(nowDatetimeLocal());
  const [assunto, setAssunto] = useState("");
  const [resumo, setResumo] = useState("");
  const [acompanhantes, setAcompanhantes] = useState("");

  // Fetch demanda to get assistidoId/processoId
  const { data: demanda } = trpc.demandas.getById.useQuery(
    { id: demandaId },
    { enabled: open },
  );

  const utils = trpc.useUtils();
  const mut = trpc.atendimentos.create.useMutation({
    onSuccess: () => {
      toast.success("Atendimento registrado");
      // Hook em atendimentos.create vincula automaticamente — invalidar caches relevantes
      utils.demandaEventos.list.invalidate({ demandaId });
      utils.demandaEventos.lastByDemandaIds.invalidate();
      utils.demandaEventos.pendentesByDemandaIds.invalidate();
      onOpenChange(false);
      setAssunto("");
      setResumo("");
      setAcompanhantes("");
      setDataAtendimento(nowDatetimeLocal());
    },
    onError: (e) => toast.error(e.message),
  });

  const submitDisabled = !assunto.trim() || !demanda || mut.isPending;

  // getById retorna shape com assistido nested + assistidoId flat (mesmo para processo).
  // Mantemos fallbacks defensivos para qualquer alteração futura.
  const assistidoId =
    (demanda as any)?.assistido?.id ?? (demanda as any)?.assistidoId;
  const processoId =
    (demanda as any)?.processo?.id ??
    (demanda as any)?.processos?.[0]?.id ??
    (demanda as any)?.processoId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo atendimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground">Quando</label>
            <Input
              type="datetime-local"
              value={dataAtendimento}
              onChange={(e) => setDataAtendimento(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Canal</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    tipo === t.value
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "border-neutral-300 dark:border-neutral-700 hover:border-emerald-500"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Interlocutor</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {INTERLOCUTORES.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => setInterlocutor(i.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    interlocutor === i.value
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "border-neutral-300 dark:border-neutral-700 hover:border-emerald-500"
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Assunto</label>
            <Input
              maxLength={140}
              placeholder="Ex.: Esclarecimentos sobre audiência"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Resumo (opcional)</label>
            <Textarea
              placeholder="Notas do que foi conversado"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Acompanhantes (opcional)</label>
            <Input
              placeholder="Quem mais participou"
              value={acompanhantes}
              onChange={(e) => setAcompanhantes(e.target.value)}
              className="mt-1"
            />
          </div>

          <p className="text-[10px] text-muted-foreground">
            {processoId
              ? "Este atendimento será vinculado automaticamente a todas as demandas abertas deste processo."
              : "Este atendimento ficará vinculado apenas ao assistido (sem processo)."}
          </p>
          <a
            href={`/admin/atendimentos/novo?demandaId=${demandaId}`}
            className="text-[11px] text-emerald-600 hover:underline"
          >
            Abrir página completa (anexar áudio / transcrição) →
          </a>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={submitDisabled}
            onClick={() => {
              if (!assistidoId) {
                toast.error("Não foi possível identificar o assistido da demanda");
                return;
              }
              mut.mutate({
                assistidoId,
                processoId: processoId ?? undefined,
                dataAtendimento: new Date(dataAtendimento).toISOString(),
                tipo,
                interlocutor,
                assunto: assunto.trim(),
                resumo: resumo.trim() || undefined,
                acompanhantes: acompanhantes.trim() || undefined,
                status: "realizado",
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
