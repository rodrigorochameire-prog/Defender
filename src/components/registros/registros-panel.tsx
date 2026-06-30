"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarPlus, ClipboardList, Inbox } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { RegistroCard, type RegistroCardData } from "./registro-card";
import { RegistroComposer } from "./registro-composer";
import { RegistrosToolbar } from "./registros-toolbar";
import {
  dayLabel,
  splitRegistros,
  type RegistroLike,
} from "./registros-sections";
import { TIPO_KEYS, type TipoRegistro } from "./registro-tipo-config";

export type RegistrosScope = {
  assistidoId?: number;
  processoId?: number;
  demandaId?: number;
  audienciaId?: number;
};

export type RegistrosPanelProps = {
  scope: RegistrosScope; // ≥1 id
  variant?: "drawer" | "page" | "tab";
  tiposPermitidos?: TipoRegistro[];
  tipoDefault?: TipoRegistro;
  tiposPrimarios?: TipoRegistro[];
  emptyHint?: string;
  quickActions?: {
    agendarAudiencia?: () => void;
    adicionarPrazo?: () => void;
  };
  onAbrirAutos?: () => void;
  /**
   * Parent-facing hook fired after a registro is saved (in addition to the
   * internal refetch). Needed by hosts that must refresh sibling data — e.g.
   * the demanda drawer refreshing audiências, since creating a `ciencia` can
   * auto-schedule an audiência as a `registros.create` side-effect.
   */
  onRegistroSaved?: () => void;
};

/**
 * RegistrosPanel — orchestrator (Direction B: composer-first, Pendências
 * pinned, dated Histórico). Refactored from registros-timeline.tsx: it keeps
 * the same two-query data model (filtered list + unfiltered counts), the
 * client-side text filter, and the inline edit/delete semantics, but composes
 * the refined building blocks (composer + toolbar + card + section split).
 */
