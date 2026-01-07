# 🐾 TeteCare v2

Sistema de gestão de creche para pets, reconstruído do zero com Next.js 14.

## ✅ Status do Projeto

**BUILD: ✓ SUCESSO**
- **70+ arquivos TypeScript/TSX**
- **18 páginas**
- **8 tRPC routers**
- **11 componentes UI**
- **4 componentes shared**

---

## 📊 O Que Está Implementado

### Stack Tecnológico

| Tecnologia | Versão | Status |
|------------|--------|--------|
| Next.js | 14.2 | ✅ |
| React | 18.3 | ✅ |
| TypeScript | 5.7 | ✅ |
| Tailwind CSS | 3.4 | ✅ |
| Drizzle ORM | 0.36 | ✅ |
| tRPC | 11.0 | ✅ |
| PostgreSQL | Supabase | ✅ |

### Páginas Implementadas

| Módulo | Páginas | Status |
|--------|---------|--------|
| Autenticação | Login, Registro | ✅ |
| Admin Dashboard | Home, Pets, Tutores, Calendário | ✅ |
| Tutor Dashboard | Home, Pets (CRUD), Calendário, Reservas, Créditos, Notificações, Perfil | ✅ |

### tRPC Routers

| Router | Endpoints | Status |
|--------|-----------|--------|
| `auth` | me, profile, isAuthenticated | ✅ |
| `pets` | list, byId, myPets, create, update, approve, reject, delete, pending, addCredits, stats | ✅ |
| `users` | list, tutors, byId, create, update, delete, promoteToAdmin, demoteFromAdmin, stats, updateProfile | ✅ |
| `calendar` | list, currentMonth, today, byId, create, update, delete, eventTypes | ✅ |
| `bookings` | myBookings, list, pending, byId, create, approve, reject, cancel, complete, stats | ✅ |
| `notifications` | list, unreadCount, markAsRead, markAllAsRead, delete, clearRead, send, sendToAll | ✅ |
| `credits` | packages, allPackages, createPackage, updatePackage, deletePackage, addToPet, removeFromPet, mySummary | ✅ |
| `stats` | dashboard, myStats, monthlyReport | ✅ |

### Componentes UI (Shadcn/ui)

- Avatar, Badge, Button, Card, Dialog, Input, Label, Select, Separator, Skeleton, Tabs

### Componentes Shared

- ConfirmDialog, EmptyState, Loading (Spinner, Page, Card, Table, Stats), PageHeader

### Segurança Implementada

- ✅ Autenticação JWT com cookies httpOnly
- ✅ Validação de variáveis de ambiente (Zod)
- ✅ Tratamento centralizado de erros
- ✅ Validação de input (Zod schemas)
- ✅ Rate limiting em memória
- ✅ Sanitização de strings e objetos
- ✅ Middlewares de proteção (protectedProcedure, adminProcedure)

---

## 🚀 Início Rápido

### 1. Instalar Dependências

```bash
cd tetecare-v2
npm install
```

### 2. Configurar Ambiente

Copie o arquivo `.env.example` para `.env.local` e preencha os valores:

```bash
cp .env.example .env.local
```

Variáveis necessárias:

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
AUTH_SECRET="sua-chave-secreta-de-32-caracteres-ou-mais"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Criar/Atualizar Tabelas no Banco

**Opção A - Via SQL Editor do Supabase (Recomendado para banco existente):**
1. Acesse o Dashboard do Supabase
2. Vá em SQL Editor > New Query
3. Cole o conteúdo do arquivo `EXECUTAR_NO_SUPABASE.sql`
4. Execute o script

**Opção B - Via Drizzle (Para banco novo):**
```bash
npm run db:push
```

### 4. Popular Dados de Teste (Opcional)

```bash
npm run db:seed
```

**Credenciais após seed:**
- **Admin:** `admin@tetecare.com` / `admin123`
- **Tutor:** `maria@email.com` / `tutor123`

### 5. Executar

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 📁 Estrutura do Projeto

