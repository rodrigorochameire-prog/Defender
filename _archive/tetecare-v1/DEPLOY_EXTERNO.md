# Guia Completo de Deploy Externo - TucoCare Pro

Este documento fornece instruções detalhadas para hospedar o TucoCare Pro em plataformas externas, eliminando a dependência do Manus. O sistema foi desenvolvido com tecnologias padrão da indústria e pode ser implantado em qualquer provedor de hospedagem moderno.

---

## Arquitetura do Sistema

O TucoCare Pro é uma aplicação **full-stack** construída com as seguintes tecnologias:

| Componente | Tecnologia | Versão |
|------------|-----------|--------|
| **Frontend** | React 19 + Vite | 19.x |
| **Backend** | Node.js + Express 4 | 22.x / 4.x |
| **API Layer** | tRPC 11 | 11.x |
| **Database** | MySQL/TiDB compatível | 8.0+ |
| **ORM** | Drizzle ORM | Latest |
| **Styling** | Tailwind CSS 4 | 4.x |
| **Auth** | JWT + OAuth2 | - |
| **Storage** | S3-compatible | - |

A aplicação segue uma arquitetura **monorepo** onde frontend e backend compartilham o mesmo repositório, facilitando o deploy em plataformas modernas.

---

## Dependências Externas do Manus

O sistema utiliza alguns serviços fornecidos pelo Manus que precisam ser substituídos ao migrar para hospedagem externa:

### 1. Autenticação OAuth

**Serviço Manus:** Sistema OAuth integrado com variáveis `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`

**Substituições Recomendadas:**

- **Auth0**: Solução enterprise com suporte completo a OAuth2/OIDC
- **Clerk**: Moderna, fácil integração com React
- **Supabase Auth**: Open-source, gratuito até 50k usuários
- **NextAuth.js**: Biblioteca open-source para autenticação
- **Implementação própria**: JWT + bcrypt para controle total

**Arquivos a modificar:**
```
server/_core/context.ts       # Lógica de autenticação
server/_core/oauth.ts          # Callbacks OAuth
client/src/contexts/AuthContext.tsx  # Context de autenticação no frontend
```

### 2. Storage de Arquivos (S3)

**Serviço Manus:** S3-compatible storage com credenciais injetadas

**Substituições Recomendadas:**

- **AWS S3**: Padrão da indústria, altamente escalável
- **Cloudflare R2**: Compatível com S3, sem custos de egress
- **DigitalOcean Spaces**: S3-compatible, preço fixo
- **MinIO**: Self-hosted, open-source, S3-compatible
- **Backblaze B2**: Custo-benefício excelente

**Arquivos a modificar:**
```
server/storage.ts              # Funções storagePut e storageGet
server/_core/env.ts            # Variáveis de ambiente S3
```

**Variáveis necessárias:**
```bash
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=tucocare-files
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=us-east-1
```

### 3. Serviço de LLM/IA

**Serviço Manus:** API de LLM integrada via `server/_core/llm.ts`

**Substituições Recomendadas:**

- **OpenAI API**: GPT-4, GPT-3.5-turbo
- **Anthropic Claude**: Excelente para análise de texto
- **Google Gemini**: Multimodal, bom custo-benefício
- **Groq**: Inferência ultra-rápida
- **Ollama**: Self-hosted, modelos open-source

**Arquivos a modificar:**
```
server/_core/llm.ts            # Implementação do cliente LLM
server/routers.ts              # Procedures que usam IA (tutor.ai, etc)
```

