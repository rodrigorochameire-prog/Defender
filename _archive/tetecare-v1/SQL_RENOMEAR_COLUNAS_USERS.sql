-- ============================================
-- RENOMEAR COLUNAS DE camelCase PARA snake_case
-- Execute este script APENAS se as colunas estiverem em camelCase
-- ============================================

-- IMPORTANTE: Execute primeiro SQL_VERIFICAR_COLUNAS_USERS.sql
-- para confirmar quais colunas existem!

-- Renomear colunas de camelCase para snake_case
-- (Execute apenas as que existirem)

-- ALTER TABLE public.users RENAME COLUMN "openId" TO open_id;
-- ALTER TABLE public.users RENAME COLUMN "passwordHash" TO password_hash;
-- ALTER TABLE public.users RENAME COLUMN "loginMethod" TO login_method;
-- ALTER TABLE public.users RENAME COLUMN "emailVerified" TO email_verified;
-- ALTER TABLE public.users RENAME COLUMN "createdAt" TO created_at;
-- ALTER TABLE public.users RENAME COLUMN "updatedAt" TO updated_at;
-- ALTER TABLE public.users RENAME COLUMN "lastSignedIn" TO last_signed_in;

-- ============================================
-- OU, se preferir manter camelCase no banco:
-- ============================================
-- Reverter o schema do Drizzle para usar camelCase com aspas
-- (Não execute este script, apenas reverta as mudanças no schema.ts)


