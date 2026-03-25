# OMBUDS Database Audit

**Date:** 2026-03-25
**Auditor:** @data-engineer (Dara) -- Brownfield Discovery Phase 2
**Database:** Supabase PostgreSQL
**ORM:** Drizzle ORM (schema at `src/lib/db/schema/`, output at `drizzle/`)
**Migrations:** Dual system -- Supabase raw SQL (`supabase/migrations/`, 52 files) + Drizzle generated (`drizzle/`, 16+ files)

---

## 1. Table Inventory

### 1.1 Core Domain (Case Management)

| Table | Purpose | FK to | Soft Delete |
|-------|---------|-------|-------------|
| `users` | Defensores, servidores, estagiarios | comarcas | No |
| `assistidos` | Pessoas assistidas pela defensoria | users, casos, comarcas | Yes |
| `processos` | Processos judiciais | assistidos, casos, users, comarcas | Yes |
| `demandas` | Prazos/tarefas processuais | processos, assistidos, casos, users | Yes |
| `casos` | Entidade mestre case-centric (agrupa assistidos+processos) | users, casos (self-ref) | Yes |
| `anotacoes` | Notas sobre processos/assistidos/demandas | processos, assistidos, demandas, users | No |
| `movimentacoes` | Movimentacoes processuais | processos, users | No |
| `atendimentos` | Atendimentos presenciais/remotos | assistidos, users | No |
| `documentos` | Pecas e documentos processuais | processos, assistidos, demandas, users | No |
| `comarcas` | Comarcas da Bahia (multi-comarca) | -- | No |

### 1.2 Juri (Tribunal do Juri)

| Table | Purpose |
|-------|---------|
| `sessoes_juri` | Sessoes do Tribunal do Juri |
| `audiencias` | Audiencias processuais (com historico) |
| `audiencias_historico` | Versionamento de anotacoes de audiencia |
| `jurados` | Cadastro de jurados |
| `conselho_juri` | Composicao do conselho de sentenca |
| `avaliacoes_juri` | Avaliacoes pos-sessao |
| `avaliacao_jurados` | Avaliacao individual de jurados |
| `avaliacao_testemunhas_juri` | Avaliacao de testemunhas no juri |
| `argumentos_sustentacao` | Argumentos usados em plenario |
| `personagens_juri` | Personagens do caso para plenario |
| `teses_defensivas` | Teses de defesa |
| `depoimentos_analise` | Analise de depoimentos |
| `roteiro_plenario` | Roteiro para sessao plenaria |
| `juri_script_items` | Itens do roteiro de juri |
| `quesitos` | Quesitacao do juri |
| `dosimetria_juri` | Calculo dosimetrico |
| `recursos_juri` | Recursos pos-juri |
| `documentos_juri` | Documentos especificos de juri |
| `testemunhas` | Testemunhas processuais |

### 1.3 Case Investigation / Theory

| Table | Purpose |
|-------|---------|
| `case_personas` | Personagens/partes do caso |
| `case_facts` | Fatos relevantes do caso |
| `fact_evidence` | Provas vinculadas a fatos |
| `casos_conexos` | Conexoes entre casos (M:N) |
| `caso_tags` | Tags semanticas para casos |
| `cross_analyses` | Analises cruzadas entre casos |

### 1.4 Execucao Penal / Calculos

| Table | Purpose |
|-------|---------|
| `calculos_pena` | Calculos de pena (progressao, prescricao) |
| `calculos_seeu` | Calculos SEEU (execucao penal) |
| `calculos_prazos` | Calculos de prazos forenses |
| `tipo_prazos` | Tipos/categorias de prazos |
| `feriados_forenses` | Feriados para calculo de prazo |
| `handoff_config` | Config de transicao entre fases |

### 1.5 VVD (Violencia Domestica)

| Table | Purpose |
|-------|---------|
| `medidas_protetivas` | Medidas protetivas de urgencia |
| `processos_vvd` | Processos especificos VVD |
| `partes_vvd` | Partes envolvidas VVD |
| `intimacoes_vvd` | Intimacoes VVD |
| `historico_mpu` | Historico de MPU |

### 1.6 Comunicacao (WhatsApp)

| Table | Purpose |
|-------|---------|
| `whatsapp_config` | Config de instancia WhatsApp |
| `whatsapp_messages` | Mensagens enviadas/recebidas |
| `whatsapp_contacts` | Contatos WhatsApp |
| `whatsapp_chat_messages` | Mensagens de chat em tempo real |
| `whatsapp_templates` | Templates de mensagem |
| `whatsapp_connection_log` | Log de conexao |
| `whatsapp_message_actions` | Acoes sobre mensagens |
| `evolution_config` | Config Evolution API |

