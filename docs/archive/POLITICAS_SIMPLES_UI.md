# Políticas RLS para Storage - Via UI do Supabase

## Acesse: Storage > Policies

---

## Bucket: `documents`

### Política 1: SELECT
- **Nome:** `Authenticated users can view documents`
- **Operação:** SELECT
- **Roles:** authenticated
- **Definição:**
```sql
true
```

### Política 2: INSERT
- **Nome:** `Authenticated users can upload documents`
- **Operação:** INSERT
- **Roles:** authenticated
- **Definição:**
```sql
true
```

### Política 3: UPDATE
- **Nome:** `Authenticated users can update documents`
- **Operação:** UPDATE
- **Roles:** authenticated
- **Definição:**
```sql
true
```

### Política 4: DELETE
- **Nome:** `Authenticated users can delete documents`
- **Operação:** DELETE
- **Roles:** authenticated
- **Definição:**
```sql
true
```

---

## NOTA IMPORTANTE

As políticas acima são **simplificadas** e permitem que qualquer usuário autenticado acesse todos os arquivos. 

Para implementar a lógica de acesso por processo/assistido, recomenda-se:
1. Estruturar os arquivos por pasta (ex: `processos/{processo_id}/arquivo.pdf`)
2. Criar policies que validem o vínculo do usuário ao processo/assistido

Isso pode ser refinado conforme a política de segurança da Defensoria.
