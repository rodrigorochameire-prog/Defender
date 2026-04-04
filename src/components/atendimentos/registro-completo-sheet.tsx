"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AtendimentoData {
  id: number;
  dataAtendimento: Date | string;
  tipo: string;
  assunto: string | null;
  resumo: string | null;
  duracao: number | null;
  status: string | null;
  interlocutor: string | null;
  local: string | null;
  acompanhantes: string | null;
  processoId: number | null;
}

interface RegistroCompletoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistidoId: number;
  processoIdAtivo?: number;
  processos: Array<{ id: number; numeroAutos: string }>;
  atendimento?: AtendimentoData | null;
  onSuccess: () => void;
}

const TIPO_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "presencial", label: "Presencial" },
  { value: "telefone", label: "Telefone" },
  { value: "videoconferencia", label: "Videoconferência" },
  { value: "email", label: "Email" },
  { value: "visita_carceraria", label: "Visita Carcerária" },
] as const;

const STATUS_OPTIONS = [
  { value: "agendado", label: "Agendado" },
  { value: "realizado", label: "Realizado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "nao_compareceu", label: "Não Compareceu" },
] as const;

const INTERLOCUTOR_OPTIONS = [
  { value: "assistido", label: "Assistido" },
  { value: "familiar", label: "Familiar" },
  { value: "testemunha", label: "Testemunha" },
  { value: "outro", label: "Outro" },
] as const;

function toDatetimeLocal(value: Date | string): string {
  try {
    const d = value instanceof Date ? value : new Date(value);
    return d.toISOString().slice(0, 16);
  } catch {
    return new Date().toISOString().slice(0, 16);
  }
}

const sectionLabelClass =
  "text-xs uppercase tracking-wider font-semibold text-neutral-400";

export function RegistroCompletoSheet({
  open,
  onOpenChange,
  assistidoId,
  processoIdAtivo,
  processos,
  atendimento,
  onSuccess,
}: RegistroCompletoSheetProps) {
  const isEdit = !!atendimento;

  const [formData, setFormData] = useState({
    tipo: "presencial",
    dataAtendimento: new Date().toISOString().slice(0, 16),
    duracao: "",
    status: "realizado",
    processoId: "",
    interlocutor: "assistido",
    local: "",
    assunto: "",
    resumo: "",
    acompanhantes: "",
  });

  useEffect(() => {
    if (atendimento) {
      setFormData({
        tipo: atendimento.tipo ?? "presencial",
        dataAtendimento: toDatetimeLocal(atendimento.dataAtendimento),
        duracao: atendimento.duracao != null ? String(atendimento.duracao) : "",
        status: atendimento.status ?? "realizado",
        processoId: atendimento.processoId != null ? String(atendimento.processoId) : "",
        interlocutor: atendimento.interlocutor ?? "assistido",
        local: atendimento.local ?? "",
        assunto: atendimento.assunto ?? "",
        resumo: atendimento.resumo ?? "",
        acompanhantes: atendimento.acompanhantes ?? "",
      });
    } else {
      setFormData({
        tipo: "presencial",
        dataAtendimento: new Date().toISOString().slice(0, 16),
        duracao: "",
        status: "realizado",
        processoId: processoIdAtivo ? String(processoIdAtivo) : "",
        interlocutor: "assistido",
        local: "",
        assunto: "",
        resumo: "",
        acompanhantes: "",
      });
    }
  }, [atendimento, open, processoIdAtivo]);

  function set<K extends keyof typeof formData>(key: K, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  const createMutation = trpc.atendimentos.create.useMutation({
    onSuccess: () => {
      toast.success("Atendimento registrado");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateMutation = trpc.atendimentos.update.useMutation({
    onSuccess: () => {
      toast.success("Atendimento atualizado");
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSave() {
    const dataAtendimento = formData.dataAtendimento
      ? new Date(formData.dataAtendimento).toISOString()
      : new Date().toISOString();

    const duracao = formData.duracao ? Number(formData.duracao) : undefined;
    const processoId = formData.processoId ? Number(formData.processoId) : undefined;

    if (isEdit && atendimento) {
      updateMutation.mutate({
        id: atendimento.id,
        tipo: formData.tipo,
        dataAtendimento,
        duracao,
        status: formData.status || undefined,
        processoId: processoId ?? null,
        interlocutor: (formData.interlocutor as "assistido" | "familiar" | "testemunha" | "outro") || undefined,
        local: formData.local || undefined,
        assunto: formData.assunto || undefined,
        resumo: formData.resumo || undefined,
        acompanhantes: formData.acompanhantes || undefined,
      });
    } else {
      createMutation.mutate({
        assistidoId,
        tipo: formData.tipo,
        dataAtendimento,
        status: formData.status,
        processoId,
        interlocutor: formData.interlocutor as "assistido" | "familiar" | "testemunha" | "outro",
        local: formData.local || undefined,
        assunto: formData.assunto || undefined,
        resumo: formData.resumo || undefined,
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Editar Atendimento" : "Novo Atendimento"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Section: Básico */}
          <div className="space-y-3">
            <p className={sectionLabelClass}>Básico</p>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={formData.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de atendimento" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data/Hora */}
            <div className="space-y-1.5">
              <Label>Data / Hora</Label>
              <input
                type="datetime-local"
                value={formData.dataAtendimento}
                onChange={(e) => set("dataAtendimento", e.target.value)}
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
              />
            </div>

            {/* Duração */}
            <div className="space-y-1.5">
              <Label>Duração (min)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Duração (min)"
                value={formData.duracao}
                onChange={(e) => set("duracao", e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section: Contexto */}
          <div className="space-y-3">
            <p className={sectionLabelClass}>Contexto</p>

            {/* Processo */}
            <div className="space-y-1.5">
              <Label>Processo</Label>
              <Select
                value={formData.processoId}
                onValueChange={(v) => set("processoId", v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar processo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {processos.map((proc) => (
                    <SelectItem key={proc.id} value={String(proc.id)}>
                      {proc.numeroAutos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Interlocutor */}
            <div className="space-y-1.5">
              <Label>Interlocutor</Label>
              <Select
                value={formData.interlocutor}
                onValueChange={(v) => set("interlocutor", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Interlocutor" />
                </SelectTrigger>
                <SelectContent>
                  {INTERLOCUTOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Local */}
            <div className="space-y-1.5">
              <Label>Local</Label>
              <Input
                placeholder="Local do atendimento"
                value={formData.local}
                onChange={(e) => set("local", e.target.value)}
              />
            </div>
          </div>

          {/* Section: Conteúdo */}
          <div className="space-y-3">
            <p className={sectionLabelClass}>Conteúdo</p>

            {/* Assunto */}
            <div className="space-y-1.5">
              <Label>Assunto</Label>
              <Input
                placeholder="Assunto"
                value={formData.assunto}
                onChange={(e) => set("assunto", e.target.value)}
              />
            </div>

            {/* Resumo */}
            <div className="space-y-1.5">
              <Label>Resumo</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="Resumo do atendimento..."
                value={formData.resumo}
                onChange={(e) => set("resumo", e.target.value)}
              />
            </div>

            {/* Acompanhantes */}
            <div className="space-y-1.5">
              <Label>Acompanhantes</Label>
              <Input
                placeholder="Acompanhantes (opcional)"
                value={formData.acompanhantes}
                onChange={(e) => set("acompanhantes", e.target.value)}
              />
            </div>
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="w-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200"
          >
            {isPending ? "Salvando..." : isEdit ? "Atualizar" : "Registrar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
