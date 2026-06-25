# Daemon: Eficiência + Action Registry (catálogo) — Implementation Plan

> **For agentic workers:** plano executado inline nesta sessão (autônomo, usuário dormindo). Steps em checkbox.

**Goal:** Deixar o motor do daemon super eficiente (roteamento de modelo, cache de prompt, limpeza de temp) e observável (métricas), e criar a fundação do Action Registry como catálogo único das skills já integradas.

**Architecture:** Mudanças concentradas em `scripts/claude-code-daemon.mjs` (motor), `src/lib/trpc/routers/system.ts` + `/admin/daemon` (métricas), e um módulo novo `src/lib/skills/action-registry.ts` (catálogo + `actionsFor`, lógica pura testável). Sem alterar fluxos de UI existentes, sem DDL no banco.

**Tech Stack:** Node ESM (daemon), TypeScript, tRPC, Drizzle, Vitest, Next 15.

## Descoberta que reescreveu o escopo (2026-06-25)

Inventário do código mostrou que ~10 skills **já têm UI bespoke** (pergunte-ao-auto, transcrever-*, analise-acordao, oficio-gratificacao, oficio-redacao, preparar-atendimentos, analise-autos/assistido). Os "novos usos" pedidos em grande parte **já existem**. Portanto:
- **NÃO** construir UI nova de usos existentes (risco de duplicar/quebrar).
- Foco autônomo: **eficiência do motor** (claramente pedido, baixo risco, verificável) + **registry como catálogo** da realidade (fundação para futura unificação/descoberta).
- **Deferido** (precisa do Defensor): investigação OSINT (skill nova), superfície de descoberta unificada, migração `attempt_count`.

## Global Constraints

- Daemon usa EXCLUSIVAMENTE conta Max (`claude -p`), sem API paga. Roteamento de modelo via `--model haiku|sonnet|opus`, nunca via API key.
- Roteamento **opt-in por skill**; skill não mapeada = comportamento atual (sem `--model`), zero regressão.
- Sem DDL no banco nesta leva (métricas computadas só de colunas existentes: `status`, `started_at`, `completed_at`, `created_at`, `skill`, `lane`).
- Não alterar fluxos de criação/exibição de tasks já existentes.
- Daemon roda via launchd; carregar mudanças = `launchctl kickstart -k gui/$(id -u)/com.ombuds.daemon`.

---

### Task 1: Roteamento de modelo no daemon

**Files:**
- Modify: `scripts/claude-code-daemon.mjs` (runClaude + novo mapa MODEL_ROUTING)
- Create: `src/lib/daemon/model-routing.mjs` (mapa + resolver, puro/testável)
- Test: `src/lib/daemon/__tests__/model-routing.test.mjs`

**Interfaces:**
- Produces: `resolveModel(skillDir: string): 'haiku'|'sonnet'|'opus'|null` — null = sem flag (default Max).

- [ ] **Step 1:** teste de `resolveModel` (haiku p/ classify-document; opus p/ juri/vvd/criminal-comum/execucao-penal; null p/ desconhecida).
- [ ] **Step 2:** rodar teste → falha (módulo não existe).
- [ ] **Step 3:** implementar `model-routing.mjs` com `MODEL_ROUTING` + `resolveModel`.
- [ ] **Step 4:** rodar teste → passa.
- [ ] **Step 5:** em `runClaude`, importar `resolveModel`, e quando não-null, inserir `--model <m>` nos args. Assinatura passa a receber `skillDir`.
- [ ] **Step 6:** commit.

### Task 2: Cache de system prompt + limpeza de temp

**Files:**
- Modify: `scripts/claude-code-daemon.mjs` (buildSystemPromptFile + cleanup no boot)

**Interfaces:**
- Consumes: nada novo.
- Produces: `buildSystemPromptFile` memoizado por skillDir (invalidado por mtime do dir), escreve temp 1× por skill.

- [ ] **Step 1:** adicionar `Map` de cache `{ skillDir → { mtimeMs, tmpFile } }`; recomputar só se mtime do dir da skill mudou.
- [ ] **Step 2:** nomear o temp por skill (`skill-${skillDir}.md`), não por task; limpar `TEMP_DIR` no boot.
- [ ] **Step 3:** validação manual: reiniciar daemon, ver no log que a skill é lida 1× e reusada.
- [ ] **Step 4:** commit.

### Task 3: Métricas do daemon (sem DDL)

**Files:**
- Modify: `src/lib/trpc/routers/system.ts` (nova procedure `daemonMetrics`)
- Modify: `src/app/(dashboard)/admin/daemon/page.tsx` (cards de métricas)

**Interfaces:**
- Produces: `system.daemonMetrics({ period })` → `{ porSkill: [{skill, p95Seg, total, falhas, taxaFalha}], filaMaisAntigaSeg }`.

- [ ] **Step 1:** implementar query SQL (PERCENTILE_CONT p95 de `completed_at-started_at` por skill; contagem de `failed`; `MIN(created_at)` de pendentes lane 'ai').
- [ ] **Step 2:** adicionar cards no `/admin/daemon` (p95 por skill, taxa de falha, idade da fila).
- [ ] **Step 3:** `npm run build` (ou typecheck) passa.
- [ ] **Step 4:** commit.

### Task 4: Action Registry (catálogo da realidade) + actionsFor

**Files:**
- Create: `src/lib/skills/action-registry.ts`
- Test: `src/lib/skills/__tests__/action-registry.test.ts`

**Interfaces:**
- Produces: `SKILL_ACTIONS: SkillAction[]`, `actionsFor(surface, context): SkillAction[]`.

- [ ] **Step 1:** teste de `actionsFor` (gating por surface/contexto/atribuição).
- [ ] **Step 2:** rodar → falha.
- [ ] **Step 3:** implementar registry catalogando as integrações REAIS já existentes (pergunte-ao-auto, transcrições, analise-acordao, oficio-gratificacao, etc.) com `surfaces/requires/result/entryPoint` + `actionsFor`. Cada entrada referencia onde já está implementada (campo `entryPoint`).
- [ ] **Step 4:** rodar → passa.
- [ ] **Step 5:** commit.

### Task 5: Verificação integrada

- [ ] Rodar suíte de testes relevante (vitest) — verde.
- [ ] Build/typecheck — sem erros novos.
- [ ] Reiniciar daemon; E2E real: inserir 1 task de skill roteada (haiku) e 1 default, confirmar `completed` (sem regressão do roteamento).
- [ ] Limpar tasks de teste.

## Deferido (precisa do Defensor) — não implementar autônomo

- **Investigação OSINT do fato** (skill nova `investigar-fato` com web search + selo "indícios a verificar"): decisão de abordagem/privacidade.
- **Superfície de descoberta unificada** (ex.: paleta ⌘K ou página "Ações de IA") consumindo o registry: decisão de UX/placement.
- **Coluna `attempt_count` + retry rate**: DDL no banco compartilhado.
- **Reaproveitar/unificar** as UIs bespoke sob o registry: refactor amplo, melhor com revisão.

## Self-review

- Cobertura: efficiency (Tasks 1-2), observability (Task 3), foundation (Task 4), verificação (Task 5). ✓
- Sem placeholders; tipos consistentes (`resolveModel`, `actionsFor`). ✓
- Escopo focado e verificável autônomo; resto explicitamente deferido. ✓
