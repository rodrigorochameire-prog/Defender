# ⚠️ AVISO: INCOMPATIBILIDADE DE NOMES DE COLUNAS

## 🔴 PROBLEMA IDENTIFICADO

A tabela `users` no Supabase foi criada com nomes em **snake_case**:
- `open_id` (ao invés de `"openId"`)
- `login_method` (ao invés de `"loginMethod"`)
- `email_verified` (ao invés de `"emailVerified"`)
- `created_at` (ao invés de `"createdAt"`)
- etc.

Mas o código espera nomes em **camelCase** com aspas:
- `"openId"`
- `"loginMethod"`
- `"emailVerified"`
- `"createdAt"`
- etc.

## ⚠️ ISSO VAI CAUSAR ERROS

Quando o código tentar inserir/atualizar usuários, vai dar erro porque os nomes das colunas não vão corresponder.

## ✅ SOLUÇÕES

### Opção 1: Recriar a tabela com nomes corretos (Recomendado)

Peça ao agente do Supabase para:
1. Dropar a tabela atual: `DROP TABLE IF EXISTS users;`
2. Recriar usando o SQL do arquivo `supabase-initial-schema.sql` (que tem os nomes corretos com aspas)

### Opção 2: Ajustar o código para usar snake_case

Modificar o código para usar os nomes snake_case que já existem na tabela. Isso requer mudanças em:
- `drizzle/schema.ts` - Ajustar nomes das colunas
- `server/db.ts` - Ajustar referências às colunas

### Opção 3: Criar views ou aliases (Não recomendado)

Criar views que mapeiam os nomes, mas isso adiciona complexidade desnecessária.

## 🎯 RECOMENDAÇÃO

**Use a Opção 1**: Recriar a tabela com os nomes corretos.

Peça ao agente:
```
Por favor, recrie a tabela users usando o SQL original com nomes camelCase entre aspas.
Execute: DROP TABLE IF EXISTS users CASCADE;
Depois execute o CREATE TABLE do arquivo supabase-initial-schema.sql
```

## 📝 NOTA

Por enquanto, deixe o agente criar os índices e continuar com buckets/policies.
Depois, quando tudo estiver configurado, recrie a tabela com os nomes corretos.


