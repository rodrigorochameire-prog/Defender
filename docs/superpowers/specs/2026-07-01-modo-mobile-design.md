# Modo Mobile — Design (OMBUDS)

**Data:** 2026-07-01
**Status:** Aprovado (design) — pronto para plano de implementação da Fase 0
**Autor:** Rodrigo Rocha Meire + Claude

> Explicações e specs deste projeto em português (preferência do projeto). Identificadores de código permanecem em sua forma original.

## 1. Contexto e problema

O OMBUDS é um app Next.js 15 (App Router, PWA via Serwist) com ~86 rotas sob `(dashboard)/admin`. Já existe **infraestrutura mobile parcial e inconsistente**:

- `useIsMobile()` (`src/hooks/use-mobile.ts`, breakpoint 768px) e `useMediaQuery()`.
- `MobileBottomNav` (`src/components/shared/mobile-bottom-nav.tsx`) — 5 tabs fixos, montado no `admin-sidebar.tsx`.
- Drawer mobile via `Sheet` (estado `openMobile`) no sidebar.
- Espaçamento `pb-16 md:pb-0` no container de scroll para dar lugar à bottom nav.
- `ui/sheet.tsx` (bottom sheets já usados em ~9 arquivos), `shared/command-palette.tsx` (cmdk), `ui/table`, `ui/tabs`, `ui/scroll-area`, `shared/floating-dock.tsx`.
- **24 arquivos** já fazem responsividade ad-hoc (`md:hidden` etc.) — inconsistente.

**Problema:** apenas um punhado das ~86 rotas tem tratamento mobile real. O resto quebra no celular (overflow horizontal, tabelas espremidas, diálogos maiores que a viewport, alvos de toque pequenos). Não há biblioteca de padrões compartilhada → cada correção vira um hack pontual.

## 2. Objetivos

1. **Correção de baseline em todas as ~86 rotas** a 375–430px: zero overflow horizontal, alvos de toque ≥44px, diálogos/formulários cabem na viewport, nada cortado.
2. **Coeso e refinado** — tudo flui por uma **biblioteca de padrões mobile compartilhada**, não 86 hacks isolados.
3. **Views mobile sob medida** para páginas hostis ao celular (tabelas densas, Kanban, mapas, visualizador de PDF, calendário, cockpit do júri).
4. **Sensação de app nativo** aproveitando o PWA existente: bottom tabs + launcher "Mais" + busca sutil, ações na zona do polegar, bottom sheets, safe-area aware.

### Não-objetivos (YAGNI)

- Não reescrever a navegação desktop (sidebar permanece intacta ≥768px).
- Não introduzir framework de gestos pesado na Fase 0 (gestos/pull-to-refresh ficam na Fase 3).
- Não suportar layouts bespoke para tablet 768–1024px — tablets recebem o layout desktop.
- Não migrar componentes de terceiros (Leaflet, react-pdf) — apenas adaptar seu enquadramento mobile.

## 3. Decisões de produto (validadas no brainstorming)

| Decisão | Escolha |
|---|---|
| Intenção central | Correção de baseline em **todas** as páginas (amplitude), mas com biblioteca de padrões que a torne **polida e coesa** |
| Páginas hostis | **View mobile sob medida** para cada uma (não apenas degradação) |
| Navegação mobile | **Blend**: bottom bar com 4 tabs fixos + **Mais** (launcher em bottom sheet) + **busca sutil** (ícone de lupa no header + campo dentro do launcher). O ☰ left-drawer **se aposenta no celular** |
| Tabs fixos (default) | Home · Agenda · Demandas · Assistidos · **Mais** (reordenáveis conforme uso real) |
| Busca | Reutiliza o `command-palette.tsx` existente (cmdk); nunca um search bar permanente ocupando tela |

## 4. Arquitetura — três camadas

### Camada A — Fundação (primitivos mobile)

