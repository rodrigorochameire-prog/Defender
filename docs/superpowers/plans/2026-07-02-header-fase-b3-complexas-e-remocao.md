# Header Fase B3 — 17 complexas + componente + remoção do legado

> Executado via subagentes em lotes com review, no worktree `/Users/rodrigorochameire/Projetos/Defender-b2-wt` (branch `feat/header-fase-b3` de main pós-B2). Referências vivas: `demandas-premium-view.tsx` (o mais complexo já migrado), `assistidos/page.tsx`, `agenda/page.tsx`, `juri/cockpit/page.tsx` (dual).

**Goal:** Migrar as 17 páginas complexas restantes, absorver o backlog do componente, e REMOVER `CollapsiblePageHeader`/`HeaderSlotTitle`/`HEADER_STYLE`.

## Receita para complexas (além da receita B2)

- `bottomRow` (toolbar) → dissolve em `filters` (se for AtribuicaoPills → `AtribuicaoSwitchWell`) + `HeaderAction[]` (busca/menus/CTAs como render, portais no top-level).
- `collapsedStats`/`collapsedPill`/`collapsedSearch` → MORREM (o shell mantém a work row sempre visível; stats vão no prop `stats`).
- `seamless` → irrelevante (shell é flush por natureza).
- `HeaderSlotTitle` usado como título → morre (o shell já tem título). Usado como conteúdo funcional (chips) → migrar o conteúdo para o prop `stats` do shell e remover o portal.
- Wrapper da página: padrão `min-h-screen bg-neutral-50 dark:bg-background` + conteúdo com padding (padronizar TAMBÉM as divergentes bg-neutral-100/#0f0f11 tocadas).

## REGRAS (consolidadas A/B1/B2 — inegociáveis)

1. Popover/dropdown SEMPRE portalado; 2. portal NUNCA dentro do render (trigger no render, portal top-level, fallback `{top:64,right:16}` se `!r || r.bottom<0`); 3. NUNCA `render: cond && jsx` (spread no array); 4. modo ativo = Infinity; 5. um MoreHorizontal só (menus próprios = SlidersHorizontal); 6. PT, ≥11px, sem estado novo, handlers idênticos, `git add` explícito; 7. back = onSelect+router.push; links de conteúdo = render.

## Lotes

**Lote A (bottomRow):** `admin/intimacoes/page.tsx` (bottomRow ×2: tabs Caixa/Batch + batch ops — batch ops = modo ativo Infinity) · `admin/processos/page.tsx` · `admin/modelos/page.tsx` · `admin/prazos/page.tsx` · `admin/juri/page.tsx`

**Lote B (collapsedStats):** `admin/ferias/_components/ferias-view.tsx` · `admin/carreira/_components/cobertura-rollup-view.tsx` · `admin/carreira/_components/carreira-cockpit.tsx` · `admin/demandas/arquivo/page.tsx`

**Lote C (seamless+slot):** `admin/vvd/page.tsx` · `admin/juri/cosmovisao/page.tsx` · `admin/carreira/vida-funcional/_components/vida-funcional-view.tsx`

**Lote D (kitchen sink):** `admin/drive/page.tsx` (conteúdo vem de DriveTopBar) · `admin/instancia-superior/page.tsx` · `admin/dashboard/page.tsx` · `admin/whatsapp/page.tsx` · `src/components/atendimentos/atendimentos-view.tsx`

**Lote E (componente + wrap-up):**
1. `GlassHeaderShell`: prop opcional `iconClassName` (cor do ícone — aplicar amber em vvd/medidas que perdeu na B2).
2. `HeaderActionsBar`: action com `render` e sem `onSelect`/`overflowItems` NÃO aparece no "…" como item morto — esconder do menu (documentar no tipo).
3. `EntityPageHeader` (`assistidos/[id]/layout.tsx`): migrar internals para o padrão glass (usa HeaderUtilityRow embedded + banda própria — virar GlassHeaderShell com stats/actions).
4. Assistidos: dedupe do título — chips do HeaderSlotTitle migram pro `stats` do shell; remover o portal.
5. `HeaderUtilityRow` standalone (ConditionalHeader p/ páginas sem header): reestilizar com HEADER_GLASS (mesma faixa utilitária do shell) sem depender de HEADER_STYLE.

**Lote F (remoção):** deletar `collapsible-page-header.tsx`, `header-slot-title.tsx`; remover `HEADER_STYLE` de design-tokens (e usos remanescentes — grep); varredura final `grep -rn "CollapsiblePageHeader\|HeaderSlotTitle\|HEADER_STYLE"` = só históricos/docs; gates: tsc repo limpo, `NODE_OPTIONS=--max-old-space-size=8192 npm run build` PASS, suíte sem regressões novas.

## Gates por lote

tsc grep vazio nos arquivos do lote · lint sem erros novos · commit por lote · review por lote (inventário old→new). NUNCA buildar com dev ativo.
