-- =============================================
-- GRANT permissions to Supabase roles
-- =============================================
-- Necessário porque Drizzle ORM cria tabelas como 'postgres' (superuser)
-- mas NÃO gera GRANT statements. Os roles do Supabase (service_role,
-- authenticated, anon) precisam de permissões explícitas nas tabelas.
--
-- service_role: bypassa RLS, usado pelo Enrichment Engine
-- authenticated: usuários logados via NextAuth
-- anon: requisições públicas (sem auth)
-- =============================================

-- service_role: acesso total (bypassa RLS automaticamente)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- anon: apenas leitura
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- authenticated: acesso total (RLS controla o escopo)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Schema usage
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Default privileges para tabelas criadas no futuro
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO anon;
