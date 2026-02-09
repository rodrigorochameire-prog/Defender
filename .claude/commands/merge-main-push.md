# /merge-main-push - Merge para Main e Deploy

> **Tipo**: Workflow de Publicação
> **Trigger**: "merge main and push", "merge e push", "publica no main", "deploy produção"

## Descrição

Esta skill faz o merge da branch atual para `main` e realiza o deploy para produção no domínio **ombuds.vercel.app**.

---

## Contexto do Projeto

| Item | Valor |
|------|-------|
| **Repositório Principal** | `/Users/rodrigorochameire/Projetos/Defender` |
| **Projeto Vercel** | `defensavel` |
| **Domínio de Produção** | `ombuds.vercel.app` |
| **Branch de Produção** | `main` |

> **Nota**: O worktree `cranky-liskov` tem seu próprio projeto Vercel (`cranky-liskov`), mas o deploy de produção deve ir para o projeto `defensavel`.

---

## Fluxo de Execução

### 1. Verificações Pré-Merge

```bash
# Verificar status da branch atual
git status

# Verificar se há mudanças não commitadas
git diff --stat

# Build local deve passar
npm run build
```

### 2. Commit Pendências (se houver)

Se houver mudanças não commitadas:

```bash
# Adicionar arquivos
git add -A

# Commit com mensagem descritiva
git commit -m "feat: descrição das mudanças"
```

### 3. Atualizar Main Local

```bash
# Buscar atualizações do remoto
git fetch origin main

# Verificar se main está atualizada
git log --oneline main..origin/main
```

### 4. Merge para Main

```bash
# Ir para main
git checkout main

# Fazer pull das atualizações
git pull origin main

# Merge da branch de trabalho
git merge <branch-atual> --no-edit

# Push para origin
git push origin main
```

### 5. Voltar para Branch de Trabalho

```bash
# Retornar à branch anterior
git checkout <branch-anterior>
```

---

## Deploy Automático

Após o push para `main`, a Vercel detecta automaticamente e faz deploy para:

- **URL de Produção**: https://ombuds.vercel.app
- **Projeto Vercel**: `defensavel`

---

## Verificação Pós-Deploy

### Checklist

- [ ] Build passou na Vercel
- [ ] Site acessível em https://ombuds.vercel.app
- [ ] Funcionalidades principais funcionando
- [ ] Sem erros no console do browser

### Comandos de Verificação

```bash
# Ver status do deploy (no diretório principal)
cd /Users/rodrigorochameire/Projetos/Defender && vercel ls

# Ver logs de produção
vercel logs --prod

# Abrir site
open https://ombuds.vercel.app
```

---

## Troubleshooting

### Conflitos de Merge

```bash
# Se houver conflitos
git status  # Ver arquivos em conflito

# Resolver manualmente e depois
git add <arquivos-resolvidos>
git commit -m "fix: resolve merge conflicts"
git push origin main
```

### Build Falha na Vercel

1. Verificar logs na dashboard da Vercel
2. Rodar `npm run build` localmente para reproduzir
3. Corrigir erros e fazer novo push

### Variáveis de Ambiente

As variáveis devem estar configuradas no projeto `defensavel` da Vercel:

```bash
# Listar variáveis (no diretório principal)
cd /Users/rodrigorochameire/Projetos/Defender && vercel env ls

# Adicionar variável se necessário
vercel env add NOME_VARIAVEL
```

---

## Resumo dos Comandos

```bash
# Fluxo completo
git status
npm run build
git checkout main
git pull origin main
git merge <branch> --no-edit
git push origin main
git checkout <branch>

# Verificar deploy
open https://ombuds.vercel.app
```
