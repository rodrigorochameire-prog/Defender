"use client";

import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface BatchProgressBarProps {
  total: number;
  completed: number;
  failed: number;
  label?: string;
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function BatchProgressBar({
  total,
  completed,
  failed,
  label,
  isActive,
}: BatchProgressBarProps) {
  const processed = completed + failed;
  const isComplete = total > 0 && processed >= total;
  const hasFailures = failed > 0;
  const progressPercent = total > 0 ? Math.round((processed / total) * 100) : 0;

  const summary = useMemo(() => {
    if (isComplete && !hasFailures) return "success" as const;
    if (isComplete && hasFailures) return "partial" as const;
    return "running" as const;
  }, [isComplete, hasFailures]);

  // Don't render if there's nothing to show
  if (total <= 0) return null;

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg px-4 py-3",
        "transition-all duration-300",
        isActive && !isComplete && "animate-pulse",
      )}
    >
      {/* Header row: label + counter */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Status icon */}
          {isComplete ? (
            hasFailures ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            )
          ) : (
            isActive && (
              <Loader2 className="h-4 w-4 shrink-0 text-emerald-500 animate-spin" />
            )
          )}

          {/* Label */}
          {label && (
            <span className="text-xs font-medium text-foreground/80 truncate">
              {label}
            </span>
          )}
        </div>

        {/* Counter */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {completed}/{total} concluído{completed !== 1 ? "s" : ""}
          </span>
          {hasFailures && (
            <span className="text-xs text-rose-500 dark:text-rose-400 tabular-nums">
              {failed} falha{failed !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <Progress
        value={progressPercent}
        className={cn(
          "h-2 transition-all duration-500",
          hasFailures
            ? "bg-rose-100 dark:bg-rose-950/30 [&>div]:bg-rose-500 dark:[&>div]:bg-rose-400"
            : "bg-emerald-100 dark:bg-emerald-950/30 [&>div]:bg-emerald-500 dark:[&>div]:bg-emerald-400",
        )}
      />

      {/* Completion summary */}
      {isComplete && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1.5 text-xs transition-opacity duration-300",
            summary === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400",
          )}
        >
          {summary === "success" ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                Concluido com sucesso — {completed}{" "}
                {completed === 1 ? "item processado" : "itens processados"}
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                Concluido com {failed} falha{failed !== 1 ? "s" : ""} — {completed} de{" "}
                {total} {completed === 1 ? "processado" : "processados"}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
