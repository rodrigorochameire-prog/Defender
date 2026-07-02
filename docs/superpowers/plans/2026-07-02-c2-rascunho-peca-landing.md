# C2.1 — Landing do "rascunhar peça" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trazer o passo "rascunhar peça" (Fase 2c.2, branch `feat/rascunho-guiado-peca`) para o `main` atual, fechando o loop da Fase 2c até a geração de um rascunho de peça.

**Architecture:** `git merge-tree` prevê merge LIMPO (0 conflitos). A abordagem é **merge-and-resolve**: mergear a branch no worktree C2.1, com UMA correção manual que o git não pega (renomear a migração `0071_rascunho_peca.sql` → `0072`, porque `0071` agora é sentença no main). Tudo aditivo.

**Tech Stack:** Next.js 15 + tRPC + Drizzle (Postgres), vitest; daemon ai (`claude -p`) roda a skill `dpe-ba-pecas` (via alias `gerar-peca`).

## Global Constraints

- **Merge, não cherry-pick** (`git merge-tree` limpo). Branch a mergear: `origin/feat/rascunho-guiado-peca`.
- **Renomear a migração** `drizzle/0071_rascunho_peca.sql` → `drizzle/0072_rascunho_peca.sql` (0071 tomado por sentença; conteúdo = 3 `ALTER TABLE demandas ADD COLUMN IF NOT EXISTS`, aditivo).
- **UX das linhas mestras:** `window.prompt` da branch, **mantido como está** (modal unificado é fatia futura).
- **Skill do daemon:** o router enfileira `skill:"gerar-peca"`, já aliasado `→ dpe-ba-pecas` no main. **Nada a mudar no daemon.**
- **routers/index.ts** deve manter os 3 routers: `analiseProfunda`, `sentencas`, e o novo `rascunhoPeca`.
- **Aplicar `0072` no prod = DEFERIDO** (com confirmação).
- **Fora de escopo:** Drive/atendimentos gather, associados, mídias, modal unificado.
- Spec: `docs/superpowers/specs/2026-07-02-c2-rascunho-peca-landing-design.md`.
- Worktree de trabalho: `/Users/rodrigorochameire/Projetos/Defender-c2` (branch `feat/c2-rascunho-peca-landing`).

---

### Task 1: Mergear a branch + renomear migração + verificar

**Files:**
- Merge traz (NOVOS): `src/lib/trpc/routers/rascunho-peca.ts`, `src/hooks/use-rascunho-peca-job.ts`, `drizzle/0071_rascunho_peca.sql` (→ renomear), `.claude/skills-cowork/dpe-ba-pecas/test_rascunho_instrucoes.py`, 4 testes (`src/hooks/__tests__/use-rascunho-peca-job.test.ts`, `src/lib/db/schema/__tests__/demandas-rascunho.test.ts`, `src/lib/trpc/routers/__tests__/rascunho-peca-router.test.ts`, `src/lib/trpc/routers/rascunho-peca.test.ts`), docs.
- Merge traz (MODIFICADOS): `src/lib/db/schema/core.ts`, `src/lib/trpc/routers/index.ts`, `src/lib/trpc/routers/demandas.ts`, `src/components/demandas-premium/kanban-premium.tsx`, `src/components/demandas-premium/demandas-premium-view.tsx`, `.claude/skills-cowork/dpe-ba-pecas/SKILL.md`.
- Rename: `drizzle/0071_rascunho_peca.sql` → `drizzle/0072_rascunho_peca.sql`.

**Interfaces:**
- Produces: `rascunhoPecaRouter` (`criar`, `status`), hook `useRascunhoPecaJob`, colunas `demandas.rascunhoStatus/rascunhoTaskId/rascunhoDriveUrl`, botão "Rascunhar peça".

- [ ] **Step 1: Confirmar merge limpo (dry-run) + mergear**

```bash
cd /Users/rodrigorochameire/Projetos/Defender-c2
git fetch origin
git merge-tree --write-tree origin/main origin/feat/rascunho-guiado-peca | head -1   # deve imprimir só um hash, sem CONFLICT
git merge origin/feat/rascunho-guiado-peca --no-edit
```
Expected: merge sem conflito ("Merge made by the 'ort' strategy"). Se aparecer CONFLICT (main pode ter avançado), resolver mantendo AMBOS os lados (todos os routers/botões) e seguir.

- [ ] **Step 2: Renomear a migração para 0072**

