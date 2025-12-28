# 🐾 TeteCare Pro - Guia de Reconstrução do Zero

## 📋 Resumo Executivo

**TeteCare Pro** é um sistema de gestão de creche para pets (daycare) com dois tipos de usuários:
- **Admins**: Funcionários da creche que gerenciam pets, tutores, calendário, saúde, etc.
- **Tutores**: Donos dos pets que acompanham seus animais, fazem reservas, veem fotos, etc.

---

## 🛠️ Stack Tecnológico Atual (Referência)

### Frontend
- **React 19** com TypeScript
- **Vite 7** como bundler
- **TailwindCSS 4** para estilos
- **shadcn/ui** - componentes Radix UI estilizados
- **wouter** - roteamento leve
- **@tanstack/react-query** - gerenciamento de estado servidor
- **tRPC client** - chamadas type-safe ao backend

### Backend
- **Express** como servidor HTTP
- **tRPC** para API type-safe
- **Drizzle ORM** para PostgreSQL
- **jose/jsonwebtoken** para JWT

### Serviços Externos
- **Supabase** - Auth + Storage + Database PostgreSQL
- **Stripe** - Pagamentos
- **AWS S3** (opcional) - Storage alternativo

---

## 📊 Entidades do Sistema (Modelo de Dados)

### Núcleo
1. **Users** - Usuários (tutores e admins)
   - id, name, email, role, phone, stripe_customer_id

2. **Pets** - Animais cadastrados
   - id, name, breed, age, weight, birth_date, photo_url, status, approval_status, notes, credits

3. **PetTutors** - Relacionamento N:N entre pets e tutores
   - pet_id, tutor_id, is_primary

### Daycare/Creche
4. **DaycareCredits** - Pacotes de créditos comprados
   - pet_id, package_days, package_price, remaining_days, expiry_date

5. **DaycareUsage** - Histórico de uso da creche
   - pet_id, usage_date, check_in_time, check_out_time, payment_status

6. **BookingRequests** - Solicitações de reserva (tutores)
   - pet_id, tutor_id, requestedDates[], status, notes

7. **Bookings** - Reservas confirmadas
   - pet_id, tutor_id, bookingDate, serviceType, status, numberOfDays

### Saúde
8. **VaccineLibrary** - Biblioteca de vacinas comuns
9. **PetVaccinations** - Vacinas aplicadas em cada pet
10. **MedicationLibrary** - Biblioteca de medicamentos
11. **PetMedications** - Medicamentos de cada pet (com progressão de dosagem)
12. **PreventiveLibrary** - Produtos preventivos (antipulgas, vermífugos)
13. **FleaTreatments** - Tratamentos antipulgas aplicados
14. **DewormingTreatments** - Vermífugos aplicados
15. **HealthBehaviorLogs** - Logs rápidos de saúde/comportamento

### Comunicação
16. **Notifications** - Fila de notificações
17. **NotificationTemplates** - Templates customizáveis
18. **TutorNotificationPreferences** - Preferências individuais

### WhatsApp (Integração)
19. **WhatsAppConfig** - Configuração da API
20. **WhatsAppTemplates** - Templates de mensagens
21. **WhatsAppConversations** - Conversas
22. **WhatsAppMessages** - Histórico de mensagens

### Calendário
23. **CalendarEvents** - Eventos do calendário
24. **EventTypes** - Tipos customizados de eventos

### Documentos/Mídia
25. **Documents** - Documentos de pets
26. **PetPhotos** - Galeria de fotos
27. **PhotoComments** - Comentários em fotos
28. **PhotoReactions** - Curtidas/reações

### Financeiro
29. **Transactions** - Transações financeiras
30. **Payments** - Pagamentos via Stripe
31. **CreditPackages** - Pacotes de créditos disponíveis
32. **ServicePrices** - Preços padrão (creche, diária)
33. **CustomPricingPlans** - Planos personalizados por tutor
34. **SubscriptionPlans** - Planos de assinatura

### Logs/Auditoria
35. **DailyLogs** - Registros diários dos pets
36. **BehaviorRecords** - Registros de comportamento
37. **TrainingProgress** - Progresso de adestramento
38. **AdminLogs** - Ações administrativas
39. **AuditLogs** - Logs de segurança
40. **ChangeHistory** - Histórico de alterações

### Alimentação
41. **FoodStock** - Estoque geral de ração
42. **FoodMovements** - Movimentações de estoque
43. **PetFoodStock** - Estoque individual por pet

---

## 🎯 Funcionalidades por Módulo

