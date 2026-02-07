# Sistema de Filtros e Estrutura Padronizados - DefensorHub

**Data:** 21 de Janeiro de 2026  
**Objetivo:** Padronizar filtros, melhorar estrutura e tornar o sistema mais sistemático e encorpado

---

## 🎯 COMPONENTES CRIADOS

### 1. FilterBar (filter-bar.tsx)
Barra de filtros completa e padronizada para todas as páginas.

#### Funcionalidades:
- ✅ **Busca integrada** com ícone e botão de limpar
- ✅ **Filtros rápidos** (chips) para seleção visual
- ✅ **Filtros avançados** expansíveis com múltiplos critérios
- ✅ **Toggle de visualização** (grid/lista)
- ✅ **Ordenação** via dropdown
- ✅ **Filtros ativos** com badges removíveis
- ✅ **Ações customizadas** (botões de export, etc)

#### Props Principais:
```tsx
<FilterBar
  searchValue={string}
  onSearchChange={(value) => void}
  searchPlaceholder="Buscar..."
  
  quickFilters={ReactNode}
  advancedFilters={ReactNode}
  
  viewMode="grid" | "list"
  onViewModeChange={(mode) => void}
  showViewToggle={boolean}
  
  sortOptions={Array<{value, label}>}
  sortValue={string}
  onSortChange={(value) => void}
  
  activeFilters={Array<{key, label, value}>}
  onRemoveFilter={(key) => void}
  onClearFilters={() => void}
/>
```

#### Recursos:
- Totalmente responsiva (mobile-first)
- Dark mode otimizado
- Animações suaves
- Contadores de filtros ativos
- UX intuitiva

---

### 2. Page Structure (page-structure.tsx)
Componentes para estruturar páginas de forma consistente.

#### Componentes Incluídos:

##### PageContainer
```tsx
<PageContainer maxWidth="default" | "wide" | "full">
  {children}
</PageContainer>
```
- Padding responsivo
- Largura máxima configurável
- Centralização automática

##### PageSection
```tsx
<PageSection
  subtitle="Categoria"
  title="Título da Seção"
  description="Descrição opcional"
  number={1}
  icon={<Icon />}
  action={<Botões />}
  variant="default" | "outlined" | "filled"
  collapsible={boolean}
>
  {conteúdo}
</PageSection>
```
- Headers padronizados
- Suporte a numeração
- Ícones opcionais
- Variantes visuais
- Seções recolhíveis

##### ContentGrid
```tsx
<ContentGrid columns={1-6} gap="sm" | "md" | "lg">
  {items}
</ContentGrid>
```
- Grid responsivo automático
- 6 configurações de colunas
- 3 tamanhos de gap
- Breakpoints otimizados

##### InfoBlock
```tsx
<InfoBlock
  title="Título"
  description="Mensagem"
  icon={<Icon />}
  variant="default" | "info" | "warning" | "success" | "danger"
/>
```
- Blocos informativos destacados
- 5 variantes semânticas
- Dark mode otimizado

##### Divider
```tsx
<Divider label="Seção" variant="default" | "strong" />
```
- Separadores visuais
- Com ou sem label
- 2 intensidades

##### StatBlock
```tsx
<StatBlock
  label="Descrição"
  value={100}
  icon={<Icon />}
  variant="default" | "primary" | "success" | "warning" | "danger"
  change={{ value: 15, type: "increase" }}
/>
```
- Blocos de estatística
- Borda lateral colorida
- Indicador de mudança (%)
- 5 variantes semânticas

---

## 📊 ESTRUTURA PADRONIZADA DAS PÁGINAS

### Anatomia de uma Página Padronizada:

