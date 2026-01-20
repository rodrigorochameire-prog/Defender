# 🎨 Guia Completo de Padronização - Defender

## 📊 Diagnóstico Atual

Após análise profunda de toda a aplicação, identificamos os seguintes problemas de inconsistência:

### ❌ Problemas Encontrados

#### 1. **Carnaval de Containers**
- ❌ Algumas páginas usam `<Card>` direto do shadcn
- ❌ Outras usam `<SwissCard>` do shared
- ❌ Outras ainda usam `<div className="bg-white...">` soltas
- ❌ Cores de fundo variam: `bg-white`, `bg-stone-50`, `bg-blue-50`, `bg-zinc-100`
- **Impacto**: Usuário não sente que está no mesmo app

#### 2. **Múltiplas Implementações de PageHeader**
- ❌ `<PageHeader>` no `section-header.tsx`
- ❌ `<PageHeader>` no `page-header.tsx`
- ❌ `<PageLayout>` no `page-layout.tsx`
- ❌ Alguns fazem header manual com divs
- **Impacto**: Cada página tem um visual diferente

#### 3. **Badges Agressivas** 
- ❌ Tag "RÉU PRESO" em `bg-red-500 text-white` (solid pesado)
- ❌ Outras badges com cores fortes demais
- **Impacto**: Desconforto visual e ruído cognitivo

#### 4. **Filtros Desconexos**
- ❌ Cada página implementa filtros de forma diferente
- ❌ Não há posição fixa para filtros
- ❌ AssignmentSwitcher às vezes aparece na página, às vezes não
- **Impacto**: Confusão sobre onde o usuário está

#### 5. **Excesso de Cores**
- ❌ Uso de 10+ cores diferentes em backgrounds
- ❌ Gradientes variados
- ❌ Verde usado em demasia (perdendo significado)
- **Impacto**: Despersonalização e perda de hierarquia

---

## ✅ Solução: Design System Unificado

### 🎯 Princípios do "Minimalismo Institucional"

1. **Regra do Papel Branco**: TODOS os cards de conteúdo são brancos sobre fundo stone-50
2. **Regra do Verde**: Verde só em botões primários, links ativos e ícones de destaque
3. **Regra do Outline**: Badges SEMPRE outline (borda colorida + fundo claro)
4. **Regra da Hierarquia**: Uma única estrutura de página para TUDO
5. **Regra da Semiótica**: Ícones > Texto (cadeado > "RÉU PRESO")

---

## 🏗️ Arquitetura de Componentes

### 📦 1. Container Universal: `SwissCard`

**Localização**: `src/components/ui/swiss-card.tsx`

```tsx
// SEMPRE usar este componente para QUALQUER container de conteúdo
<SwissCard>
  <SwissCardHeader>
    <SwissCardTitle>Título</SwissCardTitle>
    <SwissCardDescription>Descrição</SwissCardDescription>
  </SwissCardHeader>
  <SwissCardContent>
    {/* Conteúdo aqui */}
  </SwissCardContent>
</SwissCard>
```

**Características**:
- `bg-white` SEMPRE (contraste com stone-50)
- `border-stone-200` (nunca preta)
- `shadow-sm` (leve)
- `rounded-xl` (moderno mas profissional)

### 📄 2. Wrapper Universal: `PageWrapper`

**Localização**: `src/components/layouts/page-wrapper.tsx` (NOVO)

```tsx
<PageWrapper
  title="Assistidos"
  description="Gerencie seus assistidos..."
  icon={Users}
  actions={<Button>Nova Pessoa</Button>}
  breadcrumbs={[
    { label: "Dashboard", href: "/admin" },
    { label: "Assistidos" }
  ]}
>
  {/* Conteúdo da página aqui */}
</PageWrapper>
```

**O que ele faz**:
- ✅ Define o padding padrão (p-6 md:p-8)
- ✅ Cria o header unificado com border-bottom
- ✅ Posiciona breadcrumbs consistentemente
- ✅ Espaçamento vertical fixo (space-y-6)
- ✅ Max-width centralizado (1600px)

### 🔖 3. Badge Padronizada

**Localização**: `src/components/ui/badge.tsx` (ATUALIZAR)

