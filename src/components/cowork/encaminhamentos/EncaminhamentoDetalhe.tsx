"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { TIPO_META, type EncaminhamentoTipo } from "./tipo-colors";
import { EncaminhamentoBadge } from "./EncaminhamentoBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Reply, Pin, Archive, X, Scale } from "lucide-react";

export function EncaminhamentoDetalhe({ id }: { id: number }) {
  const { data, isLoading } = trpc.encaminhamentos.obter.useQuery({ id });
  const utils = trpc.useUtils();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const invalidate = () => {
    utils.encaminhamentos.invalidate();
  };

  const marcarCiente = trpc.encaminhamentos.marcarCiente.useMutation({ onSuccess: invalidate });
  const aceitar = trpc.encaminhamentos.aceitar.useMutation({ onSuccess: invalidate });
  const recusar = trpc.encaminhamentos.recusar.useMutation({ onSuccess: invalidate });
  const arquivar = trpc.encaminhamentos.arquivar.useMutation({ onSuccess: invalidate });
  const responder = trpc.encaminhamentos.responder.useMutation({
    onSuccess: () => {
      invalidate();
      setReplyOpen(false);
      setReplyText("");
    },
  });

  if (isLoading || !data) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  }

  const enc = data.encaminhamento;
  const tipo = enc.tipo as EncaminhamentoTipo;
  const m = TIPO_META[tipo];
  const borderColor = m.colorBar.replace("bg-", "border-");

  const handleRecusar = () => {
    const motivo = window.prompt("Motivo da recusa:");
    if (motivo && motivo.trim().length > 0) {
      recusar.mutate({ id, motivo });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className={cn("p-5 border-l-4", borderColor)}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] font-semibold text-foreground">
                {enc.titulo || "Sem título"}
              </h2>
              <EncaminhamentoBadge tipo={tipo} withLabel size="sm" />
              {enc.urgencia === "urgente" && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  Urgente
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
              Status: {enc.status}
            </p>
          </div>
        </div>
      </div>

      {(enc.demandaId || enc.processoId || enc.assistidoId) && (
        <div className="mx-5 mt-3 p-3 rounded-lg bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/40 dark:border-neutral-700/40 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div className="flex-1 text-[12px]">
            {enc.demandaId && <div>Demanda #{enc.demandaId}</div>}
            {enc.processoId && <div className="text-muted-foreground">Processo #{enc.processoId}</div>}
          </div>
        </div>
      )}

      <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto">
        <p className="text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap">
          {enc.mensagem}
        </p>

        {data.respostas.length > 0 && (
          <div className="mt-5 pt-3 border-t border-dashed border-neutral-200/40 dark:border-neutral-800/40">
            <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Thread · {data.respostas.length}{" "}
              {data.respostas.length === 1 ? "resposta" : "respostas"}
            </div>
            <div className="space-y-2">
              {data.respostas.map((r) => (
                <div
                  key={r.id}
                  className="p-2.5 rounded-lg bg-neutral-50/60 dark:bg-neutral-800/40 text-[12px]"
                >
                  <div className="text-[10px] text-muted-foreground mb-1 tabular-nums">
                    {new Date(r.createdAt).toLocaleString("pt-BR")}
                  </div>
                  <div className="whitespace-pre-wrap">{r.mensagem}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {replyOpen && (
          <div className="mt-3 space-y-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              placeholder="Sua resposta…"
              className="w-full text-[12px] px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-indigo-400 resize-y"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => responder.mutate({ id, mensagem: replyText })}
                disabled={!replyText.trim() || responder.isPending}
              >
                Enviar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReplyOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-neutral-200/40 dark:border-neutral-800/40 flex items-center gap-2 flex-wrap">
        {(tipo === "transferir" || tipo === "acompanhar") && enc.status === "pendente" && (
          <>
            <Button size="sm" onClick={() => aceitar.mutate({ id })}>
              <Check className="w-3.5 h-3.5 mr-1" /> Aceitar
            </Button>
            <Button size="sm" variant="outline" onClick={handleRecusar}>
              <X className="w-3.5 h-3.5 mr-1" /> Recusar
            </Button>
          </>
        )}
        {(tipo === "anotar" || tipo === "encaminhar") && enc.status === "pendente" && (
          <Button size="sm" onClick={() => marcarCiente.mutate({ id })}>
            <Check className="w-3.5 h-3.5 mr-1" /> Marcar como ciente
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setReplyOpen(true)}>
          <Reply className="w-3.5 h-3.5 mr-1" /> Responder
        </Button>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => arquivar.mutate({ id })}>
          <Archive className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
