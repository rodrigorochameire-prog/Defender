import { Skeleton } from "@/components/ui/skeleton";

export default function VidaFuncionalLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <div className="px-5 md:px-8 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
