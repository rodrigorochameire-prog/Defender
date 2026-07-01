import { cn } from "@/lib/utils";

/**
 * Standard page container. On mobile it adds horizontal padding and bottom
 * clearance for the fixed bottom nav; on desktop (md+) those are removed.
 */
export function MobilePageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-4 pb-20 md:px-0 md:pb-0", className)}>{children}</div>
  );
}
