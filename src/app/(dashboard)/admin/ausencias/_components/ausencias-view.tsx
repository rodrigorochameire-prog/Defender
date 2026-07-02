"use client";

import { useMemo, useState } from "react";
import { CalendarOff, CalendarX, CalendarClock, CalendarCheck, Plus } from "lucide-react";
import { GlassHeaderShell } from "@/components/layouts/header/glass-header-shell";
import { StatusChip, EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { ausenciaStatusInfo } from "@/lib/ausencias/status-visual";
import { podeTransicionar } from "@/lib/ausencias/transicoes";
import { LICENCA_MOTIVOS } from "@/lib/ausencias/motivos";
import { cn } from "@/lib/utils";
import {
  KpiChip,
  CarreiraCard,
  CarreiraField,
  CarreiraListSkeleton,
  ConfirmDeleteButton,
} from "@/components/carreira";

// Native selects kept — controlled empty-string sentinel doesn't map cleanly to Radix SelectItem.
const nativeSelectCls =
  "block w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 " +
  "dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100";

const ACAO_LABEL: Record<string, string> = {
  deferida: "Deferir",
  gozada: "Marcar gozada",
  indeferida: "Indeferir",
  cancelada: "Cancelar",
};

type TipoFiltro = "todos" | "licenca" | "outra_ausencia";

type FormState = {
  tipo: "licenca" | "outra_ausencia";
  motivo: string;
  dataInicio: string;
  dataFim: string;
  observacao: string;
  suspensa: boolean;
  interrompida: boolean;
  numeroSolicitacao: string;
  dataPublicacao: string;
};

const FORM_EMPTY: FormState = {
  tipo: "licenca",
  motivo: "",
  dataInicio: "",
  dataFim: "",
  observacao: "",
  suspensa: false,
  interrompida: false,
  numeroSolicitacao: "",
  dataPublicacao: "",
};

export function AusenciasView() {
  const utils = trpc.useUtils();
  const { data = [], isLoading } = trpc.ausencias.listar.useQuery();

  const invalidate = () => utils.ausencias.listar.invalidate();
  const criar = trpc.ausencias.criar.useMutation({ onSuccess: invalidate });
  const atualizar = trpc.ausencias.atualizar.useMutation({ onSuccess: invalidate });
  const remover = trpc.ausencias.remover.useMutation({ onSuccess: invalidate });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_EMPTY);
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");

  // KPIs
  const kpis = useMemo(() => {
    let licencas = 0;
    let outras = 0;
    let solicitadas = 0;
    let emVigor = 0;
    for (const a of data) {
      if (a.tipo === "licenca") licencas += 1;
      if (a.tipo === "outra_ausencia") outras += 1;
      if (a.situacao === "solicitada") solicitadas += 1;
      if (a.situacao === "deferida") emVigor += 1;
    }
    return { licencas, outras, solicitadas, emVigor };
  }, [data]);

  // Filtro cliente
  const lista = useMemo(() => {
    if (tipoFiltro === "todos") return data;
    return data.filter((a) => a.tipo === tipoFiltro);
  }, [data, tipoFiltro]);

  const handleCriar = () => {
    criar.mutate(
      {
        tipo: form.tipo,
        motivo: form.motivo || null,
        dataInicio: form.dataInicio,
        dataFim: form.dataFim,
        observacao: form.observacao || null,
        suspensa: !!form.suspensa,
        interrompida: !!form.interrompida,
        numeroSolicitacao: form.numeroSolicitacao || null,
        dataPublicacao: form.dataPublicacao || null,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setForm(FORM_EMPTY);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <GlassHeaderShell
        title="Ausências"
        icon={CalendarOff}
        stats={
          <div className="flex flex-wrap items-center gap-2">
            <KpiChip icon={CalendarX} label="Licenças" value={kpis.licencas} />
            <KpiChip icon={CalendarOff} label="Outras" value={kpis.outras} />
            <KpiChip icon={CalendarClock} label="Solicitadas" value={kpis.solicitadas} />
            <KpiChip icon={CalendarCheck} label="Em vigor" value={kpis.emVigor} />
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* Cabeçalho + filtro + botão novo */}
        <section className={cn(CARD_STYLE.base)}>
          <div className="flex flex-wrap items-center gap-3 justify-between">
            {/* Filtro de tipo — preserving aria-pressed */}
            <div className="flex items-center gap-1.5">
              {(["todos", "licenca", "outra_ausencia"] as TipoFiltro[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tipoFiltro === t}
                  onClick={() => setTipoFiltro(t)}
                  className={cn(
                    "px-3 py-1 text-xs rounded-full transition-colors",
                    tipoFiltro === t
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {t === "todos" ? "Todos" : t === "licenca" ? "Licenças" : "Outras"}
                </button>
              ))}
            </div>

            <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
              <Plus className="w-4 h-4 mr-1" /> Nova ausência
            </Button>
          </div>

          {/* Formulário de criação */}
          {showForm && (
            <div className="mt-4 border-t border-border pt-4 flex flex-wrap items-end gap-3">
              {/* Tipo — native select kept */}
              <CarreiraField label="Tipo">
                <select
                  className={nativeSelectCls}
                  value={form.tipo}
                  onChange={(e) =>
                    setForm({ ...form, tipo: e.target.value as "licenca" | "outra_ausencia", motivo: "" })
                  }
                >
                  <option value="licenca">Licença</option>
                  <option value="outra_ausencia">Outra ausência</option>
                </select>
              </CarreiraField>

              {/* Motivo — native select for licença, Input for outra_ausencia */}
              <CarreiraField label="Motivo" className="min-w-[220px]">
                {form.tipo === "licenca" ? (
                  <select
                    className={nativeSelectCls}
                    value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  >
                    <option value="">— selecione —</option>
                    {LICENCA_MOTIVOS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    placeholder="Motivo (opcional)"
                    value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                  />
                )}
              </CarreiraField>

              <CarreiraField label="Data início">
                <Input
                  type="date"
                  value={form.dataInicio}
                  onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
                />
              </CarreiraField>

              <CarreiraField label="Data fim">
                <Input
                  type="date"
                  value={form.dataFim}
                  onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
                />
              </CarreiraField>

              <CarreiraField label="Nº solicitação">
                <Input
                  type="text"
                  className="w-32"
                  placeholder="opcional"
                  value={form.numeroSolicitacao}
                  onChange={(e) => setForm({ ...form, numeroSolicitacao: e.target.value })}
                />
              </CarreiraField>

              <CarreiraField label="Data publicação">
                <Input
                  type="date"
                  value={form.dataPublicacao}
                  onChange={(e) => setForm({ ...form, dataPublicacao: e.target.value })}
                />
              </CarreiraField>

              <CarreiraField label="Observação" className="min-w-[180px]">
                <Input
                  type="text"
                  placeholder="opcional"
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                />
              </CarreiraField>

              <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.suspensa}
                  onChange={(e) => setForm({ ...form, suspensa: e.target.checked })}
                />
                Suspensa
              </label>

              <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.interrompida}
                  onChange={(e) => setForm({ ...form, interrompida: e.target.checked })}
                />
                Interrompida
              </label>

              <Button
                size="sm"
                disabled={!form.dataInicio || !form.dataFim || criar.isPending}
                onClick={handleCriar}
              >
                Salvar
              </Button>
            </div>
          )}

          {criar.error && (
            <p className="mt-2 text-[11px] text-rose-600">{criar.error.message}</p>
          )}
        </section>

        {/* Lista */}
        {isLoading ? (
          <CarreiraListSkeleton rows={3} />
        ) : lista.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="Nenhuma ausência encontrada"
            description={
              tipoFiltro !== "todos"
                ? "Tente mudar o filtro de tipo."
                : "Cadastre a primeira ausência usando o botão acima."
            }
          />
        ) : (
          lista.map((a) => {
            const tipoLabel = a.tipo === "licenca" ? "Licença" : "Outra ausência";
            return (
              <CarreiraCard key={a.id} accent="ausencias" className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {/* Coluna principal */}
                  <div className="min-w-0 space-y-1">
                    <div className="text-sm font-semibold truncate">
                      {tipoLabel} · {a.dataInicio} – {a.dataFim} ({a.dias}d)
                    </div>

                    {a.motivo && (
                      <div className={TYPO.caption}>{a.motivo}</div>
                    )}

                    {/* Metadata — SIGA fields preserved exactly */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <StatusChip info={ausenciaStatusInfo(a.situacao)} />

                      {a.suspensa && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                          Suspensa
                        </span>
                      )}

                      {a.interrompida && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                          Interrompida
                        </span>
                      )}

                      {a.numeroSolicitacao && (
                        <span className="text-[11px] text-muted-foreground">
                          nº {a.numeroSolicitacao}
                        </span>
                      )}

                      {a.situacaoSiga && (
                        <span className="text-[11px] text-muted-foreground">
                          SIGA: {a.situacaoSiga}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                    {(["deferida", "gozada", "indeferida", "cancelada"] as const)
                      .filter((s) => podeTransicionar(a.situacao, s))
                      .map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[11px]"
                          disabled={atualizar.isPending}
                          onClick={() => atualizar.mutate({ id: a.id, situacao: s })}
                        >
                          {ACAO_LABEL[s]}
                        </Button>
                      ))}

                    <ConfirmDeleteButton
                      onConfirm={() => remover.mutate({ id: a.id })}
                      title="Excluir ausência?"
                      description="Remove esta ausência definitivamente."
                      disabled={remover.isPending}
                    />
                  </div>
                </div>

                {/* Erro por card: atualizar */}
                {atualizar.error && atualizar.variables?.id === a.id && (
                  <p className="mt-2 text-[11px] text-rose-600">{atualizar.error.message}</p>
                )}
                {/* Erro por card: remover */}
                {remover.error && remover.variables?.id === a.id && (
                  <p className="mt-2 text-[11px] text-rose-600">{remover.error.message}</p>
                )}
              </CarreiraCard>
            );
          })
        )}
      </div>
    </div>
  );
}