export function RegistrosPanel({
  scope,
  variant = "page",
  tiposPermitidos,
  tipoDefault,
  tiposPrimarios,
  emptyHint,
  quickActions,
  onAbrirAutos,
  onRegistroSaved,
}: RegistrosPanelProps) {
  const [filtroTipo, setFiltroTipo] = useState<TipoRegistro | null>(null);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"recente" | "antigo">("recente");
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // ── Data: two queries, same shape as registros-timeline ──────────────────
  // (1) Filtered list — drives the rendered sections.
  const listQuery = trpc.registros.list.useQuery({
    ...scope,
    tipo: filtroTipo ?? undefined,
    limit: 200,
  });
  const registrosRaw = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  // (2) Unfiltered list — drives per-tipo counts for the toolbar.
  const countsQuery = trpc.registros.list.useQuery({ ...scope, limit: 200 });
  const registrosTodos = useMemo(
    () => countsQuery.data ?? [],
    [countsQuery.data],
  );

  const refetchBoth = useCallback(() => {
    listQuery.refetch();
    countsQuery.refetch();
  }, [listQuery, countsQuery]);

  const deleteMut = trpc.registros.delete.useMutation({
    onSuccess: refetchBoth,
  });
  const updateMut = trpc.registros.update.useMutation({
    onSuccess: () => {
      setEditandoId(null);
      refetchBoth();
    },
  });

  // ── Client-side text filter (titulo + conteudo), like the timeline ───────
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return registrosRaw;
    return registrosRaw.filter((r) =>
      ((r.titulo || "") + " " + (r.conteudo || "")).toLowerCase().includes(q),
    );
  }, [registrosRaw, busca]);

  // ── Sections (split → pendências pinned + dated histórico) ───────────────
  // The list query returns desc by dataRegistro; splitRegistros re-sorts the
  // histórico newest-day-first internally. `ordem === "antigo"` reverses the
  // day groups (and within each group) to surface the oldest first.
  const { pendencias, historico } = useMemo(() => {
    const split = splitRegistros(filtrados as unknown as RegistroLike[]);
    if (ordem === "antigo") {
      return {
        pendencias: split.pendencias,
        historico: [...split.historico]
          .reverse()
          .map((g) => ({ ...g, registros: [...g.registros].reverse() })),
      };
    }
    return split;
  }, [filtrados, ordem]);

  // ── Per-tipo counts for the toolbar ──────────────────────────────────────
  const tiposComContagem = useMemo(() => {
    const escopo = tiposPermitidos ?? TIPO_KEYS;
    const c = new Map<TipoRegistro, number>();
    registrosTodos.forEach((r) => {
      const t = r.tipo as TipoRegistro;
      c.set(t, (c.get(t) ?? 0) + 1);
    });
    return escopo
      .filter((t) => (c.get(t) ?? 0) > 0)
      .map((tipo) => ({ tipo, count: c.get(tipo) ?? 0 }));
  }, [registrosTodos, tiposPermitidos]);

  const total = registrosTodos.length;
  const temRegistros = total > 0;
  const semResultado = filtrados.length === 0;

  // Inline edit/delete handlers carried over from registros-timeline.
  const onEdit = (id: number) => setEditandoId(id);
  const onDelete = (id: number) => {
    if (confirm("Excluir este registro?")) deleteMut.mutate({ id });
  };

  const renderCard = (r: RegistroCardData, showPrazo: boolean) =>
    editandoId === r.id ? (
      <RegistroInlineEdit
        key={r.id}
        registro={r}
        saving={updateMut.isPending}
        onSave={(titulo, conteudo) =>
          updateMut.mutate({ id: r.id, titulo, conteudo })
        }
        onCancel={() => setEditandoId(null)}
      />
    ) : (
      <RegistroCard
        key={r.id}
        registro={r}
        showPrazo={showPrazo}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

  const gap = variant === "drawer" ? "space-y-3" : "space-y-4";

  return (
    <div className={gap}>
      {/* ── Header: title + toolbar (título omitido no drawer — CollapsibleSection já fornece) ── */}
      {variant === "drawer" ? (
        <RegistrosToolbar
          busca={busca}
          onBusca={setBusca}
          filtroTipo={filtroTipo}
          onFiltroTipo={setFiltroTipo}
          tiposComContagem={tiposComContagem}
          ordem={ordem}
          onOrdem={setOrdem}
        />
      ) : (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">
            REGISTROS{temRegistros && <span className="opacity-60"> · {total}</span>}
          </h3>
          <RegistrosToolbar
            busca={busca}
            onBusca={setBusca}
            filtroTipo={filtroTipo}
            onFiltroTipo={setFiltroTipo}
            tiposComContagem={tiposComContagem}
            ordem={ordem}
            onOrdem={setOrdem}
          />
        </div>
      )}

      {/* ── Composer (only when an assistidoId anchors the scope) ── */}
      {scope.assistidoId != null && (
        <RegistroComposer
          scope={{ ...scope, assistidoId: scope.assistidoId }}
          tipoDefault={tipoDefault}
          tiposPrimarios={tiposPrimarios}
          tiposPermitidos={tiposPermitidos}
          onAbrirAutos={onAbrirAutos}
          onSaved={() => {
            refetchBoth();
            onRegistroSaved?.();
          }}
        />
      )}

      {/* ── Body ── */}
      {!temRegistros ? (
        <EmptyState emptyHint={emptyHint} quickActions={quickActions} />
      ) : semResultado ? (
        <p className="text-[12px] text-neutral-400 dark:text-neutral-500 px-1 py-3">
          Nenhum registro com esse filtro.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Pendências pinned */}
          {pendencias.length > 0 && (
            <section className="space-y-2" aria-label="Pendências">
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-[11px] font-semibold tracking-wide text-amber-600 dark:text-amber-400">
                  PENDÊNCIAS
                </span>
                <span className="text-[11px] text-amber-600/70 dark:text-amber-400/70">
                  · {pendencias.length}
                </span>
              </div>
              <div className="space-y-2">
                {pendencias.map((r) =>
                  renderCard(r as unknown as RegistroCardData, true),
                )}
              </div>
            </section>
          )}

          {/* Histórico dated — timeline */}
          {historico.length > 0 && (
            <div className="relative pl-4">
              {/* Vertical spine */}
              <div className="absolute left-[3px] top-1.5 bottom-1 w-[2px] rounded-full bg-neutral-100 dark:bg-neutral-800" />
              {historico.map((group, gi) => (
                <section
                  key={group.dayKey}
                  className={cn("relative", gi > 0 && "mt-4")}
                  aria-label={dayLabel(group.dayKey)}
                >
                  {/* Date marker */}
                  <div className="flex items-center gap-2 mb-2 -ml-4">
                    <div className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-600 ring-2 ring-white dark:ring-neutral-950 shrink-0 z-10" />
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400 dark:text-neutral-500">
                      {dayLabel(group.dayKey)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {group.registros.map((r) =>
                      renderCard(r as unknown as RegistroCardData, false),
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  emptyHint,
  quickActions,
}: {
  emptyHint?: string;
  quickActions?: RegistrosPanelProps["quickActions"];
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <Inbox className="w-7 h-7 text-neutral-300 dark:text-neutral-600" />
      <p className="text-[13px] text-neutral-400 dark:text-neutral-500">
        {emptyHint ?? "Sem registros ainda."}
      </p>
      {(quickActions?.agendarAudiencia || quickActions?.adicionarPrazo) && (
        <div className="flex items-center gap-2">
          {quickActions?.agendarAudiencia && (
            <button
              type="button"
              onClick={quickActions.agendarAudiencia}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Agendar audiência
            </button>
          )}
          {quickActions?.adicionarPrazo && (
            <button
              type="button"
              onClick={quickActions.adicionarPrazo}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-md text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Adicionar prazo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Editor inline de registro — título + conteúdo, no lugar do card.
 * Carried over from registros-timeline: lets the defensor fix imperfect
 * parsing of a ciência without deleting and recreating the registro.
 */
function RegistroInlineEdit({
  registro,
  saving,
  onSave,
  onCancel,
}: {
  registro: RegistroCardData;
  saving: boolean;
  onSave: (titulo: string, conteudo: string) => void;
  onCancel: () => void;
}) {
  const [titulo, setTitulo] = useState(registro.titulo ?? "");
  const [conteudo, setConteudo] = useState(registro.conteudo ?? "");

  return (
    <div className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-300/80 dark:ring-neutral-700 px-4 py-3 space-y-2">
      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título (opcional)"
        maxLength={120}
        className="w-full bg-transparent text-[13px] font-semibold text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400 placeholder:font-normal"
      />
      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        rows={Math.min(10, Math.max(3, conteudo.split("\n").length))}
        autoFocus
        className="w-full bg-neutral-50 dark:bg-neutral-800/40 rounded-md text-[13px] text-neutral-700 dark:text-neutral-300 leading-relaxed p-2 outline-none border border-transparent focus:border-neutral-300 dark:focus:border-neutral-700 resize-y"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] px-2.5 py-1 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={saving || !conteudo.trim()}
          onClick={() => onSave(titulo.trim(), conteudo.trim())}
          className="text-[11px] px-2.5 py-1 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}
