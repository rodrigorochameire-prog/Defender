"use client";

import { useMemo, useState } from "react";
import { FileText, Hourglass, CalendarCheck, CheckCircle2, Plus } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { StatusChip, EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { pedidoStatusInfo } from "@/lib/pedidos-administrativos/status-visual";
import { podeTransicionar } from "@/lib/pedidos-administrativos/transicoes";
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
  em_analise: "Em análise",
  deferido: "Deferir",
  indeferido: "Indeferir",
  cancelado: "Cancelar",
};

const inputCls = "block border rounded px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100";

const FORM_EMPTY = {
  assunto: "",
  descricao: "",
  dataPedido: "",
  prazo: "",
  seiProtocolo: "",
  observacao: "",
};

export function PedidosView() {
  const utils = trpc.useUtils();
  const { data = [], isLoading } = trpc.pedidosAdministrativos.listar.useQuery();

  const invalidate = () => utils.pedidosAdministrativos.listar.invalidate();
  const criar = trpc.pedidosAdministrativos.criar.useMutation({
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      setForm(FORM_EMPTY);
    },
  });
  const atualizar = trpc.pedidosAdministrativos.atualizar.useMutation({ onSuccess: invalidate });
  const remover = trpc.pedidosAdministrativos.remover.useMutation({ onSuccess: invalidate });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_EMPTY);

  const kpis = useMemo(
    () => ({
      pendentes: data.filter((p) => p.estado === "solicitado").length,
      emAnalise: data.filter((p) => p.estado === "em_analise").length,
      deferidos: data.filter((p) => p.estado === "deferido").length,
      total: data.length,
    }),
    [data],
  );

  const stats = (
    <div className="flex flex-wrap items-center gap-2">
      <Kpi icon={Hourglass} label="Pendentes" value={kpis.pendentes} />
      <Kpi icon={CalendarCheck} label="Em análise" value={kpis.emAnalise} />
      <Kpi icon={CheckCircle2} label="Deferidos" value={kpis.deferidos} />
      <Kpi icon={FileText} label="Total" value={kpis.total} />
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <CollapsiblePageHeader title="Pedidos administrativos" icon={FileText}>
        {stats}
      </CollapsiblePageHeader>

      <div className="p-4 space-y-4">
        {/* Create form */}
        <section className={cn(CARD_STYLE.base)}>
          <div className="flex items-center justify-between">
            <h2 className={TYPO.h3}>Pedidos</h2>
            <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
              <Plus className="w-4 h-4 mr-1" /> Novo pedido
            </Button>
          </div>

          {showForm && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-xs w-full sm:w-auto">
                Assunto *
                <input
                  type="text"
                  className={cn(inputCls, "w-full sm:w-64 block")}
                  value={form.assunto}
                  onChange={(e) => setForm({ ...form, assunto: e.target.value })}
                />
              </label>
              <label className="text-xs">
                Data do pedido *
                <input
                  type="date"
                  className={inputCls}
                  value={form.dataPedido}
                  onChange={(e) => setForm({ ...form, dataPedido: e.target.value })}
                />
              </label>
              <label className="text-xs">
                Prazo
                <input
                  type="date"
                  className={inputCls}
                  value={form.prazo}
                  onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                />
              </label>
              <label className="text-xs">
                Protocolo SEI
                <input
                  type="text"
                  className={cn(inputCls, "w-36")}
                  value={form.seiProtocolo}
                  onChange={(e) => setForm({ ...form, seiProtocolo: e.target.value })}
                />
              </label>
              <label className="text-xs w-full">
                Descrição
                <textarea
                  className={cn(inputCls, "w-full h-16 resize-y")}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </label>
              <label className="text-xs w-full">
                Observação
                <textarea
                  className={cn(inputCls, "w-full h-16 resize-y")}
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                />
              </label>
              <Button
                size="sm"
                disabled={!form.assunto || !form.dataPedido || criar.isPending}
                onClick={() =>
                  criar.mutate({
                    assunto: form.assunto,
                    descricao: form.descricao || null,
                    dataPedido: form.dataPedido,
                    prazo: form.prazo || null,
                    seiProtocolo: form.seiProtocolo || null,
                    observacao: form.observacao || null,
                  })
                }
              >
                Salvar
              </Button>
            </div>
          )}

          {criar.error && (
            <p className="mt-2 text-[11px] text-rose-600">{criar.error.message}</p>
          )}
        </section>

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : data.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum pedido administrativo cadastrado" />
        ) : (
          data.map((p) => (
            <section key={p.id} className={cn(CARD_STYLE.base)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{p.assunto}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Pedido: {p.dataPedido}
                    {p.prazo ? ` · Prazo: ${p.prazo}` : ""}
                    {p.seiProtocolo ? ` · SEI ${p.seiProtocolo}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <StatusChip info={pedidoStatusInfo(p.estado)} />
                  {(["em_analise", "deferido", "indeferido", "cancelado"] as const)
                    .filter((s) => podeTransicionar(p.estado, s))
                    .map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-[11px]"
                        disabled={atualizar.isPending}
                        onClick={() => atualizar.mutate({ id: p.id, estado: s })}
                      >
                        {ACAO_LABEL[s]}
                      </Button>
                    ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11px] text-rose-600"
                    disabled={remover.isPending}
                    onClick={() => {
                      if (window.confirm("Excluir este pedido?")) {
                        remover.mutate({ id: p.id });
                      }
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
              {atualizar.error && atualizar.variables?.id === p.id && (
                <p className="mt-2 text-[11px] text-rose-600">{atualizar.error.message}</p>
              )}
              {remover.error && remover.variables?.id === p.id && (
                <p className="mt-2 text-[11px] text-rose-600">{remover.error.message}</p>
              )}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
