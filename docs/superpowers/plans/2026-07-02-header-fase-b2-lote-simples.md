# Header Fase B2 — Lote das 30 páginas simples

> **For agentic workers:** executado via subagentes em 5 lotes de 6 páginas, com review por lote. Worktree: `/Users/rodrigorochameire/Projetos/Defender-b2-wt` (branch `feat/header-fase-b2` a partir da main).

**Goal:** Migrar as 30 páginas de uso SIMPLES do `CollapsiblePageHeader` para o `GlassHeaderShell`, replicando o padrão de Agenda/Demandas/Assistidos.

## O padrão (referências vivas na main)

- `src/app/(dashboard)/admin/agenda/page.tsx` — exemplar completo
- Contratos: `GlassHeaderShell { title, icon, stats?, filters?, actions? }` · `HeaderActionsBar({ actions })` + `HeaderAction { id, label, icon?, priority, variant?, onSelect?, render?, hideLabel?, group?, overflowItems? }` · imports de `@/components/layouts/header/*`

Receita por página simples:
1. Trocar import `CollapsiblePageHeader` → `GlassHeaderShell` (+ `HeaderActionsBar`/`HeaderAction` se houver botões).
2. `title`/`icon` mantidos. Stats/chips informativos → prop `stats`. Botões/CTAs → `HeaderAction[]` (CTA principal = `variant: "primary"`, `priority: Infinity`; demais ghost com priority 20-50; nada nasce no "…" a menos que a página já tivesse menu). Controles ricos (dropdown de caso, tabs, inputs) → `render` (JSX movido verbatim, sem wrappers responsivos).
3. `children`/`bottomRow` do componente antigo deixam de existir; nenhuma página deste lote usa `bottomRow` (Classe B).
4. Links (`<Link>`) vão em `render`, não `onSelect`.

## REGRAS INEGOCIÁVEIS (aprendidas nos reviews A/B1)

1. Popover/dropdown do header SEMPRE portalado pro body (Radix já portala; createPortal manual ok).
2. Portal NUNCA dentro do `render` da action — trigger no render, `{open && createPortal(...)}` no top-level, fallback `if (!r || r.bottom < 0) return { top: 64, right: 16 }`.
3. NUNCA `render: cond && jsx` — inclusão condicional via spread no array.
4. Modo ativo (barras de seleção etc.) = `priority: Infinity`.
5. Um único `MoreHorizontal` por header (o automático); menus próprios usam `SlidersHorizontal`.
6. Copy PT; nada <11px; sem estado novo; handlers idênticos; `git add` só dos arquivos do lote.

## Gates por lote

`npx tsc --noEmit 2>&1 | grep -E "<páginas do lote>"` vazio · `npm run lint` sem erros novos nos arquivos do lote · commit único por lote: `feat(header-b2): lote N — <páginas>`.

## Lotes

**Lote 1**: `admin/oficios/page.tsx` (stats + link Templates + CTA Novo Ofício) · `admin/oficios/novo/page.tsx` (back + save) · `admin/oficios/[id]/page.tsx` (back + título) · `admin/custodia/page.tsx` (CTA Registrar + stat) · `admin/vvd/medidas/page.tsx` (botão Atualizar) · `admin/medidas/page.tsx` (back + ícone + título)

**Lote 2**: `admin/settings/dados/page.tsx` (Exportar/Importar) · `admin/settings/drive/page.tsx` (3 links) · `admin/calendar/page.tsx` (stat chips → stats prop) · `admin/central-inteligencia/page.tsx` (título, sem ações) · `admin/processos/[id]/sistematizacao/page.tsx` (título) · `admin/auditoria/page.tsx` (título)

**Lote 3**: `admin/juri/jurados/page.tsx` (3 botões) · `admin/juri/calculadora/page.tsx` (input de nome → render) · `admin/juri/registro/[sessaoId]/page.tsx` (título) · `admin/juri/cockpit/page.tsx` (save c/ estado) · `admin/juri/avaliacao/[sessaoId]/page.tsx` (título) · `admin/palacio-mente/page.tsx` (dropdown de caso → render)

**Lote 4**: `admin/demandas/nova/page.tsx` (back/save) · `admin/jurisprudencia/page.tsx` (2 botões) · `admin/equipe/page.tsx` (busca → render) · `admin/delegacoes/page.tsx` (ações menores) · `admin/distribuicao/page.tsx` (toggle Split/Lista/Atualizar → render) · `admin/calculadoras/page.tsx` (Tabs → render)

**Lote 5**: `admin/diarias/_components/diarias-view.tsx` (tabs/stats) · `admin/assistidos/pendentes/page.tsx` (parágrafo descritivo → stats ou abaixo do header) · `admin/siga-import/_components/siga-import-view.tsx` (botões) · `admin/ausencias/_components/ausencias-view.tsx` (botão) · `admin/pedidos-administrativos/_components/pedidos-view.tsx` (título + Novo) · `admin/whatsapp/templates/page.tsx` (Novo Template)

## Fora do lote (B3)

18 páginas complexas (bottomRow/collapsed*/seamless/HeaderSlotTitle), `EntityPageHeader`, dedupe do título de Assistidos, remoção do `CollapsiblePageHeader`/`HeaderSlotTitle`/tokens `HEADER_STYLE`.