Unidades reutilizáveis, novas ou refatoradas, que toda página consome. **Propósito único e interface bem definida** por unidade.

**Navegação:**
- Refatorar `MobileBottomNav` → **config-driven**, 4 tabs + Mais. Interface: recebe uma lista de `{ label, icon, path }` e o item Mais.
- Novo `MobileMoreSheet` — launcher em grade agrupada (Atuação / Gestão / Sistema), fonte das rotas = registro do sidebar (reusar a mesma estrutura de itens que o `admin-sidebar.tsx` já define, evitando duplicação de verdade).
- Novo `MobileSearchOverlay` — **wrapper** do `shared/command-palette.tsx`, acionado por: (a) lupa no header, (b) campo no topo do `MobileMoreSheet`. Busca assistidos, demandas e páginas.
- Adaptar `ConditionalHeader`/header mobile: título + voltar + lupa + overflow.
- Aposentar o ☰ left-drawer quando `useIsMobile()`.

**Primitivos de layout (construídos sobre `ui/sheet`, `ui/table`, `ui/tabs` existentes):**
- `ResponsiveDialog` — Radix `Dialog` no desktop, `Sheet side="bottom"` no mobile. Consolida o padrão já repetido em ~9 arquivos num único componente. Interface: mesma API de `Dialog` (trigger/content/title), decide internamente por `useIsMobile()`.
- `DataCards` / `ResponsiveTable` — tabela que colapsa em cards empilhados abaixo de `md`. Interface: recebe colunas + linhas + um `renderCard(row)` opcional; sem `renderCard`, deriva cards de pares label→valor.
- `MobileActionBar` — barra de ações sticky na zona do polegar (acima da bottom nav), para ações primárias da página.
- `FilterSheet` — filtros/ordenação inline realocados para um bottom sheet atrás de um botão "Filtros".
- `MobilePageShell` — padding padrão, safe-area insets, espaçamento da bottom-nav (`pb`), garantindo consistência.

**Padrões/tokens:**
- Breakpoint único = Tailwind `md` (768px), coerente com `useIsMobile()`.
- Alvo de toque mínimo 44×44px.
- Utilitários de safe-area (`env(safe-area-inset-*)`).
- **CSS-first** para layout puro (`md:` do Tailwind); troca de componente via JS (`useIsMobile()`) **apenas** onde o DOM precisa ser genuinamente diferente.

### Camada B — Varredura de baseline

Auditoria sistemática página-a-página, **agrupada por padrão** (todas as tabelas juntas, todos os diálogos juntos, todos os formulários juntos), corrigindo overflow / alvos / larguras fixas / headers sticky usando os primitivos da Camada A. Guiada por um checklist (ver §7).

### Camada C — Views mobile sob medida (páginas hostis)

| Página | Desktop | View mobile sob medida |
|---|---|---|
| Kanban (`demandas-premium`) | board horizontal | lista vertical agrupada por status (reusar CompactView/TableView/CardView existentes) |
| Tabelas admin | tabela densa | `DataCards` + `FilterSheet` |
| Mapas (radar, mapa-dos-fatos, lugares) | Leaflet full | lista de pins + toque-para-expandir mini-mapa |
| Visualizador de PDF | modal amplo | fit-to-width + pinch zoom + chrome mínimo |
| Calendário / Agenda | grade mensal | lista de agenda (dia / próximos) |
| Cockpit do júri | multi-painel | seções em abas empilhadas |

## 5. Fluxo de dados

Puramente apresentacional — mesmos dados via tRPC, renderização diferente por breakpoint. Preferir CSS `md:` para layout; usar `useIsMobile()` para trocar componentes só onde o DOM difere de fato (tabela↔cards, grade-mês↔agenda). SSR-safe: primeiro paint renderiza desktop, troca no mount; skeleton onde a troca é pesada, para evitar layout shift.

## 6. Tratamento de erros e edge cases

