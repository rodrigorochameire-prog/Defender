# Dependências do Manus e Como Substituí-las

Este documento lista todas as dependências do ecossistema Manus presentes no TucoCare Pro e fornece instruções detalhadas de como substituí-las por serviços terceiros ou implementações próprias.

---

## 1. Sistema de Autenticação OAuth

### Dependência Atual

O sistema usa o OAuth2 integrado do Manus através dos seguintes arquivos:

- `server/_core/oauth.ts` - Callbacks e fluxo OAuth
- `server/_core/context.ts` - Validação de sessão JWT
- `client/src/contexts/AuthContext.tsx` - Context React de autenticação

### Variáveis de Ambiente

```bash
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_APP_ID=your-manus-app-id
JWT_SECRET=generated-by-manus
```

### Opções de Substituição

#### Opção A: Auth0 (Recomendado para Enterprise)

**Custo:** Gratuito até 7.000 usuários ativos/mês

**Passos:**

1. Criar conta em [auth0.com](https://auth0.com)
2. Criar nova aplicação (Regular Web Application)
3. Configurar Allowed Callback URLs: `https://yourdomain.com/api/oauth/callback`
4. Instalar SDK:

```bash
pnpm add express-openid-connect
```

5. Substituir `server/_core/oauth.ts`:

```typescript
import { auth } from 'express-openid-connect';

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
};

export const authMiddleware = auth(config);
```

6. Atualizar variáveis:

```bash
AUTH0_SECRET=your-random-secret
AUTH0_CLIENT_ID=your-client-id
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
BASE_URL=https://yourdomain.com
```

#### Opção B: Clerk (Recomendado para Startups)

**Custo:** Gratuito até 10.000 usuários ativos/mês

**Passos:**

1. Criar conta em [clerk.com](https://clerk.com)
2. Criar nova aplicação
3. Instalar SDKs:

```bash
pnpm add @clerk/clerk-react @clerk/backend
```

4. Substituir autenticação no frontend (`client/src/main.tsx`):

```typescript
import { ClerkProvider } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

root.render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <App />
  </ClerkProvider>
);
```

5. Substituir validação no backend (`server/_core/context.ts`):

```typescript
import { clerkClient } from '@clerk/backend';

export async function createContext({ req, res }: any) {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionToken) {
    return { req, res, user: null };
  }

  try {
    const session = await clerkClient.sessions.verifySession(sessionToken);
    const user = await clerkClient.users.getUser(session.userId);
    
    return {
      req,
      res,
      user: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        name: user.fullName,
        role: user.publicMetadata.role || 'user',
      },
    };
  } catch {
    return { req, res, user: null };
  }
}
```

#### Opção C: Supabase Auth (Open-Source)

**Custo:** Gratuito até 50.000 usuários ativos/mês

**Passos:**

1. Criar projeto em [supabase.com](https://supabase.com)
2. Instalar SDK:

```bash
pnpm add @supabase/supabase-js
```

3. Configurar cliente (`client/src/lib/supabase.ts`):

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

4. Substituir AuthContext:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user };
}
```

#### Opção D: Implementação Própria (JWT + bcrypt)

**Custo:** Gratuito

**Passos:**

1. Instalar dependências:

```bash
pnpm add bcryptjs jsonwebtoken
pnpm add -D @types/bcryptjs @types/jsonwebtoken
```

2. Criar sistema de registro/login (`server/routers.ts`):

```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Registro
auth: router({
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string(),
    }))
    .mutation(async ({ input }) => {
      const hashedPassword = await bcrypt.hash(input.password, 10);
      
      const user = await db.createUser({
        email: input.email,
        passwordHash: hashedPassword,
        name: input.name,
      });

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return { token, user };
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);
      
      if (!user || !await bcrypt.compare(input.password, user.passwordHash)) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciais inválidas' });
      }

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      return { token, user };
    }),
}),
```

3. Atualizar schema do banco (`drizzle/schema.ts`):

```typescript
export const user = mysqlTable("user", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "user"]).default("user"),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
```

---

## 2. Storage de Arquivos (S3)

### Dependência Atual

- `server/storage.ts` - Funções `storagePut` e `storageGet`
- Credenciais injetadas automaticamente pelo Manus

### Variáveis de Ambiente

```bash
# Injetadas automaticamente pelo Manus
S3_ENDPOINT=https://s3.manus.im
S3_BUCKET=auto-generated
S3_ACCESS_KEY=auto-generated
S3_SECRET_KEY=auto-generated
```

### Opções de Substituição

#### Opção A: AWS S3 (Padrão da Indústria)

**Custo:** $0.023/GB/mês + $0.09/GB transferência

**Passos:**

1. Criar bucket no [AWS S3](https://s3.console.aws.amazon.com)
2. Criar IAM user com permissões S3
3. Instalar SDK:

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

4. Atualizar `server/storage.ts`:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function storagePut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType?: string
) {
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: data,
    ContentType: contentType,
  }));

  return {
    key,
    url: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  };
}

export async function storageGet(key: string, expiresIn: number = 3600) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return { key, url };
}
```

