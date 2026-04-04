"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Plus, MessageCircle, User, Phone, Video, Mail, Shield } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuickRegisterProps {
  assistidoId: number;
  processoIdAtivo?: number;
  processos: Array<{ id: number; numeroAutos: string }>;
  onOpenFullForm: () => void;
  onSuccess: () => void;
}

const TIPO_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp", shortLabel: "WhatsApp", icon: MessageCircle, iconClass: "text-green-500" },
  { value: "presencial", label: "Presencial", shortLabel: "Presencial", icon: User, iconClass: "" },
  { value: "telefone", label: "Telefone", shortLabel: "Telefone", icon: Phone, iconClass: "" },
  { value: "videoconferencia", label: "Videoconferência", shortLabel: "Video", icon: Video, iconClass: "" },
  { value: "email", label: "Email", shortLabel: "Email", icon: Mail, iconClass: "" },
  { value: "visita_carceraria", label: "Visita Carcerária", shortLabel: "Visita", icon: Shield, iconClass: "" },
] as const;

const INTERLOCUTOR_OPTIONS = [
  { value: "assistido", label: "Assistido" },
  { value: "familiar", label: "Familiar" },
  { value: "testemunha", label: "Testemunha" },
  { value: "outro", label: "Outro" },
] as const;

const selectTriggerClass =
  "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md h-8 text-[11px] focus:ring-1 focus:ring-neutral-400 focus:border-neutral-400";

export function QuickRegister({
  assistidoId,
  processoIdAtivo,
  processos,
  onOpenFullForm,
  onSuccess,
}: QuickRegisterProps) {
  const [tipo, setTipo] = useState("presencial");
  const [assunto, setAssunto] = useState("");
  const [processoId, setProcessoId] = useState<string>(
    processoIdAtivo ? String(processoIdAtivo) : ""
  );
  const [interlocutor, setInterlocutor] = useState<"assistido" | "familiar" | "testemunha" | "outro">("assistido");

  const createMutation = trpc.atendimentos.create.useMutation({
    onSuccess: () => {
      toast.success("Atendimento registrado");
      setAssunto("");
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function handleSave() {
    if (!assunto.trim()) {
      toast.error("Informe o assunto");
      return;
    }

    createMutation.mutate({
      assistidoId,
      processoId: processoId && processoId !== "none" ? Number(processoId) : undefined,
      tipo,
      assunto: assunto.trim(),
      interlocutor,
      dataAtendimento: new Date().toISOString(),
      status: "realizado",
    });
  }

  const selectedTipo = TIPO_OPTIONS.find((o) => o.value === tipo);

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3">
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-2">
        {/* Tipo */}
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className={cn(selectTriggerClass, "w-[130px] shrink-0")}>
            <SelectValue>
              {selectedTipo && (
                <span className="flex items-center gap-1.5">
                  <selectedTipo.icon
                    className={cn("w-3 h-3 shrink-0", selectedTipo.iconClass)}
                  />
                  <span>{selectedTipo.shortLabel}</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TIPO_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex items-center gap-2">
                  <opt.icon className={cn("w-3.5 h-3.5 shrink-0", opt.iconClass)} />
                  {opt.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Assunto */}
        <input
          type="text"
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          placeholder="Assunto do atendimento..."
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-[12px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
        />

        {/* Processo */}
        <Select
          value={processoId}
          onValueChange={setProcessoId}
        >
          <SelectTrigger className={cn(selectTriggerClass, "w-auto shrink-0")}>
            <SelectValue placeholder="Processo">
              {processoId
                ? (() => {
                    const proc = processos.find((p) => String(p.id) === processoId);
                    return proc
                      ? proc.numeroAutos || "Processo"
                      : "Processo";
                  })()
                : "Processo"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum</SelectItem>
            {processos.map((proc) => (
              <SelectItem key={proc.id} value={String(proc.id)}>
                {proc.numeroAutos || "Processo"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Interlocutor */}
        <Select value={interlocutor} onValueChange={(v) => setInterlocutor(v as typeof interlocutor)}>
          <SelectTrigger className={cn(selectTriggerClass, "w-[120px] shrink-0")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INTERLOCUTOR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Salvar */}
        <button
          onClick={handleSave}
          disabled={createMutation.isPending}
          className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-md px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          <Plus className="w-3 h-3" />
          Salvar
        </button>
      </div>

      <div className="flex justify-end mt-1">
        <button
          onClick={onOpenFullForm}
          className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline"
        >
          Registro completo →
        </button>
      </div>
    </div>
  );
}
