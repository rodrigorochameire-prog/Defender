# Assistidos — UI/UX Reform Plan

> **Doutrina transversal:** ver `2026-06-24-ombuds-redesign-doutrina.md` (princípios, padrões
> transversais e Definition of Premium Done que valem para todo o produto).
>
> **Status:** Em execução
> **Worktree:** `/Users/rodrigorochameire/Defender-assistidos-ui-reform`
> **Branch:** `feat/assistidos-redesign` (criada de `main`; worktree dedicado p/ isolar do daemon)
> **Data:** 2026-06-24
> **Fonte:** Spec de redesign do módulo Assistidos + inventário do código atual
> **Método:** spec-driven + TDD nos estados críticos, por fases pequenas e auditáveis

> **GOTCHA operacional crítico:** o daemon troca de branch no diretório principal
> (`/Users/rodrigorochameire/Defender`) e **descarta trabalho não-commitado**. Por isso esta
> reforma vive num **worktree dedicado** — o git impede o mesmo branch em dois worktrees, então
> o daemon não consegue tocar `feat/assistidos-redesign`. Trabalhar SEMPRE no worktree.

---

## 1. Tese e princípio condutor

O módulo Assistidos deve operar como **cadastro mestre vivo + cockpit operacional**. Cada
superfície precisa responder rápido: *quem é, quão confiável está o cadastro, o que está
urgente, o que falta estruturar, qual a próxima ação, o que aconteceu até aqui.*

**Esta é uma camada de refinamento de UI/UX sobre uma fundação madura — não um rebuild.**
O plano é deliberadamente "adopt + extend", não "greenfield".

---

## 2. Reconciliação spec × realidade (o que muda na execução)

| Spec assume | Realidade no código | Decisão |
|---|---|---|
| "Fase 1: criar design system local" | Já existem `design-tokens.ts` (TYPO/SPACE/TAB/CARD/HEADER/SHEET/GLASS/LIST_ITEM), `tipologia/*` e DS em `components/agenda/ds/` (`StatusChip`, `PriorityBadge`, `EmptyState`, `StickyActionFooter`) | **Adotar + promover**. Criar só o *delta*. |
| Lista "vira master-detail" | Já é master-detail-ish: `AssistidoCard`/`AssistidoTableView`/`AssistidoQuickPreview` + `AnalyticsTab` | Preview → 4 blocos; depois split-pane desktop. |
| Timeline/Radar "embrionários" | Routers reais + componentes | **Refinar UI** + low-state honesto. |
| Pessoas "mero cadastro" | `pessoas.ts` (grafo maduro) | **Reposicionar UI**. |
| "Processo standalone cockpit" | Processo vive aninhado: `assistidos/[id]/caso/[casoId]/processo/[procId]` | Cockpit no contexto aninhado; "órfão" = callout. |
| Casos "passivo" | `casos.ts` (personas/facts/evidence/teoria) | **UI de saneamento** (empty-state + "criar caso"). |

**Gotchas:** daemon troca de branch (→ worktree dedicado); nunca `git add -A`; schema vivo = `src/lib/db/schema/*.ts`.

---

## 3. Arquitetura atual (referência)

**Rotas** `src/app/(dashboard)/admin/assistidos/`: `page.tsx` (lista); `[id]/layout.tsx` (9 abas N1); `[id]/page.tsx` (Geral); abas `{casos,demandas,audiencias,documentos,investigacao,pessoas,timeline,radar}`; `caso/[casoId]/[aba]` (15 sub-abas); `caso/[casoId]/processo/[procId]`; `novo/`, `pendentes/`, `[id]/editar/`.

**Routers** `src/lib/trpc/routers/`: `assistidos, casos, demandas, audiencias, documents, pessoas, processos, analise, radar, investigacao`.

**Schema** `src/lib/db/schema/`: `core.ts`, `casos.ts`, `agenda.ts`, `documentos.ts`, `pessoas.ts`, `relations.ts`.

---

## 4. Camada de estado canônica (fundação F1) ✅

`src/lib/assistidos/state.ts` — funções puras, fonte única:
- `completudeFicha()` — unifica **3 impls divergentes** (assistido-utils, ficha-completude, CompletudeBar)
- `attentionSignals()` — deriva + ordena por precedência os estados críticos
- `contextualCTA()` — a "Next Best Action" da doutrina §10.5
- `toSnapshot()` / `countProcessosSemCaso()` — adapters

**Precedência (produto, ajustável):** demanda atrasada → audiência próxima → processo órfão → cadastro crítico → sem contato.

---

## 5. Estados críticos (TDD primeiro)

Cobertos em `__tests__/unit/assistido-state.test.ts` (23 testes): completude/tons, cada sinal + janelas, precedência, CTA, adapters. Pendentes (próximas fases): briefing de audiência, taxonomia de documentos, empty-states de Pessoas/Radar/Timeline, painel de prazo da Nova Demanda.

