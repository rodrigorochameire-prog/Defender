# 🔍 Diagnóstico: Erro de Query users

## 🐛 Problema

O erro mostra que o Drizzle está tentando fazer uma query com colunas em camelCase:
```sql
select "id", "openId", "auth_id", "name", "email", "passwordHash", ...
```

Mas o banco de dados pode ter essas colunas em snake_case (`open_id`, `password_hash`, etc.).

## ✅ Solução Temporária Aplicada

Adicionei um fallback em `getUserByEmail()` que tenta:
1. Primeiro: Drizzle ORM (schema atual)
2. Se falhar: SQL raw com snake_case
3. Se falhar: SQL raw com camelCase

## 🔍 Diagnóstico Completo

### Opção 1: Verificar Logs do Servidor

No terminal onde o servidor está rodando, você deve ver um erro mais detalhado do PostgreSQL. Procure por algo como:
```
column "openId" does not exist
```
ou
```
column "open_id" does not exist
```

Isso vai indicar qual formato o banco realmente usa.

### Opção 2: Executar Script SQL no Supabase

Execute o script `SQL_VERIFICAR_COLUNAS_USERS.sql` no SQL Editor do Supabase para ver a estrutura real da tabela.

### Opção 3: Testar Agora

Com o fallback aplicado, tente fazer login novamente. Se funcionar, o fallback está funcionando, mas você ainda precisa corrigir o schema para corresponder ao banco.

## 🎯 Próximos Passos

1. **Teste agora**: Tente fazer login/recuperação de senha novamente
2. **Verifique os logs**: Veja o erro completo no terminal do servidor
3. **Execute o script SQL**: Para confirmar a estrutura do banco
4. **Ajuste o schema**: Baseado no que encontrar

## 📝 Se o Fallback Funcionar

Se o fallback funcionar, você verá mensagens de warning no console do servidor indicando qual formato funcionou. Use isso para ajustar o schema permanentemente.

