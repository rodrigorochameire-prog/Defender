# ✅ Solução: Corrigir Políticas de supabase_storage_admin

## 🎯 Problema Identificado

- ✅ **Causa raiz encontrada:** As políticas pertencem ao role `supabase_storage_admin`
- ✅ **Por que DROP/CREATE não funcionou:** Executado com outro role, não afetou as políticas originais
- ✅ **Expressões armazenadas:** Realmente contêm `users.name` incorretamente

---

## 🔧 Solução: ALTER POLICY

Como as políticas pertencem a `supabase_storage_admin`, precisamos usar `ALTER POLICY` para atualizar diretamente as expressões armazenadas.

---

## 📋 Passo 1: Tentar via Agente (Recomendado)

Use o arquivo `RESPOSTA_CONFIRMAR_ALTER_POLICY.txt` para confirmar que o agente pode prosseguir.

O agente irá:
1. Executar `ALTER POLICY` para cada uma das 4 políticas
2. Atualizar as expressões para usar `extract_tutor_id_from_path(name)`
3. Validar que a correção funcionou

**Se houver erro de permissão:**
- O agente informará a mensagem de erro
- Use o Passo 2 (executar manualmente)

---

## 📋 Passo 2: Executar Manualmente (Se necessário)

Se o agente não tiver permissão, execute manualmente:

1. **Abrir SQL Editor do Supabase Dashboard**
   - O SQL Editor geralmente tem permissões elevadas
   - Pode alterar políticas de `supabase_storage_admin`

2. **Executar o script `SQL_ALTER_POLICY_SUPABASE_STORAGE_ADMIN.sql`**
   - Contém os 4 comandos `ALTER POLICY`
   - Inclui validações completas

3. **Verificar os resultados:**
   - Primeira query: Mostra as expressões armazenadas (devem usar `name`)
   - Segunda query: Verifica que não há mais `users.name` (deve retornar 0 linhas)
   - Terceira query: Validação final (todas devem estar "✅ CORRETO")

---

## ✅ Validação Esperada

Após executar a correção:

### Query 1: Verificar expressões armazenadas
```sql
SELECT 
  p.polname as policy_name,
  pg_get_expr(p.qual, p.polrelid) as stored_using_expression,
  pg_get_expr(p.polwithcheck, p.polrelid) as stored_with_check_expression
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'objects'
  AND c.relnamespace = 'storage'::regnamespace
  AND p.polname IN (
    'staff_policy_select',
    'tutors_policy_select',
    'tutors_policy_insert',
    'tutors_policy_update'
  )
ORDER BY p.polname;
```

**Verificar que:**
- ✅ Todas as expressões usam `extract_tutor_id_from_path(name)`
- ❌ Nenhuma expressão contém `users.name`

### Query 2: Verificar que não há mais `users.name`
```sql
SELECT 
  p.polname as policy_name,
  pg_get_expr(p.qual, p.polrelid) as using_expr,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'objects'
  AND c.relnamespace = 'storage'::regnamespace
  AND (
    pg_get_expr(p.qual, p.polrelid) LIKE '%users.name%'
    OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%users.name%'
  );
```

**Resultado esperado:** 0 linhas

---

## 📝 Checklist Final

- [ ] Diagnóstico executado (✅ políticas pertencem a `supabase_storage_admin`)
- [ ] ALTER POLICY executado (via agente ou manualmente)
- [ ] Validação executada (0 referências a `users.name`)
- [ ] Expressões verificadas (todas usam `extract_tutor_id_from_path(name)`)

---

## 🎯 Resultado Esperado

Após a correção:

1. ✅ **Todas as políticas usam `extract_tutor_id_from_path(name)`**
   - A função recebe o caminho do arquivo (`name` da tabela `storage.objects`)
   - Extrai o tutor ID do caminho (ex: `tutors/123/arquivo.pdf` → `123`)

2. ✅ **Nenhuma política referencia `users.name`**
   - A validação retorna 0 linhas

3. ✅ **Tutores conseguem acessar seus próprios arquivos**
   - Arquivos em `tutors/{tutorId}/arquivo.ext` são acessíveis pelo tutor
   - Arquivos em `staff/{tutorId}/arquivo.ext` são acessíveis pelo tutor

---

## 🆘 Troubleshooting

### Problema: "Permission denied" ao executar ALTER POLICY

**Causa:** O role atual não tem permissão para alterar políticas de `supabase_storage_admin`.

**Solução:**
1. Executar via **SQL Editor do Supabase Dashboard** (tem permissões elevadas)
2. Ou usar `SET ROLE supabase_storage_admin` (se tiver permissões)

### Problema: "Policy does not exist"

**Causa:** Nome da política incorreto ou política em outro schema.

**Solução:**
1. Verificar o nome exato usando a query de diagnóstico
2. Usar o nome exato (com aspas se necessário)

---

## 📞 Próximos Passos

Após resolver:

1. **Testar funcionalidade:**
   - Criar tutor de teste
   - Fazer upload para `tutors/{tutorId}/arquivo.pdf`
   - Verificar se o tutor consegue acessar

2. **Monitorar logs:**
   - Verificar se há erros relacionados
   - Verificar se tutores conseguem acessar arquivos

---

**🚀 Após completar a correção, todas as políticas RLS estarão funcionando corretamente!**


