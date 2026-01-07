# 🚀 Como Configurar Deploy Automático no Vercel

## Por que o build não está sendo automático?

O Vercel pode não estar fazendo deploy automático por várias razões:

### 1. **Deploy Automático Desabilitado**

**Como verificar:**
1. Acesse https://vercel.com
2. Vá no seu projeto
3. Clique em **Settings** → **Git**
4. Verifique se **"Auto Deploy"** está habilitado

**Como corrigir:**
- Se estiver desabilitado, habilite a opção **"Auto Deploy"**
- Salve as alterações

---

### 2. **Branch de Produção Incorreta**

**Como verificar:**
1. No Vercel: **Settings** → **Git** → **Production Branch**
2. Verifique qual branch está configurada

**Como corrigir:**
- Configure para `main` (ou a branch que você usa para produção)
- Salve as alterações

---

### 3. **Webhook do GitHub Não Configurado**

**Como verificar:**
1. No GitHub: Vá em **Settings** → **Webhooks**
2. Verifique se há um webhook do Vercel ativo
3. Verifique se os eventos estão sendo entregues

**Como corrigir:**
1. No Vercel: **Settings** → **Git**
2. Clique em **"Disconnect"** e depois **"Connect Git Repository"**
3. Reconecte o repositório `TeteCareHub`
4. Isso criará/atualizará o webhook automaticamente

---

### 4. **Projeto Não Conectado ao Repositório**

**Como verificar:**
1. No Vercel: **Settings** → **Git**
2. Verifique se o repositório está conectado

**Como corrigir:**
1. Se não estiver conectado, clique em **"Connect Git Repository"**
2. Selecione o repositório `rodrigorochameire-prog/TeteCareHub`
3. Configure:
   - **Production Branch:** `main`
   - **Auto Deploy:** Habilitado
   - **Root Directory:** `./` (raiz do projeto)

---

### 5. **Configurações de Build Incorretas**

**Verifique no Vercel:**
- **Settings** → **General** → **Build & Development Settings**
- **Build Command:** `pnpm run build && pnpm run build:server`
- **Output Directory:** `dist/public`
- **Install Command:** `bash scripts/pre-build.sh && pnpm install`
- **Framework Preset:** Vite (ou deixe em "Other")

---

## ✅ Checklist de Verificação

- [ ] Repositório conectado no Vercel
- [ ] Auto Deploy habilitado
- [ ] Production Branch configurada para `main`
- [ ] Webhook do GitHub ativo e funcionando
- [ ] Build Command correto no Vercel
- [ ] Output Directory correto (`dist/public`)
- [ ] Framework especificado como `vite` no `vercel.json`

---

## 🔧 Como Forçar um Deploy Manual

Se precisar fazer deploy manual enquanto corrige o automático:

1. No Vercel: Vá em **Deployments**
2. Clique nos três pontos (⋯) no último deployment
3. Selecione **"Redeploy"**
4. Ou clique em **"Create Deployment"** → selecione a branch `main`

---

## 📝 Notas Importantes

- O Vercel faz deploy automático apenas quando você faz **push** para a branch de produção (`main`)
- Deploys de outras branches (como `fix/vercel-static-files`) não disparam deploy automático na produção
- Para testar outras branches, você pode criar um **Preview Deployment** manualmente

---

## 🆘 Se Nada Funcionar

1. **Desconecte e reconecte o repositório:**
   - Vercel → Settings → Git → Disconnect
   - Depois Connect Git Repository novamente

2. **Verifique os logs do webhook no GitHub:**
   - GitHub → Settings → Webhooks
   - Clique no webhook do Vercel
   - Veja os "Recent Deliveries" para verificar se há erros

3. **Entre em contato com o suporte do Vercel:**
   - https://vercel.com/support

