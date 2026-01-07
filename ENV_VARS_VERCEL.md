# Variáveis de Ambiente - TeteCare v2

Configure estas variáveis no painel do Vercel:
**Settings → Environment Variables**

## Obrigatórias

```
DATABASE_URL=postgresql://postgres.[project]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

JWT_SECRET=sua-chave-secreta-aqui-min-32-chars
```

## Opcionais (Stripe)

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Como configurar no Vercel

1. Acesse: https://vercel.com/seu-projeto/tetecare/settings/environment-variables
2. Adicione cada variável acima
3. Selecione os ambientes: Production, Preview, Development
4. Clique em Save
5. Faça um novo deploy para aplicar as mudanças