### 1. Autenticação
- [x] Login com email/senha
- [x] Registro de novos usuários
- [x] Verificação de email
- [x] Reset de senha
- [x] Logout
- [x] Diferentes roles: admin/user(tutor)

### 2. Dashboard Admin
- [x] Visão geral: pets check-in hoje, próximos eventos
- [x] Ocupação da creche
- [x] Alertas de saúde (vacinas vencendo, medicamentos)
- [x] Acesso rápido a todas as seções

### 3. Dashboard Tutor
- [x] Meus pets
- [x] Próximos agendamentos
- [x] Créditos disponíveis
- [x] Notificações

### 4. Gestão de Pets (Admin)
- [x] Listar todos os pets
- [x] Aprovar/rejeitar novos pets
- [x] Ver detalhes completos
- [x] Check-in/check-out
- [x] Editar informações

### 5. Gestão de Pets (Tutor)
- [x] Ver meus pets
- [x] Cadastrar novo pet (aguarda aprovação)
- [x] Ver detalhes do pet
- [x] Editar informações básicas

### 6. Calendário
- [x] Visualização mensal/semanal
- [x] Tipos de eventos: vacina, medicamento, consulta, banho, etc.
- [x] Eventos com período (check-in a check-out)
- [x] Cores por tipo de evento
- [x] Drag & drop para mover eventos

### 7. Saúde - Vacinas
- [x] Biblioteca de vacinas comuns
- [x] Registrar vacinação
- [x] Alertas de vencimento
- [x] Upload de comprovante

### 8. Saúde - Medicamentos
- [x] Biblioteca de medicamentos
- [x] Tratamentos em andamento
- [x] Progressão de dosagem
- [x] Horários de administração
- [x] Auto-agendamento

### 9. Saúde - Preventivos
- [x] Antipulgas
- [x] Vermífugos
- [x] Alertas de reaplicação

### 10. Sistema de Créditos
- [x] Pacotes de créditos
- [x] Compra via Stripe
- [x] Débito automático ao usar creche
- [x] Alertas de créditos baixos

### 11. Reservas Online
- [x] Tutor solicita datas
- [x] Admin aprova/rejeita
- [x] Confirmação automática
- [x] Integração com calendário

### 12. Logs Diários
- [x] Registrar humor, fezes, apetite
- [x] Atividades realizadas
- [x] Alimentação
- [x] Observações
- [x] Separar por fonte (casa/creche)

### 13. Galeria de Fotos
- [x] Upload de fotos
- [x] Curtidas e comentários
- [x] Filtrar por pet
- [x] Anexar a eventos

### 14. Documentos
- [x] Upload de documentos
- [x] Categorização
- [x] Histórico de vacinas em PDF

### 15. Chat/Mensagens
- [x] Chat entre tutor e creche
- [x] Integração com WhatsApp (opcional)
- [x] Histórico de conversas

### 16. Financeiro
- [x] Transações
- [x] Pagamentos
- [x] Relatórios
- [x] Planos personalizados

### 17. Notificações
- [x] Push notifications
- [x] Templates customizáveis
- [x] Preferências por tutor
- [x] Tipos: vacina, medicamento, reserva, etc.

### 18. Administração
- [x] Gerenciar usuários
- [x] Promover admins
- [x] Logs de auditoria
- [x] Configurações

---

## 📁 Estrutura de Pastas Sugerida (Novo Projeto)

```
projeto/
├── apps/
│   ├── web/                    # Frontend React
│   │   ├── src/
│   │   │   ├── components/     # Componentes reutilizáveis
│   │   │   │   ├── ui/         # shadcn components
│   │   │   │   └── shared/     # Componentes de negócio
│   │   │   ├── pages/
│   │   │   │   ├── admin/      # Páginas do admin
│   │   │   │   ├── tutor/      # Páginas do tutor
│   │   │   │   └── auth/       # Login, registro, etc.
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── lib/            # Utilities
│   │   │   ├── contexts/       # React contexts
│   │   │   └── styles/         # CSS/Tailwind
│   │   └── package.json
│   │
│   └── api/                    # Backend
│       ├── src/
│       │   ├── routers/        # tRPC routers por domínio
│       │   │   ├── auth.ts
│       │   │   ├── pets.ts
│       │   │   ├── health.ts
│       │   │   ├── calendar.ts
│       │   │   └── ...
│       │   ├── services/       # Lógica de negócio
│       │   ├── middleware/     # Rate limiting, auth, etc.
│       │   ├── jobs/           # Cron jobs
│       │   └── db/             # Database queries
│       └── package.json
│
├── packages/
│   ├── db/                     # Drizzle schema + migrations
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── drizzle.config.ts
│   │
│   └── shared/                 # Tipos compartilhados
│       ├── types.ts
│       └── constants.ts
│
├── package.json                # Workspace root
└── turbo.json                  # Turborepo (opcional)
```

