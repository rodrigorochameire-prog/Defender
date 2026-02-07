# Padronização Visual Intelex - Swiss Design System

## 🎨 Reforma Visual Completa

Esta documentação descreve a reforma visual completa implementada no sistema Intelex, seguindo os princípios do Swiss Design System com identidade profissional e institucional.

## ✅ Componentes Criados

### 1. **DemandasView** (`src/components/demandas/demandas-view.tsx`)
- ✅ **Visualização Lista**: Tabela gamificada com cores de linha por status (Urgente, Protocolar, A Fazer, Monitorar, Fila, Concluído)
- ✅ **Visualização Grid**: Cards visuais para visualização rápida
- ✅ **Visualização Kanban**: Colunas por status com drag-and-drop visual
- ✅ **Ícone de Cadeado**: Substituição da badge "RÉU PRESO" por ícone minimalista 🔒
- ✅ **Filtros e Busca**: Sistema completo de filtros por status e busca

### 2. **EnhancedTimeline** (`src/components/casos/enhanced-timeline.tsx`)
- ✅ **Contexto de Processo**: Cada evento mostra claramente qual processo pertence
- ✅ **Contexto de Assistido**: Identificação visual do assistido em cada evento
- ✅ **Cores por Tipo**: Diferenciação visual (Júri, Execução, Criminal, Cível)
- ✅ **Design Responsivo**: Adaptado para mobile e desktop

### 3. **DonutChart** (`src/components/shared/donut-chart.tsx`)
- ✅ **SVG Puro**: Sem dependências externas, performance otimizada
- ✅ **Tamanhos Configuráveis**: sm, md, lg
- ✅ **Animações Suaves**: Transições elegantes
- ✅ **Tema Dark/Light**: Suporte completo a ambos os temas

### 4. **JuriTabsView** (`src/components/juri/juri-tabs-view.tsx`)
- ✅ **Cockpit (Plenário)**: Roteiro de sustentação e cronômetro
- ✅ **Investigação Defensiva**: Gestão de provas e evidências
- ✅ **Conselho de Sentença**: Perfil e estatísticas dos jurados
- ✅ **Teses & Quesitos**: Visualização das teses de defesa e acusação
- ✅ **Cabeçalho Unificado**: Informações do processo sempre visíveis

## 📄 Páginas Atualizadas

### 1. **Demandas** (`src/app/(dashboard)/admin/demandas/page.tsx`)
- ✅ Uso do novo componente `DemandasView`
- ✅ Sistema de visualizações (Lista/Grid/Kanban)
- ✅ Padronização com `PageLayout`

### 2. **Jurados** (`src/app/(dashboard)/admin/jurados/page.tsx`)
- ✅ Seção de **Inteligência Visual** com 3 gráficos:
  - Tendência de Absolvição
  - Composição de Gênero
  - Perfil Condenatório
- ✅ Cards de estatísticas padronizados
- ✅ Lista de jurados com perfilamento visual

### 3. **Júri Individual** (`src/app/(dashboard)/admin/juri/[id]/page.tsx`)
- ✅ Sistema de abas consolidado
- ✅ Navegação sem recarregar página
- ✅ Todas as funcionalidades em uma única view

## 🎯 Princípios de Design Aplicados

### Swiss Design System
- **Fundo da Aplicação**: `bg-stone-50` (light) / `bg-zinc-950` (dark)
- **Cards**: `bg-white` com sombras suaves (`shadow-sm`)
- **Bordas**: Sutis (`border-stone-200`), nunca pretas

### Tipografia
- **Títulos**: `Source Serif 4` - Elegância jurídica
- **Corpo/UI**: `Inter` - Legibilidade
- **Dados Técnicos**: `JetBrains Mono` - Precisão

### Paleta de Cores
- **Primária**: Verde Floresta/Emerald (`#059669`) - Ações principais
- **Texto**: `stone-900` (títulos), `stone-500` (metadados)
- **Cores Funcionais**:
  - Urgente/Erro: `red-50/red-700`
  - Atenção: `orange-50/orange-700`
  - Sucesso: `emerald-50/emerald-700`
  - Informação: `blue-50/blue-700`

