# /deploy - Deploy para Produção

> **Tipo**: Workflow de Publicação
> **Trigger**: "deploy", "publica", "manda pra produção", "vercel"

## Descrição

Publicar alterações na Vercel com verificações de segurança.

---

## Pré-Deploy Checklist

### 1. Código Pronto

```bash
# Build local passa
npm run build

# Sem erros de lint
npm run lint

# Testes passam
npm test
```

### 2. Variáveis de Ambiente

Verificar se existem na Vercel:

| Variável | Onde |
|----------|------|
| `DATABASE_URL` | Vercel → Settings → Environment |
| `NEXTAUTH_SECRET` | Vercel → Settings → Environment |
| `NEXTAUTH_URL` | Vercel → Settings → Environment |
| `GOOGLE_CLIENT_ID` | Vercel → Settings → Environment |
| `GOOGLE_CLIENT_SECRET` | Vercel → Settings → Environment |
| `GEMINI_API_KEY` | Vercel → Settings → Environment |

### 3. Migrations

```bash
# Se houver mudanças no schema
npm run db:generate
npm run db:push  # Aplicar em produção antes do deploy
```

---

## Processo de Deploy

### Deploy Automático (via Git)

```bash
# Push para branch principal
git push origin main

# Vercel detecta e faz deploy automaticamente
```

### Deploy Manual (via CLI)

```bash
# Instalar Vercel CLI se necessário
npm i -g vercel

# Deploy de preview
vercel

# Deploy de produção
vercel --prod
```

### Verificar Status

```bash
# Via CLI
vercel ls

# Ou acessar
# https://vercel.com/[seu-usuario]/defender
```

---

## Após Deploy

### 1. Verificar Build na Vercel

- Acessar dashboard da Vercel
- Verificar logs do build
- Confirmar status "Ready"

### 2. Testar em Produção

```bash
# Abrir URL de produção
open https://seu-dominio.vercel.app/admin
```

Verificar:
- [ ] Página carrega
- [ ] Login funciona
- [ ] Dados aparecem
- [ ] Funcionalidades principais OK

### 3. Monitorar

- Verificar logs de erro na Vercel
- Checar métricas de performance
- Observar primeiros acessos

---

## Rollback

Se algo der errado:

### Via Dashboard

1. Acessar Vercel → Deployments
2. Encontrar último deploy estável
3. Clicar "..." → "Promote to Production"

### Via CLI

```bash
# Listar deployments
vercel ls

# Promover deployment específico
vercel promote [deployment-url]
```

---

## Deploy de Branches

### Preview (Branches não-main)

```bash
# Push para qualquer branch
git push origin feature/nova-funcionalidade

# Vercel cria URL de preview automaticamente
# https://defender-[hash]-[usuario].vercel.app
```

### Produção (Branch main)

```bash
# Merge para main
git checkout main
git merge feature/nova-funcionalidade
git push origin main

# Deploy automático para produção
```

---

## Troubleshooting

### Build Falha

```bash
# Ver logs detalhados na Vercel
# Ou testar localmente
npm run build 2>&1 | tee build.log
```

**Causas comuns:**
- Variável de ambiente faltando
- Dependência não instalada
- Erro de TypeScript ignorado localmente

### Página em Branco

- Verificar console do browser
- Checar logs da Vercel (Functions)
- Verificar variáveis de ambiente

### Erro de Banco

```bash
# Verificar conexão
# Acessar Supabase → Database → Connection Pooler

# Verificar se migration foi aplicada
npm run db:studio
```

---

## Comandos Úteis

```bash
# Status do projeto
vercel ls

# Logs de produção
vercel logs

# Variáveis de ambiente
vercel env ls

# Adicionar variável
vercel env add NOME_VARIAVEL

# Remover deployment
vercel remove [url]
```

---

## Segurança no Deploy

### Antes de Publicar

- [ ] Sem `console.log` com dados sensíveis
- [ ] Sem credenciais hardcoded
- [ ] Variáveis de ambiente configuradas
- [ ] Rotas protegidas por autenticação

### Verificação Rápida

```bash
# Buscar possíveis vazamentos
grep -rn "password\|secret\|key" src/ --include="*.ts" --include="*.tsx" | grep -v ".env"
```