```
tetecare-v2/
├── src/
│   ├── app/                      # Páginas (Next.js App Router)
│   │   ├── (auth)/               # Login, Registro
│   │   ├── (dashboard)/          # Área protegida
│   │   │   ├── admin/            # Páginas do admin
│   │   │   │   ├── page.tsx      # Dashboard
│   │   │   │   ├── pets/         # Gestão de pets
│   │   │   │   ├── tutors/       # Gestão de tutores
│   │   │   │   └── calendar/     # Calendário
│   │   │   └── tutor/            # Páginas do tutor
│   │   │       ├── page.tsx      # Dashboard
│   │   │       ├── pets/         # Meus pets + CRUD
│   │   │       ├── calendar/     # Meu calendário
│   │   │       ├── bookings/     # Reservas
│   │   │       ├── credits/      # Créditos
│   │   │       ├── notifications/# Notificações
│   │   │       └── profile/      # Meu perfil
│   │   └── api/trpc/             # API tRPC
│   │
│   ├── components/
│   │   ├── ui/                   # Componentes base (shadcn)
│   │   ├── layouts/              # Sidebar, Navigation
│   │   └── shared/               # Componentes reutilizáveis
│   │
│   └── lib/
│       ├── auth/                 # Autenticação JWT
│       ├── db/                   # Drizzle Schema
│       ├── trpc/                 # Routers tRPC (8 routers)
│       ├── env.ts                # Validação de ambiente
│       ├── errors.ts             # Tratamento de erros
│       ├── security.ts           # Rate limiting, sanitização
│       ├── validations.ts        # Schemas Zod
│       └── utils.ts              # Helpers
│
├── scripts/                      # Scripts de utilidade
│   ├── seed.ts                   # Popular banco
│   ├── test-db.ts                # Testar conexão
│   └── create-admin.ts           # Criar admin
│
├── drizzle.config.ts             # Configuração Drizzle
├── vercel.json                   # Configuração Vercel
└── package.json
```

---

## 📋 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Servidor de desenvolvimento

# Build
npm run build            # Build de produção
npm run start            # Iniciar produção

# Banco de Dados
npm run db:push          # Aplicar schema ao banco
npm run db:generate      # Gerar migrations
npm run db:studio        # Abrir Drizzle Studio
npm run db:test          # Testar conexão
npm run db:seed          # Popular dados
npm run db:create-admin  # Criar admin

# Qualidade
npm run lint             # Verificar código
npm run typecheck        # Verificar tipos
```

---

## 🔐 Autenticação

- **JWT** com cookies httpOnly
- Sessão válida por **30 dias**
- **Roles**: `admin` e `user` (tutor)
- Middleware de proteção de rotas

---

## 📊 Schema do Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários (admin/tutor) |
| `pets` | Pets cadastrados |
| `pet_tutors` | Relação N:N pet-tutor |
| `calendar_events` | Eventos do calendário |
| `vaccine_library` | Biblioteca de vacinas |
| `pet_vaccinations` | Vacinações dos pets |
| `credit_packages` | Pacotes de créditos |
| `booking_requests` | Solicitações de reserva |
| `notifications` | Notificações do sistema |
| `daily_logs` | Logs diários dos pets |

---

## 🚀 Deploy na Vercel

### 1. Push para GitHub

```bash
git init
git add .
git commit -m "Initial commit - TeteCare v2"
git remote add origin https://github.com/seu-usuario/tetecare-v2.git
git push -u origin main
```

### 2. Conectar na Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Importe o repositório
3. Configure as variáveis de ambiente:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | URL de conexão PostgreSQL |
| `AUTH_SECRET` | Chave secreta para JWT (mínimo 32 caracteres) |
| `NEXT_PUBLIC_APP_URL` | URL da aplicação (ex: https://seu-app.vercel.app) |

### 3. Deploy automático!

A Vercel detectará automaticamente que é um projeto Next.js e fará o deploy.

**Região recomendada:** São Paulo (gru1) - já configurado no `vercel.json`

---

## 🔧 Funcionalidades Prontas

### Para o Tutor:
- ✅ Cadastro e login
- ✅ Dashboard com visão geral
- ✅ Cadastro e edição de pets
- ✅ Solicitação de reservas
- ✅ Visualização do calendário
- ✅ Sistema de notificações
- ✅ Gerenciamento de créditos
- ✅ Edição de perfil

### Para o Admin:
- ✅ Dashboard com estatísticas
- ✅ Aprovação/rejeição de pets
- ✅ Gestão de tutores
- ✅ Calendário de eventos
- ✅ Promoção de usuários a admin

---

## 🔧 Próximos Passos Sugeridos

### Funcionalidades para Implementar

1. **Pagamentos (Stripe)**
   - Checkout de créditos
   - Webhooks de confirmação
   - Histórico de transações

2. **Upload de Fotos**
   - Supabase Storage
   - Galeria de pets
   - Compressão de imagens

3. **Vacinas e Medicamentos**
   - CRUD completo
   - Alertas de vencimento
   - Upload de documentos

4. **Notificações Push**
   - Web Push API
   - Email notifications

5. **Relatórios**
   - Exportação PDF
   - Histórico detalhado

---

## 🐛 Troubleshooting

### Erro de conexão com banco
```bash
npm run db:test
```

### Erro de build
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

### Verificar estrutura
```bash
find src -name "*.tsx" -o -name "*.ts" | wc -l
```

---

## 📝 Licença

MIT License

---

**Desenvolvido com ❤️ para TeteCare**
