# Arquitetura do Sistema OMBUDS

## Visao Geral

OMBUDS e um sistema de gestao para Defensoria Publica construido com Next.js 15 App Router. Arquitetura monolitica full-stack com tRPC para comunicacao type-safe entre cliente e servidor.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS, shadcn/ui |
| API | tRPC v11 (type-safe RPC) |
| ORM | Drizzle ORM |
| Banco | PostgreSQL (Supabase) |
| Auth | Custom (email/senha + OAuth Google) |
| Deploy | Vercel |
| Storage | Google Drive API |
| AI | Google Gemini (classificacao de documentos) |
| Messaging | Evolution API (WhatsApp) |

## Estrutura de Diretorios

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Paginas publicas (login, register)
│   ├── (dashboard)/admin/        # Paginas protegidas
│   │   ├── assistidos/           # Gestao de assistidos
│   │   ├── processos/            # Gestao de processos
│   │   ├── demandas/             # Gestao de demandas
│   │   ├── juri/                 # Tribunal do Juri (10 sub-paginas)
│   │   ├── prazos/               # Calculo de prazos
│   │   ├── drive/                # Google Drive sync
│   │   ├── usuarios/             # Gestao de usuarios
│   │   └── ...                   # Outros modulos
│   └── api/                      # API routes (webhooks, upload)
├── components/                   # Componentes React
│   ├── demandas-premium/         # 31 arquivos, 14.746 linhas
│   ├── drive/                    # 28 arquivos, 9.321 linhas
│   ├── juri/                     # 2 arquivos, 958 linhas
│   ├── prazos/                   # 3 arquivos, 908 linhas
│   ├── shared/                   # Componentes reutilizaveis
│   └── ui/                       # shadcn/ui components
├── config/                       # Configuracoes de dominio
│   ├── demanda-status.ts         # 24 status, 7 grupos
│   └── atos-por-atribuicao.ts    # 85+ atos por atribuicao
├── lib/                          # Logica de negocio
│   ├── db/schema.ts              # Schema Drizzle (~4.500 linhas)
│   ├── trpc/routers/             # 30 routers, 24.523 linhas
│   ├── services/                 # Servicos (calculo-prazos, google-drive)
│   ├── pje-parser.ts             # Parser PJe (1.527 linhas)
│   └── prazo-calculator.ts       # Calculadora standalone (391 linhas)
└── middleware.ts                  # Protecao de rotas
```

## Routers tRPC (30 routers, 24.523 linhas)

### Por Tamanho (top 15)
| Router | Linhas | Dominio |
|--------|--------|---------|
| drive | 2.207 | Google Drive sync |
| casos | 1.391 | Gestao de casos |
| whatsapp-chat | 1.093 | Chat WhatsApp |
| solar | 1.060 | Integracao Solar DPEBA |
| assistidos | 1.000 | Clientes/assistidos |
| diligencias | 987 | Diligencias processuais |
| intelligence | 917 | IA/classificacao |
| simulador | 899 | Simulador de cenarios |
| demandas | 852 | Demandas (core) |
| users | 839 | Usuarios e convites |
| whatsapp | 790 | WhatsApp config |
| jurisprudencia | 776 | Busca jurisprudencia |
| distribuicao | 745 | Distribuicao de trabalho |
| palacio | 672 | Palacio da Mente (investigacao) |
| vvd | 662 | Violencia Domestica |

## Modulos do Sistema

### Core
- **Demandas**: Gestao central de tarefas/intimacoes (14.746 linhas UI)
- **Assistidos**: Cadastro e gestao de clientes (1.000 linhas router)
- **Processos**: Gestao de processos judiciais

### Importacao
- **PJe Parser**: Importacao de intimacoes do PJe (1.527 linhas)
- **SEEU Parser**: Importacao de Execucao Penal
- **Sheets Import**: Importacao do Google Sheets
- **SIGAD Import**: Importacao do sistema legado

### Especializados
- **Juri**: Cockpit de sessao, jurados, teses (8.362 linhas paginas)
- **VVD**: Violencia Domestica com separacao MPU
- **Execucao Penal**: Via SEEU parser
- **Prazos**: Calculo automatico (3.289 linhas)

### Inteligencia
- **Drive**: Sync Google Drive (9.321 linhas UI)
- **Intelligence**: Classificacao IA de documentos
- **Jurisprudencia**: Busca de precedentes
- **Palacio da Mente**: Investigacao visual

### Comunicacao
- **WhatsApp**: Chat via Evolution API (1.883 linhas routers)
- **Mural**: Comunicacao interna (156 linhas)
- **Calendar**: Agenda e pautas (598 linhas)

### Administrativo
- **Auth/Users**: Autenticacao e convites (839 linhas)
- **Workspaces**: Multi-tenancy (119 linhas)
- **Settings**: Configuracoes persistentes (87 linhas)
- **Activity Logs**: Rastreamento (240 linhas)

## Padroes de Codigo

### Router tRPC
```typescript
export const xyzRouter = router({
  list: protectedProcedure.input(z.object({...})).query(async ({ ctx, input }) => {
    const scope = getWorkspaceScope(ctx);
    return db.select().from(table).where(and(scope, ...filters));
  }),
  create: protectedProcedure.input(z.object({...})).mutation(async ({ ctx, input }) => {
    return db.insert(table).values({...input, workspaceId: ctx.workspace.id}).returning();
  }),
});
```

### Componente React
```typescript
"use client";
export function MyComponent({ props }: MyComponentProps) {
  const { data } = trpc.router.procedure.useQuery({});
  const mutation = trpc.router.procedure.useMutation({ onSuccess: () => toast.success("...") });
  return <div className="...">...</div>;
}
```

### Design System (Padrao Defender)
- Cores: zinc neutro + emerald hover/accent
- Tipografia: font-mono para CPF/numeros de processo
- Icones: Lucide (nunca emojis)
- Loading: skeletons com animate-pulse
- Interacao: cursor-pointer em clicaveis, transicoes 150-300ms
- Contraste: WCAG AA (4.5:1 minimo)

## Fluxo de Dados Principal

```
PJe (copy-paste) → Parser → Demandas → Fluxo de Status
                                ↕
Google Drive ← Sync → Documentos → Classificacao IA
                                ↕
Assistidos ←→ Processos ←→ Casos
                                ↕
Prazos Calculator → Dashboard → Alertas
                                ↕
WhatsApp (Evolution) → Chat → Notificacoes
```

## Seguranca
- Isolamento por defensor (cada um ve apenas seus dados)
- Workspace scope em todas as queries
- Soft delete com deletedAt
- Convites com token crypto 64 chars, expiracao 7 dias
- OAuth refresh token para Google Drive
