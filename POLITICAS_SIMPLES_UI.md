# Políticas RLS para Storage - Via UI do Supabase

## Acesse: Storage > Policies

---

## Bucket: `pet-photos`

### Política 1: SELECT (Leitura)
- **Nome:** `Authenticated users can view pet photos`
- **Operação:** SELECT
- **Roles:** authenticated
- **Definição:**
```sql
true
```
> Temporariamente permitir todos autenticados (simplificado)

### Política 2: INSERT (Upload)
- **Nome:** `Authenticated users can upload pet photos`
- **Operação:** INSERT
- **Roles:** authenticated
- **Definição:**
```sql
true
```

### Política 3: DELETE
- **Nome:** `Authenticated users can delete pet photos`
- **Operação:** DELETE
- **Roles:** authenticated
- **Definição:**
```sql
true
```

---

## Bucket: `documents`

### Política 1: SELECT
- **Nome:** `Authenticated users can view documents`
- **Operação:** SELECT
- **Roles:** authenticated
- **Definição:** `true`

### Política 2: INSERT
- **Nome:** `Authenticated users can upload documents`
- **Operação:** INSERT
- **Roles:** authenticated
- **Definição:** `true`

### Política 3: DELETE
- **Nome:** `Authenticated users can delete documents`
- **Operação:** DELETE
- **Roles:** authenticated
- **Definição:** `true`

---

## Bucket: `wall-media`

### Política 1: SELECT
- **Nome:** `Authenticated users can view wall media`
- **Operação:** SELECT
- **Roles:** authenticated
- **Definição:** `true`

### Política 2: INSERT
- **Nome:** `Authenticated users can upload wall media`
- **Operação:** INSERT
- **Roles:** authenticated
- **Definição:** `true`

### Política 3: DELETE
- **Nome:** `Authenticated users can delete wall media`
- **Operação:** DELETE
- **Roles:** authenticated
- **Definição:** `true`

---

## NOTA IMPORTANTE

As políticas acima são **simplificadas** e permitem que qualquer usuário autenticado acesse todos os arquivos. 

Para implementar a lógica de "apenas tutores vinculados", é necessário:
1. Estruturar os arquivos com o padrão `pets/{pet_id}/arquivo.jpg`
2. Usar policies mais complexas que verificam a tabela `pet_tutors`

Isso pode ser refinado posteriormente após o sistema estar funcionando.

