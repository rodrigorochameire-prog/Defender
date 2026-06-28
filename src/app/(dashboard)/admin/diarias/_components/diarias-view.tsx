"use client";

import { useMemo, useState } from "react";
import { Banknote, Wallet, Clock, CalendarDays, Plus } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { StatusChip, EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { diariaStatusInfo } from "@/lib/diarias/status-visual";
import { podeTransicionar } from "@/lib/diarias/transicoes";
import { cn } from "@/lib/utils";

const inputCls = "block border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100";
const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ACAO_LABEL: Record<string, string> = {
  requerida: "Requerer",
  autorizada: "Autorizar",
  paga: "Marcar paga",
  cancelada: "Cancelar",
};

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.08]">
      <Icon className="w-4 h-4 text-white/70" />
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white">{value}</div>
        <div className="text-[11px] text-white/60">{label}</div>
      </div>
    </div>
  );
}

const EMPTY_FORM = { destino: "", origem: "", motivo: "", dataInicio: "", dataFim: "", quantidade: "1", valorUnitario: "", sei: "" };

export function DiariasView() {
  const utils = trpc.useUtils();
  const { data = [], isLoading } = trpc.diarias.listar.useQuery();
  const invalidate = () => utils.diarias.listar.invalidate();
  const criar = trpc.diarias.criar.useMutation({ onSuccess: invalidate });
  const atualizar = trpc.diarias.atualizar.useMutation({ onSuccess: invalidate });
  const remover = trpc.diarias.remover.useMutation({ onSuccess: invalidate });

  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ ...EMPTY_FORM });
  const set = (patch: Partial<typeof f>) => setF((cur) => ({ ...cur, ...patch }));

  const anoAtual = new Date().getFullYear().toString();
  const kpis = useMemo(() => {
    let aReceber = 0, pagoAno = 0, pendentes = 0;
    for (const d of data) {
      if (d.status === "a_requerer" || d.status === "requerida" || d.status === "autorizada") aReceber += d.totalCents;
      if (d.status === "paga" && d.dataInicio.slice(0, 4) === anoAtual) pagoAno += d.totalCents;
      if (d.status === "requerida") pendentes += 1;
    }
    return { aReceber, pagoAno, pendentes, total: data.length };
  }, [data, anoAtual]);

  const stats = (
    <div className="flex flex-wrap items-center gap-2">
      <Kpi icon={Wallet} label="A receber" value={brl(kpis.aReceber)} />
      <Kpi icon={Banknote} label={`Pago em ${anoAtual}`} value={brl(kpis.pagoAno)} />
      <Kpi icon={Clock} label="Pendentes" value={kpis.pendentes} />
      <Kpi icon={CalendarDays} label="Diárias" value={kpis.total} />
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <CollapsiblePageHeader title="Diárias" icon={Banknote}>
        {stats}
      </CollapsiblePageHeader>

      <div className="p-4 space-y-4">
        {/* Nova diária */}
        <section className={cn(CARD_STYLE.base)}>
          <div className="flex items-center justify-between">
            <h2 className={TYPO.h3}>Minhas diárias</h2>
            <Button size="sm" variant="outline" onClick={() => setNovo((v) => !v)}>
              <Plus className="w-4 h-4 mr-1" /> Nova diária
            </Button>
          </div>
          {novo && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-xs">Destino<input className={inputCls} value={f.destino} onChange={(e) => set({ destino: e.target.value })} /></label>
              <label className="text-xs">Origem<input className={inputCls} value={f.origem} onChange={(e) => set({ origem: e.target.value })} /></label>
              <label className="text-xs">Início<input type="date" className={inputCls} value={f.dataInicio} onChange={(e) => set({ dataInicio: e.target.value })} /></label>
              <label className="text-xs">Fim<input type="date" className={inputCls} value={f.dataFim} onChange={(e) => set({ dataFim: e.target.value })} /></label>
              <label className="text-xs">Qtd<input type="number" step="0.5" min="0.5" className={cn(inputCls, "w-20")} value={f.quantidade} onChange={(e) => set({ quantidade: e.target.value })} /></label>
              <label className="text-xs">Valor unit. (R$)<input type="number" step="0.01" min="0" className={cn(inputCls, "w-28")} value={f.valorUnitario} onChange={(e) => set({ valorUnitario: e.target.value })} /></label>
              <label className="text-xs">SEI<input className={cn(inputCls, "w-28")} value={f.sei} onChange={(e) => set({ sei: e.target.value })} /></label>
              <Button size="sm" disabled={!f.destino || !f.dataInicio || !f.dataFim || !f.valorUnitario || criar.isPending}
                onClick={() => criar.mutate({
                  destino: f.destino,
                  origem: f.origem || null,
                  motivo: f.motivo || null,
                  dataInicio: f.dataInicio,
                  dataFim: f.dataFim,
                  quantidade: Number(f.quantidade),
                  valorUnitarioCents: Math.round(Number(f.valorUnitario) * 100),
                  seiProtocolo: f.sei || null,
                }, { onSuccess: () => { setNovo(false); setF({ ...EMPTY_FORM }); } })}>
                Salvar
              </Button>
            </div>
          )}
          {criar.error && <p className="mt-2 text-[11px] text-rose-600">{criar.error.message}</p>}
          {(atualizar.error || remover.error) && <p className="mt-2 text-[11px] text-rose-600">{atualizar.error?.message ?? remover.error?.message}</p>}
        </section>

        {/* Lista */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : data.length === 0 ? (
          <EmptyState icon={Banknote} title="Nenhuma diária cadastrada" />
        ) : (
          <section className={cn(CARD_STYLE.base)}>
            <ul className="divide-y divide-neutral-100">
              {data.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {d.destino} · {d.dataInicio} – {d.dataFim}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.quantidade} × {brl(d.valorUnitarioCents)} = <span className="font-semibold">{brl(d.totalCents)}</span>
                      {d.seiProtocolo ? ` · SEI ${d.seiProtocolo}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusChip info={diariaStatusInfo(d.status)} />
                    {(["requerida", "autorizada", "paga", "cancelada"] as const)
                      .filter((s) => podeTransicionar(d.status, s))
                      .map((s) => (
                        <Button key={s} size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
                          disabled={atualizar.isPending}
                          onClick={() => atualizar.mutate({ id: d.id, status: s })}>
                          {ACAO_LABEL[s]}
                        </Button>
                      ))}
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-rose-600"
                      disabled={remover.isPending}
                      onClick={() => { if (window.confirm("Excluir esta diária?")) remover.mutate({ id: d.id }); }}>
                      Excluir
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
