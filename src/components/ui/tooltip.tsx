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
        "[&[data-state]]:!animate-none [&[data-state]]:!transition-none [&[data-state]]:!transform-none",
        "[&[data-state=closed]]:!hidden [&[data-state=closed]]:!opacity-0",
        "[&[data-state=open]]:!opacity-100 [&[data-state=delayed-open]]:!opacity-100",
        className
      )}
      style={{
        animation: 'none !important',
        transition: 'none !important',
        transform: 'none !important',
        animationDuration: '0s !important',
        transitionDuration: '0s !important',
        animationDelay: '0s !important',
        transitionDelay: '0s !important',
        animationFillMode: 'none !important',
        transitionProperty: 'none !important',
        willChange: 'auto !important',
        transformOrigin: 'center center !important'
      } as React.CSSProperties & { 
        animationDuration?: string; 
        transitionDuration?: string;
        animationDelay?: string;
        transitionDelay?: string;
        animationFillMode?: string;
        transitionProperty?: string;
        willChange?: string;
        transformOrigin?: string;
      }}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