### 1.7 Google Drive Integration

| Table | Purpose |
|-------|---------|
| `drive_sync_folders` | Pastas sincronizadas |
| `drive_files` | Arquivos do Drive |
| `drive_file_contents` | Conteudo extraido de arquivos |
| `drive_file_annotations` | Anotacoes sobre arquivos |
| `drive_document_sections` | Secoes de documentos |
| `drive_sync_logs` | Log de sincronizacao |
| `drive_webhooks` | Webhooks de notificacao |

### 1.8 IA / Semantic Search

| Table | Purpose |
|-------|---------|
| `embeddings` | Embeddings pgvector (768d) para busca semantica |
| `analises_ia` | Analises geradas por IA |
| `extraction_patterns` | Padroes de extracao de dados |
| `oficio_analises` | Analises de oficios |

### 1.9 Radar Criminal (News Monitoring)

| Table | Purpose |
|-------|---------|
| `radar_noticias` | Noticias policiais coletadas |
| `radar_matches` | Matches noticia-assistido |
| `radar_fontes` | Fontes de noticias (configuracao de scraping) |

### 1.10 Equipe / Multi-Defensor

| Table | Purpose |
|-------|---------|
| `afastamentos` | Ferias/licencas com substituto |
| `delegacoes_historico` | Historico de delegacoes de demandas |
| `compartilhamentos` | Compartilhamento de dados entre defensores |
| `defensor_parceiros` | Pares de defensores parceiros |
| `escalas_atribuicao` | Escalas de plantao |
| `profissionais` | Profissionais auxiliares |

### 1.11 Auxiliares / Infra

| Table | Purpose |
|-------|---------|
| `activity_logs` | Log de atividades |
| `calendar_events` | Eventos de calendario |
| `notifications` | Notificacoes |
| `user_settings` | Configuracoes do usuario |
| `user_invitations` | Convites de usuario |
| `workspaces` | Workspaces (legado, sendo removido) |
| `peca_templates` | Templates de pecas processuais |
| `banco_pecas` | Biblioteca de pecas juridicas |
| `documento_modelos` | Modelos de documentos |
| `document_templates` | Templates de documentos |
| `pecas_processuais` | Pecas processuais geradas |
| `documentos_gerados` | Documentos gerados por IA |
| `mural_notas` | Notas do mural/dashboard |
| `speaker_labels` | Labels para transcricoes |
| `plaud_config` | Config de gravador Plaud |
| `plaud_recordings` | Gravacoes Plaud |
| `convites` | Convites (legado?) |
| `distribution_history` | Historico de distribuicao de casos |
| `diligencias` | Diligencias investigativas |
| `diligencia_templates` | Templates de diligencias |
| `pareceres` | Pareceres juridicos |

### 1.12 Drizzle-Only Tables (not yet in Supabase migrations)

These tables exist in Drizzle schema but have no corresponding Supabase migration:

| Table | Schema File | Status |
|-------|-------------|--------|
| `jurisprudencia_temas` | jurisprudencia.ts | Drizzle-only |
| `jurisprudencia_teses` | jurisprudencia.ts | Drizzle-only |
| `jurisprudencia_julgados` | jurisprudencia.ts | Drizzle-only |
| `jurisprudencia_buscas` | jurisprudencia.ts | Drizzle-only |
| `jurisprudencia_drive_folders` | jurisprudencia.ts | Drizzle-only |
| `legislacao_destaques` | legislacao.ts | Drizzle-only |
| `leis_versoes` | legislacao.ts | Drizzle-only |
| `noticias_juridicas` | noticias.ts | Drizzle-only |
| `noticias_fontes` | noticias.ts | Drizzle-only |
| `noticias_temas` | noticias.ts | Drizzle-only |
| `noticias_favoritos` | noticias.ts | Drizzle-only |
| `noticias_pastas` | noticias.ts | Drizzle-only |
| `noticias_pasta_itens` | noticias.ts | Drizzle-only |
| `noticias_processos` | noticias.ts | Drizzle-only |
| `referencias_biblioteca` | biblioteca.ts | Drizzle-only |
| `simulacoes_3d` | simulador.ts | Drizzle-only |
| `simulacao_personagens` | simulador.ts | Drizzle-only |
| `simulacao_objetos` | simulador.ts | Drizzle-only |
| `simulacao_keyframes` | simulador.ts | Drizzle-only |
| `simulacao_versoes` | simulador.ts | Drizzle-only |
| `simulacao_exportacoes` | simulador.ts | Drizzle-only |
| `simulacao_assets` | simulador.ts | Drizzle-only |
| `palacio_diagramas` | palacio.ts | Drizzle-only |
| `palacio_elementos` | palacio.ts | Drizzle-only |
| `palacio_conexoes` | palacio.ts | Drizzle-only |
| `analises_cowork` | cowork.ts | Drizzle-only |
| `agent_analyses` | investigacao.ts | Drizzle-only |
| `document_embeddings` | documentos.ts | Drizzle-only |

