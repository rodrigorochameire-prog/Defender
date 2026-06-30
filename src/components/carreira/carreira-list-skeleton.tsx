import { Skeleton } from "@/components/ui/skeleton";

export function CarreiraListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          data-skeleton-row
          className="rounded-lg border border-neutral-200/80 dark:border-neutral-800/80 p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
