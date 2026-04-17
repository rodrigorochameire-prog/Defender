"use client";

import { cn } from "@/lib/utils";

interface Props {
  count: number;
  total: number;
  className?: string;
}

export function CompletudeBadge({ count, total, className }: Props) {
  const completo = count === total;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums",
        completo
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
        className
      )}
    >
      {completo ? "✓ Completo" : `${count}/${total}`}
    </span>
  );
}
