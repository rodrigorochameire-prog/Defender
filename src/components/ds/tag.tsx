import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Badge unificado do app — uma única forma para todos os selos (tipo, análise,
// autos, contagem, grau, etc.). Tons semânticos disciplinados.
export const TAG_TONE = {
  neutral: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
  accent: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
  warn: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400",
  danger: "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400",
} as const;

export type TagTone = keyof typeof TAG_TONE;

export function Tag({
  tone = "neutral",
  className,
  children,
}: {
  tone?: TagTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0", TAG_TONE[tone], className)}>
      {children}
    </span>
  );
}
