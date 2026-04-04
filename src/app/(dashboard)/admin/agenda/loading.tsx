import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function AgendaLoading() {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md ml-1.5" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats Ribbon */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              {i > 1 && (
                <div className="w-px h-4 bg-neutral-200/60 dark:bg-neutral-700/60 mr-2.5" />
              )}
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton className="h-4 w-5" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
          <div className="flex-1" />
          <Skeleton className="h-3 w-20" />
        </div>

        {/* Filter + Calendar Card */}
        <Card className="border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl overflow-hidden">
          {/* Filter header */}
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-6 w-12 rounded-md" />
                ))}
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="px-4 py-3 flex gap-3 border-b border-neutral-100 dark:border-neutral-800">
            <Skeleton className="h-9 flex-1 max-w-md rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
            <div className="flex gap-1">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>

          {/* Month navigation */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>

          {/* Calendar grid */}
          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full rounded" />
              ))}
            </div>
            {/* 5 rows of 7 day cells */}
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="grid grid-cols-7 gap-2 mb-2">
                {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                  <Skeleton
                    key={col}
                    className="h-20 w-full rounded-lg"
                  />
                ))}
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming events list card */}
        <Card className="border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800"
              >
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
