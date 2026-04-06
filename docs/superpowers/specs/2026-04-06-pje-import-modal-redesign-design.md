# PJe Import Modal — Redesign Padrão Defender

**Data**: 2026-04-06
**Escopo**: `pje-review-table.tsx` (principal), ajustes menores em `pje-import-modal.tsx`

## Decisões de Design

### 1. Rows: Card Row com Borda Sutil

Cada intimação no review table muda de `<tr>` para um **card row flex** com:

- Borda esquerda 2px colorida por match status:
  - `border-l-2 border-emerald-500` → encontrado (exact)
  - `border-l-2 border-amber-500` → similar
  - `border-l-2 border-red-500` → novo
- Container: `bg-white border border-neutral-200/80 rounded-lg` com gap de 6px entre cards
- Hover: `hover:shadow-sm hover:border-neutral-300 transition-all duration-150`
- Similar rows: `bg-amber-50/30 border-amber-200/60`
- Excluded rows: `opacity-40`

**Duas linhas de conteúdo** dentro de cada card:
- **Linha 1**: Nome do assistido em `font-serif font-semibold text-[13px]` + micro-label de match (`novo`, `similar` em texto muted colorido, sem badge/pill)
- **Linha 2**: Número do processo em `font-mono text-[10px] text-neutral-400` + separador `·` + crime/assunto

**Colunas à direita** (inline no flex):
- Badge tipo: `Geral` (neutral pill) ou `MPU` (emerald pill com font-weight 600)
- Data expedição: `text-[11px] text-neutral-400`
- Ato sugerido: dot colorido + nome do ato `text-[11px]`

**Checkbox**: `w-4 h-4 rounded` com checked state emerald (manter atual).

### 2. Stats Line + Alerta Sutil

**Linha de stats** (acima dos filtros):
- `flex items-center gap-3` sem container/fundo
- `"38 para importar"` em `text-xs font-semibold text-foreground`
- Separador `h-3.5 w-px bg-border`
- Dots coloridos com contagem: `w-1.5 h-1.5 rounded-full bg-emerald-500` + `"13 encontrados"` em `text-[11px] text-muted-foreground`
- Idem para similares (amber) e novos (red)
- `flex-1` spacer
- **Alerta "a conferir"**: texto amber sem fundo — ícone `AlertTriangle` (13px) + `"26 a conferir"` em `text-[11px] text-amber-700 font-medium cursor-pointer`. Click filtra pendentes.

### 3. Barra de Filtros

Container: `flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border border-neutral-200/80 rounded-lg`

**Filtros** (esquerda):
- Ícone `Filter` (12px, muted) como label
- Pills: `flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-white border border-neutral-200 text-neutral-500 hover:border-neutral-300 cursor-pointer`
- Cada pill tem ícone Lucide 10px:
  - "Baixa confiança" → `AlertCircle`
  - "Novos" → `UserPlus`
  - "Excluídos" → `EyeOff`
- Active state: `bg-amber-50 border-amber-200 text-amber-700` (para Baixa confiança), etc.

**Separador**: `h-3.5 w-px bg-neutral-300`

**Ações bulk** (direita):
- Icon buttons quadrados: `w-7 h-7 rounded-md bg-violet-50 text-violet-600 hover:bg-violet-100 flex items-center justify-center cursor-pointer`
- Ícones: `SquarePen` (Ato p/ todos), `BarChart3` (Status p/ todos)
- Tooltip nativo via `title` attr

### 4. Expandable Detail (providências)

Manter funcionalidade atual, refinando estilo:
- Container: `px-4 pb-3 pt-1` sem background (usar fundo do card)
- Borda esquerda emerald no textarea: `border-l-2 border-emerald-300`
- Ícone `FileText` muted antes do textarea

### 5. O que NÃO muda

- Lógica de parsing, matching, import — zero mudanças
- Stages do modal (configurar, colar, revisar, resultado)
- InlineDropdown e InlineDatePicker components
- Funcionalidade de select/deselect, exclude, bulk actions
- Dark mode support (adaptar classes com `dark:` variants)

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/components/demandas-premium/pje-review-table.tsx` | Refactor: table → flex cards, stats, filtros |
| `src/components/demandas-premium/pje-import-modal.tsx` | Nenhuma ou mínima (se stats/filtros estiverem no modal) |

## Abordagem de Implementação

Refactor incremental de `pje-review-table.tsx`:
1. Converter stats bar → nova stats line + alerta
2. Converter filter bar → novo container com ícones + icon buttons
3. Converter `<table>` → flex card rows
4. Ajustar expandable detail
5. Testar com dados reais (colar intimações do PJe)
