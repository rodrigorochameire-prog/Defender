# 🔧 Solução: Erro de Colunas users

## 🐛 Problema

O erro mostra que o Drizzle está tentando selecionar colunas em snake_case:
- `open_id`, `password_hash`, `login_method`, etc.

Mas o banco de dados pode ter essas colunas em camelCase (com aspas):
- `"openId"`, `"passwordHash"`, `"loginMethod"`, etc.

## ✅ Solução: Verificar e Ajustar

### Passo 1: Verificar a estrutura real do banco

Execute o script `SQL_VERIFICAR_COLUNAS_USERS.sql` no SQL Editor do Supabase para ver quais colunas realmente existem.

### Passo 2: Escolher uma das opções

#### Opção A: Se o banco tem colunas em snake_case
✅ O schema atual está correto! Apenas faça rebuild:
```bash
pnpm build
pnpm start
```

#### Opção B: Se o banco tem colunas em camelCase (com aspas)
Você precisa **reverter o schema** para usar camelCase com aspas:

1. **Reverter mudanças no `drizzle/schema.ts`**:
   - `open_id` → `"openId"`
   - `password_hash` → `"passwordHash"`
   - `login_method` → `"loginMethod"`
   - `email_verified` → `"emailVerified"`
   - `created_at` → `"createdAt"`
   - `updated_at` → `"updatedAt"`
   - `last_signed_in` → `"lastSignedIn"`

2. **Rebuild**:
   ```bash
   pnpm build
   pnpm start
```

#### Opção C: Renomear colunas no banco para snake_case (Recomendado)
Execute o script `SQL_RENOMEAR_COLUNAS_USERS.sql` (descomente as linhas necessárias) no Supabase SQL Editor.

Depois, o schema atual funcionará.

## 🎯 Recomendação

**Use a Opção C**: Renomear as colunas no banco para snake_case, pois:
- É o padrão do PostgreSQL
- Evita problemas com aspas
- Mantém consistência

## 📝 Próximos Passos

1. Execute `SQL_VERIFICAR_COLUNAS_USERS.sql` no Supabase
2. Veja quais colunas existem
3. Escolha a opção apropriada acima
4. Execute rebuild e teste


