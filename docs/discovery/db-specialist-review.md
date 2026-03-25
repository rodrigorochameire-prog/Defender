# Database Specialist Review

> **Brownfield Discovery Phase 5** | @data-engineer (Dara)
> **Data:** 2026-03-25
> **Projeto:** OMBUDS — Sistema de Gestao de Casos para Defensoria Publica
> **Database:** Supabase PostgreSQL 17.6 (Ombuds project `hxfvlaeqhkmelvyzgfqp`, sa-east-1)
> **Tamanho atual:** 67 MB | ~130 tabelas em producao | ~45K registros totais

---

## Respostas ao Architect

### Pergunta 1: Das 28 tabelas Drizzle-only, quais realmente existem em producao?

**TODAS as 28 tabelas existem em producao.** Confirmado via `list_tables` no Supabase MCP.

O workflow padrao do projeto e `npm run db:push` (que executa `drizzle-kit push`), documentado extensivamente em CLAUDE.md, RULES.md, db-migrate.md, deploy.md, e dezenas de feature plans. Esse comando sincroniza o schema Drizzle diretamente com o banco de producao **sem gerar migrations SQL**.

Isso significa que o schema Drizzle NAO e aspiracional -- e o source of truth operacional. O Supabase migrations directory (`supabase/migrations/`, 48 arquivos) foi o metodo original, mas `drizzle-kit push` tem sido usado em paralelo para features mais recentes.

**Implicacao para DB-001:** O debito e REAL, mas a descricao precisa ser ajustada. O problema nao e "tabelas que podem nao existir" -- todas existem. O problema e:
1. **Dual source of truth**: Nao ha como reconstruir o banco completo a partir de um unico lugar
2. **Sem rollback**: `drizzle push` nao gera migrations reversiveis
3. **43 tabelas sem RLS**: As 28 tabelas Drizzle-only + 15 outras criadas mais recentemente nao tem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (confirmado -- `rowsecurity = false` no catalogo)

**Evidencia:**
- `package.json`: `"db:push": "drizzle-kit push"` (linha 15)
- `CLAUDE.md`: Documenta `npm run db:push` como fluxo padrao
- `.claude/commands/db-migrate.md`: Workflow oficial usa `db:push`
- Features como legislacao, jurisprudencia, simulador, palacio, noticias juridicas tem pages, routers, e schemas Drizzle -- estao ativas no app

### Pergunta 2: DATABASE_URL usa connection pooler (PgBouncer) ou acesso direto?

**Producao usa Transaction Pooler (porta 6543) via PgBouncer.** Confirmado em multiplas fontes:

- `docs/archive/ENV_VARIABLES_DEFENSAVEL.md`: Documenta explicitamente que Vercel usa `aws-0-sa-east-1.pooler.supabase.com:6543`
- `docs/archive/DEPLOY.md`: Instrui uso de porta 6543
- `src/lib/db/index.ts` linha 26: `prepare: false` -- desativa prepared statements, configuracao obrigatoria para PgBouncer em modo transaction
- Comentario no codigo (linha 24-25): "Desabilitar prepared statements (melhor para serverless/pgbouncer)"

**Desenvolvimento local** varia -- alguns docs mostram porta 5432 via pooler (session mode), outros porta 6543. Ha historico de problemas de conexao documentados em `docs/archive/PROBLEMA_IDENTIFICADO.md` (regiao errada aws-0 vs aws-1).

**Nota de seguranca:** Credenciais do banco (senha `[REDACTED]`) estao expostas em PLAINTEXT em pelo menos 8 arquivos shell script e docs no repositorio. Isso e um vetor de ataque critico alem do DB-004 ja identificado.

### Pergunta 3: Qual o volume atual de dados?

**Volume total: ~67 MB, ~45K registros. Sistema em fase inicial de producao com equipe pequena (7 usuarios, 9 comarcas).**

Tabelas com dados significativos:

