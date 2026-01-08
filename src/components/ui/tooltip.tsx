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
>(({ className, sideOffset = 4, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Sobrescreve estilos inline aplicados dinamicamente pelo Radix UI
  React.useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    // Função para remover todas as animações e transforms
    const removeAnimations = () => {
      if (content) {
        content.style.setProperty('animation', 'none', 'important');
        content.style.setProperty('transition', 'none', 'important');
        content.style.setProperty('transform', 'none', 'important');
        content.style.setProperty('animation-duration', '0s', 'important');
        content.style.setProperty('transition-duration', '0s', 'important');
        content.style.setProperty('animation-delay', '0s', 'important');
        content.style.setProperty('transition-delay', '0s', 'important');
        content.style.setProperty('will-change', 'auto', 'important');
      }
    };

    // Remove imediatamente
    removeAnimations();

    // Observa mudanças no DOM para remover animações aplicadas dinamicamente
    const observer = new MutationObserver(() => {
      removeAnimations();
    });

    observer.observe(content, {
      attributes: true,
      attributeFilter: ['style', 'data-state', 'class'],
    });

    // Remove também quando o tooltip abre/fecha
    const interval = setInterval(removeAnimations, 16); // ~60fps

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={(node) => {
          // Combina refs
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
          contentRef.current = node;
        }}
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
  );
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

