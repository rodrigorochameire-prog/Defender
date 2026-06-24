import { CheckCircle2, CircleDot, ListTodo, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResumoExecucao } from "@/lib/agenda/resumo-execucao";

/**
 * Console do modo Execução (spec §D): onde o ato está no ciclo — concluído ou em
 * aberto — e o que falta: pendências (atenção âmbar quando > 0; cor = exceção) e
 * gravações disponíveis. As ações finais ficam no rodapé do sheet.
 */
export function ExecucaoConsole({ resumo }: { resumo: ResumoExecucao }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 px-3 py-2 text-[11px]">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-medium",
          resumo.concluida ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500 dark:text-neutral-400"
        )}
      >
        {resumo.concluida ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> : <CircleDot className="w-3.5 h-3.5" aria-hidden />}
        {resumo.concluida ? "Concluída" : "Em aberto"}
      </span>

      <span aria-hidden className="w-px h-3 bg-neutral-200 dark:bg-neutral-700" />

      <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
        <Mic className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" aria-hidden />
        <span className="tabular-nums font-medium">{resumo.gravacoes}</span>
        <span className="text-neutral-400 dark:text-neutral-500">gravações</span>
      </span>

      {resumo.pendencias > 0 && (
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 font-semibold whitespace-nowrap">
          <ListTodo className="w-3 h-3" aria-hidden />
          <span className="tabular-nums">{resumo.pendencias}</span> pendência{resumo.pendencias !== 1 && "s"}
        </span>
      )}
    </div>
  );
}
