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
  const widths = [
    [32, 28, 36, 28],
    [48, 56, 40],
    [52, 48, 44]
  ];
  
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
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-[14px]" />
          <Skeleton className="h-9 w-32 rounded-[14px]" />
        </div>
      </div>
      <div className="stats-row">
        {widths[0].map((w, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-header">
              <Skeleton className="h-4" style={{ width: `${w * 4}px` }} />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-16 mt-3" />
            <Skeleton className="h-3 w-24 mt-2" />
          </div>
        ))}
      </div>
      <div className="content-grid">
        {[1, 2].map((i) => (
          <div key={i} className="section-card">
            <div className="section-card-header">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-36" />
                </div>
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
            <div className="section-card-content space-y-3">
              {widths[i].map((w, j) => (
                <div key={j} className="flex items-center gap-3 p-4 border border-border/50 rounded-[14px]">
                  <Skeleton className="h-10 w-10 rounded-[14px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4" style={{ width: `${w * 4}px` }} />
                    <Skeleton className="h-3" style={{ width: `${w * 3}px` }} />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
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
  const posts = [
    { lines: [90, 75, 40], img: 256 },
    { lines: [85, 80, 65, 30], img: 288 },
    { lines: [70, 55], img: 0 }
  ];
  
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
        <Skeleton className="h-9 w-36 rounded-[14px]" />
      </div>
      <div className="space-y-5">
        {posts.map((post, i) => (
          <Card key={i}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {post.lines.map((w, j) => (
                  <Skeleton key={j} className="h-4" style={{ width: `${w}%` }} />
                ))}
              </div>
              {post.img > 0 && (
                <Skeleton className="w-full rounded-[14px]" style={{ height: `${post.img}px` }} />
              )}
              <div className="flex gap-6 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton() {
  const items = [52, 48, 60, 44, 56, 40];
  
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
        <Skeleton className="h-9 w-32 rounded-[14px]" />
      </div>
      <div className="flex gap-3 mb-5">
        <Skeleton className="h-11 flex-1 rounded-[14px]" />
        <Skeleton className="h-11 w-36 rounded-[14px]" />
      </div>
      <Card>
        <div className="p-6 space-y-4">
          {items.map((w, i) => (
            <div key={i} className="flex items-center gap-4 pb-4 border-b last:border-0">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4" style={{ width: `${w * 4}px` }} />
                <Skeleton className="h-3" style={{ width: `${w * 3}px` }} />
              </div>
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function PetsListSkeleton() {
  const names = [36, 28, 40, 32, 44, 24];
  const breeds = [48, 44, 36, 52, 40, 48];
  
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
        <Skeleton className="h-9 w-32 rounded-[14px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[28, 32, 28, 40].map((w, i) => (
          <Card key={i} className="p-5">
            <div className="flex justify-between mb-2">
              <Skeleton className="h-4" style={{ width: `${w * 4}px` }} />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-32 mt-2" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {names.map((name, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5" style={{ width: `${name * 4}px` }} />
                <Skeleton className="h-4" style={{ width: `${breeds[i] * 4}px` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-16" />
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
