"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { AlertTriangle, X, ShieldCheck } from "lucide-react";

/**
 * Card da flag "uso instrumental da LMP" — DEFENSOR-ONLY.
 *
 * ⚠️ Jamais incluir em telas/relatórios compartilhados com a vítima ou terceiros.
 * Copy estritamente não-acusatória: aponta FATORES para investigar, nunca afirma
 * falsidade do relato. Só renderiza quando a flag está ATIVA (score ≥ 3) — a
 * ausência de card comunica "nada relevante detectado".
 */
export function FlagUsoInstrumentalCard({ processoId }: { processoId: number }) {
  const [dispensada, setDispensada] = useState(false);
  const { data } = trpc.vvd.getFlagUsoInstrumental.useQuery({ processoId });

  if (!data || !data.ativo || dispensada) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Fatores cíveis conectados a esta MPU merecem análise aprofundada
          </p>
          <ul className="mt-2 space-y-1">
            {data.fatores.map((f) => (
              <li key={f.rotulo} className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                <span className="inline-block h-1 w-1 rounded-full bg-amber-500" />
                {f.rotulo}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-start gap-1.5 rounded border border-amber-200 dark:border-amber-900/40 bg-white/60 dark:bg-black/20 px-2.5 py-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-[11px] leading-snug text-neutral-600 dark:text-neutral-400">
              Indicadores contextuais <strong>não comprovam nada</strong> sobre a veracidade do relato.
              A Lei Maria da Penha protege — investigue antes de concluir, e nunca rotule a requerente.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDispensada(true)}
          title="Dispensar (apenas nesta sessão)"
          className="shrink-0 rounded p-1 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
