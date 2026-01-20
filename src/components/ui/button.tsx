import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all duration-250 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - Verde escuro com alto contraste (texto branco puro)
        default: "bg-gradient-to-b from-[hsl(158_64%_32%)] to-[hsl(158_64%_26%)] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.2)] hover:from-[hsl(158_64%_28%)] hover:to-[hsl(158_64%_22%)] hover:shadow-[0_4px_12px_0_hsl(158_55%_30%/0.5)] hover:translate-y-[-1px] shadow-[0_2px_6px_0_hsl(158_55%_30%/0.4)]",
        // Destructive - Vermelho vibrante (texto branco puro)
        destructive:
          "bg-gradient-to-b from-[hsl(0_72%_45%)] to-[hsl(0_72%_38%)] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.2)] hover:from-[hsl(0_72%_40%)] hover:to-[hsl(0_72%_34%)] hover:shadow-[0_4px_12px_0_hsl(0_72%_42%/0.5)] hover:translate-y-[-1px] shadow-[0_2px_6px_0_hsl(0_72%_42%/0.4)]",
        // Outline - Borda visível com texto escuro
        outline:
          "border-2 border-[hsl(158_35%_75%)] dark:border-[hsl(160_20%_25%)] bg-white dark:bg-[hsl(160_10%_10%)] hover:bg-[hsl(158_30%_96%)] dark:hover:bg-[hsl(160_12%_14%)] hover:border-[hsl(158_45%_55%)] dark:hover:border-[hsl(158_30%_40%)] text-[hsl(160_15%_25%)] dark:text-[hsl(150_10%_85%)] hover:translate-y-[-1px]",
        // Secondary - Fundo sólido com texto escuro (alto contraste)
        secondary:
          "bg-[hsl(158_40%_92%)] dark:bg-[hsl(160_20%_16%)] text-[hsl(158_50%_22%)] dark:text-[hsl(150_20%_90%)] hover:bg-[hsl(158_45%_88%)] dark:hover:bg-[hsl(160_22%_20%)] hover:translate-y-[-1px] font-semibold border border-[hsl(158_35%_80%)] dark:border-[hsl(160_18%_25%)]",
        // Ghost - Sutil mas legível
        ghost: "hover:bg-[hsl(158_25%_94%)] dark:hover:bg-[hsl(160_15%_14%)] text-[hsl(160_15%_32%)] dark:text-[hsl(150_10%_75%)] hover:text-[hsl(160_20%_20%)] dark:hover:text-[hsl(150_12%_90%)]",
        // Link - Verde vibrante sublinhado
        link: "text-[hsl(158_65%_30%)] dark:text-[hsl(158_55%_65%)] underline-offset-4 hover:underline font-semibold",
        // Premium - Dourado/Laranja para ações especiais (texto branco puro)
        premium: "bg-gradient-to-b from-[hsl(35_85%_48%)] to-[hsl(35_85%_40%)] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.2)] hover:from-[hsl(35_85%_44%)] hover:to-[hsl(35_85%_36%)] hover:shadow-[0_4px_12px_0_hsl(35_85%_45%/0.5)] hover:translate-y-[-1px] shadow-[0_2px_6px_0_hsl(35_85%_45%/0.4)]",
        // Accent - Para botões de destaque em workspaces (texto branco puro com alto contraste)
        accent: "bg-gradient-to-b from-[hsl(158_60%_36%)] to-[hsl(158_60%_28%)] text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)] hover:from-[hsl(158_60%_32%)] hover:to-[hsl(158_60%_24%)] hover:shadow-[0_4px_14px_0_hsl(158_55%_32%/0.5)] hover:translate-y-[-1px] shadow-[0_3px_8px_0_hsl(158_55%_32%/0.45)] font-bold",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-xl px-4 text-[13px]",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
        xs: "h-8 rounded-lg px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
