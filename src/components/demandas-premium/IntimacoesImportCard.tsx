"use client";

import { useMemo } from "react";
import { DownloadCloud } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { getAtribuicaoHex } from "@/lib/config/atribuicoes";

const SEMANAS = 12;

// Rótulo curto "dd/mm" a partir do YYYY-MM-DD (início da semana) — sem date-fns
// para evitar throw em data inválida (safeFmt na marra).
function labelSemana(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}` : iso;
}

// O ledger guarda o enum (VVD_CAMACARI, …); traduz p/ nome amigável. Fallback
// prettifica qualquer enum desconhecido (sem quebrar).
const ATRIB_LABEL: Record<string, string> = {
  VVD_CAMACARI: "Violência Doméstica",
  JURI_CAMACARI: "Tribunal do Júri",
  EP_CAMACARI: "Execução Penal",
  GRUPO_JURI: "Grupo Especial do Júri",
  SUBSTITUICAO_CRIMINAL: "Substituição Criminal",
  CURADORIA_ESPECIAL: "Curadoria Especial",
  MUTIRAO: "Mutirão",
};
function prettyAtrib(a: string): string {
  return ATRIB_LABEL[a] ?? a.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Série histórica de intimações importadas do PJe (últimas 12 semanas), lida do
 * ledger permanente. Fonte única = PJe (SEEU ainda não tem ledger no schema).
 */
export function IntimacoesImportCard() {
  const { data, isLoading } = trpc.intimacoes.serieSemanal.useQuery({ semanas: SEMANAS });

  const maxSemana = useMemo(
    () => Math.max(1, ...(data?.semanas ?? []).map((s) => s.total)),
    [data],
  );
  const maxAtrib = useMemo(
    () => Math.max(1, ...(data?.porAtribuicao ?? []).map((a) => a.total)),
    [data],
  );

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900">
        <div className="h-4 w-40 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        <div className="mt-4 h-24 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
      </div>
    );
  }

  const total = data?.total ?? 0;
  const serie = data?.semanas ?? [];
  const porAtrib = data?.porAtribuicao ?? [];

  return (
    <div className="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
          <DownloadCloud className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Intimações importadas</h4>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
            últimas {SEMANAS} semanas · fonte PJe
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{total}</p>
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">total histórico</p>
        </div>
      </div>

      {total === 0 ? (
        <p className="mt-4 text-[11px] text-neutral-400 dark:text-neutral-500 text-center py-6">
          Nenhuma intimação registrada no ledger ainda.
        </p>
      ) : (
        <>
          {/* Série semanal — barras CSS (sem dependência de chart) */}
          <div className="mt-4 flex items-end gap-1 h-24">
            {serie.map((s) => {
              const h = Math.round((s.total / maxSemana) * 100);
              return (
                <div key={s.semana} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
                  <div
                    className="w-full rounded-t bg-emerald-500/70 dark:bg-emerald-500/60 hover:bg-emerald-500 transition-colors"
                    style={{ height: `${Math.max(h, 3)}%` }}
                    title={`Semana de ${labelSemana(s.semana)}: ${s.total}`}
                  />
                  <span className="text-[8px] text-neutral-400 dark:text-neutral-600 tabular-nums truncate">
                    {labelSemana(s.semana)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Breakdown por atribuição */}
          {porAtrib.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {porAtrib.slice(0, 5).map((a) => {
                const hex = getAtribuicaoHex(a.atribuicao);
                const w = Math.round((a.total / maxAtrib) * 100);
                return (
                  <div key={a.atribuicao} className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 w-28 truncate shrink-0" title={prettyAtrib(a.atribuicao)}>
                      {prettyAtrib(a.atribuicao)}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: hex }} />
                    </div>
                    <span className="text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400 w-8 text-right shrink-0">
                      {a.total}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
