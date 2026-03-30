import { Skeleton } from "@/components/ui/skeleton";

export default function DriveLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-zinc-100 dark:bg-[#0f0f11] overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 shrink-0 bg-white dark:bg-card border-r border-zinc-200 dark:border-border p-4 space-y-4 hidden md:block">
        {/* Sidebar header */}
        <div className="space-y-3">
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-px w-full" />
        </div>
        {/* Nav items */}
        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2">
              <Skeleton className="w-4 h-4 rounded shrink-0" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        {/* Separator */}
        <Skeleton className="h-px w-full" />
        {/* Storage indicator */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Top bar / breadcrumb */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-card border-b border-zinc-200 dark:border-border">
          <Skeleton className="w-5 h-5 rounded shrink-0 md:hidden" />
          <div className="flex items-center gap-2 flex-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-3" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-40 rounded-md hidden sm:block" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>

        {/* File grid */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {/* Section header */}
          <div className="mb-4">
            <Skeleton className="h-4 w-20" />
          </div>
          {/* File cards 3x3 grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-200 dark:border-border bg-white dark:bg-card overflow-hidden"
              >
                {/* File preview area */}
                <Skeleton className="h-32 w-full rounded-none" />
                {/* File info */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-5 h-5 rounded shrink-0" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
