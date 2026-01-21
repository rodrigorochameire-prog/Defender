# 🎨 Guia de Design Premium - Defender

## 🌟 Filosofia de Design

**Inspiração**: Linear + Attio + Notion  
**Estilo**: Swiss Design (Minimalista, Preciso, Funcional)  
**Objetivo**: Ferramenta profissional de alta performance

---

## 🎯 REFERÊNCIAS VISUAIS IMPLEMENTADAS

### 1. **Linear** - Padrão Ouro do Swiss Style Moderno

✅ **O que aplicamos**:
- **Bordas ultra sutis** - `border-border/50` (quase invisíveis)
- **Sombras precisas** - Sem sombras pesadas, apenas contornos
- **Tipografia mono** - Dados numéricos em font-mono
- **Background off-white** - `#FCFCFC` em vez de branco puro
- **Cores desaturadas** - Profissionais, não vibrantes
- **Radius menor** - 8px (rounded-lg) em vez de 12px
- **Hover states sutis** - Transições de 100-150ms
- **Command Palette** - Centro da navegação

**Visual Linear**:
```
┌────────────────────────────────────┐
│ ··························         │ ← Bordas quase invisíveis
│ Conteúdo com tipografia precisa    │
│ Hover: apenas mudança de borda     │
└────────────────────────────────────┘
```

### 2. **Attio** - CRM Moderno

✅ **O que aplicamos**:
- **DataTable híbrida** - Parece spreadsheet moderna
- **Cells especializadas** - Mono, Badge, Actions
- **Hover actions** - Aparecem apenas no hover
- **Seleção com borda lateral** - Indicador visual claro
- **Pills coloridas** - Status em badges pastéis
- **Sticky headers** - Headers fixos com backdrop-blur

**Visual Attio**:
```
┌────────────────────────────────────┐
│ NOME       | STATUS  | AÇÕES       │ ← Sticky header
├────────────────────────────────────┤
│ João Silva | ● Ativo | [👁️] [✏️]    │ ← Hover actions
└────────────────────────────────────┘
```

### 3. **Notion/Reflect** - Documentos

✅ **O que aplicamos**:
- **Modo foco** - Sidebar colapsa totalmente
- **Font serif** - Para documentos jurídicos
- **Background off-white** - Para leitura longa
- **Timeline elegante** - Para histórico processual
- **Espaçamento respirável** - Entre blocos de texto

---

## 🎨 PALETA DE CORES PROFISSIONAL

### Background System (Estilo Linear)

```css
/* NÃO use branco puro #FFFFFF */
--background: #FCFCFC  /* Off-white suave */
--card: #FFFFFF        /* Branco puro APENAS para cards */
--muted: #F7F7F7       /* Cinza quase branco */
```

**Hierarquia de Fundos**:
1. **App Background**: `#FCFCFC` (off-white)
2. **Cards**: `#FFFFFF` (branco puro)
3. **Muted areas**: `#F7F7F7` (cinza claro)
4. **Hover**: `#F5F5F5` (cinza um pouco mais escuro)

### Cores Funcionais (Desaturadas)

```css
/* Verde Esmeralda - Primária */
--primary: hsl(162, 48%, 32%)  /* Desaturado, maduro */

/* Semantic - TODAS desaturadas */
--success: hsl(162, 48%, 38%)   /* Verde profissional */
--destructive: hsl(0, 55%, 50%) /* Vermelho controlado */
--warning: hsl(38, 85%, 52%)    /* Laranja queimado */
--info: hsl(210, 80%, 50%)      /* Azul corporativo */
```

**Cores para Status** (Estilo Linear):
- 🔴 **Crítico**: Rose 500 (desaturado)
- 🟠 **Urgente**: Orange 500 (desaturado)
- 🟡 **Atenção**: Amber 500 (desaturado)
- 🔵 **Info**: Blue 500 (desaturado)
- 🟢 **Concluído**: Emerald 500 (desaturado)
- ⚫ **Neutro**: Zinc 400

### Bordas (Ultra Sutis)

```css
--border: hsl(240, 6%, 92%)  /* Quase invisível */
```

