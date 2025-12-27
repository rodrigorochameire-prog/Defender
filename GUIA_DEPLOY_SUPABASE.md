# 🚀 Guia de Deploy - TeteCareHub com Supabase

## ✅ O Que Já Está Configurado

- ✅ **Supabase Database:** Configurado e migrado
- ✅ **Supabase Auth:** Configurado (email/password)
- ✅ **Supabase Storage:** Buckets criados com RLS
- ✅ **Políticas RLS:** Configuradas e funcionando
- ✅ **Variáveis de ambiente:** `.env.local` criado

---

## 📋 Checklist Antes do Deploy

### 1. Verificar Configurações do Supabase

- [ ] **Auth Settings:**
  - Site URL configurada (ex: `https://seu-dominio.com`)
  - Redirect URLs configuradas (ex: `https://seu-dominio.com/**`)
  - Email provider habilitado
  - Email confirmation desabilitada (para desenvolvimento) ou SMTP configurado (para produção)

- [ ] **Storage Buckets:**
  - Todos os buckets criados (pets, documents, tutors, etc.)
  - RLS policies aplicadas
  - CORS configurado (se necessário)

- [ ] **Database:**
  - Todas as tabelas criadas
  - Migrations aplicadas
  - Primeiro admin criado

---

## 🌐 Opções de Deploy

### Opção 1: Vercel (Recomendado para Frontend + API Routes)

**Vantagens:**
- ✅ Deploy automático via Git
- ✅ CDN global
- ✅ SSL automático
- ✅ Plano gratuito disponível
- ✅ Integração fácil com Supabase

**Passos:**

1. **Criar conta no Vercel:**
   - Acesse https://vercel.com
   - Faça login com GitHub

2. **Importar projeto:**
   - Clique em "Add New..." → "Project"
   - Conecte seu repositório do GitHub
   - Selecione o repositório `TeteCareHub`

3. **Configurar Build:**
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (raiz do projeto)
   - **Build Command:** `npm run build` ou `pnpm build`
   - **Output Directory:** `dist/public`
   - **Install Command:** `npm install` ou `pnpm install`

4. **Configurar Environment Variables:**
   
   Adicione todas as variáveis do `.env.local`:
   
   ```bash
   # Supabase
   VITE_SUPABASE_URL=https://siwapjqndevuwsluncnr.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   # Database
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.siwapjqndevuwsluncnr.supabase.co:5432/postgres
   
   # App
   NODE_ENV=production
   VITE_APP_ID=tete-house-hub
   JWT_SECRET=qualquer_string_aleatoria_aqui
   PORT=3000
   ```

5. **Ajustar para Vercel:**
   
   O Vercel funciona melhor com serverless functions. Você pode precisar adaptar:
   
   - Se usar API routes do Vercel, crie `api/` folder
   - Ou use Vercel para frontend e Railway/Render para backend

6. **Deploy:**
   - Clique em "Deploy"
   - Aguarde o build
   - Copie a URL gerada (ex: `https://tete-care-hub.vercel.app`)

7. **Atualizar Supabase Auth:**
   - No Supabase Dashboard → Authentication → URL Configuration
   - **Site URL:** `https://tete-care-hub.vercel.app`
   - **Redirect URLs:** `https://tete-care-hub.vercel.app/**`

**Custo:** Grátis (hobby) ou $20/mês (pro)

---

### Opção 2: Railway (Recomendado para Full-Stack)

**Vantagens:**
- ✅ Deploy automático via Git
- ✅ Suporta aplicações full-stack
- ✅ Fácil configuração
- ✅ Integração com Supabase

**Passos:**

1. **Criar conta no Railway:**
   - Acesse https://railway.app
   - Faça login com GitHub

2. **Criar novo projeto:**
   - Clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Conecte seu repositório

3. **Configurar serviço:**
   - Railway detectará automaticamente o projeto
   - Configure:
     - **Build Command:** `pnpm install && pnpm build`
     - **Start Command:** `pnpm start`

4. **Configurar Environment Variables:**
   - Vá em "Variables"
   - Adicione todas as variáveis do `.env.local`

5. **Configurar domínio (opcional):**
   - Vá em "Settings" → "Domains"
   - Adicione seu domínio customizado

6. **Deploy:**
   - Railway fará deploy automático
   - Copie a URL gerada

7. **Atualizar Supabase Auth:**
   - No Supabase Dashboard → Authentication → URL Configuration
   - **Site URL:** URL do Railway
   - **Redirect URLs:** `URL_DO_RAILWAY/**`

**Custo:** ~$5-10/mês

---

### Opção 3: Render

