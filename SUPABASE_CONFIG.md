# Configuração do Supabase - Projeto INTELEX Defender

## Informações do Projeto

**Nome do Projeto:** Defesahub  
**Project ID:** `hxfvlaeqhkmelvyzgfqp`  
**Região:** São Paulo (sa-east-1)  
**Status:** ACTIVE_HEALTHY  
**PostgreSQL:** Versão 17.6.1.063

---

## Variáveis de Ambiente

### Para Vercel (Production)

Configure as seguintes variáveis de ambiente no painel do Vercel:

```bash
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://hxfvlaeqhkmelvyzgfqp.supabase.co

# Supabase Anon Key (Public - Safe for client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnZsYWVxaGttZWx2eXpnZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODczNDUsImV4cCI6MjA4NDA2MzM0NX0.ocKIwnSRscT1C6OUuuL0ijSqsC8oUYf3Juawe_FKLWc

# Supabase Database URL (Server-side only - NEVER expose to client)
# Formato: postgresql://postgres.[project-ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
DATABASE_URL=postgresql://postgres.hxfvlaeqhkmelvyzgfqp:[YOUR_DATABASE_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

# Supabase Service Role Key (Server-side only - NEVER expose to client)
# Obtenha no painel do Supabase: Settings > API > service_role key
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
```

### Para Desenvolvimento Local (.env.local)

Crie o arquivo `.env.local` na raiz do projeto:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://hxfvlaeqhkmelvyzgfqp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnZsYWVxaGttZWx2eXpnZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODczNDUsImV4cCI6MjA4NDA2MzM0NX0.ocKIwnSRscT1C6OUuuL0ijSqsC8oUYf3Juawe_FKLWc

# Database (obtenha a senha no painel do Supabase)
DATABASE_URL=postgresql://postgres.hxfvlaeqhkmelvyzgfqp:[YOUR_DATABASE_PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

# Service Role (obtenha no painel do Supabase)
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
```

---

## Como Obter Credenciais Faltantes

### 1. Database Password

1. Acesse o [Painel do Supabase](https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp)
2. Vá em **Settings** → **Database**
3. Copie a **Connection String** completa
4. Ou clique em **Reset Database Password** se necessário

### 2. Service Role Key

1. Acesse o [Painel do Supabase](https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp)
2. Vá em **Settings** → **API**
3. Copie a chave **service_role** (secret)
4. ⚠️ **NUNCA** exponha esta chave no client-side

---

## Configuração no Vercel

### Passo a Passo

1. Acesse o [Dashboard do Vercel](https://vercel.com/dashboard)
2. Selecione o projeto **Defender** (ou nome do deploy)
3. Vá em **Settings** → **Environment Variables**
4. Adicione cada variável:
   - **Key:** Nome da variável (ex: `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value:** Valor correspondente
   - **Environment:** Selecione `Production`, `Preview` e `Development`
5. Clique em **Save**
6. Faça um **Redeploy** do projeto para aplicar as variáveis

### Comando CLI (Alternativa)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Adicionar variáveis
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add DATABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Redeploy
vercel --prod
```

---

## Testando a Conexão

### Teste Local

```bash
# Instalar dependências
npm install @supabase/supabase-js

# Criar arquivo de teste
cat > test-supabase.js << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  const { data, error } = await supabase.from('_test').select('*').limit(1)
  
  if (error && error.code !== 'PGRST116') {
    console.error('❌ Erro na conexão:', error)
  } else {
    console.log('✅ Conexão com Supabase OK!')
  }
}

testConnection()
EOF

# Executar teste
node test-supabase.js
```

### Teste de Database URL

```bash
# Testar conexão direta com PostgreSQL
psql "postgresql://postgres.hxfvlaeqhkmelvyzgfqp:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

# Ou com Node.js
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌', err);
  else console.log('✅ Database OK:', res.rows[0]);
  pool.end();
});
"
```

---

## Segurança

### ⚠️ Regras Importantes

1. **NUNCA** commite arquivos `.env` ou `.env.local` no Git
2. **NUNCA** exponha `SUPABASE_SERVICE_ROLE_KEY` no client-side
3. **NUNCA** exponha `DATABASE_URL` no client-side
4. Use `NEXT_PUBLIC_*` apenas para variáveis que podem ser públicas
5. Adicione `.env.local` no `.gitignore`

### Verificar .gitignore

```bash
# Verificar se .env.local está no .gitignore
grep -q ".env.local" .gitignore || echo ".env.local" >> .gitignore
```

---

## Solução de Problemas

### Erro: ENOTFOUND db.hxfvlaeqhkmelvyzgfqp.supabase.co

**Causa:** `DATABASE_URL` não configurada ou incorreta no Vercel

**Solução:**
1. Verifique se a variável está configurada no Vercel
2. Confirme que a senha está correta
3. Faça redeploy após adicionar/corrigir

### Erro: Invalid API key

**Causa:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` incorreta

**Solução:**
1. Copie novamente a chave do painel do Supabase
2. Atualize no Vercel
3. Redeploy

### Erro: Connection timeout

**Causa:** Firewall ou região incorreta

**Solução:**
1. Verifique se o projeto Supabase está ativo
2. Confirme a região (sa-east-1)
3. Teste a conexão localmente primeiro

---

## Chaves Disponíveis

### Anon Key (Public)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZnZsYWVxaGttZWx2eXpnZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0ODczNDUsImV4cCI6MjA4NDA2MzM0NX0.ocKIwnSRscT1C6OUuuL0ijSqsC8oUYf3Juawe_FKLWc
```

### Publishable Key (Recomendada - Modern)
```
sb_publishable_s1H0qB5POiXOwVs4QdMVuQ_Qny7HUj5
```

**Nota:** A Publishable Key é recomendada para novas aplicações por oferecer melhor segurança e rotação independente.

---

## Próximos Passos

1. ✅ Obter senha do banco de dados no painel do Supabase
2. ✅ Obter Service Role Key no painel do Supabase
3. ✅ Configurar todas as variáveis no Vercel
4. ✅ Fazer redeploy do projeto
5. ✅ Testar a aplicação em produção
6. ✅ Verificar logs no Vercel para confirmar conexão

---

## Links Úteis

- [Dashboard do Projeto](https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp)
- [Documentação Supabase](https://supabase.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
