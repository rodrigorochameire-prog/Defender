import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function PageSkeleton() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-5 w-3/4 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
      <div className="stats-row">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-header">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-16 mt-3" />
          </div>
        ))}
      </div>
      <div className="content-grid">
        {[1, 2].map((i) => (
          <div key={i} className="section-card">
            <div className="section-card-header">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="section-card-content space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-center gap-3 p-4 border rounded-[14px]">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WallSkeleton() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      </div>
      <div className="space-y-5">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              {i !== 3 && <Skeleton className="h-64 w-full rounded-[14px]" />}
              <div className="flex gap-6 pt-3 border-t">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>
      <Card>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 pb-4 border-b last:border-0">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function PetsListSkeleton() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-8 w-12" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
            <div className="flex justify-between pt-4 border-t">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AccordionSkeleton() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-68" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