**Exemplo de substituição (OpenAI):**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function invokeLLM(params: { messages: Message[] }) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: params.messages,
  });
  return response;
}
```

### 4. Transcrição de Áudio

**Serviço Manus:** API de transcrição via `server/_core/voiceTranscription.ts`

**Substituições Recomendadas:**

- **OpenAI Whisper API**: Melhor precisão
- **AssemblyAI**: Especializado em transcrição
- **Google Speech-to-Text**: Suporta muitos idiomas
- **Deepgram**: Tempo real, baixa latência

**Arquivos a modificar:**
```
server/_core/voiceTranscription.ts  # Cliente de transcrição
```

### 5. Geração de Imagens

**Serviço Manus:** API de geração de imagens via `server/_core/imageGeneration.ts`

**Substituições Recomendadas:**

- **OpenAI DALL-E 3**: Alta qualidade
- **Stability AI**: SDXL, open-source
- **Midjourney API**: Qualidade artística superior
- **Replicate**: Acesso a múltiplos modelos

**Arquivos a modificar:**
```
server/_core/imageGeneration.ts     # Cliente de geração
```

### 6. Integração com Google Maps

**Serviço Manus:** Proxy para Google Maps API

**Substituição:**

Basta obter uma chave de API do Google Cloud Platform:

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie um projeto
3. Ative a API "Maps JavaScript API"
4. Crie credenciais (API Key)
5. Configure restrições de domínio

**Arquivos a modificar:**
```
server/_core/map.ts            # Remover proxy, usar API key direta
client/src/components/Map.tsx  # Carregar SDK com sua API key
```

### 7. Notificações ao Proprietário

**Serviço Manus:** Sistema de notificações interno

**Substituições Recomendadas:**

- **SendGrid**: Email transacional
- **Resend**: Moderna, developer-friendly
- **Amazon SES**: Custo baixo, alta escala
- **Twilio SendGrid**: Email + SMS
- **Postmark**: Focado em deliverability

**Arquivos a modificar:**
```
server/_core/notification.ts   # Função notifyOwner
```

### 8. Analytics

**Serviço Manus:** Umami analytics integrado

**Substituições Recomendadas:**

- **Google Analytics 4**: Gratuito, completo
- **Plausible**: Privacy-first, open-source
- **Umami (self-hosted)**: Mesma solução, self-hosted
- **PostHog**: Product analytics completo

**Arquivos a modificar:**
```
client/index.html              # Script de analytics
```

---

## Preparação para Deploy

### Passo 1: Clonar e Configurar Repositório

```bash
# Baixar código do projeto
# (Você receberá os arquivos via download do Manus)

cd tucocare-pro
pnpm install
```

### Passo 2: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Database
DATABASE_URL=mysql://user:password@host:3306/tucocare

# JWT Secret (gere uma string aleatória segura)
JWT_SECRET=your-super-secret-jwt-key-change-this

# OAuth (substitua pelo seu provedor)
OAUTH_SERVER_URL=https://your-auth-provider.com
VITE_OAUTH_PORTAL_URL=https://your-auth-provider.com/login
VITE_APP_ID=your-app-id

# Storage S3
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=tucocare-files
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=us-east-1

# LLM API
OPENAI_API_KEY=sk-your-openai-key

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-key

# Email (SendGrid, SES, etc)
EMAIL_API_KEY=your-email-api-key
EMAIL_FROM=noreply@tucocare.com

# Stripe (pagamentos)
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key

# App Info
OWNER_NAME=Your Name
OWNER_OPEN_ID=your-admin-id
VITE_APP_TITLE=TucoCare Pro
VITE_APP_LOGO=/tucocare-logo.png

# Analytics (opcional)
VITE_ANALYTICS_ENDPOINT=https://analytics.yourdomain.com
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

### Passo 3: Configurar Banco de Dados

O sistema usa **MySQL 8.0+** ou **TiDB** (compatível com MySQL).

**Opções de hospedagem de banco:**

| Provedor | Tipo | Custo Inicial | Escalabilidade |
|----------|------|---------------|----------------|
| **PlanetScale** | MySQL Serverless | Gratuito (5GB) | Excelente |
| **AWS RDS** | MySQL Gerenciado | ~$15/mês | Excelente |
| **DigitalOcean** | MySQL Managed | $15/mês | Boa |
| **Railway** | MySQL | $5/mês | Boa |
| **Supabase** | PostgreSQL | Gratuito | Excelente |

**Nota:** Se optar por PostgreSQL (Supabase), será necessário ajustar o schema do Drizzle.

**Executar migrações:**

```bash
# Gerar migrações
pnpm db:push

