"use client";

import { cn } from "@/lib/utils";
import type { DotLevel } from "@/lib/pessoas/compute-dot-level";

interface Props {
  level: DotLevel;
  size?: "xs" | "sm";
  "aria-label"?: string;
  className?: string;
}

const LEVEL_CLASSES: Record<Exclude<DotLevel, "none">, string> = {
  subtle: "bg-neutral-300 dark:bg-neutral-600 opacity-70",
  normal: "bg-neutral-500 dark:bg-neutral-400",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-600 ring-2 ring-rose-100 dark:ring-rose-950/40",
};

const LEVEL_DEFAULT_LABEL: Record<Exclude<DotLevel, "none">, string> = {
  subtle: "Poucas aparições anteriores",
  normal: "Múltiplas aparições anteriores",
  emerald: "Pessoa consistente em múltiplos depoimentos",
  amber: "Contradição registrada em caso anterior",
  red: "Alto valor estratégico",
};

export function IntelDot({ level, size = "sm", ...rest }: Props) {
  if (level === "none") return null;
  const sz = size === "xs" ? "w-[3px] h-[3px]" : "w-1 h-1";
  return (
    <span
      role="img"
      aria-label={rest["aria-label"] ?? LEVEL_DEFAULT_LABEL[level]}
      className={cn(
        "inline-block rounded-full shrink-0",
        sz,
        LEVEL_CLASSES[level],
        rest.className,
      )}
    />
  );
}
