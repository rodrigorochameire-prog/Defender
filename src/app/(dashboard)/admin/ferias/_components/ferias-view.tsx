"use client";

import { useMemo, useState } from "react";
import { Plane, CalendarClock, PlayCircle, FolderOpen, Plus } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { StatusChip, EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { feriasStatusInfo } from "@/lib/ferias/status-visual";
import { podeTransicionar } from "@/lib/ferias/transicoes";
import { cn } from "@/lib/utils";
import {
  KpiChip,
  CarreiraCard,
  CarreiraField,
  CarreiraListSkeleton,
  ConfirmDeleteButton,
} from "@/components/carreira";

const ACAO_LABEL: Record<string, string> = {
  homologada: "Homologar",
  em_fruicao: "Iniciar fruição",
  concluida: "Concluir",
  cancelada: "Cancelar",
};

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Native select kept (instead of Radix Select) because the controlled value="" for
// "no selection" does not map cleanly to Radix SelectItem without a sentinel string;
// prefer correctness over purity as per task brief.
const nativeSelectCls =
  "block w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 " +
  "dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100";

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
  const [parcelaForm, setParcelaForm] = useState<Record<number, { inicio: string; fim: string; substitutoId: string; sei: string; provimento: string; numeroSolicitacao: string; conversaoPecunia: boolean; valorAbono: string; suspensa: boolean }>>({});

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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <CollapsiblePageHeader
        title="Férias"
        icon={Plane}
        collapsedStats={
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#464649] dark:bg-white/[0.10] text-white/90 tabular-nums">
            {kpis.disponiveis}d disponíveis
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <KpiChip icon={Plane} label="Dias disponíveis" value={kpis.disponiveis} />
          <KpiChip icon={CalendarClock} label="Parcelas programadas" value={kpis.programadas} />
          <KpiChip icon={PlayCircle} label="Em fruição" value={kpis.emFruicao} />
          <KpiChip icon={FolderOpen} label="Períodos abertos" value={kpis.abertos} />
        </div>
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
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
              <CarreiraField label="Início aquisitivo">
                <Input
                  type="date"
                  value={pAq.inicio}
                  onChange={(e) => setPAq({ ...pAq, inicio: e.target.value })}
                />
              </CarreiraField>
              <CarreiraField label="Fim aquisitivo">
                <Input
                  type="date"
                  value={pAq.fim}
                  onChange={(e) => setPAq({ ...pAq, fim: e.target.value })}
                />
              </CarreiraField>
              <CarreiraField label="Dias de direito">
                <Input
                  type="number"
                  className="w-24"
                  value={pAq.dias}
                  onChange={(e) => setPAq({ ...pAq, dias: Number(e.target.value) })}
                />
              </CarreiraField>
              <div>
                <Button
                  size="sm"
                  disabled={!pAq.inicio || !pAq.fim || criarPeriodo.isPending}
                  onClick={() =>
                    criarPeriodo.mutate(
                      { aquisitivoInicio: pAq.inicio, aquisitivoFim: pAq.fim, diasDireito: pAq.dias },
                      { onSuccess: () => { setNovoPeriodo(false); setPAq({ inicio: "", fim: "", dias: 30 }); } },
                    )
                  }
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}
          {criarPeriodo.error && (
            <p className="mt-2 text-[11px] text-rose-600">{criarPeriodo.error.message}</p>
          )}
        </section>

        {/* Lista de períodos */}
        {isLoading ? (
          <CarreiraListSkeleton rows={3} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={Plane}
            title="Nenhum período de férias cadastrado"
            description='Clique em "Novo período" para registrar o período aquisitivo e suas parcelas.'
          />
        ) : (
          data.map((row) => {
            const f = parcelaForm[row.periodo.id] ?? {
              inicio: "",
              fim: "",
              substitutoId: "",
              sei: "",
              provimento: "",
              numeroSolicitacao: "",
              conversaoPecunia: false,
              valorAbono: "",
              suspensa: false,
            };
            const set = (patch: Partial<typeof f>) =>
              setParcelaForm((m) => ({ ...m, [row.periodo.id]: { ...f, ...patch } }));
            const pct =
              row.saldo.direito > 0
                ? Math.max(0, Math.min(100, (row.saldo.disponiveis / row.saldo.direito) * 100))
                : 0;
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
                    <ConfirmDeleteButton
                      onConfirm={() => removerPeriodo.mutate({ id: row.periodo.id })}
                      title="Excluir período?"
                      description="Exclui o período e todas as parcelas vinculadas."
                      disabled={removerPeriodo.isPending}
                    />
                  </div>
                </div>

                <div
                  className="mt-2 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.saldo.disponiveis} de ${row.saldo.direito} dias disponíveis`}
                >
                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>

                {/* Parcelas */}
                <ul className="mt-3 space-y-2">
                  {row.parcelas.length === 0 ? (
                    <li className="py-2">
                      <EmptyState
                        icon={CalendarClock}
                        title="Sem parcelas"
                        description="Adicione uma parcela no formulário abaixo."
                        size="sm"
                      />
                    </li>
                  ) : (
                    row.parcelas.map((p) => (
                      <li key={p.id}>
                        <CarreiraCard accent="ausencias" className="p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {p.ordem}ª parcela · {p.dataInicio} – {p.dataFim} ({p.dias}d)
                            </div>
                            <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-1">
                              <span>
                                {p.substitutoNome ? `Substituto: ${p.substitutoNome}` : "Sem substituto"}
                                {p.seiProtocolo ? ` · SEI ${p.seiProtocolo}` : ""}
                              </span>
                              {p.conversaoPecunia && (
                                <StatusChip
                                  size="xs"
                                  info={{
                                    label: `abono${p.valorAbonoCents != null ? ` ${brl(p.valorAbonoCents)}` : ""}`,
                                    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400",
                                    dot: "bg-sky-500",
                                  }}
                                />
                              )}
                              {p.suspensa && (
                                <StatusChip
                                  size="xs"
                                  info={{
                                    label: "suspensa",
                                    badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
                                    dot: "bg-amber-500",
                                  }}
                                />
                              )}
                              {p.provimento && (
                                <span className="ml-2 text-[10px] text-muted-foreground">
                                  prov. {p.provimento}
                                </span>
                              )}
                              {p.situacaoSiga && (
                                <span className="ml-2 text-[10px] text-muted-foreground">
                                  SIGA: {p.situacaoSiga}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <StatusChip info={feriasStatusInfo(p.status)} />
                            {(["homologada", "em_fruicao", "concluida", "cancelada"] as const)
                              .filter((s) => podeTransicionar(p.status, s))
                              .map((s) => (
                                <Button
                                  key={s}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-[11px]"
                                  disabled={atualizarParcela.isPending}
                                  onClick={() => atualizarParcela.mutate({ id: p.id, status: s })}
                                >
                                  {ACAO_LABEL[s]}
                                </Button>
                              ))}
                            <ConfirmDeleteButton
                              onConfirm={() => removerParcela.mutate({ id: p.id })}
                              title="Excluir parcela?"
                              description="Remove esta parcela de férias definitivamente."
                              disabled={removerParcela.isPending}
                            />
                          </div>
                        </CarreiraCard>
                      </li>
                    ))
                  )}
                </ul>

                {/* Nova parcela */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                  <CarreiraField label="Início">
                    <Input
                      type="date"
                      value={f.inicio}
                      onChange={(e) => set({ inicio: e.target.value })}
                    />
                  </CarreiraField>
                  <CarreiraField label="Fim">
                    <Input
                      type="date"
                      value={f.fim}
                      onChange={(e) => set({ fim: e.target.value })}
                    />
                  </CarreiraField>
                  {/* Substituto: kept as native <select> — see nativeSelectCls comment above */}
                  <CarreiraField label="Substituto">
                    <select
                      className={nativeSelectCls}
                      value={f.substitutoId}
                      onChange={(e) => set({ substitutoId: e.target.value })}
                    >
                      <option value="">— nenhum —</option>
                      {colegas.map((c: { id: number; name: string | null }) => (
                        <option key={c.id} value={c.id}>
                          {c.name ?? `#${c.id}`}
                        </option>
                      ))}
                    </select>
                  </CarreiraField>
                  <CarreiraField label="SEI">
                    <Input
                      type="text"
                      className="w-28"
                      value={f.sei}
                      onChange={(e) => set({ sei: e.target.value })}
                    />
                  </CarreiraField>
                  <CarreiraField label="Provimento">
                    <Input
                      value={f.provimento ?? ""}
                      onChange={(e) => set({ provimento: e.target.value })}
                    />
                  </CarreiraField>
                  <CarreiraField label="Nº Solicitação">
                    <Input
                      value={f.numeroSolicitacao ?? ""}
                      onChange={(e) => set({ numeroSolicitacao: e.target.value })}
                    />
                  </CarreiraField>
                  <label className="col-span-1 sm:col-span-2 lg:col-span-3 text-xs flex items-center gap-1 mt-1">
                    <input
                      type="checkbox"
                      checked={!!f.conversaoPecunia}
                      onChange={(e) => set({ conversaoPecunia: e.target.checked })}
                    />{" "}
                    Converter em pecúnia (abono)
                  </label>
                  {f.conversaoPecunia && (
                    <CarreiraField label="Valor abono (R$)">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-28"
                        value={f.valorAbono ?? ""}
                        onChange={(e) => set({ valorAbono: e.target.value })}
                      />
                    </CarreiraField>
                  )}
                  <label className="col-span-1 sm:col-span-2 lg:col-span-3 text-xs flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={!!f.suspensa}
                      onChange={(e) => set({ suspensa: e.target.checked })}
                    />{" "}
                    Suspensa
                  </label>
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                    <Button
                      size="sm"
                      disabled={!f.inicio || !f.fim || criarParcela.isPending}
                      onClick={() =>
                        criarParcela.mutate(
                          {
                            periodoId: row.periodo.id,
                            dataInicio: f.inicio,
                            dataFim: f.fim,
                            substitutoId: f.substitutoId ? Number(f.substitutoId) : null,
                            seiProtocolo: f.sei || null,
                            provimento: f.provimento || null,
                            numeroSolicitacao: f.numeroSolicitacao || null,
                            conversaoPecunia: !!f.conversaoPecunia,
                            valorAbonoCents:
                              f.conversaoPecunia && f.valorAbono
                                ? Math.round(Number(f.valorAbono) * 100)
                                : null,
                            suspensa: !!f.suspensa,
                          },
                          {
                            onSuccess: () =>
                              set({
                                inicio: "",
                                fim: "",
                                substitutoId: "",
                                sei: "",
                                provimento: "",
                                numeroSolicitacao: "",
                                conversaoPecunia: false,
                                valorAbono: "",
                                suspensa: false,
                              }),
                          },
                        )
                      }
                    >
                      Adicionar parcela
                    </Button>
                  </div>
                </div>
                {((criarParcela.error && criarParcela.variables?.periodoId === row.periodo.id) ||
                  (atualizarParcela.error &&
                    row.parcelas.some((p) => p.id === atualizarParcela.variables?.id))) && (
                  <p className="mt-2 text-[11px] text-rose-600">
                    {(criarParcela.variables?.periodoId === row.periodo.id
                      ? criarParcela.error?.message
                      : undefined) ?? atualizarParcela.error?.message}
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
