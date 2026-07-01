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
  4. **Não há UI de histórico** de importações/varreduras (só rotas por-job).

**Estado real do `audit_logs` (corrigido após revisão de spec):** a tabela **JÁ EXISTE e está populada** (~719 linhas no prod, crescendo; criada em `drizzle/0000_purple_spencer_smythe.sql`, reasserida em `0029_eager_vargas.sql`). É escrita **hoje** pelo helper app-level `src/lib/audit.ts` `logAudit()` a partir de ~8 sítios em `src/lib/trpc/routers/demandas.ts` (create/update/status_change/delete/import) e `vida-funcional.ts` — com `user_id` real, diff curado (`diffFields`) e ações semânticas. O que é **stub** é apenas o *router de leitura* `src/lib/trpc/routers/auditLogs.ts` (`// TODO: Implementar quando tabela audit_logs existir`), e existe uma página órfã `src/app/(dashboard)/admin/audit-logs/page.tsx` que consome `trpc.auditLogs.list/stats` (renderiza vazio) e cujos campos esperados (`success`, `error_code`, `ip_address`, ações `promote_admin`/`login`) **não batem** com o schema real (`audit.ts`).

**Lacuna real do audit trail:** as escritas **automáticas** que ocorrem FORA do tRPC — a **varredura** (script Python via PostgREST) e a **importação via `intimacoes.confirmarImport`** — **não** passam por `logAudit()`, então não deixam rastro em `audit_logs`. As mutações da UI de demandas já deixam.

## 2. Objetivo

Dar visibilidade e proveniência completas às importações e varreduras: **quem** rodou **o quê**, **quando**, **com que resultado**, **quais demandas** foram afetadas e **o que mudou** em cada uma — com uma tela de histórico read-only.

**Não-objetivos:** ações de re-execução/undo na UI (read-only); atribuição de ator por escrita via GUC de sessão (futuro); qualquer coisa do Subsistema C (roteamento de skills).

## 3. Decisões (brainstorming)

| Decisão | Escolha |
|---|---|
| População do `audit_logs` | **Estender o `logAudit()` explícito aos caminhos automáticos** (varredura/importação escrevem `audit_logs` com o ator EXATO — `system: varredura #<job>` — e metadados do job). **Sem triggers** → sem log duplicado, sem adivinhação por janela de tempo, atribuição exata, sem custo em `registros`. |
| Tela de histórico | **Read-only + drill-down**, numa **nova rota `/admin/auditoria`**; a página órfã `/admin/audit-logs` é redirecionada/removida (uma só superfície de auditoria) |
| Backfill de proveniência | **Futuro + backfill histórico best-effort** (match por `pje_documento_id`) |
| Entidades auditadas pelos caminhos automáticos | tabelas `demandas`/`registros`/`audiencias` (as que a varredura muta) — via escrita explícita, não trigger; `entity_type` gravado em **singular** (`demanda`/`registro`/`audiencia`) p/ bater com o `logAudit` existente |
| `audit_logs` schema | Reusar o **schema real** (`src/lib/db/schema/audit.ts`): `user_id, user_name, entity_type, entity_id, action, changes jsonb, metadata jsonb, created_at` |

## 4. Design

### B1 · Proveniência por demanda

- **`importarDemandas` (`src/lib/services/pje-import.ts`)** passa a retornar, além dos contadores, um **mapa por linha**: `rows: Array<{ pjeDocumentoId: string, demandaId: number, action: 'imported'|'updated'|'skipped' }>`. Interface: mantém o objeto de retorno atual e **adiciona** `rows`.
- **`confirmarImport` (`intimacoes.ts`)** usa `result.rows` para preencher `pje_intimacoes_ledger.demanda_id` no upsert do ledger (hoje deixado null em `:454`). Match por `pje_documento_id`.
- **Coluna `demandas.analyzed_at` (timestamptz, nullable)** — carimbada pela varredura em `apply_classification` (junto de `revisao_pendente=false`) toda vez que uma demanda é classificada. Migração DDL.
- **Backfill (script único, `scripts/audit/backfill_ledger_demanda.mjs`)**: para cada `pje_intimacoes_ledger` com `demanda_id IS NULL`, faz match `ledger.pje_documento_id = demandas.pje_documento_id` e grava `demanda_id`. Idempotente; loga quantos casaram / não casaram. **Nota:** `demandas.pje_documento_id` **não tem unique constraint** no banco (0 duplicatas hoje, mas nada impede no futuro) — o backfill deve **tratar match múltiplo** (escolher determinístico: menor/maior `id`, ou marcar "ambíguo" e pular), não assumir 1:1.

