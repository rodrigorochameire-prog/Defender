import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DemandasLoading() {
  return (
    <div className="w-full min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Compact Header — Tabs + Toolbar */}
      <div className="px-3 sm:px-5 md:px-8 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tabs (icon-only) */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Skeleton className="h-7 w-20 rounded-md" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-md" />
            ))}
          </div>
          {/* Counters */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Skeleton className="h-5 w-10 rounded-md" />
            <Skeleton className="h-5 w-8 rounded-md" />
          </div>
          {/* Spacer */}
          <div className="flex-1 min-w-0" />
          {/* Right: action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-lg" />
            ))}
            <Skeleton className="h-7 w-7 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-5 md:p-8 space-y-4">
        {/* Stats Ribbon (5 inline metrics) */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 text-xs overflow-x-auto scrollbar-none shadow-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-3.5 w-14" />
              {i < 5 && <div className="w-px h-4 bg-zinc-200/60 dark:bg-zinc-700/60 ml-2.5" />}
            </div>
          ))}
        </div>

        {/* Filter Bar: search + view toggles + atribuicao chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <Skeleton className="h-9 w-48 sm:w-64 rounded-lg" />
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-7 w-7 rounded-md" />
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-6 w-12 rounded-md" />
            ))}
          </div>
        </div>

        {/* List of 8 card rows */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="rounded-xl overflow-hidden">
              <div className="p-3 sm:p-4 flex items-center gap-3">
                {/* Status dot */}
                <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
                {/* Main content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                {/* Right side: badges + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Skeleton className="h-5 w-14 rounded-md" />
                  <Skeleton className="h-5 w-10 rounded-md" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