```bash
ls drizzle/*.sql | grep -oE "00[0-9]+" | sort -u | tail -3   # confirmar 0070/0071 tomados; 0072 livre
git mv drizzle/0071_rascunho_peca.sql drizzle/0072_rascunho_peca.sql
git commit -am "chore(migração): renomeia 0071_rascunho_peca → 0072 (0071 é sentença no main)"
```
(Se `ls` mostrar 0072 já presente, usar o próximo livre.)

- [ ] **Step 3: Verificar os 3 routers no wire**

Run: `grep -E "analiseProfunda:|sentencas:|rascunhoPeca:" src/lib/trpc/routers/index.ts`
Expected: as 3 linhas presentes. Se faltar alguma, o merge dropou um irmão — reabrir e corrigir.

- [ ] **Step 4: Rodar os testes da branch**

Run: `npm test -- src/lib/trpc/routers/rascunho-peca src/hooks/__tests__/use-rascunho-peca-job.test.ts src/lib/db/schema/__tests__/demandas-rascunho.test.ts`
Expected: PASS — os testes de router (`refParaAtribuicao`/`isElegivelRascunho`/`buildRascunhoTaskMeta`), hook e schema verdes.

- [ ] **Step 5: Confirmar o alias do skill no main (sanity, read-only)**

Run: `grep -E "gerar-peca|dpe-ba-pecas" .claude/skills-cowork/SKILL_ALIASES.json scripts/claude-code-daemon.mjs | head`
Expected: `"gerar-peca": "dpe-ba-pecas"` presente (o daemon resolve a task). Se ausente, PARAR e reportar (a task não rodaria).

- [ ] **Step 6: Typecheck dos arquivos tocados**

Run: `npx tsc --noEmit 2>&1 | grep -E "rascunho|kanban-premium|demandas-premium-view|routers/index|core\.ts" || echo "no type errors in touched files"`
Expected: sem erros nos arquivos tocados.

- [ ] **Step 7: Commit (o merge + rename já commitados; este garante estado limpo)**

```bash
git status --short   # deve estar limpo após os commits acima
git log --oneline -3
```

---

### Task 2: Build de produção + memória

**Files:** verify only + memória.

- [ ] **Step 1: Build de produção**

Run: `NODE_OPTIONS=--max-old-space-size=8192 npm run build > /tmp/c2-build.log 2>&1; echo "C2_BUILD_EXIT=$?"; grep -E "C2_BUILD_EXIT|Failed to compile|✓ Generating static pages" /tmp/c2-build.log | tail -3`
Expected: `C2_BUILD_EXIT=0`, sem "Failed to compile".

- [ ] **Step 2: Atualizar memória** — nota `project_c2_rascunho_landing.md` (ou estender `project_c1_sentenca_landing.md`/uma nota C2): C2.1 landa `feat/rascunho-guiado-peca` (rascunhar peça / Fase 2c.2) — router `rascunho-peca.ts` (enqueue `gerar-peca`→`dpe-ba-pecas` ai lane, mapeia `peca_sugerida`→referência vvd/juri), hook, 3 colunas `demandas.rascunho_*` (migração 0072), botão gated no card (`analiseProfundaStatus==='concluida'`), window.prompt p/ linhas mestras. DEFERIDOS: aplicar 0072 no prod, verificação viva do .docx. Próximas fatias C2: Drive/atendimentos gather, associados, mídias, modal unificado. Atualizar `MEMORY.md`.

- [ ] **Step 3: Registrar no ledger SDD** que C2.1 está pronto (commits do merge+rename).

---

## Self-Review

**Spec coverage:** §3 (merge-and-resolve) → Task 1 Step 1; §3 (renumerar) → Task 1 Step 2; §4 (arquivos) → Task 1 (merge traz todos); §5 (dependências/daemon) → Task 1 Step 5; §7 (testes) → Task 1 Step 4; §8 critérios: #1 Step 3, #2 Step 2 (+apply deferido), #3 Step 4+6 e Task 2 Step 1, #4 Step 5, #5 (botão gated) coberto pelos testes de router + kanban no merge.

**Placeholder scan:** sem TODOs; o único ponto condicional (renumerar p/ próximo livre se 0072 tomado) tem verificação `ls drizzle/`.

**Type/nome consistency:** `rascunhoPecaRouter`/`useRascunhoPecaJob`/`rascunhoStatus` vêm da branch (contrato já testado nos testes que acompanham). Migração `0072` consistente entre Task 1 Step 2 e §8.

**Nota:** esta fatia é majoritariamente landing (merge limpo). O valor de TDD é baixo (código já testado na branch); a verificação real é: merge não perde nada, migração renumerada, testes da branch verdes, build limpo, skill resolvível.