### B2 · Observabilidade das execuções

- **Resultado estruturado da varredura.** Hoje o `claude_code_tasks.resultado` da varredura **já é preenchido** — mas com `{ok, stdoutTail}`, não contadores. Quem executa a varredura é o **`browser-broker-daemon.mjs`** (a task é `lane='browser'`, `intimacoes.ts:509,533`; o `claude-code-daemon.mjs` só trata `lane='ai'` e ignora esta). Fato crítico: o broker **já** tem `buildResultado(stdout)` (~:243-253) que casa por regex um blob JSON no fim do stdout e **sobrescreve incondicionalmente** o `resultado` após o processo filho sair (~:340-345). Portanto:
  - **Rota escolhida (sem novo plumbing de PATCH):** `varredura_triagem.py` imprime, como **última linha do stdout**, o JSON estruturado `{atribuicao, since, limit, total, ok, manual_review, nao_painel, erros, atos:{<ato>:n}}` (a partir das `stats`/`counts` de `print_report`). O `buildResultado` existente o captura em `resultado`. Ajuste mínimo no broker apenas se o regex atual não casar o formato (confirmar na implementação).
  - **NÃO** usar `PATCH` mid-run do `resultado` pelo script — seria clobberado pelo overwrite final do broker.
  - `--job-id` **não é necessário para o resultado**; é necessário só para B3 (carimbar `metadata.job_id`).
  > Não confundir: `enqueue_ai_task()` (script ~:404) cria uma linha `claude_code_tasks` **diferente** (`skill='analise-intimacao'`, `lane='ai'`, `instrucao_adicional.demanda_ids` snake_case) — task de enriquecimento downstream, não a metadata da varredura.
- **`ultimaVarredura`** (nova query em `intimacoes.ts`, espelha `ultimaImportacao`): último `claude_code_tasks` `completed` com `skill='varredura-triagem'` — `finishedAt`, `resultado` (contadores), `atribuicao`, `created_by`.

### B3 · Trilha de auditoria (escrita explícita nos caminhos automáticos — SEM triggers)

