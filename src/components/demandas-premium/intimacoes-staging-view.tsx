"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const BADGE: Record<string, string> = {
  nova: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  incerta: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  duplicada: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  ja_importada: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

const BADGE_LABEL: Record<string, string> = {
  nova: "NOVA",
  incerta: "POSSÍVEL DUP",
  duplicada: "DUPLICADA",
  ja_importada: "JÁ IMPORTADA",
};

const fmtData = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? "—"
    : dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

export function IntimacoesStagingView({ jobId }: { jobId: number }) {
  const utils = trpc.useUtils();
  const query = trpc.intimacoes.listStaging.useQuery({ jobId }, { refetchInterval: 0 });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const seeded = useRef(false);
  // Âncora p/ seleção por intervalo (shift+click).
  const lastClicked = useRef<number | null>(null);

  // Realtime: re-fetch when the task row changes (etapa/status).
  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`import-job-${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "claude_code_tasks" },
        (payload) => {
          const row = payload.new as { id?: number } | null;
          if (row?.id === jobId) {
            void utils.intimacoes.listStaging.invalidate({ jobId });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [jobId, utils]);

  // Pre-mark NOVA rows when data first arrives (once only).
  useEffect(() => {
    if (!seeded.current && query.data?.rows?.length) {
      seeded.current = true;
      setSelected(
        new Set(query.data.rows.filter((r) => r.decisao === "nova").map((r) => r.id)),
      );
    }
  }, [query.data]);

  const confirmar = trpc.intimacoes.confirmarImport.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.imported} importadas, ${res.skipped} puladas`);
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const rows = useMemo(() => query.data?.rows ?? [], [query.data]);
  const status = query.data?.status ?? "pending";
  const running = status === "pending" || status === "processing";

  const resumo = useMemo(() => {
    const c: Record<string, number> = { nova: 0, incerta: 0, duplicada: 0, ja_importada: 0 };
    for (const r of rows) c[r.decisao] = (c[r.decisao] ?? 0) + 1;
    return c;
  }, [rows]);

  const grupos = useMemo(() => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) {
      const k = (r.atribuicao as string) ?? "—";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return [...m.entries()];
  }, [rows]);

  // Ordem de renderização achatada (p/ seleção por intervalo entre grupos).
  const orderedRows = useMemo(() => grupos.flatMap(([, lista]) => lista), [grupos]);
  const orderedIds = useMemo(() => orderedRows.map((r) => r.id), [orderedRows]);

  const isSelectable = (decisao: string) =>
    decisao !== "ja_importada" && decisao !== "duplicada";

  const selectableIds = useMemo(
    () => orderedRows.filter((r) => isSelectable(r.decisao)).map((r) => r.id),
    [orderedRows],
  );
  const novaIds = useMemo(
    () => orderedRows.filter((r) => r.decisao === "nova").map((r) => r.id),
    [orderedRows],
  );

  if (query.error) {
    const isNotFound =
      query.error.data?.code === "NOT_FOUND" ||
      query.error.message?.toLowerCase().includes("não encontrado");

    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4 text-center">
          <p className="text-neutral-500 text-sm">
            {isNotFound
              ? "Job não encontrado. O import pode ter sido removido ou o link está incorreto."
              : `Erro ao carregar: ${query.error.message}`}
          </p>
          <Link
            href="/admin/demandas"
            className="text-sm text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
          >
            Voltar para Demandas
          </Link>
        </div>
      </div>
    );
  }

  // Clique numa linha: shift = intervalo (adiciona da âncora até aqui); senão alterna.
  const handleRowClick = (id: number, shiftKey: boolean, disabled: boolean) => {
    if (disabled) return;
    setSelected((prev) => {
      const n = new Set(prev);
      if (shiftKey && lastClicked.current != null) {
        const a = orderedIds.indexOf(lastClicked.current);
        const b = orderedIds.indexOf(id);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) {
            const r = orderedRows[i];
            if (r && isSelectable(r.decisao)) n.add(r.id);
          }
          return n;
        }
      }
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    lastClicked.current = id;
  };

  const setSel = (ids: number[]) => setSelected(new Set(ids));
  const toggleGroup = (lista: typeof rows) => {
    const ids = lista.filter((r) => isSelectable(r.decisao)).map((r) => r.id);
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const n = new Set(prev);
      if (allOn) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  };

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Importação de intimações
        </h1>
        <Link
          href="/admin/demandas"
          className="text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
        >
          ← Voltar
        </Link>
      </div>

      {running && (
        <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
          <span className="animate-pulse text-emerald-500">●</span>
          {query.data?.etapa ?? "Processando…"}
        </div>
      )}

      {/* Summary row */}
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span className="text-neutral-500">Raspadas: {rows.length}</span>
        <span className="text-emerald-700 dark:text-emerald-400">Novas: {resumo.nova}</span>
        <span className="text-amber-700 dark:text-amber-400">Possíveis dup: {resumo.incerta}</span>
        <span className="text-neutral-400">
          Duplicadas: {(resumo.duplicada ?? 0) + (resumo.ja_importada ?? 0)}
        </span>
      </div>

      {/* Toolbar de seleção */}
      {rows.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-neutral-600 dark:text-neutral-300">
            {selected.size} selecionada{selected.size === 1 ? "" : "s"}
          </span>
          <span className="text-neutral-300 dark:text-neutral-700">·</span>
          <button
            onClick={() => setSel(selectableIds)}
            className="rounded-md px-2 py-1 font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
          >
            Selecionar todas ({selectableIds.length})
          </button>
          <button
            onClick={() => setSel(novaIds)}
            className="rounded-md px-2 py-1 font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Só novas ({novaIds.length})
          </button>
          <button
            onClick={() => setSel([])}
            className="rounded-md px-2 py-1 font-medium text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Limpar
          </button>
          <span className="ml-auto text-neutral-400 dark:text-neutral-500 hidden sm:block">
            Dica: <kbd className="rounded border border-neutral-300 dark:border-neutral-700 px-1">Shift</kbd>+clique seleciona um intervalo
          </span>
        </div>
      )}

      {running && rows.length === 0 && (
        <div className="mt-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
          Aguardando resultados da raspagem…
        </div>
      )}
      {!running && rows.length === 0 && (
        <div className="mt-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
          Nenhuma intimação encontrada.
        </div>
      )}

      {/* Grouped review table */}
      {grupos.map(([atrib, lista]) => {
        const groupIds = lista.filter((r) => isSelectable(r.decisao)).map((r) => r.id);
        const groupAll = groupIds.length > 0 && groupIds.every((id) => selected.has(id));
        const groupSome = groupIds.some((id) => selected.has(id));
        return (
          <section key={atrib} className="mt-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {atrib}
            </h2>
            <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm shadow-black/[0.03]">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-900">
                  <tr className="text-left text-xs text-neutral-400 dark:text-neutral-500">
                    <th className="w-8 px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Selecionar grupo ${atrib}`}
                        checked={groupAll}
                        ref={(el) => {
                          if (el) el.indeterminate = groupSome && !groupAll;
                        }}
                        onChange={() => toggleGroup(lista)}
                        className="h-3.5 w-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-2 font-medium">Processo</th>
                    <th className="px-3 py-2 font-medium">Assistido</th>
                    <th className="px-3 py-2 font-medium">Crime</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Expedição</th>
                    <th className="px-3 py-2 font-medium">Ato</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {lista.map((r) => {
                    const disabled = !isSelectable(r.decisao);
                    const checked = selected.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        onClick={(e) => handleRowClick(r.id, e.shiftKey, disabled)}
                        className={`transition-colors select-none ${
                          disabled
                            ? "opacity-50"
                            : "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                        } ${checked ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => {}}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(r.id, e.shiftKey, disabled);
                            }}
                            aria-label={`Selecionar intimação ${r.processoNumero ?? r.id}`}
                            className="h-3.5 w-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                          {r.processoNumero ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">
                          <div className="flex items-center gap-1.5">
                            <span>{r.assistidoParsed ?? r.assistidoNome ?? "—"}</span>
                            {r.isMPU && (
                              <span className="rounded bg-amber-100 dark:bg-amber-950/40 px-1 py-px text-[9px] font-bold text-amber-700 dark:text-amber-400">
                                MPU
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
                          {r.crime ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                          {r.tipoProcesso ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs tabular-nums text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                          {fmtData(r.dataExpedicao as string | Date | null)}
                        </td>
                        <td className="max-w-[12rem] px-3 py-2 truncate text-neutral-700 dark:text-neutral-300">
                          {r.ato ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${BADGE[r.decisao] ?? "bg-neutral-100 text-neutral-500"}`}
                          >
                            {BADGE_LABEL[r.decisao] ?? r.decisao}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {/* Confirm button */}
      <div className="mt-6 flex items-center gap-3">
        <button
          disabled={selected.size === 0 || confirmar.isPending || running}
          onClick={() => confirmar.mutate({ jobId, selectedIds: [...selected] })}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmar.isPending
            ? "Importando…"
            : `Confirmar importação (${selected.size})`}
        </button>
        {!running && allSelected && selectableIds.length > 0 && (
          <span className="text-xs text-neutral-400">todas selecionadas</span>
        )}
        {running && selected.size > 0 && (
          <p className="text-xs text-neutral-400">Aguarde a raspagem terminar para confirmar.</p>
        )}
      </div>
    </div>
  );
}
