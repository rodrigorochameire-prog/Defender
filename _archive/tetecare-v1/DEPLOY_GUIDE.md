# 🚀 Guia de Deploy - TucoCare Pro

Este guia fornece instruções completas para fazer deploy do TucoCare Pro em plataformas externas.

## 📋 Pré-requisitos

Antes de fazer o deploy, você precisará:

1. **Banco de Dados MySQL/TiDB**
   - Pode usar: PlanetScale, Railway, AWS RDS, ou qualquer MySQL compatível
   - Versão mínima: MySQL 8.0

2. **Bucket S3 (para armazenamento de arquivos)**
   - AWS S3, DigitalOcean Spaces, ou compatível
   - Configurar CORS para permitir uploads do frontend

3. **Serviço de Email (opcional, mas recomendado)**
   - SendGrid, AWS SES, Mailgun, ou similar
   - Para recuperação de senha e verificação de email

4. **Stripe Account (para pagamentos)**
   - Criar conta em https://stripe.com
   - Obter chaves API (test e production)

---

## 🔐 Variáveis de Ambiente Obrigatórias

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```bash
# ==================== DATABASE ====================
DATABASE_URL="mysql://user:password@host:3306/database"

# ==================== JWT & AUTH ====================
JWT_SECRET="seu-secret-super-seguro-aqui-min-32-caracteres"
# Gere com: openssl rand -base64 32

# ==================== OAUTH (Manus) ====================
# Se não usar Manus OAuth, você precisará implementar auth alternativo
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://login.manus.im"
VITE_APP_ID="seu-app-id"
OWNER_OPEN_ID="seu-owner-id"
OWNER_NAME="Seu Nome"

# ==================== S3 STORAGE ====================
S3_ENDPOINT="https://s3.amazonaws.com"
S3_REGION="us-east-1"
S3_BUCKET="seu-bucket-name"
S3_ACCESS_KEY_ID="sua-access-key"
S3_SECRET_ACCESS_KEY="sua-secret-key"
S3_PUBLIC_URL="https://seu-bucket.s3.amazonaws.com"

# ==================== STRIPE ====================
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# ==================== EMAIL (SendGrid exemplo) ====================
SENDGRID_API_KEY="SG...."
FROM_EMAIL="noreply@seudominio.com"
FROM_NAME="TucoCare"

# ==================== APP CONFIG ====================
VITE_APP_TITLE="TucoCare Pro"
VITE_APP_LOGO="/logo.png"
NODE_ENV="production"
PORT="3000"

# ==================== ANALYTICS (opcional) ====================
VITE_ANALYTICS_WEBSITE_ID="seu-analytics-id"
VITE_ANALYTICS_ENDPOINT="https://analytics.seudominio.com"
```

---

## 🏗️ Plataformas de Deploy Recomendadas

### 1️⃣ **Railway** (Recomendado - Mais Fácil)

**Vantagens:**
- Deploy automático via Git
- Banco de dados MySQL integrado
- Suporte a monorepo
- Fácil configuração

**Passos:**

1. Crie conta em https://railway.app
2. Clique em "New Project" → "Deploy from GitHub repo"
3. Conecte seu repositório
4. Adicione um serviço MySQL:
   - Clique em "+ New" → "Database" → "Add MySQL"
   - Copie a `DATABASE_URL` gerada
5. Configure variáveis de ambiente:
   - Vá em "Variables" e adicione todas as variáveis do `.env`
6. Configure o build:
   ```json
   {
     "build": "pnpm install && pnpm build",
     "start": "pnpm start"
   }
   ```
7. Deploy será automático!

**Custo estimado:** ~$5-10/mês

---

### 2️⃣ **Render**

**Vantagens:**
- Plano gratuito disponível
- Banco de dados PostgreSQL grátis (mas precisa adaptar para MySQL)
- SSL automático

**Passos:**