- **Hydration flash:** preferir CSS-hide a duplo-render em árvores pesadas; `useIsMobile()` retorna `undefined`/`false` no 1º paint — nunca renderizar as duas versões pesadas simultaneamente.
- **Safe-area:** notch + home indicator (bottom nav já usa `pb-[env(safe-area-inset-bottom)]`).
- **Teclado virtual** sobrepondo inputs (scroll into view no focus).
- **Orientação:** mudança portrait↔landscape sem quebrar.
- **Tablets 768–1024px:** tratados como desktop (não-objetivo criar layout intermediário).
- **PWA standalone:** status bar e safe areas no modo instalado.

## 7. Testes

- **Playwright viewport smoke** a 375 / 390 / 430px: sem overflow horizontal, bottom nav visível, diálogos cabem na viewport.
- **Checklist manual por página** (baseado no checklist `ui-ux-pro-max`): sem overflow, `cursor`/alvo ≥44px, hover/focus, `prefers-reduced-motion`, contraste.
- **Spot-checks visuais** no browser (webapp-testing / dev server).

## 8. Fases (decomposição em sub-projetos)

Este design captura a visão completa. Cada fase é um sub-projeto com seu próprio ciclo spec → plano → implementação.

| Fase | Escopo | Depende de |
|---|---|---|
| **Fase 0 — Fundação** *(primeira a ser especificada e construída)* | primitivos (§4-A) + modelo de navegação + tokens + checklist/tooling de auditoria | — |
| **Fase 1 — Varredura de baseline** | todas as páginas à correção, agrupadas por padrão | Fase 0 |
| **Fase 2 — Views sob medida** | as views hostis da Camada C | Fase 0, parcialmente Fase 1 |
| **Fase 3 — Polish/PWA** | gestos, pull-to-refresh, prompt de instalação, UX offline, motion | Fases 0–2 |

**Justificativa da ordem:** Fases 1–3 dependem dos primitivos da Fase 0; entregá-los primeiro torna o resto rápido e consistente.

## 9. Escopo da Fase 0 (a especificar em detalhe no plano)

Entregáveis concretos:

1. `MobileBottomNav` refatorado (config-driven, 4 tabs + Mais).
2. `MobileMoreSheet` (launcher em grade agrupada, sourcing do registro de rotas do sidebar).
3. `MobileSearchOverlay` (wrapper do command-palette; lupa no header + campo no launcher).
4. Aposentadoria do ☰ left-drawer no mobile.
5. `ResponsiveDialog`, `DataCards`/`ResponsiveTable`, `MobileActionBar`, `FilterSheet`, `MobilePageShell`.
6. Tokens/utilitários: breakpoint, 44px, safe-area.
7. Checklist de auditoria mobile por página (documento) + smoke test Playwright base.
8. **Sem** rollout em massa nas 86 páginas (isso é Fase 1) — apenas 1–2 páginas piloto para validar os primitivos ponta-a-ponta.

## 10. Riscos

- **Regressão desktop:** primitivos que mudam layout desktop por engano. Mitigação: `useIsMobile()`/CSS `md:` estritos; primitivos são no-op ≥768px.
- **Fonte de verdade das rotas duplicada** entre sidebar e MoreSheet. Mitigação: extrair o registro de rotas para um módulo compartilhado consumido por ambos.
- **Custo de manutenção** de views bespoke (Camada C). Mitigação: reutilizar views já existentes (demandas-premium) sempre que possível.

## 11. Arquivos-âncora (referência)

- `src/components/layouts/admin-sidebar.tsx` (2084 linhas — monta nav, drawer, bottom nav, dock)
- `src/components/shared/mobile-bottom-nav.tsx`
- `src/components/shared/command-palette.tsx`
- `src/components/ui/sheet.tsx`, `ui/table.tsx`, `ui/tabs.tsx`
- `src/hooks/use-mobile.ts`, `use-media-query.ts`
- `src/app/(dashboard)/admin/layout.tsx`