# Verificar schema
pnpm drizzle-kit studio
```

### Passo 4: Build da Aplicação

```bash
# Build do frontend e backend
pnpm build

# Testar localmente
pnpm start
```

---

## Opções de Hospedagem

### Opção 1: Railway (Recomendado para Iniciantes)

**Vantagens:** Deploy automático, banco de dados integrado, fácil configuração

**Custo:** ~$5-20/mês dependendo do uso

**Passos:**

1. Crie conta em [railway.app](https://railway.app)
2. Conecte seu repositório GitHub
3. Adicione serviço MySQL
4. Configure variáveis de ambiente no painel
5. Deploy automático a cada push

**Configuração:**

```json
// railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "pnpm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Opção 2: Render

**Vantagens:** Gratuito para começar, SSL automático, fácil escalabilidade

**Custo:** Gratuito (com limitações) ou $7/mês

**Passos:**

1. Crie conta em [render.com](https://render.com)
2. Crie novo "Web Service"
3. Conecte repositório
4. Configure:
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start`
5. Adicione banco MySQL externo (PlanetScale recomendado)

### Opção 3: Vercel + Backend Separado

**Vantagens:** Frontend ultra-rápido, CDN global, domínio grátis

**Custo:** Gratuito para frontend, backend em Railway/Render

**Arquitetura:**
- Frontend (Vite/React) → Vercel
- Backend (Express/tRPC) → Railway/Render
- Database → PlanetScale

**Configuração Vercel:**

```json
// vercel.json
{
  "buildCommand": "cd client && pnpm build",
  "outputDirectory": "client/dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend.railway.app/api/:path*"
    }
  ]
}
```

### Opção 4: DigitalOcean App Platform

**Vantagens:** Infraestrutura robusta, banco gerenciado, bom suporte

**Custo:** ~$12/mês (app) + $15/mês (database)

**Passos:**

1. Crie conta em [digitalocean.com](https://digitalocean.com)
2. Crie novo App
3. Conecte repositório GitHub
4. Configure build settings
5. Adicione MySQL Managed Database

### Opção 5: AWS (Elastic Beanstalk ou ECS)

**Vantagens:** Máxima escalabilidade, controle total, integração com outros serviços AWS

**Custo:** Variável, ~$20-50/mês para começar

**Recomendado para:** Aplicações enterprise com alto tráfego

### Opção 6: Self-Hosted (VPS)

**Vantagens:** Controle total, custo fixo, sem vendor lock-in

**Custo:** $5-20/mês (Hetzner, DigitalOcean Droplet, Linode)

**Requisitos mínimos:**
- 2 CPU cores
- 2GB RAM
- 20GB SSD
- Ubuntu 22.04 LTS

**Setup básico:**

```bash
# Instalar Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar pnpm
npm install -g pnpm

# Instalar PM2 (process manager)
npm install -g pm2

# Clonar projeto
git clone your-repo
cd tucocare-pro
pnpm install
pnpm build

# Iniciar com PM2
pm2 start npm --name "tucocare" -- start
pm2 save
pm2 startup

