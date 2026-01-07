-- users_sync_test.sql
-- Teste automatizado: create -> verify -> update -> verify -> cleanup

BEGIN;

-- 1) Gerar UUID de teste
SELECT gen_random_uuid() AS test_uuid INTO TEMP TABLE tmp_test_id;
-- Recuperar
WITH t AS (SELECT test_uuid FROM tmp_test_id LIMIT 1)
INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at)
SELECT test_uuid, 'ci.test+' || substring(test_uuid::text,1,8) || '@example.com', jsonb_build_object('name', 'CI Test User'), now()
FROM t
RETURNING id AS created_id;

-- Espera rápida para triggers sincronizarem (não necessário em DB local mas ajuda)
-- (No CI, pode usar retry loops. Aqui apenas demonstrativo.)

-- 2) Verificações: se registro existe em public.users
-- Substitua '<uuid>' pelo returned id se executar manualmente.
-- Exemplo de verificação (retornará linha se sucesso):
SELECT * FROM public.users WHERE auth_id = (SELECT created_id FROM auth.users LIMIT 1);

-- 3) Verificar view
SELECT * FROM public.users_view WHERE "authId" = (SELECT created_id::text FROM auth.users LIMIT 1);

-- 4) Testar ON CONFLICT: atualizar email em auth.users
UPDATE auth.users SET email = 'ci.test.updated+' || substring((SELECT created_id::text FROM auth.users LIMIT 1),1,8) || '@example.com' WHERE id = (SELECT created_id FROM auth.users LIMIT 1);

-- 5) Verificar atualização refletida em public.users
SELECT email, updated_at, last_signed_in FROM public.users WHERE auth_id = (SELECT created_id FROM auth.users LIMIT 1);

-- 6) Cleanup: remover usuário de teste
DELETE FROM public.users WHERE auth_id = (SELECT created_id FROM auth.users LIMIT 1);
DELETE FROM auth.users WHERE id = (SELECT created_id FROM auth.users LIMIT 1);

COMMIT;