**Uso**:
- Padrão: `border-border/50` (50% opacidade)
- Hover: `border-border` (100% opacidade)
- Selected: `border-primary/50`

---

## 🔤 TIPOGRAFIA SEMÂNTICA

### Sistema de 3 Fontes

```tsx
/* 1. SANS-SERIF - Interface (Inter/Geist Sans) */
font-sans → Headings, UI, Navegação
className="font-sans"

/* 2. SERIF - Documentos Jurídicos (Merriweather/Newsreader) */
font-serif → Peças, Sentenças, Documentos formais
className="font-serif" ou className="font-legal"

/* 3. MONOSPACE - Dados Precisos (JetBrains Mono) */
font-mono → Números de processo, datas, prazos, IDs
className="font-mono" ou className="font-data"
```

### Aplicação Prática

```tsx
// Número de processo
<span className="font-mono text-sm text-muted-foreground">
  8012906-74.2025.8.05.0039
</span>

// Título de caso
<h2 className="font-serif text-xl font-semibold">
  Homicídio Qualificado - Operação Reuso
</h2>

// UI geral
<p className="font-sans text-sm">
  Gerenciamento de processos
</p>
```

---

## 🧩 COMPONENTES PREMIUM CRIADOS

### 1. **StatusIndicator** - Dot Pulsante

```tsx
<StatusIndicator 
  status="critical"
  label="Réu Preso"
  pulsing={true}
  size="sm"
/>
```

**Status disponíveis**:
- `critical` - Vermelho pulsante
- `urgent` - Laranja pulsante
- `warning` - Amarelo
- `info` - Azul
- `success` - Verde
- `neutral` - Cinza

**Uso**: Réu preso, prazo vencido, demanda urgente

### 2. **DataTable** - Tabela Estilo Attio

```tsx
<DataTable>
  <DataTableHeader>
    <tr>
      <DataTableCell header>Nome</DataTableCell>
      <DataTableCell header>Status</DataTableCell>
      <DataTableCell header align="right">Ações</DataTableCell>
    </tr>
  </DataTableHeader>
  <DataTableBody>
    <DataTableRow selected={false}>
      <DataTableCell>João Silva</DataTableCell>
      <DataTableCellBadge>Ativo</DataTableCellBadge>
      <DataTableCell align="right">
        <DataTableActions>
          <Button size="sm">Ver</Button>
        </DataTableActions>
      </DataTableCell>
    </DataTableRow>
  </DataTableBody>
</DataTable>
```

**Características**:
- Sticky header com backdrop-blur
- Hover state em toda a row
- Border lateral quando selected
- Actions aparecem no hover
- Cells especializadas (Mono, Badge)

### 3. **Timeline** - Linha do Tempo Vertical

```tsx
<Timeline>
  <TimelineItem
    timestamp="15/01/2026"
    icon={<Gavel />}
    completed={true}
  >
    <p>Recebimento da denúncia</p>
  </TimelineItem>
  
  <TimelineItem
    timestamp="22/01/2026"
    icon={<Scale />}
    current={true}
  >
    <p>Resposta à acusação - EM ANDAMENTO</p>
  </TimelineItem>
</Timeline>
```

**Características**:
- Linha conectora vertical
- Ícones em círculos
- Completed: checkmark verde
- Current: pulsante azul
- Timestamp em mono

### 4. **TimelineDual** - Defesa vs Acusação

```tsx
<TimelineDual>
  <TimelineDualItem
    side="left"
    label="DEFESA"
    timestamp="10/01/2026"
    icon={<Shield />}
  >
    <p>Alegações preliminares...</p>
  </TimelineDualItem>
  
  <TimelineDualItem
    side="right"
    label="ACUSAÇÃO"
    timestamp="12/01/2026"
    icon={<Swords />}
  >
    <p>Contrarrazões...</p>
  </TimelineDualItem>
</TimelineDual>
```

**Visual**:
```
[Defesa]     ●━━━━●     [Acusação]
           │     │
         Verde  Vermelho
```

### 5. **PremiumCard** - Card Estilo Linear

