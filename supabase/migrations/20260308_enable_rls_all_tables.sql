-- =============================================
-- ENABLE ROW LEVEL SECURITY ON ALL APPLICATION TABLES
-- =============================================
-- Rationale:
--   Without RLS, any Supabase role with GRANT access can read/write all rows.
--   The existing migration (20260221_grant_supabase_roles.sql) grants ALL to
--   both `authenticated` and `service_role`, which means any authenticated
--   user could access any row in any table via the PostgREST API.
--
--   This app accesses the database ONLY through tRPC on the server side using
--   the `service_role` key. The `service_role` role bypasses RLS by default
--   in Supabase, so adding RLS does not break the app.
--
--   However, we also create explicit policies for `service_role` and `postgres`
--   as a safety net, in case the RLS bypass behavior ever changes or for
--   direct SQL access via migrations/admin tools.
--
--   With RLS enabled and no policy for `authenticated` or `anon`, those roles
--   will be blocked from accessing rows directly via PostgREST, effectively
--   locking down the database to server-side access only.
--
-- Note: storage.objects already has its own RLS policies and is NOT touched here.
-- =============================================

BEGIN;

-- ==========================================
-- ENABLE RLS ON ALL TABLES
-- ==========================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE afastamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analises_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE argumentos_sustentacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistidos_processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiencias_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacao_jurados ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacao_testemunhas_juri ENABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes_juri ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculos_pena ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculos_prazos ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculos_seeu ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE caso_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE casos ENABLE ROW LEVEL SECURITY;
ALTER TABLE casos_conexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE compartilhamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conselho_juri ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegacoes_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE depoimentos_analise ENABLE ROW LEVEL SECURITY;
ALTER TABLE diligencia_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE diligencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_gerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_juri ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosimetria_juri ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_file_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_file_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_sync_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas_atribuicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE evolution_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE feriados_forenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoff_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_mpu ENABLE ROW LEVEL SECURITY;
ALTER TABLE intimacoes_vvd ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurados ENABLE ROW LEVEL SECURITY;
ALTER TABLE juri_script_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudencia_buscas ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudencia_drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudencia_julgados ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudencia_temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisprudencia_teses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medidas_protetivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mural_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE oficio_analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE palacio_conexoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE palacio_diagramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE palacio_elementos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pareceres ENABLE ROW LEVEL SECURITY;
ALTER TABLE partes_vvd ENABLE ROW LEVEL SECURITY;
ALTER TABLE peca_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pecas_processuais ENABLE ROW LEVEL SECURITY;
ALTER TABLE personagens_juri ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaud_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaud_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_vvd ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE quesitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos_juri ENABLE ROW LEVEL SECURITY;
ALTER TABLE roteiro_plenario ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes_juri ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulacao_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulacao_exportacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulacao_keyframes ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulacao_objetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulacao_personagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulacao_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulacoes_3d ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE teses_defensivas ENABLE ROW LEVEL SECURITY;
ALTER TABLE testemunhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_prazos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLICIES: service_role full access
-- ==========================================
-- The service_role already bypasses RLS in Supabase by default,
-- but we add explicit policies as a safety net.

