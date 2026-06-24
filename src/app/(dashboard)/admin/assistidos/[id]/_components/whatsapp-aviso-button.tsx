"use client";

import { useState } from "react";
import { MessageCircle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type Base = {
  assistidoId: number;
  nome: string;
  phone: string | null | undefined;
  numeroProcesso: string | null | undefined;
};

type PropsPrazo = Base & {
  variant: "prazo";
  dataPrazo: string; // dd/mm/aaaa
  tipoAto: string;
};

type PropsAudiencia = Base & {
  variant: "audiencia";
  dataAudiencia: string; // dd/mm/aaaa
  horaAudiencia: string; // HH:mm
  local?: string | null;
};

/**
 * Botão "Avisar via WhatsApp" — dispara a notificação templated de prazo ou
 * audiência (whatsapp.sendPrazoNotification / sendAudienciaNotification).
 * Só habilita quando há telefone. Confirma antes de enviar (evita disparo
 * acidental ao assistido).
 */
export function WhatsappAvisoButton(props: PropsPrazo | PropsAudiencia) {
  const [enviado, setEnviado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const onOk = () => {
    setEnviado(true);
    setConfirmar(false);
    toast.success("Aviso enviado ao assistido.");
  };
  const onErr = (e: { message: string }) => {
    setConfirmar(false);
    toast.error(e.message || "Falha ao enviar WhatsApp.");
  };

  const mPrazo = trpc.whatsapp.sendPrazoNotification.useMutation({ onSuccess: onOk, onError: onErr });
  const mAud = trpc.whatsapp.sendAudienciaNotification.useMutation({ onSuccess: onOk, onError: onErr });
  const pending = mPrazo.isPending || mAud.isPending;

  const phone = props.phone?.trim();
  if (!phone) return null; // sem telefone → nada a avisar

  const disparar = () => {
    if (props.variant === "prazo") {
      mPrazo.mutate({
        assistidoId: props.assistidoId,
        phone,
        nomeAssistido: props.nome,
        numeroProcesso: props.numeroProcesso ?? "—",
        dataPrazo: props.dataPrazo,
        tipoAto: props.tipoAto,
      });
    } else {
      mAud.mutate({
        assistidoId: props.assistidoId,
        phone,
        nomeAssistido: props.nome,
        numeroProcesso: props.numeroProcesso ?? "—",
        dataAudiencia: props.dataAudiencia,
        horaAudiencia: props.horaAudiencia,
        local: props.local ?? undefined,
      });
    }
  };

  if (enviado) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
        <Check className="h-3 w-3" /> avisado
      </span>
    );
  }

  if (confirmar) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={disparar}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
          confirmar envio
        </button>
        <button
          type="button"
          onClick={() => setConfirmar(false)}
          className="text-[10px] text-neutral-400 hover:text-neutral-600 cursor-pointer"
        >
          ×
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmar(true)}
      title="Notificar o assistido por WhatsApp"
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
        "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors cursor-pointer",
      )}
    >
      <MessageCircle className="h-3 w-3" /> avisar
    </button>
  );
}