| Tabela | Registros | Observacao |
|--------|-----------|------------|
| `drive_sync_logs` | 24.270 | Maior tabela -- logs de sync (candidata a particionamento futuro) |
| `whatsapp_chat_messages` | 14.766 | Segunda maior -- mensagens de chat |
| `drive_files` | 2.908 | Arquivos do Drive sincronizados |
| `demandas` | 615 | Core: prazos/tarefas |
| `processos` | 440 | Core: processos judiciais |
| `assistidos` | 408 | Core: pessoas assistidas |
| `radar_noticias` | 379 | Noticias do Radar Criminal |
| `assistidos_processos` | 341 | Relacao M:N |
| `radar_matches` | 325 | Matches noticia-assistido |
| `noticias_juridicas` | 249 | Feature Drizzle-only -- com dados! |
| `drive_document_sections` | 252 | Secoes de documentos |
| `whatsapp_contacts` | 214 | Contatos WhatsApp |
| `audiencias` | 177 | Audiencias |
| `jurados` | 150 | Cadastro de jurados |

**Implicacao para indexes:** Com <1K registros nas tabelas core, indexes compostos NAO sao urgentes do ponto de vista de performance. O Postgres lida bem com sequential scans nesse volume. Porem, devem ser planejados para quando escalar para multiplas comarcas (potencialmente 10x-50x o volume atual).

### Pergunta 4: Ha backup automatizado?

**Sim, parcialmente -- via Supabase managed backups.** O plano Supabase Free inclui backups diarios automaticos com retencao de 7 dias. O projeto esta ativo e saudavel (`ACTIVE_HEALTHY`).

**NAO ha:**
- Nenhum script customizado de `pg_dump` no repositorio
- Nenhum cron job de backup (os crons em `vercel.json` sao apenas para radar/noticias)
- Nenhum backup off-site ou em outro provider
- Nenhuma politica de PITR (Point-in-Time Recovery) -- disponivel apenas nos planos pagos do Supabase

**Risco:** Para dados sensiveis (PII, historico criminal, LGPD), 7 dias de retencao e backup unico no Supabase e insuficiente. Recomenda-se backup externo periodico.

---

## Debitos Validados

