# AGENTS.md - Documentação do Projeto OMBUDS

> **Carregamento**: Sempre presente no contexto do agente principal
> **Propósito**: Arquitetura, decisões de design, funcionamento do sistema

---

## 1. Visão Geral do Sistema

### 1.1 O que é o OMBUDS?
Sistema de gestão jurídica para a **Defensoria Pública da Bahia**, focado em:
- Gestão de casos criminais e cíveis
- Controle de prazos processuais
- Tribunal do Júri (sessões, jurados, quesitos)
- Violência Doméstica (VVD/MPU)
- Execução Penal
- Atendimentos e audiências

### 1.2 Stack Tecnológico
| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS |
| **Backend** | tRPC (type-safe API) |
| **Banco** | PostgreSQL + Drizzle ORM |
| **UI** | Radix UI + shadcn/ui customizado |
| **IA** | Google Gemini (análise de casos) |
| **Integrações** | WhatsApp, Google Drive/Calendar, PJe |

---

## 2. Arquitetura do Codebase

### 2.1 Estrutura de Diretórios
```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Rotas de autenticação
│   ├── (dashboard)/admin/        # 47+ páginas administrativas
│   │   ├── assistidos/           # Gestão de clientes/réus
│   │   ├── casos/                # Casos jurídicos
│   │   ├── demandas/             # Prazos e tarefas
│   │   ├── processos/            # Autos processuais
│   │   ├── agenda/               # Calendário unificado
│   │   ├── juri/                 # Tribunal do Júri
│   │   ├── vvd/                  # Violência Doméstica
│   │   └── ...
│   ├── api/                      # Endpoints (tRPC, webhooks)
│   └── globals.css               # Design tokens CSS
│
├── components/
│   ├── ui/                       # 29 componentes base (Radix)
│   ├── shared/                   # 44 componentes reutilizáveis
│   │   ├── kpi-card-premium.tsx  # Stats cards padrão
│   │   ├── status-badge.tsx      # Badges de status
│   │   ├── page-layout.tsx       # Layout de páginas
│   │   ├── filter-bar.tsx        # Barra de filtros
│   │   └── ...
│   └── [feature]/                # Componentes por domínio
│       ├── demandas/
│       ├── agenda/
│       ├── juri/
│       └── ...
│
├── lib/
│   ├── db/
│   │   └── schema.ts             # Schema Drizzle (~4000 linhas)
│   ├── trpc/
│   │   ├── init.ts               # Middlewares tRPC
│   │   └── routers/              # 27 routers
│   │       ├── casos.ts
│   │       ├── demandas.ts
│   │       ├── assistidos.ts
│   │       └── ...
│   └── services/                 # Integrações externas
│       ├── google-drive.ts
│       ├── google-calendar.ts
│       ├── gemini.ts
│       ├── evolution-api.ts      # WhatsApp
│       └── pje-parser.ts         # Parser PJe
│
└── config/                       # Configurações de domínio
    ├── atribuicoes.ts            # Áreas jurídicas
    ├── demanda-status.ts         # Status de demandas
    └── ...
```

### 2.2 Fluxo de Dados
```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js 15 (App Router) + React 19 + Tailwind CSS          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         tRPC API                             │
│  Type-safe, validação Zod, middlewares de auth              │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────────┐
│    PostgreSQL    │ │   Services   │ │     Integrações      │
│  (Drizzle ORM)   │ │   (Gemini)   │ │ Drive/Calendar/WA    │
└──────────────────┘ └──────────────┘ └──────────────────────┘
```

---

## 3. Modelo de Dados

### 3.1 Entidades Centrais
```
                    ┌─────────────┐
                    │    CASOS    │ ← Centro da aplicação
                    └─────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  ASSISTIDOS  │  │  PROCESSOS   │  │  DEMANDAS    │
│  (réus)      │  │  (autos)     │  │  (prazos)    │
└──────────────┘  └──────────────┘  └──────────────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │AUDIENCIAS│ │DILIGENCIAS│ │DOCUMENTOS│
        └──────────┘ └──────────┘ └──────────┘
```

### 3.2 Enums Principais
```typescript
// Status de Demanda (fluxo de trabalho)
"2_ATENDER"    // Precisa de ação imediata
"4_MONITORAR"  // Acompanhando
"5_FILA"       // Aguardando vez
"7_PROTOCOLADO"// Já protocolado
"URGENTE"      // Prioridade máxima
"CONCLUIDO"    // Finalizado

// Prioridade
"BAIXA" | "NORMAL" | "ALTA" | "URGENTE" | "REU_PRESO"

// Atribuição (área jurídica)
"JURI_CAMACARI"     // Tribunal do Júri
"VVD_CAMACARI"      // Violência Doméstica
"EXECUCAO_PENAL"    // Execução de penas
"SUBSTITUICAO"      // Substituição criminal
"GRUPO_JURI"        // Grupo de Júri

// Status Prisional
"SOLTO" | "CADEIA_PUBLICA" | "PENITENCIARIA" | "COP" | "HOSPITAL_CUSTODIA"
```

### 3.3 Routers tRPC Principais
| Router | Funcionalidade |
|--------|---------------|
| `casos` | CRUD de casos, conexões, teoria |
| `assistidos` | Clientes/réus, status prisional |
| `processos` | Autos processuais, movimentações |
| `demandas` | Prazos, tarefas, delegação |
| `audiencias` | Eventos, calendário |
| `juri` | Sessões, jurados, quesitos |
| `delegacao` | Delegação de tarefas |
| `whatsapp` | Notificações WhatsApp |
| `drive` | Google Drive sync |
| `calendar` | Google Calendar sync |