# Nginx como reverse proxy
sudo apt install nginx
# Configurar proxy para porta 3000
```

**Nginx config:**

```nginx
server {
    listen 80;
    server_name tucocare.com;

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

---

## Comparação de Plataformas

| Plataforma | Facilidade | Custo/Mês | Escalabilidade | Banco Incluído | Recomendado Para |
|------------|-----------|-----------|----------------|----------------|------------------|
| **Railway** | ⭐⭐⭐⭐⭐ | $5-20 | ⭐⭐⭐⭐ | ✅ | Iniciantes, MVPs |
| **Render** | ⭐⭐⭐⭐⭐ | $0-7 | ⭐⭐⭐⭐ | ❌ | Projetos pequenos |
| **Vercel** | ⭐⭐⭐⭐ | $0 (frontend) | ⭐⭐⭐⭐⭐ | ❌ | Apps com muito tráfego |
| **DigitalOcean** | ⭐⭐⭐⭐ | $27+ | ⭐⭐⭐⭐ | ✅ | Produção estável |
| **AWS** | ⭐⭐ | $20-100+ | ⭐⭐⭐⭐⭐ | ✅ | Enterprise |
| **VPS (Self-hosted)** | ⭐⭐ | $5-20 | ⭐⭐⭐ | ❌ | Controle total |

---

## Checklist de Migração

### Antes do Deploy

- [ ] Substituir autenticação OAuth do Manus
- [ ] Configurar S3 ou storage alternativo
- [ ] Substituir API de LLM (se usar funcionalidade de IA)
- [ ] Configurar Google Maps API key
- [ ] Configurar serviço de email
- [ ] Gerar JWT_SECRET seguro
- [ ] Configurar Stripe (se usar pagamentos)
- [ ] Testar build local (`pnpm build && pnpm start`)

### Configuração de Banco

- [ ] Criar banco MySQL/PostgreSQL
- [ ] Configurar DATABASE_URL
- [ ] Executar migrações (`pnpm db:push`)
- [ ] Criar usuário admin inicial
- [ ] Backup automático configurado

### Deploy

- [ ] Escolher plataforma de hospedagem
- [ ] Configurar variáveis de ambiente
- [ ] Fazer primeiro deploy
- [ ] Testar funcionalidades críticas
- [ ] Configurar domínio personalizado
- [ ] Configurar SSL/HTTPS
- [ ] Configurar monitoramento (Sentry, LogRocket)

### Pós-Deploy

- [ ] Configurar backups automáticos do banco
- [ ] Configurar CI/CD (GitHub Actions)
- [ ] Documentar processo de deploy para equipe
- [ ] Configurar alertas de erro
- [ ] Otimizar performance (CDN, caching)

---

## Arquivos Críticos para Modificar

Ao migrar para hospedagem externa, você precisará modificar principalmente os arquivos em `server/_core/`:

```
server/_core/
├── auth.ts                 # Sistema de autenticação
├── context.ts              # Context do tRPC (user session)
├── oauth.ts                # Callbacks OAuth
├── env.ts                  # Variáveis de ambiente
├── llm.ts                  # Cliente LLM/IA
├── voiceTranscription.ts   # Transcrição de áudio
├── imageGeneration.ts      # Geração de imagens
├── map.ts                  # Google Maps proxy
└── notification.ts         # Notificações por email
```

E também:

```
server/storage.ts           # S3 storage functions
client/src/const.ts         # Constantes do frontend
client/src/contexts/AuthContext.tsx  # Context de autenticação
```

---

## Scripts Úteis

### Script de Deploy Automatizado

Crie um arquivo `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Iniciando deploy do TucoCare Pro..."

# Build
echo "📦 Building application..."
pnpm install
pnpm build

# Migrations
echo "🗄️  Running database migrations..."
pnpm db:push

# Start
echo "✅ Starting application..."
pnpm start
```

### Script de Backup do Banco

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS tucocare > backup_$DATE.sql
# Upload para S3
aws s3 cp backup_$DATE.sql s3://tucocare-backups/
```

---

## Suporte e Recursos

### Documentação Oficial

- [tRPC Documentation](https://trpc.io)
- [Drizzle ORM](https://orm.drizzle.team)
- [React 19](https://react.dev)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)

### Comunidades

- [tRPC Discord](https://trpc.io/discord)
- [React Community](https://react.dev/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/trpc)

---

## Conclusão

O TucoCare Pro foi desenvolvido com tecnologias padrão da indústria e pode ser facilmente migrado para qualquer plataforma de hospedagem moderna. A arquitetura monorepo e o uso de tRPC facilitam o deploy e manutenção.

**Recomendação para começar:**

1. **Iniciantes**: Railway (tudo integrado, fácil)
2. **Custo-benefício**: Render + PlanetScale
3. **Escalabilidade**: Vercel (frontend) + Railway (backend)
4. **Controle total**: VPS com Docker

Qualquer que seja a plataforma escolhida, o sistema está pronto para produção e pode escalar conforme sua necessidade.

---

**Autor:** Manus AI  
**Data:** 14 de Dezembro de 2024  
**Versão:** 1.0
