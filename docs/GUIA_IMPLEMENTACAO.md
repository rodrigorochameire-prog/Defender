# 🔧 Guia Prático de Implementação - Padronização Defender

## 🎯 Este documento mostra EXATAMENTE o que fazer

---

## 1️⃣ Consolidar SwissCard

### ❌ PROBLEMA ATUAL
Existem 2 implementações diferentes de SwissCard:

```
src/components/ui/swiss-card.tsx (criado recentemente)
src/components/shared/swiss-card.tsx (mais antigo)
```

### ✅ SOLUÇÃO

**Passo 1**: Deletar `src/components/shared/swiss-card.tsx`

**Passo 2**: Manter apenas `src/components/ui/swiss-card.tsx` com este conteúdo:

```tsx
// src/components/ui/swiss-card.tsx
import { cn } from "@/lib/utils";
import * as React from "react";

export interface SwissCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SwissCard({ className, children, ...props }: SwissCardProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-900",
        "border border-stone-200 dark:border-zinc-800",
        "shadow-sm rounded-xl overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SwissCardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-b border-stone-200 dark:border-zinc-800",
        "bg-stone-50/50 dark:bg-zinc-900/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SwissCardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold text-foreground tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function SwissCardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground mt-1", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function SwissCardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-5", className)} {...props}>
      {children}
    </div>
  );
}

export function SwissCardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-stone-200 dark:border-zinc-800",
        "bg-stone-50/30 dark:bg-zinc-900/30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

**Passo 3**: Atualizar todos os imports

```tsx
// ❌ ANTES
import { SwissCard } from "@/components/shared/swiss-card";

// ✅ DEPOIS
import { SwissCard, SwissCardContent, SwissCardHeader } from "@/components/ui/swiss-card";
```

---

## 2️⃣ Atualizar Badge para Outline

### ❌ PROBLEMA ATUAL
Badges com cores sólidas pesadas:

```tsx
<Badge className="bg-red-500 text-white">RÉU PRESO</Badge>
<Badge className="bg-orange-600 text-white">URGENTE</Badge>
```

### ✅ SOLUÇÃO

**Atualizar**: `src/components/ui/badge.tsx`

```tsx
// src/components/ui/badge.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // ✅ TODOS OUTLINE - NUNCA SOLID
        danger: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
        warning: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900",
        info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
        success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
        neutral: "bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

**Uso correto**:

```tsx
// ✅ SEMPRE use variants
<Badge variant="danger">Urgente</Badge>
<Badge variant="warning">A Fazer</Badge>
<Badge variant="success">Concluído</Badge>

// ❌ NUNCA faça isso
<Badge className="bg-red-500 text-white">Urgente</Badge>
```

---

## 3️⃣ Criar PageWrapper Unificado

### ❌ PROBLEMA ATUAL
Cada página tem estrutura diferente:

```tsx
// Página A
<div className="p-4">
  <h1>Título</h1>
  {children}
</div>

// Página B
<div className="p-8 max-w-7xl mx-auto">
  <div className="border-b pb-4">
    <h1>Título</h1>
  </div>
  {children}
</div>

// Página C usa PageLayout
<PageLayout header="Título">
  {children}
</PageLayout>
```

### ✅ SOLUÇÃO

**Criar**: `src/components/layouts/page-wrapper.tsx`

```tsx
// src/components/layouts/page-wrapper.tsx
"use client";

import { type LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

interface PageWrapperProps {
  children: ReactNode;
  /** Título da página (H1) */
  title: string;
  /** Descrição curta abaixo do título */
  description?: string;
  /** Ícone ao lado do título */
  icon?: LucideIcon;
  /** Botões de ação no canto direito */
  actions?: ReactNode;
  /** Breadcrumbs de navegação */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Classe adicional */
  className?: string;
}

export function PageWrapper({
  children,
  title,
  description,
  icon: Icon,
  actions,
  breadcrumbs,
  className,
}: PageWrapperProps) {
  return (
    <div className={cn("flex flex-col space-y-6", className)}>
      {/* Breadcrumbs (se existir) */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} />
      )}

      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Conteúdo da Página */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
```