**Total tables:** ~120 defined in Drizzle schema, ~93 confirmed in Supabase migrations.

---

## 2. Enum Inventory

| Enum | Values |
|------|--------|
| `area` | JURI, EXECUCAO_PENAL, VIOLENCIA_DOMESTICA, SUBSTITUICAO, CURADORIA, FAMILIA, CIVEL, FAZENDA_PUBLICA |
| `unidade` | CAMACARI, CANDEIAS, DIAS_DAVILA, SIMOES_FILHO, LAURO_DE_FREITAS, SALVADOR |
| `status_processo` | FLAGRANTE, INQUERITO, INSTRUCAO, RECURSO, EXECUCAO, ARQUIVADO |
| `status_prisional` | SOLTO, CADEIA_PUBLICA, PENITENCIARIA, COP, HOSPITAL_CUSTODIA, DOMICILIAR, MONITORADO |
| `status_demanda` | 2_ATENDER, 4_MONITORAR, 5_FILA, 7_PROTOCOLADO, 7_CIENCIA, 7_SEM_ATUACAO, URGENTE, CONCLUIDO, ARQUIVADO |
| `prioridade` | BAIXA, NORMAL, ALTA, URGENTE, REU_PRESO |
| `tipo_audiencia` | INSTRUCAO, CUSTODIA, CONCILIACAO, JUSTIFICACAO, ADMONICAO, UNA, PLENARIO_JURI, CONTINUACAO, OUTRA |
| `status_audiencia` | A_DESIGNAR, DESIGNADA, REALIZADA, AGUARDANDO_ATA, CONCLUIDA, ADIADA, CANCELADA |
| `atribuicao` | (defined elsewhere, used in casos.atribuicao) |
| `tipo_crime_radar` | homicidio, tentativa_homicidio, trafico, roubo, furto, violencia_domestica, sexual, lesao_corporal, porte_arma, estelionato, outros |
| `circunstancia_radar` | flagrante, mandado, denuncia, operacao, investigacao, julgamento |
| `radar_match_status` | auto_confirmado, possivel, descartado, confirmado_manual |
| `radar_enrichment_status` | pending, extracted, matched, analyzed |
| `radar_fonte_tipo` | portal, instagram, twitter, facebook |

---

## 3. RLS Coverage Assessment

### 3.1 RLS Enablement

**Status: ENABLED on all 93 Supabase tables** (via `20260308_enable_rls_all_tables.sql`).

### 3.2 Policy Strategy

The RLS strategy has three layers:

| Layer | Description | Status |
|-------|-------------|--------|
| **service_role bypass** | `service_role_full_access` policy on ALL 93 tables -- `USING (true)` | COMPLETE |
| **postgres bypass** | `postgres_full_access` policy on ALL 93 tables -- `USING (true)` | COMPLETE |
| **authenticated access** | Role-based policies for direct PostgREST access | PARTIAL (5 tables) |

### 3.3 Authenticated Role Policies (Defense-in-Depth)

Only 5 critical tables + 3 radar tables + WhatsApp tables have meaningful `authenticated` role policies:

