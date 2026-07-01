# Design — Auditabilidade de importações e varreduras (Subsistema B)

**Data:** 2026-07-01
**Autor:** Rodrigo Rocha Meire (via Claude Code)
**Status:** Design aprovado — aguardando revisão de spec
**Escopo:** Subsistema **B** do plano A → B → C. Depende de A (paridade de anotações), já mergeado em `feat/modo-mobile`. Ramo de B: `feat/triagem-auditoria`.

---

## 1. Contexto e problema

O usuário pediu auditoria tanto das **importações** de intimações quanto das **análises de triagem (varredura)**. Hoje a proveniência é parcial e não há tela de histórico.

Estado atual (investigado no código):

- **Importações** já são bem rastreadas: `pje_import_staging` (texto bruto, `content_hash`, `decisao`) + o ledger permanente `pje_intimacoes_ledger` (`first_seen_at`/`last_seen_at`); cada execução é um `claude_code_tasks` (skill, `created_by`, `resultado`, timestamps). Existe `ultimaImportacao` (`src/lib/trpc/routers/intimacoes.ts:336`).
- **Lacunas confirmadas:**
  1. `pje_intimacoes_ledger.demanda_id` é **sempre null** — `confirmarImport` (`intimacoes.ts:373`) chama `importarDemandas` (`src/lib/services/pje-import.ts`), que retorna **apenas contadores agregados**; comentário explícito em `intimacoes.ts:379-381,454` ("não temos como vincular per-row sem refatorar importarDemandas").
  2. A varredura **não grava `resultado` estruturado**: o script `varredura_triagem.py` só faz `print_report` (stdout); o `claude_code_tasks.resultado` guarda um `stdoutTail` bruto, não `{total, ok, …}`. Não há **`ultimaVarredura`** (só `statusVarredura(jobId)`).
  3. Demandas não têm `analyzed_at` — "quando foi classificada" só é inferível pelos efeitos colaterais (registros/`updated_at`).
  4. **Não há UI de histórico** de importações/varreduras (só rotas por-job) e a tabela genérica `audit_logs` **é um stub**: `src/lib/trpc/routers/auditLogs.ts` tem `// TODO: Implementar quando tabela audit_logs existir`; nada lê/escreve nela.

## 2. Objetivo

Dar visibilidade e proveniência completas às importações e varreduras: **quem** rodou **o quê**, **quando**, **com que resultado**, **quais demandas** foram afetadas e **o que mudou** em cada uma — com uma tela de histórico read-only.

**Não-objetivos:** ações de re-execução/undo na UI (read-only); atribuição de ator por escrita via GUC de sessão (futuro); qualquer coisa do Subsistema C (roteamento de skills).

## 3. Decisões (brainstorming)

| Decisão | Escolha |
|---|---|
| População do `audit_logs` | **Triggers de banco (abrangente)** — capturam toda escrita, inclusive varredura/daemon/PostgREST; ator via *join* com a execução |
| Tela de histórico | **Read-only + drill-down** |
| Backfill de proveniência | **Futuro + backfill histórico best-effort** (match por `pje_documento_id`) |
| Nível do diff no trigger | Diff só das **colunas alteradas**; ruído filtrado na UI |
| Tabelas auditadas | `demandas`, `registros`, `audiencias` |

## 4. Design

### B1 · Proveniência por demanda

- **`importarDemandas` (`src/lib/services/pje-import.ts`)** passa a retornar, além dos contadores, um **mapa por linha**: `rows: Array<{ pjeDocumentoId: string, demandaId: number, action: 'imported'|'updated'|'skipped' }>`. Interface: mantém o objeto de retorno atual e **adiciona** `rows`.
- **`confirmarImport` (`intimacoes.ts`)** usa `result.rows` para preencher `pje_intimacoes_ledger.demanda_id` no upsert do ledger (hoje deixado null em `:454`). Match por `pje_documento_id`.
- **Coluna `demandas.analyzed_at` (timestamptz, nullable)** — carimbada pela varredura em `apply_classification` (junto de `revisao_pendente=false`) toda vez que uma demanda é classificada. Migração DDL.
- **Backfill (script único, `scripts/audit/backfill_ledger_demanda.mjs`)**: para cada `pje_intimacoes_ledger` com `demanda_id IS NULL`, faz match `ledger.pje_documento_id = demandas.pje_documento_id` (chave estável) e grava `demanda_id`. Idempotente; loga quantos casaram / não casaram.