**Uso em qualquer página**:

```tsx
// ✅ MODELO PADRÃO PARA TODAS AS PÁGINAS
import { PageWrapper } from "@/components/layouts/page-wrapper";
import { SwissCard, SwissCardContent } from "@/components/ui/swiss-card";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MinhaPage() {
  return (
    <PageWrapper
      title="Assistidos"
      description="Gerencie seus assistidos e familiares"
      icon={Users}
      actions={
        <>
          <Button variant="outline">Exportar</Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Pessoa
          </Button>
        </>
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/admin" },
        { label: "Assistidos" }
      ]}
    >
      {/* Conteúdo aqui */}
      <SwissCard>
        <SwissCardContent>
          {/* Sua tabela/conteúdo */}
        </SwissCardContent>
      </SwissCard>
    </PageWrapper>
  );
}
```

---

## 4️⃣ Substituir Tags "PRESO" por Ícone

### ❌ PROBLEMA ATUAL

```tsx
// Gritante e ocupa muito espaço
<Badge className="bg-red-500 text-white font-bold">RÉU PRESO</Badge>
<span className="text-red-600 font-bold">PRESO</span>
```

### ✅ SOLUÇÃO

O componente `PrisonerIndicator` já existe e está perfeito. Apenas use ele:

```tsx
import { PrisonerIndicator } from "@/components/shared/prisoner-indicator";

// ✅ Discreto e elegante
<div className="flex items-center gap-2">
  <span className="font-semibold">João Silva</span>
  <PrisonerIndicator 
    preso={assistido.preso}
    localPrisao={assistido.localPrisao}
    size="sm"
  />
</div>
```

**Aparência**: Pequeno círculo vermelho suave com ícone de cadeado. Ao passar o mouse, tooltip mostra "Réu Preso / Custódia".

---

## 5️⃣ Criar FilterBar Padronizada

### ❌ PROBLEMA ATUAL
Filtros espalhados por toda página:

```tsx
// Cada página faz de um jeito
<div className="flex gap-2">
  <Input placeholder="Buscar..." />
  <Select>...</Select>
</div>

<div className="bg-gray-100 p-4">
  <SearchInput />
  <FilterChips />
</div>
```

### ✅ SOLUÇÃO

**Criar**: `src/components/shared/filter-bar.tsx`

```tsx
// src/components/shared/filter-bar.tsx
"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "w-full flex flex-wrap items-center gap-2",
        "bg-stone-100/50 dark:bg-zinc-800/50",
        "border border-stone-200 dark:border-zinc-700",
        "rounded-lg px-4 py-3",
        className
      )}
    >
      {children}
    </div>
  );
}
```

**Uso**:

```tsx
import { FilterBar } from "@/components/shared/filter-bar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

<FilterBar>
  <Input 
    placeholder="Buscar assistido..." 
    className="w-64"
  />
  <Select>
    <SelectTrigger className="w-40">
      <SelectValue placeholder="Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos</SelectItem>
      <SelectItem value="active">Ativos</SelectItem>
    </SelectContent>
  </Select>
</FilterBar>
```

---

## 6️⃣ Exemplo Completo: Migrar Página de Assistidos

### ❌ ANTES (Assistidos - Inconsistente)

```tsx
// src/app/(dashboard)/admin/assistidos/page.tsx (ANTES)
export default function AssistidosPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Assistidos</h1>
      </div>
      
      <div className="flex gap-2 mb-4">
        <Input placeholder="Buscar..." />
        <Select>...</Select>
      </div>

      <Card className="bg-white">
        <CardContent className="p-6">
          <Table>
            <TableRow>
              <TableCell>
                <span>João Silva</span>
                <Badge className="bg-red-500 text-white ml-2">PRESO</Badge>
              </TableCell>
            </TableRow>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### ✅ DEPOIS (Assistidos - Padronizado)

```tsx
// src/app/(dashboard)/admin/assistidos/page.tsx (DEPOIS)
import { PageWrapper } from "@/components/layouts/page-wrapper";
import { SwissCard, SwissCardContent } from "@/components/ui/swiss-card";
import { FilterBar } from "@/components/shared/filter-bar";
import { PrisonerIndicator } from "@/components/shared/prisoner-indicator";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SwissTable } from "@/components/shared/swiss-table";

