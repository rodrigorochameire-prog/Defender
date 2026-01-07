# 🚀 Deploy do TeteCare v2 na Vercel

## Pré-requisitos

1. Conta na Vercel (vercel.com)
2. Banco PostgreSQL configurado (Supabase, Neon, etc.)

## Passo 1: Configurar Variáveis de Ambiente na Vercel

Acesse seu projeto na Vercel e configure as seguintes variáveis:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | URL de conexão PostgreSQL (veja abaixo) |
| `AUTH_SECRET` | Uma string aleatória de 32+ caracteres |
| `NEXT_PUBLIC_APP_URL` | URL do seu app (ex: https://tetecare.vercel.app) |

### Formato da DATABASE_URL para Supabase

**Pooler (Recomendado para Vercel):**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Conexão Direta:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

## Passo 2: Criar as Tabelas no Banco

Após o deploy, execute localmente (ou via Vercel CLI):

```bash
npm run db:push
```

## Passo 3: Popular Dados Iniciais (Opcional)

```bash
npm run db:seed
```

**Credenciais de teste:**
- Admin: `admin@tetecare.com` / `admin123`
- Tutor: `maria@email.com` / `tutor123`

## Passo 4: Deploy

### Via GitHub (Recomendado)
1. Push o código para o GitHub
2. Conecte o repositório na Vercel
3. A Vercel detecta automaticamente Next.js e faz o deploy

### Via Vercel CLI
```bash
npx vercel
```

## Configuração Adicional

### Region
O projeto está configurado para usar a região `gru1` (São Paulo) no `vercel.json`.

### Timeouts
APIs têm timeout de 30 segundos configurado.

## Troubleshooting

### Erro de conexão com banco
- Verifique se a DATABASE_URL está correta
- Para Supabase, use a URL do pooler (porta 6543)

### Build falha
```bash
npm run typecheck
npm run lint
```

### Limpar cache
```bash
rm -rf .next node_modules
npm install
npm run build
```
