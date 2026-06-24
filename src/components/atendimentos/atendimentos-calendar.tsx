"use client";

// Visualização em Agenda (mês) da pauta de atendimentos — grade mensal enxuta
// + painel do dia selecionado. Escopo: só atendimentos (não audiências). Cada
// item abre o sheet de detalhe; dia vazio dispara "novo" com a data prefilada.
// Cores por área (areaHex); pendentes em âmbar. Distinta da /admin/agenda, que
// consolida audiências + atendimentos.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ListPlus,
  Loader2,
  Plus,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { type AtendimentoListItem } from "./config";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";
import { chaveDia, isPendente } from "./agenda-helpers";
import { AtendimentoStatusBadge, ReadinessBadge, MetadataLine } from "./atendimento-badges";

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function AtendimentosCalendar({
  itens,
  onOpen,
  onNovoNoDia,
}: {
  itens: AtendimentoListItem[];
  onOpen: (a: AtendimentoListItem) => void;
  onNovoNoDia?: (dia: Date) => void;
}) {
  const [mesAtual, setMesAtual] = useState(() => new Date());
  const [diaSel, setDiaSel] = useState(() => new Date());

  // Índice dia(yyyy-MM-dd) → atendimentos, ordenados por horário.
  const porDia = useMemo(() => {
    const mapa = new Map<string, AtendimentoListItem[]>();
    for (const a of itens) {
      const k = chaveDia(new Date(a.dataRegistro));
      const lista = mapa.get(k) ?? [];
      lista.push(a);
      mapa.set(k, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort((x, y) => new Date(x.dataRegistro).getTime() - new Date(y.dataRegistro).getTime());
    }
    return mapa;
  }, [itens]);

  const semanas = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesAtual), { weekStartsOn: 0 });
    const fim = endOfWeek(endOfMonth(mesAtual), { weekStartsOn: 0 });
    const linhas: Date[][] = [];
    let cursor = inicio;
    while (cursor <= fim) {
      const semana: Date[] = [];
      for (let i = 0; i < 7; i++) {
        semana.push(cursor);
        cursor = addDays(cursor, 1);
      }
      linhas.push(semana);
    }
    return linhas;
  }, [mesAtual]);

  const itensDia = (d: Date) => porDia.get(chaveDia(d)) ?? [];
  const selecionados = itensDia(diaSel);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
      {/* ── Calendário ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
        {/* Navegação do mês */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
          <button
            onClick={() => setMesAtual((m) => subMonths(m, 1))}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-baseline gap-1">
            <h2 className="text-sm font-semibold text-foreground/90 capitalize leading-none">
              {format(mesAtual, "MMMM", { locale: ptBR })}
            </h2>
            <span className="text-[11px] text-muted-foreground tabular-nums">{format(mesAtual, "yyyy")}</span>
          </div>
          <button
            onClick={() => setMesAtual((m) => addMonths(m, 1))}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const hoje = new Date();
              setMesAtual(hoje);
              setDiaSel(hoje);
            }}
            className="h-7 px-2 text-[11px] rounded-md text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Hoje
          </button>
        </div>

        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-neutral-100 dark:border-neutral-800">
          {SEMANA.map((d) => (
            <div key={d} className="py-2 text-center text-[9px] font-bold uppercase tracking-wider text-neutral-400">
              {d}
            </div>
          ))}
        </div>

        {/* Grade */}
        <div className="grid" style={{ gridTemplateRows: `repeat(${semanas.length}, minmax(0, 1fr))` }}>
          {semanas.map((semana, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {semana.map((dia, di) => {
                const doMes = isSameMonth(dia, mesAtual);
                const hoje = isToday(dia);
                const sel = isSameDay(dia, diaSel);
                const lista = itensDia(dia);
                return (
                  <button
                    key={di}
                    onClick={() => {
                      setDiaSel(dia);
                      if (lista.length === 0 && doMes) onNovoNoDia?.(dia);
                    }}
                    className={cn(
                      "group relative min-h-[78px] sm:min-h-[104px] p-1 sm:p-1.5 flex flex-col text-left border-r border-b border-neutral-100/70 dark:border-neutral-800/50 transition-colors cursor-pointer outline-none",
                      doMes ? "bg-white dark:bg-neutral-900" : "bg-neutral-50/40 dark:bg-neutral-900/30",
                      sel && "ring-2 ring-inset ring-emerald-400/50",
                      !sel && "hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px] sm:text-xs w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0",
                        hoje
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/40 font-semibold"
                          : doMes
                            ? lista.length > 0
                              ? "text-foreground/80 font-semibold"
                              : "text-muted-foreground"
                            : "text-neutral-300/70 dark:text-neutral-600",
                      )}
                    >
                      {format(dia, "d")}
                    </span>

                    <div
                      className="mt-1 space-y-0.5 flex-1 min-h-0 overflow-hidden"
                      style={{
                        maskImage: "linear-gradient(to bottom, black calc(100% - 8px), transparent)",
                        WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 8px), transparent)",
                      }}
                    >
                      {lista.slice(0, 3).map((a) => {
                        const cor = isPendente(a)
                          ? "#f59e0b"
                          : getAtribuicaoColors(a.processo?.atribuicao || a.processo?.area || a.area || null).color;
                        const cancelado = a.status === "cancelado";
                        return (
                          <span
                            key={a.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpen(a);
                            }}
                            className={cn(
                              "flex items-center gap-1 rounded px-1 py-px bg-neutral-50/70 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
                              cancelado && "opacity-40",
                            )}
                          >
                            <span className="w-[2px] self-stretch rounded-full shrink-0" style={{ backgroundColor: cor }} />
                            <span className="text-[9px] font-bold tabular-nums shrink-0" style={{ color: cor }}>
                              {format(new Date(a.dataRegistro), "HH:mm")}
                            </span>
                            <span className="hidden sm:inline text-[9px] text-neutral-600 dark:text-neutral-300 truncate">
                              {a.assistido?.nome ?? "—"}
                            </span>
                          </span>
                        );
                      })}
                    </div>

                    {lista.length > 3 && (
                      <span className="text-[9px] font-medium text-muted-foreground/80 mt-0.5">
                        +{lista.length - 3} mais
                      </span>
                    )}

                    {doMes && lista.length === 0 && onNovoNoDia && (
                      <Plus className="absolute right-1.5 bottom-1.5 w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Painel do dia selecionado ──────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm lg:sticky lg:top-3">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
              {format(diaSel, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-sm font-semibold text-foreground/90 capitalize">
              {format(diaSel, "d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {selecionados.length} atend.
          </span>
        </div>

        <div className="p-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
          {selecionados.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-muted-foreground">Nenhum atendimento neste dia.</p>
              {onNovoNoDia && (
                <button
                  onClick={() => onNovoNoDia(diaSel)}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Agendar
                </button>
              )}
            </div>
          ) : (
            selecionados.map((a) => <PainelItem key={a.id} a={a} onClick={() => onOpen(a)} />)
          )}
        </div>
      </div>
    </div>
  );
}

function PainelItem({ a, onClick }: { a: AtendimentoListItem; onClick: () => void }) {
  // Área/cor derivam da atribuição do processo vinculado (cai no campo do
  // atendimento só quando não há processo).
  const areaKey = a.processo?.atribuicao || a.processo?.area || a.area || null;
  const areaColors = getAtribuicaoColors(areaKey);
  const pendente = isPendente(a);
  const cancelado = a.status === "cancelado";

  return (
    // role=button (não <button>) para permitir controles interativos aninhados
    // (copiável + ações rápidas) sem botões dentro de botão.
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group w-full text-left rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 pl-2.5 pr-2 py-2 flex items-start gap-2.5 hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50",
        cancelado && "opacity-55",
      )}
    >
      <span className="w-[3px] self-stretch rounded-full shrink-0" style={{ backgroundColor: pendente ? "#f59e0b" : areaColors.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold text-foreground/90">
            {format(new Date(a.dataRegistro), "HH:mm")}
          </span>
          <AtendimentoStatusBadge
            status={a.status}
            dataRegistro={a.dataRegistro}
            showIcon={false}
            className="text-[9px] px-1"
          />
          {/* Ações rápidas — surgem no hover do item, sem disparar o onClick */}
          <PainelQuickAcoes a={a} />
        </div>
        <p className={cn("text-[12px] font-semibold text-foreground/90 truncate mt-0.5", cancelado && "line-through")}>
          {a.assistido?.nome ?? "Assistido não identificado"}
        </p>
        {/* Processo vinculado — copiável, mesmo padrão da Lista/Cards */}
        {a.processo?.numeroAutos && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard?.writeText(a.processo!.numeroAutos!);
              toast.success("Nº do processo copiado");
            }}
            className="font-mono inline-flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer max-w-full"
            title="Processo vinculado — clique para copiar o nº"
            aria-label={`Copiar processo ${a.processo.numeroAutos}`}
          >
            <Scale className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{a.processo.numeroAutos}</span>
            <Copy className="w-2.5 h-2.5 opacity-40 shrink-0" />
          </button>
        )}
        <div className="flex items-center gap-x-2 gap-y-0.5 mt-1 flex-wrap">
          <MetadataLine
            area={a.area}
            subtipo={a.subtipo}
            areaLabel={areaKey ? areaColors.label : null}
            className="text-[10px]"
          />
          <ReadinessBadge dossieAtendimento={a.dossieAtendimento} className="text-[10px]" />
        </div>
      </div>
    </div>
  );
}

// ─── Ações rápidas do painel do dia — cluster no hover, sem abrir o sheet ────

function PainelQuickAcoes({ a }: { a: AtendimentoListItem }) {
  const utils = trpc.useUtils();
  const agendado = a.status === "agendado";
  const assistidoId = a.assistido?.id ?? a.assistidoId;

  const marcarRealizado = trpc.registros.update.useMutation({
    onSuccess: () => {
      utils.registros.listAtendimentos.invalidate();
      utils.registros.atendimentosKpis.invalidate();
      utils.registros.listAgendados.invalidate();
      toast.success("Atendimento marcado como realizado");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  return (
    <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      {agendado && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            marcarRealizado.mutate({ id: a.id, status: "realizado" });
          }}
          disabled={marcarRealizado.isPending}
          title="Marcar realizado"
          aria-label="Marcar realizado"
          className="w-5 h-5 rounded-md inline-flex items-center justify-center text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
        >
          {marcarRealizado.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3" />
          )}
        </button>
      )}
      <Link
        href={`/admin/demandas/nova?assistidoId=${assistidoId}`}
        onClick={(e) => e.stopPropagation()}
        title="Gerar demanda"
        aria-label="Gerar demanda"
        className="w-5 h-5 rounded-md inline-flex items-center justify-center text-neutral-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:text-sky-400 dark:hover:bg-sky-900/20 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
      >
        <ListPlus className="w-3 h-3" />
      </Link>
    </div>
  );
}
