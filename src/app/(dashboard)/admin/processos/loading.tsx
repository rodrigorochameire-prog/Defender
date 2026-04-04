import { Skeleton } from "@/components/ui/skeleton";

export default function ProcessosLoading() {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      {/* Header Premium */}
      <div className="relative px-5 md:px-8 py-6 md:py-8 bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-transparent to-transparent dark:from-emerald-950/15 dark:via-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-2xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3.5 w-52" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-xl ml-1.5" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 md:p-8 space-y-5 md:space-y-7">
        {/* Stats Ribbon (6 inline metrics) */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 text-xs overflow-x-auto scrollbar-none shadow-sm">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-1.5 px-2.5 py-1">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-3.5 w-14" />
              {i < 6 && <div className="w-px h-4 bg-neutral-200/60 dark:bg-neutral-700/60 ml-2.5" />}
            </div>
          ))}
        </div>

        {/* Filter Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-7 w-16 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1 max-w-md rounded-lg" />
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-20 rounded-lg" />
            </div>
          </div>
        </div>

        {/* 3-column grid of 6 process cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden"
            >
              <div className="p-4 space-y-3">
                {/* Status badges */}
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-12 rounded" />
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
                {/* Process number */}
                <Skeleton className="h-5 w-48" />
                {/* Subject */}
                <div className="space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                {/* Location */}
                <Skeleton className="h-4 w-32" />
                {/* Divider + Assistido */}
                <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-6 w-8 rounded-md" />
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="border-t border-neutral-100 dark:border-neutral-800 py-2 flex justify-center">
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
