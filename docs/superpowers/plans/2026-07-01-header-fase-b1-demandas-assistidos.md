# Header Fase B1 — Demandas + Assistidos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar as páginas Demandas e Assistidos para o `GlassHeaderShell` + `HeaderActionsBar`, replicando o padrão validado na Agenda (Fase A, PR #326).

**Architecture:** Nenhum componente novo — consumir `GlassHeaderShell`, `HeaderActionsBar`/`HeaderAction` e `AtribuicaoSwitchWell` de `src/components/layouts/header/`. Cada página declara `HeaderAction[]`; controles ricos existentes (busca, menus portalados) entram como `render`. O `CollapsiblePageHeader` continua vivo para as demais páginas (Fases B2/B3).

**Tech Stack:** Next.js 15, Tailwind, shadcn/ui, lucide-react. Sem dependências novas.

**Specs:** `docs/superpowers/specs/2026-07-01-header-redesign-design.md` (a spec da Fase A governa; este plano só aplica o padrão). Fase A de referência: `src/app/(dashboard)/admin/agenda/page.tsx` é o exemplar migrado.

## Global Constraints

- Copy em português; nada abaixo de 11px; `+ Novo`/`Nova demanda` é o único botão sólido (emerald) por header.
- **Todo popover/dropdown do header DEVE portalar para o body** (o shell tem `backdrop-filter`; painéis `absolute`/`fixed` internos quebram — Critical da Fase A). Os menus portalados existentes (createPortal/Radix) já cumprem isso — mover como estão.
- Nenhuma ação pode ficar inacessível em nenhuma largura; no máximo UM ícone `MoreHorizontal` visível por header (o do overflow automático). Menus ricos de página usam outro glifo (ver decisão em cada task).
- Os conceitos `collapsedStats`/`collapsedPill`/`collapsedSearch`/`bottomRow`/`seamless` morrem na migração — o shell mantém a faixa de trabalho sempre visível (título+stats+ações), que cumpre o mesmo papel.
- Nenhum estado novo nas páginas; handlers idênticos aos atuais.
- A árvore pode ter mudanças não relacionadas NÃO commitadas — `git add` sempre com paths explícitos, NUNCA `-A`.
- Gates por task: `npx tsc --noEmit` sem erros novos nos arquivos tocados; `npx vitest run src/components/layouts/header/overflow-logic.test.ts` 6/6; lint sem erros novos.
- Falhas de suíte pré-existentes conhecidas (NÃO são regressão): audiencias-hoje-chip, prazos-alert-chip, backfill.test.mjs, event-detail-sheet (6), intimacoes buildJobMeta.

---

### Task 1: Migrar Demandas (`demandas-premium-view.tsx`)