| ID | Debito | Severidade DRAFT | Severidade Validada | Horas Est. | Complexidade | Notas |
|----|--------|-----------------|--------------------:|----------:|:------------:|-------|
| DB-001 | **Sistema dual de migrations** (Supabase SQL + Drizzle push) | CRITICAL | **CRITICAL** (confirmado) | 16-24h | Complex | Todas 28 tabelas existem via `drizzle push`. Problema real: dual source of truth, sem rollback, sem reproducibilidade. Recomendo consolidar em Drizzle como unico source + gerar SQL para auditoria. |
| DB-002 | **RLS efetivamente no-op** -- app conecta como `postgres` role | CRITICAL | **CRITICAL** (confirmado + agravado) | 24-40h | Complex | Confirmado: app usa `postgres` role via DATABASE_URL. AGRAVANTE: 43 tabelas (nao 28) tem `rowsecurity=false` -- nem sequer tem RLS habilitado. Inclui `noticias_juridicas` (249 rows) e `whatsapp_templates`. |
| DB-003 | **Sem isolamento multi-tenant** -- `comarca_id` sem RLS | CRITICAL | **CRITICAL** (confirmado) | 16-24h | Complex | 9 comarcas ativas. Sem RLS no banco, isolamento depende 100% da camada de aplicacao (tRPC routers). Depende de DB-002. |
| DB-004 | **Credenciais Supabase hardcoded** no client | HIGH | **CRITICAL** (elevado) | 4-6h | Simple | Anon key + URL hardcoded em `src/lib/supabase/client.ts`. Mas AGRAVANTE CRITICO: senha do banco (`[REDACTED]`) em plaintext em 8+ arquivos (shell scripts, docs) commitados no repositorio. Rotacao imediata necessaria. |
| DB-005 | **Missing `updated_at` triggers** | HIGH | **HIGH** (confirmado) | 4-6h | Simple | Apenas 3 tabelas tem triggers (`whatsapp_config`, `medidas_protetivas`, `calculos_seeu`). As outras ~120 dependem do Drizzle ORM no app. |
| DB-006 | **Tipos de timestamp inconsistentes** | HIGH | **HIGH** (confirmado + quantificado) | 8-12h | Medium | Confirmado via catalogo: ~60 tabelas usam `timestamp` (sem TZ), ~40 usam `timestamptz`. Padrao claro: tabelas criadas via Supabase migrations usam `timestamptz`; tabelas criadas via Drizzle push usam `timestamp`. Migration requer cuidado com dados existentes. |
| DB-007 | **Sem audit trail em DELETE** | HIGH | **HIGH** (confirmado) | 8-12h | Medium | Soft delete via `deleted_at` sem registro de quem deletou. Para LGPD, precisa de `deleted_by_id` + trigger. |
| DB-008 | **Tabela `workspaces` legada** | HIGH | **MEDIUM** (reduzido) | 2-3h | Simple | Tabela existe com 1 registro. Baixo impacto operacional. Remover FKs de `afastamentos` e `delegacoes_historico`, depois dropar. |
| DB-009 | **Missing composite indexes** | MEDIUM | **LOW** (reduzido por volume) | 2-3h | Simple | Com <1K registros nas tabelas core, nao ha impacto de performance mensuravel. Planejar para quando escalar. |
| DB-010 | **Missing partial indexes** em `deleted_at IS NULL` | MEDIUM | **LOW** (reduzido por volume) | 2-3h | Simple | Mesmo raciocinio de DB-009. Tombstoned rows sao negligiveis no volume atual. |
| DB-011 | **VARCHAR para status** ao inves de ENUMs | MEDIUM | **MEDIUM** (confirmado) | 6-8h | Medium | Confirmado em audiencias, sessoes_juri, atendimentos, pareceres, etc. Risco de typo sem validacao no banco. Drizzle define alguns enums que devem ser usados. |
| DB-012 | **Tabelas de documentos/templates duplicadas** (6 tabelas) | MEDIUM | **MEDIUM** (confirmado) | 12-16h | Complex | `peca_templates`, `banco_pecas`, `documento_modelos`, `document_templates`, `pecas_processuais`, `documentos_gerados` -- todas com 0 rows em producao. Bom momento para consolidar antes de ter dados. |
| DB-013 | **SERIAL (int4) PKs** | MEDIUM | **LOW** (confirmado, nao urgente) | 16-24h | Complex | Volume atual e trivial (~45K total). Com int4 max de 2.1 bilhoes, nao ha risco no horizonte proximo. Planejar para migracao futura se necessario. |

---

## Debitos Adicionados

| ID | Debito | Severidade | Horas Est. | Complexidade | Localizacao |
|----|--------|-----------|----------:|:------------:|-------------|
| DB-014 | **Senha do banco em plaintext no repositorio** -- `[REDACTED]` visivel em 8+ arquivos shell/docs commitados | **CRITICAL** | 2-4h | Simple | `fix-password-encoding.sh`, `fix-database-connection.sh`, `configure-database-url.sh`, `fix-database-FINAL.sh`, `docs/archive/` (5+ arquivos). Mesmo com repo privado, qualquer colaborador tem acesso total ao banco. **Acao imediata: rotacionar senha + remover do historico git.** |
| DB-015 | **43 tabelas sem RLS habilitado** (nao apenas as 28 Drizzle-only) | **CRITICAL** | 3-4h | Simple | Tabelas criadas via `drizzle push` + algumas mais recentes como `whatsapp_templates`, `whatsapp_connection_log`, `defensor_parceiros`, etc. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` nao e aplicado pelo Drizzle push. Depende de DB-002 para ter policies uteis, mas o enablement em si e pre-requisito. |
| DB-016 | **`drive_sync_logs` sem politica de retencao** -- 24K+ rows crescendo | **MEDIUM** | 2-3h | Simple | Maior tabela do banco (24.270 rows). Logs de sync do Google Drive acumulando sem limpeza. Criar job de retencao (ex: 90 dias) ou particionar por mes. |
| DB-017 | **Tabela `usuarios` e `sessions` orfas** -- nao referenciadas no Drizzle schema | **LOW** | 1-2h | Simple | `usuarios` (1 row) e `sessions` (0 rows) existem no banco mas nao no Drizzle schema. Provavelmente resquicios de implementacao anterior (Clerk auth?). Verificar e dropar. |
| DB-018 | **`processos.comarca` VARCHAR redundante** com `processos.comarca_id` FK | **LOW** | 2-3h | Simple | Ambas colunas existem. `comarca` (varchar, nullable) e `comarca_id` (int4, NOT NULL). Podem divergir. Migrar dados, remover coluna varchar. |
| DB-019 | **`supabase/config.toml` aponta para projeto errado** (`siwapjqndevuwsluncnr` = tetecare) | **MEDIUM** | 0.5h | Simple | `project_id` no config.toml e do projeto "tetecare", nao do "Ombuds" (`hxfvlaeqhkmelvyzgfqp`). Isso faria `supabase db push` (se usado) afetar o banco errado. `auth.site_url` tambem aponta para tetecare-v2. |
| DB-020 | **Sem backup off-site para dados LGPD** | **HIGH** | 4-8h | Medium | Dados altamente sensiveis (CPF, historico criminal, status prisional) dependem exclusivamente do backup automatico do Supabase Free (7 dias). Sem PITR, sem backup externo, sem teste de restauracao documentado. |

---

## Mapa de Dependencias entre Debitos

```
DB-014 (senha no repo)     ──► INDEPENDENTE, resolver PRIMEIRO
                                    │
