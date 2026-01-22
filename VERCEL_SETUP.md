# Configuração Automática do Vercel

## Script de Configuração via CLI

Este guia explica como usar o script `setup-vercel-env.sh` para configurar automaticamente todas as variáveis de ambiente do Supabase no Vercel.

---

## Pré-requisitos

Antes de executar o script, você precisa obter duas credenciais do Supabase:

### 1. DATABASE_URL (Connection String com senha)

1. Acesse: https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp/settings/database
2. Role até **Connection String**
3. Selecione **URI** ou **Connection pooling**
4. Copie a string completa (formato: `postgresql://postgres.hxfvlaeqhkmelvyzgfqp:[PASSWORD]@...`)

**Exemplo:**
```
postgresql://postgres.hxfvlaeqhkmelvyzgfqp:SuaSenhaAqui@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

### 2. SUPABASE_SERVICE_ROLE_KEY

1. Acesse: https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp/settings/api
2. Role até **Project API keys**
3. Copie a chave **service_role** (secret)

**Exemplo:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSJ9...
```

⚠️ **IMPORTANTE:** Esta chave é secreta e nunca deve ser exposta no client-side!

---

## Como Executar o Script

### Passo 1: Clone o repositório (se ainda não fez)

```bash
git clone https://github.com/rodrigorochameire-prog/Defender.git
cd Defender
```

### Passo 2: Execute o script

```bash
./setup-vercel-env.sh
```

### Passo 3: Siga as instruções

O script irá:

1. **Verificar Vercel CLI** - Instala automaticamente se não estiver presente
2. **Login no Vercel** - Abre o navegador para autenticação
3. **Link do projeto** - Conecta com seu projeto no Vercel
4. **Solicitar credenciais** - Pede DATABASE_URL e SERVICE_ROLE_KEY
5. **Configurar variáveis** - Adiciona todas as variáveis em Production, Preview e Development
6. **Redeploy (opcional)** - Pergunta se deseja fazer deploy imediatamente

---

## Variáveis Configuradas Automaticamente

O script configura as seguintes variáveis em **todos os ambientes** (Production, Preview, Development):

### Públicas (Safe para client-side)
- `NEXT_PUBLIC_SUPABASE_URL` = `https://hxfvlaeqhkmelvyzgfqp.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Privadas (Server-side only)
- `DATABASE_URL` = (fornecida por você)
- `SUPABASE_SERVICE_ROLE_KEY` = (fornecida por você)

---

## Troubleshooting

### Erro: "vercel: command not found"

**Solução:** O script instala automaticamente, mas se falhar:
```bash
npm install -g vercel
```

### Erro: "Failed to add environment variable"

**Causa:** Variável já existe

**Solução:** O script remove automaticamente variáveis existentes antes de adicionar. Se persistir:
```bash
# Remover manualmente
vercel env rm NOME_DA_VARIAVEL production
vercel env rm NOME_DA_VARIAVEL preview
vercel env rm NOME_DA_VARIAVEL development

# Executar script novamente
./setup-vercel-env.sh
```

### Erro: "Project not found"

**Causa:** Projeto não está linkado

**Solução:**
```bash
# Link manualmente
vercel link

# Executar script novamente
./setup-vercel-env.sh
```

### Erro de autenticação no Supabase após deploy

**Causa:** DATABASE_URL ou SERVICE_ROLE_KEY incorretos

**Solução:**
1. Verifique as credenciais no painel do Supabase
2. Execute o script novamente com as credenciais corretas
3. Faça redeploy: `vercel --prod`

---

## Configuração Manual (Alternativa)

Se preferir configurar manualmente via interface web:

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **Defender**
3. Vá em **Settings** → **Environment Variables**
4. Adicione cada variável:
   - Key: Nome da variável
   - Value: Valor correspondente
   - Environment: Production, Preview, Development
5. Clique em **Save**
6. Faça **Redeploy**

---

## Verificação Pós-Configuração

### 1. Verificar variáveis no Vercel

```bash
vercel env ls
```

### 2. Verificar logs do deploy

```bash
vercel logs
```

Ou acesse: https://vercel.com/dashboard → Seu Projeto → Deployments → Latest

### 3. Testar conexão com Supabase

Acesse sua aplicação em produção e verifique se:
- ✅ Não há erro `ENOTFOUND`
- ✅ Autenticação funciona
- ✅ Queries ao banco funcionam

---

## Comandos Úteis

```bash
# Listar variáveis de ambiente
vercel env ls

# Adicionar variável manualmente
vercel env add NOME_DA_VARIAVEL production

# Remover variável
vercel env rm NOME_DA_VARIAVEL production

# Fazer deploy em produção
vercel --prod

# Ver logs em tempo real
vercel logs --follow

# Ver informações do projeto
vercel inspect
```

---

## Segurança

### ⚠️ Regras Importantes

1. **NUNCA** commite `.env` ou `.env.local` no Git
2. **NUNCA** exponha `SUPABASE_SERVICE_ROLE_KEY` no client-side
3. **NUNCA** exponha `DATABASE_URL` no client-side
4. Use `NEXT_PUBLIC_*` apenas para variáveis públicas
5. Rotacione chaves periodicamente

### Verificar .gitignore

```bash
# Verificar se arquivos de ambiente estão ignorados
cat .gitignore | grep -E '\.env'

# Adicionar se necessário
echo ".env.local" >> .gitignore
echo ".env" >> .gitignore
```

---

## Próximos Passos

Após executar o script com sucesso:

1. ✅ Verificar deploy no Vercel
2. ✅ Testar aplicação em produção
3. ✅ Verificar logs para confirmar conexão
4. ✅ Testar autenticação e queries
5. ✅ Configurar `.env.local` para desenvolvimento local

---

## Suporte

Se encontrar problemas:

1. Verifique o arquivo `SUPABASE_CONFIG.md` para troubleshooting detalhado
2. Consulte os logs do Vercel: `vercel logs`
3. Verifique o status do Supabase: https://status.supabase.com
4. Revise as credenciais no painel do Supabase

---

## Links Úteis

- [Dashboard Vercel](https://vercel.com/dashboard)
- [Dashboard Supabase](https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp)
- [Vercel CLI Docs](https://vercel.com/docs/cli)
- [Supabase Docs](https://supabase.com/docs)