**Files:**
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx` (headerToolbarLeft ~2797, headerToolbarRight ~2846, menu "⋯" ~2917-3135, Selecionar ~3141, Analisar triagem ~3165, ImportDropdown ~3185-3240, Nova demanda ~3244, headerBottomRow ~3255, `<CollapsiblePageHeader>` ~3339-3392 — verificar âncoras por conteúdo antes de cortar)

**Interfaces:**
- Consumes: `GlassHeaderShell { title, icon, stats?, filters?: ReactNode | ((collapsed:boolean)=>ReactNode), actions? }`; `HeaderActionsBar({ actions })` + `HeaderAction { id, label, icon?, priority, variant?, onSelect?, render?, hideLabel?, group?, overflowItems? }` (priority>0 barra, 0 nasce no "…", Infinity nunca cai); `AtribuicaoSwitchWell { options, selectedValues, onToggle, onClear, counts?, singleSelect?, collapsed? }`.
- Produces: Demandas no header novo; todos os handlers atuais preservados.

- [ ] **Step 1: Imports**

Adicionar:
```tsx
import { GlassHeaderShell } from "@/components/layouts/header/glass-header-shell";
import { HeaderActionsBar, type HeaderAction } from "@/components/layouts/header/header-actions-bar";
import { AtribuicaoSwitchWell } from "@/components/layouts/header/atribuicao-switch-well";
import { SlidersHorizontal } from "lucide-react";
```
Remover o import de `CollapsiblePageHeader` (uso único no arquivo — confirmar com grep). Manter `AtribuicaoPills` só se ainda usado em outro ponto do arquivo (grep; se o único uso era o toolbar, remover).

- [ ] **Step 2: Preservar os controles ricos como consts**

Extrair (mover JSX existente SEM mudanças internas, apenas removendo wrappers responsivos `hidden md:flex`/`flex md:hidden` — a visibilidade passa a ser por medição):

- `const searchControl = (...)` ← consolidar as DUAS buscas atuais (mobile ~2849-2882 e desktop ~2885-2893) numa só: manter o input desktop (`w-[140px] lg:w-[200px]`) como controle único — o HeaderActionsBar decide quando ele sai da barra (o item de overflow foca via `setSearchOpen(true)`; manter esse estado para o caso overflow).
- `const viewFilterMenu = (...)` ← mover o menu "⋯" inteiro (~2897-3135: botão `filtersBtnRef` + createPortal com Visualização/Filtrar por/Exportar/Filtros/Ordenar/Agrupar/Modo/Gráficos/Configurações) SEM mudanças — **trocando apenas o ícone do botão de `MoreHorizontal` para `SlidersHorizontal`** e o `title` para "Exibição e filtros". Motivo: este é um menu de exibição/filtros, não overflow de ações; o único `MoreHorizontal` do header passa a ser o "…" automático do HeaderActionsBar. O createPortal existente já atende a regra de portal.
- `const importControl = (...)` ← mover o ImportDropdown inteiro (~3185-3240: botão `importBtnRef` + createPortal com Intimações do PJe/PJe copiar-colar/Excel/Sheets/SEEU) sem mudanças.
- `const mpuChip = (...)` ← mover o botão MPU (~2808-2842, incluindo o guard `(tipoProcessoCounts["MPU"] ?? 0) > 0`) sem mudanças.
- `const selecionarBtn = (...)` ← mover o botão Selecionar (kanban-only, ~3141) sem mudanças, preservando o guard de aba.

- [ ] **Step 3: Declarar as ações**

```tsx
  const headerActions: HeaderAction[] = [
    { id: "mpu", label: "Filtro MPU", priority: 18, render: mpuChip },
    { id: "search", label: "Buscar", icon: Search, priority: 25, render: searchControl, onSelect: () => setSearchOpen(true) },
    { id: "view-filters", label: "Exibição e filtros", icon: SlidersHorizontal, priority: 24, render: viewFilterMenu, onSelect: () => setIsFiltersDropdownOpen(true) },
    { id: "selecionar", label: "Selecionar", priority: 15, render: selecionarBtn, onSelect: () => setIsSelectMode(true) },
    { id: "varredura", label: "Analisar triagem", icon: ScanSearch, priority: 30, hideLabel: true, onSelect: () => setIsVarreduraModalOpen(true) },
    { id: "importar", label: "Importar", icon: DownloadCloud, priority: 40, render: importControl, onSelect: () => setIsImportDropdownOpen(true) },
    { id: "nova", label: "Nova demanda", icon: Plus, priority: Infinity, variant: "primary", onSelect: () => setIsCreateModalOpen(true) },
  ];
