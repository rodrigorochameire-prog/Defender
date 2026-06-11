# Fase 1 — App Claude SDK → Daemon + Daemon v2

**Data:** 2026-06-11
**Programa:** [Zero API Paga](./2026-06-11-programa-zero-api-paga-overview.md)
**Branch:** `feat/migracao-daemon-fase1`
**Status:** Em implementação (autônoma; sem deploy até revisão do dono)

## Objetivo

Mover **todos os call-sites in-app que chamam a API Claude paga** para o trilho do daemon (`claude -p`, conta Max), e endurecer o daemon para suportar carga (cap de concorrência + fila com prioridade). Ao fim da Fase 1, **nenhuma feature in-app depende de `ANTHROPIC_API_KEY`** no caminho normal; o guard fica fechado, com `ALLOW_CLAUDE_API` apenas como break-glass.

## Não-objetivos (Fase 1)

- WhatsApp (Fase 2), enrichment-engine (Fases 3–4), embeddings (adiado).
- Trocar o modelo do daemon (segue o default do plano = Opus 4.8).
- Refatorações não relacionadas.

## Arquitetura

### Padrão de migração (por feature)

Cada feature paga vira: **skill (system prompt com contrato JSON)** + **caller enfileira** em `claude_code_tasks` + **UI reativa** via `useSkillTask` (ou leitura de `resultado` no backend para fluxos batch).

```
[UI/tRPC]  --criarTask(skill, prompt, priority)-->  claude_code_tasks (pending)
                                                          |
                                          Realtime / catch-up
                                                          v
[Daemon Mini]  claude -p --system-prompt-file <skill>  -->  JSON  -->  resultado (completed)
                                                          |
                                       Realtime  -->  [useSkillTask]  -->  UI
```

### Contrato de resultado

`claude -p` deve emitir **um objeto JSON** espelhando o tipo TS que a UI já consome (ver `src/lib/services/anthropic.ts`). Campos de **billing** (`tokensEntrada`, `tokensSaida`, `custoEstimado`) **deixam de existir** no caminho daemon — onde a UI os exibisse, passam a `0`/omitidos e `modeloUsado` = `"claude-code-daemon"`. O daemon já re-tenta 1x se o JSON vier sujo (`tryParseResult`).

### Daemon v2 (`scripts/claude-code-daemon.mjs`)

1. **Cap de concorrência** — semáforo limitando `claude -p` simultâneos a `MAX_CONCURRENT` (default **3**, env-configurável). Hoje o handler Realtime dispara `processTask` sem limite. Introduz um **dispatcher**: tarefas entram numa fila in-memory; um loop consome respeitando o cap.
2. **Fila com prioridade** — nova coluna `priority` (`smallint`, default `100`; menor = mais urgente) e `source` (`text`) em `claude_code_tasks`. O dispatcher escolhe sempre a tarefa pendente de menor `priority` (desempate por `created_at`). Catch-up passa a `ORDER BY priority ASC, created_at ASC`.
   - **Faixas:** interativo (oficios, quickSummary, briefing) `priority=10`; lote (noticias, pdf-classifier, scraper) `priority=100`.
3. **Break-glass** — sem mudança de código; `ALLOW_CLAUDE_API` continua sendo o escape manual no app. Documentar no README do daemon.
4. **Reconcílio Realtime↔fila** — INSERT do Realtime e catch-up ambos **empurram para a mesma fila** (dedup por id), nunca chamam `processTask` direto. Mantém o lock otimista atual como segunda barreira contra corrida multi-Mac.

### Schema (migration aditiva, retrocompatível)

```sql
ALTER TABLE claude_code_tasks
  ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS source text;
CREATE INDEX IF NOT EXISTS claude_code_tasks_priority_idx
  ON claude_code_tasks (status, priority, created_at);
```

Colunas nullable/default → app atual ignora, daemon v2 usa. Drizzle: adicionar em `src/lib/db/schema/casos.ts`.

## Inventário de migração

