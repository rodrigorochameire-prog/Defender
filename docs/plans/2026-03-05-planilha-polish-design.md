# Planilha Demandas Polish - Design

## Objetivo
Melhorar a UX da planilha de demandas para ser mais parecida com Google Sheets: full-height, cores dinâmicas por atribuição, Enter para editar, e melhor responsividade.

## 1. Layout Full-Height
- Stats bar: toggle collapse com chevron, estado em localStorage
- `max-h` da tabela dinâmico: `calc(100vh - Xpx)` onde X depende do estado collapsed
- Infográficos colapsáveis por padrão
- Scroll apenas dentro da tabela

## 2. Cor Dinâmica por Atribuição
- Célula focada: `ring` + `bg` na cor hex da atribuição (ATRIBUICAO_BORDER_COLORS)
- Seleção de linha: `bg` mais intenso na cor da atribuição
- Hover: bg sutil na cor da atribuição
- Remove hardcoded emerald do foco/seleção

## 3. Enter = Edição Inline
- Cada célula editável expõe `data-edit-trigger` no elemento clicável
- Enter busca `[data-edit-trigger]` e simula click
- Tab/Enter confirma e move para próxima célula
- Esc cancela edição

## 4. UX Planilha-like
- Transições mais rápidas (100ms vs 150ms)
- Foco visual mais nítido (borda sólida vs ring)

## Arquivos
- `demandas-premium-view.tsx` - layout, stats collapse
- `DemandaCompactView.tsx` - cores, Enter handler, data-edit-trigger
- `EditableTextInline.tsx` - data-edit-trigger
- `InlineDropdown.tsx` - data-edit-trigger
- `InlineDatePicker.tsx` - data-edit-trigger
