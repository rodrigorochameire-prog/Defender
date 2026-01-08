import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Skeleton genérico para páginas simples
export function PageSkeleton() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Skeleton para Dashboard (stats + listas de eventos e pets)
export function DashboardSkeleton() {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-[14px]" />
          <Skeleton className="h-9 w-28 rounded-[14px]" />
        </div>
      </div>

      {/* Stats Cards (4 colunas) */}
      <div className="stats-row">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-header">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-16 mt-3" />
            <Skeleton className="h-3 w-24 mt-2" />
          </div>
        ))}
      </div>

      {/* Content Grid (2 colunas) */}
      <div className="content-grid">
        {[1, 2].map((i) => (
          <div key={i} className="section-card">
            <div className="section-card-header">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="section-card-content">
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-3 p-4 rounded-lg border">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton para Mural (posts com imagens)
export function WallSkeleton() {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-[14px]" />
      </div>

      {/* Posts com imagens */}
      <div className="space-y-5">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-64 w-full rounded-[14px]" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Skeleton para listas com tabela/items
export function TableSkeleton() {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-[14px]" />
      </div>

      {/* Filtros/Search */}
      <div className="flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-[14px]" />
        <Skeleton className="h-11 w-32 rounded-[14px]" />
      </div>

      {/* Lista */}
      <Card>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 pb-4 border-b last:border-0">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Skeleton para Lista de Pets (grid de cards)
export function PetsListSkeleton() {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-[14px]" />
      </div>

      {/* Stats (4 cards) */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-20 mt-2" />
          </Card>
        ))}
      </div>

      {/* Grid de Pets (3 colunas) */}
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
            <div className="flex items-center justify-between pt-4 border-t">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Skeleton para Accordion (vacinas, medicamentos, documentos por pet)
export function AccordionSkeleton() {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>

      {/* Accordions por pet */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <div className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-48" />
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
