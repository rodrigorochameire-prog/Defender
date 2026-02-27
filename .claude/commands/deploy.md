# /deploy - Deploy para Produção

> **Tipo**: Workflow de Publicação
> **Trigger**: "deploy", "publica", "manda pra produção", "vercel"

## Contexto do Projeto

| Item | Valor |
|------|-------|
| **Projeto Vercel** | `DEFENSAVEL` |
| **URL Produção** | `https://ombuds.vercel.app` |
| **Alias automático** | `https://defender-gray.vercel.app` |
| **Projeto local (.vercel)** | `prj_e7AmqP2eyhZ4qqDWKpmnk8HkPPB2` |
| **Team** | `team_BszWdly5JzLOjvTzoz0wNXCU` |

> **IMPORTANTE**: O domínio `ombuds.vercel.app` pertence ao projeto DEFENSAVEL.
> Após `vercel --prod`, ambos os aliases são atribuídos automaticamente:
> - `ombuds.vercel.app` (produção)
> - `defender-gray.vercel.app` (alias secundário)
> **NÃO precisa mais de `vercel alias set` manual.**

---

## Processo de Deploy

### 1. Pré-Deploy

```bash
# Build local (obrigatório — não deployar com build quebrado)
npm run build

# Se houver mudanças no schema, aplicar ANTES do deploy
npm run db:push
```

### 2. Commit e Push

```bash
# Commitar mudanças (usar /commit para formato padronizado)
git add <arquivos>
git commit -m "mensagem"
git push origin main
```

### 3. Deploy via CLI

```bash
# Deploy de produção (alias ombuds.vercel.app é automático)
vercel --prod --yes
```

### 4. Verificação Pós-Deploy

```bash
# Testar webhook (endpoint público, sem auth)
curl -s https://ombuds.vercel.app/api/webhooks/plaud | jq .

# Testar página (deve retornar HTML)
curl -s -o /dev/null -w "%{http_code}" https://ombuds.vercel.app/admin
```

Checklist:
- [ ] `ombuds.vercel.app` responde
- [ ] Login funciona
- [ ] Dashboard carrega dados
- [ ] Webhook Plaud acessível

---

## Deploy Rápido (one-liner)

```bash
npm run build && vercel --prod --yes
```

---

## Rollback

### Via CLI

```bash
# Listar deployments recentes
vercel ls

# Promover deployment anterior para produção
vercel promote <deployment-url>

# Re-apontar alias
vercel alias set <deployment-url> ombuds.vercel.app
```

### Via Dashboard

1. Vercel → Projeto DEFENSAVEL → Deployments
2. Encontrar último deploy estável
3. "..." → "Promote to Production"
4. Executar `vercel alias set <url> ombuds.vercel.app` localmente

---

## Variáveis de Ambiente

```bash
# Listar variáveis configuradas
vercel env ls

# Adicionar nova variável
vercel env add NOME_VARIAVEL

# Variáveis obrigatórias
# DATABASE_URL, SESSION_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
# GOOGLE_AI_API_KEY, PLAUD_WEBHOOK_SECRET (opcional)
```

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Build falha no Vercel | `npm run build` local, corrigir erros TS |
| `ombuds.vercel.app` mostra versão antiga | `vercel alias set <new-deploy> ombuds.vercel.app` |
| Erro de banco em produção | Verificar `DATABASE_URL` em `vercel env ls` |
| Webhook Plaud retorna 500 | Verificar `vercel logs <deploy-url>` |
| Variável não encontrada | `vercel env add NOME` → selecionar Production |

```bash
# Logs de produção (streaming)
vercel logs <deployment-url>

# Logs filtrados por erro
vercel logs <deployment-url> 2>&1 | grep -i error
```
