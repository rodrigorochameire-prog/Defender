# Variáveis de Ambiente - Projeto Defensavel

## Informações do Projeto Supabase

- **Nome:** Defesahub
- **Project ID:** hxfvlaeqhkmelvyzgfqp
- **Região:** São Paulo (sa-east-1)
- **Status:** ACTIVE_HEALTHY
- **PostgreSQL:** v17.6.1.063
- **Host:** db.hxfvlaeqhkmelvyzgfqp.supabase.co

---

## Connection Strings do Supabase

O Supabase oferece dois tipos de pooler:

### 1. Transaction Pooler (Porta 6543)
- **Uso:** Conexões serverless, edge functions, Vercel
- **Modo:** Transaction
- **Porta:** 6543
- **Ideal para:** Next.js API Routes, tRPC, serverless

### 2. Session Pooler (Porta 5432)
- **Uso:** Conexões persistentes, aplicações tradicionais
- **Modo:** Session
- **Porta:** 5432
- **Ideal para:** Aplicações com conexões de longa duração

### 3. Direct Connection (Porta 5432)
- **Uso:** Desenvolvimento local, migrations, admin
- **Modo:** Direct
- **Porta:** 5432
- **Ideal para:** Drizzle migrations, scripts de seed

---

## Variáveis de Ambiente Necessárias

### Para Vercel (Serverless - Transaction Pooler)

```bash
# Connection String - Transaction Pooler (Porta 6543)
DATABASE_URL="postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

# Supabase URLs e Keys
NEXT_PUBLIC_SUPABASE_URL="https://hxfvlaeqhkmelvyzgfqp.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnZsYWVxaGttZWx2eXpnZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODczNDUsImV4cCI6MjA4NDA2MzM0NX0.ocKIwnSRscT1C6OUuuL0ijSqsC8oUYf3Juawe_FKLWc"

# Service Role Key (Server-side only)
SUPABASE_SERVICE_ROLE_KEY="[OBTER_NO_DASHBOARD]"
```

### Para Session Pooler (Se necessário)

Se você precisa usar Session Pooler (porta 5432):

```bash
# Connection String - Session Pooler (Porta 5432)
DATABASE_URL="postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```

### Para Desenvolvimento Local

```bash
# Direct Connection (Porta 5432)
DATABASE_URL="postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@db.hxfvlaeqhkmelvyzgfqp.supabase.co:5432/postgres"

# Ou Session Pooler
DATABASE_URL="postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```

---

## Diferenças Entre Poolers

| Característica | Transaction Pooler | Session Pooler | Direct Connection |
|----------------|-------------------|----------------|-------------------|
| **Porta** | 6543 | 5432 | 5432 |
| **Modo** | Transaction | Session | Direct |
| **Conexões** | Compartilhadas | Persistentes | Diretas |
| **Ideal para** | Serverless | Apps tradicionais | Migrations |
| **Vercel** | ✅ Recomendado | ⚠️ Pode funcionar | ❌ Não usar |
| **Prepared Statements** | ❌ Limitado | ✅ Completo | ✅ Completo |
| **Transações** | ✅ Sim | ✅ Sim | ✅ Sim |

---

## Recomendação para Vercel

Para o projeto **defensavel** no Vercel, use **Transaction Pooler (porta 6543)**:

```bash
DATABASE_URL="postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
```

**Por quê?**
- ✅ Otimizado para serverless
- ✅ Gerencia conexões automaticamente
- ✅ Evita "too many connections"
- ✅ Melhor performance no Vercel
- ✅ Recomendação oficial do Supabase

---

## Como Obter Service Role Key

1. Acesse: https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp/settings/api
2. Role até **Project API keys**
3. Copie a chave **service_role** (secret)

⚠️ **IMPORTANTE:** Esta chave é secreta e nunca deve ser exposta no client-side!

---

## Configurar no Vercel

### Via Script (Recomendado)

```bash
# Usar o script atualizado
./configure-database-url.sh
```

### Via CLI Manual

```bash
# Login
vercel login

# Link projeto
vercel link

# Adicionar DATABASE_URL (Transaction Pooler - Porta 6543)
echo "postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" | vercel env add DATABASE_URL production

echo "postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" | vercel env add DATABASE_URL preview

echo "postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" | vercel env add DATABASE_URL development

# Adicionar outras variáveis
echo "https://hxfvlaeqhkmelvyzgfqp.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production

echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnZsYWVxaGttZWx2eXpnZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODczNDUsImV4cCI6MjA4NDA2MzM0NX0.ocKIwnSRscT1C6OUuuL0ijSqsC8oUYf3Juawe_FKLWc" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

# Redeploy
vercel --prod
```

### Via Interface Web

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **defensavel**
3. **Settings** → **Environment Variables**
4. Adicione cada variável:
   - `DATABASE_URL` = `postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://hxfvlaeqhkmelvyzgfqp.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (anon key acima)
   - `SUPABASE_SERVICE_ROLE_KEY` = (obter no dashboard)
5. Selecione: Production, Preview, Development
6. **Save**
7. **Deployments** → **Redeploy**

---

## Testar Conexão

### No Vercel (Após Deploy)

Verifique os logs:
```bash
vercel logs
```

Procure por:
- ✅ Sem erro `password authentication failed`
- ✅ Sem erro `ENOTFOUND`
- ✅ Conexões bem-sucedidas

### Localmente

```bash
# Criar .env.local
echo 'DATABASE_URL="postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@db.hxfvlaeqhkmelvyzgfqp.supabase.co:5432/postgres"' > .env.local

# Testar
npm run dev
```

---

## Troubleshooting

### Erro: "password authentication failed"

**Causa:** Senha incorreta ou formato errado

**Solução:**
1. Verificar senha: `401bFr505@`
2. Usar Transaction Pooler (porta 6543)
3. Verificar @ está escapado corretamente

### Erro: "too many connections"

**Causa:** Usando Direct Connection no Vercel

**Solução:** Trocar para Transaction Pooler (porta 6543)

### Erro: "prepared statement already exists"

**Causa:** Usando Transaction Pooler com prepared statements

**Solução:** Configurar Drizzle/Prisma para desabilitar prepared statements:

```ts
// drizzle.config.ts
export default {
  // ...
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Desabilitar prepared statements para Transaction Pooler
  connection: {
    ssl: false,
  },
};
```

---

## Links Úteis

- [Dashboard Supabase](https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp)
- [Database Settings](https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp/settings/database)
- [API Settings](https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp/settings/api)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Supabase Connection Pooling Docs](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

---

## Resumo Rápido

**Para Vercel (Production):**
```
DATABASE_URL=postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

**Para Local (Development):**
```
DATABASE_URL=postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@db.hxfvlaeqhkmelvyzgfqp.supabase.co:5432/postgres
```

**Porta 6543 = Transaction Pooler (Vercel)**  
**Porta 5432 = Session Pooler ou Direct (Local)**