---

## 6. Fases

### Fase 0 — Spec + setup ✅
- [x] Worktree dedicado + branch `feat/assistidos-redesign`
- [x] Inventário + reconciliação + plano aprovado

### Fase 1 — Fundamentos: camada de estado (lógica pura) ✅
- [x] `src/lib/assistidos/state.ts`
- [x] `__tests__/unit/assistido-state.test.ts` — 23 verdes
- Refino: primitives **visuais** adiados p/ just-in-time (F2/F3)
- Decisão (doutrina §10.13): DS compartilhado em `components/ds/` quando 1ª primitive for reusada (F3)

### Fase 2 — Lista + preview (master-detail)
**F2a — preview em 4 blocos** ✅ (código) / ⏳ (QA)
- [x] `assistido-preview-panel.tsx` — 4 blocos (Resumo / Atividade / Pendências / Ações) sobre a camada de estado; Pendências = `attentionSignals`; ação primária dominante = `contextualCTA`
- [x] `assistido-quick-preview.tsx` — reduzido a shell (Sheet + nav teclado); removidos 2º Drive duplicado, editor de nota morto, 3ª impl de completude
- [ ] QA browser (dark/light + 375/768/1024/1440)
**F2b — split-pane** (próximo): two-column no desktop; mobile mantém slide-over; simplificar item da esquerda.

### Fase 3 — Overview do assistido (cockpit)
Hero + 4 zonas (Identidade/Atenção/Estrutura/Memória) + `ImmediateAttentionPanel` + StatCards + CTA. Extrair `StatCard`/`PendingActionCard` para `components/ds/`.

### Fase 4 — Estrutura jurídica (Casos + Processo)
Empty-state inteligente + `ProcessOrCaseAlert` + "criar caso a partir do processo"; cockpit processual aninhado; Registros → timeline semântica.

### Fase 5 — Operação (Demandas, Audiências, Nova Demanda)
Faixa de resumo + ordenação por criticidade; card-briefing de audiência; Nova Demanda em etapas + `SmartDeadlinePanel`.

### Fase 6 — Memória e apoio (Documentos, Pessoas, Timeline, Radar)
Taxonomia humana; rede de apoio; memória consolidada; radar "monitoramento ativo".

### Fase 7 — Mobile + polimento
Breakpoints reais, sticky actions, microcopy, QA final (Definition of Premium Done §12).

---

## 7. Decisões abertas
1. Local exato do DS compartilhado (`components/ds/` vs promover `agenda/ds`) — resolver na F3.
2. Limpeza do branch antigo `feat/assistidos-ui-reform` (poluído com 1 commit demandas do daemon) — não urgente.

---

## 8. Conclusão — F1–F7 entregues (2026-06-24)

**Branch `feat/assistidos-redesign` · 9 commits · typecheck 0 erros · 23 testes verdes · QA visual feito (light/dark/mobile, dados reais de prod).**

| Fase | Commit | Entregue |
|---|---|---|
| F1+F2 | `ddf66394` | state engine (state.ts) + preview master-detail 4 blocos + split-pane |
| F3 | `9456d4b0` | zona Atenção Imediata + DS `components/ds/attention.tsx` |
| fix | `d2c7aa2f` | tipo/status de demanda no preview (CONCLUIDO/ARQUIVADO, não 7_/8_) |
| F4 | `a7cf9081` | processo-órfão (Casos) + `casos.criarDeProcesso` |
| F5 | `d8051c9f` `c4caf471` | Demandas (resumo+status humano) · Audiências (briefing) · Nova Demanda (etapas+SmartDeadlinePanel) |
| F6 | `5b0f742b` | empty-states Pessoas/Radar/Timeline/Documentos (Radar = monitoramento ativo) |
| F7 | `536aceb7` | foco visível por teclado (FOCUS_RING); reduced-motion já global |

**QA visual verificado:** preview 4 blocos, split-pane, Atenção Imediata (CTA contextual), callout de órfão + "Criar caso", Demandas (faixa+status), Audiências (briefing), Nova Demanda (eyebrows), dark/light parity, mobile 375 (reflow 2×2).

**Pendências (não bloqueiam; ver memória `assistidos-ui-reform-branch`):**
1. **Finding #1** — overview `processo-orfao` lê fonte M2M (`assistidos_processos`); sub-conta vs aba Casos (FK direto `processos.assistido_id`). Alinhar ao FK direto.
2. **`criarDeProcesso`** validado só por tipo — INSERT precisa de smoke test em branch DB (worktree aponta pra PROD).
3. Touch targets <44px em micro-botões (trade-off densidade) + adoção do `EmptyState` compartilhado — deferidos.

**Não feito de propósito:** push/PR (ação explícita do @devops). Branch pronto para merge quando solicitado.
