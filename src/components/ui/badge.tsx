import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300 ease focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] hover:shadow-[0_2px_6px_0_rgba(0,0,0,0.12)]",
  {
    variants: {
      variant: {
        // Default - Verde primário com alto contraste (texto branco puro)
        default:
          "bg-[hsl(158_60%_32%)] text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.2)] hover:bg-[hsl(158_60%_28%)]",
        // Secondary - Fundo neutro com texto escuro
        secondary:
          "bg-[hsl(158_25%_92%)] text-[hsl(158_35%_22%)] hover:bg-[hsl(158_25%_88%)] border border-[hsl(158_20%_85%)] dark:bg-[hsl(160_20%_18%)] dark:text-[hsl(150_15%_85%)] dark:border-[hsl(160_15%_25%)]",
        // Destructive - Vermelho com bom contraste
        destructive:
          "bg-[hsl(0_70%_92%)] text-[hsl(0_80%_32%)] hover:bg-[hsl(0_70%_88%)] border border-[hsl(0_60%_80%)] dark:bg-[hsl(0_50%_18%)] dark:text-[hsl(0_60%_75%)] dark:border-[hsl(0_40%_28%)]",
        // Outline - Borda visível com texto escuro
        outline: "text-[hsl(160_15%_25%)] dark:text-[hsl(150_10%_85%)] border-2 border-[hsl(158_25%_75%)] dark:border-[hsl(160_15%_30%)] bg-transparent",
        // Success - Verde com alto contraste
        success:
          "bg-[hsl(142_65%_90%)] text-[hsl(142_75%_22%)] border border-[hsl(142_55%_75%)] dark:bg-[hsl(142_50%_18%)] dark:text-[hsl(142_60%_70%)] dark:border-[hsl(142_40%_28%)]",
        // Warning - Âmbar vibrante
        warning:
          "bg-[hsl(45_95%_88%)] text-[hsl(35_90%_20%)] border border-[hsl(45_80%_70%)] dark:bg-[hsl(45_70%_18%)] dark:text-[hsl(45_80%_70%)] dark:border-[hsl(45_50%_30%)]",
        // Info - Azul informativo
        info:
          "bg-[hsl(200_70%_92%)] text-[hsl(200_70%_26%)] border border-[hsl(200_55%_78%)] dark:bg-[hsl(200_50%_18%)] dark:text-[hsl(200_55%_75%)] dark:border-[hsl(200_40%_30%)]",
        // Urgent - Vermelho pulsante para prazos urgentes (texto branco puro)
        urgent:
          "bg-[hsl(0_80%_42%)] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] font-bold border border-[hsl(0_75%_38%)] animate-pulse",
        // Reu Preso - Destaque máximo (texto branco puro)
        reuPreso:
          "bg-gradient-to-r from-[hsl(0_80%_40%)] to-[hsl(0_80%_48%)] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] font-bold shadow-[0_2px_8px_0_hsl(0_75%_45%/0.5)]",
        // Premium - Dourado (texto branco puro)
        premium:
          "bg-gradient-to-r from-[hsl(35_90%_42%)] to-[hsl(40_85%_48%)] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)] font-bold",
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