```tsx
// ❌ NUNCA MAIS FAÇA ISSO
<Badge className="bg-red-500 text-white">PRESO</Badge>

// ✅ SEMPRE FAÇA ASSIM
<Badge variant="danger">Urgente</Badge>
<PrisonerIndicator isPrisoner={true} /> {/* Para status prisional */}
```

**Variantes permitidas**:
- `danger` → `bg-red-50 text-red-700 border-red-200`
- `warning` → `bg-orange-50 text-orange-700 border-orange-200`
- `info` → `bg-blue-50 text-blue-700 border-blue-200`
- `success` → `bg-emerald-50 text-emerald-700 border-emerald-200`
- `neutral` → `bg-stone-100 text-stone-600 border-stone-200`

### 🔒 4. Indicador de Prisão

**Localização**: `src/components/shared/prisoner-indicator.tsx` (JÁ EXISTE)

```tsx
// ✅ Use sempre que precisar indicar réu preso
<PrisonerIndicator 
  preso={assistido.preso}
  localPrisao={assistido.localPrisao}
  size="sm"
/>
```

**Aparência**: Ícone de cadeado discreto em círculo vermelho suave

### 🎛️ 5. Barra de Filtros

**Localização**: `src/components/shared/filter-bar.tsx` (NOVO)

```tsx
<FilterBar>
  <SearchInput placeholder="Buscar..." />
  <FilterSelect 
    label="Status" 
    options={statusOptions}
  />
  <FilterSelect 
    label="Comarca" 
    options={comarcaOptions}
  />
</FilterBar>
```

**Design**:
- Fundo `bg-stone-100/50` (muito sutil)
- Border `border-stone-200`
- Altura fixa `h-14`
- Espaçamento interno consistente

---

## 📐 Estrutura Padrão de Página

### Anatomia Universal

```tsx
<PageWrapper
  title="[Nome da Seção]"
  description="[Descrição curta]"
  icon={IconComponent}
  actions={
    <>
      <Button variant="outline">Exportar</Button>
      <Button>Nova [Entidade]</Button>
    </>
  }
  breadcrumbs={[...]}
>
  {/* 1. Métricas (opcional) */}
  <StatsGrid>
    <StatsCard ... />
  </StatsGrid>

  {/* 2. Filtros (se necessário) */}
  <FilterBar>
    ...
  </FilterBar>

  {/* 3. Conteúdo Principal */}
  <SwissCard>
    <SwissCardContent>
      <SwissTable>
        ...
      </SwissTable>
    </SwissCardContent>
  </SwissCard>
</PageWrapper>
```

---

## 🎨 Paleta de Cores (Uso Restrito)

### Verde Floresta (Primária)
- **Onde usar**: Botões de ação principal, links ativos, ícones destacados
- **Onde NÃO usar**: Fundos de cards, backgrounds de seções

### Stone (Neutro Dominante)
- `stone-50`: Fundo da página
- `stone-100`: Fundos de filtros/toolbars
- `stone-200`: Bordas de cards
- `stone-500`: Labels e textos secundários
- `stone-900`: Títulos e textos principais

### Cores Semânticas (Apenas para Badges/Status)
- **Vermelho**: Urgente, preso, erro
- **Laranja**: Ação imediata, protocolar
- **Amarelo**: A fazer, pendente
- **Azul**: Monitorar, aguardando
- **Verde**: Concluído, sucesso
- **Roxo**: Fila, secundário

### ❌ Proibido
- `bg-blue-100`, `bg-red-100` em cards inteiros
- Gradientes complexos fora do header
- Cores de fundo diferentes em cards da mesma página

---

## 📏 Tipografia Padronizada

### Hierarquia

```tsx
// Títulos de Página (H1)
<h1 className="text-2xl font-serif font-semibold text-stone-900 tracking-tight">

// Títulos de Seção (H2)
<h2 className="text-lg font-sans font-semibold text-stone-900">

// Labels (pequenos)
<label className="text-xs font-medium text-stone-500 uppercase tracking-wider">

// Texto de Corpo
<p className="text-sm text-stone-700">

// Dados Numéricos/Processo
<span className="text-sm font-mono text-stone-700">
```