export default function AssistidosPage() {
  return (
    <PageWrapper
      title="Assistidos"
      description="Gerencie seus assistidos e familiares"
      icon={Users}
      actions={
        <>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Pessoa
          </Button>
        </>
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/admin" },
        { label: "Assistidos" }
      ]}
    >
      {/* Filtros em posição padrão */}
      <FilterBar>
        <Input 
          placeholder="Buscar assistido..." 
          className="w-64"
        />
        <Select>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          {/* Options... */}
        </Select>
      </FilterBar>

      {/* Conteúdo Principal */}
      <SwissCard>
        <SwissCardContent>
          <SwissTable>
            <SwissTableBody>
              <SwissTableRow>
                <SwissTableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">João Silva</span>
                    <PrisonerIndicator preso={true} size="sm" />
                  </div>
                </SwissTableCell>
              </SwissTableRow>
            </SwissTableBody>
          </SwissTable>
        </SwissCardContent>
      </SwissCard>
    </PageWrapper>
  );
}
```

---

## 7️⃣ Checklist de Migração

Ao migrar cada página, siga esta ordem:

1. [ ] Substituir wrapper externo por `<PageWrapper>`
2. [ ] Mover header/título para props do PageWrapper
3. [ ] Colocar filtros dentro de `<FilterBar>`
4. [ ] Trocar `<Card>` por `<SwissCard>`
5. [ ] Substituir badges sólidas por outline variants
6. [ ] Trocar tags "PRESO" por `<PrisonerIndicator>`
7. [ ] Remover cores de fundo variadas (bg-blue-50, etc)
8. [ ] Verificar tipografia (sem magic numbers)
9. [ ] Testar responsividade
10. [ ] Testar dark mode

---

## 8️⃣ Ordem de Migração Sugerida

### Prioridade ALTA (Páginas mais visadas)
1. `/admin/assistidos/page.tsx`
2. `/admin/processos/page.tsx`
3. `/admin/demandas/page.tsx`
4. `/admin/dashboard/page.tsx`

### Prioridade MÉDIA (Páginas frequentes)
5. `/admin/audiencias/page.tsx`
6. `/admin/juri/page.tsx`
7. `/admin/calendar/page.tsx`
8. `/admin/prazos/page.tsx`

### Prioridade BAIXA (Páginas menos usadas)
9. Todas as outras páginas

---

## 9️⃣ Regras de Ouro (Nunca Quebre)

1. **SEMPRE** use `<PageWrapper>` como container principal
2. **SEMPRE** use `<SwissCard>` para cards de conteúdo
3. **SEMPRE** use `<PrisonerIndicator>` em vez de texto "PRESO"
4. **SEMPRE** use badge variants (danger, warning, etc) - NUNCA classes customizadas
5. **NUNCA** use `bg-blue-50`, `bg-red-100` em fundos de cards
6. **NUNCA** use verde fora de botões primários e links
7. **NUNCA** use `font-bold` em labels (use `font-semibold`)
8. **NUNCA** use tamanhos de fonte com pixels (text-[11px])

---

## 🎯 Resultado Esperado

Depois de aplicar essas mudanças:

✅ Todas as páginas terão a mesma estrutura visual
✅ Usuário vai "sentir" que está no mesmo aplicativo
✅ Menos ruído cognitivo (cores usadas com propósito)
✅ Hierarquia clara e previsível
✅ Elementos discretos e profissionais (cadeado > "PRESO")

**Tempo estimado**: ~2-3 horas para migrar as 4 páginas prioritárias.

---

**Próximo passo**: Implementar componentes base (PageWrapper, FilterBar, Badge atualizada)