5. Configurar variáveis:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=tucocare-files
```

#### Opção B: Cloudflare R2 (Sem Custos de Egress)

**Custo:** $0.015/GB/mês, **sem cobrança de transferência**

**Passos:**

1. Criar bucket no [Cloudflare R2](https://dash.cloudflare.com/r2)
2. Gerar API token
3. Usar mesmo código do AWS S3 (compatível), apenas mudar endpoint:

```typescript
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

#### Opção C: DigitalOcean Spaces

**Custo:** $5/mês (250GB inclusos)

**Passos:**

1. Criar Space no [DigitalOcean](https://cloud.digitalocean.com/spaces)
2. Gerar access key
3. Usar código S3 com endpoint:

```typescript
const s3Client = new S3Client({
  region: 'nyc3',
  endpoint: 'https://nyc3.digitaloceanspaces.com',
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY!,
    secretAccessKey: process.env.SPACES_SECRET_KEY!,
  },
});
```

#### Opção D: MinIO (Self-Hosted)

**Custo:** Gratuito (self-hosted)

**Passos:**

1. Instalar MinIO no seu servidor:

```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=admin" \
  -e "MINIO_ROOT_PASSWORD=password" \
  minio/minio server /data --console-address ":9001"
```

2. Usar código S3 com endpoint local:

```typescript
const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: 'http://localhost:9000',
  forcePathStyle: true,
  credentials: {
    accessKeyId: 'admin',
    secretAccessKey: 'password',
  },
});
```

---

## 3. Serviço de LLM/IA

### Dependência Atual

- `server/_core/llm.ts` - Função `invokeLLM`
- Usado em: `server/routers.ts` (procedure `tutor.ai`)

### Opções de Substituição

#### Opção A: OpenAI API

**Custo:** $0.50-$30 por 1M tokens (depende do modelo)

**Passos:**

1. Criar conta em [platform.openai.com](https://platform.openai.com)
2. Gerar API key
3. Instalar SDK:

```bash
pnpm add openai
```

4. Substituir `server/_core/llm.ts`:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function invokeLLM(params: {
  messages: Array<{ role: string; content: string }>;
  tools?: any[];
  tool_choice?: any;
}) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: params.messages,
    tools: params.tools,
    tool_choice: params.tool_choice,
  });

  return response;
}
```

#### Opção B: Anthropic Claude

**Custo:** $3-$15 por 1M tokens

**Passos:**

1. Criar conta em [console.anthropic.com](https://console.anthropic.com)
2. Instalar SDK:

```bash
pnpm add @anthropic-ai/sdk
```

3. Implementar:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function invokeLLM(params: {
  messages: Array<{ role: string; content: string }>;
}) {
  const response = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 4096,
    messages: params.messages,
  });

  return response;
}
```

#### Opção C: Ollama (Self-Hosted, Gratuito)

**Custo:** Gratuito (requer GPU)

**Passos:**

1. Instalar Ollama:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama2
```

2. Implementar cliente:

```typescript
export async function invokeLLM(params: {
  messages: Array<{ role: string; content: string }>;
}) {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama2',
      messages: params.messages,
    }),
  });

  return response.json();
}
```

---

## 4. Transcrição de Áudio

### Dependência Atual

- `server/_core/voiceTranscription.ts` - Função `transcribeAudio`

### Opções de Substituição

#### Opção A: OpenAI Whisper API

**Custo:** $0.006 por minuto

**Passos:**

1. Usar mesma API key do OpenAI
2. Substituir `server/_core/voiceTranscription.ts`:

```typescript
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(params: {
  audioUrl: string;
  language?: string;
  prompt?: string;
}) {
  // Download audio file
  const response = await fetch(params.audioUrl);
  const buffer = await response.arrayBuffer();
  const tempFile = `/tmp/audio-${Date.now()}.mp3`;
  fs.writeFileSync(tempFile, Buffer.from(buffer));

  // Transcribe
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(tempFile),
    model: 'whisper-1',
    language: params.language,
    prompt: params.prompt,
  });

  // Cleanup
  fs.unlinkSync(tempFile);

  return {
    text: transcription.text,
    language: params.language || 'pt',
  };
}
```

#### Opção B: AssemblyAI

**Custo:** $0.00025 por segundo (~$0.015/min)

**Passos:**

1. Criar conta em [assemblyai.com](https://assemblyai.com)
2. Instalar SDK:

```bash
pnpm add assemblyai
```

3. Implementar:

```typescript
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

