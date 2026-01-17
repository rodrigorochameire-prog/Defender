import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium ring-offset-background transition-all duration-250 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-[hsl(158_55%_44%)] to-[hsl(158_55%_38%)] text-white hover:from-[hsl(158_55%_40%)] hover:to-[hsl(158_55%_34%)] hover:shadow-[0_4px_12px_0_hsl(158_55%_40%/0.3)] hover:translate-y-[-1px] shadow-[0_2px_6px_0_hsl(158_55%_40%/0.2)]",
        destructive:
          "bg-gradient-to-b from-[hsl(0_65%_52%)] to-[hsl(0_65%_46%)] text-white hover:from-[hsl(0_65%_48%)] hover:to-[hsl(0_65%_42%)] hover:shadow-[0_4px_12px_0_hsl(0_65%_50%/0.3)] hover:translate-y-[-1px] shadow-[0_2px_6px_0_hsl(0_65%_50%/0.2)]",
        outline:
          "border border-[hsl(155_15%_88%)] dark:border-[hsl(160_12%_18%)] bg-transparent hover:bg-[hsl(155_15%_96%)] dark:hover:bg-[hsl(160_12%_12%)] hover:border-[hsl(158_30%_80%)] dark:hover:border-[hsl(158_20%_25%)] text-[hsl(160_10%_30%)] dark:text-[hsl(150_8%_75%)] hover:translate-y-[-1px]",
        secondary:
          "bg-[hsl(155_15%_95%)] dark:bg-[hsl(160_12%_14%)] text-[hsl(160_10%_30%)] dark:text-[hsl(150_8%_75%)] hover:bg-[hsl(155_18%_92%)] dark:hover:bg-[hsl(160_14%_18%)] hover:translate-y-[-1px]",
        ghost: "hover:bg-[hsl(155_15%_95%)] dark:hover:bg-[hsl(160_12%_12%)] text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_60%)] hover:text-[hsl(160_12%_25%)] dark:hover:text-[hsl(150_8%_80%)]",
        link: "text-[hsl(158_55%_40%)] dark:text-[hsl(158_50%_55%)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-xl px-4 text-[13px]",
        lg: "h-12 rounded-2xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
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