---

## 4. Design System "Defender"

### 4.1 Filosofia
> **Minimalismo Institucional**: Interface limpa, profissional, sem distrações visuais.
> Cores neutras por padrão, cor apenas quando há significado semântico.

### 4.2 Paleta de Cores
```css
/* BASE - Usar sempre */
--zinc-50:  #fafafa;   /* Fundos claros */
--zinc-100: #f4f4f5;   /* Áreas destacadas */
--zinc-200: #e4e4e7;   /* Bordas */
--zinc-700: #3f3f46;   /* Texto principal (dark) */
--zinc-800: #27272a;   /* Backgrounds escuros */
--white:    #ffffff;   /* Cards */

/* PRIMÁRIA - Uso restrito */
--emerald-500: #10b981;  /* Ações, hover */
--emerald-600: #059669;  /* Estados ativos */

/* SEMÂNTICAS - Apenas com significado */
--rose:   #f43f5e;   /* Erros, urgências */
--amber:  #f59e0b;   /* Avisos */
--blue:   #3b82f6;   /* Informações */
```

### 4.3 Componentes Padrão

#### KPICardPremium (Stats Cards)
```tsx
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";

<KPIGrid columns={4}>
  <KPICardPremium
    title="Total"
    value={123}
    subtitle="processos"
    icon={Scale}
    gradient="zinc"        // ← SEMPRE zinc por padrão
    size="sm"
    onClick={handler}
    active={isActive}
  />
</KPIGrid>
```

#### StatusBadge
```tsx
import { StatusBadge, PrazoBadge } from "@/components/shared/status-badge";

<StatusBadge status="atender" />    // Verde suave
<StatusBadge status="urgente" />    // Vermelho com pulse
<PrazoBadge prazo={data} />         // Cores por proximidade
```

#### Estrutura de Página
```tsx
import { PageLayout } from "@/components/shared/page-layout";
import { SwissCard } from "@/components/ui/swiss-card";
import { FilterBar } from "@/components/shared/filter-bar";

<PageLayout
  header="Título"
  description="Descrição"
  actions={<Button>Ação</Button>}
>
  <KPIGrid columns={4}>...</KPIGrid>
  <FilterBar>...</FilterBar>
  <SwissCard>...</SwissCard>
</PageLayout>
```

### 4.4 Efeito Hover Padrão
```tsx
// Borda neutra → emerald no hover
className={cn(
  "border-zinc-100 dark:border-zinc-800",
  "hover:border-emerald-200/50 dark:hover:border-emerald-800/30",
  "transition-all duration-300"
)}
```

### 4.5 Tipografia
```typescript
// Hierarquia
font-serif  text-2xl font-semibold   // H1 - Títulos
font-sans   text-lg font-semibold    // H2 - Seções
font-sans   text-xs uppercase        // Labels
font-sans   text-sm                  // Corpo
font-mono   text-sm                  // Dados técnicos
```

---

## 5. Integrações Externas

### 5.1 Google Cloud
| Serviço | Uso |
|---------|-----|
| **Drive** | Upload/sync de documentos processuais |
| **Calendar** | Sincronização de audiências e prazos |
| **Gemini** | IA para análise de casos e jurisprudência |

### 5.2 WhatsApp
| API | Uso |
|-----|-----|
| **Evolution API** | Chat bidirecional (open-source) |
| **Business API** | Notificações automáticas |

### 5.3 PJe (Poder Judiciário)
- Parser de intimações (`lib/pje-parser.ts`)
- Extração automática de prazos
- Detecção de duplicatas

---

## 6. Arquivos-Chave para Referência

| Arquivo | O que contém |
|---------|--------------|
| `src/components/shared/kpi-card-premium.tsx` | Padrão de stats cards |
| `src/components/shared/status-badge.tsx` | Badges de status |
| `src/components/shared/page-layout.tsx` | Layout de páginas |
| `src/lib/trpc/init.ts` | Configuração tRPC |
| `src/lib/db/schema.ts` | Schema completo do banco |
| `src/app/globals.css` | Design tokens CSS |
| `tailwind.config.ts` | Configuração Tailwind |

---

## 7. Decisões Arquiteturais

### 7.1 Por que tRPC?
- Type-safety end-to-end
- Inferência automática de tipos
- Não precisa de geração de código

### 7.2 Por que Drizzle?
- ORM type-safe para TypeScript
- Migrations declarativas
- Performance superior ao Prisma

### 7.3 Por que Design Neutro?
- Contexto jurídico requer seriedade
- Menos distração visual
- Melhor acessibilidade
- Facilita manutenção

---

## 8. Troubleshooting Comum

### Build Falhando
```bash
# Verificar tipos
npm run build

# Limpar cache
rm -rf .next && npm run build
```

### Banco de Dados
```bash
# Gerar migrations
npm run db:generate

# Aplicar migrations
npm run db:push

# Abrir studio
npm run db:studio
```

### Mutation Não Persiste
```typescript
// ERRADO - só mostra toast
const handleSave = () => {
  toast.success("Salvo!");
};

// CORRETO - chama mutation
const mutation = trpc.entidade.update.useMutation({
  onSuccess: () => {
    toast.success("Salvo!");
    utils.entidade.list.invalidate();
  },
});
```

---

**Sistema**: OMBUDS - Gabinete Digital para Defensoria Pública
**Versão**: 2.0
**Atualizado**: Fevereiro 2026
