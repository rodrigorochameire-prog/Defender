"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Sun,
  Wifi,
  WifiOff,
  Server,
  Database,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SolarStatusBarProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  vencidas?: number;
}

type StatusLevel = "online" | "warning" | "offline" | "unknown";

interface StatusIndicator {
  label: string;
  level: StatusLevel;
  detail?: string;
  icon: React.ElementType;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<StatusLevel, string> = {
  online: "bg-emerald-500",
  warning: "bg-amber-500",
  offline: "bg-red-500",
  unknown: "bg-zinc-400",
};

const STATUS_TEXT: Record<StatusLevel, string> = {
  online: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  offline: "text-red-600 dark:text-red-400",
  unknown: "text-muted-foreground",
};

function formatSessionAge(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const min = Math.floor(seconds / 60);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? `${m}m` : ""}`;
}

function StatusDot({ level }: { level: StatusLevel }) {
  return (
    <span
      className={cn(
        "w-2 h-2 rounded-full shrink-0",
        STATUS_COLORS[level],
        level === "online" && "animate-[pulse_3s_ease-in-out_infinite]",
      )}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SolarStatusBar({ onRefresh, isRefreshing, vencidas = 0 }: SolarStatusBarProps) {
  const { data: solarStatus, isLoading } = trpc.solar.status.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Derive status indicators
  const indicators: StatusIndicator[] = [];

  // Solar
  if (solarStatus) {
    const sessionAge = solarStatus.session_age_seconds ?? null;
    const sessionMin = sessionAge != null ? Math.floor(sessionAge / 60) : null;
    const solarLevel: StatusLevel = solarStatus.authenticated
      ? sessionMin != null && sessionMin > 30
        ? "warning"
        : "online"
      : "offline";

    indicators.push({
      label: "Solar",
      level: solarLevel,
      detail: solarStatus.authenticated
        ? `sessão: ${formatSessionAge(sessionAge)}`
        : "offline",
      icon: Wifi,
    });

    // SIGAD (inferred from Solar reachability for now)
    indicators.push({
      label: "SIGAD",
      level: solarStatus.solar_reachable ? "online" : "offline",
      detail: solarStatus.solar_reachable ? "online" : "offline",
      icon: Database,
    });

    // Engine
    indicators.push({
      label: "Engine",
      level: solarStatus.configured ? "online" : "offline",
      detail: solarStatus.configured ? "online" : "offline",
      icon: Server,
    });
  } else if (!isLoading) {
    // Error fetching status
    indicators.push(
      { label: "Solar", level: "offline", detail: "sem conexão", icon: WifiOff },
      { label: "SIGAD", level: "unknown", detail: "—", icon: Database },
      { label: "Engine", level: "unknown", detail: "—", icon: Server },
    );
  }

  return (
    <div className="px-4 md:px-6 py-4 bg-card border-b border-border">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title + Status */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
            <Sun className="w-5 h-5 text-amber-500" />
          </div>

          {/* Title + indicators */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-foreground tracking-tight">
                Solar
              </h1>
              {vencidas > 0 && (
                <Badge className="bg-red-600 text-white animate-pulse text-[10px] px-1.5 py-0">
                  {vencidas} vencida{vencidas > 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {/* Status indicators row */}
            <div className="flex items-center gap-4 mt-0.5">
              {isLoading ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Verificando conexão...
                </span>
              ) : (
                indicators.map((ind) => (
                  <div
                    key={ind.label}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <StatusDot level={ind.level} />
                    <span className={cn("font-medium", STATUS_TEXT[ind.level])}>
                      {ind.label}
                    </span>
                    {ind.detail && ind.detail !== ind.label.toLowerCase() && (
                      <span className="text-muted-foreground/50 hidden sm:inline">
                        ({ind.detail})
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {solarStatus && !solarStatus.authenticated && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/20"
              onClick={onRefresh}
            >
              <WifiOff className="h-3 w-3 mr-1" />
              Re-autenticar
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