```tsx
<PremiumCard
  selected={active}
  hoverable={true}
  padding="md"
  onClick={() => {}}
>
  <PremiumCardHeader
    title="Caso #123"
    subtitle="Homicídio Qualificado"
    icon={<Gavel />}
    actions={<Button variant="ghost" size="icon">...</Button>}
  />
  <PremiumCardContent>
    {/* Conteúdo */}
  </PremiumCardContent>
  <PremiumCardFooter>
    <span>Última atualização: Hoje</span>
  </PremiumCardFooter>
</PremiumCard>
```

**Características**:
- Bordas ultra sutis
- Hover: apenas mudança de borda
- Selected: border-primary + fundo 2%
- Sem sombras pesadas

---

## 🎨 MELHORIAS ESTRUTURAIS

### 1. **Radius Reduzido** - Mais Preciso

**ANTES**: `--radius: 0.75rem` (12px)  
**DEPOIS**: `--radius: 0.5rem` (8px)

**Efeito**: Visual mais técnico e profissional

### 2. **Sombras Estilo Linear**

```css
/* ANTES - Sombras soft demais */
shadow-soft: '0 1px 3px rgba(0, 0, 0, 0.05)'

/* DEPOIS - Sombras precisas com contorno */
shadow-card: '0 0 0 1px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.04)'
```

**Conceito**: Contorno + elevação mínima

### 3. **Fundos Organizacionais**

Todas as áreas principais agora têm fundos sutis:

```tsx
// Page Header
bg-gradient-to-r from-muted/30 via-muted/10 to-transparent

// Section Header  
bg-muted/20

// Filter Tabs
bg-muted/10

// Stats Container
bg-muted/10 border-2 border-border/30
```

**Efeito**: Hierarquia visual clara sem poluição

### 4. **Espaçamentos Reduzidos**

```css
page-spacing:    6-8   (antes: 10-16)
section-spacing: 5-6   (antes: 6-8)
card-spacing:    3-4   (antes: 4-6)
compact-spacing: 2-3   (antes: 3-4)
```

**Resultado**: 30-40% mais conteúdo visível

---

## 📱 SIDEBAR FLUTUANTE (Próxima Melhoria)

### Conceito

Em vez de sidebar grudada na borda:

**ANTES**:
```
│Sidebar│Conteúdo           │
└──────┴──────────────────┘
```

**DEPOIS**:
```
  ┌─────┐
  │Side │  Conteúdo
  │ bar │
  └─────┘
```

**Implementação**:
```css
/* No container da sidebar */
.sidebar-floating {
  margin: 8px;
  border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.04);
}
```

---

## 🎭 MODO FOCO (Para Redação)

### Conceito

Quando editando peças jurídicas:
- Sidebar colapsa completamente
- Toolbar minimalista
- Editor centralizado (max-width: 800px)
- Fundo off-white
- Font serif para o corpo

**Implementação**:
```tsx
<div className="min-h-screen bg-background flex items-center justify-center p-8">
  <div className="max-w-[800px] w-full bg-card rounded-lg shadow-card p-12">
    <div className="font-serif prose prose-lg">
      {/* Editor de texto */}
    </div>
  </div>
</div>
```

---

## 🎨 SISTEMA DE CORES CONTEXTUAL

### Para Réu Preso (Crítico)

```tsx
<StatusIndicator status="critical" label="Réu Preso" pulsing={true} />
```

**Visual**:
```
● Réu Preso
↑ Pulsa (animate-ping-slow)
```

### Para Prazos

```tsx
// Vencido
<StatusBadge status="critical" label="Vencido" pulsing={true} />

// Hoje
<StatusBadge status="urgent" label="Hoje" pulsing={true} />

// Amanhã
<StatusBadge status="warning" label="Amanhã" />

// 7 dias
<StatusBadge status="info" label="7 dias" />
```

---

## 📋 COMPONENTES DISPONÍVEIS

### Novos Componentes Premium

1. ✅ **StatusIndicator** - Dot pulsante
2. ✅ **StatusBadge** - Badge com indicator
3. ✅ **DataTable** - Tabela estilo Attio
4. ✅ **DataTableActions** - Ações no hover
5. ✅ **Timeline** - Linha do tempo vertical
6. ✅ **TimelineDual** - Defesa vs Acusação
7. ✅ **PremiumCard** - Card estilo Linear
8. ✅ **CardGroup** - Grupo de cards

