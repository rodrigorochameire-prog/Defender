# /new-page - Skill para Criar Nova Página

> **Tipo**: Workflow Especializado
> **Execução**: No contexto principal

## Descrição
Cria uma nova página administrativa seguindo os padrões do projeto OMBUDS.

## Template Base

```tsx
"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// Shared Components
import { PageLayout } from "@/components/shared/page-layout";
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";
import { FilterBar } from "@/components/shared/filter-bar";
import { SwissCard, SwissCardContent } from "@/components/ui/swiss-card";
import { EmptyState } from "@/components/shared/empty-state";

// Icons
import { Plus, Search, FileText } from "lucide-react";

export default function NomeDaPaginaPage() {
  // States
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // Queries
  const { data, isLoading } = trpc.router.list.useQuery({
    search: search || undefined,
  });

  // Stats
  const stats = useMemo(() => {
    if (!data) return { total: 0 };
    return {
      total: data.length,
    };
  }, [data]);

  // Loading
  if (isLoading) {
    return (
      <PageLayout header="Título" description="Descrição">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      header="Título da Página"
      description="Descrição breve"
      actions={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Item
        </Button>
      }
    >
      {/* Stats */}
      <KPIGrid columns={4}>
        <KPICardPremium
          title="Total"
          value={stats.total}
          icon={FileText}
          gradient="zinc"
          size="sm"
        />
      </KPIGrid>

      {/* Filtros */}
      <FilterBar>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </FilterBar>

      {/* Conteúdo */}
      <SwissCard>
        <SwissCardContent>
          {data?.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum item encontrado"
              description="Crie um novo item para começar."
            />
          ) : (
            <div>
              {/* Lista/Tabela/Grid aqui */}
            </div>
          )}
        </SwissCardContent>
      </SwissCard>
    </PageLayout>
  );
}
```

## Checklist de Criação

- [ ] Criar arquivo em `src/app/(dashboard)/admin/[nome]/page.tsx`
- [ ] Usar `PageLayout` como container
- [ ] Usar `KPICardPremium` com `gradient="zinc"` para stats
- [ ] Usar `FilterBar` para filtros
- [ ] Usar `SwissCard` para conteúdo
- [ ] Usar `EmptyState` para lista vazia
- [ ] Implementar loading state com `Skeleton`
- [ ] Testar dark mode
- [ ] Verificar responsividade mobile

## Padrões Obrigatórios

### Cores
- Stats cards: `gradient="zinc"`
- Hover: `emerald` (automático nos componentes)
- Nunca usar cores sólidas em backgrounds

### Tipografia
- Títulos: `font-serif text-2xl`
- Labels: `text-xs uppercase tracking-wider`
- Corpo: `text-sm`

### Responsividade
- KPIGrid: `columns={4}` (ajusta automaticamente)
- Cards: usar `gap-4` padrão
- Mobile-first sempre