```
(Ícones já importados no arquivo; conferir e completar imports que faltarem.)

- [ ] **Step 4: Substituir o header**

Remover o bloco `<CollapsiblePageHeader ... />` (~3339-3392, incluindo collapsedStats/collapsedPill/collapsedSearch/bottomRow/seamless) e o `headerBottomRow`/`headerToolbarLeft`/`headerToolbarRight` que só existiam para ele. No lugar:

```tsx
      {/* ====== GLASS HEADER (padrão Fase A) ====== */}
      <GlassHeaderShell
        title="Demandas"
        icon={ListTodo}
        stats={
          <span className="text-[11px] text-white/55 tabular-nums leading-none">
            {demandas.filter(d => !d.arquivado).length} total
          </span>
        }
        filters={(collapsed) => (
          <AtribuicaoSwitchWell
            collapsed={collapsed}
            options={atribuicaoOptions}
            selectedValues={selectedAtribuicoes}
            onToggle={handleAtribuicaoToggle}
            onClear={handleClearAtribuicoes}
            counts={atribuicaoCounts}
          />
        )}
        actions={<HeaderActionsBar actions={headerActions} />}
      />
```

- [ ] **Step 5: Gates**

Run: `npx tsc --noEmit 2>&1 | grep demandas-premium-view` (vazio) · `npx vitest run src/components/layouts/header/overflow-logic.test.ts` (6/6) · `npm run lint 2>&1 | grep demandas | head` (sem erros novos).

- [ ] **Step 6: Commit**

```bash
git add src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(demandas): migra header para GlassHeaderShell com overflow automático"
```

---

### Task 2: Migrar Assistidos (`assistidos/page.tsx`)

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/page.tsx` (HeaderSlotTitle/stats ~905-921, `<CollapsiblePageHeader seamless>` + bottomRow ~924-1148 — verificar âncoras por conteúdo)

**Interfaces:**
- Consumes: mesmos contratos da Task 1.
- Produces: Assistidos no header novo. O `HeaderSlotTitle` (chips de status clicáveis no `#header-slot`) CONTINUA — o GlassHeaderShell tem o slot na faixa utilitária.

- [ ] **Step 1: Imports**

Mesmos três imports da Task 1 (shell, actions bar, switch well). Remover `CollapsiblePageHeader` se uso único; manter `HeaderSlotTitle` (continua usado).

- [ ] **Step 2: Preservar controles ricos como consts**

- `const searchControl = (...)` ← mover o `<Input ref={searchInputRef} ...>` + indicador "Buscando por processo..." (~975-988) sem mudanças, sem wrappers responsivos.
- `const quickFilters = (...)` ← mover os chips `meus_presos`/`prazos_vencidos` + XCircle de limpar (~990-1020) sem mudanças.
- `const batchBar = (...)` ← mover a barra de batch-select (~1022-1042, guard `batchSelectMode`) sem mudanças.
- `const ferramentasMenu = (...)` ← mover o menu "⋯" (~1044-1138: Filtros rápidos/Custódia/Abrangência/Ferramentas) sem mudanças, **trocando o ícone de `MoreHorizontal` para `SlidersHorizontal`** e title "Filtros e ferramentas" (mesma regra da Task 1; o portal existente já atende a regra).
- `const analyticsToggle = (...)` ← mover o toggle de Analytics (~959-968) sem mudanças.

- [ ] **Step 3: Declarar as ações**

```tsx
  const headerActions: HeaderAction[] = [
    { id: "analytics", label: "Analytics", priority: 20, render: analyticsToggle, onSelect: () => setActiveTab(activeTab === "analytics" ? "lista" : "analytics") },
    { id: "search", label: "Buscar", icon: Search, priority: 25, render: searchControl },
    { id: "quick-filters", label: "Filtros rápidos", priority: 18, render: quickFilters },
    { id: "batch", label: "Exportação em lote", priority: 17, render: batchBar },
    { id: "ferramentas", label: "Filtros e ferramentas", icon: SlidersHorizontal, priority: 30, render: ferramentasMenu, onSelect: () => setIsOverflowOpen(true) },
    // "novo" é um <Link>, não button — vai como render, movido VERBATIM das linhas ~1140-1145
    // (o <Link href="/admin/assistidos/novo" className="...emerald...">+ Novo</Link> atual):
    { id: "novo", label: "Novo", priority: Infinity, render: novoCta },
  ];
```
Extrair também `const novoCta = (...)` no Step 2: mover o `<Link href="/admin/assistidos/novo">+ Novo</Link>` atual (~1140-1145) inteiro, sem mudanças. Para `search`/`quick-filters`/`batch` sem `onSelect`: quando colapsarem no "…", o item do menu não faz nada — mitigar dando `onSelect` que foca/abre o equivalente: search → `searchInputRef.current?.focus()` (a barra pode não ter o input montado; nesse caso o item deve setar um estado `searchOpen` se existir, senão omitir `onSelect` e aceitar o comportamento da Fase A). Decisões pontuais: seguir o que a página já tem, não inventar estado novo.

