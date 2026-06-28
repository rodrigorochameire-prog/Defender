"use client";

import { useMemo, useState } from "react";
import { Plane, CalendarClock, PlayCircle, FolderOpen, Plus } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { StatusChip, EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { feriasStatusInfo } from "@/lib/ferias/status-visual";
import { podeTransicionar } from "@/lib/ferias/transicoes";
import { cn } from "@/lib/utils";

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

const ACAO_LABEL: Record<string, string> = {
  homologada: "Homologar",
  em_fruicao: "Iniciar fruição",
  concluida: "Concluir",
  cancelada: "Cancelar",
};

const inputCls = "block border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100";

export function FeriasView() {
  const utils = trpc.useUtils();
  const { data = [], isLoading } = trpc.ferias.listar.useQuery();
  const { data: colegas = [] } = trpc.cobertura.colegasDisponiveis.useQuery();

  const invalidate = () => utils.ferias.listar.invalidate();
  const criarPeriodo = trpc.ferias.criarPeriodo.useMutation({ onSuccess: invalidate });
  const criarParcela = trpc.ferias.criarParcela.useMutation({ onSuccess: invalidate });
  const atualizarParcela = trpc.ferias.atualizarParcela.useMutation({ onSuccess: invalidate });
  const removerParcela = trpc.ferias.removerParcela.useMutation({ onSuccess: invalidate });
  const removerPeriodo = trpc.ferias.removerPeriodo.useMutation({ onSuccess: invalidate });

  const [novoPeriodo, setNovoPeriodo] = useState(false);
  const [pAq, setPAq] = useState({ inicio: "", fim: "", dias: 30 });
  const [parcelaForm, setParcelaForm] = useState<Record<number, { inicio: string; fim: string; substitutoId: string; sei: string }>>({});

  const kpis = useMemo(() => {
    let disponiveis = 0, programadas = 0, emFruicao = 0, abertos = 0;
    for (const row of data) {
      disponiveis += row.saldo.disponiveis;
      if (row.saldo.disponiveis > 0) abertos += 1;
      for (const p of row.parcelas) {
        if (p.status === "programada") programadas += 1;
        if (p.status === "em_fruicao") emFruicao += 1;
      }
    }
    return { disponiveis, programadas, emFruicao, abertos };
  }, [data]);

  const stats = (
    <div className="flex flex-wrap items-center gap-2">
      <Kpi icon={Plane} label="Dias disponíveis" value={kpis.disponiveis} />
      <Kpi icon={CalendarClock} label="Parcelas programadas" value={kpis.programadas} />
      <Kpi icon={PlayCircle} label="Em fruição" value={kpis.emFruicao} />
      <Kpi icon={FolderOpen} label="Períodos abertos" value={kpis.abertos} />
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <CollapsiblePageHeader title="Férias" icon={Plane}>
        {stats}
      </CollapsiblePageHeader>

      <div className="p-4 space-y-4">
        {/* Novo período */}
        <section className={cn(CARD_STYLE.base)}>
          <div className="flex items-center justify-between">
            <h2 className={TYPO.h3}>Períodos aquisitivos</h2>
            <Button size="sm" variant="outline" onClick={() => setNovoPeriodo((v) => !v)}>
              <Plus className="w-4 h-4 mr-1" /> Novo período
            </Button>
          </div>
          {removerParcela.error && (
            <p className="mt-2 text-[11px] text-rose-600">{removerParcela.error.message}</p>
          )}
          {removerPeriodo.error && (
            <p className="mt-2 text-[11px] text-rose-600">{removerPeriodo.error.message}</p>
          )}
          {novoPeriodo && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-xs">Início aquisitivo
                <input type="date" className={inputCls} value={pAq.inicio} onChange={(e) => setPAq({ ...pAq, inicio: e.target.value })} />
              </label>
              <label className="text-xs">Fim aquisitivo
                <input type="date" className={inputCls} value={pAq.fim} onChange={(e) => setPAq({ ...pAq, fim: e.target.value })} />
              </label>
              <label className="text-xs">Dias de direito
                <input type="number" className={cn(inputCls, "w-24")} value={pAq.dias} onChange={(e) => setPAq({ ...pAq, dias: Number(e.target.value) })} />
              </label>
              <Button size="sm" disabled={!pAq.inicio || !pAq.fim || criarPeriodo.isPending}
                onClick={() => criarPeriodo.mutate({ aquisitivoInicio: pAq.inicio, aquisitivoFim: pAq.fim, diasDireito: pAq.dias }, { onSuccess: () => { setNovoPeriodo(false); setPAq({ inicio: "", fim: "", dias: 30 }); } })}>
                Salvar
              </Button>
            </div>
          )}
          {criarPeriodo.error && (
            <p className="mt-2 text-[11px] text-rose-600">{criarPeriodo.error.message}</p>
          )}
        </section>

        {/* Lista de períodos */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : data.length === 0 ? (
          <EmptyState icon={Plane} title="Nenhum período de férias cadastrado" />
        ) : (
          data.map((row) => {
            const f = parcelaForm[row.periodo.id] ?? { inicio: "", fim: "", substitutoId: "", sei: "" };
            const set = (patch: Partial<typeof f>) => setParcelaForm((m) => ({ ...m, [row.periodo.id]: { ...f, ...patch } }));
            const pct = row.saldo.direito > 0 ? Math.max(0, Math.min(100, (row.saldo.disponiveis / row.saldo.direito) * 100)) : 0;
            return (
              <section key={row.periodo.id} className={cn(CARD_STYLE.base)}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className={cn(TYPO.h3, "min-w-0 truncate")}>
                    Aquisitivo {row.periodo.aquisitivoInicio} – {row.periodo.aquisitivoFim}
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground">
                      {row.saldo.disponiveis}/{row.saldo.direito} dias disponíveis
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-rose-600"
                      disabled={removerPeriodo.isPending}
                      onClick={() => {
                        if (window.confirm("Excluir este período e todas as suas parcelas?")) {
                          removerPeriodo.mutate({ id: row.periodo.id });
                        }
                      }}>
                      Excluir período
                    </Button>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>

                {/* Parcelas */}
                <ul className="mt-3 divide-y divide-neutral-100">
                  {row.parcelas.length === 0 ? (
                    <li className="py-2"><EmptyState icon={CalendarClock} title="Sem parcelas" size="sm" /></li>
                  ) : row.parcelas.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2 gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {p.ordem}ª parcela · {p.dataInicio} – {p.dataFim} ({p.dias}d)
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.substitutoNome ? `Substituto: ${p.substitutoNome}` : "Sem substituto"}{p.seiProtocolo ? ` · SEI ${p.seiProtocolo}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <StatusChip info={feriasStatusInfo(p.status)} />
                        {(["homologada", "em_fruicao", "concluida", "cancelada"] as const)
                          .filter((s) => podeTransicionar(p.status, s))
                          .map((s) => (
                            <Button key={s} size="sm" variant="ghost" className="h-7 px-2 text-[11px]"
                              disabled={atualizarParcela.isPending}
                              onClick={() => atualizarParcela.mutate({ id: p.id, status: s })}>
                              {ACAO_LABEL[s]}
                            </Button>
                          ))}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-rose-600"
                          disabled={removerParcela.isPending}
                          onClick={() => removerParcela.mutate({ id: p.id })}>
                          Excluir
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Nova parcela */}
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3">
                  <label className="text-xs">Início
                    <input type="date" className={inputCls} value={f.inicio} onChange={(e) => set({ inicio: e.target.value })} />
                  </label>
                  <label className="text-xs">Fim
                    <input type="date" className={inputCls} value={f.fim} onChange={(e) => set({ fim: e.target.value })} />
                  </label>
                  <label className="text-xs">Substituto
                    <select className={inputCls} value={f.substitutoId} onChange={(e) => set({ substitutoId: e.target.value })}>
                      <option value="">— nenhum —</option>
                      {colegas.map((c: { id: number; name: string | null }) => (
                        <option key={c.id} value={c.id}>{c.name ?? `#${c.id}`}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">SEI
                    <input type="text" className={cn(inputCls, "w-28")} value={f.sei} onChange={(e) => set({ sei: e.target.value })} />
                  </label>
                  <Button size="sm" disabled={!f.inicio || !f.fim || criarParcela.isPending}
                    onClick={() => criarParcela.mutate({
                      periodoId: row.periodo.id,
                      dataInicio: f.inicio,
                      dataFim: f.fim,
                      substitutoId: f.substitutoId ? Number(f.substitutoId) : null,
                      seiProtocolo: f.sei || null,
                    }, { onSuccess: () => set({ inicio: "", fim: "", substitutoId: "", sei: "" }) })}>
                    Adicionar parcela
                  </Button>
                </div>
                {((criarParcela.error && criarParcela.variables?.periodoId === row.periodo.id) ||
                  (atualizarParcela.error && row.parcelas.some((p) => p.id === atualizarParcela.variables?.id))) && (
                  <p className="mt-2 text-[11px] text-rose-600">
                    {(criarParcela.variables?.periodoId === row.periodo.id ? criarParcela.error?.message : undefined) ??
                      atualizarParcela.error?.message}
                  </p>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
