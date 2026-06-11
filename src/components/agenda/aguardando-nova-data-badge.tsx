import { CalendarClock } from "lucide-react";
import {
  MOTIVO_LABELS,
  type MotivoNaoRealizacao,
} from "@/lib/agenda/parse-anotacao-audiencia";

/**
 * Badge âmbar de pendência: audiência redesignada/suspensa sem nova data
 * (cartório vai designar). Some automaticamente quando a próxima designação
 * do processo é registrada (aplicarDesignacaoAudiencia limpa a flag).
 */
export function AguardandoNovaDataBadge({ motivo }: { motivo?: string | null }) {
  const label = motivo
    ? MOTIVO_LABELS[motivo as MotivoNaoRealizacao] ?? motivo
    : null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
      <CalendarClock className="w-3 h-3" />
      Aguardando nova data{label ? ` — ${label.toLowerCase()}` : ""}
    </span>
  );
}