1. Crie conta em https://render.com
2. Crie um "Web Service":
   - Connect repository
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start`
3. Adicione banco MySQL externo (PlanetScale recomendado)
4. Configure variáveis de ambiente na aba "Environment"
5. Deploy!

**Custo estimado:** Grátis (com limitações) ou $7/mês

---

### 3️⃣ **Vercel + PlanetScale**

**Vantagens:**
- Melhor performance para frontend
- CDN global
- Serverless

**Limitações:**
- Requer adaptação para serverless functions
- Conexões de banco limitadas

**Passos:**

1. **PlanetScale (Banco de Dados):**
   - Crie conta em https://planetscale.com
   - Crie novo database
   - Copie connection string

2. **Vercel:**
   - Instale CLI: `npm i -g vercel`
   - Na raiz do projeto: `vercel`
   - Configure variáveis de ambiente
   - Deploy: `vercel --prod`

**Nota:** Vercel é melhor para apps serverless. Este projeto foi feito para servidor tradicional, então Railway/Render são mais adequados.

**Custo estimado:** Grátis (hobby) ou $20/mês (pro)

---

### 4️⃣ **VPS (DigitalOcean, Linode, AWS EC2)**

**Vantagens:**
- Controle total
- Melhor custo-benefício em escala
- Sem limitações

**Desvantagens:**
- Requer conhecimento de DevOps
- Você gerencia tudo (segurança, updates, backups)

**Passos:**

1. Crie um droplet/instância Ubuntu 22.04
2. SSH no servidor:
   ```bash
   ssh root@seu-ip
   ```

3. Instale dependências:
   ```bash
   # Node.js 22
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # pnpm
   npm install -g pnpm
   
   # PM2 (process manager)
   npm install -g pm2
   
   # MySQL
   sudo apt-get install mysql-server
   ```

4. Clone o projeto:
   ```bash
   git clone seu-repositorio.git
   cd tucocare-pro
   ```

5. Configure `.env`:
   ```bash
   nano .env
   # Cole as variáveis de ambiente
   ```

6. Instale e build:
   ```bash
   pnpm install
   pnpm db:migrate  # Cria tabelas no banco (USE ESTE, NÃO db:push!)
   pnpm build
   ```

7. Inicie com PM2:
   ```bash
   pm2 start npm --name "tucocare" -- start
   pm2 save
   pm2 startup
   ```

8. Configure Nginx como reverse proxy:
   ```bash
   sudo apt-get install nginx
   sudo nano /etc/nginx/sites-available/tucocare
   ```
   
   ```nginx
   server {
       listen 80;
       server_name seudominio.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   ```bash
   sudo ln -s /etc/nginx/sites-available/tucocare /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

9. Configure SSL com Certbot:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d seudominio.com
   ```

**Custo estimado:** $5-20/mês dependendo do tamanho

---

## 🗄️ Configuração do Banco de Dados

### Opção 1: PlanetScale (Recomendado)

1. Crie conta em https://planetscale.com
2. Crie novo database
3. Copie a connection string
4. No projeto, rode:
   ```bash
   pnpm db:migrate
   ```

### Opção 2: Railway MySQL

1. No Railway, adicione MySQL
2. Copie `DATABASE_URL`
3. Configure no `.env`
4. Rode migrations

### Opção 3: AWS RDS

1. Crie instância MySQL no RDS
2. Configure security groups
3. Copie endpoint
4. Configure `DATABASE_URL`

---

## 📦 Configuração do S3

### AWS S3

1. Crie bucket no S3
2. Configure CORS:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```
3. Crie IAM user com permissões S3
4. Copie Access Key e Secret Key

### DigitalOcean Spaces

1. Crie Space
2. Gere API keys
3. Configure endpoint: `https://nyc3.digitaloceanspaces.com`

---

## 📧 Configuração de Email

### SendGrid

1. Crie conta em https://sendgrid.com
2. Crie API Key
3. Verifique domínio remetente
4. Configure no `.env`:
   ```bash
   SENDGRID_API_KEY="SG...."
   FROM_EMAIL="noreply@seudominio.com"
   ```

### AWS SES

1. Configure SES no AWS Console
2. Verifique domínio
3. Crie SMTP credentials
4. Configure no código

---

## 💳 Configuração do Stripe

1. Crie conta em https://stripe.com
2. Obtenha API keys em Dashboard → Developers → API keys
3. Configure webhook:
   - URL: `https://seudominio.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`
4. Copie webhook secret

---

## 🔧 Adaptações Necessárias

### 1. Remover dependências do Manus

Se não usar Manus OAuth, você precisará:

**a) Implementar autenticação própria:**