DROP POLICY IF EXISTS "service_role_full_access" ON activity_logs;
CREATE POLICY "service_role_full_access" ON activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON afastamentos;
CREATE POLICY "service_role_full_access" ON afastamentos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON agent_analyses;
CREATE POLICY "service_role_full_access" ON agent_analyses FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON analises_ia;
CREATE POLICY "service_role_full_access" ON analises_ia FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON anotacoes;
CREATE POLICY "service_role_full_access" ON anotacoes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON argumentos_sustentacao;
CREATE POLICY "service_role_full_access" ON argumentos_sustentacao FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON assistidos;
CREATE POLICY "service_role_full_access" ON assistidos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON assistidos_processos;
CREATE POLICY "service_role_full_access" ON assistidos_processos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON atendimentos;
CREATE POLICY "service_role_full_access" ON atendimentos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON audiencias;
CREATE POLICY "service_role_full_access" ON audiencias FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON audiencias_historico;
CREATE POLICY "service_role_full_access" ON audiencias_historico FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON avaliacao_jurados;
CREATE POLICY "service_role_full_access" ON avaliacao_jurados FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON avaliacao_testemunhas_juri;
CREATE POLICY "service_role_full_access" ON avaliacao_testemunhas_juri FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON avaliacoes_juri;
CREATE POLICY "service_role_full_access" ON avaliacoes_juri FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON banco_pecas;
CREATE POLICY "service_role_full_access" ON banco_pecas FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON calculos_pena;
CREATE POLICY "service_role_full_access" ON calculos_pena FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON calculos_prazos;
CREATE POLICY "service_role_full_access" ON calculos_prazos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON calculos_seeu;
CREATE POLICY "service_role_full_access" ON calculos_seeu FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON calendar_events;
CREATE POLICY "service_role_full_access" ON calendar_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON case_facts;
CREATE POLICY "service_role_full_access" ON case_facts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON case_personas;
CREATE POLICY "service_role_full_access" ON case_personas FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON caso_tags;
CREATE POLICY "service_role_full_access" ON caso_tags FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON casos;
CREATE POLICY "service_role_full_access" ON casos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON casos_conexos;
CREATE POLICY "service_role_full_access" ON casos_conexos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON compartilhamentos;
CREATE POLICY "service_role_full_access" ON compartilhamentos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON conselho_juri;
CREATE POLICY "service_role_full_access" ON conselho_juri FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON cross_analyses;
CREATE POLICY "service_role_full_access" ON cross_analyses FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON delegacoes_historico;
CREATE POLICY "service_role_full_access" ON delegacoes_historico FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON demandas;
CREATE POLICY "service_role_full_access" ON demandas FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON depoimentos_analise;
CREATE POLICY "service_role_full_access" ON depoimentos_analise FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON diligencia_templates;
CREATE POLICY "service_role_full_access" ON diligencia_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON diligencias;
CREATE POLICY "service_role_full_access" ON diligencias FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON distribution_history;
CREATE POLICY "service_role_full_access" ON distribution_history FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON document_embeddings;
CREATE POLICY "service_role_full_access" ON document_embeddings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON document_templates;
CREATE POLICY "service_role_full_access" ON document_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON documento_modelos;
CREATE POLICY "service_role_full_access" ON documento_modelos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON documentos;
CREATE POLICY "service_role_full_access" ON documentos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON documentos_gerados;
CREATE POLICY "service_role_full_access" ON documentos_gerados FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON documentos_juri;
CREATE POLICY "service_role_full_access" ON documentos_juri FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON dosimetria_juri;
CREATE POLICY "service_role_full_access" ON dosimetria_juri FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON drive_document_sections;
CREATE POLICY "service_role_full_access" ON drive_document_sections FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON drive_file_annotations;
CREATE POLICY "service_role_full_access" ON drive_file_annotations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON drive_file_contents;
CREATE POLICY "service_role_full_access" ON drive_file_contents FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON drive_files;
CREATE POLICY "service_role_full_access" ON drive_files FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON drive_sync_folders;
CREATE POLICY "service_role_full_access" ON drive_sync_folders FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON drive_sync_logs;
CREATE POLICY "service_role_full_access" ON drive_sync_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON drive_webhooks;
CREATE POLICY "service_role_full_access" ON drive_webhooks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON embeddings;
CREATE POLICY "service_role_full_access" ON embeddings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON escalas_atribuicao;
CREATE POLICY "service_role_full_access" ON escalas_atribuicao FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON evolution_config;
CREATE POLICY "service_role_full_access" ON evolution_config FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON extraction_patterns;
CREATE POLICY "service_role_full_access" ON extraction_patterns FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON fact_evidence;
CREATE POLICY "service_role_full_access" ON fact_evidence FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON feriados_forenses;
CREATE POLICY "service_role_full_access" ON feriados_forenses FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON handoff_config;
CREATE POLICY "service_role_full_access" ON handoff_config FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON historico_mpu;
CREATE POLICY "service_role_full_access" ON historico_mpu FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON intimacoes_vvd;
CREATE POLICY "service_role_full_access" ON intimacoes_vvd FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON jurados;
CREATE POLICY "service_role_full_access" ON jurados FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON juri_script_items;
CREATE POLICY "service_role_full_access" ON juri_script_items FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON jurisprudencia_buscas;
CREATE POLICY "service_role_full_access" ON jurisprudencia_buscas FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON jurisprudencia_drive_folders;
CREATE POLICY "service_role_full_access" ON jurisprudencia_drive_folders FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON jurisprudencia_julgados;
CREATE POLICY "service_role_full_access" ON jurisprudencia_julgados FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON jurisprudencia_temas;
CREATE POLICY "service_role_full_access" ON jurisprudencia_temas FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON jurisprudencia_teses;
CREATE POLICY "service_role_full_access" ON jurisprudencia_teses FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON medidas_protetivas;
CREATE POLICY "service_role_full_access" ON medidas_protetivas FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON movimentacoes;
CREATE POLICY "service_role_full_access" ON movimentacoes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON mural_notas;
CREATE POLICY "service_role_full_access" ON mural_notas FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON notifications;
CREATE POLICY "service_role_full_access" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON oficio_analises;
CREATE POLICY "service_role_full_access" ON oficio_analises FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON palacio_conexoes;
CREATE POLICY "service_role_full_access" ON palacio_conexoes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON palacio_diagramas;
CREATE POLICY "service_role_full_access" ON palacio_diagramas FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON palacio_elementos;
CREATE POLICY "service_role_full_access" ON palacio_elementos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON pareceres;
CREATE POLICY "service_role_full_access" ON pareceres FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON partes_vvd;
CREATE POLICY "service_role_full_access" ON partes_vvd FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON peca_templates;
CREATE POLICY "service_role_full_access" ON peca_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON pecas_processuais;
CREATE POLICY "service_role_full_access" ON pecas_processuais FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON personagens_juri;
CREATE POLICY "service_role_full_access" ON personagens_juri FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON plaud_config;
CREATE POLICY "service_role_full_access" ON plaud_config FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON plaud_recordings;
CREATE POLICY "service_role_full_access" ON plaud_recordings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON processos;
CREATE POLICY "service_role_full_access" ON processos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON processos_vvd;
CREATE POLICY "service_role_full_access" ON processos_vvd FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON profissionais;
CREATE POLICY "service_role_full_access" ON profissionais FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON quesitos;
CREATE POLICY "service_role_full_access" ON quesitos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON recursos_juri;
CREATE POLICY "service_role_full_access" ON recursos_juri FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON roteiro_plenario;
CREATE POLICY "service_role_full_access" ON roteiro_plenario FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON sessoes_juri;
CREATE POLICY "service_role_full_access" ON sessoes_juri FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON simulacao_assets;
CREATE POLICY "service_role_full_access" ON simulacao_assets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON simulacao_exportacoes;
CREATE POLICY "service_role_full_access" ON simulacao_exportacoes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON simulacao_keyframes;
CREATE POLICY "service_role_full_access" ON simulacao_keyframes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON simulacao_objetos;
CREATE POLICY "service_role_full_access" ON simulacao_objetos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON simulacao_personagens;
CREATE POLICY "service_role_full_access" ON simulacao_personagens FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON simulacao_versoes;
CREATE POLICY "service_role_full_access" ON simulacao_versoes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON simulacoes_3d;
CREATE POLICY "service_role_full_access" ON simulacoes_3d FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON speaker_labels;
CREATE POLICY "service_role_full_access" ON speaker_labels FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON teses_defensivas;
CREATE POLICY "service_role_full_access" ON teses_defensivas FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON testemunhas;
CREATE POLICY "service_role_full_access" ON testemunhas FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON tipo_prazos;
CREATE POLICY "service_role_full_access" ON tipo_prazos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON user_invitations;
CREATE POLICY "service_role_full_access" ON user_invitations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON user_settings;
CREATE POLICY "service_role_full_access" ON user_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON users;
CREATE POLICY "service_role_full_access" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON whatsapp_chat_messages;
CREATE POLICY "service_role_full_access" ON whatsapp_chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON whatsapp_config;
CREATE POLICY "service_role_full_access" ON whatsapp_config FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON whatsapp_contacts;
CREATE POLICY "service_role_full_access" ON whatsapp_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON whatsapp_messages;
CREATE POLICY "service_role_full_access" ON whatsapp_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access" ON workspaces;
CREATE POLICY "service_role_full_access" ON workspaces FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==========================================
-- POLICIES: postgres (superuser/admin) full access
-- ==========================================
-- The postgres role is the table owner and typically bypasses RLS,
-- but we add explicit policies for completeness and in case
-- ALTER TABLE ... FORCE ROW LEVEL SECURITY is ever applied.

