"use client";

import { cn } from "@/lib/utils";
import { TIPOS_PROCESSO, type TipoProcesso } from "@/lib/processos/tipos";

const COLOR_CLASSES: Record<string, string> = {
  slate:   "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
  neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-300",
  amber:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  blue:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  rose:    "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  violet:  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  indigo:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

interface Props {
  tipo: string | null | undefined;
  size?: "xs" | "sm";
  className?: string;
}

export function ProcessoTipoBadge({ tipo, size = "xs", className }: Props) {
  const cfg = TIPOS_PROCESSO[(tipo as TipoProcesso) ?? "AP"] ?? TIPOS_PROCESSO.AP;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-medium uppercase tracking-wide whitespace-nowrap",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        COLOR_CLASSES[cfg.color],
        className,
      )}
    >
      {cfg.badge}
    </span>
  );
}
