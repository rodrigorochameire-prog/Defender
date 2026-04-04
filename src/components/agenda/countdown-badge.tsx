"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface CountdownBadgeProps {
  eventDate: Date;
}

export function CountdownBadge({ eventDate }: CountdownBadgeProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const isToday =
      eventDate.toDateString() === new Date().toDateString();

    // Only tick every second for today's events; skip polling for future dates
    if (!isToday) return;

    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [eventDate]);

  const diff = eventDate.getTime() - now.getTime();
  const isToday = eventDate.toDateString() === now.toDateString();

  if (!isToday) {
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    if (days < 0) {
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-[10px] px-1.5 py-0.5 font-medium">
          Atrasado {Math.abs(days)}d
        </Badge>
      );
    }
    if (days === 0) {
      // Technically today but toDateString differed — fallback
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px] px-1.5 py-0.5 font-medium">
          Hoje
        </Badge>
      );
    }
    if (days === 1) {
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px] px-1.5 py-0.5 font-medium">
          Amanhã
        </Badge>
      );
    }
    return (
      <Badge className="bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border-0 text-[10px] px-1.5 py-0.5 font-medium">
        Em {days}d
      </Badge>
    );
  }

  // Today
  if (diff < 0) {
    return (
      <Badge className="bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border-0 text-[10px] px-1.5 py-0.5 font-medium animate-pulse">
        Em andamento
      </Badge>
    );
  }

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  // < 1 hour: red + show seconds
  if (diff < 3600000) {
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-[10px] px-1.5 py-0.5 font-medium tabular-nums font-mono">
        {m > 0 ? `${m}min ` : ""}{s}s
      </Badge>
    );
  }

  // < 3 hours: amber
  if (diff < 10800000) {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px] px-1.5 py-0.5 font-medium tabular-nums font-mono">
        {h}h {m}min
      </Badge>
    );
  }

  // >= 3 hours: emerald
  return (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px] px-1.5 py-0.5 font-medium tabular-nums font-mono">
      {h}h {m}min
    </Badge>
  );
}

/** Pulsing red dot shown for events happening in < 1 hour (today only) */
export function UrgencyDot({ eventDate }: { eventDate: Date }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const isToday = eventDate.toDateString() === new Date().toDateString();
    if (!isToday) return;
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, [eventDate]);

  const diff = eventDate.getTime() - now.getTime();
  const isToday = eventDate.toDateString() === now.toDateString();

  if (!isToday || diff <= 0 || diff >= 3600000) return null;

  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0"
      aria-label="Menos de 1 hora"
    />
  );
}
