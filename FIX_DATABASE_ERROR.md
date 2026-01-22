# Corrigir Erro: "Tenant or user not found"

## Erro Atual

```
k: Tenant or user not found
code: 'XX000'
```

**Causa:** Connection string do banco de dados está incorreta ou sem SSL configurado.

---

## Solução Rápida

Execute o script interativo que testa 3 variações de connection string:

```bash
./fix-database-connection.sh
```

---

## 3 Opções Disponíveis

### Opção 1: Transaction Pooler com SSL (RECOMENDADO)
```
postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```
- ✅ Otimizado para Vercel/Serverless
- ✅ Porta 6543
- ✅ SSL habilitado

### Opção 2: Direct Connection com SSL
```
postgresql://postgres:401bFr505@@db.hxfvlaeqhkmelvyzgfqp.supabase.co:5432/postgres?sslmode=require
```
- ✅ Conexão direta ao banco
- ✅ Porta 5432
- ✅ SSL habilitado

### Opção 3: Session Pooler com SSL
```
postgresql://postgres:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```
- ✅ Session pooling
- ✅ Porta 5432
- ✅ SSL habilitado

---

## Como Usar o Script

### Passo 1: Execute o script
```bash
./fix-database-connection.sh
```

### Passo 2: Escolha uma opção
```
Escolha uma opção (1-3) ou 'a' para testar todas: 1
```

**Recomendação:** Comece com opção **1** (Transaction Pooler)

### Passo 3: Faça redeploy
```
Deseja fazer redeploy agora para testar? (y/n): y
```

### Passo 4: Verifique os logs
```bash
vercel logs
```

Ou acesse: https://vercel.com/dashboard → Deployments → Latest → Logs

---

## Se a Opção 1 Não Funcionar

Execute o script novamente e teste outra opção:

```bash
./fix-database-connection.sh
```

Escolha **2** ou **3** e repita o processo.

---

## Verificar se Funcionou

### ✅ Sinais de Sucesso

Nos logs do Vercel, você deve ver:
- ✅ Sem erro "Tenant or user not found"
- ✅ Sem erro "password authentication failed"
- ✅ Conexões ao banco bem-sucedidas
- ✅ Queries executando normalmente

### ❌ Se Ainda Houver Erro

1. **Verificar senha no Supabase:**
   - Acesse: https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp/settings/database
   - Confirme a senha: `401bFr505@`
   - Se necessário, reset a senha

2. **Obter connection string oficial:**
   - No dashboard do Supabase
   - Vá em: Settings → Database → Connection String
   - Copie a URI completa
   - Use no script ou configure manualmente

3. **Testar localmente:**
   ```bash
   # Criar .env.local
   echo 'DATABASE_URL="[SUA_CONNECTION_STRING]"' > .env.local
   
   # Testar
   npm run dev
   ```

---

## Configuração Manual (Alternativa)

Se preferir configurar manualmente no Vercel:

### Via Interface Web

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **defensavel**
3. **Settings** → **Environment Variables**
4. Edite `DATABASE_URL`
5. Cole uma das 3 opções acima
6. Selecione: Production, Preview, Development
7. **Save**
8. **Deployments** → **Redeploy**

### Via CLI

```bash
# Login
vercel login

# Link projeto
vercel link

# Remover existente
vercel env rm DATABASE_URL production -y
vercel env rm DATABASE_URL preview -y
vercel env rm DATABASE_URL development -y

# Adicionar nova (Opção 1)
echo "postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require" | vercel env add DATABASE_URL production

echo "postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require" | vercel env add DATABASE_URL preview

echo "postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505@@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require" | vercel env add DATABASE_URL development

# Redeploy
vercel --prod
```

---

## Diferenças Entre as Opções

| Característica | Opção 1 | Opção 2 | Opção 3 |
|----------------|---------|---------|---------|
| **Tipo** | Transaction Pooler | Direct | Session Pooler |
| **Porta** | 6543 | 5432 | 5432 |
| **SSL** | ✅ Sim | ✅ Sim | ✅ Sim |
| **Vercel** | ✅ Ideal | ⚠️ Funciona | ⚠️ Funciona |
| **Formato User** | `postgres.[ref]` | `postgres` | `postgres` |
| **Host** | pooler | db | pooler |

---

## Por Que o Erro Aconteceu?

### Problema 1: Falta de SSL
O Supabase **requer** SSL para conexões. Sem `?sslmode=require`, a conexão falha.

### Problema 2: Formato do Usuário
- Transaction Pooler usa: `postgres.[project_ref]`
- Direct/Session usa: `postgres`

### Problema 3: Host Incorreto
- Transaction Pooler: `aws-0-sa-east-1.pooler.supabase.com`
- Direct: `db.[project_ref].supabase.co`

---

## Comandos Úteis

```bash
# Ver variáveis configuradas
vercel env ls

# Ver logs em tempo real
vercel logs --follow

# Testar conexão localmente
npm run dev

# Redeploy rápido
vercel --prod

# Ver informações do projeto
vercel inspect
```

---

## Suporte

Se nenhuma das 3 opções funcionar:

1. **Verifique status do Supabase:**
   - https://status.supabase.com

2. **Reset a senha do banco:**
   - Dashboard → Settings → Database → Reset Password

3. **Obtenha connection string oficial:**
   - Dashboard → Settings → Database → Connection String
   - Copie a URI completa

4. **Teste localmente primeiro:**
   - Configure `.env.local`
   - Execute `npm run dev`
   - Confirme que funciona antes de configurar no Vercel

---

## Links Úteis

- [Dashboard Supabase](https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp)
- [Database Settings](https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp/settings/database)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Logs](https://vercel.com/dashboard)

---

## Resumo

1. Execute: `./fix-database-connection.sh`
2. Escolha opção **1** (recomendada)
3. Faça redeploy quando solicitado
4. Verifique logs do Vercel
5. Se não funcionar, teste opções **2** ou **3**

✅ Uma das 3 opções **certamente** vai funcionar!
