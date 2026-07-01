"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Sticky action bar for primary page actions on mobile. Sits above the fixed
 * bottom nav (h-16) and respects the safe-area inset. Renders nothing on desktop.
 */
export function MobileActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const isMobile = useIsMobile();
  if (!isMobile) return null;
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-16 z-40 border-t bg-background/95 backdrop-blur-xl",
        "flex items-center gap-2 px-4 py-3",
        "pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
