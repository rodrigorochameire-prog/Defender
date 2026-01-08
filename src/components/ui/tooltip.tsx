"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-[14px] bg-slate-800 dark:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white shadow-lg",
        "!animate-none !transition-none",
        "data-[state=delayed-open]:opacity-100 data-[state=closed]:opacity-0",
        "[&[data-state=delayed-open]]:!transform-none",
        "[&[data-state=closed]]:!transform-none",
        className
      )}
      style={{
        animation: 'none',
        transition: 'none',
        transform: 'none'
      } as React.CSSProperties}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

