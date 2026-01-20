# 🎨 Design System - Defender

## Visão Geral

O Defender segue os princípios do **Minimalismo Institucional** - um sistema de design que prioriza clareza, consistência e profissionalismo através de uma paleta restrita, hierarquia previsível e componentes reutilizáveis.

---

## 🎯 Princípios Fundamentais

### 1. **Regra do Papel Branco**
Todos os cards de conteúdo são brancos (`bg-white`) sobre fundo stone-50, criando o efeito "papel sobre mesa".

### 2. **Regra do Verde**
Verde (primary) usado APENAS em:
- Botões de ação principal
- Links ativos na sidebar
- Ícones de destaque

### 3. **Regra do Outline**
Badges SEMPRE com estilo outline (borda colorida + fundo claro), NUNCA solid.

### 4. **Regra da Hierarquia**
Uma única estrutura de página para TODAS as views usando `PageWrapper`.

### 5. **Regra da Semiótica**
Ícones > Texto sempre que possível (ex: cadeado em vez de "RÉU PRESO").

---

## 📦 Componentes Principais

### PageWrapper
Container universal para todas as páginas.

```tsx
import { PageWrapper } from "@/components/layouts/page-wrapper";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

<PageWrapper
  title="Assistidos"
  description="Gerencie seus assistidos e familiares"
  icon={Users}
  actions={
    <>
      <Button variant="outline">Exportar</Button>
      <Button><Plus className="w-4 h-4 mr-2" />Nova Pessoa</Button>
    </>
  }
  breadcrumbs={[
    { label: "Dashboard", href: "/admin" },
    { label: "Assistidos" }
  ]}
>
  {/* Conteúdo aqui */}
</PageWrapper>
```

### SwissCard
Card padronizado para todo conteúdo.

```tsx
import { 
  SwissCard, 
  SwissCardHeader, 
  SwissCardTitle,
  SwissCardContent 
} from "@/components/ui/swiss-card";

<SwissCard>
  <SwissCardHeader>
    <SwissCardTitle>Título</SwissCardTitle>
  </SwissCardHeader>
  <SwissCardContent>
    {/* Conteúdo */}
  </SwissCardContent>
</SwissCard>
```

### FilterBar
Barra de filtros padronizada.

```tsx
import { FilterBar } from "@/components/shared/filter-bar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

<FilterBar>
  <Input placeholder="Buscar..." className="w-64" />
  <Select>...</Select>
</FilterBar>
```

### Badge
Badges com variantes outline.

```tsx
import { Badge } from "@/components/ui/badge";

<Badge variant="danger">Urgente</Badge>
<Badge variant="warning">A Fazer</Badge>
<Badge variant="success">Concluído</Badge>
<Badge variant="info">Monitorar</Badge>
<Badge variant="neutral">Neutro</Badge>
```

### PrisonerIndicator
Indicador discreto de status prisional.

```tsx
import { PrisonerIndicator } from "@/components/shared/prisoner-indicator";

<div className="flex items-center gap-2">
  <span>João Silva</span>
  <PrisonerIndicator preso={true} localPrisao="CDP" size="sm" />
</div>
```

---

## 🎨 Paleta de Cores

### Verde Floresta (Primária)
```css
--primary: 158 45% 30%
```
**Onde usar**: Botões primários, links ativos, ícones destacados
**Onde NÃO usar**: Fundos de cards, backgrounds extensos

### Stone (Neutro Dominante)
- `stone-50`: Fundo da página
- `stone-100`: Fundos de filtros/toolbars
- `stone-200`: Bordas de cards
- `stone-500`: Labels e textos secundários
- `stone-900`: Títulos e textos principais

### Cores Semânticas (Apenas Badges/Status)
- **Vermelho** (`danger`): Urgente, erro
- **Laranja** (`warning`): Ação imediata
- **Amarelo**: A fazer, pendente
- **Azul** (`info`): Monitorar
- **Verde** (`success`): Concluído
- **Roxo**: Fila, secundário

---

## 📏 Tipografia

### Hierarquia
- **H1** (Títulos de Página): `text-2xl font-serif font-semibold`
- **H2** (Títulos de Seção): `text-lg font-sans font-semibold`
- **Labels**: `text-xs font-medium uppercase tracking-wider text-muted-foreground`
- **Corpo**: `text-sm text-foreground`
- **Dados/Mono**: `text-sm font-mono`

### Proibições
- ❌ NUNCA use `text-[11px]`, `text-[13px]` (magic numbers)
- ❌ NUNCA use `font-bold` em labels (use `font-semibold`)
- ❌ NUNCA use ALL CAPS em títulos

---

## 📐 Anatomia de uma Página

```tsx
<PageWrapper title="Título" icon={Icon} actions={...}>
  {/* 1. Métricas (opcional) */}
  <StatsGrid>
    <StatsCard ... />
  </StatsGrid>

  {/* 2. Filtros */}
  <FilterBar>
    <Input ... />
    <Select ... />
  </FilterBar>

  {/* 3. Conteúdo Principal */}
  <SwissCard>
    <SwissCardContent>
      {/* Tabela, lista, formulário, etc */}
    </SwissCardContent>
  </SwissCard>
</PageWrapper>
```

---

## ✅ Checklist de Padronização

Ao criar/editar uma página:

- [ ] Usa `<PageWrapper>` como container?
- [ ] Usa `<SwissCard>` para todos os cards?
- [ ] Usa `<PrisonerIndicator>` em vez de tag "PRESO"?
- [ ] Badges são outline (variantes: danger, warning, etc)?
- [ ] Verde só em botões/links?
- [ ] Tipografia usa classes do sistema (sem magic numbers)?
- [ ] Filtros estão em `<FilterBar>`?

---

## 🚫 Anti-Padrões (O que NÃO fazer)

### ❌ Carnaval de Cores
```tsx
// ERRADO
<Card className="bg-blue-100">
  <div className="bg-red-50">
    <Badge className="bg-green-500 text-white">Status</Badge>
  </div>
</Card>
```

```tsx
// CERTO
<SwissCard>
  <SwissCardContent>
    <Badge variant="success">Status</Badge>
  </SwissCardContent>
</SwissCard>
```

### ❌ Badges Gritantes
```tsx
// ERRADO
<Badge className="bg-red-500 text-white font-bold">RÉU PRESO</Badge>
```

```tsx
// CERTO
<PrisonerIndicator preso={true} />
```

### ❌ Headers Inconsistentes
```tsx
// ERRADO
<div className="p-4">
  <h1 className="text-3xl font-bold mb-4">Título</h1>
  {children}
</div>
```

```tsx
// CERTO
<PageWrapper title="Título" icon={Icon}>
  {children}
</PageWrapper>
```

---

## 📚 Documentação Completa

Para guias detalhados, veja:
- `/docs/PADRONIZACAO_COMPLETA.md` - Diagnóstico e solução
- `/docs/GUIA_IMPLEMENTACAO.md` - Exemplos práticos

---

**Versão**: 1.0  
**Data**: Janeiro 2026  
**Status**: Ativo