### B2 · Observabilidade das execuções

- **Resultado estruturado da varredura:** `varredura_triagem.py` passa a montar um dict `{atribuicao, since, limit, total, ok, manual_review, nao_painel, erros, atos: {<ato>: n}}` a partir das mesmas `stats`/`counts` de `print_report`, e a **gravar em `claude_code_tasks.resultado`** via o cliente `Supabase` (mesmo padrão do worker de importação, que já carimba seu `resultado`). Requer o **`job_id`** no script — passar via `--job-id` (como o worker de importação recebe); confirmar o plumbing na implementação. Se o `job_id` não estiver disponível, o script imprime um marcador `[[VARREDURA_RESULT]]{json}` na última linha para o daemon extrair (fallback).
- **`ultimaVarredura`** (nova query em `intimacoes.ts`, espelha `ultimaImportacao`): retorna o último `claude_code_tasks` `completed` com `skill='varredura-triagem'` — `finishedAt`, `resultado` (contadores), `atribuicoes`, `created_by`.

### B3 · Trilha de auditoria (triggers)

- **Migração** cria/confirma a tabela `audit_logs` (schema já em `src/lib/db/schema/audit.ts`: `id, user_id, user_name, entity_type, entity_id, action, changes jsonb, metadata jsonb, created_at`).
- **Função de trigger `fn_audit_row()`** (PL/pgSQL): em `AFTER INSERT/UPDATE/DELETE`, insere uma linha em `audit_logs` com `entity_type = TG_TABLE_NAME`, `entity_id = COALESCE(NEW.id, OLD.id)`, `action` mapeada (`create`/`update`/`delete`), e `changes` = **diff apenas das colunas que mudaram** (para UPDATE: `{col: {old, new}}` só onde `NEW.col IS DISTINCT FROM OLD.col`; para INSERT: snapshot enxuto; para DELETE: chave + snapshot). `user_id/user_name` = NULL para escritas automáticas (ator reconstruído por join na UI — B4).
- **Triggers** anexados a `demandas`, `registros`, `audiencias`.
- **Controle de ruído:** o trigger grava o diff bruto; a **query da UI** filtra para mudanças significativas (ex.: em `demandas`, campos `status`/`ato`/`tipo_ato`/`prazo`/`analyzed_at`; ignora `updated_at`/`synced_at` puros). Alternativa considerada e rejeitada: whitelist de colunas no trigger (menos flexível; perde histórico se a whitelist mudar).
- **Perf:** `registros` recebe muitos INSERTs por varredura; a função é mínima (um diff + um INSERT), sem SELECTs. Aceitável para os volumes atuais (dezenas por execução).
- Implementar o router stub `auditLogs.list`/`stats` contra a tabela real (`auditLogs.ts`).

### B4 · Tela de histórico (read-only)

- **Rota** `src/app/(dashboard)/admin/auditoria/page.tsx`.
- **Lista de execuções:** `claude_code_tasks` com `skill IN ('pje-intimacoes-import','varredura-triagem')`, ordenado `id DESC`, exibindo: skill (rótulo amigável), **quem** (`created_by` → `users.name`), `started_at`/`completed_at`, `status`, e os contadores de `resultado`.
- **Drill-down** (ao abrir uma execução): demandas afetadas + mudanças do `audit_logs` na janela da execução.
  - Varredura: demandas via `instrucao_adicional.demandaIds` quando presente; senão por janela de tempo (`audit_logs.created_at ∈ [started_at, completed_at]` nas entidades `demandas`/`registros`).
  - Importação: demandas via `import_batch_id` (já em `demandas`) e/ou ledger rows do job (`pje_intimacoes_ledger.job_id`).
- **Atribuição de ator (via join):** para linhas de `audit_logs` com `user_id` nulo, a UI infere o ator correlacionando `created_at` à execução ativa naquele intervalo (a que tem o `started_at`/`completed_at` envolvendo o timestamp), exibindo "por <run> (<created_by>)".
- **Novas queries tRPC:** `auditoria.listRuns`, `auditoria.runDetail(taskId)`; e `auditLogs.list`/`stats` implementadas.

## 5. Impacto em dados (DDL — diferente de A)

