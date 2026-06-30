"use client";

import { useMemo, useState } from "react";
import { Banknote, Wallet, Clock, CalendarDays, Plus } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { StatusChip, EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { diariaStatusInfo } from "@/lib/diarias/status-visual";
import { podeTransicionar } from "@/lib/diarias/transicoes";
import { cn } from "@/lib/utils";
import {
  KpiChip,
  CarreiraCard,
  CarreiraField,
  CarreiraListSkeleton,
  ConfirmDeleteButton,
} from "@/components/carreira";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ACAO_LABEL: Record<string, string> = {
  requerida: "Requerer",
  autorizada: "Autorizar",
  paga: "Marcar paga",
  cancelada: "Cancelar",
};

const EMPTY_FORM = {
  destino: "",
  origem: "",
  motivo: "",
  dataInicio: "",
  dataFim: "",
  quantidade: "1",
  valorUnitario: "",
  sei: "",
};

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
      if (d.status === "a_requerer" || d.status === "requerida" || d.status === "autorizada")
        aReceber += d.totalCents;
      if (d.status === "paga" && d.dataInicio.slice(0, 4) === anoAtual) pagoAno += d.totalCents;
      if (d.status === "requerida") pendentes += 1;
    }
    return { aReceber, pagoAno, pendentes, total: data.length };
  }, [data, anoAtual]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <CollapsiblePageHeader title="Diárias" icon={Banknote}>
        <div className="flex flex-wrap items-center gap-2">
          <KpiChip icon={Wallet} label="A receber" value={brl(kpis.aReceber)} />
          <KpiChip icon={Banknote} label={`Pago em ${anoAtual}`} value={brl(kpis.pagoAno)} />
          <KpiChip icon={Clock} label="Pendentes" value={kpis.pendentes} />
          <KpiChip icon={CalendarDays} label="Diárias" value={kpis.total} />
        </div>
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
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
              <CarreiraField label="Destino">
                <Input value={f.destino} onChange={(e) => set({ destino: e.target.value })} />
              </CarreiraField>
              <CarreiraField label="Origem">
                <Input value={f.origem} onChange={(e) => set({ origem: e.target.value })} />
              </CarreiraField>
              <CarreiraField label="Motivo">
                <Input value={f.motivo} onChange={(e) => set({ motivo: e.target.value })} />
              </CarreiraField>
              <CarreiraField label="Início">
                <Input
                  type="date"
                  value={f.dataInicio}
                  onChange={(e) => set({ dataInicio: e.target.value })}
                />
              </CarreiraField>
              <CarreiraField label="Fim">
                <Input
                  type="date"
                  value={f.dataFim}
                  onChange={(e) => set({ dataFim: e.target.value })}
                />
              </CarreiraField>
              <CarreiraField label="Qtd">
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  className="w-20"
                  value={f.quantidade}
                  onChange={(e) => set({ quantidade: e.target.value })}
                />
              </CarreiraField>
              <CarreiraField label="Valor unit. (R$)">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-28"
                  value={f.valorUnitario}
                  onChange={(e) => set({ valorUnitario: e.target.value })}
                />
              </CarreiraField>
              <CarreiraField label="SEI">
                <Input
                  className="w-28"
                  value={f.sei}
                  onChange={(e) => set({ sei: e.target.value })}
                />
              </CarreiraField>
              <div>
                <Button
                  size="sm"
                  disabled={
                    !f.destino || !f.dataInicio || !f.dataFim || !f.valorUnitario || criar.isPending
                  }
                  onClick={() =>
                    criar.mutate(
                      {
                        destino: f.destino,
                        origem: f.origem || null,
                        motivo: f.motivo || null,
                        dataInicio: f.dataInicio,
                        dataFim: f.dataFim,
                        quantidade: Number(f.quantidade),
                        valorUnitarioCents: Math.round(Number(f.valorUnitario) * 100),
                        seiProtocolo: f.sei || null,
                      },
                      {
                        onSuccess: () => {
                          setNovo(false);
                          setF({ ...EMPTY_FORM });
                        },
                      },
                    )
                  }
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}
          {criar.error && (
            <p className="mt-2 text-[11px] text-rose-600">{criar.error.message}</p>
          )}
        </section>

        {/* Lista */}
        {isLoading ? (
          <CarreiraListSkeleton rows={3} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="Nenhuma diária cadastrada"
            description='Clique em "Nova diária" para registrar uma diária de viagem.'
          />
        ) : (
          <section className={cn(CARD_STYLE.base)}>
            <ul className="space-y-2">
              {data.map((d) => (
                <li key={d.id}>
                  <CarreiraCard accent="contraprestacao" className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {d.destino} · {d.dataInicio} – {d.dataFim}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {d.quantidade} × {brl(d.valorUnitarioCents)} ={" "}
                        <span className="font-semibold">{brl(d.totalCents)}</span>
                        {d.seiProtocolo ? ` · SEI ${d.seiProtocolo}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusChip info={diariaStatusInfo(d.status)} />
                      {(["requerida", "autorizada", "paga", "cancelada"] as const)
                        .filter((s) => podeTransicionar(d.status, s))
                        .map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px]"
                            disabled={atualizar.isPending}
                            onClick={() => atualizar.mutate({ id: d.id, status: s })}
                          >
                            {ACAO_LABEL[s]}
                          </Button>
                        ))}
                      <ConfirmDeleteButton
                        onConfirm={() => remover.mutate({ id: d.id })}
                        title="Excluir diária?"
                        description="Remove esta diária definitivamente."
                        disabled={remover.isPending}
                      />
                    </div>
                  </CarreiraCard>
                </li>
              ))}
            </ul>
            {(atualizar.error || remover.error) && (
              <p className="mt-2 text-[11px] text-rose-600">
                {atualizar.error?.message ?? remover.error?.message}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