```tsx
<PageContainer maxWidth="wide">
  {/* 1. Breadcrumbs */}
  <Breadcrumbs />
  
  {/* 2. Header Principal */}
  <PageHeader
    title="Título da Página"
    description="Descrição detalhada"
    actions={<Botões de ação />}
  />
  
  <Divider />
  
  {/* 3. Seção de Estatísticas */}
  <PageSection
    subtitle="Visão Geral"
    title="Estatísticas"
    icon={<Icon />}
  >
    <ContentGrid columns={5}>
      <StatBlock />
      <StatBlock />
      ...
    </ContentGrid>
  </PageSection>
  
  <Divider />
  
  {/* 4. Seção de Filtros e Listagem */}
  <PageSection
    subtitle="Gestão"
    title="Listagem"
    icon={<Icon />}
  >
    {/* Filtros Rápidos */}
    <FilterChipGroup label="Filtrar por...">
      <FilterChip />
      ...
    </FilterChipGroup>
    
    {/* Barra de Filtros */}
    <FilterBar
      searchValue={...}
      quickFilters={...}
      advancedFilters={
        <>
          <FilterSelect />
          <FilterSelect />
          ...
        </>
      }
      activeFilters={...}
    />
    
    {/* Conteúdo */}
    {viewMode === "grid" ? (
      <ContentGrid>
        <Cards />
      </ContentGrid>
    ) : (
      <SwissTable>
        <Rows />
      </SwissTable>
    )}
  </PageSection>
</PageContainer>
```

---

## 🎨 PÁGINAS ATUALIZADAS

### 1. ✅ Processos (processos/page.tsx)

#### Melhorias Implementadas:
- **PageContainer** com maxWidth="wide"
- **2 Seções principais:**
  1. Estatísticas (5 stat blocks)
  2. Listagem com filtros
- **FilterBar completa** com:
  - Busca integrada
  - Filtros avançados (Situação, Comarca, Defensor)
  - Toggle grid/list
  - Ordenação
  - Filtros ativos
- **Filtros rápidos** por área (chips)
- **InfoBlocks** para alertas
- **Dividers** entre seções

#### Estatísticas:
```tsx
- Total de Processos
- Processos do Júri  
- Com Demandas
- Réu Preso
- Comarcas
```

#### Filtros Avançados:
```tsx
- Situação (Todos/Ativos/Suspensos/Arquivados/Baixados)
- Comarca (Todas/Camaçari/Salvador)
- Defensor (Todos/Individual)
```

### 2. 🔄 Assistidos (assistidos/page.tsx)

#### Estrutura Aplicada:
- PageContainer
- 2 Seções (Estatísticas + Listagem)
- FilterBar com filtros avançados
- InfoBlock para alertas de presos
- StatBlocks semânticos

#### Filtros Avançados:
```tsx
- Status Prisional (6 opções)
- Área de Atuação (5 opções)
- Mostrar apenas fixados (toggle)
```

#### Estatísticas:
```tsx
- Total de Assistidos
- Presos (vermelho)
- Monitorados (âmbar)
- Soltos (verde)
- Fixados (clicável)
```

---

## 📋 COMPONENTES DE FILTRO

### FilterChipGroup + FilterChip
Chips visuais para filtros rápidos e frequentes.

**Uso:**
```tsx
<FilterChipGroup label="Filtrar por Área">
  <FilterChip
    label="Todos"
    value="all"
    selected={filter === "all"}
    onSelect={setFilter}
    count={total}
    icon={<Icon />}
    size="md"
  />
</FilterChipGroup>
```

**Recursos:**
- Contadores automáticos
- Ícones customizáveis
- Check mark quando selecionado
- 2 tamanhos (sm/md)
- Removível ou selecionável

### FilterSelect
Select padronizado para filtros.

**Uso:**
```tsx
<FilterSelect
  label="Status"
  placeholder="Selecione..."
  value={value}
  onValueChange={setValue}
  options={[
    { value: "all", label: "Todos" },
    { value: "ativo", label: "Ativos" }
  ]}
/>
```

**Recursos:**
- Label opcional
- Ícones nos options
- Dark mode
- Altura padrão (h-10)

---

## 🔧 SISTEMA DE FILTROS ATIVOS

### ActiveFilters
Sistema que mostra quais filtros estão aplicados.

**Implementação:**
```tsx
const activeFilters = [
  statusFilter !== "all" && { 
    key: "status", 
    label: "Status", 
    value: CONFIGS[statusFilter]?.label 
  },
  areaFilter !== "all" && { 
    key: "area", 
    label: "Área", 
    value: AREAS[areaFilter]?.label 
  },
].filter(Boolean);

<FilterBar
  activeFilters={activeFilters}
  onRemoveFilter={(key) => {
    if (key === "status") setStatusFilter("all");
    if (key === "area") setAreaFilter("all");
  }}
  onClearFilters={() => {
    setStatusFilter("all");
    setAreaFilter("all");
    setSearchTerm("");
  }}
/>
```