- **Migração(ões)**: (a) coluna `demandas.analyzed_at timestamptz`; (b) tabela `audit_logs` (se ainda não existir no banco) conforme `audit.ts`; (c) função `fn_audit_row()` + 3 triggers (`demandas`, `registros`, `audiencias`).
- **Deploy:** gerar arquivos de migração Drizzle; observar que este projeto já aplicou schema **direto no prod** em alguns casos (ex.: `registros.prazo`, tabelas carreira) — a implementação deve documentar se as triggers vão por arquivo de migração + `db:push` ou aplicação direta, e confirmar antes de rodar no prod.
- **Sem alteração** de dados existentes exceto o **backfill** best-effort de `pje_intimacoes_ledger.demanda_id` (só preenche nulos).

## 6. Arquivos afetados (previsão)

| Arquivo | Mudança |
|---|---|
| `src/lib/services/pje-import.ts` | `importarDemandas` retorna `rows[]` (mapa pje_documento_id→demanda_id) |
| `src/lib/trpc/routers/intimacoes.ts` | `confirmarImport` preenche `ledger.demanda_id`; nova query `ultimaVarredura` |
| `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py` | resultado estruturado → `claude_code_tasks.resultado`; carimba `demandas.analyzed_at` em `apply_classification` |
| `drizzle/00NN_audit_triggers.sql` (+ snapshot) | `demandas.analyzed_at`, `audit_logs`, `fn_audit_row()`, triggers |
| `src/lib/db/schema/*.ts` | tipar `demandas.analyzedAt`; garantir `audit_logs` no schema |
| `src/lib/trpc/routers/auditLogs.ts` | implementar `list`/`stats` contra a tabela real |
| `src/lib/trpc/routers/auditoria.ts` (novo) | `listRuns`, `runDetail` |
| `src/app/(dashboard)/admin/auditoria/page.tsx` (novo) + componentes | tela read-only + drill-down |
| `scripts/audit/backfill_ledger_demanda.mjs` (novo) | backfill único de `demanda_id` |
| Testes (TS + Python + SQL) | mapa de importarDemandas, linkage do ledger, função de trigger, ultimaVarredura/listRuns, matching do backfill, componentes da UI |

## 7. Testes

- **B1:** unit de `importarDemandas` (retorna `rows` corretos por `pje_documento_id`); `confirmarImport` grava `demanda_id` (mock do serviço); matching do backfill.
- **B2:** parsing do resultado estruturado da varredura (função pura testável, padrão standalone Python); `ultimaVarredura` (SQL/tRPC).
- **B3:** teste SQL da função de trigger — em transação: INSERT/UPDATE/DELETE numa demanda → asserta 1 linha em `audit_logs` com `action` e `changes` (diff só das colunas alteradas). Rollback ao fim.
- **B4:** `listRuns`/`runDetail` (SQL/builder); componentes da lista e do drill-down (@testing-library) com dados mock; atribuição de ator por janela.

## 8. Critérios de aceitação

1. Após uma importação confirmada, as linhas de `pje_intimacoes_ledger` correspondentes têm `demanda_id` preenchido (não mais null).
2. O backfill preenche `demanda_id` para linhas históricas que casam por `pje_documento_id`, e loga os que não casaram.
3. Uma demanda classificada pela varredura recebe `analyzed_at`.
4. Uma execução de varredura concluída tem `claude_code_tasks.resultado` estruturado (`{total, ok, manual_review, nao_painel, erros, atos}`), e `ultimaVarredura` o retorna.
5. INSERT/UPDATE/DELETE em `demandas`/`registros`/`audiencias` gera linha em `audit_logs` com o diff das colunas alteradas; um UPDATE que só toca `updated_at` não polui a UI (filtrado).
6. A tela `/admin/auditoria` lista execuções (import + varredura) com quem/quando/status/contadores e permite drill-down para demandas afetadas + mudanças, atribuindo o ator por janela quando `user_id` é nulo.
7. Sem regressão em A nem no fluxo de importação/varredura; migrações reversíveis (drop triggers/função/coluna).

## 9. Sequência maior (contexto)

- **A (feito, mergeado):** paridade de anotação + card nunca em branco.
- **B (este doc):** auditabilidade.
- **C:** roteamento por ato — (C1) inteligência de sentença/acórdão (branches `feat/sentenca-intelligence`/`feat/acordao-intelligence`); (C2) modal "produzir peça" (download principal+associados → mídias → Drive → análise → relatório).
