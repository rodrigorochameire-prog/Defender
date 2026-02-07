# CLAUDE.md - Guia para Agentes de IA no OMBUDS/Defender

## Visão Geral do Projeto

O **OMBUDS** (anteriormente DefensorHub/Intelex) é um sistema de gestão jurídica para a Defensoria Pública, focado em processos criminais. O sistema gerencia casos, prazos, audiências, júris e demandas de assistidos (réus/clientes).

**Stack Principal:**
- Next.js 15 (App Router) + React 19
- tRPC para API type-safe
- Drizzle ORM + PostgreSQL
- Tailwind CSS + Radix UI
- Google Gemini para IA

---

## Estrutura do Codebase

```
src/
├── app/                          # App Router (Next.js 15)
│   ├── (auth)/                   # Rotas de autenticação
│   ├── (dashboard)/admin/        # 47+ páginas administrativas
│   ├── api/                      # Endpoints REST/tRPC/Webhooks
│   └── globals.css               # Design tokens e variáveis CSS
│
├── components/
│   ├── ui/                       # 29 componentes base (Radix UI)
│   ├── shared/                   # 44 componentes reutilizáveis
│   └── [feature]/                # Componentes por domínio
│
├── lib/
│   ├── db/
│   │   └── schema.ts             # Schema Drizzle (~4000 linhas)
│   ├── trpc/
│   │   ├── routers/              # 27 routers tRPC
│   │   └── init.ts               # Middlewares e tipos
│   └── services/                 # Integrações externas
│
└── config/                       # Configurações de domínio
```

---

## Padrão de Design: "Defender"

### Filosofia: Minimalismo Institucional

O sistema segue o **Swiss Design System** adaptado para contexto jurídico brasileiro. A regra principal é: **cores neutras por padrão, cor apenas quando há significado semântico**.

### Paleta de Cores

```typescript
// CORES BASE (usar sempre)
zinc-50/100    // Fundos claros
zinc-700/800   // Textos principais (dark mode)
zinc-400/500   // Textos secundários
white          // Cards

// COR PRIMÁRIA (uso restrito)
emerald-500/600  // Ações principais, hover effects, estados ativos

// CORES SEMÂNTICAS (apenas quando necessário)
rose           // Erros, urgências, prazos vencidos
amber          // Avisos, atenção
blue           // Informações, funcional
```

### Componentes Padrão

#### KPICardPremium - Stats Cards
```tsx
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";

<KPIGrid columns={4}>
  <KPICardPremium
    title="Total"
    value={123}
    subtitle="processos"
    icon={Scale}
    gradient="zinc"        // SEMPRE zinc por padrão
    size="sm"              // sm | md
    onClick={handler}
    active={isActive}
  />
</KPIGrid>
```

#### Regras de Gradientes
- `gradient="zinc"` → Padrão neutro (USAR SEMPRE)
- `gradient="emerald"` → Apenas para estados de sucesso real
- Outros gradientes (blue, amber, rose, violet) → Apenas com significado semântico

#### StatusBadge - Badges de Status
```tsx
import { StatusBadge, PrazoBadge, AreaBadge } from "@/components/shared/status-badge";

<StatusBadge status="atender" />      // Verde suave
<StatusBadge status="urgente" />      // Vermelho com pulse
<PrazoBadge prazo={prazoData} />      // Cores por proximidade
<AreaBadge area="juri" />             // Identificação visual
```

#### Estrutura de Página
```tsx
import { PageLayout } from "@/components/shared/page-layout";
import { SwissCard, SwissCardContent } from "@/components/ui/swiss-card";
import { FilterBar } from "@/components/shared/filter-bar";

<PageLayout
  header="Título da Página"
  description="Descrição"
  actions={<Button>Ação</Button>}
>
  {/* 1. Stats (opcional) */}
  <KPIGrid columns={4}>...</KPIGrid>

  {/* 2. Filtros */}
  <FilterBar>...</FilterBar>

  {/* 3. Conteúdo */}
  <SwissCard>
    <SwissCardContent>
      {/* Tabela, lista, etc */}
    </SwissCardContent>
  </SwissCard>
</PageLayout>
```

### Tipografia

```typescript
// FONTES
font-sans   // Inter - UI geral
font-serif  // Source Serif 4 - Títulos jurídicos
font-mono   // JetBrains Mono - Dados técnicos

// HIERARQUIA
text-2xl font-serif font-semibold   // H1 - Títulos de página
text-lg font-sans font-semibold     // H2 - Títulos de seção
text-xs font-medium uppercase       // Labels
text-sm text-foreground             // Corpo
text-sm font-mono                   // Dados/números
```

### Efeitos de Hover

```tsx
// Padrão de hover com emerald (usado em StatsCard, KPICardPremium)
className={cn(
  "border-zinc-100 dark:border-zinc-800",              // Estado padrão
  "hover:border-emerald-200/50 dark:hover:border-emerald-800/30",  // Hover
  "group-hover:text-emerald-600 dark:group-hover:text-emerald-400" // Texto
)}
```

---

## Arquitetura Backend

### tRPC Routers

Os routers seguem o padrão:
- `publicProcedure` → Sem autenticação
- `protectedProcedure` → Requer login
- `adminProcedure` → Requer role admin

```typescript
// Padrão de query com filtros
export const casosRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(["ativo", "arquivado"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      // Implementação
    }),
});
```

### Principais Routers

