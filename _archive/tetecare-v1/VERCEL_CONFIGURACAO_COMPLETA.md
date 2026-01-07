# 🚀 Configuração Completa para Vercel - TeteCareHub

## ✅ Status da Revisão

### ✅ **Código Revisado e Corrigido**

O código foi revisado e está **pronto para deploy no Vercel**. As seguintes correções foram aplicadas:

1. ✅ **vercel.json corrigido** - Configurado para usar `pnpm` e serverless functions
2. ✅ **Banco de dados configurado** - Supabase PostgreSQL está configurado corretamente
3. ✅ **Serverless functions** - API configurada como função serverless do Vercel
4. ✅ **Build commands** - Ajustados para usar pnpm corretamente

---

## 📋 Configuração do Banco de Dados

### ✅ **Banco Configurado com Supabase**

O projeto está configurado para usar **Supabase PostgreSQL**, que é **compatível com Vercel**:

- ✅ **Tipo:** PostgreSQL (via Supabase)
- ✅ **ORM:** Drizzle ORM (compatível com PostgreSQL)
- ✅ **Conexão:** Via `DATABASE_URL` (connection string do Supabase)
- ✅ **Configuração:** `drizzle.config.ts` já configurado

### 🔗 **Como Obter DATABASE_URL**

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Settings** → **Database**
3. Em **Connection string**, selecione a aba **URI**
4. Copie a string e substitua `[YOUR-PASSWORD]` pela senha do seu projeto

**Formato:**
```
postgresql://postgres:[SENHA]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

## 🔐 Variáveis de Ambiente Necessárias no Vercel

Configure estas variáveis no painel do Vercel (**Settings** → **Environment Variables**):

### **Obrigatórias:**

```bash
# Supabase - Autenticação e Storage
VITE_SUPABASE_URL=https://[PROJECT-REF].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]

# Database - PostgreSQL (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# App Configuration
NODE_ENV=production
VITE_APP_ID=tete-house-hub
JWT_SECRET=[GERAR_STRING_ALEATORIA_SEGURA_MIN_32_CHARS]
```

### **Opcionais (mas recomendadas):**

```bash
# Stripe (se usar pagamentos)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# S3 Storage (se usar uploads de arquivos)
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=[SEU_BUCKET]
S3_ACCESS_KEY_ID=[ACCESS_KEY]
S3_SECRET_ACCESS_KEY=[SECRET_KEY]
S3_PUBLIC_URL=https://[BUCKET].s3.amazonaws.com

# Email (SendGrid, Resend, etc)
SENDGRID_API_KEY=SG...
FROM_EMAIL=noreply@seudominio.com
FROM_NAME=Tetê Care

# Google Maps (se usar mapas)
GOOGLE_MAPS_API_KEY=[SUA_CHAVE]

