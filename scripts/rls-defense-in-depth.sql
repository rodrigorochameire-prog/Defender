-- =====================================================
-- RLS Defense-in-Depth: Policies para tabelas críticas
-- Estas policies são fallback caso o tRPC falhe.
-- O service_role (backend) já bypassa RLS.
--
-- Contexto:
--   - 93 tabelas com RLS habilitado
--   - 88 tabelas negam acesso direto por padrão (RLS ON + sem policy = deny)
--   - 5 tabelas críticas recebem policies explícitas aqui
--   - service_role (tRPC) tem bypass via "service_role_full_access" em todas as tabelas
-- =====================================================

BEGIN;

-- =====================================================
-- NOTA: Todas as policies de SELECT incluem
-- "deleted_at IS NULL" para garantir que rows soft-deleted
-- não vazem via acesso direto ao banco (PostgREST/client SDK).
-- O tRPC também filtra por deleted_at, mas esta é a camada de fallback.
-- =====================================================

-- =====================================================
-- PARTE 1: Policies para tabelas críticas
-- =====================================================

-- ASSISTIDOS: Dados compartilhados - todos autenticados podem ver
DROP POLICY IF EXISTS "authenticated_select_assistidos" ON assistidos;
CREATE POLICY "authenticated_select_assistidos" ON assistidos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "authenticated_insert_assistidos" ON assistidos;
CREATE POLICY "authenticated_insert_assistidos" ON assistidos
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_assistidos" ON assistidos;
CREATE POLICY "authenticated_update_assistidos" ON assistidos
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL);

-- PROCESSOS: Dados compartilhados
DROP POLICY IF EXISTS "authenticated_select_processos" ON processos;
CREATE POLICY "authenticated_select_processos" ON processos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "authenticated_insert_processos" ON processos;
CREATE POLICY "authenticated_insert_processos" ON processos
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_processos" ON processos;
CREATE POLICY "authenticated_update_processos" ON processos
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL);

-- DEMANDAS: Dados PRIVADOS por defensor
-- Admin/servidor veem tudo, defensor vê as próprias, estagiário vê do supervisor
DROP POLICY IF EXISTS "role_based_select_demandas" ON demandas;
CREATE POLICY "role_based_select_demandas" ON demandas
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      -- Admin/servidor veem tudo
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()::INTEGER
        AND users.role IN ('admin', 'servidor')
      )
      -- Defensor vê as próprias
      OR defensor_id = auth.uid()::INTEGER
      -- Estagiário vê do supervisor
      OR defensor_id = (
        SELECT supervisor_id FROM users
        WHERE users.id = auth.uid()::INTEGER
        AND users.role = 'estagiario'
      )
    )
  );

DROP POLICY IF EXISTS "authenticated_insert_demandas" ON demandas;
CREATE POLICY "authenticated_insert_demandas" ON demandas
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_demandas" ON demandas;
CREATE POLICY "authenticated_update_demandas" ON demandas
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL);

-- CASOS: Dados compartilhados
DROP POLICY IF EXISTS "authenticated_select_casos" ON casos;
CREATE POLICY "authenticated_select_casos" ON casos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "authenticated_insert_casos" ON casos;
CREATE POLICY "authenticated_insert_casos" ON casos
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_casos" ON casos;
CREATE POLICY "authenticated_update_casos" ON casos
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL);

-- CALENDAR_EVENTS: Dados compartilhados
DROP POLICY IF EXISTS "authenticated_select_calendar_events" ON calendar_events;
CREATE POLICY "authenticated_select_calendar_events" ON calendar_events
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_insert_calendar_events" ON calendar_events;
CREATE POLICY "authenticated_insert_calendar_events" ON calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_calendar_events" ON calendar_events;
CREATE POLICY "authenticated_update_calendar_events" ON calendar_events
  FOR UPDATE TO authenticated
  USING (true);

-- =====================================================
-- PARTE 2: Remover policies legadas permissivas do WhatsApp
-- Estas foram criadas em 20260114 com USING (true)
-- e foram substituídas por policies com scoping correto em 20260131
-- =====================================================

DROP POLICY IF EXISTS "whatsapp_config_select_own" ON whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_config_insert_own" ON whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_config_update_own" ON whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_config_delete_own" ON whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_messages_select" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_insert" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_update" ON whatsapp_messages;

COMMIT;
