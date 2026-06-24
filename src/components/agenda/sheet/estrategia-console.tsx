import { Check, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResumoEstrategia } from "@/lib/agenda/resumo-estrategia";

/**
 * Painel de inteligência do modo Estratégia (spec §D): mostra imputação,
 * denúncia, teses e contradições com estado claro — extraído (check neutro,
 * com contagem) ou pendente (tracejado âmbar; cor = exceção: o que falta é o
 * que chama atenção). Cabeçalho com "extraídos/total".
 */
export function EstrategiaConsole({ resumo }: { resumo: ResumoEstrategia }) {
  return (
    <div className="rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
          Prontidão estratégica
        </span>
        <span className="text-[10px] tabular-nums text-neutral-400 dark:text-neutral-500">
          {resumo.extraidos}/{resumo.total} extraídos
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {resumo.itens.map((item) => {
          const extraido = item.status === "extraido";
          return (
            <span
              key={item.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap border",
                extraido
                  ? "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300"
                  : "border-dashed border-amber-300/70 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"
              )}
              title={extraido ? "Extraído" : "Pendente de análise"}
            >
              {extraido ? (
                <Check className="w-3 h-3 text-emerald-500" aria-hidden />
              ) : (
                <CircleDashed className="w-3 h-3" aria-hidden />
              )}
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <span className="tabular-nums text-neutral-400 dark:text-neutral-500">{item.count}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
