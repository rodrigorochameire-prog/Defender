"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Plus, Scale, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MedidasTabProps {
  processoId: number;
  assistidos: { id: number; nome: string }[];
}

const TIPO_LABELS: Record<string, string> = {
  ADVERTENCIA: "Advertencia",
  REPARACAO_DANO: "Reparacao do Dano",
  PSC: "Prestacao de Servicos a Comunidade",
  LIBERDADE_ASSISTIDA: "Liberdade Assistida",
  SEMILIBERDADE: "Semiliberdade",
  INTERNACAO: "Internacao",
  INTERNACAO_PROVISORIA: "Internacao Provisoria",
};

const TIPOS = [
  "ADVERTENCIA",
  "REPARACAO_DANO",
  "PSC",
  "LIBERDADE_ASSISTIDA",
  "SEMILIBERDADE",
  "INTERNACAO",
  "INTERNACAO_PROVISORIA",
] as const;

type StatusKey =
  | "APLICADA"
  | "EM_CUMPRIMENTO"
  | "CUMPRIDA"
  | "DESCUMPRIDA"
  | "SUBSTITUIDA"
  | "REVOGADA"
  | "EXTINTA"
  | "PROGRESSAO";

const STATUS_CONFIG: Record<StatusKey, { label: string; className: string }> = {
  APLICADA: {
    label: "Aplicada",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  EM_CUMPRIMENTO: {
    label: "Em Cumprimento",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  CUMPRIDA: {
    label: "Cumprida",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  DESCUMPRIDA: {
    label: "Descumprida",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  SUBSTITUIDA: {
    label: "Substituida",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  REVOGADA: {
    label: "Revogada",
    className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  },
  EXTINTA: {
    label: "Extinta",
    className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  },
  PROGRESSAO: {
    label: "Progressao",
    className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
};

const STATUS_TRANSITIONS: Record<StatusKey, StatusKey[]> = {
  APLICADA: ["EM_CUMPRIMENTO"],
  EM_CUMPRIMENTO: ["CUMPRIDA", "DESCUMPRIDA", "SUBSTITUIDA", "PROGRESSAO"],
  CUMPRIDA: ["EXTINTA"],
  DESCUMPRIDA: ["REVOGADA", "SUBSTITUIDA"],
  SUBSTITUIDA: [],
  REVOGADA: [],
  EXTINTA: [],
  PROGRESSAO: [],
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as StatusKey] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-500",
  };
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", config.className)}>
      {config.label}
    </span>
  );
}

function isReavaliacaoVencida(data: string | null | undefined): boolean {
  if (!data) return false;
  return new Date(data) < new Date();
}

export function MedidasTab({ processoId, assistidos }: MedidasTabProps) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: "" as (typeof TIPOS)[number] | "",
    assistidoId: "",
    prazoMeses: "",
    horasServico: "",
    unidadeExecucao: "",
    condicoes: "",
    observacoes: "",
  });

  const { data: medidas = [], isLoading } = trpc.medidasSocioeducativas.listByProcesso.useQuery(
    { processoId },
    { enabled: !isNaN(processoId) }
  );

  const createMutation = trpc.medidasSocioeducativas.create.useMutation({
    onSuccess: () => {
      toast.success("Medida socioeducativa criada");
      void utils.medidasSocioeducativas.listByProcesso.invalidate({ processoId });
      setOpen(false);
      setForm({
        tipo: "",
        assistidoId: "",
        prazoMeses: "",
        horasServico: "",
        unidadeExecucao: "",
        condicoes: "",
        observacoes: "",
      });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.medidasSocioeducativas.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado");
      void utils.medidasSocioeducativas.listByProcesso.invalidate({ processoId });
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tipo) {
      toast.error("Selecione o tipo de medida");
      return;
    }
    const assistidoId = form.assistidoId ? Number(form.assistidoId) : assistidos[0]?.id;
    if (!assistidoId) {
      toast.error("Processo nao tem assistido vinculado");
      return;
    }

    const condicoesArray = form.condicoes.trim()
      ? form.condicoes.split(",").map((c) => c.trim()).filter(Boolean)
      : undefined;

    createMutation.mutate({
      processoId,
      assistidoId,
      tipo: form.tipo as (typeof TIPOS)[number],
      prazoMeses: form.prazoMeses ? Number(form.prazoMeses) : undefined,
      horasServico: form.horasServico ? Number(form.horasServico) : undefined,
      unidadeExecucao: form.unidadeExecucao.trim() || undefined,
      condicoes: condicoesArray,
      observacoes: form.observacoes.trim() || undefined,
    });
  }

  const showUnidade = form.tipo === "INTERNACAO" || form.tipo === "SEMILIBERDADE" || form.tipo === "INTERNACAO_PROVISORIA";
  const showHoras = form.tipo === "PSC";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Carregando medidas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Scale className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            Medidas Socioeducativas
          </span>
          {medidas.length > 0 && (
            <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">
              {medidas.length}
            </span>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1 border-zinc-200 dark:border-zinc-700"
            >
              <Plus className="h-3 w-3" />
              Nova Medida
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Nova Medida Socioeducativa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs">Tipo *</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as (typeof TIPOS)[number] }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((tipo) => (
                      <SelectItem key={tipo} value={tipo} className="text-sm">
                        {TIPO_LABELS[tipo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {assistidos.length > 1 && (
                <div className="space-y-1">
                  <Label className="text-xs">Assistido *</Label>
                  <Select
                    value={form.assistidoId}
                    onValueChange={(v) => setForm((f) => ({ ...f, assistidoId: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecione o assistido..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assistidos.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)} className="text-sm">
                          {a.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Prazo (meses)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.prazoMeses}
                  onChange={(e) => setForm((f) => ({ ...f, prazoMeses: e.target.value }))}
                  placeholder="Ex: 6"
                  className="h-8 text-sm"
                />
              </div>

              {showUnidade && (
                <div className="space-y-1">
                  <Label className="text-xs">Unidade de Execucao</Label>
                  <Input
                    value={form.unidadeExecucao}
                    onChange={(e) => setForm((f) => ({ ...f, unidadeExecucao: e.target.value }))}
                    placeholder="Ex: CASE Salvador"
                    className="h-8 text-sm"
                  />
                </div>
              )}

              {showHoras && (
                <div className="space-y-1">
                  <Label className="text-xs">Horas de Servico</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.horasServico}
                    onChange={(e) => setForm((f) => ({ ...f, horasServico: e.target.value }))}
                    placeholder="Ex: 120"
                    className="h-8 text-sm"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Condicoes (separadas por virgula)</Label>
                <Input
                  value={form.condicoes}
                  onChange={(e) => setForm((f) => ({ ...f, condicoes: e.target.value }))}
                  placeholder="Ex: Frequentar escola, Apresentar-se mensalmente"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Observacoes</Label>
                <Input
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Notas adicionais..."
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista */}
      {medidas.length === 0 ? (
        <div className="text-center py-10 text-zinc-400">
          <Scale className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Nenhuma medida socioeducativa registrada</p>
          <p className="text-[10px] mt-0.5 text-zinc-300">
            Registre medidas como Advertencia, LA, PSC, Internacao
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {medidas.map((medida) => {
            const transitions = STATUS_TRANSITIONS[medida.status as StatusKey] ?? [];
            const reavaliacaoVencida = isReavaliacaoVencida(medida.dataProximaReavaliacao);

            return (
              <div
                key={medida.id}
                className={cn(
                  "border rounded-lg p-3 bg-white dark:bg-zinc-900",
                  reavaliacaoVencida
                    ? "border-red-300 dark:border-red-800"
                    : "border-zinc-200 dark:border-zinc-800"
                )}
              >
                {/* Reavaliacao vencida alert */}
                {reavaliacaoVencida && (
                  <div className="flex items-center gap-1.5 mb-2 text-[10px] text-red-600 dark:text-red-400 font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    Reavaliacao vencida desde {medida.dataProximaReavaliacao}
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
                        {TIPO_LABELS[medida.tipo] ?? medida.tipo}
                      </span>
                      <StatusBadge status={medida.status} />
                    </div>

                    <div className="flex flex-wrap gap-2 mt-1">
                      {medida.prazoMeses && (
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Prazo: {medida.prazoMeses} meses
                        </p>
                      )}
                      {medida.prazoMaximoMeses && (
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          (max: {medida.prazoMaximoMeses}m)
                        </p>
                      )}
                      {medida.horasServico && (
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {medida.horasServico}h servico
                        </p>
                      )}
                    </div>

                    {medida.unidadeExecucao && (
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Unidade: {medida.unidadeExecucao}
                      </p>
                    )}

                    {medida.dataProximaReavaliacao && !reavaliacaoVencida && (
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Proxima reavaliacao: {medida.dataProximaReavaliacao}
                      </p>
                    )}

                    {Array.isArray(medida.condicoes) && medida.condicoes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(medida.condicoes as string[]).map((c, i) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {medida.observacoes && (
                      <p className="text-[10px] text-zinc-400 mt-1 italic">{medida.observacoes}</p>
                    )}
                  </div>

                  {/* Avancar status */}
                  {transitions.length > 0 && (
                    <div className="flex flex-col gap-1 shrink-0">
                      {transitions.map((nextStatus) => {
                        const cfg = STATUS_CONFIG[nextStatus];
                        return (
                          <button
                            key={nextStatus}
                            onClick={() =>
                              updateStatusMutation.mutate({ id: medida.id, status: nextStatus })
                            }
                            disabled={updateStatusMutation.isPending}
                            className={cn(
                              "text-[9px] px-2 py-0.5 rounded-full border font-medium transition-colors disabled:opacity-50",
                              "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
                            )}
                            title={`Avancar para: ${cfg.label}`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
