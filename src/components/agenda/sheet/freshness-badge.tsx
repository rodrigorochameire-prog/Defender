"use client";

import { cn } from "@/lib/utils";
import { freshnessLabel } from "@/lib/agenda/freshness-label";

const TONE_CLASS = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  neutral: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
} as const;

interface Props {
  analyzedAt?: Date | string | null;
  className?: string;
}

export function FreshnessBadge({ analyzedAt, className }: Props) {
  const f = freshnessLabel(analyzedAt);
  if (!f) return null;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[9px] font-medium tabular-nums",
        TONE_CLASS[f.tone],
        className
      )}
      title={analyzedAt ? new Date(analyzedAt).toLocaleString("pt-BR") : undefined}
    >
      {f.label}
    </span>
  );
}
