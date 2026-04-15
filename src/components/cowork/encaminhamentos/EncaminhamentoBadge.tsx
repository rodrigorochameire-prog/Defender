import { cn } from "@/lib/utils";
import { TIPO_META, type EncaminhamentoTipo } from "./tipo-colors";

export function EncaminhamentoBadge({
  tipo,
  size = "sm",
  withLabel = true,
}: {
  tipo: EncaminhamentoTipo;
  size?: "xs" | "sm";
  withLabel?: boolean;
}) {
  const m = TIPO_META[tipo];
  const { Icon } = m;
  const sizeClasses =
    size === "xs"
      ? "text-[9px] px-1.5 py-0.5 gap-1"
      : "text-[10px] px-2 py-0.5 gap-1";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-semibold uppercase tracking-wide",
        sizeClasses,
        m.chipBg,
        m.chipText,
      )}
    >
      <Icon className="w-3 h-3" />
      {withLabel && m.label}
    </span>
  );
}
