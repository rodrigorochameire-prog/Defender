# Padronização de Páginas - DefesaHub

## Visão Geral

Todas as páginas do sistema devem seguir a mesma estrutura visual, componentes e padrões de design para garantir consistência e profissionalismo.

## Estrutura Padrão de Página

### 1. Layout Container
```tsx
<PageContainer maxWidth="wide">
```

### 2. Breadcrumbs
```tsx
<Breadcrumbs className="mb-4" />
```

### 3. Page Header
```tsx
<PageHeader
  title="Título da Página"
  description="Descrição breve e informativa"
  actions={
    <div className="flex items-center gap-2">
      {/* Botões de ação */}
    </div>
  }
/>
```

### 4. Divider (opcional)
```tsx
<Divider className="my-6" />
```

### 5. Seções de Conteúdo

#### Estatísticas
```tsx
<PageSection
  subtitle="Visão Geral"
  title="Estatísticas"
  icon={<Target className="w-6 h-6" />}
  className="mb-6"
>
  <ContentGrid columns={5} gap="md">
    <StatBlock
      label="Total"
      value={100}
      icon={<Icon className="w-5 h-5" />}
      variant="default"
    />
  </ContentGrid>
</PageSection>
```

#### Filtros e Listagem
```tsx
<PageSection
  subtitle="Gestão"
  title="Listagem"
  icon={<FileText className="w-6 h-6" />}
>
  {/* Filtros por Chips */}
  <FilterChipGroup label="Filtrar por">
    <FilterChip
      label="Opção"
      value="valor"
      selected={filter === "valor"}
      onSelect={setFilter}
      count={10}
      icon={<Icon />}
      size="md"
    />
  </FilterChipGroup>

  {/* Barra de Filtros Principal */}
  <FilterBar
    searchValue={searchTerm}
    onSearchChange={setSearchTerm}
    searchPlaceholder="Buscar..."
    viewMode={viewMode}
    onViewModeChange={setViewMode}
    showViewToggle={true}
    sortOptions={[]}
    sortValue="recente"
    advancedFilters={<>...</>}
    activeFilters={activeFilters}
    onRemoveFilter={handleRemoveFilter}
    onClearFilters={handleClearFilters}
  />

  {/* Conteúdo */}
  {items.length === 0 ? (
    <EmptyState
      icon={Icon}
      title="Nenhum item encontrado"
      description="Ajuste os filtros ou crie um novo item."
      action={{
        label: "Novo Item",
        onClick: () => {},
        icon: Plus,
      }}
      variant={searchTerm ? "search" : "default"}
    />
  ) : viewMode === "grid" ? (
    <ContentGrid columns={3} gap="md">
      {items.map(item => <ItemCard key={item.id} item={item} />)}
    </ContentGrid>
  ) : (
    <SwissTableContainer>
      <SwissTable>
        {/* Tabela */}
      </SwissTable>
    </SwissTableContainer>
  )}
</PageSection>
```

## Componentes Padrão

### Cores e Badges

#### Status Badges (Funcional)
- **Urgente/Erro**: `status-badge-urgent` - Vermelho
- **Atenção/Aviso**: `status-badge-warning` - Laranja/Âmbar
- **Sucesso/Concluído**: `status-badge-success` - Verde
- **Informação**: `status-badge-info` - Azul
- **Neutro**: `status-badge-neutral` - Cinza

#### Área/Atribuição (Neutro)
- Usar `area-badge` - sempre cinza neutro
- Não colorir por tipo de atribuição

### Tipografia

#### Títulos e Textos
- Títulos principais: `h1` (text-2xl md:text-3xl)
- Subtítulos: `h2` (text-xl md:text-2xl)
- Seções: `h3` (text-lg md:text-xl)
- Corpo: `p` (text-sm md:text-base)

#### Fontes Especiais
- **Números de processo**: `font-mono` ou classe `process-number`
- **Texto legal**: `font-legal` (fonte serifada)
- **Dados/métricas**: `font-data` (monoespaciada)

### Cards e Containers

#### Swiss Card (Principal)
```tsx
<SwissCard className="...">
  <SwissCardContent>
    {/* Conteúdo */}
  </SwissCardContent>
</SwissCard>
```

#### Card Padrão
```tsx
<Card className="border border-border/60 bg-card">
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Conteúdo */}
  </CardContent>
</Card>
```

### Bordas Semânticas

#### Réu Preso
```tsx
className="border-semantic-prisoner" 
// border-l-[3px] border-l-rose-500
```

#### Livre
```tsx
className="border-semantic-free"
// border-l-[3px] border-l-zinc-300
```

### Indicadores

#### Prisional
```tsx
<PrisonerIndicator 
  preso={isPreso} 
  localPrisao={local}
  size="sm"
  showTooltip={true}
/>
```

### Tabelas

#### Swiss Table
```tsx
<SwissTableContainer className="max-h-[calc(100vh-400px)]">
  <SwissTable>
    <SwissTableHeader>
      <SwissTableRow>
        <SwissTableHead>Coluna</SwissTableHead>
      </SwissTableRow>
    </SwissTableHeader>
    <SwissTableBody>
      <SwissTableRow className={cn(
        "group transition-colors",
        isPreso && "border-semantic-prisoner"
      )}>
        <SwissTableCell>Conteúdo</SwissTableCell>
      </SwissTableRow>
    </SwissTableBody>
  </SwissTable>
</SwissTableContainer>
```

## Padrões de Estado

### Loading
```tsx
<Skeleton className="h-10 w-full" />
```

### Empty State
```tsx
<EmptyState
  icon={Icon}
  title="Nenhum item"
  description="Descrição do estado vazio"
  action={{ label: "Ação", onClick: () => {} }}
/>
```

### Error State
```tsx
<div className="flex items-center gap-2 text-destructive">
  <AlertTriangle className="w-5 h-5" />
  <p>Erro ao carregar dados</p>
</div>
```

## Responsividade

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Classes Responsivas
```tsx
className="text-sm md:text-base lg:text-lg"
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
className="hidden sm:flex"
className="flex-col md:flex-row"
```

## Acessibilidade

1. **Sempre incluir labels em inputs**
2. **Usar tooltips para ícones de ação**
3. **Cores com contraste adequado** (seguir WCAG 2.1)
4. **Textos alternativos em imagens**
5. **Navegação por teclado funcional**

## Checklist de Padronização

- [ ] Usa `PageContainer` como container principal
- [ ] Inclui `Breadcrumbs`
- [ ] Usa `PageHeader` com título e descrição
- [ ] Seções organizadas com `PageSection`
- [ ] Estatísticas com `StatBlock` em `ContentGrid`
- [ ] Filtros usando `FilterChipGroup` e `FilterBar`
- [ ] Grid de conteúdo com `ContentGrid` ou tabela com `SwissTable`
- [ ] Estado vazio com `EmptyState`
- [ ] Badges seguem padrão funcional (não coloridos por tipo)
- [ ] Bordas semânticas para réu preso
- [ ] Tipografia adequada (mono para processos, legal para leis)
- [ ] Responsivo (mobile-first)
- [ ] Acessível (tooltips, labels, contraste)

## Exemplo Completo

Ver: 
- `/src/app/(dashboard)/admin/processos/page.tsx`
- `/src/app/(dashboard)/admin/assistidos/page.tsx`

Estas páginas servem como referência completa de implementação.