### Componentes Melhorados

1. ✅ **FilterTabs** - Tabs minimalistas
2. ✅ **PageHeader** - Com gradiente
3. ✅ **SectionHeader** - Com fundo
4. ✅ **StatBlock** - Proporcionais
5. ✅ **Divider** - Com pill

---

## 🎯 APLICAÇÃO PRÁTICA

### Exemplo: Página de Processos

```tsx
<PageContainer>
  <Breadcrumbs />
  
  {/* Header com gradiente */}
  <PageHeader
    title="Processos"
    description="Gerenciamento integrado"
    actions={<Button>Novo</Button>}
  />
  
  {/* Stats em container */}
  <div className="bg-muted/10 border-2 border-border/30 rounded-xl p-4">
    <StatsGrid columns={5}>
      <StatsCard label="Total" value={100} />
    </StatsGrid>
  </div>
  
  {/* Filter Tabs */}
  <FilterTabsGroup label="Filtrar por Área">
    <FilterTab label="Todos" value="all" count={100} />
  </FilterTabsGroup>
  
  {/* DataTable estilo Attio */}
  <DataTable>
    <DataTableHeader>...</DataTableHeader>
    <DataTableBody>
      <DataTableRow>
        <DataTableCellMono>8012906-74...</DataTableCellMono>
        <DataTableCell>João Silva</DataTableCell>
        <DataTableCellBadge>
          <StatusIndicator status="critical" pulsing />
          Réu Preso
        </DataTableCellBadge>
      </DataTableRow>
    </DataTableBody>
  </DataTable>
</PageContainer>
```

### Exemplo: Timeline Processual

```tsx
<Timeline>
  <TimelineItem
    timestamp="10/01/2026"
    icon={<FileText />}
    completed={true}
  >
    <h4 className="font-semibold">Denúncia Oferecida</h4>
    <p className="text-sm text-muted-foreground mt-1">
      MP ofereceu denúncia por homicídio qualificado
    </p>
  </TimelineItem>
  
  <TimelineItem
    timestamp="15/01/2026"
    icon={<Gavel />}
    completed={true}
  >
    <h4 className="font-semibold">Denúncia Recebida</h4>
    <p className="text-sm text-muted-foreground mt-1">
      Juiz recebeu a denúncia
    </p>
  </TimelineItem>
  
  <TimelineItem
    timestamp="22/01/2026"
    icon={<Shield />}
    current={true}
  >
    <h4 className="font-semibold">Resposta à Acusação</h4>
    <p className="text-sm text-muted-foreground mt-1">
      Prazo: Hoje - EM ANDAMENTO
    </p>
  </TimelineItem>
</Timeline>
```

---

## 🎨 BENTO GRID (Para Dashboard/Cockpit)

### Conceito

Grid assimétrico que prioriza informação crítica:

```tsx
<div className="grid grid-cols-12 gap-4">
  {/* Bloco grande - Cronômetro */}
  <div className="col-span-8 row-span-2">
    <PremiumCard padding="lg">
      <h1 className="text-6xl font-mono font-bold">02:45:30</h1>
      <p>Tempo de fala restante</p>
    </PremiumCard>
  </div>
  
  {/* Blocos médios */}
  <div className="col-span-4">
    <PremiumCard>Testemunhas</PremiumCard>
  </div>
  <div className="col-span-4">
    <PremiumCard>Quesitos</PremiumCard>
  </div>
  
  {/* Blocos pequenos */}
  <div className="col-span-3">
    <StatBlock label="Prova" value="12" />
  </div>
  {/* ... */}
</div>
```

---

## 🎯 PRÓXIMOS PASSOS RECOMENDADOS

### Imediato (Alto Impacto)

1. ✅ **Paleta desaturada** - Cores profissionais
2. ✅ **Radius menor** - 8px em vez de 12px
3. ✅ **Sombras Linear** - Contorno + elevação mínima
4. ✅ **StatusIndicator** - Em réu preso e prazos
5. ✅ **DataTable** - Em processos e assistidos