| Router | Funcionalidade |
|--------|---------------|
| `casos` | Casos jurídicos (centro da aplicação) |
| `assistidos` | Clientes/réus |
| `processos` | Registros processuais |
| `demandas` | Prazos e tarefas |
| `audiencias` | Audiências e eventos |
| `juri` | Sessões do Tribunal do Júri |
| `delegacao` | Delegação de tarefas |
| `whatsapp` | Notificações WhatsApp |

### Entidades Principais

```
casos ──┬── assistidos (réu/cliente)
        ├── processos (autos)
        ├── demandas (prazos/tarefas)
        ├── audiencias (eventos)
        └── diligencias (investigações)
```

### Enums Importantes

```typescript
// Status de Demanda
statusDemanda: "2_ATENDER" | "4_MONITORAR" | "5_FILA" | "7_PROTOCOLADO" | "URGENTE" | "CONCLUIDO"

// Prioridade
prioridade: "BAIXA" | "NORMAL" | "ALTA" | "URGENTE" | "REU_PRESO"

// Atribuição (área jurídica)
atribuicao: "JURI_CAMACARI" | "VVD_CAMACARI" | "EXECUCAO_PENAL" | "SUBSTITUICAO" | ...

// Status Prisional
statusPrisional: "SOLTO" | "CADEIA_PUBLICA" | "PENITENCIARIA" | "COP" | "HOSPITAL_CUSTODIA"
```

---

## Integrações Externas

### Google Cloud
- **Drive**: Upload/download de documentos
- **Calendar**: Sincronização de audiências/prazos
- **Gemini**: IA para análise de casos e jurisprudência

### WhatsApp
- **Evolution API**: Chat bidirecional
- **Business API**: Notificações automáticas

### PJe (Poder Judiciário)
- Parser de intimações (`lib/pje-parser.ts`)
- Extração automática de prazos

---

## Convenções de Código

### Nomenclatura

```typescript
// Arquivos
kebab-case.tsx          // Componentes
camelCase.ts            // Utilitários
[router-name].ts        // Routers tRPC

// Componentes React
PascalCase              // Exportações
interface FooProps {}   // Props

// Variáveis
camelCase               // Variáveis e funções
SCREAMING_SNAKE_CASE    // Constantes
```

### Imports

```typescript
// Ordem de imports
import { useState } from "react";              // 1. React
import { trpc } from "@/lib/trpc/client";      // 2. Libs internas (@/)
import { Button } from "@/components/ui/button"; // 3. Componentes UI
import { cn } from "@/lib/utils";              // 4. Utilitários
```

### Tratamento de Mutations

```typescript
const mutation = trpc.entidade.create.useMutation({
  onSuccess: () => {
    toast.success("Criado com sucesso!");
    utils.entidade.list.invalidate();  // Invalidar cache
  },
  onError: (error) => {
    toast.error("Erro ao criar", { description: error.message });
  },
});
```

---

## Regras Importantes

### O que FAZER

1. **Usar componentes compartilhados** (`/components/shared/`)
2. **Seguir o padrão Defender** (cores neutras + emerald hover)
3. **Usar `gradient="zinc"`** em KPICardPremium por padrão
4. **Validar inputs com Zod** em routers tRPC
5. **Invalidar queries** após mutations
6. **Usar toast.success/error** para feedback

### O que NÃO FAZER

1. **❌ Criar gradientes coloridos sem necessidade semântica**
2. **❌ Usar magic numbers de fonte** (`text-[11px]`, `text-[13px]`)
3. **❌ Duplicar componentes** (usar os de `/shared/`)
4. **❌ Ignorar dark mode** (sempre testar ambos)
5. **❌ Usar cores sólidas em badges** (usar outline)
6. **❌ Mostrar só toast sem chamar mutation** (sempre persistir dados)

---

## Padrões de Commits

```bash
# Formato
<tipo>(<escopo>): <descrição>

# Tipos
feat     # Nova funcionalidade
fix      # Correção de bug
style    # Mudanças visuais/CSS
refactor # Refatoração de código
docs     # Documentação
chore    # Manutenção

# Exemplos
feat(juri): adicionar cálculo automático de prazos
fix(agenda): corrigir edição de eventos do calendário
style(dashboard): padronizar stats cards ao padrão Defender
```

---

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Iniciar servidor dev

# Banco de dados
npm run db:generate      # Gerar migrations
npm run db:push          # Aplicar migrations
npm run db:studio        # Abrir Drizzle Studio

# Build
npm run build            # Build de produção
npm run lint             # Verificar lint

# Git
git status               # Ver alterações
git diff --stat HEAD     # Ver resumo de mudanças
git log --oneline -10    # Ver últimos commits
```

---

## Checklist de PR

Antes de commitar, verificar:

- [ ] Build passa sem erros (`npm run build`)
- [ ] Componentes usam padrão Defender (zinc + emerald hover)
- [ ] Dark mode funciona corretamente
- [ ] Mutations chamam os métodos corretos (não só toast)
- [ ] Imports organizados
- [ ] Sem código duplicado
- [ ] Commit message segue o padrão

---

## Arquivos-Chave para Referência

| Arquivo | Propósito |
|---------|-----------|
| `src/components/shared/kpi-card-premium.tsx` | Padrão de stats cards |
| `src/components/shared/status-badge.tsx` | Padrão de badges |
| `src/app/globals.css` | Design tokens CSS |
| `src/lib/trpc/init.ts` | Configuração tRPC |
| `src/lib/db/schema.ts` | Schema do banco |
| `tailwind.config.ts` | Configuração Tailwind |

---

## Contato

**Sistema**: OMBUDS - Gabinete Digital para Defensoria Pública
**Design System**: Swiss Style - Minimalismo Institucional
**Versão**: 2.0
**Atualizado**: Fevereiro 2026
