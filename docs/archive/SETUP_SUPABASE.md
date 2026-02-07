# Guia de Configuração do DefensorHub no Supabase

## Seu Projeto Supabase

- **Project Ref**: `hxfvlaeqhkmelvyzgfqp`
- **URL do Projeto**: https://hxfvlaeqhkmelvyzgfqp.supabase.co

## Passo 1: Acessar o SQL Editor

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard/project/hxfvlaeqhkmelvyzgfqp)
2. No menu lateral, clique em **SQL Editor**

## Passo 2: Executar a Migration

Copie e cole o conteúdo do arquivo `supabase/migrations/20260115_defensor_hub_schema.sql` no SQL Editor e execute.

**Ou execute diretamente via CLI:**

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login
supabase login

# Linkar ao projeto
supabase link --project-ref hxfvlaeqhkmelvyzgfqp

# Executar migration
supabase db push
```

## Passo 3: Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com:

```env
# Banco de Dados
DATABASE_URL="postgresql://postgres:[SUA_SENHA]@db.hxfvlaeqhkmelvyzgfqp.supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://hxfvlaeqhkmelvyzgfqp.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[SUA_ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SUA_SERVICE_ROLE_KEY]"

# Clerk (Autenticação)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# URLs de redirecionamento
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/admin"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/admin"

# Aplicação
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Onde encontrar as chaves:

1. **ANON_KEY e SERVICE_ROLE_KEY**: 
   - Vá em Settings > API > Project API keys
   - `anon` public = NEXT_PUBLIC_SUPABASE_ANON_KEY
   - `service_role` secret = SUPABASE_SERVICE_ROLE_KEY

2. **DATABASE_URL**:
   - Vá em Settings > Database > Connection string
   - Copie a URI e substitua `[YOUR-PASSWORD]` pela senha do projeto

## Passo 4: Instalar Dependências e Executar

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev
```

Acesse http://localhost:3000

## Passo 5: Deploy na Vercel

1. Crie um novo projeto na Vercel
2. Conecte o repositório GitHub
3. Configure as variáveis de ambiente (mesmas do `.env.local`)
4. Deploy!

## Tabelas Criadas

| Tabela | Descrição |
|--------|-----------|
| `assistidos` | Pessoas atendidas pela Defensoria |
| `processos` | Processos judiciais |
| `demandas` | Prazos e demandas |
| `sessoes_juri` | Sessões do Tribunal do Júri |
| `audiencias` | Audiências processuais |
| `movimentacoes` | Movimentações processuais |
| `documentos` | Peças e documentos |
| `anotacoes` | Anotações e providências |
| `atendimentos` | Registros de atendimentos |
| `peca_templates` | Templates de peças |
| `calculos_pena` | Cálculos de pena e prescrição |

## Enums Criados

| Enum | Valores |
|------|---------|
| `area` | JURI, EXECUCAO_PENAL, VIOLENCIA_DOMESTICA, SUBSTITUICAO, CURADORIA, FAMILIA, CIVEL, FAZENDA_PUBLICA |
| `status_prisional` | SOLTO, CADEIA_PUBLICA, PENITENCIARIA, COP, HOSPITAL_CUSTODIA, DOMICILIAR, MONITORADO |
| `status_demanda` | 2_ATENDER, 4_MONITORAR, 5_FILA, 7_PROTOCOLADO, 7_CIENCIA, 7_SEM_ATUACAO, URGENTE, CONCLUIDO, ARQUIVADO |
| `prioridade` | BAIXA, NORMAL, ALTA, URGENTE, REU_PRESO |

## Importar Dados das Planilhas

Após configurar o banco, você pode importar seus dados das planilhas CSV:

```bash
# Importar demandas
npm run import:csv -- "caminho/para/Demandas.csv" demandas

# Importar sessões do júri
npm run import:csv -- "caminho/para/Plenarios.csv" juri
```

## Suporte

Em caso de problemas:

1. Verifique se as migrations foram aplicadas corretamente
2. Confira as variáveis de ambiente
3. Consulte os logs do Supabase em Database > Logs
