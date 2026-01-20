# Variáveis de Ambiente - DefesaHub

Configure estas variáveis no painel do Vercel:
**Settings → Environment Variables**

## Obrigatórias

```
DATABASE_URL=postgresql://postgres.[project]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
AUTH_SECRET=sua-chave-secreta-aqui-min-32-chars
NEXT_PUBLIC_APP_URL=https://defesahub.vercel.app

NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Como configurar no Vercel

1. Acesse: https://vercel.com/seu-projeto/defesahub/settings/environment-variables
2. Adicione cada variável acima
3. Selecione os ambientes: Production, Preview, Development
4. Clique em Save
5. Faça um novo deploy para aplicar as mudanças