| Table | Policy Type | Notes |
|-------|-------------|-------|
| `assistidos` | SELECT with `deleted_at IS NULL`, INSERT/UPDATE open | Shared data |
| `processos` | SELECT with `deleted_at IS NULL`, INSERT/UPDATE open | Shared data |
| `demandas` | Role-based SELECT (admin sees all, defensor sees own, estagiario sees supervisor's) | Only table with proper RBAC |
| `casos` | SELECT with `deleted_at IS NULL`, INSERT/UPDATE open | Shared data |
| `calendar_events` | Open SELECT/INSERT/UPDATE | No restrictions |
| `radar_*` (3 tables) | SELECT/INSERT/UPDATE for authenticated | Open to all authenticated |

### 3.4 RLS Assessment Summary

**CRITICAL FINDING: RLS is effectively a no-op.** The app uses `service_role` key for all tRPC calls (bypasses RLS entirely). The `authenticated` policies that exist are mostly `USING (true)` -- only `demandas` has real row-level filtering. The early migration (`20260115`) created policies like `assistidos_select_all USING (true)` which allow everything.

**Risk:** If the Supabase anon key (hardcoded in `src/lib/supabase/client.ts` with fallback) is used for any direct PostgREST query, ~88 tables return ZERO rows (RLS ON + no authenticated policy = deny). This is safe but may cause confusion. The 5 tables with authenticated policies allow broad access.

---

## 4. Index Analysis

### 4.1 Standard B-tree Indexes

Indexes are **comprehensively applied** across all core tables. Every foreign key has an index, and most status/filter columns are indexed. Count: ~150+ B-tree indexes.

### 4.2 Specialized Indexes

| Type | Table | Column | Notes |
|------|-------|--------|-------|
| **GIN (array)** | `casos` | `tags` | Full-text tag search |
| **GIN (JSONB)** | `radar_noticias` | `envolvidos` | JSON search on involved persons |
| **GIN (trigram)** | `radar_noticias` | `bairro` | Fuzzy neighborhood search |
| **GIN (trigram)** | `assistidos` | `nome` | Fuzzy name search (via `20260308_nome_trgm_indexes.sql`) |
| **HNSW (pgvector)** | `embeddings` | `embedding` | Cosine similarity vector search |
| **Functional** | `assistidos` | `cpf` | CPF normalization (via `20260308_cpf_functional_index.sql`) |

### 4.3 Extensions Enabled

| Extension | Purpose |
|-----------|---------|
| `pg_trgm` | Trigram fuzzy matching |
| `vector` | pgvector for semantic search |

### 4.4 Index Gaps

- **Missing composite indexes:** High-frequency queries like `WHERE defensor_id = X AND deleted_at IS NULL AND status = Y` would benefit from composite indexes on `(defensor_id, deleted_at, status)` for demandas, processos.
- **Missing partial indexes:** Tables with soft delete should have partial indexes `WHERE deleted_at IS NULL` to skip tombstoned rows.

---

## 5. Functions and Triggers

| Function | Type | Purpose |
|----------|------|---------|
| `update_whatsapp_config_updated_at()` | Trigger fn | Auto-update `updated_at` on whatsapp_config |
| `update_updated_at_column()` | Trigger fn | Generic `updated_at` updater (medidas_protetivas, calculos_seeu) |
| `search_embeddings(...)` | RPC | Semantic search via pgvector cosine similarity |
| `search_assistidos_trgm(...)` | RPC | Fuzzy name search using trigram similarity |
| `is_covering_defensor(...)` | Utility | Check if defensor is covering for another (afastamentos) |

| Trigger | Table | Event |
|---------|-------|-------|
| `whatsapp_config_updated_at` | whatsapp_config | BEFORE UPDATE |
| `update_medidas_protetivas_updated_at` | medidas_protetivas | BEFORE UPDATE |
| `update_calculos_seeu_updated_at` | calculos_seeu | BEFORE UPDATE |

**Gap:** Most tables lack `updated_at` triggers. The `updated_at` column exists on ~80% of tables but is only auto-updated by the application layer (Drizzle), not by DB triggers. If data is modified outside the app (direct SQL, migrations), `updated_at` will be stale.

---

## 6. Views

| View | Purpose |
|------|---------|
| `vw_casos_dashboard` | Aggregated case overview (counts of assistidos, processos, demandas, audiencias) |
| `vw_agenda_audiencias` | Denormalized hearing calendar with case/assistido/processo info |

---

## 7. Database Client Architecture

### 7.1 Two Supabase Clients

| Client | Key | Used By | RLS |
|--------|-----|---------|-----|
| `getSupabaseClient()` | Anon key (hardcoded fallback) | Frontend auth, password reset | Subject to RLS |
| `getSupabaseAdmin()` | Service role key (env var) | NOT used by tRPC | Bypasses RLS |

### 7.2 Primary Data Access: Drizzle ORM

The app primarily uses **Drizzle ORM** with a direct `DATABASE_URL` connection (not Supabase client). This means:
- RLS is irrelevant for most app queries (direct PG connection as `postgres` role)
- Supabase clients are used only for auth flows and storage
- Schema defined in `src/lib/db/schema/` (25 domain files)

### 7.3 Dual Migration System

| System | Path | Count | Purpose |
|--------|------|-------|---------|
| Supabase | `supabase/migrations/` | 52 files | Manual SQL migrations (primary) |
| Drizzle | `drizzle/` | 16+ files | Generated from schema (secondary) |

**Risk:** Schema drift between Drizzle definitions and Supabase migrations. ~28 tables in Drizzle have no corresponding Supabase migration.

---

## 8. Security Assessment

### 8.1 Hardcoded Credentials

**CRITICAL:** `src/lib/supabase/client.ts` contains hardcoded Supabase URL and anon key as fallback values. While anon keys are designed to be public, hardcoding them in source means they cannot be rotated without a code deploy.

### 8.2 RLS Posture

| Risk | Severity | Description |
|------|----------|-------------|
| RLS bypass via direct connection | HIGH | Drizzle connects as `postgres` role, bypassing all RLS. If the DATABASE_URL leaks, full DB access. |
| Anon key exposure | LOW | Anon key is public by design, but RLS ON + no policies = deny for most tables. Safe. |
| Service role key | MEDIUM | Used by `getSupabaseAdmin()` -- if env var leaks, full bypass. Properly gated behind env check. |
| Permissive early policies | MEDIUM | ~12 tables still have legacy `USING (true)` policies from `20260115` migration for all operations. |

### 8.3 Data Sensitivity

This database contains **highly sensitive PII**: CPF, RG, phone numbers, addresses, criminal records, prison status, legal case details. LGPD compliance is critical.

---

## 9. Technical Debt Summary

### CRITICAL

| # | Debt | Impact | Effort |
|---|------|--------|--------|
| D1 | **Dual migration system (Supabase + Drizzle)** -- 28 Drizzle-only tables may not exist in production | Schema drift, runtime errors | HIGH |
| D2 | **No real RLS enforcement** -- all data access via `postgres` role or `service_role` bypass | Full DB exposure if credentials leak | HIGH |
| D3 | **Hardcoded Supabase credentials** in source code | Cannot rotate without deploy | LOW |
| D4 | **No multi-tenant data isolation** -- `comarca_id` exists but no RLS enforces it | Cross-comarca data leakage possible | HIGH |

### HIGH

| # | Debt | Impact | Effort |
|---|------|--------|--------|
| D5 | **Missing `updated_at` triggers** on most tables | Stale timestamps if data modified outside app | MEDIUM |
| D6 | **Inconsistent timestamp types** -- some tables use `TIMESTAMP`, others `TIMESTAMPTZ` | Timezone bugs | MEDIUM |
| D7 | **Legacy `workspaces` table** still referenced by afastamentos, delegacoes_historico but marked for removal | Dead code, confusion | LOW |
| D8 | **No audit trail on DELETE** -- soft delete via `deleted_at` but no trigger to log who deleted or when | Compliance gap (LGPD) | MEDIUM |

### MEDIUM

| # | Debt | Impact | Effort |
|---|------|--------|--------|
| D9 | **Missing composite indexes** for common query patterns (defensor_id + deleted_at + status) | Query performance degradation at scale | LOW |
| D10 | **Missing partial indexes** on `WHERE deleted_at IS NULL` for soft-deleted tables | Full table scans include tombstoned rows | LOW |
| D11 | **VARCHAR status columns** instead of ENUMs in many tables (audiencias.status, sessoes_juri.status, atendimentos.status) | No DB-level validation, typo risk | LOW |
| D12 | **Duplicate document/template tables** -- `peca_templates`, `banco_pecas`, `documento_modelos`, `document_templates`, `pecas_processuais`, `documentos_gerados` overlap significantly | Data scattered, unclear canonical source | MEDIUM |
| D13 | **`processos.comarca` VARCHAR** still exists alongside `processos.comarca_id` FK | Redundant, can drift | LOW |
| D14 | **SERIAL (int4) primary keys** -- will max at ~2 billion rows, no UUID for distributed systems | Not urgent but limits future scalability | LOW |
| D15 | **No foreign key from `casos.caso_conexo_id` + separate `casos_conexos` table** -- two ways to model same relationship | Confusing, can diverge | LOW |

---

## 10. Recommendations (Priority Order)

1. **Consolidate migration system**: Pick Drizzle as single source of truth. Generate Supabase-compatible SQL from Drizzle, or vice versa. Reconcile the 28 missing tables.
2. **Implement comarca-scoped RLS**: Since multi-comarca is live, add `comarca_id`-based RLS policies that filter based on `auth.jwt() -> comarca_id` to prevent cross-comarca leakage.
3. **Remove hardcoded credentials**: Use only environment variables, fail hard if missing.
4. **Add `updated_at` triggers**: Create a generic trigger function and apply to all tables with `updated_at`.
5. **Standardize on TIMESTAMPTZ**: Migrate all `TIMESTAMP` columns to `TIMESTAMPTZ`.
6. **Add composite indexes**: `(defensor_id, deleted_at, status)` on demandas, processos, casos.
7. **Consolidate document tables**: Merge overlapping template/document tables into a clear hierarchy.
8. **Drop legacy `workspaces` references**: Clean up FK references in afastamentos, delegacoes_historico.
