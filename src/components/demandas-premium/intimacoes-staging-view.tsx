"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const BADGE: Record<string, string> = {
  nova: "bg-emerald-100 text-emerald-700",
  incerta: "bg-amber-100 text-amber-700",
  duplicada: "bg-neutral-200 text-neutral-600",
  ja_importada: "bg-neutral-200 text-neutral-600",
};

const BADGE_LABEL: Record<string, string> = {
  nova: "NOVA",
  incerta: "POSSÍVEL DUP",
  duplicada: "DUPLICADA",
  ja_importada: "JÁ IMPORTADA",
};

export function IntimacoesStagingView({ jobId }: { jobId: number }) {
  const utils = trpc.useUtils();
  const query = trpc.intimacoes.listStaging.useQuery({ jobId }, { refetchInterval: 0 });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const seeded = useRef(false);

  // Realtime: re-fetch when the task row changes (etapa/status).
  // postgres_changes can't filter by IN, so we gate inside the callback.
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
        new Set(
          query.data.rows
            .filter((r) => r.decisao === "nova")
            .map((r) => r.id),
        ),
      );
    }
  }, [query.data]);

  const confirmar = trpc.intimacoes.confirmarImport.useMutation({
    onSuccess: (res) => {
      toast.success(`${res.imported} importadas, ${res.skipped} puladas`);
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  // Handle NOT_FOUND error gracefully (missing job)
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

  const rows = query.data?.rows ?? [];
  const status = query.data?.status ?? "pending";
  const running = status === "pending" || status === "processing";

  const resumo = useMemo(() => {
    const c: Record<string, number> = {
      nova: 0,
      incerta: 0,
      duplicada: 0,
      ja_importada: 0,
    };
    for (const r of rows) {
      c[r.decisao] = (c[r.decisao] ?? 0) + 1;
    }
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

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="p-6 max-w-5xl">
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

      {/* Live progress etapa */}
      {running && (
        <div className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
          <span className="animate-pulse text-emerald-500">●</span>
          {query.data?.etapa ?? "Processando…"}
        </div>
      )}

      {/* Summary row */}
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span className="text-neutral-500">Raspadas: {rows.length}</span>
        <span className="text-emerald-700 dark:text-emerald-400">
          Novas: {resumo.nova}
        </span>
        <span className="text-amber-700 dark:text-amber-400">
          Possíveis dup: {resumo.incerta}
        </span>
        <span className="text-neutral-400">
          Duplicadas: {(resumo.duplicada ?? 0) + (resumo.ja_importada ?? 0)}
        </span>
      </div>

      {/* Empty state while job is still processing */}
      {running && rows.length === 0 && (
        <div className="mt-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
          Aguardando resultados da raspagem…
        </div>
      )}

      {/* Grouped review table */}
      {grupos.map(([atrib, lista]) => (
        <section key={atrib} className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {atrib}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900">
                <tr className="text-left text-xs text-neutral-400 dark:text-neutral-500">
                  <th className="w-8 px-3 py-2"></th>
                  <th className="px-3 py-2">Processo</th>
                  <th className="px-3 py-2">Assistido</th>
                  <th className="px-3 py-2">Ato</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {lista.map((r) => {
                  const isDisabled =
                    r.decisao === "ja_importada" || r.decisao === "duplicada";
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        isDisabled
                          ? "opacity-50"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          disabled={isDisabled}
                          onChange={() => toggle(r.id)}
                          className="h-3.5 w-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                        {r.processoNumero ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">
                        {r.assistidoNome ?? "—"}
                      </td>
                      <td className="max-w-xs px-3 py-2 truncate text-neutral-700 dark:text-neutral-300">
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
      ))}

      {/* Confirm button */}
      <div className="mt-6">
        <button
          disabled={selected.size === 0 || confirmar.isPending || running}
          onClick={() =>
            confirmar.mutate({ jobId, selectedIds: [...selected] })
          }
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmar.isPending
            ? "Importando…"
            : `Confirmar importação (${selected.size})`}
        </button>

        {running && selected.size > 0 && (
          <p className="mt-1.5 text-xs text-neutral-400">
            Aguarde a raspagem terminar para confirmar.
          </p>
        )}
      </div>
    </div>
  );
}
