# DefensorHub

Sistema de Gestão Jurídica para Defensoria Pública.

## Sobre o Projeto

O DefensorHub é uma plataforma moderna para gestão de processos, prazos e demandas da Defensoria Pública. Desenvolvido com Next.js, tRPC, Drizzle ORM e Supabase.

### Funcionalidades Principais

- **Gestão de Assistidos**: Cadastro completo com status prisional, contatos e histórico
- **Controle de Processos**: Organização por área (Júri, Execução Penal, Violência Doméstica, etc.)
- **Gestão de Demandas**: Controle de prazos com status (Atender, Fila, Monitorar, Protocolado)
- **Visualização Kanban**: Quadro visual para gestão de demandas
- **Tribunal do Júri**: Controle de sessões do plenário
- **Calendário Integrado**: Audiências, júris e prazos em um só lugar
- **Integração WhatsApp**: Notificações automáticas para assistidos e familiares
- **Templates de Peças**: Biblioteca de modelos processuais
- **Calculadoras**: Prescrição, progressão de regime, livramento condicional

## Tecnologias

- **Frontend**: Next.js 14, React 18, Tailwind CSS, shadcn/ui
- **Backend**: tRPC, Drizzle ORM
- **Banco de Dados**: PostgreSQL (Supabase)
- **Autenticação**: Clerk
- **Hospedagem**: Vercel (recomendado)

## Configuração

### 1. Pré-requisitos

- Node.js 18+
- PostgreSQL ou conta no Supabase
- Conta no Clerk (autenticação)

### 2. Instalação

```bash
# Clonar o repositório
git clone <url-do-repo>
cd defensor-hub

# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env.local
```

### 3. Configurar Variáveis de Ambiente

Edite o arquivo `.env.local` com suas credenciais:

```env
# Banco de Dados
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Clerk (Autenticação)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
```

### 4. Configurar Banco de Dados

```bash
# Gerar migrations
npm run db:generate

# Aplicar migrations
npm run db:push

# Criar usuário admin
npm run db:create-admin
```

### 5. Executar o Projeto

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm run start
```

## Estrutura do Projeto

```
src/
├── app/                    # Páginas Next.js (App Router)
│   ├── (dashboard)/       # Rotas protegidas
│   │   └── admin/         # Painel administrativo
│   │       ├── assistidos/
│   │       ├── processos/
│   │       ├── demandas/
│   │       ├── kanban/
│   │       ├── juri/
│   │       └── ...
│   ├── api/               # API Routes
│   └── ...
├── components/            # Componentes React
│   ├── layouts/          # Sidebars, headers
│   ├── shared/           # Componentes reutilizáveis
│   └── ui/               # Componentes shadcn/ui
├── lib/
│   ├── db/               # Schema e conexão Drizzle
│   ├── trpc/             # Configuração tRPC
│   │   └── routers/      # Routers tRPC
│   ├── services/         # Serviços (WhatsApp, etc.)
│   └── ...
└── ...

scripts/
├── import-csv.ts          # Importação de dados CSV
├── create-admin.ts        # Criar usuário admin
└── seed.ts               # Seed inicial
```

## Importação de Dados

Para importar dados de planilhas CSV:

```bash
# Importar demandas
npm run import:csv -- "arquivo.csv" demandas

# Importar sessões do júri
npm run import:csv -- "arquivo.csv" juri
```

## Deploy

### Vercel (Recomendado)

1. Faça push do código para o GitHub
2. Conecte o repositório na Vercel
3. Configure as variáveis de ambiente
4. Deploy automático

### Outras Plataformas

O projeto é compatível com qualquer plataforma que suporte Next.js:
- Railway
- Render
- AWS Amplify
- Docker

## Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adicionar nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto é privado e de uso exclusivo da Defensoria Pública.

---

Desenvolvido com ❤️ para a Defensoria Pública