export async function transcribeAudio(params: {
  audioUrl: string;
  language?: string;
}) {
  const transcript = await client.transcripts.transcribe({
    audio_url: params.audioUrl,
    language_code: params.language || 'pt',
  });

  return {
    text: transcript.text,
    language: params.language || 'pt',
  };
}
```

---

## 5. Geração de Imagens

### Dependência Atual

- `server/_core/imageGeneration.ts` - Função `generateImage`

### Opções de Substituição

#### Opção A: OpenAI DALL-E 3

**Custo:** $0.040-$0.120 por imagem

**Passos:**

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateImage(params: {
  prompt: string;
  originalImages?: Array<{ url: string; mimeType: string }>;
}) {
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: params.prompt,
    n: 1,
    size: '1024x1024',
  });

  return {
    url: response.data[0].url,
  };
}
```

#### Opção B: Stability AI

**Custo:** $0.002-$0.02 por imagem

**Passos:**

1. Criar conta em [stability.ai](https://stability.ai)
2. Implementar:

```typescript
export async function generateImage(params: {
  prompt: string;
}) {
  const response = await fetch(
    'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
      },
      body: JSON.stringify({
        text_prompts: [{ text: params.prompt }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
      }),
    }
  );

  const data = await response.json();
  const base64Image = data.artifacts[0].base64;
  
  // Upload to S3
  const buffer = Buffer.from(base64Image, 'base64');
  const { url } = await storagePut(`generated/${Date.now()}.png`, buffer, 'image/png');

  return { url };
}
```

---

## 6. Google Maps

### Dependência Atual

- `server/_core/map.ts` - Proxy para Google Maps API
- `client/src/components/Map.tsx` - Componente de mapa

### Substituição

**Simples:** Basta obter sua própria API key do Google

**Passos:**

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. Crie projeto
3. Ative "Maps JavaScript API"
4. Crie API key
5. Atualizar `client/src/components/Map.tsx`:

```typescript
// Remover proxy, carregar diretamente
const script = document.createElement('script');
script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places,drawing,geometry`;
script.async = true;
document.head.appendChild(script);
```

6. Remover `server/_core/map.ts` (não é mais necessário)

**Variável:**

```bash
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

---

## 7. Notificações por Email

### Dependência Atual

- `server/_core/notification.ts` - Função `notifyOwner`

### Opções de Substituição

#### Opção A: Resend (Recomendado)

**Custo:** Gratuito até 3.000 emails/mês

**Passos:**

1. Criar conta em [resend.com](https://resend.com)
2. Instalar SDK:

```bash
pnpm add resend
```

3. Substituir `server/_core/notification.ts`:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function notifyOwner(params: {
  title: string;
  content: string;
}) {
  await resend.emails.send({
    from: 'TucoCare <noreply@tucocare.com>',
    to: process.env.OWNER_EMAIL!,
    subject: params.title,
    html: `
      <h2>${params.title}</h2>
      <p>${params.content}</p>
    `,
  });

  return true;
}
```

#### Opção B: SendGrid

**Custo:** Gratuito até 100 emails/dia

**Passos:**

```bash
pnpm add @sendgrid/mail
```

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function notifyOwner(params: {
  title: string;
  content: string;
}) {
  await sgMail.send({
    to: process.env.OWNER_EMAIL!,
    from: 'noreply@tucocare.com',
    subject: params.title,
    html: `<h2>${params.title}</h2><p>${params.content}</p>`,
  });

  return true;
}
```

---

## 8. Analytics

### Dependência Atual

- Umami analytics integrado no `client/index.html`

### Substituição

#### Opção A: Google Analytics 4

**Custo:** Gratuito

**Passos:**

1. Criar propriedade no [Google Analytics](https://analytics.google.com)
2. Obter Measurement ID
3. Substituir script em `client/index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

#### Opção B: Plausible (Privacy-First)

**Custo:** $9/mês (10k pageviews)

**Passos:**

```html
<script defer data-domain="tucocare.com" src="https://plausible.io/js/script.js"></script>
```

---

## Resumo de Custos Mensais

| Serviço | Opção Gratuita | Opção Paga | Recomendação |
|---------|----------------|------------|--------------|
| **Hospedagem** | Render (limitado) | Railway $5-20 | Railway |
| **Banco de Dados** | PlanetScale 5GB | PlanetScale $29 | PlanetScale |
| **Auth** | Supabase 50k users | Auth0 $23 | Supabase |
| **Storage** | - | Cloudflare R2 ~$1 | Cloudflare R2 |
| **LLM** | Ollama (self-hosted) | OpenAI ~$10-50 | OpenAI |
| **Email** | Resend 3k/mês | Resend $20 | Resend |
| **Maps** | - | Google Maps ~$5 | Google Maps |
| **Analytics** | Google Analytics | Plausible $9 | Google Analytics |
| **Total** | **~$11/mês** | **~$50-100/mês** | **~$30/mês** |

---

**Conclusão:** É perfeitamente viável hospedar o TucoCare Pro fora do Manus com custo mensal entre $11-30 para começar, escalando conforme necessário.