Rejeitado (na revisão): triggers de banco — duplicariam cada escrita da UI que o `logAudit()` já registra (ator NULL + diff full-column vs. ator real + diff curado) e forçariam adivinhação de ator por janela de tempo (há execuções de varredura concorrentes/sobrepostas no prod — tasks #1351/#1352). Em vez disso, **instrumentar explicitamente os caminhos que hoje escapam do `logAudit`**, com o **ator exato** já conhecido (o job).

- **Convenção de `entity_type` (SINGULAR):** para unificar com as linhas já existentes, usar os MESMOS valores que o `logAudit` da UI já grava — **`'demanda'`** (singular, ×5 em `demandas.ts`), e por extensão **`'registro'`**, **`'audiencia'`** (singular). NÃO usar plural (`demandas`), que criaria dois vocabulários incompatíveis para a mesma entidade e quebraria os filtros de `listRuns`/drill-down.
- **Varredura (`varredura_triagem.py`):** ao classificar cada demanda em `apply_classification`, além dos efeitos atuais, insere uma linha em `audit_logs` (via cliente `Supabase`/PostgREST) com `entity_type='demanda'`, `entity_id=demanda_id`, `action='update'`, `changes` = diff curado (`ato`/`prioridade`/`prazo`/`analyzed_at` que mudaram), `user_id` = o defensor **já disponível in-process** (`DEFENSOR_ID`, de `--defensor-id`; **não** precisa de lookup por job), `user_name` do defensor, `metadata = {source:'varredura', job_id, skill:'varredura-triagem'}`. Idem para registros criados (`entity_type='registro'`) e audiências agendadas (`entity_type='audiencia'`). Escrita em `try/except` (nunca quebra a varredura). Helper Python `audit_write(sb, ...)` encapsula o shape (paridade com `logAudit`). **`--job-id`** (novo arg, passado pelo broker) alimenta só `metadata.job_id`.
- **Importação (`intimacoes.confirmarImport`):** o caminho de importação de intimações não passa pelo `logAudit` de `demandas.ts`; adicionar uma chamada `logAudit()` (TS, ator = `ctx.user`) por demanda importada/atualizada, `action='import'`, `entity_type='demanda'`, `metadata={source:'pje-import', job_id, import_batch_id}`.
- **Shape do diff:** só colunas que mudaram (`{col:{old,new}}`), reusando a semântica de `diffFields`/`logAudit` para consistência com as linhas já existentes.
- **Sem migração de audit_logs** (a tabela já existe — ver B-migrations). Apenas **validar drift** do schema real vs. `audit.ts` antes de escrever.
- Implementar o router `auditLogs.list`/`stats` contra a tabela **real** (schema `audit.ts`), e **corrigir/rota a página órfã** `/admin/audit-logs` (redirect p/ `/admin/auditoria` ou remoção) para não reviver com campos inexistentes.

### B4 · Tela de histórico (read-only)

- **Rota** `src/app/(dashboard)/admin/auditoria/page.tsx`.
- **Lista de execuções:** `claude_code_tasks` com `skill IN ('pje-intimacoes-import','varredura-triagem')`, ordenado `id DESC`, exibindo: skill (rótulo amigável), **quem** (`created_by` → `users.name`), `started_at`/`completed_at`, `status`, e os contadores de `resultado`.
- **Drill-down** (ao abrir uma execução): demandas afetadas + mudanças do `audit_logs`, **filtrando por `metadata.job_id`** (ligação exata, sem janela de tempo). A varredura/importação carimbam `metadata.job_id` nas linhas de `audit_logs` (B3), então o drill-down é uma query direta `WHERE metadata->>'job_id' = <task.id>` — robusto mesmo com execuções concorrentes/sobrepostas.
- **Atribuição de ator:** direta — as linhas de audit já trazem `user_id`/`user_name` reais (varredura = `job.created_by`; importação = `ctx.user`). Sem inferência por janela.
- **Novas queries tRPC:** `auditoria.listRuns`, `auditoria.runDetail(taskId)` (une o `claude_code_tasks` da execução às linhas de `audit_logs` por `metadata.job_id`); e `auditLogs.list`/`stats` implementadas contra o schema real.

## 5. Impacto em dados (DDL — mínimo)

- **Única DDL nova:** coluna `demandas.analyzed_at timestamptz` (nullable) + tipagem em `schema/*.ts`. **Sem triggers, sem nova tabela** (`audit_logs` já existe).
- **Validação de drift (não é DDL):** antes de escrever em `audit_logs`, confirmar que o schema real no prod (719+ linhas) bate com `src/lib/db/schema/audit.ts` — colunas/tipos, o vocabulário de `action`, **e o vocabulário de `entity_type` já em uso** (as novas escritas devem reusar `demanda`/`registro`/`audiencia` singular; ver B3). Corrigir `audit.ts` se houver divergência (não alterar a tabela às cegas).
- **Deploy:** gerar arquivo de migração Drizzle para `analyzed_at`; este projeto já aplicou schema **direto no prod** em alguns casos (ex.: `registros.prazo`) — confirmar a via (migration file + `db:push` vs. direto) antes de rodar.
- **Alteração de dados existentes:** apenas o **backfill** best-effort de `pje_intimacoes_ledger.demanda_id` (só preenche nulos).

## 6. Arquivos afetados (previsão)

| Arquivo | Mudança |
|---|---|
| `src/lib/services/pje-import.ts` | `importarDemandas` retorna `rows[]` (mapa pje_documento_id→demanda_id) |
| `src/lib/trpc/routers/intimacoes.ts` | `confirmarImport` preenche `ledger.demanda_id`; nova query `ultimaVarredura` |
| `.claude/skills-cowork/varredura-triagem/scripts/varredura_triagem.py` | `--job-id` (só p/ `metadata.job_id`); imprime JSON estruturado na última linha do stdout; carimba `demandas.analyzed_at`; **`audit_write()`** por demanda/registro/audiência afetada (`entity_type` singular) |
| `scripts/browser-broker-daemon.mjs` | passar `--job-id` ao script; garantir que `buildResultado` (~:243-253) casa o JSON estruturado da última linha (ajustar regex se preciso) — é ele, não o `claude-code-daemon.mjs`, que roda a lane `browser` |
| `drizzle/00NN_demandas_analyzed_at.sql` (+ snapshot) | só `demandas.analyzed_at` |
| `src/lib/db/schema/*.ts` | tipar `demandas.analyzedAt`; validar `audit_logs` vs. prod (drift) |
| `src/lib/audit.ts` / `src/lib/trpc/routers/intimacoes.ts` | `confirmarImport` chama `logAudit()` por demanda importada; nova query `ultimaVarredura` |
| `src/lib/services/pje-import.ts` | `importarDemandas` retorna `rows[]` |
| `src/lib/trpc/routers/auditLogs.ts` | implementar `list`/`stats` contra o schema real (`audit.ts`) |
| `src/lib/trpc/routers/auditoria.ts` (novo) | `listRuns`, `runDetail` (join por `metadata.job_id`) |
| `src/app/(dashboard)/admin/auditoria/page.tsx` (novo) + componentes | tela read-only + drill-down |
| `src/app/(dashboard)/admin/audit-logs/page.tsx` | redirect p/ `/admin/auditoria` ou remoção (evitar superfície órfã) |
| `scripts/audit/backfill_ledger_demanda.mjs` (novo) | backfill único de `demanda_id` (com tie-break p/ `pje_documento_id` sem unique) |
| Testes (TS + Python) | mapa de importarDemandas, linkage do ledger, `audit_write` (shape), ultimaVarredura/listRuns/runDetail, matching do backfill, componentes da UI |

## 7. Testes

- **B1:** unit de `importarDemandas` (retorna `rows` corretos por `pje_documento_id`); `confirmarImport` grava `demanda_id` (mock do serviço); matching do backfill.
- **B2:** parsing do resultado estruturado da varredura (função pura testável, padrão standalone Python); `ultimaVarredura` (SQL/tRPC).
- **B3:** teste do shape de `audit_write` (função pura Python: dado rule+diff → payload de `audit_logs` com `entity_type/action/changes/user_id/metadata.job_id` corretos); teste TS de que `confirmarImport` chama `logAudit` com `action='import'` + `job_id` (mock de `logAudit`). Não há função de trigger para testar (abordagem sem triggers).
- **B4:** `listRuns`/`runDetail` (SQL/builder — o join por `metadata.job_id`); componentes da lista e do drill-down (@testing-library) com dados mock; que a página órfã `/admin/audit-logs` redireciona.

## 8. Critérios de aceitação

1. Após uma importação confirmada, as linhas de `pje_intimacoes_ledger` correspondentes têm `demanda_id` preenchido (não mais null).
2. O backfill preenche `demanda_id` para linhas históricas que casam por `pje_documento_id`, e loga os que não casaram.
3. Uma demanda classificada pela varredura recebe `analyzed_at`.
4. Uma execução de varredura concluída tem `claude_code_tasks.resultado` estruturado (`{total, ok, manual_review, nao_painel, erros, atos}`), e `ultimaVarredura` o retorna.
5. Cada demanda classificada pela varredura e cada demanda importada geram linha(s) em `audit_logs` com `user_id`/`user_name` REAIS (varredura = `job.created_by`; import = `ctx.user`), `changes` = diff das colunas alteradas, e `metadata.job_id` = id da execução. Nenhuma linha duplicada é criada para escritas que o `logAudit` da UI já cobre (não há triggers).
6. A tela `/admin/auditoria` lista execuções (import + varredura) com quem/quando/status/contadores e drill-down por `metadata.job_id` (robusto sob execuções concorrentes); a rota órfã `/admin/audit-logs` redireciona para ela.
7. Sem regressão em A nem no fluxo de importação/varredura; a única DDL (`demandas.analyzed_at`) é reversível (drop column); a varredura nunca quebra por falha de `audit_write` (try/except).

## 9. Sequência maior (contexto)

- **A (feito, mergeado):** paridade de anotação + card nunca em branco.
- **B (este doc):** auditabilidade.
- **C:** roteamento por ato — (C1) inteligência de sentença/acórdão (branches `feat/sentenca-intelligence`/`feat/acordao-intelligence`); (C2) modal "produzir peça" (download principal+associados → mídias → Drive → análise → relatório).
