import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // === NEUTROS (para informações contextuais) ===
        default:
          "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
        outline: 
          "border-zinc-300 bg-transparent text-zinc-600 dark:border-zinc-600 dark:text-zinc-400",
        muted:
          "border-transparent bg-zinc-100/80 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-500",
        
        // === INFORMATIVOS (sutis, para categorização) ===
        neutral:
          "border-zinc-200 bg-zinc-50 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-zinc-700",
        info:
          "border-zinc-200 bg-zinc-50 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-zinc-700",
        
        // === ESTADOS DE PROGRESSO (sutis) ===
        success:
          "border-zinc-200 bg-zinc-50 text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-zinc-700",
        warning:
          "border-amber-200/60 bg-amber-50/50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/40",
        
        // === CRÍTICOS (cores fortes - usar com parcimônia) ===
        destructive:
          "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800",
        urgent:
          "border-rose-300 bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700 font-semibold",
        reuPreso:
          "border-rose-300 bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700 font-semibold",
        
        // === ESPECIAIS (para destaques funcionais) ===
        primary:
          "border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
        accent:
          "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
