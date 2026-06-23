"use client";

import Link from "next/link";
import { AlertTriangle, ShieldCheck, ChevronRight } from "lucide-react";

/**
 * Card da flag "uso instrumental da LMP" para a Central de Inteligência —
 * DEFENSOR-ONLY. Copy estritamente NÃO-ACUSATÓRIA, espelhada de
 * `src/components/mpu/flag-uso-instrumental-card.tsx`: aponta FATORES cíveis a
 * investigar, nunca afirma falsidade do relato nem rotula a requerente.
 *
 * ⚠️ Jamais incluir em telas/relatórios compartilhados com a vítima ou terceiros.
 */
export interface VvdFlagItem {
  processoId: number;
  processoNumero: string | null;
  requeridoNome: string | null;
  fatores: { rotulo: string; peso: number }[];
}

export function VvdFlagCard({ item }: { item: VvdFlagItem }) {
  return (
    <Link
      href={`/admin/processos/${item.processoId}`}
      prefetch={false}
      className="group block"
    >
      <div className="relative rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                VVD
              </span>
              <span className="text-[11px] font-medium text-amber-600/80 dark:text-amber-400/80">
                MPU · Uso instrumental
              </span>
            </div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Fatores cíveis conectados a esta MPU merecem análise aprofundada
            </p>
            <ul className="mt-2 space-y-1">
              {item.fatores.map((f) => (
                <li
                  key={f.rotulo}
                  className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300"
                >
                  <span className="inline-block h-1 w-1 rounded-full bg-amber-500" />
                  {f.rotulo}
                </li>
              ))}
            </ul>

            {(item.requeridoNome || item.processoNumero) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-amber-700/80 dark:text-amber-300/80">
                {item.requeridoNome && (
                  <span className="truncate font-medium">{item.requeridoNome}</span>
                )}
                {item.requeridoNome && item.processoNumero && (
                  <span className="text-amber-400 dark:text-amber-700">·</span>
                )}
                {item.processoNumero && (
                  <span className="font-mono tabular-nums">{item.processoNumero}</span>
                )}
              </div>
            )}

            <div className="mt-3 flex items-start gap-1.5 rounded border border-amber-200 bg-white/60 px-2.5 py-2 dark:border-amber-900/40 dark:bg-black/20">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-[11px] leading-snug text-neutral-600 dark:text-neutral-400">
                Indicadores contextuais <strong>não comprovam nada</strong> sobre a
                veracidade do relato. A Lei Maria da Penha protege — investigue antes
                de concluir, e nunca rotule a requerente.
              </p>
            </div>
          </div>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-400 transition-colors group-hover:text-amber-600 dark:text-amber-600 dark:group-hover:text-amber-400" />
        </div>
      </div>
    </Link>
  );
}