- [ ] **Step 4: Substituir o header**

Remover `<CollapsiblePageHeader seamless bottomRow={...}>` (~924-1148). No lugar:

```tsx
      <GlassHeaderShell
        title="Assistidos"
        icon={Users}
        stats={
          <span className="text-[11px] text-white/55 tabular-nums leading-none">
            {stats.total ?? filteredAssistidos.length}
          </span>
        }
        filters={(collapsed) => (
          <AtribuicaoSwitchWell
            collapsed={collapsed}
            singleSelect
            options={ATRIBUICAO_OPTIONS_ASSISTIDOS /* usar a lista que a página já passa ao AtribuicaoPills (~932-954) */}
            selectedValues={[atribuicaoFilter]}
            onToggle={(v) => setAtribuicaoFilter(v)}
            onClear={() => setAtribuicaoFilter("all")}
          />
        )}
        actions={<HeaderActionsBar actions={headerActions} />}
      />
```
Usar exatamente as `options`/handlers que o `AtribuicaoPills` atual recebe (~932-954) — os nomes acima são indicativos; os reais estão nessas linhas e NÃO devem ser renomeados. Manter o `HeaderSlotTitle` como está (portal no slot).

- [ ] **Step 5: Gates**

Run: `npx tsc --noEmit 2>&1 | grep "assistidos/page"` (vazio) · vitest overflow 6/6 · lint sem erros novos.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/admin/assistidos/page.tsx"
git commit -m "feat(assistidos): migra header para GlassHeaderShell com overflow automático"
```

---

### Task 3: Verificação no browser (controller)

**Files:** nenhum (verificação manual/Playwright pelo controller).

- [ ] **Step 1:** Dev server up (skill dev-server, Turbopack). Login e navegar a `/admin/demandas` e `/admin/assistidos` (navegação client-side se o SSR estiver lento).
- [ ] **Step 2:** Em cada página, em 1440/1100/900/700/375px: zero scroll horizontal; UM `MoreHorizontal` no máximo; switch colapsa <760px; menus ricos (SlidersHorizontal, Importar) abrem PORTALADOS por cima do conteúdo; primário emerald sempre visível; `HeaderSlotTitle` (chips de status de Assistidos) funcionando; bottom nav mobile intacta.
- [ ] **Step 3:** Fluxos: busca filtra; MPU cicla; importar abre os 5 caminhos; varredura abre modal; batch-select exporta; quick filters aplicam presets; Nova demanda/Novo abrem.
- [ ] **Step 4:** Registrar resultado no ledger e corrigir achados antes do review final.

---

## Fora deste plano

- **Fase B2**: as 30 páginas simples (Classe B do mapa) — migração mecânica em lote por subagentes (título + botões viram `HeaderAction[]` triviais).
- **Fase B3**: as 16 complexas restantes (intimacoes, processos, dashboard, atendimentos, drive, whatsapp, etc.) + `EntityPageHeader` (assistidos/[id]) + remoção do `CollapsiblePageHeader`, `HeaderSlotTitle` (avaliar) e tokens `HEADER_STYLE` legados.
- Mapa completo dos consumidores: relatório do Explore em `.superpowers/sdd/progress.md` (seção Fase B) e na memória `project_header_redesign.md`.