---

## 🚀 Recomendações para Reconstrução

### 1. Escolha do Framework
**Opção A: Next.js (Recomendado para Vercel)**
- SSR/SSG built-in
- API Routes substitui Express
- Deploy simples na Vercel
- App Router com Server Components

**Opção B: Vite + Express (Stack atual)**
- Mais controle sobre backend
- Precisa de dois deploys separados
- Melhor para Railway/Render

### 2. Banco de Dados
**Opção A: Supabase (Atual)**
- PostgreSQL gerenciado
- Auth built-in
- Storage built-in
- RLS policies (complexo)

**Opção B: Neon/PlanetScale**
- PostgreSQL/MySQL serverless
- Mais simples de configurar
- Sem RLS, segurança na aplicação

### 3. Autenticação
**Opção A: Supabase Auth (Atual)**
- Integrado com banco
- OAuth built-in
- Pode ser complexo de debugar

**Opção B: NextAuth.js / Auth.js**
- Flexível
- Funciona com qualquer banco
- Mais controle

**Opção C: Clerk / Lucia Auth**
- Soluções modernas
- Fácil de implementar

### 4. Ordem de Desenvolvimento

```
Fase 1: Base (1-2 semanas)
├── Setup do projeto (Next.js/Vite)
├── Configurar banco de dados
├── Criar schema básico (users, pets, petTutors)
├── Implementar autenticação
├── Layout base (sidebar, header)
└── Dashboard vazio

Fase 2: Pets e Tutores (1 semana)
├── CRUD de pets
├── Relacionamento pet-tutor
├── Upload de foto de pet
├── Aprovação de pets (admin)
└── Listagens com filtros

Fase 3: Calendário e Reservas (1 semana)
├── Componente de calendário
├── CRUD de eventos
├── Sistema de reservas
├── Check-in/check-out
└── Tipos de evento

Fase 4: Saúde (1-2 semanas)
├── Vacinas
├── Medicamentos
├── Preventivos
├── Logs de saúde
└── Alertas automáticos

Fase 5: Créditos e Pagamentos (1 semana)
├── Pacotes de créditos
├── Integração Stripe
├── Débito automático
└── Histórico

Fase 6: Comunicação (1 semana)
├── Notificações
├── Chat simples
├── WhatsApp (opcional)
└── Galeria de fotos

Fase 7: Polimento (1 semana)
├── Relatórios
├── Export PDF
├── Mobile responsivo
├── Testes
└── Deploy
```

---

## 💡 Dicas Importantes

### Deploy na Vercel
1. Use **Next.js** - é nativo da Vercel
2. Use **Prisma** ou **Drizzle** com Neon/Supabase
3. Variáveis de ambiente no dashboard
4. Serverless functions são limitadas a 10s (free tier)

### Evitar Problemas do Projeto Atual
1. ❌ Não misture snake_case e camelCase no schema
2. ❌ Evite RLS policies complexas no Supabase
3. ❌ Não faça routers gigantes - divida por domínio
4. ❌ Evite muitas dependências de versões edge
5. ✅ Use versões LTS/estáveis das bibliotecas
6. ✅ Configure ESLint/Prettier desde o início
7. ✅ Faça commits pequenos e frequentes
8. ✅ Teste cada feature antes de avançar

### Simplificações Possíveis
- Começar sem WhatsApp integration
- Começar sem Stripe (adicionar depois)
- Começar com auth simples (email/senha apenas)
- Começar sem sistema de créditos complexo

---

## 📦 Dependências Essenciais (Versões Estáveis)

```json
{
  "dependencies": {
    "next": "14.2.x",
    "react": "18.3.x",
    "@tanstack/react-query": "5.x",
    "drizzle-orm": "0.30.x",
    "zod": "3.x",
    "tailwindcss": "3.4.x",
    "@radix-ui/react-*": "latest",
    "date-fns": "3.x",
    "lucide-react": "0.x"
  }
}
```

---

## 📝 Conclusão

Este documento serve como referência para reconstruir o TeteCare Pro do zero. O código atual pode ser consultado para:
- Lógica de negócio específica
- Queries de banco de dados
- Componentes de UI (podem ser adaptados)
- Estrutura de dados

**Recomendação final**: Comece simples, valide cada etapa, e adicione complexidade gradualmente.

---

*Documento gerado em: Dezembro 2024*
*Projeto original: /workspace/tetecare-pro*
