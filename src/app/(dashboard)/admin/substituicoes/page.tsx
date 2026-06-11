"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, ArrowLeftRight, Scale, Trash2, FileText, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  DP_ATRIBUICOES,
  UNIDADES_CONHECIDAS,
  TIPOS_SUBSTITUICAO,
  STATUS_SUBSTITUICAO,
} from "@/lib/funcional/dp-atribuicoes";

const STATUS_TONE: Record<string, string> = {
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};
const statusCfg = (s: string) => STATUS_SUBSTITUICAO.find((x) => x.value === s) ?? STATUS_SUBSTITUICAO[0];

function NovaSubstituicaoForm({ onDone }: { onDone: () => void }) {
  const utils = trpc.useUtils();
  const [unidade, setUnidade] = useState(UNIDADES_CONHECIDAS[0] ?? "");
  const [tipo, setTipo] = useState("automatica");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [motivo, setMotivo] = useState("");
  const cfg = DP_ATRIBUICOES[unidade];
  const opcoes = cfg?.opcoesEscopo ?? (cfg ? [{ label: cfg.atribuicoes.join(" + "), atribuicoes: cfg.atribuicoes }] : []);
  const [escopoIdx, setEscopoIdx] = useState(0);

  const criar = trpc.substituicoes.criar.useMutation({
    onSuccess: () => {
      utils.substituicoes.listar.invalidate();
      toast.success("Substituição registrada");
      onDone();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Unidade substituída</label>
          <Input list="unidades" value={unidade} onChange={(e) => { setUnidade(e.target.value); setEscopoIdx(0); }} placeholder="Ex.: 7º DP de Camaçari" className="mt-1" />
          <datalist id="unidades">{UNIDADES_CONHECIDAS.map((u) => <option key={u} value={u} />)}</datalist>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-neutral-200 dark:border-neutral-700 bg-transparent px-2 text-sm">
            {TIPOS_SUBSTITUICAO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Escopo de vara — escolha do usuário (peculiaridade 7ª/9ª DP) */}
      {opcoes.length > 0 && (
        <div>
          <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            Escopo da substituição {cfg?.escolhaManual && <span className="text-amber-600">(escolha qual considera)</span>}
          </label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {opcoes.map((o, i) => (
              <button key={o.label} type="button" onClick={() => setEscopoIdx(i)}
                className={cn("px-2.5 py-1 rounded-lg text-xs font-medium ring-1 ring-inset transition-colors cursor-pointer",
                  escopoIdx === i ? "bg-neutral-900 text-white ring-neutral-900 dark:bg-neutral-100 dark:text-neutral-900" : "bg-transparent text-neutral-600 dark:text-neutral-300 ring-neutral-200 dark:ring-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800")}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Início</label>
          <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="mt-1" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Fim</label>
          <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="mt-1" />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">Motivo (afastamento da titular)</label>
        <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: férias da titular (Portaria nº …)" className="mt-1" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button disabled={!unidade || !dataInicio || criar.isPending}
          onClick={() => criar.mutate({
            unidadeSubstituida: unidade, tipo: tipo as any,
            escopoAtribuicoes: opcoes[escopoIdx]?.atribuicoes ?? [],
            dataInicio, dataFim: dataFim || null, motivo: motivo || null,
          })}>
          {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar"}
        </Button>
      </div>
    </Card>
  );
}

function SubstituicaoCard({ s }: { s: any }) {
  const utils = trpc.useUtils();
  const st = statusCfg(s.status);
  const atualizar = trpc.substituicoes.atualizar.useMutation({
    onSuccess: () => { utils.substituicoes.listar.invalidate(); },
  });
  const remover = trpc.substituicoes.remover.useMutation({
    onSuccess: () => { utils.substituicoes.listar.invalidate(); toast.success("Removida"); },
  });
  const gerar = trpc.substituicoes.gerarGratificacao.useMutation({
    onSuccess: (r) => {
      utils.substituicoes.listar.invalidate();
      utils.substituicoes.statusGeracao.invalidate();
      if ((r as any).jaEnfileirada) toast.info("Já há uma geração em andamento.");
      else toast.success("Tarefa enviada ao Claude Code (daemon). Acompanhe abaixo.");
    },
    onError: (e) => toast.error(e.message),
  });
  const podeGerar = s.status === "em_andamento" || s.status === "concluida";
  return (
    <Card className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-100">{s.unidadeSubstituida}</span>
            <span className="text-[10px] uppercase tracking-wide text-neutral-400">{s.tipo}</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", STATUS_TONE[st.color])}>{st.label}</span>
          </div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {format(parseISO(s.dataInicio), "dd/MM/yyyy", { locale: ptBR })}
            {s.dataFim ? ` a ${format(parseISO(s.dataFim), "dd/MM/yyyy", { locale: ptBR })}` : ""}
          </div>
          {Array.isArray(s.escopoAtribuicoes) && s.escopoAtribuicoes.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <Scale className="w-3 h-3 text-neutral-400" />
              {s.escopoAtribuicoes.map((a: string) => (
                <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">{a}</span>
              ))}
            </div>
          )}
          {s.oficioNumero && <div className="text-[11px] text-neutral-500 mt-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Ofício {s.oficioNumero}{s.seiProtocolo ? ` · SEI ${s.seiProtocolo}` : ""}</div>}
          {s.motivo && <div className="text-[11px] text-neutral-400 mt-0.5">{s.motivo}</div>}
          {Array.isArray(s.pendencias) && s.pendencias.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {s.pendencias.map((pend: string) => (
                <span key={pend} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{pend}</span>
              ))}
            </div>
          )}
          <DadosPeriodo id={s.id} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <select value={s.status} onChange={(e) => atualizar.mutate({ id: s.id, status: e.target.value as any })}
            className="h-7 text-[11px] rounded-md border border-neutral-200 dark:border-neutral-700 bg-transparent px-1 cursor-pointer">
            {STATUS_SUBSTITUICAO.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
          <button onClick={() => remover.mutate({ id: s.id })} className="p-1 text-neutral-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {podeGerar && (
        <div className="mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
          <span className="text-[10px] text-neutral-400">Ofício + relatório via Claude Code (conta Max, sem custo de API)</span>
          <Button size="sm" variant="outline" disabled={gerar.isPending}
            onClick={() => gerar.mutate({ id: s.id })}>
            {gerar.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5 mr-1" /> Gerar gratificação</>}
          </Button>
        </div>
      )}
    </Card>
  );
}

function StatusGeracao() {
  const { data: t } = trpc.substituicoes.statusGeracao.useQuery(undefined, {
    refetchInterval: (q) => {
      const st = (q.state.data as any)?.status;
      return st === "pending" || st === "processing" ? 5000 : false;
    },
  });
  if (!t) return null;
  const ativo = t.status === "pending" || t.status === "processing";
  const ok = t.status === "completed";
  const res: any = t.resultado ?? {};
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        {ativo ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
          Geração de gratificação — {t.status}{t.etapa ? ` · ${t.etapa}` : ""}
        </span>
      </div>
      {ativo && <p className="text-[11px] text-neutral-400 mt-1">O daemon do Claude Code está processando (precisa estar ligado na máquina dedicada, com o Drive montado).</p>}
      {ok && res.oficio_numero && <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1">Ofício {res.oficio_numero} gerado · {res.manifestacoes ?? "?"} manifestações. Confira no <span className="font-medium">_Enviar ao SEI</span>.</p>}
      {t.erro && <p className="text-[11px] text-rose-500 mt-1">{t.erro}</p>}
    </Card>
  );
}

function DadosPeriodo({ id }: { id: number }) {
  const { data } = trpc.substituicoes.previewDados.useQuery({ id });
  if (!data) return null;
  return (
    <div className="text-[11px] text-neutral-500 mt-1">
      No período (vinculado à substituição): {data.totalAudiencias} audiência(s) ·{" "}
      {data.totalDemandas} demanda(s) · {data.totalAtendimentos} atendimento(s)
    </div>
  );
}

export default function SubstituicoesPage() {
  const { data: lista, isLoading } = trpc.substituicoes.listar.useQuery();
  const [novo, setNovo] = useState(false);
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-neutral-500" />
          <h1 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Substituições e gratificações</h1>
        </div>
        <Button size="sm" onClick={() => setNovo((v) => !v)}><Plus className="w-4 h-4 mr-1" /> Nova</Button>
      </div>

      {novo && <NovaSubstituicaoForm onDone={() => setNovo(false)} />}

      <StatusGeracao />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
      ) : !lista?.length ? (
        <p className="text-sm text-neutral-400 italic text-center py-12">Nenhuma substituição registrada.</p>
      ) : (
        <div className="space-y-2">{lista.map((s: any) => <SubstituicaoCard key={s.id} s={s} />)}</div>
      )}
    </div>
  );
}
