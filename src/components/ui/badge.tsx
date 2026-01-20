import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // === PADRÃO (Neutro suave) ===
        default:
          "border-stone-200 bg-stone-50 text-stone-600 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400",
        
        // === SEMÂNTICOS (Outline apenas - NUNCA solid) ===
        danger:
          "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
        warning:
          "border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900",
        info:
          "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
        neutral:
          "border-stone-200 bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700",
        
        // === ESPECIAIS ===
        outline: 
          "border-stone-300 bg-transparent text-stone-600 dark:border-zinc-600 dark:text-zinc-400",
        secondary:
          "border-transparent bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-zinc-400",
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