### ❌ Proibições
- NUNCA use `text-[11px]`, `text-[13px]` (magic numbers)
- NUNCA use `font-bold` em labels (use `font-semibold`)
- NUNCA use ALL CAPS em títulos (apenas em labels pequenos)

---

## 🔄 Plano de Migração

### Fase 1: Fundação (Componentes Base)
1. ✅ Consolidar `SwissCard` em `ui/swiss-card.tsx`
2. ✅ Criar `PageWrapper` em `layouts/page-wrapper.tsx`
3. ✅ Atualizar `Badge` para outline-only
4. ✅ Criar `FilterBar` padronizada

### Fase 2: Páginas Críticas
5. ⏳ Migrar `/admin/assistidos/page.tsx`
6. ⏳ Migrar `/admin/processos/page.tsx`
7. ⏳ Migrar `/admin/demandas/page.tsx`
8. ⏳ Migrar `/admin/dashboard/page.tsx`

### Fase 3: Limpeza
9. ⏳ Remover todos `<Card>` diretos
10. ⏳ Substituir tags "PRESO" por `<PrisonerIndicator>`
11. ⏳ Remover cores de fundo variadas
12. ⏳ Deletar componentes duplicados

### Fase 4: Documentação
13. ⏳ Atualizar Storybook (se existir)
14. ⏳ Criar guia visual em `/docs/design-system.md`

---

## 📸 Antes vs Depois

### Problema Atual: "Carnaval Visual"
```tsx
// Página de Assistidos (ANTES)
<div className="p-4">
  <div className="bg-gradient-to-r from-blue-500...">
    <h1>Assistidos</h1>
  </div>
  <Card className="bg-zinc-50">
    <Badge className="bg-red-500 text-white">RÉU PRESO</Badge>
  </Card>
</div>

// Página de Processos (ANTES)
<div className="p-8">
  <h1 className="text-3xl">Processos</h1>
  <div className="bg-white border rounded">
    <Badge className="bg-orange-600 text-white">URGENTE</Badge>
  </div>
</div>
```

### Solução: "Minimalismo Institucional"
```tsx
// TODAS as páginas (DEPOIS)
<PageWrapper title="[Título]" icon={Icon}>
  <SwissCard>
    <SwissCardContent>
      <PrisonerIndicator preso={true} />
      <Badge variant="danger">Urgente</Badge>
    </SwissCardContent>
  </SwissCard>
</PageWrapper>
```

---

## 🎯 Checklist de Padronização

Ao criar/editar uma página, verifique:

- [ ] Usa `<PageWrapper>` como container principal?
- [ ] Usa `<SwissCard>` para todos os cards?
- [ ] Usa `<PrisonerIndicator>` em vez de tag "PRESO"?
- [ ] Badges são outline (nunca solid)?
- [ ] Verde só em botões/links?
- [ ] Fundo da página é `bg-stone-50`?
- [ ] Tipografia usa classes do sistema (sem magic numbers)?
- [ ] Filtros estão em `<FilterBar>`?

---

## 🚀 Próximos Passos

1. **Aprovar este guia** → Confirme que a direção está correta
2. **Implementar componentes base** → SwissCard, PageWrapper, FilterBar
3. **Migrar 3 páginas piloto** → Assistidos, Processos, Demandas
4. **Avaliar resultado** → Ver se resolve o "feeling" de desconexão
5. **Migrar resto da aplicação** → Aplicar padrão em todas as páginas

---

## 💬 Glossário de Termos

- **Clean Canvas**: Fundo neutro (stone-50) para destacar conteúdo
- **Swiss Design**: Minimalismo, grade, tipografia clara, cores restritas
- **Outline Badge**: Badge com borda colorida e fundo claro
- **Semiótica Visual**: Usar ícones em vez de texto quando possível
- **Hierarquia Tipográfica**: Tamanhos de fonte consistentes e previsíveis

---

## 📚 Referências de Design

- [Swiss Design Principles](https://www.smashingmagazine.com/2009/07/lessons-from-swiss-style-graphic-design/)
- [Linear App](https://linear.app) - Referência de minimalismo
- [Notion](https://notion.so) - Referência de hierarquia
- [GitHub](https://github.com) - Referência de consistência

---

**Criado em**: Janeiro 2026  
**Versão**: 1.0  
**Status**: Proposta aguardando aprovação
