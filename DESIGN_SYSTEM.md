# Sistema de Design INTELEX
**Defensoria Pública - Design Premium**

Atualizado em: 21/01/2026

---

## 📋 Sumário

1. [Visão Geral](#visão-geral)
2. [Paleta de Cores](#paleta-de-cores)
3. [Logo e Identidade Visual](#logo-e-identidade-visual)
4. [Componentes Padronizados](#componentes-padronizados)
5. [Estrutura de Páginas](#estrutura-de-páginas)
6. [Guia de Uso](#guia-de-uso)

---

## 🎨 Visão Geral

O design system INTELEX foi criado para proporcionar uma experiência visual **sofisticada, profissional e consistente** em toda a aplicação da Defensoria Pública.

### Princípios de Design

- **Elegância Institucional**: Verde-esmeralda sofisticado + tons neutros premium
- **Hierarquia Clara**: Estruturas bem definidas com headers, blocos e seções
- **Acessibilidade**: Alto contraste, fontes legíveis, elementos espaçados
- **Consistência**: Componentes padronizados reutilizáveis
- **Profissionalismo**: Visual premium inspirado em escritórios de advocacia

---

## 🎨 Paleta de Cores

### Modo Claro (Light)

#### Cores Primárias
```css
/* Verde Esmeralda Sofisticado */
--primary: 162 55% 28%        /* #1a5f56 - Verde profundo */
--primary-foreground: #FFFFFF

/* Background */
--background: #FAFAFA         /* Branco quente */
--foreground: #0F0F10         /* Preto suave */
```

#### Cores de Superfície
```css
--card: #FFFFFF               /* Branco puro - cards elevados */
--border: #E5E5E5             /* Bordas sutis */
--muted: #F5F5F5              /* Background secundário */
--muted-foreground: #737373   /* Texto secundário */
```

#### Cores Semânticas
```css
--success: 162 60% 35%        /* Verde vibrante */
--destructive: 0 65% 51%      /* Vermelho */
--warning: 38 92% 50%         /* Laranja/Âmbar */
--info: 205 87% 48%           /* Azul */
```

### Modo Escuro (Dark)

#### Cores Primárias
```css
/* Verde Esmeralda Vibrante */
--primary: 162 60% 48%        /* #2dd4bf - Teal vibrante */
--primary-foreground: #0F0F10

/* Background */
--background: #141414         /* Preto elegante */
--foreground: #FAFAFA         /* Branco quase puro */
```

#### Cores de Superfície
```css
--card: #1C1C1C               /* Card elevado */
--border: #333333             /* Bordas visíveis */
--muted: #262626              /* Background secundário */
--muted-foreground: #A3A3A3   /* Texto secundário */
```

### Gradientes

```css
/* Shield Gradient - Logo */
#14b8a6 → #0d9488 → #0f766e   (Teal 500 → 600 → 700)
```

---

## 🛡️ Logo e Identidade Visual

### Variantes da Logo

1. **Logo Completa** (`/public/logo.svg`)
   - Escudo verde-esmeralda + texto "INTELEX"
   - Destaque no **X** (maior, negrito, sublinhado)
   - Tagline: "DEFENSORIA INTELIGENTE"

2. **Ícone** (`/public/logo-icon.svg`)
   - Apenas o escudo com X
   - Uso: favicon, sidebar colapsada, mobile

3. **Favicon** (`/public/favicon.svg`)
   - Versão 32x32 do ícone
   - Otimizado para navegadores

### Simbolismo

- **Escudo**: Proteção, defesa, segurança jurídica
- **X**: 
  - Marca distintiva da marca INTELE**X**
  - Símbolo de precisão e excelência
  - Representa o cruzamento de conhecimento e estratégia
- **Verde-Esmeralda**: Sofisticação, confiança, crescimento, justiça

### Componentes de Logo

```tsx
import { Logo, SidebarLogo, AuthLogo } from "@/components/shared/logo";

// Logo completa
<Logo variant="full" size="md" href="/admin" />

// Apenas ícone
<Logo variant="icon" size="sm" />

// Logo para sidebar (adapta automaticamente)
<SidebarLogo collapsed={false} />

// Logo para páginas de autenticação
<AuthLogo />
```

---

## 🧩 Componentes Padronizados

### 1. DataTable - Sistema de Tabelas/Listas

Componente unificado para todas as listas do sistema.

```tsx
import { 
  DataTable, 
  DataList, 
  DataListItem,
  DataGrid, 
  DataCard,
  StatusBadge,
  FilterButton,
  EmptyState 
} from "@/components/shared/data-table";

// Exemplo: Lista com busca e filtros
<DataTable
  searchPlaceholder="Buscar processos..."
  searchValue={search}
  onSearchChange={setSearch}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  resultCount={filtered.length}
  filters={
    <>
      <FilterButton 
        label="Status" 
        value={status} 
        options={statusOptions}
        onChange={setStatus} 
      />
    </>
  }
  actions={
    <Button>
      <Plus className="w-4 h-4 mr-2" /> Novo
    </Button>
  }
>
  {/* Conteúdo: Lista, Grid ou Kanban */}
</DataTable>
```

**Views Disponíveis:**

```tsx
// Lista View
<DataList>
  <DataListItem highlight="prisoner">
    {/* Conteúdo da linha */}
  </DataListItem>
</DataList>

// Grid View
<DataGrid columns={3}>
  <DataCard highlight="urgent">
    {/* Conteúdo do card */}
  </DataCard>
</DataGrid>
```

**Status Badges:**

```tsx
<StatusBadge variant="urgent" icon={<AlertCircle />}>
  URGENTE
</StatusBadge>

// Variantes: urgent, warning, success, info, neutral, prisoner
```

**Empty State:**

```tsx
<EmptyState
  icon={FileText}
  title="Nenhum resultado encontrado"
  description="Tente ajustar os filtros de busca."
  action={{
    label: "Limpar Filtros",
    onClick: () => clearFilters()
  }}
/>
```

### 2. PageLayout - Estrutura de Páginas

Layout unificado para todas as páginas.

```tsx
import { PageLayout } from "@/components/shared/page-layout";
import { Briefcase } from "lucide-react";

<PageLayout
  header="Casos Ativos"
  description="Gestão completa de casos jurídicos"
  icon={Briefcase}
  actions={
    <Button>
      <Plus className="w-4 h-4 mr-2" /> Novo Caso
    </Button>
  }
  stats={
    <StatsGrid>
      {/* Cards de estatísticas */}
    </StatsGrid>
  }
  filters={
    <div className="flex gap-2">
      {/* Componentes de filtro */}
    </div>
  }
  maxWidth="2xl"
  compact={false}
>
  {/* Conteúdo principal */}
</PageLayout>
```

**Propriedades:**

- `header`: Título da página (h1)
- `description`: Descrição opcional
- `icon`: Ícone Lucide no cabeçalho
- `actions`: Botões de ação no canto superior direito
- `stats`: Barra de estatísticas abaixo do header
- `filters`: Área de filtros abaixo das stats
- `maxWidth`: sm | md | lg | xl | 2xl | full
- `compact`: Reduz espaçamentos internos

---

## 📐 Estrutura de Páginas

Todas as páginas seguem esta hierarquia padronizada:

```
┌─────────────────────────────────────────────┐
│ 1. CABEÇALHO ELEGANTE                       │
│    - Ícone + Título + Descrição             │
│    - Botões de ação (direita)               │
├─────────────────────────────────────────────┤
│ 2. BARRA DE ESTATÍSTICAS (opcional)         │
│    - Cards com métricas principais          │
├─────────────────────────────────────────────┤
│ 3. FILTROS E CONTROLES (opcional)           │
│    - Busca, filtros, ordenação              │
│    - Toggle de visualização (lista/grid)    │
├─────────────────────────────────────────────┤
│ 4. CONTEÚDO PRINCIPAL                       │
│    - Tabelas, cards, kanban, etc.           │
│    - Organizado em blocos visuais           │
└─────────────────────────────────────────────┘
```

### Exemplo Completo

```tsx
export default function CasosPage() {
  return (
    <PageLayout
      header="Casos Ativos"
      description="Dossiês completos com teoria do caso integrada"
      icon={Briefcase}
      actions={
        <Button>
          <Plus className="w-4 h-4 mr-2" /> Novo Caso
        </Button>
      }
      stats={
        <div className="grid grid-cols-5 gap-4">
          <StatsCard icon={Briefcase} value={45} label="Total" />
          <StatsCard icon={Lock} value={12} label="Réu Preso" variant="danger" />
          {/* ... mais stats */}
        </div>
      }
      filters={
        <div className="flex gap-2">
          <FilterButton label="Fase" {...} />
          <FilterButton label="Status" {...} />
        </div>
      }
    >
      <DataTable {...}>
        {/* Conteúdo */}
      </DataTable>
    </PageLayout>
  );
}
```

---

## 🎯 Guia de Uso

### Sombras (Shadows)

```css
/* Cards */
shadow-card          /* 0 1px 3px + 0 2px 8px - padrão */
shadow-card-hover    /* 0 4px 12px + 0 8px 24px - hover */

/* Elementos primários */
shadow-primary       /* Verde-esmeralda */
shadow-primary-lg

/* Float (modals, dropdowns) */
shadow-float         /* 0 12px 28px + 0 2px 8px */
```

### Bordas e Raios

```css
/* Border radius */
rounded-xl           /* 12px - padrão para cards */
rounded-lg           /* 8px - elementos menores */

/* Bordas */
border-border/60     /* Bordas padrão (60% opacidade) */
border-border/40     /* Bordas sutis */
border-border        /* Bordas plenas */
```

### Espaçamentos

```css
/* Padding interno de páginas */
p-4 sm:p-6 md:p-8    /* Padrão PageLayout */
p-4 sm:p-5 md:p-6    /* Compact mode */

/* Gap entre elementos */
space-y-6            /* Padrão entre seções */
space-y-4            /* Compact */
gap-4                /* Grid/Flex */
```

### Tipografia

```css
/* Títulos */
font-serif           /* Para títulos principais */
text-2xl md:text-3xl /* h1 */
text-xl md:text-2xl  /* h2 */

/* Corpo */
font-sans            /* Para textos gerais */
text-sm md:text-base /* Padrão */

/* Mono */
font-mono            /* Números de processo, datas */
```

### Classes Utilitárias Customizadas

```css
/* Status badges */
.status-badge-urgent
.status-badge-warning
.status-badge-success
.status-badge-info
.status-badge-neutral

/* Indicadores */
.prisoner-indicator
.prisoner-indicator-active

/* Containers */
.table-container
.custom-scrollbar
```

---

## ✅ Checklist de Padronização

Ao criar/atualizar uma página:

- [ ] Usa `PageLayout` com header, description e ações
- [ ] Tem ícone contextual (Lucide)
- [ ] Inclui barra de estatísticas (se aplicável)
- [ ] Usa `DataTable` para listas/tabelas
- [ ] Implementa busca e filtros padronizados
- [ ] Suporta múltiplas views (lista/grid/kanban)
- [ ] Usa `StatusBadge` para status
- [ ] Tem `EmptyState` para listas vazias
- [ ] Usa classes de cor do tema (não hardcoded)
- [ ] Respeita hierarquia de sombras
- [ ] Fontes corretas (serif/sans/mono)
- [ ] Espaçamentos consistentes (p-4, gap-4, etc)
- [ ] Responsivo (mobile-first)
- [ ] Modo escuro funcional

---

## 🚀 Próximos Passos

1. **Componentes em Desenvolvimento**
   - Stats Cards padronizados
   - Timeline component
   - Calendar/Date pickers
   - File upload component

2. **Páginas a Padronizar**
   - Dashboard principal
   - Processos
   - Assistidos
   - Audiências
   - Júri

3. **Melhorias Planejadas**
   - Animações de transição
   - Loading states
   - Error boundaries
   - Toast notifications

---

**Mantido por**: Equipe de Desenvolvimento INTELEX  
**Última atualização**: 21/01/2026
