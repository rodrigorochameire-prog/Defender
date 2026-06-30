import { Users, Mic, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResumoProvaOral } from "@/lib/agenda/depoente-status";

/**
 * Console do modo Prova oral (spec §D): síntese de ação no topo da aba —
 * total / ouvidos / a ouvir e, como sinal de cerceamento (cor = exceção), o nº
 * de depoentes ainda sem ciência. Numerais tabulares para leitura de coluna.
 */
export function DepoimentosConsole({ resumo }: { resumo: ResumoProvaOral }) {
  if (resumo.total === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 px-3 py-2 text-[11px]">
      <Metric icon={Users} label="depoentes" value={resumo.total} strong />
      <Sep />
      <Metric icon={Mic} label="ouvidos" value={resumo.ouvidos} />
      <Sep />
      <Metric icon={Clock} label="a ouvir" value={resumo.aOuvir} />
      {resumo.semCiencia > 0 && (
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 font-semibold whitespace-nowrap">
          <AlertTriangle className="w-3 h-3" aria-hidden />
          <span className="tabular-nums">{resumo.semCiencia}</span> sem ciência
        </span>
      )}
    </div>
  );
}

/** @deprecated Use DepoimentosConsole */
export { DepoimentosConsole as ProvaOralConsole };

function Metric({
  icon: Icon,
  label,
  value,
  strong,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
      <Icon className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" aria-hidden />
      <span className={cn("tabular-nums", strong ? "font-semibold text-foreground/80" : "font-medium")}>
        {value}
      </span>
      <span className="text-neutral-400 dark:text-neutral-500">{label}</span>
    </span>
  );
}

function Sep() {
  return <span aria-hidden className="w-px h-3 bg-neutral-200 dark:bg-neutral-700" />;
}
