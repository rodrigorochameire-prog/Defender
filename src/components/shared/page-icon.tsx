"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageIconProps {
  icon: LucideIcon;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Ícone de página - sóbrio, minimalista e elegante
 */
export function PageIcon({ icon: Icon, className, size = "md" }: PageIconProps) {
  const sizeClasses = {
    sm: "h-9 w-9 rounded-lg",
    md: "h-10 w-10 rounded-xl",
    lg: "h-11 w-11 rounded-xl",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-[18px] w-[18px]",
    lg: "h-5 w-5",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center flex-shrink-0",
        "bg-muted/80 dark:bg-muted/50",
        "border border-border/40",
        sizeClasses[size],
        className
      )}
    >
      <Icon 
        className={cn(
          "text-muted-foreground",
          iconSizes[size]
        )} 
        strokeWidth={1.5}
      />
    </div>
  );
}
