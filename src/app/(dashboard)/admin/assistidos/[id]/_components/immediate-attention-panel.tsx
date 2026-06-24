"use client";

import Link from "next/link";
import { ChevronRight, CheckCircle2 } from "lucide-react";
import { TYPO } from "@/lib/config/design-tokens";
import {
  attentionSignals,
  contextualCTA,
  type AssistidoSnapshot,
} from "@/lib/assistidos/state";
import { AttentionSignalChip, ctaHref } from "@/components/ds/attention";

/**
 * Zona "Atenção Imediata" do cockpit do assistido (doutrina §5/§2.3): mostra os
 * sinais críticos priorizados + a melhor próxima ação (contextualCTA), no topo da
 * página — informação antes de ação. Sem pendências → estado calmo de "em ordem".
 */
export function ImmediateAttentionPanel({
  assistidoId,
  snapshot,
}: {
  assistidoId: number;
  snapshot: AssistidoSnapshot;
}) {
  const sinais = attentionSignals(snapshot);
  const cta = contextualCTA(snapshot);

  if (sinais.length === 0) {
    return (
      <section className="flex items-center gap-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/10 ring-1 ring-emerald-200/60 dark:ring-emerald-900/30 px-4 py-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-[13px] text-emerald-700 dark:text-emerald-400">
          Sem pendências imediatas — cadastro e operação em ordem.
        </span>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm px-4 py-3">
      <h2 className={TYPO.label}>Atenção imediata</h2>
      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {sinais.map((s) => (
            <AttentionSignalChip key={s.kind} signal={s} href={ctaHref(s.kind, assistidoId)} />
          ))}
        </div>
        <Link href={ctaHref(cta.kind, assistidoId)} className="shrink-0">
          <button className="w-full sm:w-auto h-9 inline-flex items-center justify-center gap-1.5 px-4 bg-neutral-900 hover:bg-emerald-600 dark:bg-neutral-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer">
            {cta.label}
            <ChevronRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
    </section>
  );
}