Edite `server/_core/oauth.ts` para usar Passport.js ou similar:

```typescript
// Exemplo com Passport Google OAuth
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "/api/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    // Criar/atualizar usuário no banco
    return cb(null, profile);
  }
));
```

**b) Remover notifyOwner:**

Substitua chamadas de `notifyOwner()` por envio de email real:

```typescript
// Antes
await notifyOwner({ title: "...", content: "..." });

// Depois
await sendEmail({
  to: process.env.ADMIN_EMAIL,
  subject: "...",
  html: "..."
});
```

### 2. Implementar envio de email real

Crie `server/email.ts`:

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  await sgMail.send({
    from: process.env.FROM_EMAIL!,
    ...options
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
  
  await sendEmail({
    to: email,
    subject: 'Recuperação de Senha - TucoCare',
    html: `
      <h1>Recuperação de Senha</h1>
      <p>Clique no link abaixo para redefinir sua senha:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Este link expira em 1 hora.</p>
    `
  });
}
```

Depois, atualize `server/emailAuth.ts`:

```typescript
// Substitua notifyOwner por:
await sendPasswordResetEmail(user.email, token);
```

### 3. Configurar domínio customizado

1. Aponte DNS para seu servidor:
   ```
   A record: @ → IP-do-servidor
   A record: www → IP-do-servidor
   ```

2. Configure SSL (Certbot ou CloudFlare)

---

## 🧪 Testando Localmente Antes do Deploy

1. Configure `.env` local
2. Rode migrations:
   ```bash
   pnpm db:push
   ```
3. Inicie dev server:
   ```bash
   pnpm dev
   ```
4. Teste todas as funcionalidades:
   - [ ] Login/Registro
   - [ ] Recuperação de senha
   - [ ] CRUD de pets
   - [ ] Upload de fotos
   - [ ] Pagamentos Stripe
   - [ ] Notificações

---

## 📝 Checklist de Deploy

- [ ] Banco de dados configurado e migrations rodadas
- [ ] Todas as variáveis de ambiente configuradas
- [ ] S3 bucket criado e CORS configurado
- [ ] Stripe configurado com webhooks
- [ ] Email service configurado
- [ ] Build rodando sem erros (`pnpm build`)
- [ ] Testes passando (`pnpm test`)
- [ ] SSL/HTTPS configurado
- [ ] Domínio apontando corretamente
- [ ] Backups do banco configurados
- [ ] Monitoring configurado (opcional: Sentry, LogRocket)

---

## 🆘 Troubleshooting

### Erro: "Cannot connect to database"
- Verifique `DATABASE_URL`
- Confirme que o banco está acessível (firewall, security groups)
- Teste conexão: `mysql -h host -u user -p`

### Erro: "S3 upload failed"
- Verifique credenciais S3
- Confirme CORS configurado
- Teste com AWS CLI: `aws s3 ls s3://seu-bucket`

### Erro: "Stripe webhook failed"
- Verifique `STRIPE_WEBHOOK_SECRET`
- Confirme URL do webhook no Stripe Dashboard
- Teste com Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Build muito lento
- Use cache de dependências
- Configure build incremental
- Considere usar pnpm em vez de npm

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique logs do servidor
2. Consulte documentação da plataforma
3. Revise variáveis de ambiente
4. Teste localmente primeiro

---

## 🎯 Próximos Passos Após Deploy

1. Configure backups automáticos do banco
2. Configure monitoring (Sentry, LogRocket)
3. Configure analytics (Google Analytics, Plausible)
4. Configure CDN para assets estáticos
5. Otimize imagens (CloudFlare, ImageKit)
6. Configure rate limiting
7. Configure WAF (Web Application Firewall)

---

**Boa sorte com o deploy! 🚀**
