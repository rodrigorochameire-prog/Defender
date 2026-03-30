"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Plus, Library, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface InstitutosTabProps {
  processoId: number;
  assistidos: { id: number; nome: string }[];
}

const TIPO_LABELS: Record<string, string> = {
  ANPP: "ANPP (art. 28-A CPP)",
  SURSIS_PROCESSUAL: "Sursis Processual (art. 89 Lei 9.099)",
  TRANSACAO_PENAL: "Transação Penal (art. 76 Lei 9.099)",
  COMPOSICAO_CIVIL: "Composição Civil dos Danos (art. 74 Lei 9.099)",
};

const TIPOS = ["ANPP", "SURSIS_PROCESSUAL", "TRANSACAO_PENAL", "COMPOSICAO_CIVIL"] as const;

type StatusKey =
  | "PROPOSTO"
  | "ACEITO"
  | "HOMOLOGADO"
  | "EM_CUMPRIMENTO"
  | "CUMPRIDO"
  | "DESCUMPRIDO"
  | "REVOGADO"
  | "REJEITADO";

const STATUS_CONFIG: Record<StatusKey, { label: string; className: string }> = {
  PROPOSTO: {
    label: "Proposto",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  ACEITO: {
    label: "Aceito",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  HOMOLOGADO: {
    label: "Homologado",
    className: "bg-blue-200 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300",
  },
  EM_CUMPRIMENTO: {
    label: "Em Cumprimento",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  CUMPRIDO: {
    label: "Cumprido",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  DESCUMPRIDO: {
    label: "Descumprido",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  REVOGADO: {
    label: "Revogado",
    className: "bg-zinc-100 text-zinc-500 dark:bg-muted dark:text-muted-foreground",
  },
  REJEITADO: {
    label: "Rejeitado",
    className: "bg-zinc-100 text-zinc-500 dark:bg-muted dark:text-muted-foreground",
  },
};

const STATUS_TRANSITIONS: Record<StatusKey, StatusKey[]> = {
  PROPOSTO: ["ACEITO", "REJEITADO"],
  ACEITO: ["HOMOLOGADO", "REJEITADO"],
  HOMOLOGADO: ["EM_CUMPRIMENTO"],
  EM_CUMPRIMENTO: ["CUMPRIDO", "DESCUMPRIDO"],
  CUMPRIDO: [],
  DESCUMPRIDO: ["REVOGADO"],
  REVOGADO: [],
  REJEITADO: [],
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as StatusKey] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-500 dark:bg-muted dark:text-muted-foreground",
  };
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", config.className)}>
      {config.label}
    </span>
  );
}

export function InstitutosTab({ processoId, assistidos }: InstitutosTabProps) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: "" as (typeof TIPOS)[number] | "",
    assistidoId: "",
    prazoMeses: "",
    observacoes: "",
  });

  const { data: institutos = [], isLoading } = trpc.institutos.listByProcesso.useQuery(
    { processoId },
    { enabled: !isNaN(processoId) }
  );

  const createMutation = trpc.institutos.create.useMutation({
    onSuccess: () => {
      toast.success("Instituto criado");
      void utils.institutos.listByProcesso.invalidate({ processoId });
      setOpen(false);
      setForm({ tipo: "", assistidoId: "", prazoMeses: "", observacoes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatusMutation = trpc.institutos.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado");
      void utils.institutos.listByProcesso.invalidate({ processoId });
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tipo) {
      toast.error("Selecione o tipo de instituto");
      return;
    }
    const assistidoId = form.assistidoId ? Number(form.assistidoId) : assistidos[0]?.id;
    if (!assistidoId) {
      toast.error("Processo não tem assistido vinculado");
      return;
    }
    createMutation.mutate({
      processoId,
      assistidoId,
      tipo: form.tipo as (typeof TIPOS)[number],
      prazoMeses: form.prazoMeses ? Number(form.prazoMeses) : undefined,
      observacoes: form.observacoes.trim() || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Carregando institutos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Library className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-zinc-600 dark:text-muted-foreground uppercase tracking-wide">
            Institutos Processuais
          </span>
          {institutos.length > 0 && (
            <span className="text-[10px] bg-zinc-100 dark:bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
              {institutos.length}
            </span>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1 border-zinc-200 dark:border-border"
            >
              <Plus className="h-3 w-3" />
              Novo Instituto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Novo Instituto Processual</DialogTitle>
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
                  placeholder="Ex: 12"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Input
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Condições acordadas, notas..."
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
      {institutos.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Library className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Nenhum instituto registrado</p>
          <p className="text-[10px] mt-0.5 text-muted-foreground/70">
            Registre acordos como ANPP, Transação Penal ou Sursis Processual
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {institutos.map((instituto) => {
            const transitions = STATUS_TRANSITIONS[instituto.status as StatusKey] ?? [];
            return (
              <div
                key={instituto.id}
                className="border border-border rounded-lg p-3 bg-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-zinc-800 dark:text-foreground">
                        {TIPO_LABELS[instituto.tipo] ?? instituto.tipo}
                      </span>
                      <StatusBadge status={instituto.status} />
                    </div>

                    {instituto.prazoMeses && (
                      <p className="text-[10px] text-zinc-500 dark:text-muted-foreground mt-0.5">
                        Prazo: {instituto.prazoMeses} meses
                      </p>
                    )}

                    {Array.isArray(instituto.condicoes) && instituto.condicoes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(instituto.condicoes as string[]).map((c, i) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded-full"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {instituto.observacoes && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic">{instituto.observacoes}</p>
                    )}
                  </div>

                  {/* Avançar status */}
                  {transitions.length > 0 && (
                    <div className="flex flex-col gap-1 shrink-0">
                      {transitions.map((nextStatus) => {
                        const cfg = STATUS_CONFIG[nextStatus];
                        return (
                          <button
                            key={nextStatus}
                            onClick={() =>
                              updateStatusMutation.mutate({ id: instituto.id, status: nextStatus })
                            }
                            disabled={updateStatusMutation.isPending}
                            className={cn(
                              "text-[9px] px-2 py-0.5 rounded-full border font-medium transition-colors disabled:opacity-50",
                              "border-border text-muted-foreground hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-foreground"
                            )}
                            title={`Avançar para: ${cfg.label}`}
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
