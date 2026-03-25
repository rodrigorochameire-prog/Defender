# Runbook: Rotacao de Credenciais

## Quando executar

- Suspeita de vazamento de credenciais
- Rotacao periodica (recomendado: a cada 90 dias)
- Offboarding de colaborador com acesso ao repo

## 1. Rotacionar Senha do Banco (Supabase)

1. Acessar [Supabase Dashboard](https://supabase.com/dashboard) > Project Settings > Database
2. Clicar em "Reset database password"
3. Gerar senha forte (32+ caracteres, alfanumerica + especiais)
4. Salvar a nova senha em local seguro (gerenciador de senhas)
5. Atualizar `DATABASE_URL` no Vercel:
   ```
   vercel env rm DATABASE_URL production
   vercel env add DATABASE_URL production
   ```
   Formato: `postgresql://postgres.[project-ref]:[NOVA_SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
6. Atualizar `DATABASE_URL` no Railway (enrichment engine):
   - Railway Dashboard > Project > Variables
7. Fazer redeploy de ambos os servicos:
   ```
   vercel --prod
   ```
8. Verificar que a aplicacao conecta normalmente (acessar /admin/dashboard)

## 2. Rotacionar Anon Key / Service Role Key (Supabase)

Supabase nao permite rotacao direta de keys. Se comprometidas:

1. Criar novo projeto Supabase
2. Migrar schema e dados
3. Atualizar todas as env vars

Para prevenir exposicao:
- Nunca commitar keys no repositorio
- Usar apenas `process.env` para acessar credentials
- Verificar que `.env*` esta no `.gitignore`

## 3. Rotacionar API Keys de Servicos Externos

| Servico | Onde rotacionar | Env var |
|---------|----------------|---------|
| OpenAI | platform.openai.com/api-keys | `OPENAI_API_KEY` |
| Anthropic | console.anthropic.com | `ANTHROPIC_API_KEY` |
| Google | console.cloud.google.com | `GOOGLE_CLIENT_SECRET` |
| Enrichment | Gerar novo UUID | `ENRICHMENT_API_KEY` (Vercel + Railway) |
| Stripe | dashboard.stripe.com/apikeys | `STRIPE_SECRET_KEY` |
| Evolution | Painel Evolution | `EVOLUTION_API_KEY` |

Para cada key:
1. Gerar nova key no painel do servico
2. Atualizar no Vercel: `vercel env rm VAR production && vercel env add VAR production`
3. Atualizar no Railway se aplicavel
4. Redeploy
5. Revogar a key antiga no painel do servico

## 4. Limpar Historico Git (se credenciais foram commitadas)

```bash
# Instalar BFG Repo-Cleaner
brew install bfg

# Criar arquivo com senhas a remover
echo "SENHA_ANTIGA" > /tmp/passwords.txt

# Executar BFG
bfg --replace-text /tmp/passwords.txt

# Limpar e force push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force

# Limpar arquivo temporario
rm /tmp/passwords.txt
```

**IMPORTANTE:** Apos force push, todos os colaboradores precisam re-clonar o repositorio.

## 5. Verificacao pos-rotacao

- [ ] Aplicacao Next.js funciona (login, dashboard, CRUD)
- [ ] Enrichment engine responde (health check)
- [ ] WhatsApp webhook funciona
- [ ] Drive sync funciona
- [ ] Cron jobs executam (radar, noticias)
- [ ] Nenhuma credencial em plaintext no repo: `grep -r "SENHA" . --include="*.ts" --include="*.sh" --include="*.md"`