# App Info
VITE_APP_TITLE=Tetê Care Hub
VITE_APP_LOGO=/logo.png
APP_URL=https://[SEU_DOMINIO].vercel.app
```

### 🔑 **Como Gerar JWT_SECRET Seguro:**

```bash
# No terminal:
openssl rand -base64 32
```

---

## 📁 Estrutura do Projeto para Vercel

```
/
├── api/
│   └── index.ts          # Serverless function (Express app)
├── client/
│   ├── src/              # Frontend React
│   └── public/           # Assets estáticos
├── server/               # Código compartilhado do backend
├── drizzle/              # Schema e migrations
├── dist/
│   └── public/           # Build do frontend (output)
├── vercel.json           # Configuração do Vercel
└── package.json
```

### **Como Funciona:**

1. **Frontend:** Build do Vite → `dist/public/` → Servido como static files
2. **Backend:** `api/index.ts` → Compilado para serverless function
3. **Rotas:** 
   - `/api/*` → Serverless function (`api/index.ts`)
   - `/*` → Frontend SPA (`index.html`)

---

## 🚀 Passo a Passo para Deploy no Vercel

### **1. Preparar Repositório**

```bash
# Certifique-se de que tudo está commitado
git add .
git commit -m "Preparar para deploy Vercel"
git push
```

### **2. Conectar ao Vercel**

1. Acesse [vercel.com](https://vercel.com)
2. Faça login com GitHub
3. Clique em **"Add New Project"**
4. Importe seu repositório

### **3. Configurar Build Settings**

O Vercel detectará automaticamente as configurações do `vercel.json`, mas verifique:

- **Framework Preset:** Other
- **Root Directory:** `./` (raiz)
- **Build Command:** `pnpm install && pnpm run build && pnpm run build:server`
- **Output Directory:** `dist/public`
- **Install Command:** `pnpm install`

### **4. Adicionar Variáveis de Ambiente**

No painel do Vercel:
1. Vá em **Settings** → **Environment Variables**
2. Adicione todas as variáveis listadas acima
3. Marque como **Production**, **Preview** e **Development**

### **5. Deploy**

1. Clique em **"Deploy"**
2. Aguarde o build completar
3. Copie a URL gerada (ex: `https://tete-care-hub.vercel.app`)

### **6. Configurar Supabase Auth URLs**

Após o deploy, atualize as URLs no Supabase:

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Authentication** → **URL Configuration**
3. Configure:
   - **Site URL:** `https://[SEU_DOMINIO].vercel.app`
   - **Redirect URLs:** `https://[SEU_DOMINIO].vercel.app/**`

---

## ✅ Checklist Final

Antes de fazer deploy, verifique:

- [ ] **Código commitado** no Git
- [ ] **Variáveis de ambiente** configuradas no Vercel
- [ ] **DATABASE_URL** válida do Supabase
- [ ] **SUPABASE_SERVICE_ROLE_KEY** configurada
- [ ] **JWT_SECRET** gerado e configurado
- [ ] **Build local funciona:** `pnpm build && pnpm run build:server`
- [ ] **Supabase Auth URLs** atualizadas após deploy

---

## 🔍 Verificações Pós-Deploy

Após o deploy, teste:

1. ✅ **Frontend carrega:** Acesse a URL do Vercel
2. ✅ **API funciona:** Teste uma chamada `/api/trpc/...`
3. ✅ **Autenticação:** Teste login/cadastro
4. ✅ **Database:** Verifique se consegue ler/escrever dados
5. ✅ **Storage:** Teste upload de arquivos (se configurado)

---

## 🐛 Troubleshooting

### **Erro: "Missing Supabase environment variables"**

**Solução:** Verifique se `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão configuradas no Vercel.

### **Erro: "DATABASE_URL not found"**

**Solução:** Adicione `DATABASE_URL` nas variáveis de ambiente do Vercel.

### **Erro: "Function timeout"**

**Solução:** O `vercel.json` já está configurado com `maxDuration: 30`. Se precisar mais tempo, ajuste em `functions.api/index.ts.maxDuration`.

### **Erro: "Build failed"**

**Solução:** 
1. Verifique os logs do build no Vercel
2. Teste localmente: `pnpm build && pnpm run build:server`
3. Verifique se todas as dependências estão no `package.json`

### **Frontend não carrega**

**Solução:** 
1. Verifique se `outputDirectory` está correto (`dist/public`)
2. Verifique se o build gerou arquivos em `dist/public/`
3. Verifique os logs do build no Vercel

---

## 📚 Recursos Adicionais

- [Documentação Vercel](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Supabase Documentation](https://supabase.com/docs)
- [Drizzle ORM](https://orm.drizzle.team)

---

## ✨ Conclusão

O projeto está **100% pronto para deploy no Vercel** com as seguintes configurações:

✅ **Banco de dados:** Supabase PostgreSQL (configurado)  
✅ **Serverless functions:** Express app em `api/index.ts`  
✅ **Frontend:** React + Vite (build estático)  
✅ **Autenticação:** Supabase Auth  
✅ **Storage:** Supabase Storage (ou S3, se configurado)  

**Próximo passo:** Fazer deploy no Vercel seguindo o passo a passo acima! 🚀