| # | Feature | Caller atual | Skill alvo | Prioridade | Notas |
|---|---|---|---|---|---|
| 1 | `revisarOficio` | `oficios.ts:795` (tRPC) | `oficio-revisao` (nova) | 10 | saída = `RevisaoOficioResult` (sem billing) |
| 2 | `generateOficio` | `oficios.ts:719,1568` | `oficio-redacao` (existe) | 10 | saída = `{titulo, conteudoGerado}` |
| 3 | `melhorarTexto` | `oficios.ts:868` | `linguagem-defensiva` (existe) ou `oficio-revisao` | 10 | **hoje SEM guard** — adicionar |
| 4 | `analisarDadosEstruturados` | sem caller | — | — | dead code: **remover** (YAGNI) |
| 5 | `processo.quickSummary` (Opus) | `processo.ts:194` | `criminal-comum`/nova `processo-resumo` | 10 | já guardado |
| 6 | `briefing.analiseProfunda` | `briefing.ts:1039` | já parcialmente migrado | 10 | reconciliar com trilho |
| 7 | `noticias` ×3 | `noticias.ts:44,131,724` | `noticias` (existe) | 100 | batch |
| 8 | `pdf-classifier.classifyPageChunk` | `pdf-classifier.ts:30` | nova `pdf-classificacao` | 100 | batch |
| 9 | `factual/scraper` (Haiku resumo) | `scraper.ts:380` | nova `factual-resumo` | 100 | batch |

### Guard sweep

Garantir `assertClaudeApiAllowed("<feature>")` no topo de **todo** caminho que ainda toque `client.messages.create` antes da remoção, incluindo `melhorarTexto` e `src/lib/trpc/routers/document-sections.ts`. Depois que cada feature tem caminho daemon, o call-site pago é **removido** (não só guardado).

## Componentes e interfaces

- **`enqueueDaemonTask(input)`** — helper único (server-side) que insere em `claude_code_tasks` com `skill`, `prompt`, `priority`, `source`, refs (assistido/processo/caso) e `createdBy`. Reusa a lógica de `analise.criarTask`. Evita duplicação por feature.
- **Skills novas** em `.claude/skills-cowork/<nome>/SKILL.md` + alias em `SKILL_ALIASES.json`. Cada uma termina com bloco **"FORMATO DE SAÍDA (JSON obrigatório)"** descrevendo o objeto exato.
- **`useSkillTask`** — já existe; callers de UI passam a usá-lo. Para fluxos batch server-side (noticias/pdf/scraper) que não têm UI reativa, o backend enfileira e faz **poll** do `resultado` (ou processa em job Inngest que aguarda via Realtime/poll com teto).

## Tratamento de erros

- Parse falho → daemon marca `needs_review` (já implementado); UI mostra "revisão manual".
- Mini fora → tarefa fica `pending` até voltar (catch-up processa). UI mostra "processando" com timeout suave; sem fallback automático.
- Skill inexistente → daemon marca `failed` com erro claro (já implementado).

## Validação

1. **Daemon v2 (unit):** testar dispatcher (cap respeitado; ordem por prioridade) com um harness Node isolado, sem tocar produção.
2. **Skills (integração no Mini):** inserir tarefa de teste por skill, conferir `resultado` JSON == shape esperado.
3. **Por feature:** clicar no app (preview/branch) → `pending→processing→completed` → UI idêntica ao SDK.
4. **Guard:** com guard fechado e sem caminho daemon, chamada paga lança erro claro (teste).
5. **`npm run typecheck` + `npm run build`** verdes na branch.

## Rollout (seguro)

1. Branch `feat/migracao-daemon-fase1` (worktree isolado; `main`/daemon vivo intactos).
2. Implementar daemon v2 + migration + skills + callers na branch.
3. **Swap do daemon vivo e push da migration de schema só com o dono presente** (manhã), com backup do daemon atual para revert imediato.
4. Deploy de produção (`main`) após o dono testar no preview.

## Riscos

| Risco | Mitigação |
|---|---|
| Swap do daemon quebra botões IA à noite | Não trocar à noite; backup + revert; testar antes |
| JSON contract divergente quebra feature | Skill com formato explícito + retry do daemon + validação por feature |
| Concorrência estoura RAM/cota Max | Cap=3 conservador; ajustável por env |
| Fluxos batch sem UI reativa | Helper de poll server-side com teto de tempo |
| `briefing` em estado intermediário | Reconciliar com cuidado; não duplicar enfileiramento |
