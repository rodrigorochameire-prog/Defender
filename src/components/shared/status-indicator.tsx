"use client";

import { cn } from "@/lib/utils";

// ==========================================
// STATUS INDICATOR - Estilo Linear/Attio
// Indicador pulsante para status críticos
// ==========================================

interface StatusIndicatorProps {
  status: "critical" | "urgent" | "warning" | "info" | "success" | "neutral";
  label?: string;
  pulsing?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const statusConfig = {
  critical: {
    dot: "bg-rose-500",
    ring: "bg-rose-400",
    text: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
  },
  urgent: {
    dot: "bg-orange-500",
    ring: "bg-orange-400",
    text: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
  },
  warning: {
    dot: "bg-amber-500",
    ring: "bg-amber-400",
    text: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  info: {
    dot: "bg-blue-500",
    ring: "bg-blue-400",
    text: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  success: {
    dot: "bg-emerald-500",
    ring: "bg-emerald-400",
    text: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  neutral: {
    dot: "bg-zinc-400",
    ring: "bg-zinc-300",
    text: "text-zinc-600 dark:text-zinc-400",
    bg: "bg-zinc-50 dark:bg-zinc-900/30",
  },
};

const sizeConfig = {
  xs: {
    container: "h-2 w-2",
    ping: "h-full w-full",
  },
  sm: {
    container: "h-2.5 w-2.5",
    ping: "h-full w-full",
  },
  md: {
    container: "h-3 w-3",
    ping: "h-full w-full",
  },
};

export function StatusIndicator({
  status,
  label,
  pulsing = false,
  size = "sm",
  className,
}: StatusIndicatorProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {/* Dot com pulse opcional */}
      <span className={cn("relative flex", sizes.container)}>
        {pulsing && (
          <span
            className={cn(
              "animate-ping-slow absolute inline-flex rounded-full opacity-75",
              sizes.ping,
              config.ring
            )}
          />
        )}
        <span
          className={cn(
            "relative inline-flex rounded-full",
            sizes.container,
            config.dot
          )}
        />
      </span>

      {/* Label opcional */}
      {label && (
        <span className={cn("text-sm font-medium", config.text)}>
          {label}
        </span>
      )}
    </div>
  );
}

// ==========================================
// STATUS BADGE - Versão com fundo
// ==========================================

interface StatusBadgeProps {
  status: "critical" | "urgent" | "warning" | "info" | "success" | "neutral";
  label: string;
  pulsing?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  pulsing = false,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold",
        config.bg,
        config.text,
        className
      )}
    >
      <StatusIndicator status={status} pulsing={pulsing} size="xs" />
      {label}
    </span>
  );
}