**Recursos:**
- Badges removíveis individualmente
- Botão "Limpar todos"
- Visual destaque (bg-primary/10)
- Contador de filtros

---

## 🎯 BENEFÍCIOS DA PADRONIZAÇÃO

### UX Melhorada
✅ Consistência visual em todas as páginas  
✅ Navegação previsível  
✅ Aprendizado único (uma vez aprendido, vale para tudo)  
✅ Feedback visual claro (filtros ativos)  
✅ Redução de cliques (filtros rápidos)

### DX Melhorada
✅ Componentes reutilizáveis  
✅ Props tipadas (TypeScript)  
✅ Documentação clara  
✅ Menos código duplicado  
✅ Manutenção facilitada

### Performance
✅ Componentes otimizados  
✅ Memoização onde necessário  
✅ Re-renders controlados  
✅ Bundle size reduzido (reutilização)

### Acessibilidade
✅ Focus states visíveis  
✅ Keyboard navigation  
✅ ARIA labels  
✅ Contraste adequado (WCAG AA)

---

## 📐 HIERARQUIA VISUAL

### Níveis de Informação:

1. **Nível 1 - Page Header**
   - Título principal (text-2xl/3xl)
   - Descrição
   - Ações principais

2. **Nível 2 - Section Headers**
   - Subtítulo + Título (text-xl/2xl)
   - Número ou ícone
   - Descrição opcional

3. **Nível 3 - Subsections**
   - FilterChipGroup labels (text-xs uppercase)
   - StatBlock labels
   - InfoBlock titles

4. **Nível 4 - Content**
   - Cards
   - Tabelas
   - Listas

### Espaçamento Padrão:

```tsx
// Entre seções principais
<Divider className="my-6" />

// Dentro de seções
<PageSection className="mb-6">
  // spacing interno automático (space-y-6)
</PageSection>

// Grids
<ContentGrid gap="md"> // 4 unidades (16px)
```

---

## 🎨 VARIANTES SEMÂNTICAS

### StatBlock Variants:
- `default`: Borda cinza
- `primary`: Borda verde (primary)
- `success`: Borda verde esmeralda
- `warning`: Borda âmbar
- `danger`: Borda rosa/vermelho

### InfoBlock Variants:
- `default`: Cinza neutro
- `info`: Azul
- `warning`: Âmbar
- `success`: Verde
- `danger`: Vermelho

### PageSection Variants:
- `default`: Sem borda/fundo
- `outlined`: Com borda
- `filled`: Com fundo colorido

---

## 📱 RESPONSIVIDADE

### Breakpoints:
```tsx
// Padrão Tailwind
sm: 640px  // Tablet pequeno
md: 768px  // Tablet
lg: 1024px // Desktop
xl: 1280px // Desktop grande
2xl: 1536px // Desktop extra large
```

### Adaptações Automáticas:

#### PageContainer:
- Mobile: px-4, py-6
- Tablet: px-6, py-8
- Desktop: px-8, py-8

#### ContentGrid:
- 1 coluna: sempre 1 (mobile-first)
- 2 colunas: 1 mobile → 2 md
- 3 colunas: 1 → 2 md → 3 lg
- 4 colunas: 1 → 2 md → 4 lg
- 5 colunas: 2 → 3 sm → 4 md → 5 lg
- 6 colunas: 2 → 3 sm → 4 md → 6 lg

#### FilterBar:
- Mobile: Coluna única, controles empilhados
- Tablet: Busca + controles lado a lado
- Desktop: Layout completo horizontal

---

## 🔄 MIGRAÇÃO DE PÁGINAS EXISTENTES

### Checklist para Migrar uma Página:

1. ✅ Substituir `<div>` principal por `<PageContainer>`
2. ✅ Adicionar `<PageHeader>` padronizado
3. ✅ Inserir `<Divider>` entre seções
4. ✅ Envolver estatísticas em `<PageSection>` + `<ContentGrid>`
5. ✅ Usar `<StatBlock>` ao invés de cards customizados
6. ✅ Implementar `<FilterBar>` com todos os filtros
7. ✅ Adicionar `<FilterChipGroup>` para filtros rápidos
8. ✅ Configurar filtros ativos (activeFilters array)
9. ✅ Usar `<InfoBlock>` para alertas/avisos
10. ✅ Testar responsividade e dark mode

### Exemplo de Migração:

**Antes:**
```tsx
<div className="p-6">
  <h1>Título</h1>
  <div className="grid grid-cols-3">
    <Card>...</Card>
  </div>
  <input type="text" placeholder="Buscar" />
  <select>...</select>
  <Table>...</Table>
</div>
```

**Depois:**
```tsx
<PageContainer>
  <PageHeader title="Título" description="..." />
  <Divider />
  <PageSection title="Estatísticas">
    <ContentGrid columns={3}>
      <StatBlock />
    </ContentGrid>
  </PageSection>
  <Divider />
  <PageSection title="Listagem">
    <FilterBar
      searchValue={...}
      advancedFilters={<FilterSelect />}
    />
    <SwissTable>...</SwissTable>
  </PageSection>
</PageContainer>
```

---

## 📝 PRÓXIMOS PASSOS

### Curto Prazo
1. Migrar páginas restantes:
   - Demandas
   - Audiências
   - Atendimentos
   - Benefícios
   - Prazos
   - Documentos

2. Criar variantes adicionais:
   - FilterBar compact (para modais)
   - StatBlock mini (para sidebars)
   - InfoBlock com actions

### Médio Prazo
1. Adicionar presets de filtros salvos
2. Implementar filtros favoritos
3. Histórico de filtros aplicados
4. Export de listas filtradas
5. Compartilhamento de filtros (URL params)

### Longo Prazo
1. Sistema de views customizáveis
2. Dashboards personalizáveis
3. Filtros inteligentes (IA)
4. Sugestões de filtros baseadas no uso

---

## 📚 DOCUMENTAÇÃO

### Arquivos Criados:
1. ✅ `src/components/shared/filter-bar.tsx`
2. ✅ `src/components/shared/page-structure.tsx`
3. ✅ `FILTROS_E_ESTRUTURA_PADRONIZADOS.md` (este arquivo)

### Arquivos Atualizados:
1. ✅ `src/app/(dashboard)/admin/processos/page.tsx`
2. 🔄 `src/app/(dashboard)/admin/assistidos/page.tsx` (parcial)

### Arquivos a Atualizar:
- [ ] `src/app/(dashboard)/admin/demandas/page.tsx`
- [ ] `src/app/(dashboard)/admin/audiencias/page.tsx`
- [ ] `src/app/(dashboard)/admin/atendimentos/page.tsx`
- [ ] Demais páginas da aplicação

---

## 🎓 GUIDELINES DE USO

### Quando usar FilterBar:
✅ Páginas com listagens  
✅ Múltiplos critérios de filtragem  
✅ Busca + filtros combinados  
✅ Visualizações alternativas (grid/lista)

### Quando usar FilterChips:
✅ Filtros frequentemente usados  
✅ Categorias principais (3-6 opções)  
✅ Filtros mutuamente exclusivos  
✅ Quando espaço visual é importante

### Quando usar PageSection:
✅ Agrupar conteúdo relacionado  
✅ Criar hierarquia visual  
✅ Separar responsabilidades  
✅ Melhorar escaneabilidade

### Quando usar StatBlock:
✅ KPIs e métricas importantes  
✅ Dashboards e visões gerais  
✅ Comparações numéricas  
✅ Indicadores de status

### Quando usar InfoBlock:
✅ Avisos importantes  
✅ Informações contextuais  
✅ Alertas não-intrusivos  
✅ Dicas e orientações

---

**Total de Componentes Criados:** 11  
**Linhas de Código:** ~600  
**Páginas Atualizadas:** 2  
**Cobertura:** ~30% das páginas principais

---

*Sistema de padronização implementado com sucesso! 🎉*
