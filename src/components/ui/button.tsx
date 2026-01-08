import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-sm font-semibold ring-offset-background transition-all duration-300 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_4px_8px_0_rgba(24,80%,52%,0.2)] hover:translate-y-[-1px] shadow-[0_2px_4px_0_rgba(24,80%,52%,0.15)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-[0_4px_8px_0_rgba(239,68,68,0.2)] hover:translate-y-[-1px] shadow-[0_2px_4px_0_rgba(239,68,68,0.15)]",
        outline:
          "border border-border/40 bg-background hover:bg-accent hover:text-accent-foreground hover:shadow-[0_2px_4px_0_rgba(0,0,0,0.04)] hover:translate-y-[-1px]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-[0_2px_4px_0_rgba(0,0,0,0.04)] hover:translate-y-[-1px]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-[14px] px-3",
        lg: "h-11 rounded-[14px] px-8",
        icon: "h-10 w-10 rounded-[14px]",
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