### Curto Prazo

6. **Sidebar flutuante** - Desgrudar da borda
7. **Modo foco** - Para redação de peças
8. **Bento Grid** - No cockpit do júri
9. **Document preview cards** - Para lista de arquivos
10. **Command Palette melhorado** - Centro da navegação

### Médio Prazo

11. **Drag & drop** - Para organizar casos
12. **Keyboard shortcuts** - Navegação rápida
13. **Inline editing** - Editar sem abrir modal
14. **Multi-select** - Ações em lote
15. **Quick actions** - Menu de contexto

---

## 📐 GRID SYSTEM

### Layout Principal

```css
/* Container máximo */
max-w-[1600px]

/* Grid padrão */
grid-cols-12 gap-4

/* Responsivo */
cols-1 md:cols-2 lg:cols-3
```

### Breakpoints

```css
sm: 640px   /* Tablet portrait */
md: 768px   /* Tablet landscape */
lg: 1024px  /* Desktop */
xl: 1280px  /* Desktop large */
2xl: 1536px /* Desktop XL */
```

---

## ✨ ANIMAÇÕES PREMIUM

### Novas Animações

```css
animate-pulse-slow    /* Pulse suave (3s) */
animate-ping-slow     /* Ping expandindo (2s) */
animate-shimmer       /* Efeito shimmer em loading */
```

### Uso

```tsx
// Réu preso
<div className="animate-ping-slow bg-rose-400" />

// Loading state
<div className="animate-shimmer bg-gradient-to-r from-muted via-background to-muted" />
```

---

## 🎨 EXEMPLOS DE APLICAÇÃO

### Card de Processo (Estilo Linear)

```tsx
<PremiumCard hoverable selected={active}>
  <PremiumCardHeader
    title="8012906-74.2025.8.05.0039"
    subtitle="Homicídio Qualificado"
    icon={<Scale />}
    actions={
      <Button variant="ghost" size="icon">
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    }
  />
  
  <PremiumCardContent>
    <div className="flex items-center gap-2">
      <StatusIndicator status="critical" pulsing label="Réu Preso" />
    </div>
    
    <div className="space-y-2 mt-4">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Assistido</span>
        <span className="font-medium">Diego Bonfim</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Próximo prazo</span>
        <span className="font-mono text-rose-600">Hoje</span>
      </div>
    </div>
  </PremiumCardContent>
  
  <PremiumCardFooter>
    <span className="text-xs text-muted-foreground">
      Atualizado há 2h
    </span>
    <Button size="sm" variant="outline">Ver detalhes</Button>
  </PremiumCardFooter>
</PremiumCard>
```

---

## 📚 DOCUMENTAÇÃO

### Arquivos Criados

- `GUIA_DESIGN_PREMIUM.md` - Este documento
- `src/components/shared/status-indicator.tsx` - Indicadores
- `src/components/shared/data-table.tsx` - Tabela premium
- `src/components/shared/timeline.tsx` - Timeline
- `src/components/shared/premium-card.tsx` - Cards Linear

### Arquivos Atualizados

- `tailwind.config.ts` - Sombras e animações
- `src/app/globals.css` - Cores desaturadas

---

## 🎯 FILOSOFIA DE USO

### Quando Usar Cada Componente

**StatusIndicator**:
- ✅ Réu preso (pulsing)
- ✅ Prazo vencido (pulsing)
- ✅ Demanda urgente
- ✅ Processo ativo

**DataTable**:
- ✅ Lista de processos
- ✅ Lista de assistidos
- ✅ Lista de demandas
- ✅ Qualquer tabela com muitas colunas

**Timeline**:
- ✅ Histórico processual
- ✅ Linha do tempo do caso
- ✅ Eventos cronológicos

**PremiumCard**:
- ✅ Cards de casos
- ✅ Cards de assistidos
- ✅ Cards de processos
- ✅ Dashboards

---

**Resultado**: Sistema visual de classe mundial inspirado nas melhores ferramentas de produtividade do mercado! 🚀

**Próximo passo**: Implementar nas páginas principais?
