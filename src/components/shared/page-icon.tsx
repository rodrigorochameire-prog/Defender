"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageIconProps {
  icon: LucideIcon;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "primary" | "secondary" | "success" | "fatal" | "muted";
}

/**
 * PageIcon Premium - Ícone de página com visual iOS-inspired
 */
export function PageIcon({ 
  icon: Icon, 
  className, 
  size = "md",
  variant = "default" 
}: PageIconProps) {
  const sizeClasses = {
    sm: "h-10 w-10 rounded-xl",
    md: "h-12 w-12 rounded-2xl",
    lg: "h-14 w-14 rounded-2xl",
  };

  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const variantClasses = {
    default: cn(
      "bg-gradient-to-br from-muted/80 to-muted/60",
      "border border-border/40",
      "[&>svg]:text-muted-foreground"
    ),
    primary: cn(
      "bg-gradient-to-br from-primary to-emerald-600",
      "shadow-lg shadow-primary/25",
      "[&>svg]:text-white [&>svg]:drop-shadow-sm"
    ),
    secondary: cn(
      "bg-gradient-to-br from-slate-700 to-slate-800",
      "shadow-lg shadow-slate-700/25",
      "[&>svg]:text-white [&>svg]:drop-shadow-sm"
    ),
    success: cn(
      "bg-gradient-to-br from-emerald-500 to-green-600",
      "shadow-lg shadow-emerald-500/25",
      "[&>svg]:text-white [&>svg]:drop-shadow-sm"
    ),
    fatal: cn(
      "bg-gradient-to-br from-red-500 to-red-600",
      "shadow-lg shadow-red-500/25",
      "[&>svg]:text-white [&>svg]:drop-shadow-sm"
    ),
    muted: cn(
      "bg-muted",
      "border border-border/50",
      "[&>svg]:text-muted-foreground"
    ),
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center flex-shrink-0",
        "transition-all duration-300",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <Icon 
        className={cn(
          "transition-colors duration-300",
          iconSizes[size]
        )} 
        strokeWidth={2}
      />
    </div>
  );
}

/**
 * FeatureIcon - Para cards de features na landing page
 */
interface FeatureIconProps {
  icon: LucideIcon;
  color?: "red" | "blue" | "purple" | "orange" | "emerald" | "teal" | "green" | "amber";
  className?: string;
}

export function FeatureIcon({ icon: Icon, color = "emerald", className }: FeatureIconProps) {
  const colorClasses = {
    red: "bg-red-100 dark:bg-red-900/30 text-red-600",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600",
    orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600",
    teal: "bg-teal-100 dark:bg-teal-900/30 text-teal-600",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
  };

  return (
    <div className={cn(
      "w-12 h-12 rounded-xl flex items-center justify-center",
      colorClasses[color],
      className
    )}>
      <Icon className="w-6 h-6" />
    </div>
  );
}

/**
 * StatIcon - Para cards de estatísticas
 */
interface StatIconProps {
  icon: LucideIcon;
  variant?: "default" | "highlight" | "warning" | "success";
  className?: string;
}

export function StatIcon({ icon: Icon, variant = "default", className }: StatIconProps) {
  const variantClasses = {
    default: cn(
      "bg-gradient-to-br from-primary/10 to-primary/5",
      "[&>svg]:text-primary"
    ),
    highlight: cn(
      "bg-gradient-to-br from-red-500 to-red-600",
      "shadow-md shadow-red-500/25",
      "[&>svg]:text-white"
    ),
    warning: cn(
      "bg-gradient-to-br from-amber-500 to-orange-500",
      "shadow-md shadow-amber-500/25",
      "[&>svg]:text-white"
    ),
    success: cn(
      "bg-gradient-to-br from-emerald-500 to-green-600",
      "shadow-md shadow-emerald-500/25",
      "[&>svg]:text-white"
    ),
  };

  return (
    <div className={cn(
      "h-10 w-10 rounded-xl flex items-center justify-center",
      "transition-all duration-300",
      variantClasses[variant],
      className
    )}>
      <Icon className="h-5 w-5" />
    </div>
  );
}
