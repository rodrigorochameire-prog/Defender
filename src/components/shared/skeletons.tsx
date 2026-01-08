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
      {/* Header com botão */}
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
      
      {/* 4 Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { title: 32, icon: 8 },
          { title: 28, icon: 8 },
          { title: 28, icon: 8 },
          { title: 40, icon: 8 }
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-header">
              <Skeleton className="h-4" style={{ width: `${stat.title * 4}px` }} />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <Skeleton className="h-10 w-12 mt-3" />
          </div>
        ))}
      </div>
      
      {/* Filtros de busca */}
      <div className="flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-[14px]" />
        <Skeleton className="h-11 w-40 rounded-[14px]" />
      </div>
      
      {/* Grid de Pets (3 colunas) */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
        </div>
        <div className="section-card-content">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {names.map((name, i) => (
              <div key={i} className="p-5 rounded-[14px] bg-card border-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.03),0_1px_3px_0_rgba(0,0,0,0.05),0_2px_6px_0_rgba(0,0,0,0.02)]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5" style={{ width: `${name * 4}px` }} />
                      <Skeleton className="h-4" style={{ width: `${breeds[i] * 4}px` }} />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-border/50">
                  {/* Tutor */}
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  {/* Idade */}
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  {/* Status */}
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  {/* Créditos */}
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-18" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-16" />
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

// Skeleton PRECISO para Calendário (admin/calendar/page.tsx)
export function CalendarSkeleton() {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Skeleton className="h-5 w-5" />
          </div>
          <div className="page-header-info">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
      </div>
      
      {/* Stats - 5 cards em grid 2/5 */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {[
          "Eventos Hoje",
          "Este Mês",
          "Vacinas (30d)",
          "Medicamentos",
          "Preventivos"
        ].map((title, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-header">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <Skeleton className="h-10 w-12 mt-3" />
          </div>
        ))}
      </div>
      
      {/* Calendário - Estrutura do PremiumCalendar */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          {/* Controles do calendário */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Navegação mês */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            
            {/* Botões de visualização */}
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 rounded-[14px]" />
              <Skeleton className="h-9 w-24 rounded-[14px]" />
              <Skeleton className="h-9 w-16 rounded-[14px]" />
              <Skeleton className="h-9 w-20 rounded-[14px]" />
            </div>
            
            {/* Botão Novo */}
            <Skeleton className="h-9 w-28 rounded-[14px]" />
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Grid do calendário - 7 colunas (dias da semana) */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day, i) => (
              <div key={i} className="text-center py-2">
                <Skeleton className="h-4 w-12 mx-auto" />
              </div>
            ))}
          </div>
          
          {/* Grid de dias - 5 semanas x 7 dias */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square p-2 rounded-lg border border-border/50">
                <Skeleton className="h-6 w-6 rounded-full mb-2" />
                {i % 7 < 4 && (
                  <div className="space-y-1">
                    <Skeleton className="h-2 w-full rounded-full" />
                    {i % 3 === 0 && <Skeleton className="h-2 w-3/4 rounded-full" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Card Próximos 7 Dias */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton para Behavior/Logs (grid 2 colunas de cards)
export function BehaviorSkeleton() {
  const names = [36, 28, 40, 32];
  
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
        <Skeleton className="h-9 w-36 rounded-[14px]" />
      </div>
      
      {/* Filtros */}
      <Card className="mb-5">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <Skeleton className="h-11 w-48 rounded-[14px]" />
            <Skeleton className="h-11 w-40 rounded-[14px]" />
          </div>
        </CardContent>
      </Card>
      
      {/* Grid 2 colunas de registros */}
      <div className="grid gap-4 md:grid-cols-2">
        {names.map((w, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4" style={{ width: `${w * 4}px` }} />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {[1, 2].map((j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
              {i % 2 === 0 && (
                <>
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Skeleton PRECISO para Logs Diários (admin/logs/page.tsx)
export function LogsSkeleton() {
  const names = [32, 40, 28, 36, 44, 32];
  
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Skeleton className="h-5 w-5" />
          </div>
          <div className="page-header-info">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="page-header-actions">
          <Skeleton className="h-9 w-28 rounded-[14px]" />
        </div>
      </div>
      
      {/* Stats Row - 3 cards */}
      <div className="stats-row">
        {[
          "Total de Logs",
          "Logs de Hoje",
          "Creche Hoje"
        ].map((title, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-header">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <Skeleton className="h-10 w-12 mt-3" />
          </div>
        ))}
      </div>
      
      {/* Card de Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-11 w-40 rounded-[14px]" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-11 w-40 rounded-[14px]" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Grid 3 colunas de logs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {names.map((w, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4" style={{ width: `${w * 4}px` }} />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </CardHeader>
            <CardContent>
              {/* Grid 3 colunas: Humor, Fezes, Apetite */}
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="p-2 rounded-lg bg-muted/50">
                    <Skeleton className="h-4 w-4 mx-auto mb-1" />
                    <Skeleton className="h-3 w-12 mx-auto" />
                  </div>
                ))}
              </div>
              {/* Notas (aparece em alguns) */}
              {i % 2 === 0 && (
                <>
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-16 w-full rounded-lg bg-muted/50" />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
