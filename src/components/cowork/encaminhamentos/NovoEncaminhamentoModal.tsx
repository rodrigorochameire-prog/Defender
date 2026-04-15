"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send, Lock, Scale } from "lucide-react";
import { TipoEncaminhamentoSelector } from "./TipoEncaminhamentoSelector";
import { DestinatarioPicker, type Colega } from "./DestinatarioPicker";
import { NotificacaoToggles, type NotificacaoState } from "./NotificacaoToggles";
import { type EncaminhamentoTipo } from "./tipo-colors";

export interface ContextoPreSelecionado {
  demandaId?: number;
  processoId?: number;
  assistidoId?: number;
  display?: string;
}

const SINGLE_DEST_TIPOS = new Set<EncaminhamentoTipo>([
  "transferir",
  "acompanhar",
  "parecer",
]);

const NOTIF_DEFAULTS: Record<EncaminhamentoTipo, NotificacaoState> = {
  transferir: { ombuds: true, whatsapp: true, email: false },
  parecer: { ombuds: true, whatsapp: true, email: false },
  encaminhar: { ombuds: true, whatsapp: false, email: false },
  acompanhar: { ombuds: true, whatsapp: false, email: false },
  anotar: { ombuds: true, whatsapp: false, email: false },
};

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

export function NovoEncaminhamentoModal({
  open,
  onOpenChange,
  contexto,
  initialTipo = "anotar",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contexto?: ContextoPreSelecionado;
  initialTipo?: EncaminhamentoTipo;
}) {
  const [tipo, setTipo] = useState<EncaminhamentoTipo>(initialTipo);
  const [destinatarios, setDestinatarios] = useState<Colega[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [titulo, setTitulo] = useState("");
  const [notif, setNotif] = useState<NotificacaoState>(NOTIF_DEFAULTS[initialTipo]);

  useEffect(() => {
    if (open) {
      setTipo(initialTipo);
      setNotif(NOTIF_DEFAULTS[initialTipo]);
      setMensagem("");
      setTitulo("");
      setDestinatarios([]);
    }
  }, [open, initialTipo]);

  const utils = trpc.useUtils();
  const criar = trpc.encaminhamentos.criar.useMutation({
    onSuccess: () => {
      utils.encaminhamentos.invalidate();
      onOpenChange(false);
    },
  });

  const handleTipoChange = (t: EncaminhamentoTipo) => {
    setTipo(t);
    setNotif(NOTIF_DEFAULTS[t]);
    if (SINGLE_DEST_TIPOS.has(t) && destinatarios.length > 1) {
      setDestinatarios(destinatarios.slice(0, 1));
    }
  };

  const submit = () => {
    criar.mutate({
      tipo,
      titulo: titulo || undefined,
      mensagem,
      destinatarioIds: destinatarios.map((d) => d.id),
      demandaId: contexto?.demandaId,
      processoId: contexto?.processoId,
      assistidoId: contexto?.assistidoId,
      notificarOmbuds: notif.ombuds,
      notificarWhatsapp: notif.whatsapp,
      notificarEmail: notif.email,
    });
  };

  const maxDest = SINGLE_DEST_TIPOS.has(tipo) ? 1 : Infinity;
  const canSubmit =
    mensagem.trim().length > 0 && destinatarios.length > 0 && !criar.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-neutral-200/40 dark:border-neutral-800/40">
          <DialogTitle className="text-[15px] font-semibold">
            Novo encaminhamento
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Compartilhe uma demanda ou ideia com um colega
          </p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <Section label="Tipo">
            <TipoEncaminhamentoSelector value={tipo} onChange={handleTipoChange} />
          </Section>

          {contexto && (
            <Section label="Sobre">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/40 dark:border-neutral-700/40">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="flex-1 text-[12px]">
                  {contexto.display ?? "Contexto pré-selecionado"}
                </div>
              </div>
            </Section>
          )}

          <Section label="Para">
            <DestinatarioPicker
              value={destinatarios}
              onChange={setDestinatarios}
              maxCount={maxDest}
            />
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1.5">
              <Lock className="w-3 h-3" /> Só quem está em "Para" consegue ver o conteúdo
            </p>
          </Section>

          <Section label="Título (opcional)">
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumo curto"
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-indigo-400"
            />
          </Section>

          <Section label="Mensagem">
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Escreva o contexto…"
              rows={4}
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-indigo-400 resize-y"
            />
          </Section>

          <NotificacaoToggles value={notif} onChange={setNotif} />
        </div>

        <div className="px-6 py-3 border-t border-neutral-200/40 dark:border-neutral-800/40 flex items-center gap-2 bg-neutral-50/60 dark:bg-neutral-900/60">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 flex-1">
            <Lock className="w-3 h-3" /> Tudo fica registrado no histórico da demanda
          </p>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={!canSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Send className="w-3.5 h-3.5 mr-1" /> Enviar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