**Vantagens:**
- ✅ Plano gratuito disponível
- ✅ SSL automático
- ✅ Deploy automático

**Passos:**

1. **Criar conta no Render:**
   - Acesse https://render.com
   - Faça login com GitHub

2. **Criar Web Service:**
   - Clique em "New" → "Web Service"
   - Conecte seu repositório
   - Configure:
     - **Name:** `tete-care-hub`
     - **Region:** `Oregon` (ou mais próximo)
     - **Branch:** `main`
     - **Root Directory:** `./`
     - **Environment:** `Node`
     - **Build Command:** `pnpm install && pnpm build`
     - **Start Command:** `pnpm start`

3. **Configurar Environment Variables:**
   - Vá em "Environment"
   - Adicione todas as variáveis do `.env.local`

4. **Deploy:**
   - Clique em "Create Web Service"
   - Aguarde o deploy

5. **Atualizar Supabase Auth:**
   - No Supabase Dashboard → Authentication → URL Configuration
   - **Site URL:** URL do Render
   - **Redirect URLs:** `URL_DO_RENDER/**`

**Custo:** Grátis (com limitações) ou $7/mês

---

## 🔧 Configurações Finais no Supabase

### 1. Atualizar Auth URLs

Após fazer o deploy, atualize no Supabase Dashboard:

**Authentication → URL Configuration:**
- **Site URL:** URL do seu deploy (ex: `https://tete-care-hub.vercel.app`)
- **Redirect URLs:** `https://tete-care-hub.vercel.app/**`

### 2. Configurar Email (Produção)

Para produção, configure SMTP no Supabase:

**Authentication → Email Templates:**
- Configure provedor SMTP (SendGrid, AWS SES, etc.)
- Ou use o SMTP do Supabase (com limites)

### 3. Verificar Storage CORS

Se precisar de uploads diretos do frontend:

**Storage → Settings → CORS:**
- Adicione sua URL de produção
- Configure métodos permitidos (GET, POST, PUT, DELETE)

---

## 🧪 Testar Após Deploy

1. **Testar Autenticação:**
   - [ ] Criar conta nova
   - [ ] Fazer login
   - [ ] Verificar se o usuário é criado no Supabase

2. **Testar Uploads:**
   - [ ] Fazer upload de foto de pet
   - [ ] Verificar se aparece no bucket `pets`
   - [ ] Verificar se o tutor consegue acessar

3. **Testar RLS:**
   - [ ] Criar pet e associar tutor
   - [ ] Fazer upload de arquivo
   - [ ] Verificar se apenas o tutor consegue acessar
   - [ ] Verificar se outro tutor não consegue acessar

4. **Testar Funcionalidades:**
   - [ ] CRUD de pets
   - [ ] Sistema de créditos
   - [ ] Agenda/calendário
   - [ ] Notificações

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"

**Solução:**
- Verifique se `DATABASE_URL` está correta
- Verifique se o Supabase permite conexões externas
- Verifique se a senha está correta

### Erro: "Auth error: Invalid JWT"

**Solução:**
- Verifique se `VITE_SUPABASE_ANON_KEY` está correta
- Verifique se `SUPABASE_SERVICE_ROLE_KEY` está correta
- Recopiar as chaves do Supabase Dashboard

### Erro: "Storage upload failed"

**Solução:**
- Verifique se os buckets existem
- Verifique se as políticas RLS estão corretas
- Verifique se o CORS está configurado

### Erro: "Build failed"

**Solução:**
- Verifique se todas as dependências estão no `package.json`
- Verifique se o Node.js version está correto (22.x)
- Verifique os logs de build na plataforma

---

## 📝 Checklist Final de Deploy

- [ ] Código no GitHub
- [ ] Supabase configurado (Database, Auth, Storage)
- [ ] Variáveis de ambiente configuradas na plataforma
- [ ] Build executando sem erros
- [ ] Deploy concluído
- [ ] URLs do Supabase Auth atualizadas
- [ ] Testes básicos realizados
- [ ] Domínio customizado configurado (opcional)
- [ ] SSL/HTTPS funcionando
- [ ] Monitoramento configurado (opcional)

---

## 🎯 Próximos Passos Após Deploy

1. **Configurar domínio customizado** (opcional)
2. **Configurar backups automáticos** no Supabase
3. **Configurar monitoring** (Sentry, LogRocket)
4. **Configurar analytics** (Google Analytics, Plausible)
5. **Otimizar performance** (CDN, cache, etc.)

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs na plataforma de deploy
2. Verifique os logs no Supabase Dashboard
3. Consulte a documentação do Supabase
4. Teste localmente primeiro

---

**🚀 Boa sorte com o deploy!**


