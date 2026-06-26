import { Skeleton } from "@/components/ui/skeleton";

export default function DominioLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <div className="px-5 md:px-8 py-4 border-b border-border/60">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="px-5 md:px-8 py-4 space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    </div>
  );
}
