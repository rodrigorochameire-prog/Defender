"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send, Scale, Copy, Check, Mail, AlertTriangle } from "lucide-react";

// IN 01/2026-CGD — Encaminhamento ao defensor natural.
// Peticionamento interno (outra comarca, mesma UF) ou integrado (outra UF).
// Item 13: esta unidade NÃO redige/protocola a peça — envia triagem + documentos.

type Regime = "interno" | "integrado";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function EncaminharDefensorNaturalModal({
  open,
  onOpenChange,
  demandaId,
  processoId,
  assistidoId,
  display,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  demandaId: number;
  processoId?: number;
  assistidoId?: number;
  display?: string;
}) {
  const [regime, setRegime] = useState<Regime>("interno");
  const [coordenacaoId, setCoordenacaoId] = useState<number | null>(null);
  const [prazoUrgente, setPrazoUrgente] = useState(false);
  const [dataLimite, setDataLimite] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [copied, setCopied] = useState(false);
  const [registrado, setRegistrado] = useState<{ id: number; email: string | null } | null>(null);

  const utils = trpc.useUtils();

  const { data: coordData } = trpc.coordenacoes.listar.useQuery(
    { regime, apenasAtivos: true },
    { enabled: open, staleTime: 60_000 },
  );
  const coordenacoes = useMemo(() => coordData?.items ?? [], [coordData]);

  const { data: triagem } = trpc.encaminhamentos.gerarTriagem.useQuery(
    { demandaId, regime },
    { enabled: open },
  );

  useEffect(() => {
    if (open) {
      setCoordenacaoId(null);
      setPrazoUrgente(false);
      setDataLimite("");
      setCopied(false);
      setRegistrado(null);
    }
  }, [open]);

  // Prefill the message from the server-generated triagem whenever it changes.
  useEffect(() => {
    if (triagem?.mensagem) setMensagem(triagem.mensagem);
  }, [triagem?.mensagem]);

  // Auto-select the único integrado destino (canal fixo) quando regime = integrado.
  useEffect(() => {
    if (regime === "integrado" && coordenacoes.length === 1) {
      setCoordenacaoId(coordenacoes[0].id);
    } else {
      setCoordenacaoId(null);
    }
  }, [regime, coordenacoes]);

  const criar = trpc.encaminhamentos.criarParaDefensorNatural.useMutation({
    onSuccess: (res) => {
      setRegistrado({ id: res.id, email: res.coordenacaoEmail ?? null });
      utils.invalidate();
    },
  });
  const marcarEnviado = trpc.encaminhamentos.marcarEnviado.useMutation({
    onSuccess: () => {
      utils.invalidate();
      onOpenChange(false);
    },
  });

  const coordSelecionada = coordenacoes.find((c) => c.id === coordenacaoId) ?? null;
  const emailDestino = coordSelecionada?.email ?? null;
  const numeroAutos = triagem?.numeroAutos ?? "";
  const assunto = `Encaminhamento ao defensor natural (IN 01/2026)${numeroAutos ? ` — ${numeroAutos}` : ""}`;

  const copiar = async () => {
    await navigator.clipboard.writeText(mensagem);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const mailtoHref = emailDestino
    ? `mailto:${emailDestino}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`
    : undefined;

  const submit = () => {
    criar.mutate({
      regime,
      mensagem,
      titulo: assunto.slice(0, 200),
      demandaId,
      processoId,
      assistidoId,
      coordenacaoId: coordenacaoId ?? undefined,
      comarcaDestino: coordSelecionada?.comarca ?? undefined,
      prazoUrgente,
      dataLimite: prazoUrgente && dataLimite ? dataLimite : undefined,
      atualizarDemanda: true,
    });
  };

  const canSubmit = mensagem.trim().length > 0 && !!coordenacaoId && !criar.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-neutral-200/40 dark:border-neutral-800/40">
          <DialogTitle className="text-[15px] font-semibold">
            Encaminhar ao defensor natural
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            IN 01/2026-CGD · processo de outra comarca/UF · esta unidade não redige nem protocola (item 13)
          </p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 max-h-[68vh] overflow-y-auto">
          {display && (
            <Field label="Demanda">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-50/60 dark:bg-neutral-800/40 border border-neutral-200/40 dark:border-neutral-700/40">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div className="flex-1 text-[12px]">{display}</div>
              </div>
            </Field>
          )}

          <Field label="Regime" hint={regime === "interno" ? "Outra comarca, mesma UF (Bahia)." : "Outra unidade da federação (CONDEGE)."}>
            <div className="flex gap-2">
              {(["interno", "integrado"] as Regime[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegime(r)}
                  className={`flex-1 text-[12px] px-3 py-2 rounded-lg border transition ${
                    regime === r
                      ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "border-neutral-200 dark:border-neutral-700 text-muted-foreground"
                  }`}
                >
                  {r === "interno" ? "Peticionamento interno" : "Peticionamento integrado"}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Coordenação destino"
            hint={coordenacoes.length === 0 ? "Nenhuma Coordenação cadastrada para este regime. Cadastre em Admin › Coordenações (Anexo Único da IN)." : emailDestino ?? undefined}
          >
            <select
              value={coordenacaoId ?? ""}
              onChange={(e) => setCoordenacaoId(e.target.value ? Number(e.target.value) : null)}
              className="w-full text-[13px] px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-indigo-400"
            >
              <option value="">Selecione…</option>
              {coordenacoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}{c.comarca ? ` — ${c.comarca}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Prazo processual em curso?">
            <label className="flex items-center gap-2 text-[12px] cursor-pointer">
              <input type="checkbox" checked={prazoUrgente} onChange={(e) => setPrazoUrgente(e.target.checked)} />
              Há prazo em curso (encaminhamento prioritário — itens 10 a 12)
            </label>
            {prazoUrgente && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Vencimento:</span>
                <input
                  type="date"
                  value={dataLimite}
                  onChange={(e) => setDataLimite(e.target.value)}
                  className="text-[12px] px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                />
                <span className="flex items-center gap-1 text-[11px] text-amber-600">
                  <AlertTriangle className="w-3 h-3" /> prioridade
                </span>
              </div>
            )}
          </Field>

          <Field label="Triagem (corpo do e-mail)" hint="Gerada automaticamente sem minuta. Complemente o histórico e os documentos antes de enviar.">
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={12}
              className="w-full text-[12px] leading-relaxed px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-indigo-400 resize-y font-mono"
            />
            <div className="mt-2 flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={copiar} className="text-[11px]">
                {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? "Copiado" : "Copiar e-mail"}
              </Button>
              {mailtoHref && (
                <a href={mailtoHref} className="text-[11px] inline-flex items-center text-indigo-600 hover:underline">
                  <Mail className="w-3.5 h-3.5 mr-1" /> Abrir no e-mail
                </a>
              )}
            </div>
          </Field>

          {registrado && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 text-[12px] text-emerald-800 dark:text-emerald-300">
              Encaminhamento registrado. A demanda foi marcada como <b>sem atuação / encaminhado ao defensor natural</b>.
              {registrado.email ? <> Envie o e-mail para <b>{registrado.email}</b> e confirme abaixo.</> : null}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-neutral-200/40 dark:border-neutral-800/40 flex items-center gap-2 bg-neutral-50/60 dark:bg-neutral-900/60">
          <p className="text-[11px] text-muted-foreground flex-1">
            Fica registrado no histórico da demanda.
          </p>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          {!registrado ? (
            <Button
              onClick={submit}
              disabled={!canSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="w-3.5 h-3.5 mr-1" /> Registrar encaminhamento
            </Button>
          ) : (
            <Button
              onClick={() => marcarEnviado.mutate({ id: registrado.id })}
              disabled={marcarEnviado.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Check className="w-3.5 h-3.5 mr-1" /> Marcar como enviado
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
