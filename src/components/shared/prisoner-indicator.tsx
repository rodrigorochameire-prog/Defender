"use client";

import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PrisonerIndicatorProps {
  preso: boolean;
  localPrisao?: string | null;
  size?: "xs" | "sm" | "md";
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
};

/**
 * Indicador de Prisão Sutil
 * 
 * Um cadeado vermelho discreto para indicar que o assistido está preso.
 * Usado após o nome, substituindo badges ruidosas.
 */
export function PrisonerIndicator({
  preso,
  localPrisao,
  size = "sm",
  showTooltip = true,
  className,
}: PrisonerIndicatorProps) {
  if (!preso) return null;

  const indicator = (
    <span
      className={cn(
        "inline-flex items-center justify-center flex-shrink-0",
        "text-rose-500 dark:text-rose-400",
        className
      )}
    >
      <Lock className={cn(sizeClasses[size])} />
    </span>
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {indicator}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <div className="text-center">
          <p className="font-medium text-rose-500 text-xs">Preso</p>
          {localPrisao && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {localPrisao}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * StatusPrisionalDot
 * 
 * Um ponto colorido minimalista para indicar status prisional
 * Verde = Solto, Vermelho = Preso
 */
interface StatusPrisionalDotProps {
  preso: boolean;
  pulse?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const dotSizeClasses = {
  xs: "w-1.5 h-1.5",
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
};

export function StatusPrisionalDot({
  preso,
  pulse = false,
  size = "sm",
  className,
}: StatusPrisionalDotProps) {
  return (
    <span className={cn("relative inline-flex", className)}>
      {pulse && preso && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            "bg-rose-400"
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full",
          dotSizeClasses[size],
          preso
            ? "bg-rose-500 dark:bg-rose-400"
            : "bg-emerald-500 dark:bg-emerald-400"
        )}
      />
    </span>
  );
}
