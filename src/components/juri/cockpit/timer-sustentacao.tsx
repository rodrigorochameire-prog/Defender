"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Timer, AlertTriangle, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimerSustentacaoProps {
  isDarkMode: boolean;
  faseSelecionada: { id: string; label: string };
  timeLeft: number;
  isRunning: boolean;
  totalTime: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMED_PHASES = ["sustentacao", "replica", "treplica"];

const THRESHOLDS = [
  { seconds: 600, label: "10min", vibrate: null },
  { seconds: 300, label: "5min", vibrate: [200] },
  { seconds: 120, label: "2min", vibrate: [200, 100, 200] },
  { seconds: 30, label: "30s", vibrate: [300, 100, 300, 100, 300] },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const TIME_BANDS = [
  { above: 600, text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500 dark:bg-emerald-400", flash: false, pulse: false },
  { above: 300, text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500 dark:bg-amber-400", flash: false, pulse: false },
  { above: 120, text: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500 dark:bg-orange-400", flash: false, pulse: false },
  { above: 30, text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500 dark:bg-rose-400", flash: false, pulse: true },
  { above: -1, text: "text-rose-700 dark:text-rose-300", bar: "bg-rose-600 dark:bg-rose-400", flash: true, pulse: true },
] as const;

function getTimeColor(timeLeft: number) {
  const band = TIME_BANDS.find((b) => timeLeft > b.above) ?? TIME_BANDS[TIME_BANDS.length - 1];
  return { text: band.text, bar: band.bar, flash: band.flash, pulse: band.pulse };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimerSustentacao({
  isDarkMode,
  faseSelecionada,
  timeLeft,
  isRunning,
  totalTime,
}: TimerSustentacaoProps) {
  const vibratedRef = useRef<Set<number>>(new Set());
  const [flashActive, setFlashActive] = useState(false);

  const isTimedPhase = useMemo(
    () => TIMED_PHASES.some((p) => faseSelecionada.id.includes(p)),
    [faseSelecionada.id],
  );

  const elapsed = totalTime - timeLeft;
  const progress = totalTime > 0 ? Math.min((elapsed / totalTime) * 100, 100) : 0;
  const colors = useMemo(() => getTimeColor(timeLeft), [timeLeft]);

  // Vibrate at threshold crossings
  useEffect(() => {
    if (!isRunning || !isTimedPhase) return;
    for (const t of THRESHOLDS) {
      if (
        t.vibrate &&
        timeLeft <= t.seconds &&
        !vibratedRef.current.has(t.seconds)
      ) {
        vibratedRef.current.add(t.seconds);
        navigator.vibrate?.([...t.vibrate]);
      }
    }
  }, [timeLeft, isRunning, isTimedPhase]);

  // Reset vibrated set when phase changes
  useEffect(() => {
    vibratedRef.current.clear();
  }, [faseSelecionada.id]);

  // Flash effect for critical time
  useEffect(() => {
    if (!colors.flash || !isRunning) {
      setFlashActive(false);
      return;
    }
    const interval = setInterval(() => setFlashActive((v) => !v), 500);
    return () => clearInterval(interval);
  }, [colors.flash, isRunning]);

  if (!isTimedPhase) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-2",
        "border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-900",
        flashActive && "border-rose-400 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40",
        "transition-colors duration-300",
      )}
    >
      {/* Phase label */}
      <div className="flex items-center gap-2 min-w-0">
        <Timer className={cn("h-4 w-4 shrink-0", colors.text)} />
        <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 truncate">
          {faseSelecionada.label}
        </span>
      </div>

      {/* Countdown */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "font-mono text-xl font-bold tabular-nums leading-none",
            colors.text,
            colors.pulse && isRunning && "animate-pulse",
          )}
        >
          {formatTime(timeLeft)}
        </span>
        {!isRunning && (
          <Badge variant="neutral" className="gap-1 text-[10px]">
            <Pause className="h-3 w-3" />
            Pausado
          </Badge>
        )}
        {isRunning && timeLeft <= 120 && (
          <AlertTriangle className={cn("h-4 w-4 shrink-0", colors.text)} />
        )}
      </div>

      {/* Progress bar with threshold markers */}
      <div className="relative flex-1 min-w-[120px] h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-500", colors.bar)}
          style={{ width: `${progress}%` }}
        />
        {THRESHOLDS.map((t) => {
          const markerPos = totalTime > 0 ? ((totalTime - t.seconds) / totalTime) * 100 : 0;
          if (markerPos <= 0 || markerPos >= 100) return null;
          return (
            <div
              key={t.seconds}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${markerPos}%` }}
              title={t.label}
            >
              <div
                className={cn(
                  "h-3 w-1 rounded-full",
                  elapsed >= totalTime - t.seconds
                    ? "bg-white dark:bg-zinc-200"
                    : "bg-zinc-300 dark:bg-zinc-600",
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Elapsed / Total */}
      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
        {formatTime(elapsed)} / {formatTime(totalTime)}
      </span>
    </div>
  );
}
