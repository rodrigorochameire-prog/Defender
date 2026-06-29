"use client";

import { useMemo, useState } from "react";
import { FileText, Hourglass, CalendarCheck, CheckCircle2, Plus } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { StatusChip, EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { pedidoStatusInfo } from "@/lib/pedidos-administrativos/status-visual";
import { podeTransicionar } from "@/lib/pedidos-administrativos/transicoes";
import { cn } from "@/lib/utils";
import {
  KpiChip,
  CarreiraCard,
  CarreiraField,
  CarreiraListSkeleton,
  ConfirmDeleteButton,
} from "@/components/carreira";

// Textareas kept as native — no shadcn Textarea import; styling kept consistent.
const nativeCls =
  "block w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 " +
  "dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100";

const ACAO_LABEL: Record<string, string> = {
  em_analise: "Em análise",
  deferido: "Deferir",
  indeferido: "Indeferir",
  cancelado: "Cancelar",
};

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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <CollapsiblePageHeader title="Pedidos administrativos" icon={FileText}>
        <div className="flex flex-wrap items-center gap-2">
          <KpiChip icon={Hourglass} label="Pendentes" value={kpis.pendentes} />
          <KpiChip icon={CalendarCheck} label="Em análise" value={kpis.emAnalise} />
          <KpiChip icon={CheckCircle2} label="Deferidos" value={kpis.deferidos} />
          <KpiChip icon={FileText} label="Total" value={kpis.total} />
        </div>
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
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
              <CarreiraField label="Assunto *" className="sm:col-span-2 lg:col-span-3">
                <Input
                  type="text"
                  value={form.assunto}
                  onChange={(e) => setForm({ ...form, assunto: e.target.value })}
                />
              </CarreiraField>
              <CarreiraField label="Data do pedido *">
                <Input
                  type="date"
                  value={form.dataPedido}
                  onChange={(e) => setForm({ ...form, dataPedido: e.target.value })}
                />
              </CarreiraField>
              <CarreiraField label="Prazo">
                <Input
                  type="date"
                  value={form.prazo}
                  onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                />
              </CarreiraField>
              <CarreiraField label="Protocolo SEI">
                <Input
                  type="text"
                  className="w-36"
                  value={form.seiProtocolo}
                  onChange={(e) => setForm({ ...form, seiProtocolo: e.target.value })}
                />
              </CarreiraField>
              {/* Textareas kept as native — no shadcn Textarea used in ferias template */}
              <CarreiraField label="Descrição" className="sm:col-span-2 lg:col-span-3">
                <textarea
                  className={cn(nativeCls, "h-16 resize-y")}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </CarreiraField>
              <CarreiraField label="Observação" className="sm:col-span-2 lg:col-span-3">
                <textarea
                  className={cn(nativeCls, "h-16 resize-y")}
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                />
              </CarreiraField>
              <div>
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
            </div>
          )}

          {criar.error && (
            <p className="mt-2 text-[11px] text-rose-600">{criar.error.message}</p>
          )}
        </section>

        {/* List */}
        {isLoading ? (
          <CarreiraListSkeleton rows={3} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum pedido administrativo cadastrado"
            description='Clique em "Novo pedido" para registrar um pedido.'
          />
        ) : (
          data.map((p) => (
            <CarreiraCard key={p.id} accent="administrativo" className="p-4">
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
                  <ConfirmDeleteButton
                    onConfirm={() => remover.mutate({ id: p.id })}
                    title="Excluir pedido?"
                    description="Remove este pedido administrativo definitivamente."
                    disabled={remover.isPending}
                  />
                </div>
              </div>
              {/* Per-card mutation-error scoping preserved exactly */}
              {atualizar.error && atualizar.variables?.id === p.id && (
                <p className="mt-2 text-[11px] text-rose-600">{atualizar.error.message}</p>
              )}
              {remover.error && remover.variables?.id === p.id && (
                <p className="mt-2 text-[11px] text-rose-600">{remover.error.message}</p>
              )}
            </CarreiraCard>
          ))
        )}
      </div>
    </div>
  );
}
