"use client";

import { cn } from "@/lib/utils";
import { REGISTRO_TIPOS, type TipoRegistro } from "./registro-tipo-config";

interface Props {
  tipo: TipoRegistro;
  size?: "sm" | "xs";
  className?: string;
}

export function RegistroTipoChip({ tipo, size = "sm", className }: Props) {
  const cfg = REGISTRO_TIPOS[tipo];
  const Icon = cfg.Icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md font-medium ring-1 ring-inset",
        "bg-white/0 ring-neutral-200 dark:ring-neutral-800",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        className,
      )}
      style={{ color: cfg.color }}
    >
      <Icon className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      <span className="text-neutral-700 dark:text-neutral-300">{cfg.shortLabel}</span>
    </span>
  );
}
