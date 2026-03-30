import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header — Premium hero-style */}
      <div className="relative px-4 sm:px-5 md:px-8 py-5 sm:py-6 md:py-8 bg-card border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-transparent dark:from-emerald-950/20 dark:via-transparent pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3.5 w-56" />
            </div>
          </div>
          <Skeleton className="h-9 w-full sm:w-36 rounded-xl" />
        </div>
      </div>

      {/* Content */}
      <div className="p-5 md:p-8 space-y-6 md:space-y-8">
        {/* Quick Register Card */}
        <Card className="rounded-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-20 rounded-xl" />
                ))}
              </div>
            </div>
            <Skeleton className="h-20 w-full rounded-lg" />
            <div className="flex justify-end">
              <Skeleton className="h-9 w-32 rounded-xl" />
            </div>
          </div>
        </Card>

        {/* Stats Ribbon */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-5 rounded-full bg-emerald-500" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-card rounded-xl border border-border shadow-sm">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1">
                <Skeleton className="w-3.5 h-3.5 rounded" />
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
            <div className="flex-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* Prazos & Agenda Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-5 rounded-full bg-rose-500" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Prazos Card */}
            <Card className="rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-12 rounded" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-md" />
                </div>
              </div>
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </Card>

            {/* Audiencias Card */}
            <Card className="rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-10 rounded" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-md" />
                </div>
              </div>
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
