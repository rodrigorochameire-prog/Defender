# 🚀 Instruções para Configurar Vercel via CLI

## Opção 1: Promover Deployment Mais Recente (Recomendado)

### Passo 1: Instalar Vercel CLI (se ainda não tiver)

```bash
npm install -g vercel
```

### Passo 2: Fazer Login

```bash
vercel login
```

Isso abrirá o navegador para você autorizar.

### Passo 3: Listar Deployments

```bash
vercel ls --limit=10
```

Isso mostrará os deployments recentes. Procure pelo commit mais recente (`4c40cbb` ou `0419184`).

### Passo 4: Promover para Produção

```bash
vercel promote <deployment-url>
```

Substitua `<deployment-url>` pela URL do deployment que você quer promover.

---

## Opção 2: Criar Novo Deployment da Branch Main

```bash
# Navegue até o diretório do projeto
cd /Users/rodrigorochameire/.cursor/worktrees/TeteCareHub/bws

# Faça login (se ainda não fez)
vercel login

# Crie um novo deployment de produção
vercel --prod
```

Isso criará um novo deployment da branch `main` e promoverá para produção automaticamente.

---

## Opção 3: Usar o Script Automatizado

```bash
# Execute o script
bash scripts/vercel-promote-deployment.sh
```

O script verificará se você está autenticado e listará os deployments disponíveis.

---

## 🔍 Verificar Status Atual

```bash
# Ver deployments recentes
vercel ls

# Ver informações do projeto
vercel inspect

# Ver logs do último deployment
vercel logs
```

---

## ⚙️ Configurar Auto Deploy (via Dashboard)

Infelizmente, a configuração de Auto Deploy precisa ser feita via dashboard:

1. Acesse https://vercel.com
2. Faça login
3. Vá no seu projeto
4. **Settings** → **Git**
5. Verifique:
   - ✅ **Auto Deploy** está habilitado
   - ✅ **Production Branch** é `main`
6. Salve as alterações

---

## 🎯 Resultado Esperado

Após promover ou criar o deployment:
- ✅ Site usando commit mais recente (`4c40cbb`)
- ✅ Status: "Ready" (não mais "Stale")
- ✅ Site funcionando corretamente

