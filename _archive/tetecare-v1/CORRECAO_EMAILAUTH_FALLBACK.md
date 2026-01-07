# ✅ Correção: emailAuth.ts com Fallback para Schema Mismatch

## 🐛 Problema

O `emailAuth.ts` estava fazendo queries diretas com Drizzle ORM, que falhavam quando o schema do banco não correspondia ao schema do Drizzle (camelCase vs snake_case).

## ✅ Correções Aplicadas

### 1. **`loginUser()`**
- ✅ Agora usa `getUserByEmail()` que tem fallback automático
- ✅ Tenta Drizzle primeiro, depois SQL raw com snake_case, depois camelCase

### 2. **`registerUser()`**
- ✅ Agora usa `getUserByEmail()` para verificar se email existe
- ✅ Evita erro de schema mismatch

### 3. **`generateResetToken()`**
- ✅ Agora usa `getUserByEmail()` em vez de query direta
- ✅ Funciona independente do formato das colunas no banco

### 4. **`changePassword()`**
- ✅ Adicionado try-catch com fallback para SQL raw
- ✅ Tenta Drizzle, depois SQL raw (camelCase), depois snake_case

## 🔄 Próximos Passos

Execute rebuild para aplicar as correções:

```bash
# 1. Parar o servidor (Ctrl+C)

# 2. Rebuild
pnpm build

# 3. Reiniciar
pnpm start
```

## 📝 Nota

As funções agora são mais robustas e funcionam mesmo se:
- O banco tem colunas em camelCase (com aspas)
- O banco tem colunas em snake_case
- Há mistura de formatos

O fallback automático detecta e usa o formato correto.


