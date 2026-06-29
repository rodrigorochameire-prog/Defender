import type React from "react";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "@/lib/config/design-tokens";

const ACCENT: Record<string, string> = {
  ausencias: "from-amber-400 to-amber-500",
  contraprestacao: "from-emerald-400 to-emerald-500",
  progressao: "from-blue-400 to-blue-500",
  administrativo: "from-violet-400 to-violet-500",
  neutral: "from-neutral-300 to-neutral-400",
};

export function CarreiraCard({
  accent,
  selected,
  onClick,
  className,
  children,
}: {
  accent?: keyof typeof ACCENT;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick!();
              }
            }
          : undefined
      }
      className={cn(
        "relative bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-lg shadow-sm transition-all duration-200",
        interactive &&
          "cursor-pointer hover:shadow-md hover:-translate-y-0.5 " + FOCUS_RING,
        selected &&
          "ring-2 ring-emerald-400/50 dark:ring-emerald-500/40 border-emerald-300 dark:border-emerald-700",
        className,
      )}
    >
      {accent ? (
        <span
          className={cn(
            "absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-gradient-to-r",
            ACCENT[accent],
          )}
        />
      ) : null}
      {children}
    </div>
  );
}
