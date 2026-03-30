# TDD — Drive Page Clean Redesign

> **Data**: 2026-03-29
> **Escopo**: Redesign visual da página Drive seguindo Padrão Defender v2
> **Filosofia**: Minimalismo institucional. Menos ruído, mais ar, cor apenas com significado.

---

## 1. Problema

A página Drive atual sofre de:

- **Overdose cromática**: sidebar com 8 funções de cor, cards com accent bar + dot + ícone colorido (3 sinais para a mesma informação)
- **Insights Bar poluída**: 6+ indicadores horizontais com pipes separadores — muito ruído
- **Seção "Extração IA" isolada**: card emerald com borda + fundo + ícone + barra de progresso pulsante
- **Tipografia inconsistente**: `text-[11px]`, `text-[13px]`, `text-[12px]` — magic numbers proibidos pelo Padrão Defender
- **Sidebar em modo claro com fundos coloridos vivos** (emerald-100, rose-100, amber-100) — viola "sidebar sempre escura, orgânica"
- **Padding apertado** na content area (`px-3 pt-2 pb-1`), sem respiro
- **4 seções empilhadas** no Overview sem hierarquia visual

---

## 2. Spec — O que mudar

### 2.1 Overview Dashboard (`DriveOverviewDashboard.tsx`)

#### Header compacto
- **Manter**: Ícone invertido (zinc-900/white) + título serif + stats inline
- **Remover**: Botões "Sync" e "Upload" do header → mover para TopBar (já existem lá)
- **Simplificar stats**: apenas `{totalFiles} docs · {linkedPercent}% vinc. · {lastSyncStr}`

#### Eliminar Insights Bar (linhas 371-446)
- **Remover completamente** a barra horizontal de insights
- **Mover** contagem de enrichment para dentro do header como stat inline discreto
- **Mover** botão "Processar N" para TopBar como ação contextual

#### Cards de Atribuição — Zinc neutral
- **Remover** accent bar colorida (`<div className="absolute top-0 ...">`)
- **Manter** apenas: dot semântico (2px) + label + file count + vinculação bar
- **Background**: `bg-white dark:bg-zinc-900` (sem hover colorido)
- **Hover**: `hover:border-zinc-300 dark:hover:border-zinc-700` (emerald APENAS no hover do botão)
- **Grid**: manter 5 colunas desktop, mas com `gap-3` (era `gap-2.5`)

#### Cards Especiais — Unificar com Atribuições
- **Remover** `border-dashed` → usar mesmo estilo dos cards de atribuição
- **Remover** `bg-zinc-50/50` diferente → mesmo `bg-white`

#### Extração IA — Integrar, não isolar
- **Remover** card separado com borda emerald
- **Integrar** como stat line dentro do Overview header:
  ```
  423 docs · 82% vinc. · 340 extraídos · 12 pendentes
  ```
- **Remover** `animate-pulse` da progress bar
- Se `failed > 0`, mostrar badge rose discreto com contagem

#### Atividade Recente — Compactar
- **Reduzir** de 6 para 4 itens
- **Remover** type badge redundante (PDF, IMG, AUDIO) quando já há ícone de tipo
- **Padding** dos itens: `py-1.5` (era `py-2`)

#### Tipografia — Corrigir magic numbers
| Atual | Corrigir para |
|-------|---------------|
| `text-[13px]` | `text-sm` |
| `text-[12px]` | `text-xs` |
| `text-[11px]` | `text-xs` |
| `text-[9px]` | `text-[10px]` |

### 2.2 DriveSidebar (`DriveSidebar.tsx`)

#### Reduzir funções de cor (8 → 2)
- **Remover**: `getAttrActiveBgLight`, `getAttrActiveIconColor`, `getAttrLeftBarColor`, `getAttrSubItemActive`, `getAttrSubItemConnector`, `getAttrActiveDot`, `getAttrConnectorGradient`
- **Manter**: apenas uma função `getAttrDotColor(color)` para o dot semântico
- **Active item**: `bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100` + `border-l-2 border-{color}-500`
- **Inactive item**: `text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40`
- **Subfolder active**: `bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium` (sem fundo colorido)

#### Connector lines
- **Simplificar**: gradient → cor sólida `bg-zinc-200 dark:bg-zinc-700/50`
- **Remover** dot "recent" nos subfolders (muito sutil para ter valor)

#### Labels de seção
- **Corrigir**: `text-[9px]` → `text-[10px]` (mínimo do Padrão Defender)

### 2.3 DriveTopBar (`DriveTopBar.tsx`)

#### Agrupar ações
Layout: `[Back | Breadcrumbs | FileCount] ———— [Search | ViewToggle | (divider) | NewDoc | NewFolder | Refresh | AddMenu]`

- **Agrupar** botões de ação com divider vertical entre "visualização" e "criação"
- **Manter** SyncHealthDot inline com breadcrumbs

#### Tipografia
- Breadcrumb segments: `text-[12px]` → `text-xs`

### 2.4 DriveContentArea (`DriveContentArea.tsx`)

#### Padding
- Filters row: `px-3 pt-2 pb-1` → `px-4 pt-3 pb-2`
- File list/grid: `p-3` → `p-4`

#### Botão "Transcrever Todos"
- Mover badge de contagem para `aria-label`, simplificar visual
- Manter como está se `pendingMediaCount <= 3`, ocultar se 0

### 2.5 DriveFilters (`DriveFilters.tsx`)
- Sem mudanças significativas, já está clean

---

## 3. Arquivos a modificar

| Arquivo | Tipo de mudança | Complexidade |
|---------|----------------|--------------|
| `DriveOverviewDashboard.tsx` | Remover Insights Bar, simplificar cards, integrar IA stats | Alta |
| `DriveSidebar.tsx` | Reduzir funções de cor, unificar active states | Média |
| `DriveTopBar.tsx` | Agrupar ações, corrigir tipografia | Baixa |
| `DriveContentArea.tsx` | Ajustar padding | Baixa |

---

## 4. O que NÃO mudar

- **Funcionalidade**: zero mudanças em lógica, queries, mutations, routers
- **DriveDetailPanel**: não faz parte deste redesign (77KB, escopo separado)
- **PdfViewerModal**: não faz parte (146KB, escopo separado)
- **DriveCommandPalette**: já está funcional
- **DriveContext/useKeyboardShortcuts**: zero mudanças
- **Modais**: FileUpload, MoveFile, SmartExtract — fora do escopo

---

## 5. Checklist Padrão Defender

```
[ ] Lucide icons (sem emojis)
[ ] cursor-pointer em clicáveis
[ ] Hover 150-300ms transitions
[ ] WCAG AA contraste
[ ] Focus states visíveis
[ ] Responsivo (375/768/1024/1440px)
[ ] Dark mode funcional
[ ] gradient="zinc" em stats
[ ] Hover emerald (apenas em ações)
[ ] Sidebar integrada organicamente
[ ] Sem magic numbers tipografia
[ ] Cor apenas com significado semântico
```

---

## 6. Ordem de execução

1. **DriveOverviewDashboard** — maior impacto visual
2. **DriveSidebar** — coesão com design system
3. **DriveTopBar** — agrupamento de ações
4. **DriveContentArea** — padding final

Cada etapa: implementar → verificar dark mode → verificar responsivo → próxima.