DB-015 (enable RLS 43 tabs)  ──► DB-002 (policies RLS reais)  ──► DB-003 (multi-tenant)
                                    │
DB-001 (consolidar migrations) ──► DB-006 (padronizar timestamps)
                                    │
DB-004 (hardcoded creds)    ──► INDEPENDENTE, resolver cedo
                                    │
DB-005 (updated_at triggers) ──► INDEPENDENTE
DB-007 (audit trail DELETE) ──► INDEPENDENTE
DB-008 (workspaces legado)  ──► INDEPENDENTE
DB-011 (VARCHAR → ENUM)    ──► DB-001 (precisa migration system definido)
DB-012 (consolidar docs)   ──► DB-001 (precisa migration system definido)
                                    │
DB-016 (retencao logs)     ──► INDEPENDENTE
DB-019 (config.toml)       ──► INDEPENDENTE
DB-020 (backup off-site)   ──► INDEPENDENTE
                                    │
DB-009, DB-010 (indexes)   ──► Adiar ate volume justificar
DB-013 (SERIAL→BIGINT)     ──► Adiar ate volume justificar
DB-017 (tabelas orfas)     ──► INDEPENDENTE
DB-018 (comarca varchar)   ──► INDEPENDENTE
```

---

## Recomendacoes — Ordem de Resolucao

### Fase 1: Emergencia de Seguranca (Semana 1 — ~10h)

| Prioridade | ID | Acao | Horas |
|:----------:|-----|------|------:|
| **P1** | DB-014 | Rotacionar senha do banco IMEDIATAMENTE. Remover dos scripts/docs. Considerar `git filter-branch` ou BFG para limpar historico. | 2-4h |
| **P2** | DB-004 | Remover hardcoded anon key/URL do `client.ts`. Fail hard se env var ausente. | 2h |
| **P3** | DB-019 | Corrigir `supabase/config.toml` para apontar ao projeto correto. | 0.5h |

### Fase 2: Fundacao de Seguranca (Semana 2-3 — ~40h)

| Prioridade | ID | Acao | Horas |
|:----------:|-----|------|------:|
| **P4** | DB-015 | Habilitar RLS nas 43 tabelas restantes (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Adicionar policy `service_role` bypass como nas demais. | 3-4h |
| **P5** | DB-002 | Implementar RLS real: criar role dedicada para o app (nao `postgres`), policies `USING` baseadas em `auth.jwt()`. | 24-40h |
| **P6** | DB-003 | Adicionar `comarca_id`-scoped RLS apos DB-002. | 8-12h |
| **P7** | DB-020 | Configurar backup externo (pg_dump via cron + storage S3/R2). Documentar procedimento de restauracao. | 4-8h |

### Fase 3: Estabilidade (Semana 4-5 — ~30h)

| Prioridade | ID | Acao | Horas |
|:----------:|-----|------|------:|
| **P8** | DB-001 | Consolidar em Drizzle como single source of truth. Gerar migration baseline. Deprecar Supabase migrations directory. | 16-24h |
| **P9** | DB-005 | Criar trigger generico `update_updated_at_column()` e aplicar a todas as tabelas com `updated_at`. | 4-6h |
| **P10** | DB-007 | Adicionar `deleted_by_id` + trigger de audit em tabelas com soft delete. | 8-12h |

### Fase 4: Qualidade (Semana 6-8 — ~30h)

| Prioridade | ID | Acao | Horas |
|:----------:|-----|------|------:|
| **P11** | DB-006 | Padronizar todas as colunas para `TIMESTAMPTZ`. Requer migration cuidadosa. | 8-12h |
| **P12** | DB-012 | Consolidar 6 tabelas de documentos/templates (todas com 0 rows = momento ideal). | 12-16h |
| **P13** | DB-011 | Migrar VARCHAR status para ENUMs PostgreSQL. | 6-8h |
| **P14** | DB-016 | Implementar retencao para `drive_sync_logs`. | 2-3h |

### Fase 5: Limpeza (Backlog — ~10h)

| Prioridade | ID | Acao | Horas |
|:----------:|-----|------|------:|
| **P15** | DB-008 | Remover `workspaces` e FKs dependentes. | 2-3h |
| **P16** | DB-017 | Dropar tabelas orfas (`usuarios`, `sessions`). | 1-2h |
| **P17** | DB-018 | Remover `processos.comarca` VARCHAR redundante. | 2-3h |
| **P18** | DB-009+010 | Composite + partial indexes (adiar ate volume justificar ou escalar para mais comarcas). | 4-6h |
| **P19** | DB-013 | SERIAL para BIGINT/UUID (adiar ate necessidade real). | 16-24h |

---

## Resumo Quantitativo

| Metrica | Valor |
|---------|-------|
| Debitos no DRAFT | 13 (DB-001 a DB-013) |
| Debitos validados sem alteracao | 7 |
| Debitos com severidade ajustada | 5 (DB-004 elevado, DB-008/009/010/013 reduzidos) |
| Debitos removidos | 0 |
| Debitos adicionados | 7 (DB-014 a DB-020) |
| **Total de debitos de DB** | **20** |
| Horas totais estimadas | **~120-170h** |
| Debitos CRITICAL | 5 (DB-001, DB-002, DB-003, DB-004, DB-014, DB-015) |
| Debitos HIGH | 3 (DB-005, DB-007, DB-020) |
| Debitos MEDIUM | 5 (DB-006, DB-008, DB-011, DB-012, DB-016, DB-019) |
| Debitos LOW | 5 (DB-009, DB-010, DB-013, DB-017, DB-018) |

---

## Observacoes Finais

1. **O achado mais critico desta revisao e DB-014**: a senha do banco esta em plaintext no repositorio. Isso precede qualquer outro trabalho de seguranca.

2. **O DRAFT subestimou o problema de RLS**: nao sao 28 tabelas sem RLS -- sao 43. E o enablement de RLS e pre-requisito para qualquer policy funcional.

3. **O volume de dados e pequeno** (~67MB, ~45K rows), o que e uma boa noticia: permite refatoracoes agressivas de schema sem preocupacao com downtime ou data migration complexa. Aproveitar essa janela.

4. **A decisao Drizzle push vs Supabase migrations precisa ser tomada logo.** Ambos funcionam, mas ter dois sistemas criando tabelas no mesmo banco e insustentavel. Recomendo Drizzle como source of truth (ja e o padrao operacional) com SQL export para auditoria/compliance.

5. **O `supabase/config.toml` aponta para o projeto errado** (tetecare). Embora nao cause dano imediato (o app usa DATABASE_URL, nao o CLI do Supabase), e um risco operacional se alguem rodar `supabase db push`.

---

*Revisao concluida por @data-engineer (Dara) — Phase 5 Brownfield Discovery*
*Proximo: @ux-design-expert (Uma) para Phase 6, depois @qa (Quinn) para Phase 7 QA Gate*
