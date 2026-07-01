import { cn } from "@/lib/utils";

/**
 * Standard page container. On mobile it adds horizontal padding; on desktop
 * (md+) padding is removed. Bottom-nav clearance is handled globally by the
 * admin layout via pb-16 md:pb-0.
 */
export function MobilePageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-4 md:px-0", className)}>{children}</div>
  );
}
