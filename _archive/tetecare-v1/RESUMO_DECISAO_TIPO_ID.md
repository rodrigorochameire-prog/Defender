# 🔍 Decisão: Tipo de `users.id` e Correção das Políticas

## 🎯 Situação Atual

- ✅ **Schema mostra:** `users.id` é `integer` (SERIAL em PostgreSQL)
- ❓ **Banco real:** Precisa verificar se é realmente `integer` ou se foi alterado para `uuid`
- ✅ **Função atual:** `extract_tutor_id_from_path` retorna `integer`
- ❓ **Políticas:** Precisam comparar com o tipo correto

---

## 📋 Passo 1: Verificar Tipo Real no Banco

Execute o script `SQL_VERIFICAR_TIPO_USERS_ID.sql` para confirmar o tipo real de `users.id` no banco de dados do Supabase.

**Query principal:**
```sql
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'id';
```

---

## 🔧 Passo 2: Aplicar Correção Baseada no Tipo

### Cenário A: `users.id` é INTEGER ✅

**Se o tipo for `integer` ou `int4`:**

1. ✅ **Função está correta:** `extract_tutor_id_from_path` retorna `integer`
2. ✅ **Políticas estão corretas:** Comparando `integer` com `integer`
3. ✅ **Apenas garantir:** Que as políticas usam `storage.objects.name` (já feito)

**Ação:** Nenhuma correção adicional necessária! Apenas garantir que as políticas usam `storage.objects.name`.

---

### Cenário B: `users.id` é UUID ❌

**Se o tipo for `uuid`:**

1. ❌ **Função precisa ajuste:** Criar `extract_tutor_uuid_from_path` que retorna `uuid`
2. ❌ **Políticas precisam atualização:** Usar a nova função
3. ✅ **Estrutura de caminhos:** Deve usar UUIDs (ex: `tutors/123e4567-e89b-12d3-a456-426614174000/arquivo.pdf`)

**Ação:**
1. Executar `SQL_CRIAR_FUNCAO_EXTRACT_TUTOR_UUID.sql` para criar a função UUID
2. Executar `SQL_ATUALIZAR_POLITICAS_PARA_UUID.sql` para atualizar as políticas

---

## 📝 Checklist de Decisão

- [ ] Tipo de `users.id` verificado no banco
- [ ] Decisão tomada (INTEGER ou UUID)
- [ ] Função criada/ajustada conforme necessário
- [ ] Políticas atualizadas conforme necessário
- [ ] Validação executada

---

## 🎯 Resultado Esperado

### Se INTEGER:
- ✅ Função `extract_tutor_id_from_path` retorna `integer`
- ✅ Políticas comparam `users.id` (integer) com `extract_tutor_id_from_path(...)` (integer)
- ✅ Caminhos usam números: `tutors/123/arquivo.pdf`

### Se UUID:
- ✅ Função `extract_tutor_uuid_from_path` retorna `uuid`
- ✅ Políticas comparam `users.id` (uuid) com `extract_tutor_uuid_from_path(...)` (uuid)
- ✅ Caminhos usam UUIDs: `tutors/123e4567-e89b-12d3-a456-426614174000/arquivo.pdf`

---

## 🆘 Troubleshooting

### Problema: "Cannot compare integer with uuid"

**Causa:** `users.id` é UUID mas a função retorna integer.

**Solução:** Criar função UUID e atualizar políticas.

### Problema: "Cannot compare uuid with integer"

**Causa:** `users.id` é integer mas a função retorna UUID.

**Solução:** Usar função integer e atualizar políticas.

---

## 📞 Próximos Passos

1. **Verificar tipo real** de `users.id` no banco
2. **Aplicar correção** baseada no tipo encontrado
3. **Validar** que as políticas funcionam corretamente
4. **Testar** com uploads reais

---

**🚀 Após determinar o tipo e aplicar a correção, todas as políticas RLS estarão funcionando corretamente!**


