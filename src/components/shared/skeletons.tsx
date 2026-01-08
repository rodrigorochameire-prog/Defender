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
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-[14px]" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
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
      {/* Header com botões */}
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
          <Skeleton className="h-9 w-28 rounded-[14px]" />
        </div>
      </div>

      {/* Stats Cards (4 colunas) - com variações */}
      <div className="stats-row">
        {[
          { title: 32, value: 20 },
          { title: 28, value: 16 },
          { title: 36, value: 16 },
          { title: 28, value: 20 }
        ].map((sizes, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-header">
              <Skeleton className="h-4" style={{ width: `${sizes.title * 4}px` }} />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-10" style={{ width: `${sizes.value * 4}px` }} />
            <Skeleton className="h-3 w-28 mt-2" />
          </div>
        ))}
      </div>

      {/* Content Grid (2 colunas) */}
      <div className="content-grid">
        {/* Próximos Eventos */}
        <div className="section-card">
          <div className="section-card-header">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-36" />
              </div>
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <div className="section-card-content space-y-3">
            {[
              { name: 48, desc: 64 },
              { name: 56, desc: 72 },
              { name: 40, desc: 56 }
            ].map((sizes, j) => (
              <div key={j} className="flex items-center gap-3 p-4 rounded-[14px] border border-border/50">
                <Skeleton className="h-10 w-10 rounded-[14px]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4" style={{ width: `${sizes.name * 4}px` }} />
                  <Skeleton className="h-3" style={{ width: `${sizes.desc * 4}px` }} />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Pets Recentes */}
        <div className="section-card">
          <div className="section-card-header">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <div className="section-card-content space-y-3">
            {[
              { name: 44, breed: 52 },
              { name: 52, breed: 48 },
              { name: 36, breed: 60 }
            ].map((sizes, j) => (
              <div key={j} className="flex items-center gap-3 p-4 rounded-[14px] border border-border/50">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4" style={{ width: `${sizes.name * 4}px` }} />
                  <Skeleton className="h-3" style={{ width: `${sizes.breed * 4}px` }} />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton para Mural (posts com imagens e interações)
export function WallSkeleton() {
  return (
    <div className="page-container">
      {/* Header */}
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

      {/* Posts com variações realistas */}
      <div className="space-y-5">
        {[
          { text: [85, 75, 40], hasImage: true, imageHeight: 64, likes: 8, comments: 12 },
          { text: [90, 88, 70, 30], hasImage: true, imageHeight: 72, likes: 12, comments: 16 },
          { text: [78, 65], hasImage: false, imageHeight: 0, likes: 6, comments: 8 }
        ].map((post, i) => (
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
              {/* Texto do post - linhas variadas */}
              <div className="space-y-2">
                {post.text.map((width, j) => (
                  <Skeleton key={j} className="h-4" style={{ width: `${width}%` }} />
                ))}
              </div>
              
              {/* Imagem (se tiver) */}
              {post.hasImage && (
                <Skeleton 
                  className="w-full rounded-[14px]" 
                  style={{ height: `${post.imageHeight * 4}px` }} 
                />
              )}
              
              {/* Ações (curtir, comentar) com contadores */}
              <div className="flex items-center gap-6 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4" style={{ width: `${post.likes * 4}px` }} />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4" style={{ width: `${post.comments * 4}px` }} />
                </div>
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
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-[14px]" />
      </div>

      {/* Filtros/Search */}
      <div className="flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-[14px]" />
        <Skeleton className="h-11 w-36 rounded-[14px]" />
      </div>

      {/* Lista com variações realistas */}
      <Card>
        <div className="p-6 space-y-4">
          {[
            { name: 52, desc: 68, badge: 28 },
            { name: 48, desc: 64, badge: 24 },
            { name: 60, desc: 76, badge: 32 },
            { name: 44, desc: 60, badge: 20 },
            { name: 56, desc: 72, badge: 28 },
            { name: 40, desc: 56, badge: 24 }
          ].map((sizes, i) => (
            <div key={i} className="flex items-center gap-4 pb-4 border-b last:border-0">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4" style={{ width: `${sizes.name * 4}px` }} />
                <Skeleton className="h-3" style={{ width: `${sizes.desc * 4}px` }} />
              </div>
              <Skeleton className="h-7 rounded-full" style={{ width: `${sizes.badge * 4}px` }} />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Skeleton para Lista de Pets (grid de cards detalhado)
export function PetsListSkeleton() {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-76" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-[14px]" />
      </div>

      {/* Stats (4 cards) */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 28, value: 8 },
          { label: 32, value: 8 },
          { label: 28, value: 8 },
          { label: 40, value: 12 }
        ].map((sizes, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4" style={{ width: `${sizes.label * 4}px` }} />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <Skeleton className="h-8" style={{ width: `${sizes.value * 4}px` }} />
            <Skeleton className="h-3 w-32 mt-2" />
          </Card>
        ))}
      </div>

      {/* Grid de Pets (3 colunas) - variações */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { name: 36, breed: 48 },
          { name: 28, breed: 44 },
          { name: 40, breed: 36 },
          { name: 32, breed: 52 },
          { name: 44, breed: 40 },
          { name: 24, breed: 48 }
        ].map((sizes, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5" style={{ width: `${sizes.name * 4}px` }} />
                <Skeleton className="h-4" style={{ width: `${sizes.breed * 4}px` }} />
              </div>
            </div>
            
            {/* Stats do pet */}
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
            
            {/* Footer */}
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

// Skeleton para Mural (posts com imagens e interações)
export function WallSkeleton() {
  return (
    <div className="page-container">
      {/* Header */}
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

      {/* Posts com variações realistas */}
      <div className="space-y-5">
        {[
          { text: [85, 75, 40], hasImage: true, imageHeight: 64, likes: 8, comments: 12 },
          { text: [90, 88, 70, 30], hasImage: true, imageHeight: 72, likes: 12, comments: 16 },
          { text: [78, 65], hasImage: false, imageHeight: 0, likes: 6, comments: 8 }
        ].map((post, i) => (
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
              {/* Texto do post - linhas variadas */}
              <div className="space-y-2">
                {post.text.map((width, j) => (
                  <Skeleton key={j} className="h-4" style={{ width: `${width}%` }} />
                ))}
              </div>
              
              {/* Imagem (se tiver) */}
              {post.hasImage && (
                <Skeleton 
                  className="w-full rounded-[14px]" 
                  style={{ height: `${post.imageHeight * 4}px` }} 
                />
              )}
              
              {/* Ações (curtir, comentar) com contadores */}
              <div className="flex items-center gap-6 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4" style={{ width: `${post.likes * 4}px` }} />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4" style={{ width: `${post.comments * 4}px` }} />
                </div>
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
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-[14px]" />
      </div>

      {/* Filtros/Search */}
      <div className="flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-[14px]" />
        <Skeleton className="h-11 w-36 rounded-[14px]" />
      </div>

      {/* Lista com variações realistas */}
      <Card>
        <div className="p-6 space-y-4">
          {[
            { name: 52, desc: 68, badge: 28 },
            { name: 48, desc: 64, badge: 24 },
            { name: 60, desc: 76, badge: 32 },
            { name: 44, desc: 60, badge: 20 },
            { name: 56, desc: 72, badge: 28 },
            { name: 40, desc: 56, badge: 24 }
          ].map((sizes, i) => (
            <div key={i} className="flex items-center gap-4 pb-4 border-b last:border-0">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4" style={{ width: `${sizes.name * 4}px` }} />
                <Skeleton className="h-3" style={{ width: `${sizes.desc * 4}px` }} />
              </div>
              <Skeleton className="h-7 rounded-full" style={{ width: `${sizes.badge * 4}px` }} />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Skeleton para Lista de Pets (grid de cards detalhado)
export function PetsListSkeleton() {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <Skeleton className="h-12 w-12 rounded-[14px]" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-76" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-[14px]" />
      </div>

      {/* Stats (4 cards) */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 28, value: 8 },
          { label: 32, value: 8 },
          { label: 28, value: 8 },
          { label: 40, value: 12 }
        ].map((sizes, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4" style={{ width: `${sizes.label * 4}px` }} />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <Skeleton className="h-8" style={{ width: `${sizes.value * 4}px` }} />
            <Skeleton className="h-3 w-32 mt-2" />
          </Card>
        ))}
      </div>

      {/* Grid de Pets (3 colunas) - variações */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { name: 36, breed: 48 },
          { name: 28, breed: 44 },
          { name: 40, breed: 36 },
          { name: 32, breed: 52 },
          { name: 44, breed: 40 },
          { name: 24, breed: 48 }
        ].map((sizes, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5" style={{ width: `${sizes.name * 4}px` }} />
                <Skeleton className="h-4" style={{ width: `${sizes.breed * 4}px` }} />
              </div>
            </div>
            
            {/* Stats do pet */}
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
            
            {/* Footer */}
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
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-68" />
          </div>
        </div>
      </div>

      {/* Accordions por pet - com variações */}
      <div className="space-y-4">
        {[
          { name: 36, breed: 48, count: 12 },
          { name: 28, breed: 40, count: 16 },
          { name: 40, breed: 44, count: 8 }
        ].map((sizes, i) => (
          <Card key={i}>
            <div className="p-5 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5" style={{ width: `${sizes.name * 4}px` }} />
                    <Skeleton className="h-3" style={{ width: `${sizes.breed * 4}px` }} />
                  </div>
                </div>
                <Skeleton className="h-6 rounded-full" style={{ width: `${sizes.count * 4}px` }} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
