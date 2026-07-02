# Design — C2.1: Landing do "rascunhar peça" (Fase 2c.2)

**Data:** 2026-07-02
**Autor:** Rodrigo Rocha Meire (via Claude Code)
**Status:** Design aprovado — aguardando revisão de spec
**Escopo:** Primeira fatia do **C2** ("produzir peça"). Branch: `feat/c2-rascunho-peca-landing` (do `main` @ `111c5ce6`).

---

## 1. Contexto

O C2 (4º pedido original: "quando for fazer alegações finais/apelação/resposta à acusação, abrir janela que baixa processos+mídias, analisa tudo, faz o relatório completo") decompõe em fatias sobre a **Fase 2c** (`analise-profunda-demanda`) que **já está no main**: um botão no card dispara um job **browser** que baixa os autos → encadeia um job **ai** que analisa (`analise_profunda_status: null→baixando_autos→analisando→concluida`).

Esta fatia landa o passo que **fecha o loop até a peça**: gerar um **RASCUNHO** da peça a partir da análise. Já foi construído na branch `feat/rascunho-guiado-peca` mas nunca mergeado.

## 2. O que o rascunho faz

Numa demanda com `analiseProfundaStatus === "concluida"`, o botão **"Rascunhar peça"** (card premium) pede as **linhas mestras** (orientação do defensor, via `window.prompt` — mantido como está nesta fatia) e enfileira uma `claude_code_tasks` **ai lane**, skill `dpe-ba-pecas` em "modo rascunho guiado por linhas mestras". O daemon roda `claude -p`, mapeia `peca_sugerida` (memoriais/resposta_acusacao/apelacao/rese/contrarrazoes) → referência vvd/juri via `PECA_SUGERIDA_TO_REFERENCE`, gera a minuta `.docx` com timbre DPE-BA no Drive, e grava `demandas.rascunho_drive_url` + `rascunho_status`. Badge no card mostra o estado + link.

## 3. Decisões

| Decisão | Escolha |
|---|---|
| Abordagem de landing | **Merge-and-resolve** (`git merge-tree` prevê merge LIMPO — 0 conflitos, incl. kanban-premium.tsx e routers/index.ts) |
| Migração | **renomear `0071_rascunho_peca.sql` → `0072_rascunho_peca.sql`** (0071 agora é sentença; conteúdo aditivo `ADD COLUMN IF NOT EXISTS`, sem colisão) |
| UX das linhas mestras | **`window.prompt` como está** (modal bonito vem na fatia "Produzir peça" unificada) |
| Aplicar `0072` no prod | **DEFERIDO** (com confirmação, como o `0071`/`0069`) |

## 4. O que a branch traz (16 arquivos, +909/−2)

**MODIFICADOS (aditivos):**
- `src/lib/db/schema/core.ts` (+4) — 3 colunas em `demandas`: `rascunhoStatus`, `rascunhoTaskId`, `rascunhoDriveUrl` (após os campos Fase 2c já no main).
- `src/lib/trpc/routers/index.ts` (+5) — import + wire `rascunhoPeca: rascunhoPecaRouter` (ao lado de `analiseProfunda` e `sentencas`).
- `src/lib/trpc/routers/demandas.ts` (+1) — projeta `analiseProfundaStatus` na list-query (o gate do card lê isso).
- `src/components/demandas-premium/kanban-premium.tsx` (+30/−2) — tipo do contexto, `KanbanDemanda.analiseProfundaStatus`, props (`onRascunharPeca`, `rascunhoAtivo`), o botão (ícone `FileText`, gate `analiseProfundaStatus === "concluida"`).
- `src/components/demandas-premium/demandas-premium-view.tsx` (+12) — usa `useRascunhoPecaJob`, mapeia `analiseProfundaStatus`, wire `onRascunharPeca` (`window.prompt`) + `rascunhoAtivo`.
- `.claude/skills-cowork/dpe-ba-pecas/SKILL.md` (+104) — seção "modo rascunho guiado por linhas mestras".

**NOVOS:**
- `drizzle/0071_rascunho_peca.sql` → renomear `0072` (3 `ADD COLUMN IF NOT EXISTS` em `demandas`).
- `src/lib/trpc/routers/rascunho-peca.ts` (+161) — router (`isElegivelRascunho`, `PECA_SUGERIDA_TO_REFERENCE`, `criar`, `status`).
- `src/hooks/use-rascunho-peca-job.ts` (+62) — hook de polling.
- `.claude/skills-cowork/dpe-ba-pecas/test_rascunho_instrucoes.py` (+15).
- Testes: `src/hooks/__tests__/use-rascunho-peca-job.test.ts`, `src/lib/db/schema/__tests__/demandas-rascunho.test.ts`, `src/lib/trpc/routers/__tests__/rascunho-peca-router.test.ts`, `src/lib/trpc/routers/rascunho-peca.test.ts`.
- Docs de design/plan (da branch original).

## 5. Dependências (todas satisfeitas no main)
- Coluna `analiseProfundaStatus` (`core.ts` + migração `0070_analise_profunda_status.sql`) — no main.
- Fase 2c produz a análise (`registros` tipo=analise, `peca_sugerida`) que o rascunho lê.
- **`dpe-ba-pecas` deve estar registrado no daemon ai** (`claude-code-daemon.mjs` SKILL_ALIASES) — VERIFICAR na implementação (a branch não mexe em daemon; se o skill não for conhecido, a task não roda).

## 6. Impacto em dados
- Migração `0072`: 3 colunas em `demandas` (`rascunho_status varchar(20)`, `rascunho_task_id integer`, `rascunho_drive_url text`), todas `IF NOT EXISTS`. Aditivo, reversível. Sem alteração de dados.

## 7. Testes
- **Da branch (vêm no merge):** `use-rascunho-peca-job.test.ts` (hook), `rascunho-peca-router.test.ts` + `rascunho-peca.test.ts` (router: elegibilidade, map peca_sugerida, enqueue shape), `demandas-rascunho.test.ts` (schema). Rodar `npm test` neles.
- **Verificação de integração de landing:** `routers/index.ts` mantém os 3 routers; `tsc` limpo; `next build` limpo; `dpe-ba-pecas` registrado no daemon ai.

## 8. Critérios de aceitação
1. Merge limpo da branch no worktree C2.1; nenhum dos 3 routers (`analiseProfunda`/`sentencas`/`rascunhoPeca`) perdido.
2. Migração renomeada `0071_rascunho_peca.sql` → `0072_rascunho_peca.sql`; aplicada no prod (deferido) adiciona as 3 colunas.
3. Testes da branch verdes (hook/router/schema); `tsc` + `next build` limpos.
4. `dpe-ba-pecas` é skill conhecido no daemon ai (a task de rascunho será executável).
5. O botão "Rascunhar peça" só habilita com `analiseProfundaStatus === "concluida"`; enfileira `dpe-ba-pecas` (ai lane) com as linhas mestras.

## 9. Deferidos / próximas fatias
- **Aplicar `0072` no prod** — com confirmação.
- **Verificação viva** do rascunho (daemon ai gera .docx no Drive + grava `rascunho_drive_url`) — precisa do daemon Max rodando + Drive.
- **Próximas fatias C2:** gather Drive/atendimentos na análise; associados; mídias (Lifesize + PJe Mídias); o modal unificado "Produzir peça" (substitui o `window.prompt` por um diálogo com toggles).
