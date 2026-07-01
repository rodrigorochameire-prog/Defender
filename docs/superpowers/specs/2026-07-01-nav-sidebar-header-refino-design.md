# Refinamento de Navegação — Sidebar legível + Header mobile harmonizado — Design

**Data:** 2026-07-01
**Status:** Aprovado (design) — pronto para plano de implementação
**Branch:** `feat/nav-sidebar-header-refino` (a partir de `main`, que já contém o Modo Mobile Fase 0 / PR #307)
**Autor:** Rodrigo Rocha Meire + Claude

> Explicações e specs deste projeto em português. Identificadores de código permanecem em sua forma original.

## 1. Contexto e problema

O **Modo Mobile — Fase 0** (PR #307, mergeado em `main` @ `cd15664c`) introduziu no mobile: bottom nav (4 tabs) + launcher "Mais" (`MobileMoreSheet`) + busca sutil (lupa) e **aposentou o drawer ☰** (a sidebar deixou de abrir no mobile). Após usar, o defensor deu feedback:

1. **Gosta da barra lateral** (sidebar) e quer acessá-la no mobile — a aposentadoria do ☰ foi um passo atrás para ele.
2. Os **itens da sidebar (desktop) ficaram pequenos e difíceis de ver** — rótulos `12–13px`, ícones `15–18px`, sub-itens com ícone `14px`, badges `8–10px`, linhas `py-2` (densas).
3. A **top bar (utility bar) lota no mobile** e o problema é **sistêmico** (a barra é compartilhada entre páginas). Print de referência (página Agenda) mostra ≥9 controles concorrendo: ☰, breadcrumb, peer switcher (G/R/J), título+stats, ConflictBadge (⚠45), sync (⟳), ThemeToggle (☼), NotificationsPopover (🔔9+), chat (💬) — vários cortados/espremidos.

Este é um **refinamento v2 da Fase 0**: ajusta decisões da Fase 0 (remove o launcher "Mais" e a lupa avulsa, restaura o drawer) e ataca legibilidade da sidebar + harmonização do header.

## 2. Objetivos

1. **Sidebar desktop mais legível** — itens maiores e com melhor "encaixe" (ícones, rótulos, espaçamento, badges), mantendo estrutura, cores e o estado colapsado (icon-only).
2. **Restaurar a sidebar no mobile** como drawer (☰), mantendo o bottom nav de 4 tabs; **remover o launcher "Mais"**.
3. **Harmonizar a top bar no mobile** — mostrar só o essencial (`☰ · título · 🔔 · ⋯`) e recolher o resto num overflow (bottom sheet). Correção única no componente compartilhado → vale para todas as páginas.

### Não-objetivos (YAGNI)
- Não mexer na sidebar desktop além do dimensionamento (sem reorganizar itens/seções).
- Não alterar o comportamento do header no **desktop** (≥768px permanece idêntico).
- Sem mudanças de dados/backend — tudo é nav/header/apresentação.
- Não redesenhar os page headers (`CollapsiblePageHeader`) além do necessário para o header caber no mobile.

## 3. Decisões de produto (validadas no brainstorming)

| Tema | Decisão |
|---|---|
| Foco | Sidebar desktop (legibilidade) **+** trazer a sidebar de volta no mobile |
| Nav mobile | **Drawer ☰ (sidebar completa) + bottom nav (4 tabs)**; **remover "Mais"** |
| Header mobile | Essencial visível = **☰ · título da página · 🔔 · ⋯**; resto no overflow ⋯ |
| Dentro do ⋯ | busca, peer switcher (G/R/J), ConflictBadge (⚠45), ThemeToggle, chat, sync/refresh |
| Peer switcher | Recolhido no ⋯ (não fica visível no mobile) |
| Busca | Vai para o ⋯ — **remove a lupa avulsa** adicionada na Fase 0 |

## 4. Arquitetura — três partes

### Parte 1 — Sidebar desktop: legibilidade (`admin-sidebar.tsx`)

Passe de escala/densidade aplicado **uniformemente** às ~6 variantes de item (item principal, `MoreMenu`, `NewsMenu`, `ToolsMenu`, itens de contexto/atuação, itens de popover):

| Aspecto | De | Para |
|---|---|---|
| Rótulo | `text-[12px]`/`text-[13px]` | `text-sm` (14px) |
| Ícone item | `h-[15px]`/`h-[18px]` | `h-5 w-5` (20px) |
| Ícone sub-item | `h-3.5 w-3.5` (14px) | `h-[18px] w-[18px]` |
| Linha (padding) | `py-2` | `py-2.5` |
| Badge | `text-[8px]`–`text-[10px]` | `≥ text-[11px]`, contraste melhor |

- **Anti-drift:** extrair constantes de className de dimensionamento (ex.: `NAV_ITEM = "text-sm ..."`, `NAV_ICON = "h-5 w-5"`) no topo do arquivo e aplicá-las em todos os sites, em vez de bumpar cada um à mão.
- Preservar: cores, borda ativa (emerald), truncamento, e o **estado colapsado** (largura icon-only) — validar que ícones maiores ainda cabem colapsados.

### Parte 2 — Nav mobile: restaurar drawer, simplificar

- **Restaurar ☰ no mobile:** remover o `hidden md:inline-flex` que a Fase 0 pôs no `SidebarTrigger` (em `header-utility-row.tsx`), para o ☰ voltar a abrir a sidebar como drawer (o mecanismo `Sheet`/`openMobile` do `ui/sidebar` continua existindo).
- **Manter o bottom nav** (`MobileBottomNav`) com as 4 tabs (Home·Agenda·Demandas·Assistidos).
- **Remover o launcher "Mais":**
  - `MobileBottomNav` perde o botão "Mais", o estado interno de sheet e a prop `role`; passa a renderizar só as 4 tabs.
  - Remover arquivos que ficam órfãos: `mobile-more-sheet.tsx`, `resolve-icon.tsx` (e seus testes).
  - Em `nav-registry.ts`: remover `getLauncherGroups`/`LauncherGroup` (e casos de teste correlatos); **manter** `BOTTOM_TABS`/`isTabActive`.
  - Atualizar o mount em `admin-sidebar.tsx` (`<MobileBottomNav />` sem `role`).
  - Remover a subscrição de evento no `command-palette.tsx`? **Não** — o `openCommandPalette`/evento continua útil (a busca no ⋯ usará o mesmo mecanismo). Mantém-se `src/lib/events/command-palette.ts` e o listener.

### Parte 3 — Header mobile: harmonizar via overflow ⋯ (`header-utility-row.tsx`)

Renderização condicionada por breakpoint (Tailwind `md:` / `useIsMobile()`):

- **Mobile mostra apenas:** `☰` · **título da página** (com seus stat-chips, ex.: "Agenda 0·11") · `🔔` (NotificationsPopover) · `⋯` (novo botão de overflow).
  - Breadcrumbs ocultos no mobile (o título os substitui).
  - O título vem do `#header-slot` (via `HeaderSlotTitle`, que já portala título+ícone+stats). Mantido.
- **Novo componente `MobileHeaderOverflow`** (bottom sheet, `ui/sheet` side="bottom", aberto pelo ⋯) reúne os controles globais da utility bar: **busca** (dispara `openCommandPalette`), **peer switcher** (G/R/J — reusar o componente de `peer-switcher-section`/`context-control`), **ConflictBadge**, **ThemeToggle**, **chat** (toggle do `chatPanelActions`), **sync/refresh** (se presente).
- **Desktop inalterado:** todos os controles seguem inline (o overflow ⋯ e o recolhimento são `md:hidden`; os controles inline ficam `hidden md:flex`).
- **Controles injetados por página:** a maioria das páginas coloca ações no próprio corpo (`CollapsiblePageHeader`), não na utility bar — logo o `#header-slot` carrega essencialmente **título+stats** (mantidos). Caso alguma página injete **ações** extras no slot, essas ações colapsam para uma **segunda linha** abaixo da utility bar no mobile (fallback), em vez de disputar espaço na linha principal. Confirmar sites de injeção de ação no slot durante o plano (`demandas-premium-view`, `atendimentos-view`, `assistidos`, `vvd`, `dashboard`, `instancia-superior`).

## 5. O que é revertido/removido da Fase 0

| Fase 0 introduziu | Refino v2 |
|---|---|
| ☰ oculto no mobile (drawer aposentado) | **Restaura** o ☰/drawer no mobile |
| Launcher "Mais" (`MobileMoreSheet`) | **Remove** (drawer cobre o acesso completo) |
| Lupa de busca avulsa no header | **Remove** (busca vai pro ⋯) |
| `MobileBottomNav` com `role` + sheet | Simplifica p/ só 4 tabs |
| `getLauncherGroups`/`resolve-icon` | **Remove** (órfãos) |
| `ResponsiveDialog`, `ResponsiveTable`, `MobilePageShell`, `MobileActionBar`, `FilterSheet`, `command-palette` event, `nav-registry` (BOTTOM_TABS) | **Mantidos** (não afetados) |

## 6. Fluxo de dados
Puramente apresentacional. Header/nav decidem layout por breakpoint (`md:` CSS + `useIsMobile()` onde o DOM difere — ex.: renderizar `MobileHeaderOverflow` vs. controles inline). Mesmos dados/rotas. SSR-safe (primeiro paint desktop; `useIsMobile()` false até montar).

## 7. Edge cases
- Estado **colapsado** da sidebar no desktop com ícones maiores (não estourar a largura icon-only).
- Sidebar como **drawer no mobile** com itens maiores — rolagem e safe-area ok.
- `MobileHeaderOverflow` com `SheetTitle` sr-only (a11y Radix, como no padrão do projeto).
- Título muito longo no header mobile → `truncate`.
- Não quebrar o desktop (≥768px idêntico).

## 8. Testes
- Testes de componente (happy-dom): `MobileBottomNav` (só 4 tabs, sem "Mais"); `MobileHeaderOverflow` (abre sheet; itens presentes; busca dispara `openCommandPalette`); `nav-registry` (após remoção de `getLauncherGroups`, os testes remanescentes de `BOTTOM_TABS`/`isTabActive` verdes).
- `tsc --noEmit` limpo (remoções não podem deixar imports órfãos).
- Verificação manual (dev server) a 375/390px: ☰ abre sidebar; bottom nav com 4 tabs; header = ☰·título·🔔·⋯; ⋯ abre com os controles; sidebar desktop legível; desktop inalterado.

## 9. Arquivos-âncora
- `src/components/layouts/admin-sidebar.tsx` (Parte 1 + mount do bottom nav)
- `src/components/layouts/header-utility-row.tsx` (Parte 3 + restaurar ☰)
- `src/components/shared/mobile-bottom-nav.tsx` (Parte 2)
- `src/components/shared/mobile/mobile-more-sheet.tsx`, `resolve-icon.tsx` (remover)
- `src/components/layouts/nav-registry.ts` (remover launcher helpers)
- `src/components/layout/peer-switcher-section.tsx` / `context-control.tsx` (reuso no ⋯)
- Novo: `src/components/layouts/mobile-header-overflow.tsx`

## 10. Riscos
- **Regressão desktop** ao mexer no header/sidebar → gates `md:` estritos; overflow é `md:hidden`.
- **Remoções órfãs** (Mais launcher) deixando imports quebrados → `tsc` como gate.
- **Sidebar 2084 linhas**: mudança de dimensionamento ampla; mitigar com constantes compartilhadas + revisão diff-a-diff.
- **Peer switcher** dentro do ⋯: garantir que o componente reusado funcione fora do seu contexto original (props/estado).
