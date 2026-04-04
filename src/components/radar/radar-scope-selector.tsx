"use client";

import { MapPin, Building2, Map } from "lucide-react";
import { cn } from "@/lib/utils";

export type RadarScope = "camacari" | "rms" | "salvador";

const SCOPES: { value: RadarScope; label: string; sublabel: string; icon: React.ElementType; color: string }[] = [
  {
    value: "camacari",
    label: "Camaçari",
    sublabel: "Foco operacional",
    icon: MapPin,
    color: "emerald",
  },
  {
    value: "rms",
    label: "RMS",
    sublabel: "Região Metropolitana",
    icon: Map,
    color: "blue",
  },
  {
    value: "salvador",
    label: "Salvador",
    sublabel: "Inteligência",
    icon: Building2,
    color: "purple",
  },
];

const COLOR_MAP = {
  emerald: {
    active: "bg-emerald-500 text-white shadow-sm",
    icon: "text-emerald-200",
    dot: "bg-emerald-400",
  },
  blue: {
    active: "bg-blue-500 text-white shadow-sm",
    icon: "text-blue-200",
    dot: "bg-blue-400",
  },
  purple: {
    active: "bg-purple-500 text-white shadow-sm",
    icon: "text-purple-200",
    dot: "bg-purple-400",
  },
};

interface RadarScopeSelectorProps {
  value: RadarScope;
  onChange: (scope: RadarScope) => void;
  counts?: Partial<Record<RadarScope, number>>;
  fullWidth?: boolean;
}

export function RadarScopeSelector({ value, onChange, counts, fullWidth }: RadarScopeSelectorProps) {
  return (
    <div className={cn(
      "flex items-center gap-0.5 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700",
      fullWidth && "w-full"
    )}>
      {SCOPES.map((scope) => {
        const isActive = value === scope.value;
        const colors = COLOR_MAP[scope.color as keyof typeof COLOR_MAP];
        const Icon = scope.icon;
        const count = counts?.[scope.value];

        return (
          <button
            key={scope.value}
            onClick={() => onChange(scope.value)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
              fullWidth && "flex-1 justify-center",
              isActive
                ? colors.active
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? colors.icon : "opacity-60")} />
            <span className="hidden sm:inline">{scope.label}</span>
            <span className="sm:hidden">{scope.label.split(" ")[0]}</span>
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
