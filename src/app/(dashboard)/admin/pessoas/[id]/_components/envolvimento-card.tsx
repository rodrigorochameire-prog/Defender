"use client";

import Link from "next/link";
import { Briefcase, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProcessoEnvolvimento } from "@/lib/pessoas/agrupar-envolvimento";

const LADO_LABEL: Record<string, { label: string; cls: string }> = {
  acusacao: {
    label: "acusação",
    cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900",
  },
  defesa: {
    label: "defesa",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  },
  neutro: {
    label: "neutro",
    cls: "bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-900/40 dark:text-neutral-300 dark:border-neutral-700",
  },
};

/**
 * Envolvimento cruzado: lista os processos em que a pessoa aparece, cada um com
 * seus papéis (badge de lado quando houver). Cross-case — mostra o histórico
 * inteiro da pessoa no grafo, não só o processo atual.
 */
export function EnvolvimentoCard({
  envolvimento,
  total,
  isLoading,
}: {
  envolvimento: ProcessoEnvolvimento[];
  total: number;
  isLoading: boolean;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="mb-3 flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-neutral-400" />
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Envolvimento {!isLoading && <span className="text-neutral-400">({total})</span>}
        </h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : envolvimento.length === 0 ? (
        <p className="text-xs italic text-neutral-400">Nenhum processo vinculado.</p>
      ) : (
        <ul className="space-y-2">
          {envolvimento.map((proc) => (
            <li
              key={proc.processoId}
              className="rounded-lg border border-neutral-200 p-2.5 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/admin/processos/${proc.processoId}`}
                    className="inline-flex items-center gap-1 font-mono text-xs font-medium text-neutral-800 hover:text-emerald-700 dark:text-neutral-200 dark:hover:text-emerald-400"
                  >
                    {proc.numeroAutos ?? `#${proc.processoId}`}
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </Link>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-neutral-400">
                    {proc.area && <span>{proc.area}</span>}
                    {proc.fase && <span>· {proc.fase}</span>}
                    {proc.classeProcessual && <span>· {proc.classeProcessual}</span>}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {proc.papeis.map((p) => (
                  <span
                    key={p.participacaoId}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300"
                  >
                    {p.papel.replace(/-/g, " ")}
                    {p.subpapel && <span className="text-neutral-400">· {p.subpapel}</span>}
                    {p.lado && LADO_LABEL[p.lado] && (
                      <span
                        className={`rounded border px-1 py-0.5 text-[9px] font-medium ${LADO_LABEL[p.lado].cls}`}
                      >
                        {LADO_LABEL[p.lado].label}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
