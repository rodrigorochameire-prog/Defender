import { cn } from "@/lib/utils";
import type { VisualTipo } from "@/lib/config/tipologia";
import { statusAudienciaTipo, statusPreparoInfo } from "@/lib/config/tipologia";

type StatusKind = "audiencia" | "preparo";

export interface StatusChipProps {
  /** Domínio do status — resolve o registry correto a partir de `status`. */
  kind?: StatusKind;
  /** Valor cru do status (tolera variações de caixa/grafia). */
  status?: string | null;
  /** Alternativa direta: passe um VisualTipo já resolvido. */
  info?: VisualTipo;
  /** Mostra o ponto indicador antes do rótulo. */
  dot?: boolean;
  size?: "xs" | "sm";
  className?: string;
}

function resolve(kind: StatusKind | undefined, status: string | null | undefined): VisualTipo {
  if (kind === "preparo") return statusPreparoInfo(status);
  return statusAudienciaTipo(status);
}

/**
 * Pílula única de status da Agenda. Consome `VisualTipo` (registry de tipologia),
 * então status de ato, preparo ou qualquer outro domínio compartilham o mesmo
 * componente. O rótulo sempre comunica o estado — cor é reforço, não dependência.
 */
export function StatusChip({
  kind,
  status,
  info,
  dot = false,
  size = "sm",
  className,
}: StatusChipProps) {
  const tone = info ?? resolve(kind, status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]",
        tone.badge,
        className
      )}
    >
      {dot && (
        <span aria-hidden className={cn("w-1.5 h-1.5 rounded-full shrink-0", tone.dot)} />
      )}
      {tone.label}
    </span>
  );
}
