import { cn } from "@/lib/utils";
import { prioridadeCasoInfo } from "@/lib/config/tipologia";

export interface PriorityBadgeProps {
  /** Enum: BAIXA | NORMAL | ALTA | URGENTE | REU_PRESO (tolera caixa). */
  prioridade?: string | null;
  /** Por padrão NORMAL/BAIXA não renderizam (ruído baixo). Força a exibição. */
  showLowPriority?: boolean;
  /** Mostra o ponto indicador antes do rótulo. */
  dot?: boolean;
  className?: string;
}

const LOW = new Set(["NORMAL", "BAIXA"]);

/**
 * Selo de prioridade do caso/ato. Reaproveita `prioridadeCasoInfo` (registry).
 * Réu preso = máxima urgência (rose). Prioridades baixas ficam silenciosas por
 * padrão para não competir visualmente com tempo/tipo do ato.
 */
export function PriorityBadge({
  prioridade,
  showLowPriority = false,
  dot = true,
  className,
}: PriorityBadgeProps) {
  if (!prioridade) return null;
  const norm = prioridade.toUpperCase();
  if (LOW.has(norm) && !showLowPriority) return null;

  const tone = prioridadeCasoInfo(prioridade);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        tone.badge,
        className
      )}
    >
      {dot && <span aria-hidden className={cn("w-1.5 h-1.5 rounded-full shrink-0", tone.dot)} />}
      {tone.label}
    </span>
  );
}
