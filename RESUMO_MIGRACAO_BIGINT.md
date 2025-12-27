# ✅ Migração para Função BIGINT (Zero-Downtime)

## 🎯 Estratégia

- ✅ **Criar nova função** `extract_tutor_id_from_path_bigint` que retorna `bigint`
- ✅ **Migrar políticas** para usar a nova função (sem downtime)
- ✅ **Validar** que tudo está funcionando
- ✅ **Remover função antiga** (opcional, após validação)

---

## 📋 Passo 1: Tentar via Agente (Recomendado)

Use o arquivo `RESPOSTA_CONFIRMAR_OPCAO_B.txt` para confirmar que o agente pode prosseguir.

O agente irá:
1. Criar a nova função `extract_tutor_id_from_path_bigint`
2. Atualizar as 4 políticas para usar a nova função
3. Validar que tudo está funcionando
4. Opcionalmente remover a função antiga

---

## 📋 Passo 2: Executar Manualmente (Se necessário)

Se preferir executar manualmente:

1. **Abrir SQL Editor do Supabase Dashboard**
2. **Executar o script `SQL_MIGRAR_PARA_FUNCAO_BIGINT.sql`**
   - Cria a nova função
   - Migra as 4 políticas
   - Inclui validações completas
   - Opcionalmente remove a função antiga

---

## ✅ Validação Esperada

Após executar a migração:

### Query 1: Verificar nova função
```sql
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
  AND proname = 'extract_tutor_id_from_path_bigint';
```

**Resultado esperado:** `return_type = bigint`

### Query 2: Testar nova função
```sql
SELECT 
  'tutors/123/arquivo.pdf' as test_path,
  public.extract_tutor_id_from_path_bigint('tutors/123/arquivo.pdf') as extracted_id,
  pg_typeof(public.extract_tutor_id_from_path_bigint('tutors/123/arquivo.pdf')) as id_type;
```

**Resultado esperado:**
- `extracted_id = 123`
- `id_type = bigint`

### Query 3: Verificar políticas
```sql
SELECT 
  p.polname as policy_name,
  CASE 
    WHEN pg_get_expr(p.qual, p.polrelid) LIKE '%extract_tutor_id_from_path_bigint%' THEN '✅ Usa nova função'
    WHEN pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%extract_tutor_id_from_path_bigint%' THEN '✅ Usa nova função'
    ELSE '❌ Ainda usa função antiga'
  END as validation
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

**Resultado esperado:** Todas as linhas devem mostrar "✅ Usa nova função"

---

## 📝 Checklist Final

- [ ] Nova função criada (`extract_tutor_id_from_path_bigint`)
- [ ] Função retorna `bigint` (compatível com `users.id`)
- [ ] Todas as 4 políticas migradas para a nova função
- [ ] Validação executada (todas usam a nova função)
- [ ] Testes executados (função funciona corretamente)
- [ ] Função antiga removida (opcional, após validação)

---

## 🎯 Resultado Esperado

Após a migração:

1. ✅ **Nova função `extract_tutor_id_from_path_bigint` retorna `bigint`**
   - Compatível com `users.id` (bigint)
   - Extrai o tutor ID do caminho corretamente

2. ✅ **Todas as políticas usam a nova função**
   - Zero-downtime durante a migração
   - Políticas permanecem ativas

3. ✅ **Sistema RLS funcionando corretamente**
   - Comparação `bigint = bigint` funciona
   - Tutores conseguem acessar seus próprios arquivos

---

## 🔍 Vantagens da Opção B

1. **Zero-downtime:** Políticas permanecem ativas durante a migração
2. **Segurança:** Não usa `DROP CASCADE` que pode remover políticas
3. **Reversível:** Função antiga pode ser mantida temporariamente
4. **Testável:** Pode validar antes de remover a função antiga

---

## 🆘 Troubleshooting

### Problema: "Function extract_tutor_id_from_path_bigint does not exist"

**Causa:** Função não foi criada.

**Solução:** Executar o `CREATE FUNCTION` novamente.

### Problema: "Policy still uses old function"

**Causa:** Política não foi atualizada.

**Solução:** Executar o `ALTER POLICY` novamente.

### Problema: "Cannot compare bigint with integer"

**Causa:** Política ainda usa a função antiga.

**Solução:** Verificar e atualizar a política para usar a nova função.

---

## 📞 Próximos Passos

Após migração bem-sucedida:

1. **Testar funcionalidade:**
   - Criar tutor de teste
   - Fazer upload para `tutors/{tutorId}/arquivo.pdf`
   - Verificar se o tutor consegue acessar

2. **Monitorar logs:**
   - Verificar se há erros relacionados
   - Verificar se tutores conseguem acessar arquivos

3. **Remover função antiga (opcional):**
   - Após validar que tudo está funcionando
   - Verificar que nenhuma outra política/código usa a função antiga
   - Executar `DROP FUNCTION IF EXISTS public.extract_tutor_id_from_path(text);`

---

**🚀 Após completar a migração, todas as políticas RLS estarão funcionando corretamente com zero-downtime!**