DROP POLICY IF EXISTS "postgres_full_access" ON activity_logs;
CREATE POLICY "postgres_full_access" ON activity_logs FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON afastamentos;
CREATE POLICY "postgres_full_access" ON afastamentos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON agent_analyses;
CREATE POLICY "postgres_full_access" ON agent_analyses FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON analises_ia;
CREATE POLICY "postgres_full_access" ON analises_ia FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON anotacoes;
CREATE POLICY "postgres_full_access" ON anotacoes FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON argumentos_sustentacao;
CREATE POLICY "postgres_full_access" ON argumentos_sustentacao FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON assistidos;
CREATE POLICY "postgres_full_access" ON assistidos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON assistidos_processos;
CREATE POLICY "postgres_full_access" ON assistidos_processos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON atendimentos;
CREATE POLICY "postgres_full_access" ON atendimentos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON audiencias;
CREATE POLICY "postgres_full_access" ON audiencias FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON audiencias_historico;
CREATE POLICY "postgres_full_access" ON audiencias_historico FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON avaliacao_jurados;
CREATE POLICY "postgres_full_access" ON avaliacao_jurados FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON avaliacao_testemunhas_juri;
CREATE POLICY "postgres_full_access" ON avaliacao_testemunhas_juri FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON avaliacoes_juri;
CREATE POLICY "postgres_full_access" ON avaliacoes_juri FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON banco_pecas;
CREATE POLICY "postgres_full_access" ON banco_pecas FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON calculos_pena;
CREATE POLICY "postgres_full_access" ON calculos_pena FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON calculos_prazos;
CREATE POLICY "postgres_full_access" ON calculos_prazos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON calculos_seeu;
CREATE POLICY "postgres_full_access" ON calculos_seeu FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON calendar_events;
CREATE POLICY "postgres_full_access" ON calendar_events FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON case_facts;
CREATE POLICY "postgres_full_access" ON case_facts FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON case_personas;
CREATE POLICY "postgres_full_access" ON case_personas FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON caso_tags;
CREATE POLICY "postgres_full_access" ON caso_tags FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON casos;
CREATE POLICY "postgres_full_access" ON casos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON casos_conexos;
CREATE POLICY "postgres_full_access" ON casos_conexos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON compartilhamentos;
CREATE POLICY "postgres_full_access" ON compartilhamentos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON conselho_juri;
CREATE POLICY "postgres_full_access" ON conselho_juri FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON cross_analyses;
CREATE POLICY "postgres_full_access" ON cross_analyses FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON delegacoes_historico;
CREATE POLICY "postgres_full_access" ON delegacoes_historico FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON demandas;
CREATE POLICY "postgres_full_access" ON demandas FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON depoimentos_analise;
CREATE POLICY "postgres_full_access" ON depoimentos_analise FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON diligencia_templates;
CREATE POLICY "postgres_full_access" ON diligencia_templates FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON diligencias;
CREATE POLICY "postgres_full_access" ON diligencias FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON distribution_history;
CREATE POLICY "postgres_full_access" ON distribution_history FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON document_embeddings;
CREATE POLICY "postgres_full_access" ON document_embeddings FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON document_templates;
CREATE POLICY "postgres_full_access" ON document_templates FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON documento_modelos;
CREATE POLICY "postgres_full_access" ON documento_modelos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON documentos;
CREATE POLICY "postgres_full_access" ON documentos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON documentos_gerados;
CREATE POLICY "postgres_full_access" ON documentos_gerados FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON documentos_juri;
CREATE POLICY "postgres_full_access" ON documentos_juri FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON dosimetria_juri;
CREATE POLICY "postgres_full_access" ON dosimetria_juri FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON drive_document_sections;
CREATE POLICY "postgres_full_access" ON drive_document_sections FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON drive_file_annotations;
CREATE POLICY "postgres_full_access" ON drive_file_annotations FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON drive_file_contents;
CREATE POLICY "postgres_full_access" ON drive_file_contents FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON drive_files;
CREATE POLICY "postgres_full_access" ON drive_files FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON drive_sync_folders;
CREATE POLICY "postgres_full_access" ON drive_sync_folders FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON drive_sync_logs;
CREATE POLICY "postgres_full_access" ON drive_sync_logs FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON drive_webhooks;
CREATE POLICY "postgres_full_access" ON drive_webhooks FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON embeddings;
CREATE POLICY "postgres_full_access" ON embeddings FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON escalas_atribuicao;
CREATE POLICY "postgres_full_access" ON escalas_atribuicao FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON evolution_config;
CREATE POLICY "postgres_full_access" ON evolution_config FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON extraction_patterns;
CREATE POLICY "postgres_full_access" ON extraction_patterns FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON fact_evidence;
CREATE POLICY "postgres_full_access" ON fact_evidence FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON feriados_forenses;
CREATE POLICY "postgres_full_access" ON feriados_forenses FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON handoff_config;
CREATE POLICY "postgres_full_access" ON handoff_config FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON historico_mpu;
CREATE POLICY "postgres_full_access" ON historico_mpu FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON intimacoes_vvd;
CREATE POLICY "postgres_full_access" ON intimacoes_vvd FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON jurados;
CREATE POLICY "postgres_full_access" ON jurados FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON juri_script_items;
CREATE POLICY "postgres_full_access" ON juri_script_items FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON jurisprudencia_buscas;
CREATE POLICY "postgres_full_access" ON jurisprudencia_buscas FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON jurisprudencia_drive_folders;
CREATE POLICY "postgres_full_access" ON jurisprudencia_drive_folders FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON jurisprudencia_julgados;
CREATE POLICY "postgres_full_access" ON jurisprudencia_julgados FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON jurisprudencia_temas;
CREATE POLICY "postgres_full_access" ON jurisprudencia_temas FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON jurisprudencia_teses;
CREATE POLICY "postgres_full_access" ON jurisprudencia_teses FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON medidas_protetivas;
CREATE POLICY "postgres_full_access" ON medidas_protetivas FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON movimentacoes;
CREATE POLICY "postgres_full_access" ON movimentacoes FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON mural_notas;
CREATE POLICY "postgres_full_access" ON mural_notas FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON notifications;
CREATE POLICY "postgres_full_access" ON notifications FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON oficio_analises;
CREATE POLICY "postgres_full_access" ON oficio_analises FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON palacio_conexoes;
CREATE POLICY "postgres_full_access" ON palacio_conexoes FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON palacio_diagramas;
CREATE POLICY "postgres_full_access" ON palacio_diagramas FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON palacio_elementos;
CREATE POLICY "postgres_full_access" ON palacio_elementos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON pareceres;
CREATE POLICY "postgres_full_access" ON pareceres FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON partes_vvd;
CREATE POLICY "postgres_full_access" ON partes_vvd FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON peca_templates;
CREATE POLICY "postgres_full_access" ON peca_templates FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON pecas_processuais;
CREATE POLICY "postgres_full_access" ON pecas_processuais FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON personagens_juri;
CREATE POLICY "postgres_full_access" ON personagens_juri FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON plaud_config;
CREATE POLICY "postgres_full_access" ON plaud_config FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON plaud_recordings;
CREATE POLICY "postgres_full_access" ON plaud_recordings FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON processos;
CREATE POLICY "postgres_full_access" ON processos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON processos_vvd;
CREATE POLICY "postgres_full_access" ON processos_vvd FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON profissionais;
CREATE POLICY "postgres_full_access" ON profissionais FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON quesitos;
CREATE POLICY "postgres_full_access" ON quesitos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON recursos_juri;
CREATE POLICY "postgres_full_access" ON recursos_juri FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON roteiro_plenario;
CREATE POLICY "postgres_full_access" ON roteiro_plenario FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON sessoes_juri;
CREATE POLICY "postgres_full_access" ON sessoes_juri FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON simulacao_assets;
CREATE POLICY "postgres_full_access" ON simulacao_assets FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON simulacao_exportacoes;
CREATE POLICY "postgres_full_access" ON simulacao_exportacoes FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON simulacao_keyframes;
CREATE POLICY "postgres_full_access" ON simulacao_keyframes FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON simulacao_objetos;
CREATE POLICY "postgres_full_access" ON simulacao_objetos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON simulacao_personagens;
CREATE POLICY "postgres_full_access" ON simulacao_personagens FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON simulacao_versoes;
CREATE POLICY "postgres_full_access" ON simulacao_versoes FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON simulacoes_3d;
CREATE POLICY "postgres_full_access" ON simulacoes_3d FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON speaker_labels;
CREATE POLICY "postgres_full_access" ON speaker_labels FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON teses_defensivas;
CREATE POLICY "postgres_full_access" ON teses_defensivas FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON testemunhas;
CREATE POLICY "postgres_full_access" ON testemunhas FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON tipo_prazos;
CREATE POLICY "postgres_full_access" ON tipo_prazos FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON user_invitations;
CREATE POLICY "postgres_full_access" ON user_invitations FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON user_settings;
CREATE POLICY "postgres_full_access" ON user_settings FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON users;
CREATE POLICY "postgres_full_access" ON users FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON whatsapp_chat_messages;
CREATE POLICY "postgres_full_access" ON whatsapp_chat_messages FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON whatsapp_config;
CREATE POLICY "postgres_full_access" ON whatsapp_config FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON whatsapp_contacts;
CREATE POLICY "postgres_full_access" ON whatsapp_contacts FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON whatsapp_messages;
CREATE POLICY "postgres_full_access" ON whatsapp_messages FOR ALL TO postgres USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "postgres_full_access" ON workspaces;
CREATE POLICY "postgres_full_access" ON workspaces FOR ALL TO postgres USING (true) WITH CHECK (true);

COMMIT;
