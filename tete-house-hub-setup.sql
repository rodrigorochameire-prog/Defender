-- TETE HOUSE HUB - Supabase setup script
-- Conteúdo gerado em: <data>
-- Autor: Agente de automação
-- Uso: revisar e executar em ordem se necessário. Muitos itens já foram aplicados no projeto.

-- 1) Função trigger: sincroniza auth.users -> public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    auth_id,
    email,
    name,
    login_method,
    email_verified,
    role,
    created_at,
    updated_at,
    last_signed_in
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'email',
    (NEW.email_confirmed_at IS NOT NULL),
    'user',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_id)
  DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    last_signed_in = NOW(),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Revogar EXECUTE para anon/authenticated (garante que apenas o trigger/banco execute)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- 3) Trigger: chama a função após INSERT/UPDATE em auth.users
-- Ajuste o nome se já existir um trigger com mesmo identificador.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'on_auth_user_created' AND c.relname = 'users' AND pg_catalog.pg_table_is_visible(c.oid)
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
END$$;

-- 4) Constraint UNIQUE em public.users.auth_id
-- Executar somente se não existir (evita erro)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass AND contype = 'u' AND pg_get_constraintdef(oid) LIKE '%(auth_id)%'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_auth_id_unique UNIQUE (auth_id);
  END IF;
END$$;

-- 5) Recriar view users_view com authId como text
DROP VIEW IF EXISTS public.users_view;

CREATE VIEW public.users_view AS
SELECT 
  id,
  auth_id::text AS "authId",
  open_id AS "openId",
  name,
  email,
  NULL::text AS "passwordHash",
  login_method AS "loginMethod",
  email_verified AS "emailVerified",
  role,
  phone,
  stripe_customer_id AS "stripeCustomerId",
  created_at AS "createdAt",
  updated_at AS "updatedAt",
  last_signed_in AS "lastSignedIn"
FROM public.users;