### Escala de Fontes
❌ **Proibido**: `text-[10px]`, `text-[11px]`, `text-[13px]`
✅ **Permitido**: `text-xs`, `text-sm`, `text-base`, `text-lg`, etc.

## 📱 Responsividade

Todos os componentes foram otimizados para:
- **Mobile**: Padding `p-4`, stacks verticais
- **Desktop**: Padding `p-8`, max-width `1600px` centralizado
- **Tablets**: Breakpoints intermediários

## 🔧 Componentes Reutilizáveis

### SwissCard
```tsx
<SwissCard className="p-6">
  <SwissCardHeader>
    <SwissCardTitle>Título</SwissCardTitle>
  </SwissCardHeader>
  <SwissCardContent>
    Conteúdo
  </SwissCardContent>
</SwissCard>
```

### PageLayout
```tsx
<PageLayout
  header="Título da Página"
  description="Descrição opcional"
  actions={<Button>Ação</Button>}
>
  {children}
</PageLayout>
```

### PrisonerIndicator
```tsx
<PrisonerIndicator 
  preso={true} 
  localPrisao="CPP Salvador"
  size="sm" 
/>
```

## 🚀 Funcionalidades Implementadas

### Demandas
- [x] Visualização em Lista (planilha gamificada)
- [x] Visualização em Grid (cards visuais)
- [x] Visualização em Kanban (fluxo por status)
- [x] Cores de linha por urgência
- [x] Ícone de cadeado para réu preso
- [x] Filtros e busca avançada

### Jurados
- [x] Gráficos de inteligência (Donut Charts)
- [x] Tendência de absolvição
- [x] Composição de gênero
- [x] Perfil condenatório
- [x] Lista com perfilamento visual

### Júri
- [x] Sistema de abas consolidado
- [x] Cockpit (Plenário)
- [x] Investigação Defensiva
- [x] Conselho de Sentença
- [x] Teses & Quesitos
- [x] Cabeçalho com informações do processo

### Timeline
- [x] Contexto de processo por evento
- [x] Contexto de assistido por evento
- [x] Cores por tipo de processo
- [x] Design responsivo

## 📊 Impacto

### Antes
- ❌ Cada página com estilo diferente
- ❌ Magic numbers de fonte espalhados
- ❌ Badges de "PRESO" poluindo visualmente
- ❌ Timeline confusa sem contexto
- ❌ Júri fragmentado em várias páginas
- ❌ Demandas só em lista

### Depois
- ✅ Identidade visual única e consistente
- ✅ Escala tipográfica padronizada
- ✅ Ícones minimalistas para status prisional
- ✅ Timeline com contexto claro
- ✅ Júri consolidado em uma interface
- ✅ Demandas com 3 visualizações

## 🎓 Boas Práticas Adotadas

1. **Componentes Reutilizáveis**: SwissCard, PageLayout, DonutChart
2. **Design System Consistente**: Cores, fontes e espaçamentos padronizados
3. **Responsividade**: Mobile-first com breakpoints bem definidos
4. **Acessibilidade**: Contraste adequado e tooltips informativos
5. **Performance**: Componentes leves sem dependências desnecessárias
6. **Manutenibilidade**: Código organizado e documentado

## 📝 Notas de Implementação

- Todos os componentes seguem o padrão TypeScript com tipos bem definidos
- Uso consistente de `cn()` do `lib/utils` para classes condicionais
- Dark mode suportado em todos os componentes
- Animações suaves usando Tailwind transitions
- Ícones do Lucide React para consistência visual

## 🔮 Próximos Passos Sugeridos

1. Aplicar o mesmo padrão em todas as páginas restantes
2. Criar biblioteca de componentes Storybook
3. Implementar testes visuais
4. Documentar guia de estilo completo
5. Criar templates para novas páginas

---

**Criado em**: 21 de Janeiro de 2026  
**Sistema**: Intelex - Gabinete Digital  
**Design System**: Swiss Style - Minimalismo Institucional
