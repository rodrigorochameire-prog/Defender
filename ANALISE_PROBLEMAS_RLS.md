# 🔍 Análise de Problemas nas Políticas RLS

## ✅ Status Geral
- **48 políticas criadas** com sucesso
- **Todas seguem o padrão de nome** correto
- **4 problemas críticos** identificados que precisam correção

---

## 🚨 Problemas Identificados

### 1. **CRÍTICO: Lógica incorreta em `staff` e `tutors`**

**Problema:**
```sql
-- ❌ ERRADO (atual)
EXISTS (
  SELECT 1 FROM users 
  WHERE users.auth_id = auth.uid() 
    AND users.id = extract_tutor_id_from_path(users.name)  -- ❌ Extrai do nome do usuário!
)
```

**Correção:**
```sql
-- ✅ CORRETO
EXISTS (
  SELECT 1 FROM users 
  WHERE users.auth_id = auth.uid() 
    AND users.id = extract_tutor_id_from_path(name)  -- ✅ Extrai do caminho do arquivo!
)
```

**Explicação:**
- A função `extract_tutor_id_from_path()` deve receber o **caminho do arquivo** (`name` da tabela `storage.objects`)
- Atualmente está recebendo `users.name` (nome do usuário), o que não faz sentido
- O caminho esperado é: `tutors/{tutorId}/arquivo.jpg` ou `staff/{tutorId}/arquivo.jpg`

**Impacto:**
- ❌ Políticas de `staff` e `tutors` **não funcionam corretamente**
- ❌ Tutores não conseguem acessar seus próprios arquivos
- ❌ Apenas admins conseguem acessar (devido ao `OR is_admin()`)

---

### 2. **ATENÇÃO: Leitura pública em `marketing` e `partnerships`**

**Problema:**
```sql
-- Políticas atuais
marketing_policy_select: TO public  -- ❌ Qualquer pessoa pode ler
partnerships_policy_select: TO public  -- ❌ Qualquer pessoa pode ler
```

**Decisão necessária:**
- ✅ **Se desejar público:** Manter como está (para marketing/parcerias visíveis)
- ❌ **Se desejar privado:** Alterar para `TO authenticated` e adicionar lógica de acesso

**Recomendação:**
- `marketing`: Pode ser público (conteúdo de marketing geral)
- `partnerships`: Pode ser público (logos de parceiros, etc.)

---

### 3. **ATENÇÃO: `wall_policy_insert` muito permissiva**

**Problema:**
```sql
-- ❌ ATUAL: Qualquer usuário autenticado pode inserir
wall_policy_insert: WITH CHECK (bucket_id = 'wall')
```

**Correção sugerida:**
```sql
-- ✅ CORRETO: Qualquer usuário pode inserir, mas deve definir owner
wall_policy_insert: WITH CHECK (
  bucket_id = 'wall' 
  AND (metadata->>'owner')::uuid = auth.uid()  -- Força o usuário a ser owner
)
```

**Explicação:**
- O bucket `wall` é público para leitura
- Mas ao inserir, o usuário deve ser o owner do arquivo
- Isso garante que apenas o criador pode atualizar/deletar (via `wall_policy_update/delete`)

---

### 4. **INFO: INSERT permitido para tutores em alguns buckets**

**Buckets que permitem INSERT por tutores:**
- ✅ `documents` - Tutores podem inserir documentos de seus pets
- ✅ `health-logs` - Tutores podem inserir logs de saúde
- ✅ `products` - Tutores podem inserir produtos usados
- ✅ `tutors` - Tutores podem inserir seus próprios arquivos

**Decisão:**
- Se isso está **correto** para seu caso de uso, mantenha
- Se apenas **admins** devem inserir, remova `is_tutor_of_pet()` do `WITH CHECK`

---

## 📋 Resumo de Correções Necessárias

| Bucket | Problema | Prioridade | Ação |
|--------|----------|------------|------|
| `staff` | Lógica incorreta (`users.name` vs `name`) | 🔴 CRÍTICO | Corrigir |
| `tutors` | Lógica incorreta (`users.name` vs `name`) | 🔴 CRÍTICO | Corrigir |
| `wall` | INSERT muito permissivo | 🟡 MÉDIO | Opcional (recomendado) |
| `marketing` | Leitura pública | 🟢 BAIXO | Decisão do usuário |
| `partnerships` | Leitura pública | 🟢 BAIXO | Decisão do usuário |

---

## ✅ Próximos Passos

1. **Corrigir políticas de `staff` e `tutors`** (CRÍTICO)
2. **Decidir sobre `wall_policy_insert`** (recomendado)
3. **Decidir sobre leitura pública** de `marketing`/`partnerships` (opcional)
4. **Validar após correções**

---

## 📝 Notas Técnicas

### Estrutura de caminhos esperada:
- `pets/{petId}/arquivo.jpg`
- `tutors/{tutorId}/arquivo.jpg`
- `staff/{tutorId}/arquivo.jpg`
- `documents/{petId}/arquivo.pdf`
- `wall/{qualquer}/arquivo.jpg` (público)

### Funções helper:
- `extract_pet_id_from_path(name)` - Extrai `petId` do caminho
- `extract_tutor_id_from_path(name)` - Extrai `tutorId` do caminho
- `is_tutor_of_pet(auth_id, pet_id)` - Verifica se usuário é tutor do pet
- `is_admin(auth_id)` - Verifica se usuário é admin


