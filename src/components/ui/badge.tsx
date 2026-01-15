import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 ease focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-[0_1px_2px_0_rgba(0,0,0,0.03)] hover:shadow-[0_2px_4px_0_rgba(0,0,0,0.05)]",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(24_80%_52%)] text-white hover:bg-[hsl(24_80%_48%)] hover:shadow-[0_2px_4px_0_rgba(24,80%,52%,0.2)]",
        secondary:
          "bg-[hsl(220_14%_96%)] text-[hsl(220_16%_42%)] hover:bg-[hsl(220_14%_92%)]",
        destructive:
          "bg-[hsl(0_72%_96%)] text-[hsl(0_72%_42%)] hover:bg-[hsl(0_72%_92%)] shadow-[0_1px_2px_0_rgba(239,68,68,0.1)]",
        outline: "text-foreground border border-border/40",
        success:
          "bg-[hsl(142_76%_96%)] text-[hsl(142_71%_32%)] shadow-[0_1px_2px_0_rgba(34,197,94,0.1)] dark:bg-[hsl(142_71%_45%/0.2)] dark:text-[hsl(142_71%_60%)] hover:shadow-[0_2px_4px_0_rgba(34,197,94,0.15)]",
        warning:
          "bg-[hsl(45_100%_96%)] text-[hsl(45_75%_28%)] shadow-[0_1px_2px_0_rgba(234,179,8,0.1)] dark:bg-[hsl(45_93%_47%/0.2)] dark:text-[hsl(45_85%_60%)] hover:shadow-[0_2px_4px_0_rgba(234,179,8,0.15)]",
        info:
          "bg-[hsl(200_60%_96%)] text-[hsl(200_55%_38%)] shadow-[0_1px_2px_0_rgba(59,130,246,0.1)] dark:bg-[hsl(200_45%_22%/0.3)] dark:text-[hsl(200_50%_65%)] hover:shadow-[0_2px_4px_0_rgba(59,130,246,0.15)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "variant">,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
